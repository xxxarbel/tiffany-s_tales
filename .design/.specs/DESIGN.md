# Tiffany's Tales — Design & Build Handoff

> Single source of truth for continuing work after a context reset. Covers the
> brand, design system, page structure, tech stack, auth/DB setup, the admin
> area, web analytics, the Goodreads import, the Instagram import, reliable book
> covers, the voice assistant, and how to run.
> Last updated: 2026-06-21.

## 0. Where we are right now (restart anchor)

- 🆕 **Voice assistant (local, not yet committed/deployed).** A site-wide **Deepgram Voice Agent** —
  a floating, mic-driven book-club guide on every public page (avatar = "Tiff", the chihuahua
  mascot). It gives spoken tours (navigates/scrolls/highlights pages), answers questions grounded in
  a Postgres knowledge store (full-text search over uploaded docs, static FAQ fallback), and queries
  the **live Goodreads shelves** (`search_books` / `book_of_the_month`). The owner controls its
  **model, voice, and system prompt** centrally from **/admin → Voice**, and manages the knowledge
  docs from **/admin → Knowledge**. Needs `DEEPGRAM_API_KEY` in `.env`. Full detail in **§8h**.
  ⚠️ Built and **lint/build-clean**, but **not committed or deployed**, and the live mic↔WebSocket
  conversation hasn't been exercised headlessly (needs a browser + microphone).
- **Code state:** `HEAD` = `daf0037` on `main`, **pushed to `origin/main` and deployed to
  Vercel**. Recent commits shipped the **Goodreads import**, the **Instagram import**
  (@tiffanystales via a Behold.so feed) with **automatic daily sync** (Vercel Cron), **reliable
  multi-source book covers**, and — most recently — a **decoupled Goodreads cover backfill**
  (imports no longer time out in prod) and an **Instagram feed-id fix**. The live Vercel site has
  all of these.
- ✅ **Neon (prod) now has all tables and is populated.** `db:push` was run against the Neon
  `DATABASE_URL`, so `pageview`, `goodreads_book`, and `instagram_post` all exist there (8 tables in
  `public`). `goodreads_book` holds the **full library (~1031 books)** and `instagram_post` the
  current Behold feed (**7 posts**, accumulating). The live `/reviews`, `/goodreads`, and
  `/instagram` pages render them. (Earlier these tables were local-Docker-only; resolved — see §8c.)
- ⚠️ **Set `CRON_SECRET` in Vercel** to enable the two daily crons — **`/api/cron/instagram-sync`**
  (06:00 UTC) and **`/api/cron/goodreads-covers`** (06:30 UTC). Both require it and return **401**
  until it's set (so they no-op). See §8g / §8f / §9.
- ⚠️ **Behold free feed caps at the 6 most recent posts.** The Instagram JSON feed exposes only 6
  posts (no query param overrides it); our sync never deletes, so the DB accumulates more over time,
  and raising Behold's post limit (plan/feed setting) exposes the full history at once. See §8g.
- **The app is now multi-page** (not one scrolling page): a `(marketing)` route group with
  real routes (`/`, `/about`, `/benefits`, `/reviews`, `/goodreads`, `/instagram`, `/contact`)
  plus `/login`, `/reset-password`, `/dashboard`, `/profile`, and an admin area at `/admin`. The
  header nav are **route tabs** (§6).
- **Auth:** email/password **with required email verification** + **password reset** (forgot →
  email link → reset page) + **Google OAuth** (with trusted account-linking). See §8 / §8d.
- **Admin area** (`/admin`, owner only) — Better Auth **admin plugin**, **seven tabs**: **Users**
  (list / remove / pause / promote), **Analytics** (first-party traffic), **Goodreads** (import
  books), **Instagram** (sync posts), **Voice** (configure the voice assistant — model/voice/prompt,
  §8h), **Knowledge** (upload docs the assistant answers from, §8h), **Email settings** (runtime
  email addresses). `arbeling@gmail.com` is auto-admin. See §8a.
- **Web Analytics:** Vercel Web Analytics (`<Analytics />`) **+ our own first-party pageview
  tracking** (beacon → `/api/track` → `pageview` table) shown in the admin Analytics tab. See §8e.
- **Goodreads import:** admin uploads a Goodreads CSV export and/or syncs the public RSS feed;
  books land in `goodreads_book` and feed the public **/reviews** (review wall) and **/goodreads**
  (full shelf: read / currently-reading / want-to-read) pages. See §8f.
- **Instagram import:** admin pastes a **Behold.so** JSON-feed URL for **@tiffanystales** and
  syncs; posts land in `instagram_post` and feed the public **/instagram** page and an Instagram
  section on **/reviews**. (Meta killed the IG Basic Display API and blocks personal-account
  reads, so Behold — which fronts the Graph API and needs a free Professional account — is the
  supported path; direct scraping returns 429.) See §8g.
- **Reliable book covers:** every imported book resolves a real cover from **Open Library
  (by ISBN → title/author search) → Google Books** at import time; if none is found, `BookCover`
  renders a **generated text cover** (title + author) so a book is never shown without a picture. See §8f.
- **Databases:**
  - **Local dev now points at the local Docker Postgres** (`.env` `DATABASE_URL` =
    `postgres://…@localhost:5432/tiffany_tales`). The Neon line is commented out. (This was
    flipped from Neon during the admin build — see §9.)
  - **Production uses Neon** (via Vercel env vars). Neon has been **migrated** to the new schema
    (admin columns + `app_settings`) — see §8c.
- **Production Google sign-in:** working. The prod redirect URI is registered on the prod OAuth
  client `…om1jpc03…` (this was the long-standing manual blocker; now done). A real member
  (`riettebeling@gmail.com`) has signed in via Google on prod.
  - ⚠️ Note: that account has `role = null` (a regular member). Only `arbeling@gmail.com` is
    auto-admin. Promote others from **/admin → Users**, or via `db:seed-admin` / SQL.
- **Open cleanups / TODO:** verify a Resend domain for member emails; rotate the Neon DB
  password; set `BETTER_AUTH_URL` correctly in Vercel; real billing. See §13.
- **Quick prod OAuth check** (no browser): the returned `url`'s `client_id` + `redirect_uri` are
  what Google receives.
  ```bash
  curl -s -X POST https://tiffany-s-tales.vercel.app/api/auth/sign-in/social \
    -H "Content-Type: application/json" -H "Origin: https://tiffany-s-tales.vercel.app" \
    -d '{"provider":"google","callbackURL":"/dashboard"}'
  ```

---

## 1. What this is

A marketing + membership site for **Tiffany's Tales Book Club** — a cosy, in-person
book club based in **Maidstone, United Kingdom** (£10/month membership). Modelled
on the live site <https://www.tiffanystales.com/>. The app is a multi-page marketing
site plus an auth area (login / subscribe / dashboard / profile) and an owner-only admin area.

The brand voice is warm, friendly, community-first ("Join my pack today!" — the
"pack" theme comes from the dog logo).

---

## 2. Tech stack

| Area | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.9** (App Router, RSC) | ⚠️ See §11 — *modified* Next.js; read `node_modules/next/dist/docs/` before unfamiliar APIs. |
| Runtime | React 19.2.4 | |
| Styling | **Tailwind CSS v4** | Config via `@theme inline` in `app/globals.css` (no `tailwind.config.js`). |
| UI components | **shadcn/ui** | style `base-nova`, base library = **Base UI** (`@base-ui/react`), NOT Radix. icons = **lucide**. Config in `components.json`. |
| Icons | `lucide-react` (^1.18.0) | ⚠️ Does NOT export `Instagram` — use the shared inline SVG **`components/icons/instagram-icon.tsx`** (footer, nav, admin tab, post cards). Verify an icon exists before importing. |
| Toasts | `sonner` | `<Toaster />` in `app/layout.tsx`. |
| Auth | **Better Auth** (^1.6.18) | email+password (**verification required** + **password reset**) + **Google OAuth** + **admin plugin**. See §8 / §8d. |
| ORM | **Drizzle ORM** (^0.45.2) + `drizzle-kit` | `push` (dev) and generated **migration files** (`drizzle/`). |
| Database | **Postgres 17 via Docker** (active for local dev) / **Neon serverless Postgres** (production) | `.env` `DATABASE_URL` currently = local Docker; Neon is used in prod via Vercel env. See §9. |
| Hosting | **Vercel** | Prod at **`https://tiffany-s-tales.vercel.app`**; auto-deploys on push to `main`. Env vars set in the Vercel dashboard. **Vercel Cron** (`vercel.json`) runs the daily Instagram sync (§8g). |
| Email | **Resend** (`resend` SDK) | Verification, welcome, admin-notification, **password-reset**, and contact emails via `lib/email.ts`. Addresses are runtime-editable (§8b). Needs a verified domain to email non-owner addresses. |
| Analytics | **`@vercel/analytics`** (^2.0.1) + first-party tracking | `<Analytics />` in root layout (Vercel dashboard) **plus** our own beacon → `/api/track` → `pageview` table, shown in admin. See §8e. |
| CSV / XML parsing | **`papaparse`** (^5.5.4, + `@types/papaparse`) · **`fast-xml-parser`** (^5.9.3) | For the Goodreads import: papaparse = CSV library export, fast-xml-parser = RSS feed. See §8f. |
| External data feeds | Goodreads RSS · **Behold.so** JSON feed · Open Library · Google Books | No SDKs — plain `fetch`. Behold = Instagram source (§8g); Open Library + Google Books = book-cover resolution (§8f). |
| Voice assistant | **Deepgram Voice Agent** (WebSocket) · **Anthropic Haiku** (Deepgram-managed "think") | Mic→STT→LLM→TTS in the browser; server only mints a 60s token. Doc parsing: **`mammoth`** (.docx) + **`pdf-parse`** (.pdf). No SDK — raw `WebSocket` + `fetch`. See §8h. |
| Fonts | `next/font/google` | Geist (sans) + Playfair Display (display/headings). |

Package manager: **npm**. Path alias: `@/*` → project root (e.g. `@/components/...`, `@/lib/...`).

---

## 3. Brand colours — purple + sage green

Scheme from the brand planner image (`Pink and Cream Girly Book Review Planner.jpg`):
**plum purple** background with **sage green** panels and purple text on green. Defined as
custom tokens + shadcn semantic tokens in **`app/globals.css`** (`:root`).

### Core hex values
| Role | Hex | Token(s) |
|---|---|---|
| Brand purple (primary) | `#7a4a7c` | `--primary`, `--color-purple`, `--ring` |
| Deep plum (feature/footer bg) | `#45284a` | `--color-plum` |
| Sage green (accent/secondary) | `#8cbf9e` | `--secondary`, `--color-sage` |
| Light green (soft surface) | `#dcebe0` | `--accent`, `--color-sage-soft` |
| Page background | `#f8f3f6` (soft lavender-white) | `--background` |
| Body text | `#3a2340` (deep plum) | `--foreground` |
| Muted surface | `#efe6ed` | `--muted` |
| Muted text | `#6c5a6a` | `--muted-foreground` |
| Cream (text on dark purple) | `#f8f3f6` | `--color-cream` |
| Border / input | `#e6d9e4` | `--border`, `--input` |

### How to use them
- **Prefer shadcn semantic tokens**: `bg-primary`, `text-muted-foreground`, `bg-secondary`,
  `bg-accent`, `bg-card`, `border`, etc.
- **Custom brand tokens** (`bg-plum`, `text-cream`, `text-sage`, `from-primary`, `to-plum`) are
  for the dark hero/feature/footer bands where semantic tokens don't fit.
- Green badges/buttons with plum text = `variant="secondary"`. Star ratings / accents on dark = `text-sage`.

`--radius` is `0.75rem`. Dark-mode tokens exist (`.dark`) but the site renders **light only**.

---

## 4. Typography
- **Headings / display:** Playfair Display → `font-display` (also `--font-heading`).
- **Body / UI:** Geist → `font-sans` (default).
- Wired in `app/layout.tsx` via `next/font/google` as CSS variables (`--font-geist-sans`, `--font-playfair`).

---

## 5. Logo & images

- **Logo:** `public/logo.jpg` — white **chihuahua on an open book** in a gold-ringed circular
  badge, purple ground. Rendered via the shared **`Logo`** component (`components/logo.tsx`,
  `next/image`, `rounded-full`).
  - ⚠️ **RULE: the logo must always be the hero centrepiece — never replace it with a photo.**
  - Square JPG with a purple bg, clipped to a circle. For a cleaner look, swap in a **transparent PNG**.
- **Photos** (free Unsplash stock in `public/images/`) — all **placeholders** (same filenames = drop-in):
  `community.jpg` (About), `reading-cozy.jpg` (Sittingbourne card), `pack-maidstone.jpg`
  (Maidstone card), `book-of-month.jpg` (Book of the Month + dashboard), `benefit-connection.jpg`
  / `benefit-discussion.jpg` / `benefit-story.jpg` (Benefits cards).

---

## 6. Page structure (multi-page, route tabs)

The single marketing page was **split into separate routes** under a `(marketing)` route group
whose layout (`app/(marketing)/layout.tsx`) provides the **`SiteHeader` + `SiteFooter`** and mounts
the **floating voice assistant** (`VoiceAgentProvider` + `BookClubLauncher`) site-wide on every
public page (§8h). Clicking a nav tab navigates to a real page (no more scroll-to-anchor).

**Marketing routes** (`(marketing)` group):
1. **`/`** (Home) — Hero (logo medallion, "Join my pack today!" → `/login`) + "Find Your Pack"
   (Sittingbourne & Maidstone cards) + Book of the Month panel. ⚠️ "Pamper Night" was removed — don't re-add.
   The hero `<section>` carries **`id="hero"`** and Packs/Book-of-the-Month have `#packs` /
   `#book-of-the-month` — the voice tour highlights these (§8h).
2. **`/about`** — "Your literary sanctuary" + FAQ accordion (monthly + Discord; suggestions; £10/month).
3. **`/benefits`** — 3 photo cards (Real Connection / Lively Discussion / A Fresh Story).
4. **`/reviews`** — the **review wall** (data-driven from `goodreads_book`): the member
   testimonial card on top, then a grid of read-shelf books that have a rating **or** written
   review (cover, title, author, stars, date read, full review text), then a **"From Instagram
   @tiffanystales"** section of post cards (omitted when none). Empty state before import. §8f / §8g.
5. **`/goodreads`** — the **full Good Reads shelf** (data-driven): cover-grid sections —
   *Currently reading*, *Read* (with stars), *Want to read* — for everything imported, copy
   references "Riette". Empty state before import. §8f.
6. **`/instagram`** — the **Instagram reviews page** (data-driven from `instagram_post`): centered
   "@tiffanystales" header + Follow link, then a responsive grid of post cards (square photo,
   caption, date, "View on Instagram"). Empty state before any sync. §8g.
7. **`/contact`** — `<ContactForm />`, **wired to actually send** (server action → Resend) to the
   configured contact recipient, reply-to = sender, optional "send me a copy". See §8b.

**Auth/member routes** (standalone, outside the group):
- **`/login`** — Tabs: Subscribe | Log in, + "Continue with Google" (when `isGoogleEnabled`).
  The Log in form has a **"Forgot password?"** link that swaps to a reset-request (email) view. §8d.
  Redirects to `/dashboard` if already authed.
- **`/reset-password`** — reset page reached from the emailed link; reads `?token=` (or `?error=`),
  shows a new-password + confirm form (`authClient.resetPassword`), then routes to `/login`. §8d.
- **`/dashboard`** — protected member home: welcome + stat cards (member since, membership, pack)
  + Book of the Month + next meet-up.
- **`/profile`** — protected: editable name + photo (`authClient.updateUser`), read-only account
  info (email + verified badge, member since, linked sign-in providers).
- **`/admin`** — owner-only (see §8a).

**Header nav** (`components/site-header.tsx`, client, route-based active state via `usePathname`):
- Always: Home · About · Book Club Benefits · Book Reviews · **Good Reads** · **Instagram** ·
  Contact (one `navLinks` array drives both the desktop tabs and the mobile `Sheet`).
- When signed in: **Dashboard · Profile** (and **Admin** when `role === "admin"`), plus the avatar
  `UserMenu`. Logged out: Log in / Join my pack. Mobile = `Sheet` with the same links.

---

## 7. File map

```
app/
  globals.css                       # Tailwind v4 theme + colour tokens (EDIT COLOURS HERE)
  layout.tsx                        # fonts, metadata, <Toaster /> (root layout)
  (marketing)/
    layout.tsx                      # SiteHeader + children + SiteFooter + voice assistant (§8h)
    page.tsx                        # Home (hero[#hero] + packs[#packs] + book of the month[#book-of-the-month])
    about/page.tsx                  # About + FAQ
    benefits/page.tsx               # Benefits cards
    reviews/page.tsx                # /reviews — review wall + Instagram section (getPublicReviews + getPublicInstagramPosts) §8f/§8g
    goodreads/page.tsx              # /goodreads — full shelf (DB: getPublicBookshelf) §8f
    instagram/page.tsx              # /instagram — IG reviews grid (DB: getPublicInstagramPosts) §8g
    contact/page.tsx                # Contact page
    contact/actions.ts              # "use server" submitContact -> sendContactEmail
  login/page.tsx                    # /login — Tabs + Google + "Forgot password?" (redirects if authed)
  reset-password/page.tsx           # /reset-password — reads ?token=; <ResetPasswordForm /> §8d
  dashboard/page.tsx                # /dashboard — protected member home
  profile/page.tsx                  # /profile — protected; editable profile + account info
  admin/page.tsx                    # /admin — requireAdmin(); users + analytics + goodreads + instagram + email
  admin/actions.ts                  # "use server" admin actions: settings + Goodreads (§8f) + Instagram (§8g)
  api/auth/[...all]/route.ts        # Better Auth handler (serves /api/auth/* incl. /admin/*)
  api/track/route.ts                # POST pageview beacon -> pageview table (§8e)
  api/cron/instagram-sync/route.ts  # GET daily Behold sync (CRON_SECRET-guarded) -> instagram_post (§8g)
  api/cron/goodreads-covers/route.ts # GET daily cover backfill (CRON_SECRET-guarded) -> resolveMissingCovers (§8f)
  api/deepgram/token/route.ts       # POST mints a 60s Deepgram grant (key never reaches browser) (§8h)
  api/knowledge/route.ts            # POST lookup_knowledge: FTS groundedAnswer + static FAQ fallback (§8h)
  api/documents/route.ts            # POST/GET/DELETE knowledge docs (admin-gated 401; mammoth/pdf-parse) (§8h)
  api/voice/books/route.ts          # GET search_books / book_of_the_month over live Goodreads shelves (§8h)
  api/voice/config/route.ts         # GET owner-edited voice config (model/voice/prompt) for the browser (§8h)
components/
  site-header.tsx                   # sticky header: route tabs (incl. Good Reads, Instagram) + auth + Sheet (client)
  site-footer.tsx                   # deep-plum footer (logo, explore links, Instagram via shared icon)
  logo.tsx                          # shared Logo (next/image)
  contact-form.tsx                  # contact form (client) -> submitContact server action
  pageview-tracker.tsx              # client: usePathname -> sendBeacon to /api/track (§8e)
  book-cover.tsx                    # client: <img> cover; fallback = generated text cover (title) or icon (§8f)
  instagram-post-card.tsx           # IG post card: BookCover photo + caption + date + "View on Instagram" (§8g)
  voice-agent/                      # voice assistant React layer (§8h)
    VoiceAgentProvider.tsx          #   context + useVoiceAgent(); wires tools, fetches /api/voice/config (client)
    BookClubLauncher.tsx            #   floating Tiff-avatar launcher: mic state, Start/End, mute (client)
  icons/
    instagram-icon.tsx              # shared inline Instagram SVG (lucide lacks it) — footer/nav/admin/cards
  admin/
    admin-panel.tsx                 # Tabs: Users|Analytics|Goodreads|Instagram|Voice|Knowledge|Email settings (client)
    admin-voice.tsx                 # configure the voice assistant: model/voice/prompt/etc -> saveVoiceConfigAction (§8h)
    admin-knowledge.tsx             # upload/list/delete knowledge docs via /api/documents (§8h)
    admin-users-table.tsx           # user table + per-row actions + confirm AlertDialog (client)
    admin-settings-form.tsx         # edit the 3 email addresses (client)
    admin-analytics.tsx             # analytics dashboard: cards + bar chart + tables, 7/30/90 toggle (§8e)
    admin-goodreads.tsx             # CSV upload + RSS sync + imported-books list (cover thumb) w/ hide toggle (§8f)
    admin-instagram.tsx             # Behold feed-URL sync + imported-posts list w/ hide toggle (§8g)
  auth/
    user-menu.tsx                   # avatar + dropdown (Dashboard/Profile/Sign out) (client)
    login-form.tsx                  # signIn.email; 403 unverified; "Forgot password?" mode (client)
    signup-form.tsx                 # signUp.email; shows "check your email" (client)
    profile-form.tsx                # authClient.updateUser name/image (client)
    reset-password-form.tsx         # authClient.resetPassword; invalid/expired-token state (client)
    sign-out-button.tsx             # signOut (client)
    google-button.tsx               # signIn.social google (client)
    auth-nav.tsx                    # LEGACY — superseded by site-header (unused)
  ui/                               # shadcn/Base UI: button card accordion badge textarea label
                                    #   separator sonner field checkbox tabs spinner skeleton sheet
                                    #   avatar dropdown-menu input table alert-dialog
lib/
  auth.ts                           # betterAuth() + admin plugin + sendResetPassword + getSafeSession()
  admin.ts                          # requireAdmin() guard + isAdmin()
  auth-client.ts                    # createAuthClient; exports requestPasswordReset / resetPassword
  db.ts                             # drizzle + pg Pool (connectionString = DATABASE_URL)
  email.ts                          # Resend: verification / welcome / admin-notice / reset / contact
  settings.ts                       # app_settings get/update (runtime email config, env fallback)
  analytics.ts                      # getAnalyticsSummary(days) over pageview table (§8e)
  goodreads.ts                      # CSV/RSS parse + upsert + covers + queries + searchBooks/getBookOfTheMonth (§8f/§8h)
  instagram.ts                      # Behold fetch/parse/normalize + upsert + syncInstagramFeed() + queries + default feed URL (§8g)
  schema.ts                         # auth tables + admin cols + app_settings + pageview + goodreads_book + instagram_post
                                    #   (NB: voice documents/chunks are NOT here — raw SQL only, §8h)
  voice-agent/                      # framework-agnostic voice client (React-/Node-free) (§8h)
    settings.ts                     #   SYSTEM_PROMPT (site expert) + AGENT_FUNCTIONS + DEFAULT_AGENT_CONFIG + buildSettings()
    VoiceAgentClient.ts             #   WebSocket + mic + playback + function-call dispatch
    config.ts types.ts knowledge.ts #   endpoints/consts; protocol types; static FAQ fallback
    AudioPlayer.ts MicCapture.ts pcm.ts FunctionRegistry.ts  # audio + tool registry
  voice/
    documents.ts                    # FTS over documents/chunks (shares lib/db.ts pool); ingest/list/delete (§8h)
    agent-config.ts                 # get/setVoiceAgentConfig over app_settings (key voice_agent_config) (§8h)
  db.ts                             # drizzle + pg Pool — now ALSO `export const pool` for the voice FTS (§8h)
  utils.ts                          # cn()
documents/                          # seed knowledge docs (about/membership/packs/book-of-month/benefits/faq) (§8h)
scripts/
  seed-admin.mjs                    # promote an existing owner row to admin (npm run db:seed-admin)
  voice-db-setup.mjs                # create documents+chunks tables (FTS, no pgvector) — npm run voice:db (§8h)
  ingest-knowledge.mjs              # ingest documents/*.md into the store — npm run voice:ingest (§8h)
drizzle/
  0000_better_auth_init.sql         # base auth tables
  0001_tough_firedrake.sql          # admin columns + app_settings
  0002_voice_knowledge.sql          # voice documents/chunks DDL — REFERENCE ONLY (applied by voice-db-setup, §8h)
  meta/                             # drizzle-kit journal + snapshots
public/  logo.jpg, images/          # brand logo (don't replace) + section photos + images/voice-assistant.png (Tiff avatar §8h)
  worklets/pcm-recorder.worklet.js  # AudioWorklet: mic frames -> main thread (served statically) (§8h)
docker-compose.yml                  # Postgres 17 (local dev DB — container tiffany_tales_db:5432)
drizzle.config.ts  components.json  .env / .env.example  vercel.json (two Vercel Cron jobs §8f/§8g)
.claude/skills/checkpoint/          # "checkpoint" skill (lint+type-check+build, then commit; no push)
.design/.specs/ADMIN_PLAN.md        # the admin-feature implementation plan (reference)
```

---

## 8. Auth & database

- **Stack:** Better Auth (`emailAndPassword` with `minPasswordLength: 8` and
  **`requireEmailVerification: true`**) **+ Google OAuth** **+ admin plugin** **+ account
  linking** → Drizzle adapter (`provider: "pg"`) → Postgres. `nextCookies()` is **last** in the
  plugins array; `admin()` goes before it.
- **Tables** (`lib/schema.ts`, snake_case columns):
  - `user`: id, name, email (unique), email_verified, image, created_at, updated_at, **+ admin
    plugin fields** `role`, `banned`, `ban_reason`, `ban_expires` (all nullable).
  - `session`: + `impersonated_by`.
  - `account`: credential (hashed password under `provider_id='credential'`) + Google identities
    (`provider_id='google'`, tokens + scope).
  - `verification`: email-verification tokens.
  - **`app_settings`**: key/value table for runtime-editable email addresses (§8b).
- **Email verification flow:** sign-up does **not** create a session. `emailVerification`
  (`sendOnSignUp: true`, `autoSignInAfterVerification: true`, `expiresIn: 3600`) sends a Resend
  verification email; clicking the link verifies + signs in. `signup-form` shows a "check your
  inbox" panel; `login-form` shows a friendly message on the 403-unverified error. Google sign-in
  is exempt (Google verifies the email).
- **Account linking** (`account.accountLinking`): `enabled: true`, `trustedProviders: ["google"]`
  — so a Google sign-in **links to an existing email/password account** with the same email
  instead of failing with `account_not_linked`. Safe because Google verifies the email.
- **`getSafeSession()`** (`lib/auth.ts`) wraps `auth.api.getSession` in try/catch → returns `null`
  on DB failure, so pages render the login form instead of crashing. Used by `/login`,
  `/dashboard`, `/profile`, and (via `requireAdmin`) `/admin`.
- **`baseURL` + `trustedOrigins`** (unchanged production fix): `trustedOrigins` lists
  `http://localhost:3000`, `https://tiffany-s-tales.vercel.app`, `https://tiffany-s-tales-*.vercel.app`.
  `baseURL` ignores a localhost value when running on Vercel (uses `VERCEL_PROJECT_PRODUCTION_URL`).

### 8a. Admin area (Better Auth admin plugin)
- **Plugin config:** `admin({ defaultRole: "user", adminRoles: ["admin"] })`. The plugin auto-serves
  `/api/auth/admin/*` (listUsers, setRole, banUser, unbanUser, removeUser, …) and adds `role`/`banned`
  to the session user. Client side: `adminClient()` in `lib/auth-client.ts` → `authClient.admin.*`.
- **Bootstrap:** `ADMIN_EMAIL` (env, default `arbeling@gmail.com`, lower-cased). A
  `databaseHooks.user.create.before` hook stamps `role: "admin"` when a new user's email matches
  `ADMIN_EMAIL` (the `role` field is `input:false`, so only a server hook can set it). For a
  **pre-existing** owner row, run **`npm run db:seed-admin`** (`scripts/seed-admin.mjs`, idempotent).
- **Guard:** `requireAdmin()` (`lib/admin.ts`) — redirects non-authed to `/login`, non-admins to
  `/dashboard`. This is the real protection; the header "Admin" link is cosmetic.
- **`/admin` page** (`app/admin/page.tsx`, server): SSR-fetches users via
  `auth.api.listUsers({ query: { limit: 200 }, headers })` + an `account` join for the Provider
  column + `getSettings()` + `getAnalyticsSummary([7,30,90])` (§8e) + `getAdminBooks()` /
  `getGoodreadsUserId()` (§8f) + `getAdminPosts()` / `getBeholdFeedUrl()` (§8g) +
  `getVoiceAgentConfig()` (§8h). Renders `AdminPanel` (Tabs: **Users** | **Analytics** |
  **Goodreads** | **Instagram** | **Voice** | **Knowledge** | **Email settings**).
  - **Users tab:** table (member, provider, joined, role, status) + per-row dropdown → confirm
    `AlertDialog` → **Make/Revoke admin** (`setRole`), **Pause/Resume** (`banUser`/`unbanUser` —
    reversible, indefinite), **Remove** (`removeUser`). Own-row Pause/Remove disabled. Mutations
    `router.refresh()` to re-fetch.
  - **Analytics tab:** first-party pageview dashboard — see §8e.
  - **Goodreads tab:** import books via CSV/RSS + curate visibility — see §8f.
  - **Instagram tab:** sync posts via a Behold feed URL + curate visibility — see §8g.
  - **Voice tab:** configure the voice assistant (LLM provider/model, voice, prompt, …) — see §8h.
  - **Knowledge tab:** upload/list/delete the docs the assistant answers from — see §8h.
  - **Email settings tab:** edits the 3 addresses (§8b) via an admin-guarded server action.

### 8b. Runtime-editable email settings (`lib/settings.ts` + `lib/email.ts`)
- `lib/settings.ts`: `getSettings()` / `updateSettings()` over `app_settings`. Read on each call
  (small PK select), DB value **?? env fallback ?? default**, wrapped in try/catch so a DB error
  falls back to env and never breaks email. Three settings:
  - `emailFrom` ← DB ?? `RESEND_FROM` ?? `"Tiffany's Tales <onboarding@resend.dev>"`
  - `adminNotificationRecipient` ← DB ?? `ADMIN_EMAIL` ?? `arbeling@gmail.com`
  - `contactRecipient` ← DB ?? `CONTACT_EMAIL` ?? `adminNotificationRecipient`
- `lib/email.ts` reads these **per send** (no module-load constants). Functions: `sendVerificationEmail`,
  `sendRegistrationEmails` (admin notice + member welcome), **`sendPasswordResetEmail`** (§8d),
  `sendContactEmail` (to contact recipient, reply-to = sender, optional copy). All never throw;
  no-op when `RESEND_API_KEY` is unset. All use the shared branded `shell()` HTML wrapper.
- ⚠️ **Resend domain limitation** (unchanged): in test mode (no verified domain, from
  `onboarding@resend.dev`) Resend only delivers to the **account owner** (`arbeling@gmail.com`).
  Member welcomes / verification to other addresses are **rejected (403)** until a domain is verified
  at <https://resend.com/domains> and `RESEND_FROM` (or the admin "From address") is set to it.

### 8c. Schema changes & migrations
- Local Docker DB: edit `lib/schema.ts`, then `npm run db:push` (diffs and applies; the dev workflow).
- Generated migrations live in `drizzle/` (`0000` base, `0001` admin columns + `app_settings`).
- **Tables added since (applied via `db:push` to BOTH local Docker and Neon; NOT `drizzle/`-generated):**
  - **`pageview`** — first-party analytics (§8e): `id, path, visitor_id, referrer, country, device,
    created_at`, index on `created_at`.
  - **`goodreads_book`** — imported books (§8f): `id, goodreads_id (unique), title, author, isbn,
    isbn13, cover_url, my_rating, average_rating, my_review, shelf, date_read, date_added,
    year_published, source, hidden, created_at, updated_at`, index on `shelf`.
  - **`instagram_post`** — synced IG posts (§8g): `id, instagram_id (unique), permalink, caption,
    media_type, image_url, alt_text, like_count, comments_count, posted_at, hidden, created_at,
    updated_at`, index on `posted_at`.
  - ✅ **Neon (prod) now has all three tables and is populated.** `npm run db:push` was run against
    the Neon `DATABASE_URL` (additive — created `pageview`, `goodreads_book`, `instagram_post`;
    verified 8 tables in `public`). `goodreads_book` was loaded with the **full library (~1031
    books)** and `instagram_post` with the Behold feed (**7 posts**, growing). These tables are
    still **only applied via `db:push`** (not `drizzle/`-generated), so any future schema change
    must be `db:push`ed to **both** local Docker and Neon.
- **Neon (production) has been migrated** to the admin schema. Because Neon already had the base
  tables (and a partial `role`/`banned` from earlier), the `0001` changes were applied as
  idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` SQL run
  directly against the Neon `DATABASE_URL` (not via `drizzle-kit migrate`, which would have tripped
  on the existing base tables). `public.user` now has role/banned/ban_reason/ban_expires,
  `public.session` has impersonated_by, and `public.app_settings` exists.
  - ℹ️ Neon also has a built-in **`neon_auth` schema** with its own `user` table — unrelated to
    this app, which uses **`public`**. Don't be confused by it when querying.

### 8d. Password reset (forgot password)
- **Server** (`lib/auth.ts` → `emailAndPassword`): `sendResetPassword: async ({ user, url }) => …`
  calls `sendPasswordResetEmail` (Resend); `resetPasswordTokenExpiresIn: 3600` (1 hour). Better
  Auth's `requestPasswordReset` endpoint issues a one-time token and emails a link that lands on
  our reset page.
- **Client** (`lib/auth-client.ts` exports `requestPasswordReset`, `resetPassword`):
  - `login-form.tsx` has a **"Forgot password?"** link → swaps the form to an email-only view →
    `authClient.requestPasswordReset({ email, redirectTo: \`${origin}/reset-password\` })`. Shows a
    deliberately **generic** success toast (doesn't reveal whether the email exists).
  - `/reset-password` (`reset-password-form.tsx`): reads `?token=` from the URL (or `?error=` →
    "link expired" panel with a back-to-login button); on submit calls
    `authClient.resetPassword({ newPassword, token })` (validates ≥8 chars + confirm match), then
    routes to `/login`.
- ⚠️ Same **Resend domain limitation** as all other mail (§8b): until a domain is verified, reset
  emails only deliver to `arbeling@gmail.com`.

### 8e. Web Analytics (`@vercel/analytics` + first-party)
- **Two parallel systems.** (1) **Vercel Web Analytics** — `<Analytics />` from
  `@vercel/analytics/next` mounted in `app/layout.tsx`; feeds **Vercel's own dashboard** only
  (Vercel exposes **no public API** to read those numbers back). (2) **First-party tracking** —
  because of that, we record our own pageviews so the admin can see them in-app.
- **Flow:** `components/pageview-tracker.tsx` (client, in root layout) watches `usePathname()` and
  fires `navigator.sendBeacon("/api/track", …)` on each navigation, **skipping** `/admin`,
  `/dashboard`, `/login`, `/api`. → `app/api/track/route.ts` (POST) mints/reads an opaque
  first-party visitor cookie **`tt_vid`** (random id, **no IP/PII**, ~180d), filters bots by UA,
  reads `country` from `x-vercel-ip-country` + coarse device from UA, and inserts a `pageview` row.
  Always returns 204 (never surfaces errors to visitors).
- **Aggregation:** `lib/analytics.ts` → `getAnalyticsSummary(days)` returns `totalPageviews`,
  `uniqueVisitors` (distinct `visitor_id`), `topPaths`, `topReferrers`, `byCountry`, `byDevice`,
  and a zero-filled `daily` series. Never throws (→ empty on DB error). `/admin` fetches the 7/30/90
  windows and passes them to **`admin-analytics.tsx`** (stat cards, CSS bar chart, breakdown
  tables, client-side 7/30/90 toggle — no reloads).
- Numbers are our own (differ slightly from Vercel's bot-filtering/dedup). ⚠️ Needs the `pageview`
  table on whichever DB you run against (§8c).

### 8f. Goodreads import (books & reviews)
- **Why CSV + RSS:** Goodreads **shut down its public API** (no new keys since 2020), so the two
  viable sources are the **CSV "Export Library"** (complete: full review text, rating, dates, ISBN,
  shelf) and the **public per-shelf RSS feed** (recent ~100 books, review text often truncated, but
  includes cover image URLs).
- **Core (`lib/goodreads.ts`):**
  - `parseGoodreadsCsv(text)` (papaparse) — cleans Excel-safe ISBNs (`="…"`), strips light HTML
    from reviews; derives `coverUrl` from ISBN via **Open Library** (`covers.openlibrary.org/b/isbn/
    {isbn}-L.jpg?default=false`, since CSV has no cover URLs).
  - `parseGoodreadsRss(xml)` (fast-xml-parser) + `fetchGoodreadsRss(userId)` — reads the `?shelf=read`
    feed; uses Goodreads' own `book_large_image_url` for covers.
  - `upsertGoodreadsBooks(books)` — single insert keyed by **`goodreads_id` (unique)** with
    `onConflictDoUpdate`; enrichment fields **coalesce** so a later null can't wipe data, and the
    **longer review wins** (RSS truncates). `hidden` is never overwritten (preserves curation).
    Returns `{ imported, updated, total }`.
  - **Cover resolution** — `resolveCoverUrl(book)` tries, in order: a working source image
    (Goodreads), **Open Library by ISBN** (`?default=false` → 404 when missing, HEAD-checked),
    **Open Library title/author search** (`search.json` → `cover_i`), then **Google Books**
    (`volumes?q=intitle:…+inauthor:…` → `imageLinks`, upgraded to https). ⚠️ Unauthenticated
    **Google Books has a low shared daily quota (429s easily)** — it's only the tertiary fallback;
    Open Library does the heavy lifting. Nothing found → `cover_url` null → `BookCover` renders a
    generated text cover. (`enrichCovers(books)` runs `resolveCoverUrl` over a batch with
    **concurrency 8**; it still exists but is **no longer called inline by the import actions** — see
    the decoupling note below.)
  - **`resolveMissingCovers({ limit, deadlineMs })`** — the **background cover backfill**. Selects
    rows whose `cover_url` is null or still the unverified Open Library ISBN-guess URL, resolves each
    via `resolveCoverUrl`, and writes back only **verified** covers. Time-bounded (default ~50s) and
    bounded by `limit` (default 80) so it fits a serverless function; returns
    `{ scanned, updated, remaining }`. Call it repeatedly (cron / re-import) to drain the backlog.
  - Queries: `getPublicReviews()` (read-shelf, not hidden, has rating/review → /reviews),
    `getPublicBookshelf()` (grouped read / currently-reading / to-read → /goodreads),
    `getAdminBooks()` (recent + total), `get/setGoodreadsUserId()` (stored in `app_settings` under
    **`goodreads_user_id`**).
- **Admin server actions (`app/admin/actions.ts`, all `requireAdmin`-guarded):**
  `importGoodreadsCsvAction` (reads the uploaded `File` from FormData, ≤10MB, parses + upserts),
  `syncGoodreadsRssAction` (saves the numeric user id, fetches + parses + upserts; RSS already
  carries Goodreads covers), `setBookHiddenAction(bookId, hidden)` (toggle public visibility). The
  shared `revalidateBookPages()` revalidates `/admin`, `/reviews`, `/goodreads`, `/instagram`.
- ⚠️ **Cover resolution is decoupled from import (prod-timeout fix).** Resolving a cover for every
  book inline (~1000 books × several external lookups) **times out on Vercel**, so a full-library
  CSV upload used to fail in prod. Imports now **upsert immediately** (no inline `enrichCovers`);
  covers are filled in afterwards by the background **`/api/cron/goodreads-covers`** route (`GET`,
  `dynamic = "force-dynamic"`, `maxDuration = 60`, `CRON_SECRET`-guarded, scheduled `30 6 * * *`),
  which calls `resolveMissingCovers()` for a time-bounded batch and revalidates `/reviews` +
  `/goodreads` when it changed something. So fresh imports show text covers briefly, then real ones
  as the daily job (Google quota resets daily) drains the backlog. A one-time local backfill against
  Neon (RSS images for the latest reads + Open Library/Google Books for the rest) seeded the
  current covers.
- **Admin UI (`admin-goodreads.tsx`):** CSV-upload card + RSS-sync card (`useActionState`, file/text
  inputs) + an imported-books table with a cover thumbnail, per-row **show/hide** (Eye toggle) and a
  count badge.
- **`BookCover` (`components/book-cover.tsx`, client):** plain `<img>` (chosen over `next/image` to
  avoid configuring many external cover domains) with `onError` fallback. When given a **`title`**
  (and optional `subtitle`) it renders a **generated text cover** (title + author + paw-print on a
  cream card) instead of an icon — so a referenced book always shows a picture. Without `title` it
  falls back to a neutral icon (e.g. Instagram thumbnails). Used by `/reviews`, `/goodreads`, the
  Goodreads admin table, and Instagram cards.
- **Public pages** consume the queries (§6): `/reviews` (review wall) and `/goodreads` (full shelf).
  Copy on `/goodreads` references **"Riette"**.
- ⚠️ Needs the `goodreads_book` table on whichever DB you run against (§8c).

### 8g. Instagram import (@tiffanystales)
- **Why Behold.so:** Meta **shut down the Instagram Basic Display API (Dec 2024)** and **personal
  accounts can't be read by any API**; direct scraping of `instagram.com` returns **429** (verified).
  The supported path is **Behold.so** — connect @tiffanystales once on behold.so (free, requires a
  free **Professional/Creator** account), which exposes a stable **JSON feed** URL
  (`https://feeds.behold.so/<id>`); Behold handles Meta's app/tokens/refresh. We fetch + import it
  server-side, mirroring the Goodreads RSS flow. (Bright Data / scraper alternatives were considered
  and **declined** — paid + ToS-gray + brittle.)
- **Setup status:** the @tiffanystales JSON feed is **pre-wired** as `DEFAULT_BEHOLD_FEED_URL`
  (feed id `jAqgUAD6CVwfWmBrRzzd`), so no manual configuration is required — the admin **Sync now**
  button and the daily cron both use it (an admin can still paste a different Behold URL to override).
  Behind the scenes: @tiffanystales is a Professional account connected on **behold.so** with a JSON
  feed. ⚠️ Behold's free tier refreshes ~daily, so a brand-new post can take up to a day to appear.
- ⚠️ **Feed id ≠ widget id.** The Behold *widget* embed id (`B69HSEq0diccWSOVNBUX`) **404s** on
  `feeds.behold.so/<id>`; the JSON *feed* id is `jAqgUAD6CVwfWmBrRzzd` (decode any feed image URL's
  base64 token — its `f` field is the feed id). Always use the **feed** id for the sync URL.
- ⚠️ **Behold free feed caps at 6 posts.** The JSON feed returns only the **6 most recent** posts;
  no query param (`?limit=`, `?count=`, …) overrides it. Since `upsertInstagramPosts` **never
  deletes**, the DB accumulates posts over time as they rotate through the window (so the displayed
  count climbs past 6 — it was 7 right after the fix). To expose the **full** history at once, raise
  the post count on Behold (plan/feed setting); the sync then imports them all (display shows up to
  48 via `getPublicInstagramPosts`).
- **Core (`lib/instagram.ts`):**
  - **`DEFAULT_BEHOLD_FEED_URL`** = `https://feeds.behold.so/jAqgUAD6CVwfWmBrRzzd` — the live
    @tiffanystales feed. `getBeholdFeedUrl()` returns the admin-saved URL **or this default** (it
    no longer returns null), so public pages, the admin form, and the cron all work out of the box.
  - `isBeholdUrl(url)` — **SSRF guard**: requires `https:` and a `behold.so` (or `*.behold.so`) host
    before any fetch. **`normalizeBeholdFeedUrl(url)`** rewrites the Behold **dashboard** URL
    (`app.behold.so/feeds/<id>`, which serves HTML) to the **JSON feed** (`feeds.behold.so/<id>`),
    so pasting either form works.
  - `fetchBeholdFeed(url)` (`fetch` with `next: { revalidate: 3600 }`, throws on non-OK; **also
    throws a clear error if the response content-type isn't JSON** — catches a wrong/dashboard URL
    instead of a cryptic `<!doctype` parse crash) + `parseBeholdFeed(json)` → `NormalizedPost[]`:
    picks `imageUrl` = `sizes.medium ?? sizes.large ?? mediaUrl ?? thumbnailUrl`, `caption` =
    `prunedCaption || caption`, `postedAt` from `timestamp`; skips posts with no `id`.
  - `upsertInstagramPosts(posts)` — insert keyed by **`instagram_id` (unique)** with
    `onConflictDoUpdate`; enrichment fields **coalesce**, **`hidden` never overwritten**. Returns
    `{ imported, updated, total }`.
  - **`syncInstagramFeed(feedUrl?)`** — the shared sync used by **both** the admin action and the
    cron: resolves the URL (arg ?? saved ?? default), SSRF-guards + normalizes it, saves it, then
    fetch → parse → upsert; throws on a bad/empty feed. Does **not** revalidate (callers do).
  - Queries: `getPublicInstagramPosts(limit=48)` (not hidden, `posted_at desc`),
    `getAdminPosts(limit=100)` (`{ posts, total }`), `get/setBeholdFeedUrl()` (stored in
    `app_settings` under **`instagram_behold_feed_url`**). All read queries fail-soft → empty.
- **Admin server actions (`app/admin/actions.ts`, `requireAdmin`-guarded):**
  `syncInstagramAction` (validates the URL, then calls `syncInstagramFeed()`, errors on 0 posts),
  `setInstagramPostHiddenAction(postId, hidden)`. Both revalidate via `revalidateBookPages()` (incl.
  `/instagram`).
- **Automatic daily sync (Vercel Cron):** `app/api/cron/instagram-sync/route.ts` (`GET`,
  `export const dynamic = "force-dynamic"`) is scheduled by **`vercel.json`** at **`0 6 * * *`**
  (06:00 UTC daily — the Hobby-plan max, matching Behold's ~daily refresh). It requires
  `Authorization: Bearer ${CRON_SECRET}` (Vercel sends this automatically when `CRON_SECRET` is set;
  any other request → **401**), calls `syncInstagramFeed()`, then revalidates `/instagram` +
  `/reviews`. ⚠️ **Set `CRON_SECRET` in Vercel** or the cron stays 401 (§9).
- **Admin UI (`admin-instagram.tsx`):** a **Connect Behold feed** card (`useActionState`, feed-URL
  input + Sync now) + an imported-posts table (thumbnail via `BookCover`, caption snippet, date, like
  count, per-row show/hide).
- **Public:** the reusable `components/instagram-post-card.tsx` (square `BookCover` photo, clamped
  caption, date, "View on Instagram" → `permalink`) is used on the **`/instagram`** page and the
  Instagram section of **`/reviews`**. The shared `components/icons/instagram-icon.tsx` provides the
  glyph (lucide lacks `Instagram`).
- ℹ️ The `instagram_post` table exists on **both** local Docker and Neon (§8c), and Neon is
  populated (6 posts). Images render via plain `<img>` (through `BookCover`), so **no
  `next.config.ts` `images.remotePatterns`** is needed.
- ⚠️ **Static pages + revalidation:** `/instagram` and `/reviews` are **statically prerendered**;
  they refresh only when a sync calls `revalidatePath` (admin action or cron) or on a redeploy. A
  direct DB write that bypasses those (e.g. raw SQL) won't show until a sync or rebuild runs.

### 8h. Voice assistant (Deepgram Voice Agent)
- **What it is:** a site-wide, mic-driven **voice guide** for the book club, ported from a Deepgram
  Voice Agent scaffold (`.claude/.APP/`) and re-skinned for Tiffany's Tales. A floating launcher
  (avatar = **Tiff**, the chihuahua mascot, `public/images/voice-assistant.png`) on every public
  page opens a cosy panel; the visitor talks, and the agent speaks back, gives **spoken page tours**
  (navigate / scroll / highlight), answers **grounded** club questions, and queries the **live
  Goodreads shelves**. ⚠️ **Built locally, not yet committed/deployed** (§0).
- **How the pipeline works:** all audio runs **in the browser**. The framework-agnostic core in
  **`lib/voice-agent/*`** (kept **React-free and Node-free** so it can later become an embeddable
  Web Component) opens a **`WebSocket`** to `wss://agent.deepgram.com/v1/agent/converse`, captures
  mic audio via an **AudioWorklet** (`public/worklets/pcm-recorder.worklet.js` → linear16 PCM),
  streams it up, and plays the agent's PCM frames back gaplessly. Deepgram does STT → LLM → TTS;
  the **LLM ("think") is Anthropic `claude-4-5-haiku-latest`, Deepgram-managed** (no separate
  Anthropic key — the `endpoint` is optional for OpenAI/Anthropic/Google providers). Voice =
  Aura-2 `aura-2-thalia-en`. Listen model = `flux-general-en` (needs the v2 listen API).
- **The server never sees audio and never exposes the key.** `app/api/deepgram/token` (`POST`,
  `dynamic`) mints a **60-second** grant from `DEEPGRAM_API_KEY` via `/v1/auth/grant`; the browser
  uses it as a WebSocket **subprotocol** (`["bearer", <jwt>]`). The raw key never reaches the client.
- **Tools the agent can call** (declared in `settings.ts`, handlers in `VoiceAgentProvider.tsx`):
  `navigate(path)`, `scroll_to(selector)`, `highlight_element(selector)` (adds the `.va-highlight`
  sage/plum ring — defined in `globals.css`), `lookup_knowledge(query)` → `/api/knowledge`,
  `search_books(query)` / `book_of_the_month()` → `/api/voice/books`, and `end_tour()`. The page map
  in the prompt lists the real selectors (`#hero`, `#packs`, `#book-of-the-month`) and routes.
- **Grounded knowledge (full-text search, no embeddings):** a Postgres **`documents` + `chunks`**
  store backs `lookup_knowledge`. `lib/voice/documents.ts` (FTS via `websearch_to_tsquery` +
  `ts_rank_cd` over a generated `content_tsv` column, sharing the **exported `pool` from
  `lib/db.ts`**) returns the best chunks; `/api/knowledge` (`runtime="nodejs"`) falls back to the
  **static FAQ** in `lib/voice-agent/knowledge.ts` when the store has no match or is down. ⚠️ Unlike
  the original scaffold, **pgvector + the `embedding` column are omitted** (the local `postgres:17`
  image has no pgvector; we only use FTS). The tables are **created by `npm run voice:db`**
  (`scripts/voice-db-setup.mjs`, idempotent raw SQL) — **not** by `drizzle-kit` (a hand-dropped
  `drizzle/0002_voice_knowledge.sql` exists for parity/reference only, unregistered in the journal),
  and they're **not** in `lib/schema.ts`. To enable semantic search later on a pgvector host (Neon),
  see the comments in `scripts/voice-db-setup.mjs` / `drizzle/0002_voice_knowledge.sql`.
- **Seeding knowledge:** `documents/*.md` (about-the-club, membership, packs-and-meetings,
  book-of-the-month, benefits, faq) are ingested by **`npm run voice:ingest`**
  (`scripts/ingest-knowledge.mjs`, ~500-char chunks, idempotent per `source`). The owner can also
  upload `.txt/.md/.pdf/.docx` from **/admin → Knowledge** (`components/admin/admin-knowledge.tsx`)
  → `app/api/documents` (`POST`/`GET`/`DELETE`, `runtime="nodejs"`, `mammoth`/`pdf-parse` extraction,
  10 MB cap). ⚠️ That route is **admin-gated with `getSafeSession()` + `isAdmin()` → 401** (NOT
  `requireAdmin()`, which redirects — wrong for a JSON API).
- **Live book data:** `app/api/voice/books` (`runtime="nodejs"`, public — only exposes already-public
  shelf data) backs `search_books` / `book_of_the_month` using new helpers in `lib/goodreads.ts`:
  `searchBooks(q, limit)` (case-insensitive `ilike` over non-hidden books) and `getBookOfTheMonth()`
  (newest `currently-reading`, else latest read). It returns a compact, **speakable** text summary.
- **Owner-controlled config (the Voice tab):** the assistant's **model, voice, prompt, greeting,
  temperature, speed, listen model, language** are stored centrally as one JSON blob in
  **`app_settings`** (key `voice_agent_config`) via **`lib/voice/agent-config.ts`**
  (`getVoiceAgentConfig` / `setVoiceAgentConfig`, merged over `DEFAULT_AGENT_CONFIG`, sanitized).
  The **/admin → Voice** form (`components/admin/admin-voice.tsx` → `saveVoiceConfigAction` in
  `app/admin/actions.ts`) edits them; the **default prompt makes the agent an expert on the whole
  site** (every page, the facts, the tools). The browser fetches the live config from
  **`GET /api/voice/config`** (public, `no-store`) on mount, so changes apply to **all visitors** on
  the next chat **without a redeploy** and **without making the static marketing pages dynamic**
  (the prompt/model are already client-visible in the Deepgram handshake, so no new leak).
- **React layer:** `VoiceAgentProvider.tsx` (`useVoiceAgent()` hook — status/transcript/mute/connect)
  wraps the framework-agnostic `VoiceAgentClient`; `BookClubLauncher.tsx` is the brand launcher
  (Tiff avatar, mic-state ring/dot, Start/End + mute). Both mount in `app/(marketing)/layout.tsx`.
  ℹ️ The old per-browser `SettingsPanel`/`icons` were **removed** — config is owner-only now.
- ⚠️ **Setup:** add `DEEPGRAM_API_KEY` to `.env` (§9), `npm install` (adds `mammoth` + `pdf-parse`),
  `npm run voice:db`, `npm run voice:ingest`. `next.config.ts` lists
  `serverExternalPackages: ["pdf-parse", "mammoth"]`. ⚠️ Needs the `documents`/`chunks` tables on
  whichever DB you run against — **not yet created on Neon** (run `voice:db` against the Neon URL
  before prod). The live mic↔WS path requires a browser + microphone (untested headlessly).

### Google OAuth (`.design/.specs/better_auth.md`)
- Config in `lib/auth.ts` `socialProviders.google` (`prompt: "select_account"`), guarded by
  `isGoogleEnabled` (both `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` set). UI:
  `components/auth/google-button.tsx`, shown on `/login`.
- ⚠️ **Two OAuth clients exist:** `…1rgqosoo…` (has the **localhost** redirect URI registered →
  used for **local** dev) and `…om1jpc03…` (has the **production** redirect URI → used on **Vercel**).
  In `.env` the **prod (`om1`) pair is commented out** so local dev uses the `1rg` client. Production
  uses `om1` via Vercel env vars. Both redirect URIs are now registered, so Google sign-in works in
  both environments.
- Diagnose what's sent with the curl in §0; `redirect_uri_mismatch` = the sent `redirect_uri` isn't
  registered on that client; `account_not_linked` is handled by account linking (above).

---

## 9. Environment variables (`.env`, gitignored)

Active `.env` shape (local dev):
```
# Local Postgres (docker-compose.yml) — ACTIVE for local dev
DATABASE_URL=postgres://tiffany:tiffany_dev_pw@localhost:5432/tiffany_tales
# Neon (production) — commented out locally; used in prod via Vercel env
# DATABASE_URL=postgresql://<user>:<pw>@<endpoint>-pooler.<region>.aws.neon.tech/neondb?sslmode=require

BETTER_AUTH_SECRET=<32+ char secret>
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<1rg… local client>          # local client (localhost redirect registered)
GOOGLE_CLIENT_SECRET=<…>
# GOOGLE_CLIENT_ID=<om1… prod client>          # commented out — prod uses Vercel env
# GOOGLE_CLIENT_SECRET=<…>
RESEND_API_KEY=<re_…>
ADMIN_EMAIL=arbeling@gmail.com                 # grants admin role + default admin-notice recipient
# RESEND_FROM=Tiffany's Tales <…@verified-domain>   # optional sender override
# CONTACT_EMAIL=…                              # optional contact recipient (defaults to ADMIN_EMAIL)
# CRON_SECRET=<random>                         # guards the /api/cron/* jobs; primarily set in Vercel for prod
DEEPGRAM_API_KEY=<dg_…>                        # voice assistant (§8h); server-only, never NEXT_PUBLIC_
```

- **Which DB is live is decided here.** Currently **local Docker**. To dev against Neon, flip the
  commented lines and restart the dev server. ⚠️ The app email/recipient values in `app_settings`
  (set via the admin UI) **override** `RESEND_FROM` / `ADMIN_EMAIL` / `CONTACT_EMAIL` at runtime.
- ⚠️ **Throwaway local-dev secrets.** DB password + auth secret in the file are local-dev only.
  **Rotate the Neon DB password** (it has been shared in plain text). Never commit a real `.env`.
- ⚠️ **`.env` is last-value-wins** — keep a single active `GOOGLE_*` pair (the prod pair is
  commented out, so the local `1rg` pair is active).

### Production (Neon + Vercel)
**`.env` is gitignored and NEVER shipped to Vercel.** Set in **Vercel → Settings → Environment
Variables (Production)**:
- `DATABASE_URL` → Neon connection string.
- `BETTER_AUTH_SECRET` → 32+ char secret (**required** — Better Auth throws if unset).
- `BETTER_AUTH_URL` → ideally the prod https domain (code already overrides a stale localhost value on Vercel).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` → the **`om1`** prod client.
- `RESEND_API_KEY` (+ optional `ADMIN_EMAIL`, `RESEND_FROM`, `CONTACT_EMAIL`).
- **`DEEPGRAM_API_KEY`** → enables the voice assistant (§8h). Also run `voice:db` against the Neon
  URL once so the `documents`/`chunks` tables exist there (not yet done).
- **`CRON_SECRET`** → any random string; enables **both** daily crons
  (`/api/cron/instagram-sync` and `/api/cron/goodreads-covers`). Vercel Cron sends it as
  `Authorization: Bearer <CRON_SECRET>`; without it the routes return 401 (the crons effectively
  no-op). ⚠️ Vercel Hobby allows up to **2** daily cron jobs — these two fill that quota.
- Then **redeploy** (Vercel applies env changes only to a new deployment).

---

## 10. How to run

```bash
docker compose up -d     # start local Postgres (container tiffany_tales_db, port 5432)
npm install              # if deps not installed
npm run db:push          # sync lib/schema.ts -> local DB (first time / after schema change)
npm run db:seed-admin    # (optional) promote an existing arbeling@gmail.com row to admin
npm run voice:db         # (voice assistant §8h) create documents+chunks tables (idempotent)
npm run voice:ingest     # (voice assistant §8h) ingest documents/*.md into the knowledge store
npm run dev              # http://localhost:3000  (uses local Docker DB per .env)
```
**DB scripts** (drizzle-kit auto-loads `DATABASE_URL` from `.env`):
```bash
npm run db:push       # sync schema -> DB (dev workflow)
npm run db:studio     # Drizzle Studio GUI
npm run db:generate   # generate SQL migration files
npm run db:migrate    # apply generated migrations
npm run db:seed-admin # node --env-file=.env scripts/seed-admin.mjs (promote owner to admin)
npm run voice:db      # node --env-file=.env scripts/voice-db-setup.mjs (create documents+chunks, §8h)
npm run voice:ingest  # node --env-file=.env scripts/ingest-knowledge.mjs (seed knowledge docs, §8h)
```
**Quality gates** (all pass at `HEAD`):
```bash
npm run lint
npx tsc --noEmit
npm run build
```
**Peek the local DB:**
```bash
docker exec tiffany_tales_db psql -U tiffany -d tiffany_tales -c '\dt'
docker exec tiffany_tales_db psql -U tiffany -d tiffany_tales -c 'SELECT email,role,banned,email_verified FROM "user";'
```
For Neon, query with any pg client using the Neon `DATABASE_URL`.

### Deploying to production
1. Ensure Vercel env vars are set (§9), including **`CRON_SECRET`** for the Instagram cron and
   **`DEEPGRAM_API_KEY`** for the voice assistant (§8h).
2. Ensure Neon has the current schema — it now has all tables incl. `pageview`, `goodreads_book`,
`instagram_post` (§8c). Any **future** schema change must be `db:push`ed to the Neon URL too.
   ⚠️ For the voice assistant, also run **`voice:db`** against the Neon URL once (the `documents`/
   `chunks` tables aren't created there yet) and **`voice:ingest`** to seed the docs (§8h).
3. `git push origin main` → Vercel auto-builds & deploys (and registers `vercel.json` crons).

---

## 11. Conventions & gotchas

- **Modified Next.js:** `AGENTS.md` warns of breaking changes vs. training data. Read
  `node_modules/next/dist/docs/` before unfamiliar APIs. `headers()`/`cookies()` are **async**.
  Server Actions are `"use server"` files; the contact + settings forms use `useActionState`.
- **shadcn rules:** semantic colour tokens (not raw `bg-purple-500`); `gap-*` not `space-y-*`;
  `size-*` for square; forms use `Field` + `FieldGroup`; Base UI uses the **`render` prop** (NOT
  Radix `asChild`), e.g. `<Button render={<Link href="..." />}>`; button icons use `data-icon`.
- **Base UI, not Radix** — check `components/ui/*` before assuming props. `AlertDialogAction` is a
  plain Button (doesn't auto-close); dialogs are controlled via state.
- **`lucide-react@1.18.0`** is missing some icons (e.g. `Instagram`). Verify with
  `node -e "console.log('X' in require('lucide-react'))"`. For Instagram use the shared
  `components/icons/instagram-icon.tsx` (inline SVG, forwards `className`/SVG props).
- **Hydration warnings from browser extensions:** password managers (Psono, etc.) inject attributes
  onto `<input>`/`<form>` before React loads. `suppressHydrationWarning` is applied to the shared
  `Input` and to the auth/contact forms to silence these benign warnings.
- **`ctx7` CLI / find-docs skill:** use for any library API question (Better Auth, Next.js, Drizzle,
  Tailwind, Resend) — versions move fast.
- **`.env` decides the DB and is never deployed.** Currently local Docker; flip the commented lines
  for Neon. On Vercel the vars come from the dashboard.
- **Production auth failures = env, not code.** Missing/wrong Vercel env (`BETTER_AUTH_SECRET` unset
  → throws; `DATABASE_URL` missing; stale `BETTER_AUTH_URL`) is the usual cause; `getSafeSession()`
  keeps pages from hard-crashing meanwhile.
- **Google errors:** `redirect_uri_mismatch` = sent `redirect_uri` not registered on that client
  (diagnose with the §0 curl); `account_not_linked` = handled by account linking (§8). Keep the
  right OAuth client per environment (local `1rg`, prod `om1`).
- **Schema changes need both DBs.** Any new column/table must be applied to **both** the local
  Docker DB and Neon (via `db:push` against each `DATABASE_URL`). Auth/admin columns 500 on session
  reads if missing; the newer `pageview`, `goodreads_book` + `instagram_post` tables fail-soft
  (try/catch → empty). **All three now exist on Neon** (§8c) — keep both DBs in sync on future changes.
- **Checkpoint skill** (`.claude/skills/checkpoint/`): say "checkpoint" / `/checkpoint` to lint +
  type-check + build, then commit everything (skips `.env`); it does **not** push.

---

## 12. Design reference assets (`.design/.specs/`)

- `Pink and Cream Girly Book Review Planner.jpg` — **colour scheme** source + review-card layout.
- `WhatsApp Image 2026-06-14 at 12.54.56.jpeg` — **logo** source (copied to `public/logo.jpg`).
- `www.tiffanystales.com_.2025-11-03T19_57_31.206Z.md` — scraped **real site content** (nav, copy,
  FAQs, testimonial, contact, location). Canonical copy source.
- `better_auth.md` — Better Auth Google provider reference.
- `ADMIN_PLAN.md` — the admin-feature implementation plan.
- `vercel-web-analytics-admin.md` — the web-analytics implementation plan (§8e).
- `instagram-reviews-import.md` — the Instagram import implementation plan (§8g).
- `../../.claude/.APP/` — the original Deepgram Voice Agent scaffold + its
  `VOICE_ASSISTANT_IMPLEMENTATION_PLAN.md` that the voice assistant (§8h) was ported from.

---

## 13. Suggested next steps

Done recently: **multi-page restructure**, **dashboard + profile pages**, **required email
verification**, **Google account linking**, the **admin area**, **contact form wired to send**,
local DB on **Docker**, **Neon migrated** to the admin schema (all deployed at `503b85a`); then
**web analytics** (Vercel + first-party) and **password reset** (deployed at `7830344`); the
**Goodreads import**, the **Instagram import** (@tiffanystales via Behold.so), and **reliable
multi-source book covers** (deployed at `9ab830c`); then **Instagram automatic daily sync** (Vercel
Cron + pre-wired default feed + dashboard-URL hardening) plus **applying all newer tables to Neon and
populating the Instagram feed** (through `9741a5f`); and most recently the **decoupled Goodreads
cover backfill** (CSV import no longer times out in prod + daily cover cron) and the **Instagram
feed-id fix** (widget id → feed id) — deployed through `daf0037` (§0, §14).

- [x] ~~Apply `pageview` + `goodreads_book` + `instagram_post` to Neon~~ — **done**: `db:push`
      against the Neon URL (8 tables verified) + populated (~1031 books, 7 IG posts). (§8c)
- [x] ~~Connect the Instagram feed~~ — **done**: the @tiffanystales Behold feed is pre-wired as the
      default (feed id `jAqgUAD6CVwfWmBrRzzd`) and Neon is populated. (§8g)
- [x] ~~Fix the prod CSV import / cover resolution~~ — **done**: import decoupled from cover
      resolution; daily `/api/cron/goodreads-covers` backfill added. (§8f)
- [ ] **Voice assistant → prod (§8h):** commit the work, add `DEEPGRAM_API_KEY` to Vercel, run
      `voice:db` + `voice:ingest` against the Neon URL (tables not there yet), and smoke-test the
      live mic↔WebSocket conversation in a browser (untested headlessly).
- [ ] (Optional, voice) **Enable semantic search** on Neon (pgvector): add the `vector` extension +
      `embedding` column + HNSW index and switch `searchDocuments` to vector search (§8h).
- [ ] **Set `CRON_SECRET` in Vercel** so the two daily crons run (instagram-sync + goodreads-covers;
      both 401 until set). (§8g / §8f / §9)
- [ ] (Optional) **Raise Behold's post limit** to expose the full Instagram history at once (free
      tier caps the feed at 6 recent posts; the sync accumulates more over time meanwhile). (§8g)
- [ ] (Optional) **Generate `drizzle/` migration files** for `pageview` + `goodreads_book` +
      `instagram_post` (so far only applied via `db:push`).
- [ ] **Verify a Resend domain** so welcome/verification/**reset** emails deliver to non-owner
      addresses, then set `RESEND_FROM` (or the admin "From address") + add `RESEND_API_KEY` to Vercel (§8b).
- [ ] **Rotate the Neon DB password** (shared in plain text).
- [ ] (Optional) Set `BETTER_AUTH_URL=https://tiffany-s-tales.vercel.app` in Vercel so env matches code.
- [ ] Real **billing** for the £10/month membership (scaffold hinted at Polar).
- [ ] Capture extra sign-up fields (e.g. **preferred pack**) via Better Auth `user.additionalFields`.
- [ ] Replace placeholder Unsplash photos + clip-art logo with **real brand assets** (transparent-PNG logo).
- [ ] Persist **contact-form submissions** to a table (currently emailed only).
- [ ] Remove the legacy unused `components/auth/auth-nav.tsx`.
- [ ] Resolve `npm audit` advisories from `drizzle-kit` build-time deps (dev-only).

---

## 14. Git

- Branch: `main`, tracks `origin/main` (`github.com/xxxarbel/tiffany-s_tales`). Vercel auto-deploys
  every push to `main`.
- Recent history (newest last): … → **Goodreads + Instagram imports + reliable book covers**
  (`9ab830c`) → **Instagram auto-sync cron + pre-seeded feed URL** (`5245afd`) → **DESIGN.md update**
  (`acefb5c`) → **Behold dashboard-URL normalize + non-JSON guard** (`fd25196`) → **redeploy to
  prerender the IG feed from Neon** (`9741a5f`) → **decouple Goodreads cover resolution from import +
  daily cover cron** (`fd0863b`) → **Instagram feed-id fix (widget id → feed id)** (`daf0037`).
- **State now:** `HEAD` = `origin/main` = `daf0037`, **pushed and deployed**; working tree clean
  (apart from this DESIGN.md edit). Neon has all tables, the full Goodreads library (~1031 books,
  covers backfilled), and the Instagram feed (7 posts) — all live. The `9ab830c` checkpoint bundled
  the Goodreads import, the Instagram import, and the multi-source cover work in one commit (it also
  included `goodreads_library_export-DESKTOP-0FJ40LV.csv` and `goodreads_library_export (1).csv` —
  personal Goodreads exports left in the repo; the latter is the full ~1031-book library used to
  populate prod; safe to `git rm` + `.gitignore` if unwanted).
- ⚠️ `.env` is gitignored and holds live secrets — keep it that way. `checkpoint` commits but does **not** push.
```
