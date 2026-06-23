// Creates the member-owned tables (book_log + user_profile + ai_suggestions) in
// the existing Tiffany's Tales Postgres database.
//
// Usage (loads DATABASE_URL from .env):
//   npm run db:member
// To target Neon (production) instead of the local Docker DB, point the .env
// DATABASE_URL at Neon (see DESIGN.md §9/§10) or run with an inline override:
//   DATABASE_URL="postgresql://…neon…/neondb?sslmode=require" node scripts/member-tables-setup.mjs
//
// Idempotent: every statement is CREATE/ALTER ... IF NOT EXISTS, so it's safe to
// run repeatedly (local and Neon). Applied by a plain node runner rather than
// drizzle-kit because the repo's data tables have always been materialised via
// push/raw SQL (the drizzle migration journal only tracks 0000/0001), and
// `db:push` now prompts interactively while the voice documents/chunks tables
// aren't in the schema. Mirrors scripts/voice-db-setup.mjs.
//
// Keep the SQL below in sync with drizzle/0003_member_book_log_and_profile.sql,
// drizzle/0004_ai_suggestions.sql, and the bookLog / userProfile / aiSuggestions
// definitions in lib/schema.ts.

import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("[db:member] DATABASE_URL is not set. Run with `npm run db:member` (loads .env).");
  process.exit(1);
}

const SQL = `
-- Per-member reading log (§8j).
CREATE TABLE IF NOT EXISTS book_log (
  id          text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title       text NOT NULL,
  author      text,
  genre       text,
  rating      integer,                                  -- 1-5 paws; null = unrated
  created_at  timestamp NOT NULL DEFAULT now(),
  updated_at  timestamp NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS book_log_user_id_idx ON book_log (user_id);
-- Safety net for any book_log created before the genre field was added.
ALTER TABLE book_log ADD COLUMN IF NOT EXISTS genre text;

-- Member reading-taste profile, 1:1 with user (§8k).
CREATE TABLE IF NOT EXISTS user_profile (
  user_id           text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  about_you         text,
  books_like        text,
  dislike_in_books  text,
  like_in_books     text,
  preferred_genres  text,
  updated_at        timestamp NOT NULL DEFAULT now()
);

-- Latest AI book suggestions per member (§8l): the picks Tiffany's concierge
-- generated from the member's profile + log, stored as JSON in a text column.
-- 1:1 with user (PK = FK user_id). Read/written by lib/ai-suggestions.ts.
CREATE TABLE IF NOT EXISTS ai_suggestions (
  user_id       text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  suggestions   text,                                   -- JSON-encoded Suggestion[]
  model         text,
  generated_at  timestamp NOT NULL DEFAULT now()
);
`;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(SQL);
  console.log(
    "[db:member] book_log + user_profile + ai_suggestions tables are ready."
  );
} catch (error) {
  console.error("[db:member] failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
