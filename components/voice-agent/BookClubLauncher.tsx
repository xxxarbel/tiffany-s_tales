"use client";

import { useState } from "react";
import Image from "next/image";
import { Mic, MicOff, PawPrint, X } from "lucide-react";
import type { VoiceAgentStatus } from "@/lib/voice-agent/types";
import { useVoiceAgent } from "./VoiceAgentProvider";

const AVATAR_IDLE = "/images/voice-assistant.png";
// Tiff with her ears perked up while she's listening, and ears relaxed while
// she's speaking — so visitors can see at a glance whose turn it is.
const AVATAR_LISTENING = "/images/tiff-listening.png";
const AVATAR_SPEAKING = "/images/tiff-speaking.png";

function avatarFor(status: VoiceAgentStatus): string {
  if (status === "listening") return AVATAR_LISTENING;
  if (status === "speaking") return AVATAR_SPEAKING;
  return AVATAR_IDLE;
}

const ACTIVE: VoiceAgentStatus[] = [
  "requesting-mic",
  "connecting",
  "listening",
  "thinking",
  "speaking",
];

type Tone = "idle" | "sage" | "purple" | "plum" | "error";

interface Visual {
  label: string;
  tone: Tone;
}

function mapStatus(status: VoiceAgentStatus): Visual {
  switch (status) {
    case "speaking":
      return { label: "Speaking…", tone: "plum" };
    case "listening":
      return { label: "Listening", tone: "sage" };
    case "thinking":
      return { label: "Thinking…", tone: "purple" };
    case "connecting":
      return { label: "Connecting…", tone: "purple" };
    case "requesting-mic":
      return { label: "Allow the mic…", tone: "purple" };
    case "error":
      return { label: "Something went wrong", tone: "error" };
    case "closed":
      return { label: "Chat ended", tone: "idle" };
    case "idle":
    default:
      return { label: "Your book club guide", tone: "idle" };
  }
}

// Tailwind classes for the small status dot per tone.
const DOT: Record<Tone, string> = {
  idle: "bg-muted-foreground",
  sage: "bg-sage",
  purple: "bg-purple",
  plum: "bg-plum",
  error: "bg-destructive",
};

/**
 * Floating, brand-styled launcher for the Tiffany's Tales voice guide. Tiff (the
 * club's chihuahua mascot) is the avatar; tapping her opens a cosy panel where a
 * visitor can start talking, mute, or end the chat. Mic state (idle / listening /
 * speaking) is reflected in the animated ring and status dot. The assistant's
 * model, voice, and personality are configured by the owner from /admin.
 */
export function BookClubLauncher() {
  const {
    enabled,
    status,
    transcript,
    error,
    muted,
    connect,
    disconnect,
    toggleMute,
  } = useVoiceAgent();
  const [open, setOpen] = useState(false);

  const visual = mapStatus(status);
  const avatarSrc = avatarFor(status);
  const active = ACTIVE.includes(status);
  const lastLine = transcript.length ? transcript[transcript.length - 1] : null;

  // Hidden until the server confirms the voice feature is configured (a Deepgram
  // key is present), so visitors never hit a broken assistant.
  if (!enabled) return null;

  // Collapsed: the floating avatar button.
  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open the book club voice guide"
        onClick={() => setOpen(true)}
        className="group fixed bottom-5 right-5 z-50 size-14 rounded-full bg-plum shadow-xl ring-2 ring-cream/40 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
      >
        {/* Pulsing ring while a session is active so it reads as "listening". */}
        {active && (
          <span className="absolute inset-0 animate-ping rounded-full bg-sage/40" />
        )}
        <Image
          src={avatarSrc}
          alt="Tiff, the Tiffany's Tales guide"
          fill
          sizes="56px"
          className="rounded-full object-cover"
          priority
        />
        <span className="absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full bg-sage text-plum shadow">
          <PawPrint className="size-3" />
        </span>
      </button>
    );
  }

  // Expanded: cosy brand panel.
  return (
    <div className="fixed bottom-5 right-5 z-50 w-[19rem] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-br from-primary to-plum px-4 py-3 text-cream">
        <div className="flex items-center gap-2.5">
          <span className="relative size-9 overflow-hidden rounded-full ring-2 ring-cream/40">
            <Image
              src={avatarSrc}
              alt="Tiff, the Tiffany's Tales guide"
              fill
              sizes="36px"
              className="object-cover"
            />
          </span>
          <div className="leading-tight">
            <p className="font-display text-sm font-bold tracking-wide">
              Tiffany&apos;s Tales
            </p>
            <p className="text-[0.7rem] text-cream/70">Your book club guide</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={() => setOpen(false)}
          className="rounded-md p-1 text-cream/70 transition-colors hover:bg-cream/10 hover:text-cream"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Status + caption */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-2">
          <span
            className={`size-2 rounded-full ${DOT[visual.tone]} ${
              active ? "animate-pulse" : ""
            }`}
          />
          <p className="text-sm font-semibold text-foreground">
            {visual.label}
          </p>
        </div>
        <p className="mt-2 line-clamp-3 min-h-[3rem] text-sm leading-snug text-muted-foreground">
          {error
            ? error
            : lastLine
              ? lastLine.content
              : active
                ? "Say hello, ask for a tour, or ask about a book."
                : "Tap below and I'll show you around the pack."}
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <button
          type="button"
          onClick={active ? disconnect : connect}
          className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            active
              ? "border border-border bg-muted text-foreground hover:bg-muted/70"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {active ? "End chat" : "Start talking"}
        </button>
        {active && (
          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? "Unmute microphone" : "Mute microphone"}
            aria-pressed={muted}
            className={`flex size-10 items-center justify-center rounded-xl border transition-colors ${
              muted
                ? "border-destructive/40 bg-destructive/10 text-destructive"
                : "border-border bg-background text-foreground hover:bg-muted"
            }`}
          >
            {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
          </button>
        )}
      </div>
    </div>
  );
}
