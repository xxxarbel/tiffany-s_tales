import { db } from "@/lib/db";
import { appSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";

// The owner-curated "Book of the Month" lives in the app_settings key/value
// table as one JSON blob (same pattern as the voice agent config), so the admin
// can change the featured book from /admin without a redeploy. Read server-side
// and rendered on the public /book-of-the-month page; falls back to an empty,
// unpublished default until the owner saves one.

const BOOK_OF_MONTH_KEY = "book_of_the_month";

export interface BookOfMonth {
  /** When false, the public page shows a "coming soon" placeholder instead of
   *  the book — lets the owner prepare next month's pick in advance. */
  published: boolean;
  /** Human label for the month, e.g. "June 2026". */
  month: string;
  /** Book title. */
  title: string;
  /** Author name. */
  author: string;
  /** Cover image URL. Resolved automatically on save when left blank. */
  coverUrl: string;
  /** What the book is about (synopsis / blurb). */
  description: string;
  /** A note on why the club chose this book. */
  whyPicked: string;
  /** When / where the pack discusses it. */
  meetingInfo: string;
  /** Optional link to buy or view the book. */
  purchaseUrl: string;
}

export const DEFAULT_BOOK_OF_MONTH: BookOfMonth = {
  published: false,
  month: "",
  title: "",
  author: "",
  coverUrl: "",
  description: "",
  whyPicked: "",
  meetingInfo: "",
  purchaseUrl: "",
};

// Only these keys are read back from storage, so a stale/oversized blob can't
// inject arbitrary fields.
const STRING_KEYS = [
  "month",
  "title",
  "author",
  "coverUrl",
  "description",
  "whyPicked",
  "meetingInfo",
  "purchaseUrl",
] as const;
const BOOLEAN_KEYS = ["published"] as const;

function sanitize(raw: unknown): Partial<BookOfMonth> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: Partial<BookOfMonth> = {};
  const sink = out as Record<string, unknown>;
  for (const key of STRING_KEYS) {
    if (typeof obj[key] === "string") sink[key] = obj[key];
  }
  for (const key of BOOLEAN_KEYS) {
    if (typeof obj[key] === "boolean") sink[key] = obj[key];
  }
  return out;
}

/**
 * The current Book of the Month: stored values merged over the defaults. Never
 * throws — a DB failure returns the (unpublished) default so the page still
 * renders its placeholder.
 */
export async function getBookOfMonth(): Promise<BookOfMonth> {
  try {
    const [row] = await db
      .select({ value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, BOOK_OF_MONTH_KEY));
    if (!row?.value) return DEFAULT_BOOK_OF_MONTH;
    const stored = sanitize(JSON.parse(row.value));
    return { ...DEFAULT_BOOK_OF_MONTH, ...stored };
  } catch (error) {
    console.error("[book-of-month] read failed, using default:", error);
    return DEFAULT_BOOK_OF_MONTH;
  }
}

/** Persist the full Book of the Month (whole object, sanitized). */
export async function setBookOfMonth(value: BookOfMonth): Promise<void> {
  const json = JSON.stringify({
    ...DEFAULT_BOOK_OF_MONTH,
    ...sanitize(value),
  });
  await db
    .insert(appSettings)
    .values({ key: BOOK_OF_MONTH_KEY, value: json, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value: json, updatedAt: new Date() },
    });
}
