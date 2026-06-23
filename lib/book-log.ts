import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { bookLog } from "@/lib/schema";

// Per-member reading log. Every query/mutation is scoped by `userId` so a member
// can only ever see or change their own books. Reads fail-soft (return []); the
// page renders an empty list rather than crashing on a DB hiccup.

export type BookLogRow = typeof bookLog.$inferSelect;

/** All of a member's logged books, newest first. */
export async function getBookLog(userId: string): Promise<BookLogRow[]> {
  try {
    return await db
      .select()
      .from(bookLog)
      .where(eq(bookLog.userId, userId))
      .orderBy(desc(bookLog.createdAt));
  } catch (error) {
    console.error("[book-log] read failed:", error);
    return [];
  }
}

/** Add one book to a member's log. */
export async function addBookLogEntry(entry: {
  userId: string;
  title: string;
  author: string | null;
  genre: string | null;
  rating: number | null;
}): Promise<void> {
  const now = new Date();
  await db.insert(bookLog).values({
    id: randomUUID(),
    userId: entry.userId,
    title: entry.title,
    author: entry.author,
    genre: entry.genre,
    rating: entry.rating,
    createdAt: now,
    updatedAt: now,
  });
}

/** Set (or clear, with null) the paw rating on one of the member's books. */
export async function setBookLogRating(
  userId: string,
  id: string,
  rating: number | null
): Promise<void> {
  await db
    .update(bookLog)
    .set({ rating, updatedAt: new Date() })
    // Scope by userId too — a member can't rate someone else's row.
    .where(and(eq(bookLog.id, id), eq(bookLog.userId, userId)));
}

/** Remove one of the member's logged books. */
export async function deleteBookLogEntry(
  userId: string,
  id: string
): Promise<void> {
  await db
    .delete(bookLog)
    .where(and(eq(bookLog.id, id), eq(bookLog.userId, userId)));
}
