"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  BOOKS_ENDPOINT,
  KNOWLEDGE_ENDPOINT,
  VOICE_CONFIG_ENDPOINT,
} from "@/lib/voice-agent/config";
import { FunctionRegistry } from "@/lib/voice-agent/FunctionRegistry";
import {
  VoiceAgentClient,
  type VoiceAgentCallbacks,
} from "@/lib/voice-agent/VoiceAgentClient";
import { DEFAULT_AGENT_CONFIG } from "@/lib/voice-agent/settings";
import type {
  TranscriptEntry,
  VoiceAgentStatus,
} from "@/lib/voice-agent/types";

interface VoiceAgentContextValue {
  /** False until the config loads, and stays false if the server has no Deepgram
   *  key — the launcher hides itself rather than showing a broken assistant. */
  enabled: boolean;
  status: VoiceAgentStatus;
  transcript: TranscriptEntry[];
  error: string | null;
  muted: boolean;
  connect: () => void;
  disconnect: () => void;
  toggleMute: () => void;
}

const VoiceAgentContext = createContext<VoiceAgentContextValue | null>(null);

type AppRouter = ReturnType<typeof useRouter>;

// Highlight tracking is kept in module-scope helpers so the tour handlers never
// mutate state during React render.
let highlighted: Element | null = null;
function clearHighlight() {
  if (highlighted) {
    highlighted.classList.remove("va-highlight");
    highlighted = null;
  }
}
function applyHighlight(el: Element) {
  el.classList.add("va-highlight");
  highlighted = el;
}

// Builds the framework-agnostic client and wires the tour tools to the host
// page DOM, the Next router, and the club's data APIs. Defined outside the
// component so it can run once via a useState initializer.
function createClient(
  router: AppRouter,
  callbacks: VoiceAgentCallbacks,
): VoiceAgentClient {
  const registry = new FunctionRegistry();

  registry.register("navigate", (args) => {
    const path = String(args.path ?? "");
    if (path) router.push(path);
    return { ok: Boolean(path), path };
  });

  registry.register("scroll_to", (args) => {
    const selector = String(args.selector ?? "");
    const el = selector ? document.querySelector(selector) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    return { found: Boolean(el), selector };
  });

  registry.register("highlight_element", (args) => {
    clearHighlight();
    const selector = String(args.selector ?? "");
    const el = selector ? document.querySelector(selector) : null;
    if (el) {
      applyHighlight(el);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return { found: Boolean(el), selector };
  });

  registry.register("lookup_knowledge", async (args) => {
    const query = String(args.query ?? "");
    try {
      const res = await fetch(KNOWLEDGE_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const data = (await res.json()) as { answer?: string };
      return { answer: data.answer ?? "" };
    } catch {
      return { answer: "" };
    }
  });

  registry.register("search_books", async (args) => {
    const query = String(args.query ?? "").trim();
    if (!query) return { answer: "" };
    try {
      const res = await fetch(
        `${BOOKS_ENDPOINT}?q=${encodeURIComponent(query)}`,
      );
      const data = (await res.json()) as { answer?: string };
      return { answer: data.answer ?? "" };
    } catch {
      return { answer: "" };
    }
  });

  registry.register("book_of_the_month", async () => {
    try {
      const res = await fetch(`${BOOKS_ENDPOINT}?action=book_of_the_month`);
      const data = (await res.json()) as { answer?: string };
      return { answer: data.answer ?? "" };
    } catch {
      return { answer: "" };
    }
  });

  registry.register("end_tour", () => {
    clearHighlight();
    return { ok: true };
  });

  return new VoiceAgentClient(registry, callbacks);
}

export function VoiceAgentProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const [status, setStatus] = useState<VoiceAgentStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [enabled, setEnabled] = useState(false);

  const [client] = useState(() =>
    createClient(router, {
      onStatusChange: setStatus,
      onTranscript: (entry) => setTranscript((prev) => [...prev, entry]),
      onError: setError,
    }),
  );

  // Load the owner-edited config (model / voice / prompt) from the server so the
  // assistant reflects the admin's latest settings for every visitor. Starts
  // from the built-in defaults until the fetch resolves.
  useEffect(() => {
    client.setConfig(DEFAULT_AGENT_CONFIG);
    let active = true;
    (async () => {
      try {
        const res = await fetch(VOICE_CONFIG_ENDPOINT);
        const data = await res.json();
        if (!active) return;
        if (data?.config) {
          client.setConfig({ ...DEFAULT_AGENT_CONFIG, ...data.config });
        }
        // Only reveal the launcher when the server actually has a Deepgram key.
        if (data?.enabled) setEnabled(true);
      } catch {
        /* keep defaults + stay hidden if the config endpoint is unavailable */
      }
    })();
    return () => {
      active = false;
    };
  }, [client]);

  const connect = useCallback(() => {
    setError(null);
    setTranscript([]);
    void client.connect();
  }, [client]);

  const disconnect = useCallback(() => {
    clearHighlight();
    client.disconnect();
  }, [client]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      client.setMuted(next);
      return next;
    });
  }, [client]);

  // Tear down on unmount.
  useEffect(() => {
    return () => {
      clearHighlight();
      client.disconnect();
    };
  }, [client]);

  const value = useMemo(
    () => ({
      enabled,
      status,
      transcript,
      error,
      muted,
      connect,
      disconnect,
      toggleMute,
    }),
    [enabled, status, transcript, error, muted, connect, disconnect, toggleMute],
  );

  return (
    <VoiceAgentContext.Provider value={value}>
      {children}
    </VoiceAgentContext.Provider>
  );
}

export function useVoiceAgent(): VoiceAgentContextValue {
  const ctx = useContext(VoiceAgentContext);
  if (!ctx) {
    throw new Error("useVoiceAgent must be used within a VoiceAgentProvider.");
  }
  return ctx;
}
