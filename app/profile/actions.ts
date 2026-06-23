"use server";

import { revalidatePath } from "next/cache";

import { getSafeSession } from "@/lib/auth";
import { setUserProfile, type ReadingProfile } from "@/lib/user-profile";

export type ProfileState = { ok: boolean; error?: string } | null;

/**
 * Save the signed-in member's free-text reading profile. Auth is re-checked here
 * (not trusting the page guard); the profile is always written for the session
 * user, so a member can only ever edit their own.
 */
export async function saveReadingProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const session = await getSafeSession();
  if (!session) {
    return { ok: false, error: "Please sign in to update your profile." };
  }

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const profile: ReadingProfile = {
    aboutYou: get("aboutYou"),
    booksLike: get("booksLike"),
    dislikeInBooks: get("dislikeInBooks"),
    likeInBooks: get("likeInBooks"),
    preferredGenres: get("preferredGenres"),
  };

  try {
    await setUserProfile(session.user.id, profile);
    revalidatePath("/profile");
    return { ok: true };
  } catch (error) {
    console.error("[profile] save reading profile failed:", error);
    return { ok: false, error: "Couldn't save your profile. Please try again." };
  }
}
