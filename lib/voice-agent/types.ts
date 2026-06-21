// Message and state types for the Deepgram Voice Agent WebSocket protocol.

export type VoiceAgentStatus =
  | "idle"
  | "requesting-mic"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "error"
  | "closed";

export interface TranscriptEntry {
  role: "user" | "assistant";
  content: string;
}

// ---- Inbound server control messages (JSON) ----

export interface WelcomeMessage {
  type: "Welcome";
  request_id?: string;
}

export interface SettingsAppliedMessage {
  type: "SettingsApplied";
}

export interface ConversationTextMessage {
  type: "ConversationText";
  role: "user" | "assistant";
  content: string;
}

export interface UserStartedSpeakingMessage {
  type: "UserStartedSpeaking";
}

export interface AgentThinkingMessage {
  type: "AgentThinking";
}

export interface AgentStartedSpeakingMessage {
  type: "AgentStartedSpeaking";
}

export interface AgentAudioDoneMessage {
  type: "AgentAudioDone";
}

export interface FunctionCallRequestFn {
  id: string;
  name: string;
  /** JSON-encoded argument object. */
  arguments: string;
  /** When true, the client must execute it and reply with FunctionCallResponse. */
  client_side: boolean;
}

export interface FunctionCallRequestMessage {
  type: "FunctionCallRequest";
  functions: FunctionCallRequestFn[];
}

export interface ErrorMessage {
  type: "Error";
  description?: string;
  code?: string;
}

export interface WarningMessage {
  type: "Warning";
  description?: string;
}

export type ServerMessage =
  | WelcomeMessage
  | SettingsAppliedMessage
  | ConversationTextMessage
  | UserStartedSpeakingMessage
  | AgentThinkingMessage
  | AgentStartedSpeakingMessage
  | AgentAudioDoneMessage
  | FunctionCallRequestMessage
  | ErrorMessage
  | WarningMessage;

// ---- Outbound client messages (JSON) ----

export interface AgentFunction {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface SettingsMessage {
  type: "Settings";
  audio: {
    input: { encoding: string; sample_rate: number };
    output: { encoding: string; sample_rate: number; container: string };
  };
  agent: {
    language?: string;
    listen: { provider: Record<string, unknown> };
    think: {
      provider: Record<string, unknown>;
      prompt: string;
      functions?: AgentFunction[];
    };
    speak: { provider: Record<string, unknown> };
    greeting?: string;
  };
}

export interface FunctionCallResponseMessage {
  type: "FunctionCallResponse";
  id: string;
  name: string;
  /** JSON-encoded result the agent will use to continue the conversation. */
  content: string;
}

export interface KeepAliveMessage {
  type: "KeepAlive";
}
