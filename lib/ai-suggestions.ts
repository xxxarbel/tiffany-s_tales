import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { aiSuggestions } from "@/lib/schema";

// The latest AI book suggestions for a member. Always scoped by userId so a
// member only ever reads/writes their own. Reads fail-soft (return null) so the
// page renders the empty state rather than crashing on a DB hiccup or a row that
// predates a schema change. The picks live as a JSON-encoded `Suggestion[]` in a
// text column (this schema uses plain text for all rich fields — no jsonb).

export interface Suggestion {
  title: string;
  author: string;
  reason: string;
  coverUrl: string | null;
}

export interface StoredSuggestions {
  suggestions: Suggestion[];
  model: string;
  generatedAt: Date;
}

/**
 * Members may generate at most one set of suggestions per this window (a rolling
 * 24h, not a calendar day, so it's timezone-proof). Enforced server-side in the
 * action; the UI mirrors it by disabling the button until `nextAllowedAt`.
 */
export const SUGGESTIONS_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/**
 * The earliest the member may generate again given their last generation, or
 * null if they've never generated (no cooldown). Compare against `Date.now()`.
 */
export function nextAllowedAt(
  lastGeneratedAt: Date | null | undefined
): Date | null {
  if (!lastGeneratedAt) return null;
  return new Date(lastGeneratedAt.getTime() + SUGGESTIONS_COOLDOWN_MS);
}

/**
 * Whether the member is currently within the cooldown and may not regenerate.
 * Lives here (not in a component) so the `Date.now()` read stays out of React's
 * render path. The server action is still the authoritative gate.
 */
export function suggestionsOnCooldown(
  lastGeneratedAt: Date | null | undefined
): boolean {
  const next = nextAllowedAt(lastGeneratedAt);
  return next !== null && next.getTime() > Date.now();
}

/** The member's stored suggestions, or null if none have been generated yet. */
export async function getAiSuggestions(
  userId: string
): Promise<StoredSuggestions | null> {
  try {
    const [row] = await db
      .select({
        suggestions: aiSuggestions.suggestions,
        model: aiSuggestions.model,
        generatedAt: aiSuggestions.generatedAt,
      })
      .from(aiSuggestions)
      .where(eq(aiSuggestions.userId, userId));
    if (!row?.suggestions) return null;
    const suggestions = JSON.parse(row.suggestions) as Suggestion[];
    if (!Array.isArray(suggestions)) return null;
    return {
      suggestions,
      model: row.model ?? "",
      generatedAt: row.generatedAt,
    };
  } catch (error) {
    console.error("[ai-suggestions] read failed:", error);
    return null;
  }
}

/**
 * The member's last generation time, or null if they've never generated. Used to
 * enforce the {@link SUGGESTIONS_COOLDOWN_MS} limit without deserialising the
 * whole suggestions blob. Fails soft (null) so a DB hiccup never blocks the
 * member — the action would simply allow a generation.
 */
export async function getSuggestionsGeneratedAt(
  userId: string
): Promise<Date | null> {
  try {
    const [row] = await db
      .select({ generatedAt: aiSuggestions.generatedAt })
      .from(aiSuggestions)
      .where(eq(aiSuggestions.userId, userId));
    return row?.generatedAt ?? null;
  } catch (error) {
    console.error("[ai-suggestions] generatedAt read failed:", error);
    return null;
  }
}

/** Create or replace the member's latest suggestions (one row per user). */
export async function setAiSuggestions(
  userId: string,
  model: string,
  suggestions: Suggestion[]
): Promise<void> {
  const now = new Date();
  const json = JSON.stringify(suggestions);
  await db
    .insert(aiSuggestions)
    .values({ userId, suggestions: json, model, generatedAt: now })
    .onConflictDoUpdate({
      target: aiSuggestions.userId,
      set: { suggestions: json, model, generatedAt: now },
    });
}
