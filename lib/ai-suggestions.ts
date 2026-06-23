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
