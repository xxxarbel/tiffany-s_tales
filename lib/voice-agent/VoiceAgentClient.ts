import {
  DEEPGRAM_AGENT_WS_URL,
  INPUT_SAMPLE_RATE,
  KEEPALIVE_MS,
  TOKEN_ENDPOINT,
  WS_SUBPROTOCOL,
} from "./config";
import { AudioPlayer } from "./AudioPlayer";
import { FunctionRegistry } from "./FunctionRegistry";
import { MicCapture } from "./MicCapture";
import { buildSettings, DEFAULT_AGENT_CONFIG, type AgentConfig } from "./settings";
import type {
  FunctionCallRequestMessage,
  FunctionCallResponseMessage,
  ServerMessage,
  TranscriptEntry,
  VoiceAgentStatus,
} from "./types";

export interface VoiceAgentCallbacks {
  onStatusChange?: (status: VoiceAgentStatus) => void;
  onTranscript?: (entry: TranscriptEntry) => void;
  onError?: (message: string) => void;
}

/**
 * Owns the WebSocket connection to Deepgram's Voice Agent, mic capture, audio
 * playback, and the function-call dispatch loop. Framework-agnostic so it can
 * back both the React widget and a future embeddable Web Component.
 */
export class VoiceAgentClient {
  private ws: WebSocket | null = null;
  private mic: MicCapture | null = null;
  private player: AudioPlayer | null = null;
  private keepAlive: ReturnType<typeof setInterval> | null = null;
  private status: VoiceAgentStatus = "idle";
  private inputSampleRate = INPUT_SAMPLE_RATE;
  private closedByUser = false;
  private config: AgentConfig = DEFAULT_AGENT_CONFIG;

  private readonly registry: FunctionRegistry;
  private readonly callbacks: VoiceAgentCallbacks;

  constructor(registry: FunctionRegistry, callbacks: VoiceAgentCallbacks = {}) {
    this.registry = registry;
    this.callbacks = callbacks;
  }

  /** Update the agent config used for the next Settings handshake. */
  setConfig(config: AgentConfig) {
    this.config = config;
  }

  getStatus(): VoiceAgentStatus {
    return this.status;
  }

  async connect() {
    if (!["idle", "closed", "error"].includes(this.status)) return;
    this.closedByUser = false;

    try {
      // AudioContexts must be created/resumed inside the user gesture.
      this.player = new AudioPlayer();
      await this.player.resume();

      this.setStatus("requesting-mic");
      this.mic = new MicCapture((chunk) => this.sendBinary(chunk));
      this.inputSampleRate = await this.mic.start();

      this.setStatus("connecting");
      const token = await this.fetchToken();

      this.ws = new WebSocket(DEEPGRAM_AGENT_WS_URL, [WS_SUBPROTOCOL, token]);
      this.ws.binaryType = "arraybuffer";
      this.ws.onmessage = (e) => this.handleMessage(e);
      this.ws.onerror = () => this.handleError("WebSocket connection error.");
      this.ws.onclose = () => this.handleClose();
    } catch (err) {
      this.handleError(err instanceof Error ? err.message : String(err));
      this.cleanup();
    }
  }

  disconnect() {
    this.closedByUser = true;
    this.cleanup();
    this.setStatus("closed");
  }

  setMuted(muted: boolean) {
    this.mic?.setMuted(muted);
  }

  // ---- internals ----

  private setStatus(status: VoiceAgentStatus) {
    this.status = status;
    this.callbacks.onStatusChange?.(status);
  }

  private async fetchToken(): Promise<string> {
    const res = await fetch(TOKEN_ENDPOINT, { method: "POST" });
    if (!res.ok) throw new Error(`Token request failed (${res.status}).`);
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) throw new Error("No access_token returned.");
    return data.access_token;
  }

  private sendBinary(chunk: ArrayBuffer) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(chunk);
  }

  private send(obj: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  private handleMessage(e: MessageEvent) {
    // Binary frames are agent audio; strings are JSON control messages.
    if (typeof e.data !== "string") {
      // Audio is playing → ensure the UI shows the speaking state even if no
      // AgentStartedSpeaking control message arrived first.
      if (this.status !== "speaking") this.setStatus("speaking");
      this.player?.enqueue(e.data as ArrayBuffer);
      return;
    }
    let msg: ServerMessage;
    try {
      msg = JSON.parse(e.data) as ServerMessage;
    } catch {
      return;
    }
    this.handleControl(msg);
  }

  private handleControl(msg: ServerMessage) {
    switch (msg.type) {
      case "Welcome":
        this.send(buildSettings(this.inputSampleRate, this.config));
        break;
      case "SettingsApplied":
        this.setStatus("listening");
        this.startKeepAlive();
        break;
      case "UserStartedSpeaking":
        this.player?.flush();
        this.setStatus("listening");
        break;
      case "ConversationText":
        if (msg.content) {
          this.callbacks.onTranscript?.({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content,
          });
        }
        break;
      case "AgentThinking":
        this.setStatus("thinking");
        break;
      case "AgentStartedSpeaking":
        this.setStatus("speaking");
        break;
      case "AgentAudioDone":
        this.setStatus("listening");
        break;
      case "FunctionCallRequest":
        void this.handleFunctionCalls(msg);
        break;
      case "Error":
        this.handleError(msg.description ?? "Agent error.");
        break;
      default:
        break;
    }
  }

  private async handleFunctionCalls(msg: FunctionCallRequestMessage) {
    this.setStatus("thinking");
    for (const fn of msg.functions ?? []) {
      if (fn.client_side === false) continue; // server-side function; skip
      let args: Record<string, unknown> = {};
      try {
        args = fn.arguments ? JSON.parse(fn.arguments) : {};
      } catch {
        args = {};
      }
      const content = await this.registry.dispatch(fn.name, args);
      const response: FunctionCallResponseMessage = {
        type: "FunctionCallResponse",
        id: fn.id,
        name: fn.name,
        content,
      };
      this.send(response);
    }
  }

  private startKeepAlive() {
    this.stopKeepAlive();
    this.keepAlive = setInterval(
      () => this.send({ type: "KeepAlive" }),
      KEEPALIVE_MS,
    );
  }

  private stopKeepAlive() {
    if (this.keepAlive) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
  }

  private handleError(message: string) {
    this.callbacks.onError?.(message);
    this.setStatus("error");
  }

  private handleClose() {
    this.cleanup();
    this.setStatus("closed");
  }

  private cleanup() {
    this.stopKeepAlive();
    this.mic?.stop();
    this.mic = null;
    this.player?.close();
    this.player = null;
    if (this.ws) {
      this.ws.onmessage = null;
      this.ws.onerror = null;
      this.ws.onclose = null;
      try {
        this.ws.close();
      } catch {
        // ignore
      }
      this.ws = null;
    }
  }
}
