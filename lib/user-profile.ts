import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { userProfile } from "@/lib/schema";

// A member's free-text reading profile. Always scoped by userId so a member only
// ever reads/writes their own. Reads fail-soft (return empty) so the profile
// page renders blank fields rather than crashing on a DB hiccup.

export interface ReadingProfile {
  aboutYou: string;
  booksLike: string;
  dislikeInBooks: string;
  likeInBooks: string;
  preferredGenres: string;
}

export const EMPTY_READING_PROFILE: ReadingProfile = {
  aboutYou: "",
  booksLike: "",
  dislikeInBooks: "",
  likeInBooks: "",
  preferredGenres: "",
};

/** The member's reading profile, with empty strings for anything not yet set. */
export async function getUserProfile(userId: string): Promise<ReadingProfile> {
  try {
    const [row] = await db
      .select({
        aboutYou: userProfile.aboutYou,
        booksLike: userProfile.booksLike,
        dislikeInBooks: userProfile.dislikeInBooks,
        likeInBooks: userProfile.likeInBooks,
        preferredGenres: userProfile.preferredGenres,
      })
      .from(userProfile)
      .where(eq(userProfile.userId, userId));
    if (!row) return EMPTY_READING_PROFILE;
    return {
      aboutYou: row.aboutYou ?? "",
      booksLike: row.booksLike ?? "",
      dislikeInBooks: row.dislikeInBooks ?? "",
      likeInBooks: row.likeInBooks ?? "",
      preferredGenres: row.preferredGenres ?? "",
    };
  } catch (error) {
    console.error("[user-profile] read failed:", error);
    return EMPTY_READING_PROFILE;
  }
}

/** Create or update the member's reading profile (one row per user). */
export async function setUserProfile(
  userId: string,
  profile: ReadingProfile
): Promise<void> {
  const now = new Date();
  await db
    .insert(userProfile)
    .values({ userId, ...profile, updatedAt: now })
    .onConflictDoUpdate({
      target: userProfile.userId,
      set: { ...profile, updatedAt: now },
    });
}
