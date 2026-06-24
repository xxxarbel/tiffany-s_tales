"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getSafeSession } from "@/lib/auth";
import { getAnthropicApiKey } from "@/lib/anthropic";
import {
  getSuggestionsGeneratedAt,
  nextAllowedAt,
  setAiSuggestions,
} from "@/lib/ai-suggestions";
import { generateSuggestions } from "@/lib/ai-suggestions-generate";

/** Human-friendly "in about N hours/minutes" for the cooldown message. */
function formatWait(until: Date): string {
  const ms = until.getTime() - Date.now();
  const hours = Math.ceil(ms / (60 * 60 * 1000));
  if (hours > 1) return `in about ${hours} hours`;
  const minutes = Math.max(1, Math.ceil(ms / (60 * 1000)));
  return `in about ${minutes} minute${minutes === 1 ? "" : "s"}`;
}

// `token` is a fresh id on every success so the client can detect a new result
// and refresh, even when two runs look identical.
export type SuggestState =
  | { ok: true; token: string }
  | { ok: false; error: string }
  | null;

/**
 * Generate (or refresh) the signed-in member's AI book suggestions and persist
 * the latest set. Auth is re-checked here (not trusting the page guard); the row
 * is always written for the session user. Returns a friendly error rather than
 * throwing, so the button can surface it.
 */
export async function generateSuggestionsAction(): Promise<SuggestState> {
  const session = await getSafeSession();
  if (!session) {
    return { ok: false, error: "Please sign in to get suggestions." };
  }
  if (!getAnthropicApiKey()) {
    return {
      ok: false,
      error: "AI suggestions aren't available right now. Please try again later.",
    };
  }

  // Once every 24h per member. Enforced here (not just in the UI) so the limit
  // can't be bypassed by replaying the action. The check is generous on failure:
  // if we can't read the last time, we allow the generation rather than block it.
  const nextAt = nextAllowedAt(await getSuggestionsGeneratedAt(session.user.id));
  if (nextAt && nextAt.getTime() > Date.now()) {
    return {
      ok: false,
      error: `Tiffany shares fresh picks once a day — check back ${formatWait(nextAt)}.`,
    };
  }

  try {
    const suggestions = await generateSuggestions(session.user.id);
    if (suggestions.length === 0) {
      return {
        ok: false,
        error: "Tiffany couldn't find any picks this time. Please try again.",
      };
    }
    await setAiSuggestions(session.user.id, "claude-haiku-4-5", suggestions);
    revalidatePath("/ai-suggestions");
    return { ok: true, token: randomUUID() };
  } catch (error) {
    console.error("[ai-suggestions] generate failed:", error);
    return {
      ok: false,
      error: "Tiffany ran into trouble reading up on you. Please try again.",
    };
  }
}
