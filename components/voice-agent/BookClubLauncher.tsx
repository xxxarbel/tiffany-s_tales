"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Mic, MicOff, X } from "lucide-react";
import type { VoiceAgentStatus } from "@/lib/voice-agent/types";
import { useVoiceAgent } from "./VoiceAgentProvider";

// Base diameter (px) of the collapsed avatar at scale 1 (matches size-14).
const AVATAR_BASE = 56;
// Keep the floating widget this far from the viewport edges.
const EDGE_MARGIN = 12;
// Pointer travel (px) before a press counts as a drag rather than a tap.
const DRAG_THRESHOLD = 4;
// Where the visitor last dragged Tiff to, remembered across visits.
const POS_STORAGE_KEY = "tt-voice-avatar-pos";
// Approximate expanded-panel footprint, used only to keep it on-screen.
const PANEL_W = 304;
const PANEL_H = 360;

interface Pos {
  x: number;
  y: number;
}

function clampToViewport(x: number, y: number, w: number, h: number): Pos {
  if (typeof window === "undefined") return { x, y };
  const maxX = Math.max(EDGE_MARGIN, window.innerWidth - w - EDGE_MARGIN);
  const maxY = Math.max(EDGE_MARGIN, window.innerHeight - h - EDGE_MARGIN);
  return {
    x: Math.min(Math.max(x, EDGE_MARGIN), maxX),
    y: Math.min(Math.max(y, EDGE_MARGIN), maxY),
  };
}

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
    avatarScale,
    connect,
    disconnect,
    toggleMute,
  } = useVoiceAgent();
  const [open, setOpen] = useState(false);

  // Drag state. `pos` is the widget's top-left in px; null means "use the
  // default bottom-right anchor" (until the visitor drags it or we restore a
  // saved spot). The whole thing is grab-and-drop and remembers where it lands.
  const [pos, setPos] = useState<Pos | null>(null);
  const drag = useRef<{
    px: number;
    py: number;
    ox: number;
    oy: number;
    w: number;
    h: number;
  } | null>(null);
  const movedRef = useRef(false);

  const size = AVATAR_BASE * avatarScale;

  // Restore the last dragged position on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(POS_STORAGE_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as Pos;
      // Restore on mount only (stays null during SSR/first render to avoid a
      // hydration mismatch), so a synchronous set here is intended.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (typeof p?.x === "number" && typeof p?.y === "number") setPos(p);
    } catch {
      /* ignore unreadable storage */
    }
  }, []);

  // Persist position whenever it changes.
  useEffect(() => {
    if (!pos) return;
    try {
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos));
    } catch {
      /* ignore */
    }
  }, [pos]);

  // Keep the widget on-screen if the window is resized.
  useEffect(() => {
    function onResize() {
      setPos((p) => (p ? clampToViewport(p.x, p.y, size, size) : p));
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [size]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return; // primary button / touch only
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    drag.current = {
      px: e.clientX,
      py: e.clientY,
      ox: rect.left,
      oy: rect.top,
      w: rect.width,
      h: rect.height,
    };
    movedRef.current = false;
    el.setPointerCapture?.(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    if (!movedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    movedRef.current = true;
    setPos(clampToViewport(d.ox + dx, d.oy + dy, d.w, d.h));
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!drag.current) return;
    drag.current = null;
    (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
  }, []);

  const visual = mapStatus(status);
  const avatarSrc = avatarFor(status);
  const active = ACTIVE.includes(status);
  const lastLine = transcript.length ? transcript[transcript.length - 1] : null;

  // Hidden until the server confirms the voice feature is configured (a Deepgram
  // key is present), so visitors never hit a broken assistant.
  if (!enabled) return null;

  // Collapsed: the floating avatar button. Draggable anywhere; its size is set
  // by the owner's "Avatar size" slider in /admin.
  if (!open) {
    return (
      <button
        type="button"
        aria-label="Open the book club voice guide (drag to move)"
        onClick={() => {
          // A drag ends with a pointerup that also fires a click — swallow it so
          // dropping Tiff doesn't also open the panel.
          if (movedRef.current) {
            movedRef.current = false;
            return;
          }
          setOpen(true);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{
          width: size,
          height: size,
          ...(pos ? { left: pos.x, top: pos.y } : {}),
        }}
        className={`group fixed z-50 touch-none rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage ${
          pos ? "cursor-grab active:cursor-grabbing" : "bottom-5 right-5"
        }`}
      >
        {/* Soft translucent halo that pulses only while a session is active, so
            the cut-out reads as "listening" without a solid frame. */}
        {active && (
          <span className="absolute inset-0 animate-ping rounded-full bg-sage/30" />
        )}
        {/* Just Tiff — no circle frame; transparent PNG on a drop shadow so she
            stays legible on any background. */}
        <Image
          src={avatarSrc}
          alt="Tiff, the Tiffany's Tales guide"
          fill
          sizes={`${Math.round(size)}px`}
          className="pointer-events-none object-contain drop-shadow-[0_3px_5px_rgba(0,0,0,0.35)]"
          priority
        />
      </button>
    );
  }

  // Expanded: cosy brand panel, anchored near wherever Tiff was dragged.
  const panelPos = pos ? clampToViewport(pos.x, pos.y, PANEL_W, PANEL_H) : null;
  return (
    <div
      style={panelPos ? { left: panelPos.x, top: panelPos.y } : undefined}
      className={`fixed z-50 w-[19rem] max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl ${
        panelPos ? "" : "bottom-5 right-5"
      }`}
    >
      {/* Header — also a drag handle for the whole panel. */}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex touch-none cursor-move select-none items-center justify-between bg-gradient-to-br from-primary to-plum px-4 py-3 text-cream"
      >
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
          onPointerDown={(e) => e.stopPropagation()}
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
