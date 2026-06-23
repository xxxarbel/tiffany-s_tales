-- Member-owned table: the latest AI book suggestions (ai_suggestions).
--
-- NOTE: this file is documentation / parity only. Like 0002_voice_knowledge.sql
-- and 0003_member_book_log_and_profile.sql, it is NOT registered in
-- drizzle/meta/_journal.json, so `drizzle-kit migrate` does not apply it. The
-- table IS in the Drizzle schema (lib/schema.ts), but the repo's data tables have
-- always been materialised via `drizzle-kit push` / raw SQL rather than the
-- drizzle migration journal. So the live table is created by the idempotent
-- runner `npm run db:member` (scripts/member-tables-setup.mjs), which runs
-- exactly the SQL below.
--
-- Idempotent: CREATE ... IF NOT EXISTS, so it's safe to run repeatedly against
-- both local Docker and Neon. Keep this file in sync with the `aiSuggestions`
-- definition in lib/schema.ts.

-- Latest AI book suggestions per member (§8l): the picks Tiffany's concierge
-- (claude-haiku-4-5 + web search) generated from the member's reading profile
-- and rated log. 1:1 with user (PK = FK user_id). The `suggestions` column holds
-- a JSON-encoded Suggestion[] (this schema uses plain text for all rich fields —
-- no jsonb). Read/written by lib/ai-suggestions.ts.
CREATE TABLE IF NOT EXISTS ai_suggestions (
  user_id       text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  suggestions   text,                                   -- JSON-encoded Suggestion[]
  model         text,
  generated_at  timestamp NOT NULL DEFAULT now()
);
