# Tiffany's Tales — Design & Build Handoff

> Single source of truth for continuing work after a context reset. Covers the
> brand, design system, page structure, tech stack, auth/DB setup, and how to run.
> Last updated: 2026-06-14.

---

## 1. What this is

A marketing + SaaS site for **Tiffany's Tales Book Club** — a cosy, in-person
book club based in **Maidstone, United Kingdom** (£10/month membership). Modelled
on the live site <https://www.tiffanystales.com/>. The app is a single marketing
landing page plus an auth area (login / subscribe / dashboard).

The brand voice is warm, friendly, community-first ("Join my pack today!" — the
"pack" theme comes from the dog logo).

---

## 2. Tech stack

| Area | Choice | Notes |
|---|---|---|
| Framework | **Next.js 16.2.9** (App Router, RSC) | ⚠️ See §11 — this is a *modified* Next.js; read `node_modules/next/dist/docs/` before using unfamiliar APIs. |
| Runtime | React 19.2.4 | |
| Styling | **Tailwind CSS v4** | Config via `@theme inline` in `app/globals.css` (no `tailwind.config.js`). |
| UI components | **shadcn/ui** | style `base-nova`, base library = **Base UI** (`@base-ui/react`), NOT Radix. icon library = **lucide**. Config in `components.json`. |
| Icons | `lucide-react` (^1.18.0) | ⚠️ This version does NOT export `Instagram` — an inline SVG is used in the footer. |
| Toasts | `sonner` | `<Toaster />` mounted in `app/layout.tsx`. |
| Auth | **Better Auth** (^1.6.18) | email + password, sessions. |
| ORM | **Drizzle ORM** (^0.45.2) + `drizzle-kit` | schema-push workflow (no migration files yet). |
| Database | **PostgreSQL 17** via Docker | `docker-compose.yml`, port 5432. |
| Fonts | `next/font/google` | Geist (sans) + Playfair Display (display/headings). |

Package manager: **npm**. Path alias: `@/*` → project root (e.g. `@/components/...`, `@/lib/...`).

---

## 3. Brand colours — purple + sage green

The scheme is taken from the brand planner image (`Pink and Cream Girly Book
Review Planner.jpg`): **plum purple** background with **sage green** panels and
purple text on green. Defined as both custom tokens and shadcn semantic tokens in
**`app/globals.css`** (`:root`).

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
- **Prefer shadcn semantic tokens** in components: `bg-primary`, `text-muted-foreground`,
  `bg-secondary`, `bg-accent`, `bg-card`, `border`, etc.
- The **custom brand tokens** (`bg-plum`, `text-cream`, `text-sage`, `from-primary`,
  `to-plum`) are for the dark hero/feature/footer bands where semantic tokens don't fit.
- Green badges/buttons with plum text = `variant="secondary"` (no manual colours needed).
- Star ratings / accents on dark = `text-sage`.

`--radius` is `0.75rem`. Dark-mode tokens exist (`.dark`) but the site renders **light only**
(no `.dark` class is applied).

---

## 4. Typography
- **Headings / display:** Playfair Display → `font-display` (also `--font-heading`).
- **Body / UI:** Geist → `font-sans` (default).
- Both wired in `app/layout.tsx` via `next/font/google` as CSS variables
  (`--font-geist-sans`, `--font-playfair`).

---

## 5. Logo & images

- **Logo:** `public/logo.jpg` — the official illustration: a white **chihuahua on an
  open book** inside a gold-ringed circular badge ("What happens in bookclub / stays
  in bookclub · Tiffany's Tales"), purple ground.
  - ⚠️ **RULE: the logo must always be the hero centrepiece — never replace it with a
    photo.** Rendered via a local `Logo` component (`next/image`, `rounded-full`).
  - It's a square JPG with a purple background; it's clipped to a circle. For a cleaner
    look later, get a **transparent PNG** version and swap it in.
- **Photos** (free Unsplash stock, downloaded locally to `public/images/`):
  - `community.jpg` → About section
  - `reading-cozy.jpg` → Sittingbourne pack card
  - `pack-maidstone.jpg` → Maidstone pack card
  - `book-of-month.jpg` → Book of the Month "cover"
  - `benefit-connection.jpg` → Benefits card "Real Connection"
  - `benefit-discussion.jpg` → Benefits card "Lively Discussion"
  - `benefit-story.jpg` → Benefits card "A Fresh Story"
  - These are **placeholders** — swap for real meet-up/member photos (same filenames = drop-in).

---

## 6. Page structure (`app/page.tsx`)

Single-page marketing site, top → bottom. Section IDs match the nav anchors.

1. **Header** (sticky) — logo + nav + `<AuthNav />` (session-aware: Log in / Join my pack, or My account).
2. **Hero** (`#home`) — purple gradient band, real welcome copy, **logo medallion** centrepiece. Primary CTA "Join my pack today!" → **`/login`**.
3. **About** (`#about`) — `community.jpg` + "Your literary sanctuary" copy + highlights.
4. **Benefits** (`#benefits`) — 3 photo cards (Real Connection / Lively Discussion / A Fresh Story), each with a photo banner + an icon chip overlapping the bottom edge.
5. **Packs** (`#packs`) — 2 pack cards with photos: **Sittingbourne** & **Maidstone**.
   ⚠️ "Pamper Night with a book" was **removed** (no longer supported) — do not re-add.
6. **Book of the Month** (`#book-of-the-month`) — deep-plum panel, photo cover.
7. **FAQ** — accordion, 3 real Q&As (monthly + Discord; suggestions welcome; £10/month).
8. **Book Reviews** (`#reviews`) — purple quote card (real member testimonial) + planner-style
   sage-green review card with a 5-star rating (Title/Author/Year fields, echoes the planner).
9. **Contact** (`#contact`) — `<ContactForm />` (Name/Email/Message + "Send me a copy" checkbox,
   sonner toast on submit; **not wired to a backend yet** — it just toasts and resets).
10. **Footer** — deep plum, logo, location, Instagram link, copyright.

Nav links: Home · About · Book Club Benefits · Book Reviews · Contact.

---

## 7. File map

```
app/
  globals.css                 # Tailwind v4 theme + colour tokens (EDIT COLOURS HERE)
  layout.tsx                  # fonts, metadata, <Toaster />
  page.tsx                    # the marketing landing page
  login/page.tsx              # /login — Tabs: Subscribe | Log in (redirects if already authed)
  dashboard/page.tsx          # /dashboard — protected; shows captured user details
  api/auth/[...all]/route.ts  # Better Auth handler (toNextJsHandler)
components/
  site-header.tsx             # sticky header: logo + desktop nav + auth + mobile Sheet menu (client)
  contact-form.tsx            # marketing contact form (client)
  auth/
    auth-nav.tsx              # legacy header auth cluster (client) — superseded by site-header
    user-menu.tsx             # logged-in avatar + dropdown (UserMenu, UserAvatar) (client)
    login-form.tsx            # signIn.email (client)
    signup-form.tsx           # signUp.email — captures name/email/password (client)
    sign-out-button.tsx       # signOut (client); accepts className
    google-button.tsx         # signIn.social google (client); shown when isGoogleEnabled
  ui/                         # shadcn components (button, card, accordion, tabs, field, sheet,
                              #   avatar, dropdown-menu, skeleton, spinner, …)
lib/
  auth.ts                     # betterAuth() config + getSafeSession() (server)
  auth-client.ts              # createAuthClient (browser)
  db.ts                       # drizzle + pg Pool
  schema.ts                   # Better Auth tables (user/session/account/verification)
  utils.ts                    # cn()
public/
  logo.jpg                    # brand logo (do not replace with a photo)
  images/                     # section photos (placeholders)
docker-compose.yml            # Postgres 17
drizzle.config.ts             # drizzle-kit config
components.json               # shadcn config
.env / .env.example           # secrets (.env is gitignored)
```

---

## 8. Auth & database

- **Stack:** Better Auth (email+password, `autoSignIn: true`, `minPasswordLength: 8`,
  `nextCookies()` plugin) + **Google OAuth** → Drizzle adapter (`provider: "pg"`) → Postgres.
- **Tables** (`lib/schema.ts`, snake_case columns): `user`, `session`, `account`
  (stores hashed password under `provider_id = 'credential'`, and Google identities under
  `provider_id = 'google'` with access/refresh/id tokens + scope), `verification`.
- **Captured at sign-up:** name, email, password (hashed — verified, never plaintext).
  Google sign-in captures name, email, and avatar (`user.image`) — no schema change needed.
- **Flows:** `/login` Tabs → `authClient.signUp.email` / `signIn.email` → redirect to
  `/dashboard`. Google → `authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })`.
  `/login` and `/dashboard` read the session server-side via **`getSafeSession()`** (`lib/auth.ts`),
  which wraps `auth.api.getSession` in try/catch and returns `null` on DB failure — so an
  unreachable database shows the login form instead of crashing with a Next.js error digest.
- **Logged-in UI:** the header shows an **avatar** (`components/auth/user-menu.tsx`) — Google
  photo (`user.image`) or initials fallback — opening a dropdown with name/email, "My account"
  (`/dashboard`), and "Sign out". The mobile sheet shows a profile row + sign-out.
- **Health check:** `GET /api/auth/ok` → `{ ok: true }`.
- **Verified working end-to-end** (email sign-up persists row, login issues session, wrong
  password → 401; Google social endpoint returns a valid auth URL with the correct callback).

### Google OAuth (`.design/.specs/better_auth.md`)
- Config lives in `lib/auth.ts` under `socialProviders.google` (`prompt: "select_account"`),
  **guarded by `isGoogleEnabled`** — it activates only when both `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are set, so the app still builds/runs on email-password until then.
- UI: `components/auth/google-button.tsx` ("Continue with Google"), shown above the tabs on
  `/login` only when `isGoogleEnabled` is true.
- **To enable:** Google Cloud Console → APIs & Services → Credentials → Create credentials →
  OAuth client ID → **Web application**. Authorized redirect URI:
  `http://localhost:3000/api/auth/callback/google` (prod: `https://<domain>/api/auth/callback/google`).
  Paste Client ID/Secret into `.env`, restart `npm run dev`. The Google button appears automatically.

### Schema changes
After editing `lib/schema.ts` (or adding Better Auth plugins), re-push:
```bash
DATABASE_URL="postgres://tiffany:tiffany_dev_pw@localhost:5432/tiffany_tales" npx drizzle-kit push
```
(For Better Auth plugins, you may also run `npx @better-auth/cli@latest generate` to refresh schema.)

---

## 9. Environment variables (`.env`, gitignored — see `.env.example`)

```
DATABASE_URL=postgres://tiffany:tiffany_dev_pw@localhost:5432/tiffany_tales
BETTER_AUTH_SECRET=<openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=        # empty by default — fill in to enable Google sign-in
GOOGLE_CLIENT_SECRET=    # empty by default — fill in to enable Google sign-in
```
⚠️ The DB password + secret in the repo are **throwaway local-dev values**. Use real
secrets management before deploying. Never commit a real `.env`. Google creds are left
**empty** so nothing sensitive is committed; the Google button stays hidden until they're set.

### Production (Neon Postgres)
- Production uses a **Neon** serverless Postgres (not the local Docker DB). Its URL lives in
  `.env` for reference but the **real production env vars must be set on the host** (Vercel etc.):
  - `DATABASE_URL` → the Neon connection string (`...neon.tech/neondb?sslmode=require`)
  - `BETTER_AUTH_URL` → the **production https domain** (NOT `localhost`) — a wrong value breaks
    OAuth callbacks and cookies
  - `BETTER_AUTH_SECRET` → 32+ char secret
  - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (if Google is used in prod) + add the prod
    redirect URI `https://<domain>/api/auth/callback/google` in Google Cloud Console
- The Neon DB needs the auth tables created once: run `db:push` (or migrate) against the Neon
  `DATABASE_URL`. A deploy will crash on `/login` with a Next.js error digest if the tables
  are missing or the DB is unreachable.
- 🔐 Rotate any DB password that has been shared in plain text.

---

## 10. How to run

```bash
docker compose up -d     # start Postgres (container: tiffany_tales_db, port 5432)
npm install              # if deps not installed
npm run db:push          # create/sync the auth tables (first time / after schema change)
npm run dev              # http://localhost:3000
```
**DB scripts** (drizzle-kit auto-loads `DATABASE_URL` from `.env`):
```bash
npm run db:push      # sync lib/schema.ts -> Postgres (the dev workflow)
npm run db:studio    # open Drizzle Studio (browser GUI for the tables)
npm run db:generate  # generate SQL migration files
npm run db:migrate   # apply generated migration files
```
Quality gates (all currently pass):
```bash
npm run lint
npx tsc --noEmit
npm run build
```
Useful DB peek:
```bash
docker exec tiffany_tales_db psql -U tiffany -d tiffany_tales -c '\dt'
docker exec tiffany_tales_db psql -U tiffany -d tiffany_tales -c 'SELECT name,email,created_at FROM "user";'
```

### Deploying to production
1. Set the production env vars on the host (see §9 — Neon `DATABASE_URL`, `BETTER_AUTH_URL`
   = prod domain, `BETTER_AUTH_SECRET`, Google creds if used).
2. Create the tables in the Neon DB once: `npm run db:push` with `DATABASE_URL` pointing at Neon
   (PowerShell: `$env:DATABASE_URL="<neon-url>"; npm run db:push`).
3. Deploy. `/login` and `/dashboard` read the session server-side via `getSafeSession()`
   (`lib/auth.ts`), which returns `null` instead of throwing if the DB is unreachable — so the
   login form still renders rather than showing a Next.js error digest.

---

## 11. Conventions & gotchas

- **Modified Next.js:** `AGENTS.md` warns this Next.js has breaking changes vs. training
  data. Read the relevant guide in `node_modules/next/dist/docs/` before using unfamiliar
  APIs. `headers()`/`cookies()` are **async**.
- **shadcn rules** (from `.agents/.skills/shadcn`): use semantic colour tokens (not raw
  `bg-purple-500`); `gap-*` not `space-y-*`; `size-*` for square; forms use `Field` +
  `FieldGroup`; Base UI uses the **`render` prop** for link-buttons (NOT Radix `asChild`),
  e.g. `<Button render={<Link href="..." />}>`; icons in buttons use `data-icon`, no size class.
- **Base UI, not Radix** — check component APIs in `components/ui/*` before assuming props.
- `lucide-react@1.18.0` is missing some icons (e.g. `Instagram`) — verify an icon exists
  before importing (`node -e "console.log('X' in require('lucide-react'))"`).
- `ctx7` CLI / find-docs skill: use for any library API question (Better Auth, Next.js,
  Drizzle, Tailwind) — versions move fast.
- **Production crash = DB/env, not code.** A Next.js "ERROR <digits>" on `/login` in prod is an
  error digest — almost always an unreachable DB (`DATABASE_URL` still `localhost`) or missing
  tables in Neon. Fix the env + run `db:push` against Neon; `getSafeSession()` keeps the page
  from hard-crashing meanwhile.
- **Avatar / DropdownMenu / Sheet are Base UI** — trigger composition uses the `render` prop.

---

## 12. Design reference assets (`.design/.specs/`)

- `Pink and Cream Girly Book Review Planner.jpg` — the **colour scheme** source (purple + sage green) and the review-card layout inspiration.
- `WhatsApp Image 2026-06-14 at 12.54.56.jpeg` — the **logo** source (copied to `public/logo.jpg`).
- `www.tiffanystales.com_.2025-11-03T19_57_31.206Z.md` — scraped **real site content** (nav, welcome copy, services, FAQs, testimonial, contact, location). Use this as the canonical copy source.

---

## 13. Suggested next steps

Done recently: mobile hamburger nav, logged-in avatar menu, Google OAuth, `db:*` scripts,
`getSafeSession()` hardening.

- [ ] **Create the auth tables in the Neon production DB** (`db:push` against the Neon URL) and
      set prod env vars — required for production login (see §9–10).
- [ ] **Rotate the Neon DB password** (it was shared in plain text).
- [ ] Wire the **contact form** to a backend (server action → DB table or email).
- [ ] **Email verification** + password reset (Better Auth `emailVerification` / `sendResetPassword`).
- [ ] Real **billing** for the £10/month membership (the original scaffold hinted at Polar).
- [ ] Capture extra sign-up fields (e.g. **preferred pack**) via Better Auth `user.additionalFields`.
- [ ] Replace placeholder Unsplash photos + clip-art logo with **real brand assets** (transparent-PNG logo).
- [ ] Resolve `npm audit` advisories from `drizzle-kit` build-time deps (dev-only).
- [ ] Generate proper Drizzle **migration files** (currently using `push`).

---

## 14. Git

- Branch: `main`, tracks `origin/main` (`github.com/xxxarbel/tiffany-s_tales`).
- Pushed so far: initial build → shadcn + purple/green theme + photos + real content →
  auth/Postgres + benefit photos + design handoff → Google login + avatar menu + mobile nav
  + polish → session-read hardening (`getSafeSession`).
- **Uncommitted at last update:** this DESIGN.md update. Run the `checkpoint` skill
  (`.agents/.skills/checkpoint/SKILL.md`) to lint/type-check/build, commit, and push.
