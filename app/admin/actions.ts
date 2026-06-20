"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/admin";
import { updateSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { goodreadsBook, instagramPost } from "@/lib/schema";
import {
  enrichCovers,
  fetchGoodreadsRss,
  parseGoodreadsCsv,
  parseGoodreadsRss,
  setGoodreadsUserId,
  upsertGoodreadsBooks,
} from "@/lib/goodreads";
import {
  fetchBeholdFeed,
  isBeholdUrl,
  parseBeholdFeed,
  setBeholdFeedUrl,
  upsertInstagramPosts,
} from "@/lib/instagram";

export type SettingsState = { ok: boolean; error?: string } | null;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Accepts a plain address or a "Display Name <email@domain>" form.
function emailValid(value: string) {
  const match = value.match(/<([^>]+)>/);
  const address = (match ? match[1] : value).trim();
  return EMAIL_RE.test(address);
}

/**
 * Admin-only Server Action to update the app's email settings. Re-checks admin
 * inside the action (defense in depth — never trust that the page guarded it).
 */
export async function updateSettingsAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  await requireAdmin();

  const emailFrom = String(formData.get("emailFrom") ?? "").trim();
  const adminNotificationRecipient = String(
    formData.get("adminNotificationRecipient") ?? ""
  ).trim();
  const contactRecipient = String(formData.get("contactRecipient") ?? "").trim();

  for (const [label, value] of [
    ["From address", emailFrom],
    ["Admin-notification recipient", adminNotificationRecipient],
    ["Contact recipient", contactRecipient],
  ] as const) {
    if (!value) {
      return { ok: false, error: `${label} can't be empty.` };
    }
    if (!emailValid(value)) {
      return { ok: false, error: `${label} isn't a valid email address.` };
    }
  }

  try {
    await updateSettings({
      emailFrom,
      adminNotificationRecipient,
      contactRecipient,
    });
    return { ok: true };
  } catch (error) {
    console.error("[admin] failed to save settings:", error);
    return { ok: false, error: "Couldn't save settings. Please try again." };
  }
}

export type ImportState =
  | { ok: true; imported: number; updated: number; total: number }
  | { ok: false; error: string }
  | null;

// Refresh the pages affected by an import: the admin tab and the public
// book-driven pages (reviews wall, the Good Reads shelf, and the Instagram feed).
function revalidateBookPages() {
  revalidatePath("/admin");
  revalidatePath("/reviews");
  revalidatePath("/goodreads");
  revalidatePath("/instagram");
}

/**
 * Admin-only: import a Goodreads "Export Library" CSV. The file is read on the
 * server, parsed and upserted by Goodreads book id (re-uploads update in place).
 */
export async function importGoodreadsCsvAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Please choose a Goodreads CSV file." };
  }
  if (file.size > 10 * 1024 * 1024) {
    return { ok: false, error: "That file is too large (max 10MB)." };
  }

  try {
    const text = await file.text();
    const parsed = parseGoodreadsCsv(text);
    if (parsed.length === 0) {
      return {
        ok: false,
        error: "No books found — is this a Goodreads library export?",
      };
    }
    // Resolve a real cover for every book (Open Library / Google Books).
    const books = await enrichCovers(parsed);
    const result = await upsertGoodreadsBooks(books);
    revalidateBookPages();
    return { ok: true, ...result };
  } catch (error) {
    console.error("[admin] Goodreads CSV import failed:", error);
    return { ok: false, error: "Couldn't read that CSV. Please try again." };
  }
}

/**
 * Admin-only: save a Goodreads numeric user id and sync its public "read" shelf
 * RSS feed (recent books; review text may be truncated by Goodreads).
 */
export async function syncGoodreadsRssAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "").trim();
  if (!/^\d+$/.test(userId)) {
    return {
      ok: false,
      error: "Enter your numeric Goodreads user id (digits only).",
    };
  }

  try {
    await setGoodreadsUserId(userId);
    const xml = await fetchGoodreadsRss(userId);
    const parsed = parseGoodreadsRss(xml);
    if (parsed.length === 0) {
      return {
        ok: false,
        error: "No books in that feed — check the user id is public.",
      };
    }
    // Resolve a real cover for every book (Goodreads image / Open Library / Google Books).
    const books = await enrichCovers(parsed);
    const result = await upsertGoodreadsBooks(books);
    revalidateBookPages();
    return { ok: true, ...result };
  } catch (error) {
    console.error("[admin] Goodreads RSS sync failed:", error);
    return {
      ok: false,
      error: "Couldn't reach Goodreads. Please try again shortly.",
    };
  }
}

/** Admin-only: show/hide a single imported book on the public reviews page. */
export async function setBookHiddenAction(
  bookId: string,
  hidden: boolean
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    await db
      .update(goodreadsBook)
      .set({ hidden, updatedAt: new Date() })
      .where(eq(goodreadsBook.id, bookId));
    revalidateBookPages();
    return { ok: true };
  } catch (error) {
    console.error("[admin] toggle book visibility failed:", error);
    return { ok: false };
  }
}

/**
 * Admin-only: save a Behold.so JSON feed URL for @tiffanystales and sync its
 * posts. Behold fronts Meta's Instagram API (which can no longer read personal
 * accounts directly). The URL is SSRF-guarded to https Behold hosts before any
 * fetch.
 */
export async function syncInstagramAction(
  _prev: ImportState,
  formData: FormData
): Promise<ImportState> {
  await requireAdmin();

  const feedUrl = String(formData.get("feedUrl") ?? "").trim();
  if (!isBeholdUrl(feedUrl)) {
    return {
      ok: false,
      error: "Enter a valid Behold feed URL (https://feeds.behold.so/...).",
    };
  }

  try {
    await setBeholdFeedUrl(feedUrl);
    const feed = await fetchBeholdFeed(feedUrl);
    const posts = parseBeholdFeed(feed);
    if (posts.length === 0) {
      return {
        ok: false,
        error: "No posts in that feed — check the Behold feed URL.",
      };
    }
    const result = await upsertInstagramPosts(posts);
    revalidateBookPages();
    return { ok: true, ...result };
  } catch (error) {
    console.error("[admin] Instagram sync failed:", error);
    return {
      ok: false,
      error: "Couldn't reach the Behold feed. Please try again shortly.",
    };
  }
}

/** Admin-only: show/hide a single Instagram post on the public pages. */
export async function setInstagramPostHiddenAction(
  postId: string,
  hidden: boolean
): Promise<{ ok: boolean }> {
  await requireAdmin();
  try {
    await db
      .update(instagramPost)
      .set({ hidden, updatedAt: new Date() })
      .where(eq(instagramPost.id, postId));
    revalidateBookPages();
    return { ok: true };
  } catch (error) {
    console.error("[admin] toggle Instagram post visibility failed:", error);
    return { ok: false };
  }
}
