import { randomUUID } from "node:crypto";
import { desc, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appSettings, instagramPost } from "@/lib/schema";

const INSTAGRAM_BEHOLD_FEED_URL_KEY = "instagram_behold_feed_url";

// The @tiffanystales Behold JSON feed. Used as the default when no URL has been
// configured in admin yet, so the public pages and the daily cron sync work
// out of the box. The admin can still override it via the Instagram tab.
// NOTE: this is the *feed* id (from app.behold.so), NOT the widget id — the
// widget id (B69HSEq0diccWSOVNBUX) 404s on feeds.behold.so. Behold's free plan
// caps this feed at the 6 most recent posts; the daily sync accumulates more
// over time (we never delete), and raising Behold's post limit exposes more.
export const DEFAULT_BEHOLD_FEED_URL =
  "https://feeds.behold.so/jAqgUAD6CVwfWmBrRzzd";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Shape of a single image size variant in a Behold feed post.
type BeholdSize = {
  mediaUrl?: string;
  width?: number;
  height?: number;
};

// A post as returned by a Behold.so JSON feed. Only the fields we use are typed;
// Behold returns more. See https://behold.so/docs/feed-json/.
export type BeholdPost = {
  id?: string;
  timestamp?: string;
  permalink?: string;
  mediaType?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  sizes?: {
    small?: BeholdSize;
    medium?: BeholdSize;
    large?: BeholdSize;
    full?: BeholdSize;
  };
  caption?: string;
  prunedCaption?: string;
  altText?: string;
  likeCount?: number;
  commentsCount?: number;
};

export type BeholdFeed = {
  username?: string;
  posts?: BeholdPost[];
};

export type NormalizedPost = {
  instagramId: string;
  permalink: string | null;
  caption: string | null;
  mediaType: string | null;
  imageUrl: string | null;
  altText: string | null;
  likeCount: number | null;
  commentsCount: number | null;
  postedAt: Date | null;
};

export type InstagramPostRow = typeof instagramPost.$inferSelect;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toNullableString(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  return value.length ? value : null;
}

function toNullableInt(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toDate(raw: unknown): Date | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * SSRF guard. We fetch a URL the admin pastes, so before any request we require
 * it to be an https Behold feed. Anything else is rejected without a fetch.
 */
export function isBeholdUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  const host = parsed.hostname.toLowerCase();
  return host === "behold.so" || host.endsWith(".behold.so");
}

/**
 * Map a Behold URL to its JSON feed form. The Behold *dashboard* URL
 * (`app.behold.so/feeds/<id>`) serves an HTML page, not JSON — pasting it would
 * make the fetch return `<!doctype …>` and JSON.parse blow up. The actual feed
 * lives at `feeds.behold.so/<id>`, so we rewrite the dashboard form to it.
 * Anything else is returned unchanged.
 */
export function normalizeBeholdFeedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.toLowerCase() === "app.behold.so") {
      const match = parsed.pathname.match(/\/feeds\/([^/]+)/);
      if (match) return `https://feeds.behold.so/${match[1]}`;
    }
    return url;
  } catch {
    return url;
  }
}

// ---------------------------------------------------------------------------
// Fetch + parse (mirrors fetchGoodreadsRss / parseGoodreadsRss)
// ---------------------------------------------------------------------------

export async function fetchBeholdFeed(url: string): Promise<BeholdFeed> {
  const res = await fetch(url, {
    headers: { "User-Agent": "TiffanysTales/1.0 (+book club site)" },
    // Behold feeds refresh roughly daily; let the platform cache briefly.
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Behold feed returned ${res.status}`);
  }
  // A wrong URL (e.g. the HTML dashboard page) returns 200 with HTML, which
  // would crash JSON.parse with a cryptic "<!doctype" error. Fail clearly.
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) {
    throw new Error(
      `Behold feed returned ${contentType || "non-JSON"} — use the JSON feed URL (https://feeds.behold.so/...)`
    );
  }
  return (await res.json()) as BeholdFeed;
}

export function parseBeholdFeed(feed: BeholdFeed): NormalizedPost[] {
  const rawPosts = feed?.posts;
  if (!Array.isArray(rawPosts)) return [];

  const posts: NormalizedPost[] = [];
  for (const post of rawPosts) {
    const instagramId = toNullableString(post.id);
    if (!instagramId) continue; // can't upsert without a stable id

    const sizes = post.sizes ?? {};
    const imageUrl =
      toNullableString(sizes.medium?.mediaUrl) ??
      toNullableString(sizes.large?.mediaUrl) ??
      toNullableString(post.mediaUrl) ??
      toNullableString(post.thumbnailUrl);

    posts.push({
      instagramId,
      permalink: toNullableString(post.permalink),
      caption:
        toNullableString(post.prunedCaption) ?? toNullableString(post.caption),
      mediaType: toNullableString(post.mediaType),
      imageUrl,
      altText: toNullableString(post.altText),
      likeCount: toNullableInt(post.likeCount),
      commentsCount: toNullableInt(post.commentsCount),
      postedAt: toDate(post.timestamp),
    });
  }
  return posts;
}

// ---------------------------------------------------------------------------
// Persistence (mirrors upsertGoodreadsBooks)
// ---------------------------------------------------------------------------

export async function upsertInstagramPosts(
  posts: NormalizedPost[]
): Promise<{ imported: number; updated: number; total: number }> {
  // De-dupe within the batch, keeping the last occurrence of each id.
  const byId = new Map<string, NormalizedPost>();
  for (const p of posts) byId.set(p.instagramId, p);
  const unique = [...byId.values()];
  if (unique.length === 0) return { imported: 0, updated: 0, total: 0 };

  const ids = unique.map((p) => p.instagramId);
  const existingRows = await db
    .select({ id: instagramPost.instagramId })
    .from(instagramPost)
    .where(inArray(instagramPost.instagramId, ids));
  const existing = new Set(existingRows.map((r) => r.id));
  const updated = unique.filter((p) => existing.has(p.instagramId)).length;

  const now = new Date();
  const values = unique.map((p) => ({ id: randomUUID(), ...p, updatedAt: now }));

  await db
    .insert(instagramPost)
    .values(values)
    .onConflictDoUpdate({
      target: instagramPost.instagramId,
      set: {
        // Enrichment: keep a newly-provided value, else fall back to existing.
        // Never overwrite `hidden` — that's owner-curated, not from the feed.
        permalink: sql`coalesce(excluded.permalink, ${instagramPost.permalink})`,
        caption: sql`coalesce(excluded.caption, ${instagramPost.caption})`,
        mediaType: sql`coalesce(excluded.media_type, ${instagramPost.mediaType})`,
        imageUrl: sql`coalesce(excluded.image_url, ${instagramPost.imageUrl})`,
        altText: sql`coalesce(excluded.alt_text, ${instagramPost.altText})`,
        likeCount: sql`coalesce(excluded.like_count, ${instagramPost.likeCount})`,
        commentsCount: sql`coalesce(excluded.comments_count, ${instagramPost.commentsCount})`,
        postedAt: sql`coalesce(excluded.posted_at, ${instagramPost.postedAt})`,
        updatedAt: now,
      },
    });

  return { imported: unique.length - updated, updated, total: unique.length };
}

// ---------------------------------------------------------------------------
// Queries (all fail-soft → empty, mirroring lib/goodreads.ts)
// ---------------------------------------------------------------------------

export async function getPublicInstagramPosts(
  limit = 48
): Promise<InstagramPostRow[]> {
  try {
    return await db
      .select()
      .from(instagramPost)
      .where(eq(instagramPost.hidden, false))
      .orderBy(sql`${instagramPost.postedAt} desc nulls last`)
      .limit(limit);
  } catch (error) {
    console.error("[instagram] getPublicInstagramPosts failed:", error);
    return [];
  }
}

export async function getAdminPosts(
  limit = 100
): Promise<{ posts: InstagramPostRow[]; total: number }> {
  try {
    const posts = await db
      .select()
      .from(instagramPost)
      .orderBy(desc(instagramPost.updatedAt))
      .limit(limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(instagramPost);
    return { posts, total: Number(count) };
  } catch (error) {
    console.error("[instagram] getAdminPosts failed:", error);
    return { posts: [], total: 0 };
  }
}

export async function getBeholdFeedUrl(): Promise<string> {
  try {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, INSTAGRAM_BEHOLD_FEED_URL_KEY));
    return row?.value?.trim() || DEFAULT_BEHOLD_FEED_URL;
  } catch (error) {
    console.error("[instagram] getBeholdFeedUrl failed:", error);
    return DEFAULT_BEHOLD_FEED_URL;
  }
}

/**
 * Fetch the Behold feed and upsert its posts. Shared by the admin sync action
 * and the daily cron route. Resolves the URL from the argument, else from
 * settings (which falls back to DEFAULT_BEHOLD_FEED_URL). SSRF-guarded before
 * any fetch; throws on a bad URL, an unreachable feed, or an empty feed so
 * callers can surface an error. Does not revalidate — that's the caller's job.
 */
export async function syncInstagramFeed(
  feedUrl?: string
): Promise<{ imported: number; updated: number; total: number }> {
  const raw = (feedUrl ?? (await getBeholdFeedUrl())).trim();
  if (!isBeholdUrl(raw)) {
    throw new Error("Invalid Behold feed URL");
  }
  const url = normalizeBeholdFeedUrl(raw);
  await setBeholdFeedUrl(url);
  const feed = await fetchBeholdFeed(url);
  const posts = parseBeholdFeed(feed);
  if (posts.length === 0) {
    throw new Error("Behold feed contained no posts");
  }
  return upsertInstagramPosts(posts);
}

export async function setBeholdFeedUrl(url: string): Promise<void> {
  const value = url.trim();
  await db
    .insert(appSettings)
    .values({ key: INSTAGRAM_BEHOLD_FEED_URL_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}
