"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { requireAdmin } from "@/lib/admin";
import { updateSettings } from "@/lib/settings";
import { db } from "@/lib/db";
import { goodreadsBook, instagramPost } from "@/lib/schema";
import {
  fetchGoodreadsRss,
  parseGoodreadsCsv,
  parseGoodreadsRss,
  resolveCoverUrl,
  setGoodreadsUserId,
  upsertGoodreadsBooks,
} from "@/lib/goodreads";
import { isBeholdUrl, syncInstagramFeed } from "@/lib/instagram";
import { setVoiceAgentConfig } from "@/lib/voice/agent-config";
import { THINK_PROVIDERS, type AgentConfig } from "@/lib/voice-agent/settings";
import { setBookOfMonth, type BookOfMonth } from "@/lib/book-of-the-month";

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

/**
 * Admin-only Server Action to save the voice assistant config (model, voice,
 * prompt, …). Stored centrally so it controls the assistant for every visitor.
 * Re-checks admin (defense in depth) and clamps the numeric ranges.
 */
export async function saveVoiceConfigAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  await requireAdmin();

  const get = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string, min: number, max: number, fallback: number) => {
    const n = Number(formData.get(k));
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  };

  const thinkProvider = get("thinkProvider");
  const thinkModel = get("thinkModel");
  const voice = get("voice");
  const prompt = get("prompt");
  const greeting = get("greeting");

  if (!THINK_PROVIDERS.some((p) => p.value === thinkProvider)) {
    return { ok: false, error: "Pick a valid LLM provider." };
  }
  // The model can be one of the curated ids or a custom one the owner typed.
  if (!thinkModel) return { ok: false, error: "Model can't be empty." };
  if (!voice) return { ok: false, error: "Pick a voice." };
  if (!prompt) return { ok: false, error: "The system prompt can't be empty." };
  if (!greeting) return { ok: false, error: "The greeting can't be empty." };

  const config: AgentConfig = {
    listenModel: get("listenModel") || "flux-general-en",
    thinkProvider,
    thinkModel,
    temperature: num("temperature", 0, 1, 0.7),
    voice,
    speed: num("speed", 0.7, 1.5, 1),
    language: get("language") || "en",
    greeting,
    prompt,
    avatarScale: num("avatarScale", 0.5, 3, 1),
  };

  try {
    await setVoiceAgentConfig(config);
    revalidatePath("/admin");
    return { ok: true };
  } catch (error) {
    console.error("[admin] failed to save voice config:", error);
    return { ok: false, error: "Couldn't save the voice settings. Try again." };
  }
}

/**
 * Admin-only Server Action to save the curated Book of the Month shown on the
 * public /book-of-the-month page. Re-checks admin (defense in depth). When the
 * owner leaves the cover blank we resolve a real one from the title/author
 * (Open Library → Google Books) so a referenced book always shows a picture.
 */
export async function saveBookOfMonthAction(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  await requireAdmin();

  const get = (k: string) => String(formData.get(k) ?? "").trim();

  const title = get("title");
  if (!title) return { ok: false, error: "Book title can't be empty." };

  const author = get("author");
  let coverUrl = get("coverUrl");

  // Only resolve when the admin didn't paste a cover — a single book, so the
  // external lookups are cheap (unlike the full-library import, §8f).
  if (!coverUrl) {
    try {
      coverUrl =
        (await resolveCoverUrl({
          title,
          author: author || null,
          isbn: null,
          isbn13: null,
          coverUrl: null,
        })) ?? "";
    } catch (error) {
      console.error("[admin] book-of-month cover resolve failed:", error);
      coverUrl = "";
    }
  }

  const book: BookOfMonth = {
    published: get("published") === "true",
    month: get("month"),
    title,
    author,
    coverUrl,
    description: get("description"),
    whyPicked: get("whyPicked"),
    meetingInfo: get("meetingInfo"),
    purchaseUrl: get("purchaseUrl"),
  };

  try {
    await setBookOfMonth(book);
    revalidatePath("/admin");
    revalidatePath("/book-of-the-month");
    revalidatePath("/"); // the homepage now features the current pick too
    return { ok: true };
  } catch (error) {
    console.error("[admin] failed to save book of the month:", error);
    return { ok: false, error: "Couldn't save the Book of the Month. Try again." };
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
    // Upsert immediately (no inline cover resolution — that makes thousands of
    // external lookups and times out on Vercel for a full library). Covers are
    // filled in afterwards by the background job (see resolveMissingCovers /
    // /api/cron/goodreads-covers); until then BookCover shows a text fallback.
    const result = await upsertGoodreadsBooks(parsed);
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
    // RSS already carries Goodreads' own cover images, so upsert directly. The
    // background job (resolveMissingCovers) fills any that came through empty.
    const result = await upsertGoodreadsBooks(parsed);
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
    const result = await syncInstagramFeed(feedUrl);
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
