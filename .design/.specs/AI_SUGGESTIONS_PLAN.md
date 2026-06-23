# Tiffany AI Suggestions — Implementation Plan

## Context

Members fill in a free-text **reading profile** (`/profile` → `user_profile`) and keep a
private **reading log** with 1–5 paw ratings (`/log-a-book` → `book_log`), but nothing in
the app turns those signals into new books to read. This feature adds a logged-in-only tab,
**Tiffany AI Suggestions**, that:

1. reads the member's reading profile (likes / dislikes / preferred genres / "about you") and
   their rated book log,
2. asks a Claude model to infer what the reader likes and dislikes,
3. has the model **search goodreads.com and amazon.com** (Anthropic server-side web search)
   for books the reader would enjoy,
4. returns **3–5 suggestions, each with a substantiation** that references the member's own
   stated tastes and ratings,
5. displays each suggestion with a **real fetched cover** (per the standing rule: every
   referenced book must show a real fetched cover next to its name).

### Decisions locked with the user
- **Model:** `claude-haiku-4-5` (cheapest tier; user-selected).
- **Trigger / storage:** A **"Get suggestions"** button generates on demand and **persists the
  latest set to a new `ai_suggestions` table**, shown instantly on return visits with a
  **"Refresh"** button. (No auto-run on load.)
- **Gating:** The tab is **hidden when `ANTHROPIC_API_KEY` is unset**, mirroring the
  `DEEPGRAM_API_KEY` → `enabled` boolean pattern used by the voice assistant.

### Haiku 4.5 API constraints (verified against the claude-api skill)
- Use the **basic** web search tool `web_search_20250305` — the newer dynamic-filtering
  `web_search_20260209` requires Opus/Sonnet 4.6+, **not** Haiku.
- **No** `thinking` / `output_config.effort` config — `effort` errors on Haiku 4.5; omit it.
- **Structured outputs are supported** on Haiku 4.5 via `output_config: { format: { type:
  "json_schema", schema } }`.
- Server tools run a server-side loop; handle `stop_reason === "pause_turn"` by re-sending
  (cap continuations ~5).

---

## Changes

### 1. Dependency + env
- `npm install @anthropic-ai/sdk`.
- Add `ANTHROPIC_API_KEY` to **`.env.example`** with the same "server-only … feature absent
  until set" comment style used for `DEEPGRAM_API_KEY`.

### 2. Database — new `ai_suggestions` table (1:1 with user, JSON blob)
Follow the **existing member-table convention** (DESIGN.md §8c): apply via the idempotent
runner, not `drizzle-kit migrate`.
- **`lib/schema.ts`** — add `aiSuggestions` table next to `userProfile`:
  `user_id` (PK, text, FK→`user.id` cascade), `suggestions` (jsonb / `text` JSON), `model`
  (text), `generated_at` (timestamp, default now()).
- **`scripts/member-tables-setup.mjs`** — add an idempotent `CREATE TABLE IF NOT EXISTS
  ai_suggestions (...)` block (run via `npm run db:member`, applies to local Docker + Neon).
- **`drizzle/0004_ai_suggestions.sql`** — reference-only DDL (same status as `0003`).

### 3. Data access — `lib/ai-suggestions.ts`
- `interface Suggestion { title: string; author: string; reason: string; coverUrl: string | null }`.
- `getAiSuggestions(userId): Promise<{ suggestions: Suggestion[]; model: string; generatedAt: Date } | null>` — fail-soft `null`.
- `setAiSuggestions(userId, model, suggestions[])` — upsert via
  `insert(...).onConflictDoUpdate({ target: aiSuggestions.userId, ... })` (mirror
  `setUserProfile` in `lib/user-profile.ts`).

### 4. Generation logic — `lib/ai-suggestions-generate.ts`
`generateSuggestions(userId): Promise<Suggestion[]>`:
1. `profile = await getUserProfile(userId)` (`lib/user-profile.ts`) and
   `log = await getBookLog(userId)` (`lib/book-log.ts`).
2. Build a prompt: a **system prompt** ("Tiffany's book concierge") + a **user message** that
   embeds the profile fields and the rated log (title/author/genre/rating, noting which were
   rated high vs low). Instruct the model to (a) infer likes/dislikes, (b) **search
   goodreads.com and amazon.com** for candidates, (c) avoid books already in the log, (d)
   return **3–5** picks each with a `reason` that cites the member's specific tastes/ratings.
3. Call `client.messages.create({ model: "claude-haiku-4-5", max_tokens: 4096, tools:
   [{ type: "web_search_20250305", name: "web_search", max_uses: 5, allowed_domains:
   ["goodreads.com","www.goodreads.com","amazon.com","www.amazon.com"] }], output_config:
   { format: { type: "json_schema", schema: SUGGESTIONS_SCHEMA } }, messages })`.
   - Loop while `stop_reason === "pause_turn"` (re-send `[user, assistant(response.content)]`),
     cap ~5 iterations.
   - **Primary:** parse the structured `output_config.format` result. **Fallback** (if web
     search + structured output reject together at impl time): drop `output_config.format`,
     instruct JSON-only in the prompt, and `JSON.parse` the final text block — Haiku is
     reliable for this small shape.
4. **Resolve a real cover** for each pick via `resolveCoverUrl({ title, author, isbn: null,
   isbn13: null, coverUrl: null })` from `lib/goodreads.ts` (falls through to Open Library
   title/author search → Google Books). Run them with bounded concurrency.
5. Return the `Suggestion[]` (covers may be `null`; the UI renders a generated text cover).

The Anthropic client (`new Anthropic()`) reads `ANTHROPIC_API_KEY` from env.

### 5. Server action — `app/ai-suggestions/actions.ts`
- `"use server"` `generateSuggestionsAction()` — re-check `getSafeSession()`; if no session
  return an error; if `!process.env.ANTHROPIC_API_KEY` return a "not configured" error; else
  `const s = await generateSuggestions(user.id)`, `await setAiSuggestions(user.id,
  "claude-haiku-4-5", s)`, `revalidatePath("/ai-suggestions")`. Mirror the auth re-check style
  in `app/log-a-book/actions.ts`.

### 6. Page — `app/ai-suggestions/page.tsx` (protected server component)
- Mirror `app/dashboard/page.tsx`: `const session = await getSafeSession(); if (!session)
  redirect("/login");` then render `<SiteHeader />` + a client component.
- `export const maxDuration = 60;` (web search + model can take 15–40s on Vercel).
- Load `existing = await getAiSuggestions(user.id)` and pass to the client component, plus an
  `enabled = Boolean(process.env.ANTHROPIC_API_KEY)` flag for the in-page "not configured"
  state.

### 7. Client UI — `components/ai-suggestions/ai-suggestions.tsx`
- `"use client"`. Props: existing suggestions (+ `generatedAt`/`model`) and `enabled`.
- "Get suggestions" / "Refresh" button wired with `useActionState` + `useTransition`; show a
  loading state ("Tiffany is reading up on you… this takes a moment").
- Render each suggestion as a card: `<BookCover src={coverUrl} title={title} subtitle={author}
  alt={title} />` (`components/book-cover.tsx` — guarantees a picture) + title + author + the
  `reason` substantiation. Use existing shadcn `Card` and brand styling like `/log-a-book`.
- Empty state before first run; "not available yet" copy when `!enabled`.

### 8. Config endpoint + tab gating
- **`app/api/ai-suggestions/config/route.ts`** — `GET` returning
  `Response.json({ enabled: Boolean(process.env.ANTHROPIC_API_KEY) }, { headers:
  {"Cache-Control":"no-store"} })`; `export const dynamic = "force-dynamic"` (mirror
  `app/api/voice/config/route.ts`). Never sends the key — only the boolean.
- **`components/site-header.tsx`** — add a `Sparkles` import from `lucide-react`; on mount
  `fetch("/api/ai-suggestions/config")` into an `aiEnabled` state; when `session && aiEnabled`,
  append `{ label: "Tiffany AI Suggestions", href: "/ai-suggestions", icon: Sparkles }` to
  `sessionLinks` (same conditional-append technique already used for the Admin link). Apply in
  both the desktop nav and the mobile `Sheet`.

### 9. Docs
- Update `.design/.specs/DESIGN.md` (file map + a short §8l) describing the new tab, table,
  and `ANTHROPIC_API_KEY` gating — consistent with how voice/book-log were documented.

---

## Files
- New: `lib/ai-suggestions.ts`, `lib/ai-suggestions-generate.ts`,
  `app/ai-suggestions/page.tsx`, `app/ai-suggestions/actions.ts`,
  `components/ai-suggestions/ai-suggestions.tsx`, `app/api/ai-suggestions/config/route.ts`,
  `drizzle/0004_ai_suggestions.sql`.
- Edit: `lib/schema.ts`, `scripts/member-tables-setup.mjs`, `components/site-header.tsx`,
  `.env.example`, `package.json` (dep), `.design/.specs/DESIGN.md`.
- Reuse (no change): `lib/user-profile.ts`, `lib/book-log.ts`,
  `lib/goodreads.ts` (`resolveCoverUrl`), `components/book-cover.tsx`, `lib/auth.ts`
  (`getSafeSession`).

## Reference reading before coding
Per `AGENTS.md`, this is a **customized Next.js 16.2.9** — skim the relevant guide under
`node_modules/next/dist/docs/` for `route.ts` segment config (`maxDuration`,
`dynamic`/`runtime`) and server-action signatures before writing.

---

## Verification
1. **DB:** `npm run db:member`; confirm `ai_suggestions` exists (local Docker; and Neon when
   run against its `DATABASE_URL`).
2. **Key set, logged in:** with `ANTHROPIC_API_KEY` in `.env`, sign in → confirm the
   **Tiffany AI Suggestions** tab appears (desktop + mobile). Open it, click **Get
   suggestions**: within ~40s see 3–5 cards, each with a cover and a substantiation that
   references your profile/log. Reload → suggestions persist (read from DB). Click **Refresh**
   → regenerates and updates `generated_at`.
3. **Covers:** verify each suggested book shows a real fetched image, or the branded text
   cover fallback — never a broken image (the always-show-a-real-cover rule).
4. **Substantiation quality:** edit the reading profile (e.g. add "loves slow-burn historical
   fiction, dislikes gore") and a few rated log entries, refresh, and confirm the reasons cite
   those signals and the picks avoid logged books.
5. **Gating:** unset `ANTHROPIC_API_KEY`, restart → the tab disappears and
   `/api/ai-suggestions/config` returns `{ "enabled": false }`; visiting `/ai-suggestions`
   directly shows the "not available yet" state (route still `getSafeSession`-guarded).
6. **Auth guard:** hit `/ai-suggestions` while logged out → redirects to `/login`.
7. `npm run lint` / type-check / build clean (the `/checkpoint` skill covers this).
