-- Member-owned tables: the reading log (book_log) + the reading-taste profile
-- (user_profile).
--
-- NOTE: this file is documentation / parity only. Like 0002_voice_knowledge.sql,
-- it is NOT registered in drizzle/meta/_journal.json, so `drizzle-kit migrate`
-- does not apply it. These tables ARE in the Drizzle schema (lib/schema.ts), but
-- the repo's data tables (pageview, goodreads_book, instagram_post, …) have
-- always been materialised via `drizzle-kit push` / raw SQL rather than the
-- drizzle migration journal — and `db:push` now prompts interactively because
-- the voice documents/chunks tables aren't in the schema. So the live tables are
-- created by the idempotent runner `npm run db:member`
-- (scripts/member-tables-setup.mjs), which runs exactly the SQL below.
--
-- Idempotent: every statement is CREATE/ALTER ... IF NOT EXISTS, so it's safe to
-- run repeatedly against both local Docker and Neon. Keep this file in sync with
-- the `bookLog` / `userProfile` definitions in lib/schema.ts.

-- Per-member reading log (§8j): one row per book a member has read anywhere, with
-- title/author/genre and a 1-5 paw rating. Scoped by user_id in lib/book-log.ts.
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

-- Member reading-taste profile (§8k): 1:1 with user (PK = FK user_id). The five
-- free-text answers from the /profile page. Read/written by lib/user-profile.ts.
CREATE TABLE IF NOT EXISTS user_profile (
  user_id           text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  about_you         text,
  books_like        text,
  dislike_in_books  text,
  like_in_books     text,
  preferred_genres  text,
  updated_at        timestamp NOT NULL DEFAULT now()
);
