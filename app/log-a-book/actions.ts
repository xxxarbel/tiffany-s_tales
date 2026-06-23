"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getSafeSession } from "@/lib/auth";
import {
  addBookLogEntry,
  deleteBookLogEntry,
  setBookLogRating,
} from "@/lib/book-log";

// `token` is a fresh id on every successful add so the client can detect a new
// success and reset the form (it changes even when two adds look identical).
export type LogState =
  | { ok: true; token: string }
  | { ok: false; error: string }
  | null;

// Coerce a submitted rating to a valid 1–5, or null (unrated). 0 / blank / out
// of range all mean "unrated".
function toRating(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.min(5, Math.max(1, Math.round(n)));
}

/**
 * Add a book to the signed-in member's reading log. Auth is re-checked here (not
 * trusting the page guard); the entry is always written for the session user, so
 * a member can only ever add to their own log.
 */
export async function addBookAction(
  _prev: LogState,
  formData: FormData
): Promise<LogState> {
  const session = await getSafeSession();
  if (!session) return { ok: false, error: "Please sign in to log a book." };

  const title = String(formData.get("title") ?? "").trim();
  const author = String(formData.get("author") ?? "").trim();
  const genre = String(formData.get("genre") ?? "").trim();
  const rating = toRating(formData.get("rating"));

  if (!title) return { ok: false, error: "Enter the book's title." };

  try {
    await addBookLogEntry({
      userId: session.user.id,
      title,
      author: author || null,
      genre: genre || null,
      rating,
    });
    revalidatePath("/log-a-book");
    return { ok: true, token: randomUUID() };
  } catch (error) {
    console.error("[log-a-book] add failed:", error);
    return { ok: false, error: "Couldn't save that book. Please try again." };
  }
}

/** Update the paw rating on one of the member's logged books (0 clears it). */
export async function updateRatingAction(
  id: string,
  rating: number
): Promise<{ ok: boolean }> {
  const session = await getSafeSession();
  if (!session) return { ok: false };
  try {
    await setBookLogRating(session.user.id, id, toRating(rating));
    revalidatePath("/log-a-book");
    return { ok: true };
  } catch (error) {
    console.error("[log-a-book] rating update failed:", error);
    return { ok: false };
  }
}

/** Remove one of the member's logged books. */
export async function deleteBookAction(id: string): Promise<{ ok: boolean }> {
  const session = await getSafeSession();
  if (!session) return { ok: false };
  try {
    await deleteBookLogEntry(session.user.id, id);
    revalidatePath("/log-a-book");
    return { ok: true };
  } catch (error) {
    console.error("[log-a-book] delete failed:", error);
    return { ok: false };
  }
}
