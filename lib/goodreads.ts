import { randomUUID } from "node:crypto";
import Papa from "papaparse";
import { XMLParser } from "fast-xml-parser";
import { and, desc, eq, gt, inArray, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { appSettings, goodreadsBook } from "@/lib/schema";

const GOODREADS_USER_ID_KEY = "goodreads_user_id";

// Goodreads shut down its public API, so the two viable import sources are the
// CSV library export (complete) and the public per-shelf RSS feed (recent,
// often truncated). Both are normalised to the shape below and upserted by
// `goodreadsId` so re-imports update rather than duplicate.

export type NormalizedBook = {
  goodreadsId: string;
  title: string;
  author: string | null;
  isbn: string | null;
  isbn13: string | null;
  coverUrl: string | null;
  myRating: number | null;
  averageRating: string | null;
  myReview: string | null;
  shelf: string | null;
  dateRead: Date | null;
  dateAdded: Date | null;
  yearPublished: number | null;
  source: "csv" | "rss";
};

export type GoodreadsBookRow = typeof goodreadsBook.$inferSelect;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Goodreads CSV wraps ISBNs as Excel-safe `="0439023483"`. Strip to digits/X. */
function cleanIsbn(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[="]/g, "").trim();
  return cleaned.length ? cleaned : null;
}

function toNullableString(raw: unknown): string | null {
  if (raw === undefined || raw === null) return null;
  const value = String(raw).trim();
  return value.length ? value : null;
}

function toRating(raw: unknown): number | null {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n) || n <= 0) return null; // 0 / blank = unrated
  return Math.min(5, Math.max(1, n));
}

function toYear(raw: unknown): number | null {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function toDate(raw: unknown): Date | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Turns Goodreads' lightly-HTML review text into clean, displayable plain text. */
function cleanReview(raw: unknown): string | null {
  const value = String(raw ?? "");
  if (!value.trim()) return null;
  const text = value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&hellip;/g, "…")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return text.length ? text : null;
}

/** Open Library cover from an ISBN; `default=false` yields a 404 when missing. */
export function coverFromIsbn(
  isbn13: string | null,
  isbn: string | null
): string | null {
  const value = isbn13 || isbn;
  if (!value) return null;
  return `https://covers.openlibrary.org/b/isbn/${value}-L.jpg?default=false`;
}

// ---------------------------------------------------------------------------
// Cover resolution — guarantee every book gets a real picture by trying several
// sources in order, so a book without an ISBN (or with a dead cover URL) still
// shows an actual cover rather than a placeholder. The resolved URL is stored on
// the book at import/sync time; if every source comes up empty the display falls
// back to a generated text cover (see <BookCover />).
// ---------------------------------------------------------------------------

const COVER_FETCH_OPTS = {
  headers: { "User-Agent": "TiffanysTales/1.0 (+book club site)" },
  // Cover lookups change rarely; let the platform cache for a day.
  next: { revalidate: 86400 },
} as const;

/** True if a URL responds OK to a HEAD request (used to confirm a cover exists). */
async function urlOk(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", ...COVER_FETCH_OPTS });
    return res.ok;
  } catch {
    return false;
  }
}

/** Open Library search by title/author → large cover by cover id. */
async function coverFromOpenLibrarySearch(
  title: string,
  author: string | null
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      title,
      limit: "1",
      fields: "cover_i",
    });
    if (author) params.set("author", author);
    const res = await fetch(
      `https://openlibrary.org/search.json?${params.toString()}`,
      COVER_FETCH_OPTS
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { docs?: { cover_i?: number }[] };
    const coverId = data?.docs?.[0]?.cover_i;
    return coverId
      ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
      : null;
  } catch {
    return null;
  }
}

/** Google Books search by title/author → thumbnail (upgraded to https). */
async function coverFromGoogleBooks(
  title: string,
  author: string | null
): Promise<string | null> {
  try {
    const params = new URLSearchParams({
      q: author ? `intitle:${title} inauthor:${author}` : `intitle:${title}`,
      maxResults: "1",
    });
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes?${params.toString()}`,
      COVER_FETCH_OPTS
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      items?: { volumeInfo?: { imageLinks?: Record<string, string> } }[];
    };
    const links = data?.items?.[0]?.volumeInfo?.imageLinks;
    const raw = links?.thumbnail || links?.smallThumbnail;
    if (!raw) return null;
    // Google serves http and a curled-page edge; normalise to a clean https URL.
    return raw.replace(/^http:/, "https:").replace(/&edge=curl/, "");
  } catch {
    return null;
  }
}

/**
 * Resolve the best available cover URL for a book, trying, in order:
 *   0. a source-provided cover (e.g. a Goodreads image) that loads,
 *   1. Open Library by ISBN,
 *   2. Open Library search by title/author,
 *   3. Google Books by title/author.
 * Returns null only when nothing is found (display then renders a text cover).
 */
export async function resolveCoverUrl(book: {
  title: string;
  author: string | null;
  isbn: string | null;
  isbn13: string | null;
  coverUrl: string | null;
}): Promise<string | null> {
  const sourceCover =
    book.coverUrl && !book.coverUrl.includes("covers.openlibrary.org")
      ? book.coverUrl
      : null;

  // 0. Trust a working non-Open-Library source cover (Goodreads images).
  if (sourceCover && (await urlOk(sourceCover))) return sourceCover;

  // 1. Open Library by ISBN (default=false → 404 when there's no cover).
  const isbnUrl = coverFromIsbn(book.isbn13, book.isbn);
  if (isbnUrl && (await urlOk(isbnUrl))) return isbnUrl;

  // 2. Open Library search by title/author.
  const olSearch = await coverFromOpenLibrarySearch(book.title, book.author);
  if (olSearch && (await urlOk(olSearch))) return olSearch;

  // 3. Google Books by title/author.
  const googleCover = await coverFromGoogleBooks(book.title, book.author);
  if (googleCover) return googleCover;

  // Nothing verified. Keep a source cover (HEAD can be flaky) rather than a
  // known-bad Open Library ISBN guess; else null → generated text cover.
  return sourceCover;
}

/** Resolve covers for a batch of books with bounded concurrency. */
export async function enrichCovers(
  books: NormalizedBook[]
): Promise<NormalizedBook[]> {
  const CONCURRENCY = 8;
  const result = [...books];
  let cursor = 0;

  async function worker() {
    while (cursor < result.length) {
      const i = cursor++;
      const book = result[i];
      result[i] = { ...book, coverUrl: await resolveCoverUrl(book) };
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, result.length) }, worker)
  );
  return result;
}

// ---------------------------------------------------------------------------
// CSV (full library export)
// ---------------------------------------------------------------------------

type CsvRow = Record<string, string>;

/** Parses a Goodreads "Export Library" CSV into normalised books. */
export function parseGoodreadsCsv(text: string): NormalizedBook[] {
  const { data } = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const books: NormalizedBook[] = [];
  for (const row of data) {
    const goodreadsId = toNullableString(row["Book Id"]);
    const title = toNullableString(row["Title"]);
    if (!goodreadsId || !title) continue;

    const isbn = cleanIsbn(row["ISBN"]);
    const isbn13 = cleanIsbn(row["ISBN13"]);

    books.push({
      goodreadsId,
      title,
      author: toNullableString(row["Author"]),
      isbn,
      isbn13,
      coverUrl: coverFromIsbn(isbn13, isbn),
      myRating: toRating(row["My Rating"]),
      averageRating: toNullableString(row["Average Rating"]),
      myReview: cleanReview(row["My Review"]),
      shelf: toNullableString(row["Exclusive Shelf"]),
      dateRead: toDate(row["Date Read"]),
      dateAdded: toDate(row["Date Added"]),
      yearPublished: toYear(
        row["Original Publication Year"] || row["Year Published"]
      ),
      source: "csv",
    });
  }
  return books;
}

// ---------------------------------------------------------------------------
// RSS (recent reads, by user id)
// ---------------------------------------------------------------------------

const RSS_PARSER = new XMLParser({ ignoreAttributes: true });

/** Fetches the public "read" shelf RSS for a Goodreads numeric user id. */
export async function fetchGoodreadsRss(userId: string): Promise<string> {
  const url = `https://www.goodreads.com/review/list_rss/${encodeURIComponent(
    userId
  )}?shelf=read`;
  const res = await fetch(url, {
    headers: { "User-Agent": "TiffanysTales/1.0 (+book club site)" },
    // Goodreads feeds change slowly; let the platform cache briefly.
    next: { revalidate: 3600 },
  });
  if (!res.ok) {
    throw new Error(`Goodreads RSS returned ${res.status}`);
  }
  return res.text();
}

type RssItem = Record<string, unknown>;

/** Parses a Goodreads RSS feed body into normalised books. */
export function parseGoodreadsRss(xml: string): NormalizedBook[] {
  const parsed = RSS_PARSER.parse(xml) as {
    rss?: { channel?: { item?: RssItem | RssItem[] } };
  };
  const rawItems = parsed.rss?.channel?.item;
  if (!rawItems) return [];
  const items = Array.isArray(rawItems) ? rawItems : [rawItems];

  const books: NormalizedBook[] = [];
  for (const item of items) {
    const goodreadsId = toNullableString(item["book_id"]);
    const title = toNullableString(item["title"]);
    if (!goodreadsId || !title) continue;

    const isbn = cleanIsbn(toNullableString(item["isbn"]));
    const cover =
      toNullableString(item["book_large_image_url"]) ||
      toNullableString(item["book_image_url"]) ||
      coverFromIsbn(null, isbn);

    books.push({
      goodreadsId,
      title,
      author: toNullableString(item["author_name"]),
      isbn,
      isbn13: null,
      coverUrl: cover,
      myRating: toRating(item["user_rating"]),
      averageRating: toNullableString(item["average_rating"]),
      myReview: cleanReview(item["user_review"]),
      shelf: "read", // this feed is the read shelf
      dateRead: toDate(item["user_read_at"]),
      dateAdded: toDate(item["user_date_added"]),
      yearPublished: toYear(item["book_published"]),
      source: "rss",
    });
  }
  return books;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Upserts books by `goodreadsId`. Enrichment fields are coalesced so a later
 * source with a null can't wipe data already stored; the longer of two reviews
 * wins (RSS truncates). `hidden` is never touched, preserving owner curation.
 * Returns how many rows were newly inserted vs updated.
 */
export async function upsertGoodreadsBooks(
  books: NormalizedBook[]
): Promise<{ imported: number; updated: number; total: number }> {
  // De-dupe within the batch, keeping the last occurrence of each id.
  const byId = new Map<string, NormalizedBook>();
  for (const b of books) byId.set(b.goodreadsId, b);
  const unique = [...byId.values()];
  if (unique.length === 0) return { imported: 0, updated: 0, total: 0 };

  const ids = unique.map((b) => b.goodreadsId);
  const existingRows = await db
    .select({ id: goodreadsBook.goodreadsId })
    .from(goodreadsBook)
    .where(inArray(goodreadsBook.goodreadsId, ids));
  const existing = new Set(existingRows.map((r) => r.id));
  const updated = unique.filter((b) => existing.has(b.goodreadsId)).length;

  const now = new Date();
  const values = unique.map((b) => ({ id: randomUUID(), ...b, updatedAt: now }));

  await db
    .insert(goodreadsBook)
    .values(values)
    .onConflictDoUpdate({
      target: goodreadsBook.goodreadsId,
      set: {
        title: sql`excluded.title`,
        author: sql`coalesce(excluded.author, ${goodreadsBook.author})`,
        isbn: sql`coalesce(excluded.isbn, ${goodreadsBook.isbn})`,
        isbn13: sql`coalesce(excluded.isbn13, ${goodreadsBook.isbn13})`,
        coverUrl: sql`coalesce(excluded.cover_url, ${goodreadsBook.coverUrl})`,
        myRating: sql`coalesce(excluded.my_rating, ${goodreadsBook.myRating})`,
        averageRating: sql`coalesce(excluded.average_rating, ${goodreadsBook.averageRating})`,
        // Keep the longer review — CSV holds the full text, RSS truncates it.
        myReview: sql`case when length(coalesce(excluded.my_review, '')) > length(coalesce(${goodreadsBook.myReview}, '')) then excluded.my_review else ${goodreadsBook.myReview} end`,
        shelf: sql`coalesce(excluded.shelf, ${goodreadsBook.shelf})`,
        dateRead: sql`coalesce(excluded.date_read, ${goodreadsBook.dateRead})`,
        dateAdded: sql`coalesce(excluded.date_added, ${goodreadsBook.dateAdded})`,
        yearPublished: sql`coalesce(excluded.year_published, ${goodreadsBook.yearPublished})`,
        source: sql`excluded.source`,
        updatedAt: now,
      },
    });

  return { imported: unique.length - updated, updated, total: unique.length };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Books shown on the public /reviews page: read-shelf, not hidden, that carry a
 * rating or a written review. Newest reads first.
 */
export async function getPublicReviews(limit = 60): Promise<GoodreadsBookRow[]> {
  try {
    return await db
      .select()
      .from(goodreadsBook)
      .where(
        and(
          eq(goodreadsBook.shelf, "read"),
          eq(goodreadsBook.hidden, false),
          or(
            gt(goodreadsBook.myRating, 0),
            sql`length(coalesce(${goodreadsBook.myReview}, '')) > 0`
          )
        )
      )
      .orderBy(
        sql`${goodreadsBook.dateRead} desc nulls last`,
        desc(goodreadsBook.dateAdded)
      )
      .limit(limit);
  } catch (error) {
    console.error("[goodreads] getPublicReviews failed:", error);
    return [];
  }
}

/** The saved Goodreads numeric user id used for RSS sync (null if unset). */
export async function getGoodreadsUserId(): Promise<string | null> {
  try {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, GOODREADS_USER_ID_KEY));
    return row?.value?.trim() || null;
  } catch (error) {
    console.error("[goodreads] getGoodreadsUserId failed:", error);
    return null;
  }
}

/** Persists the Goodreads numeric user id for future RSS syncs. */
export async function setGoodreadsUserId(userId: string): Promise<void> {
  const value = userId.trim();
  await db
    .insert(appSettings)
    .values({ key: GOODREADS_USER_ID_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

/**
 * All non-hidden imported books grouped by shelf for the public Good Reads page:
 * what Riette has read, is currently reading, and wants to read. Read books are
 * newest-first; the to-read pile is most-recently-added first.
 */
export async function getPublicBookshelf(): Promise<{
  read: GoodreadsBookRow[];
  currentlyReading: GoodreadsBookRow[];
  toRead: GoodreadsBookRow[];
}> {
  try {
    const rows = await db
      .select()
      .from(goodreadsBook)
      .where(eq(goodreadsBook.hidden, false));

    const byDateRead = (a: GoodreadsBookRow, b: GoodreadsBookRow) =>
      (b.dateRead?.getTime() ?? 0) - (a.dateRead?.getTime() ?? 0);
    const byDateAdded = (a: GoodreadsBookRow, b: GoodreadsBookRow) =>
      (b.dateAdded?.getTime() ?? 0) - (a.dateAdded?.getTime() ?? 0);

    return {
      read: rows.filter((b) => b.shelf === "read").sort(byDateRead),
      currentlyReading: rows
        .filter((b) => b.shelf === "currently-reading")
        .sort(byDateAdded),
      toRead: rows.filter((b) => b.shelf === "to-read").sort(byDateAdded),
    };
  } catch (error) {
    console.error("[goodreads] getPublicBookshelf failed:", error);
    return { read: [], currentlyReading: [], toRead: [] };
  }
}

/** Recent books for the admin tab list, plus the total count. */
export async function getAdminBooks(
  limit = 100
): Promise<{ books: GoodreadsBookRow[]; total: number }> {
  try {
    const books = await db
      .select()
      .from(goodreadsBook)
      .orderBy(desc(goodreadsBook.updatedAt))
      .limit(limit);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(goodreadsBook);
    return { books, total: Number(count) };
  } catch (error) {
    console.error("[goodreads] getAdminBooks failed:", error);
    return { books: [], total: 0 };
  }
}
