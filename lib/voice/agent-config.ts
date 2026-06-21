import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import {
  DEFAULT_AGENT_CONFIG,
  type AgentConfig,
} from "@/lib/voice-agent/settings";

// The owner-editable voice agent config (model, voice, prompt, …) lives in the
// app_settings key/value table as one JSON blob, so the admin can tune the
// assistant for ALL visitors without a redeploy. Read server-side and passed to
// the client provider; falls back to DEFAULT_AGENT_CONFIG until the owner saves.

const VOICE_CONFIG_KEY = "voice_agent_config";

// Only these keys are accepted from storage, so a stale/oversized blob can't
// inject arbitrary fields into the Settings handshake.
const STRING_KEYS = [
  "listenModel",
  "thinkProvider",
  "thinkModel",
  "voice",
  "language",
  "greeting",
  "prompt",
] as const;
const NUMBER_KEYS = ["temperature", "speed"] as const;

function sanitize(raw: unknown): Partial<AgentConfig> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: Partial<AgentConfig> = {};
  const sink = out as Record<string, unknown>;
  for (const key of STRING_KEYS) {
    if (typeof obj[key] === "string") sink[key] = obj[key];
  }
  for (const key of NUMBER_KEYS) {
    if (typeof obj[key] === "number") sink[key] = obj[key];
  }
  return out;
}

/**
 * The effective voice agent config: stored overrides merged over the defaults.
 * Never throws — a DB failure returns the defaults so the assistant still works.
 */
export async function getVoiceAgentConfig(): Promise<AgentConfig> {
  try {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, VOICE_CONFIG_KEY));
    if (!row?.value) return DEFAULT_AGENT_CONFIG;
    const stored = sanitize(JSON.parse(row.value));
    return { ...DEFAULT_AGENT_CONFIG, ...stored };
  } catch (error) {
    console.error("[voice] getVoiceAgentConfig failed, using defaults:", error);
    return DEFAULT_AGENT_CONFIG;
  }
}

/** Persist the full voice agent config (whole object, sanitized). */
export async function setVoiceAgentConfig(config: AgentConfig): Promise<void> {
  const value = JSON.stringify({ ...DEFAULT_AGENT_CONFIG, ...sanitize(config) });
  await db
    .insert(appSettings)
    .values({ key: VOICE_CONFIG_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
