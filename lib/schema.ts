import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// Better Auth core tables (Postgres). Column names are snake_case in the DB;
// the property names match Better Auth's model fields.

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
  // Better Auth admin plugin fields. Nullable so existing rows are unaffected;
  // the plugin applies `defaultRole` at runtime and treats null as default.
  role: text("role"),
  banned: boolean("banned"),
  banReason: text("ban_reason"),
  banExpires: timestamp("ban_expires"),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  // Set by the admin plugin's impersonation feature.
  impersonatedBy: text("impersonated_by"),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()),
});

// App-wide editable settings (key/value). Used for runtime-configurable email
// addresses (contact recipient, email "from", admin-notification recipient) so
// the owner can change them from the admin UI without a redeploy. Not a Better
// Auth table.
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value"),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => new Date())
    .notNull(),
});

// First-party web-analytics events. One row per public pageview, written by the
// `/api/track` route from a sendBeacon call in `<PageviewTracker />`. We store
// no IP or other PII — only an opaque random visitor id (cookie `tt_vid`) so we
// can count unique visitors. Vercel Web Analytics runs in parallel and feeds
// Vercel's own dashboard; this table powers the in-app admin Analytics tab.
export const pageview = pgTable(
  "pageview",
  {
    id: text("id").primaryKey(),
    path: text("path").notNull(),
    visitorId: text("visitor_id"),
    referrer: text("referrer"),
    country: text("country"),
    device: text("device"),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("pageview_created_at_idx").on(table.createdAt)]
);

// Books and reviews imported from Goodreads — via CSV export upload and/or the
// public RSS feed (Goodreads retired its API, so those are the two viable
// sources). One row per book, keyed by `goodreadsId` so re-imports/syncs upsert
// rather than duplicate. The `read`-shelf rows with a rating/review feed the
// public /reviews page; `hidden` lets the owner curate what shows there.
export const goodreadsBook = pgTable(
  "goodreads_book",
  {
    id: text("id").primaryKey(),
    goodreadsId: text("goodreads_id").notNull().unique(),
    title: text("title").notNull(),
    author: text("author"),
    isbn: text("isbn"),
    isbn13: text("isbn13"),
    coverUrl: text("cover_url"),
    myRating: integer("my_rating"), // 0–5; 0 means unrated
    averageRating: text("average_rating"),
    myReview: text("my_review"),
    shelf: text("shelf"), // exclusive shelf: read / currently-reading / to-read
    dateRead: timestamp("date_read"),
    dateAdded: timestamp("date_added"),
    yearPublished: integer("year_published"),
    source: text("source"), // "csv" | "rss"
    hidden: boolean("hidden").$defaultFn(() => false).notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("goodreads_book_shelf_idx").on(table.shelf)]
);

// Book-review posts synced from Instagram (@tiffanystales). Meta retired the
// Instagram Basic Display API and personal accounts can't be read by any API,
// so the source is a Behold.so JSON feed (behold.so connects the Professional
// account and handles Meta's tokens). One row per post, keyed by `instagramId`
// so re-syncs upsert rather than duplicate. Non-hidden rows feed the public
// /instagram page and a section on /reviews; `hidden` lets the owner curate.
export const instagramPost = pgTable(
  "instagram_post",
  {
    id: text("id").primaryKey(),
    instagramId: text("instagram_id").notNull().unique(), // Behold post id — upsert key
    permalink: text("permalink"),
    caption: text("caption"), // review text (prefer Behold prunedCaption)
    mediaType: text("media_type"), // IMAGE | VIDEO | CAROUSEL_ALBUM
    imageUrl: text("image_url"),
    altText: text("alt_text"),
    likeCount: integer("like_count"),
    commentsCount: integer("comments_count"),
    postedAt: timestamp("posted_at"),
    hidden: boolean("hidden").$defaultFn(() => false).notNull(),
    createdAt: timestamp("created_at")
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: timestamp("updated_at")
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (table) => [index("instagram_post_posted_at_idx").on(table.postedAt)]
);

export const schema = {
  user,
  session,
  account,
  verification,
  appSettings,
  pageview,
  goodreadsBook,
  instagramPost,
};
