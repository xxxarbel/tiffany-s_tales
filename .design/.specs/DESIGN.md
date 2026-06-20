# Tiffany's Tales — Design & Build Handoff

> Single source of truth for continuing work after a context reset. Covers the
> brand, design system, page structure, tech stack, auth/DB setup, and how to run.
> Last updated: 2026-06-20.

## 0. Where we are right now (restart anchor)

- **Local dev:** fully working — email/password + Google sign-in, Neon DB.
- **Production (`https://tiffany-s-tales.vercel.app`):** email/password works. Google
  sign-in is **one manual step away**:
  - ✅ Code fixed & deployed — the "Invalid origin" 403 and the localhost `redirect_uri`
    are resolved (`lib/auth.ts` `trustedOrigins` + Vercel-aware `baseURL`; see §8). Production
    now sends `redirect_uri=https://tiffany-s-tales.vercel.app/api/auth/callback/google`.
  - ⛔ **Remaining blocker (only the owner can do this, in Google Cloud Console):** add that
    exact redirect URI to OAuth client **`630431076354-om1jpc03…apps.googleusercontent.com`**
    (the client whose ID is set in Vercel). Until then Google returns `redirect_uri_mismatch`.
- **Registration emails (Resend):** on every sign-up the owner gets a notification and the new
  member gets a welcome (§8). ✅ Admin mail to `arbeling@gmail.com` works; ⚠️ member emails need a
  **verified Resend domain** (test mode only delivers to the account owner). ⚠️ **Committed locally
  (`624460a`) but NOT yet pushed** — so it's not in production until `git push origin main` runs,
  and `RESEND_API_KEY` is added to Vercel's env.
- **Open cleanups:** duplicate `GOOGLE_*` keys in `.env` (§9), rotate the Neon DB password (§9).
- **Verify production OAuth quickly** (no browser needed):
  ```bash
  curl -s -X POST https://tiffany-s-tales.vercel.app/api/auth/sign-in/social \
    -H "Content-Type: application/json" -H "Origin: https://tiffany-s-tales.vercel.app" \
    -d '{"provider":"google","callbackURL":"/dashboard"}'
  # inspect the returned `url` → its client_id and redirect_uri are what Google receives
  ```

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
| Auth | **Better Auth** (^1.6.18) | email + password **and Google OAuth** (now live — see §8), sessions. |
| ORM | **Drizzle ORM** (^0.45.2) + `drizzle-kit` | both workflows available: `push` (dev) and generated **migration files** (`drizzle/`). |
| Database | **Neon serverless Postgres** (active) / **PostgreSQL 17 via Docker** (offline dev) | `.env` `DATABASE_URL` points at Neon; the local Docker DB (`docker-compose.yml`, port 5432) is commented out but still available — see §9. |
| Hosting | **Vercel** | Production at **`https://tiffany-s-tales.vercel.app`**; auto-deploys on push to `main`. Env vars set in the Vercel dashboard (not from `.env`). |
| Email | **Resend** (`resend` SDK) | Registration emails (admin notification + member welcome) via `lib/email.ts`. Needs a verified domain to email non-owner addresses — see §8. |
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
  api/auth/[...all]/route.ts  # Better Auth handler (toNextJsHandler) — serves /api/auth/*
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
  auth.ts                     # betterAuth() config + isGoogleEnabled + getSafeSession() (server)
  auth-client.ts              # createAuthClient (browser)
  db.ts                       # drizzle + pg Pool (connectionString = DATABASE_URL)
  email.ts                    # Resend client + sendRegistrationEmails() (admin + welcome)
  schema.ts                   # Better Auth tables (user/session/account/verification)
  utils.ts                    # cn()
drizzle/
  0000_better_auth_init.sql   # generated migration for the auth tables
  meta/                       # drizzle-kit journal + snapshot
public/
  logo.jpg                    # brand logo (do not replace with a photo)
  images/                     # section photos (placeholders)
docker-compose.yml            # Postgres 17 (local/offline dev only — Neon is the active DB)
drizzle.config.ts             # drizzle-kit config
components.json               # shadcn config
.env / .env.example           # secrets (.env is gitignored — never shipped to Vercel; see §9)
.claude/skills/checkpoint/    # installed "checkpoint" skill (lint+type-check+build, then commit)
.agents/.skills/              # source skills (checkpoint, shadcn, playwright-cli, security-scanner, …)
```

---

## 8. Auth & database

- **Stack:** Better Auth (email+password, `autoSignIn: true`, `minPasswordLength: 8`,
  `nextCookies()` plugin) **+ Google OAuth** → Drizzle adapter (`provider: "pg"`) → Postgres
  (**Neon** in `.env`; local Docker available offline).
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
- **Verified working** (this session): email sign-up persists a row, login issues a session,
  wrong password → 401; **Google social endpoint returns a valid Google auth URL** with the
  correct `client_id`, `redirect_uri` (`/api/auth/callback/google`), `scope=email profile openid`,
  PKCE and `prompt=select_account`.

### Google OAuth (`.design/.specs/better_auth.md`) — **enabled**
- Config lives in `lib/auth.ts` under `socialProviders.google` (`prompt: "select_account"`),
  **guarded by `isGoogleEnabled`** — it activates only when both `GOOGLE_CLIENT_ID` and
  `GOOGLE_CLIENT_SECRET` are set, so the app still builds/runs on email-password until then.
  Both are now set in `.env`, so the button is live locally.
- UI: `components/auth/google-button.tsx` ("Continue with Google"), shown above the tabs on
  `/login` only when `isGoogleEnabled` is true. (Next.js dev **reloads `.env`** on change, so a
  full restart usually isn't needed locally; production needs a redeploy.)

#### `baseURL` + `trustedOrigins` (the production fix — `lib/auth.ts`)
Two Better-Auth concerns broke production sign-in and are now handled in code:
- **`trustedOrigins`** (CSRF/origin whitelist): Better Auth trusts only `baseURL` by default, so
  POSTs from the Vercel domain were rejected with **403 `Invalid origin`**. We now pass an explicit
  list: `http://localhost:3000`, `https://tiffany-s-tales.vercel.app`, and
  `https://tiffany-s-tales-*.vercel.app` (preview deployments).
- **`baseURL` resolution**: Vercel's env had `BETTER_AUTH_URL=http://localhost:3000` left over,
  which made Better Auth build the OAuth `redirect_uri` against **localhost** → Google
  `redirect_uri_mismatch`. The code now derives the URL so a localhost value is *ignored on Vercel*:
  ```ts
  const vercelProductionURL = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined;
  const configuredURL = process.env.BETTER_AUTH_URL;
  const baseURL =
    process.env.VERCEL && (!configuredURL || configuredURL.includes("localhost"))
      ? vercelProductionURL          // on Vercel, never use localhost
      : configuredURL ?? vercelProductionURL;
  ```
  Net effect: locally `baseURL` = `http://localhost:3000`; on Vercel it's the real production
  domain regardless of the stale env var. (Cleaner long-term: also set `BETTER_AUTH_URL` correctly
  in the Vercel dashboard, but the code no longer depends on it.)

- **Remaining setup to complete the round-trip** (these live in Google, not the code):
  - **Google Cloud Console → Credentials → the OAuth client whose ID is set in Vercel
    (`630431076354-om1jpc03…apps.googleusercontent.com`) → Authorized redirect URIs** must
    include — exactly, no trailing slash:
    - `http://localhost:3000/api/auth/callback/google` (local)
    - `https://tiffany-s-tales.vercel.app/api/auth/callback/google` (production)
    Missing/mismatched → Google returns `Error 400: redirect_uri_mismatch`. **This is the current
    production blocker** (see §0).
  - **OAuth consent screen**: while in **Testing** mode, add each tester (e.g. `arbeling@gmail.com`)
    under **Test users**, or Google blocks sign-in ("access blocked / app not verified").
  - ⚠️ Two Google OAuth clients are floating around (`…1rgqosoo…` and `…om1jpc03…`). Production
    uses **`…om1jpc03…`** — register redirect URIs on *that* one and keep `.env`/Vercel consistent.

### Registration emails (Resend) — `lib/email.ts`
- On every new registration (email/password **and** Google), Better Auth's
  `databaseHooks.user.create.after` calls `sendRegistrationEmails({ name, email })`, which sends:
  1. an **admin notification** to `ADMIN_EMAIL` (default `arbeling@gmail.com`), and
  2. a **welcome email** to the new member.
- Failure-tolerant: `Promise.allSettled` + a no-op when `RESEND_API_KEY` is unset, so a mail error
  is logged but **never breaks sign-up**. Sends are awaited (not fire-and-forget) so they aren't
  dropped when a serverless function freezes after responding.
- ⚠️ **Domain limitation.** From defaults to `onboarding@resend.dev`; in Resend test mode (no
  verified domain) mail only delivers to the **account owner** (`arbeling@gmail.com`). So the admin
  notification works now, but **member welcomes are rejected until a domain is verified**. To
  enable: verify a domain at <https://resend.com/domains>, then set
  `RESEND_FROM="Tiffany's Tales <hello@yourdomain>"` (locally and in Vercel).
- Env: `RESEND_API_KEY` (required to send), `ADMIN_EMAIL` (optional), `RESEND_FROM` (optional).

### Schema changes
After editing `lib/schema.ts` (or adding Better Auth plugins), re-sync:
```bash
npm run db:push        # drizzle-kit auto-loads DATABASE_URL from .env (pushes to whatever it points at)
npm run db:generate    # OR generate a migration file into drizzle/
npm run db:migrate     # then apply generated migrations
```
(For Better Auth plugins, you may also run `npx @better-auth/cli@latest generate` to refresh schema.)

---

## 9. Environment variables (`.env`, gitignored — see `.env.example`)

```
# Local Postgres (docker-compose.yml) — commented out; uncomment to dev offline
# DATABASE_URL=postgres://tiffany:tiffany_dev_pw@localhost:5432/tiffany_tales

# Neon serverless Postgres — the ACTIVE database
DATABASE_URL=postgresql://<neon-user>:<pw>@<endpoint>-pooler.<region>.aws.neon.tech/neondb?sslmode=require

BETTER_AUTH_SECRET=<32+ char secret>
BETTER_AUTH_URL=http://localhost:3000          # prod: https://<prod-domain>
GOOGLE_CLIENT_ID=<google web client id>        # set → enables Google sign-in
GOOGLE_CLIENT_SECRET=<google web client secret>
```

- **Which DB is live is decided here.** `.env` currently points `DATABASE_URL` at **Neon**, so
  even `npm run dev` talks to Neon. To develop against the local Docker DB instead, **uncomment
  the local line and comment out the Neon line**, then restart the dev server.
- ⚠️ **Throwaway local-dev values.** The DB password + secret in the file are local-dev only —
  use real secrets management before relying on them. **Rotate any DB password shared in plain
  text** (the Neon password has been). Never commit a real `.env`.
- ⚠️ **No duplicate keys.** `.env` files are last-value-wins — if `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` appear more than once, only the **last** pair is used. Keep a single
  active pair (use separate dev vs prod **OAuth clients** if you want, but set them per
  environment, not stacked in one file).

### Production (Neon + Vercel)
**`.env` is gitignored and is NEVER shipped to Vercel.** Vercel only gets the variables you set
in its dashboard, so the deployed app fails (e.g. *tables exist on Neon but signups don't insert*)
when they're missing. Set, in **Vercel → Settings → Environment Variables (Production)**:
- `DATABASE_URL` → the Neon connection string (`...neon.tech/neondb?sslmode=require`)
- `BETTER_AUTH_SECRET` → 32+ char secret. **Required in production** — Better Auth *throws* if
  it's unset, so every signup/login fails before touching the DB.
- `BETTER_AUTH_URL` → ideally the **production https domain** (NOT `localhost`). ⚠️ A leftover
  `http://localhost:3000` here is what broke production Google sign-in (localhost `redirect_uri`).
  `lib/auth.ts` now **overrides a localhost/unset value on Vercel** (using
  `VERCEL_PROJECT_PRODUCTION_URL`), so the deploy works even if this is wrong — but setting it
  correctly is still cleaner.
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (prod uses the `…om1jpc03…` client) + add the prod
  redirect URI `https://tiffany-s-tales.vercel.app/api/auth/callback/google` in Google Cloud Console.
- `RESEND_API_KEY` (+ optional `ADMIN_EMAIL`, `RESEND_FROM`) for registration emails — otherwise
  the deployed app silently skips them. ⚠️ `.env.example` is also gitignored (`.env*`), so these
  vars aren't in the repo template — copy them from a teammate or the dashboard.

Then **redeploy** — Vercel only applies env-var changes to a *new* deployment. (Preview
deployments have changing URLs; add them to a `trustedOrigins` array in `lib/auth.ts` if you test
auth on previews.) The Neon DB needs the auth tables created once (`db:push`/`db:migrate` against
the Neon `DATABASE_URL`).

---

## 10. How to run

```bash
# Neon is the active DB by default, so docker is only needed for offline/local dev:
docker compose up -d     # (optional) start local Postgres (container: tiffany_tales_db, port 5432)
npm install              # if deps not installed
npm run db:push          # create/sync the auth tables (first time / after schema change)
npm run dev              # http://localhost:3000  (uses whatever DATABASE_URL points at — Neon by default)
```
**DB scripts** (drizzle-kit auto-loads `DATABASE_URL` from `.env`):
```bash
npm run db:push      # sync lib/schema.ts -> DB (the dev workflow)
npm run db:studio    # open Drizzle Studio (browser GUI for the tables)
npm run db:generate  # generate SQL migration files into drizzle/
npm run db:migrate   # apply generated migration files
```
Quality gates (all currently pass):
```bash
npm run lint
npx tsc --noEmit
npm run build
```
Useful DB peek (local Docker DB):
```bash
docker exec tiffany_tales_db psql -U tiffany -d tiffany_tales -c '\dt'
docker exec tiffany_tales_db psql -U tiffany -d tiffany_tales -c 'SELECT name,email,created_at FROM "user";'
```
For Neon, query via any pg client using the Neon `DATABASE_URL`.

### Deploying to production
1. Set the production env vars in the **Vercel dashboard** (see §9 — Neon `DATABASE_URL`,
   `BETTER_AUTH_URL` = prod domain, `BETTER_AUTH_SECRET`, Google creds if used). They are NOT
   taken from the committed repo because `.env` is gitignored.
2. Create the tables in the Neon DB once: `npm run db:push` with `DATABASE_URL` pointing at Neon
   (PowerShell: `$env:DATABASE_URL="<neon-url>"; npm run db:push`).
3. Deploy / redeploy. `/login` and `/dashboard` read the session via `getSafeSession()`
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
  (Avatar / DropdownMenu / Sheet are Base UI — trigger composition uses the `render` prop.)
- `lucide-react@1.18.0` is missing some icons (e.g. `Instagram`) — verify an icon exists
  before importing (`node -e "console.log('X' in require('lucide-react'))"`).
- `ctx7` CLI / find-docs skill: use for any library API question (Better Auth, Next.js,
  Drizzle, Tailwind) — versions move fast.
- **`.env` decides the DB and is never deployed.** Locally it points at Neon by default; flip the
  commented lines for the local Docker DB. On Vercel the vars come from the dashboard, not the repo.
- **Production auth failures = env, not code.** A Next.js "ERROR <digits>" on `/login`, or
  *signups that never insert despite the tables existing*, almost always means a missing/wrong
  Vercel env var (`BETTER_AUTH_SECRET` unset → Better Auth throws; `BETTER_AUTH_URL` still
  `localhost` → origin/cookie failure; `DATABASE_URL` missing). Set them + redeploy;
  `getSafeSession()` keeps the page from hard-crashing meanwhile.
- **Better Auth `403 Invalid origin`** on a deployed POST → the request origin isn't in
  `trustedOrigins` (which defaults to just `baseURL`). Fix in `lib/auth.ts` `trustedOrigins`
  (already covers localhost + `*.vercel.app` for this project). See §8.
- **Google `Error 400: redirect_uri_mismatch`** → the `redirect_uri` the app sends ≠ any URI
  registered on that OAuth client. Two causes: (a) app sending the wrong URL (localhost in prod —
  now fixed by the `baseURL` logic in §8), or (b) the correct prod URI not yet registered in
  Google Console (the manual step). **Diagnose by reading exactly what's sent** with the curl in §0.
- **Checkpoint skill** installed at `.claude/skills/checkpoint/` — say "checkpoint" / `/checkpoint`
  to lint + type-check + build, then commit everything (skips `.env`); it does **not** push.
  (Skills load at session start, so it appears after a restart.)

---

## 12. Design reference assets (`.design/.specs/`)

- `Pink and Cream Girly Book Review Planner.jpg` — the **colour scheme** source (purple + sage green) and the review-card layout inspiration.
- `WhatsApp Image 2026-06-14 at 12.54.56.jpeg` — the **logo** source (copied to `public/logo.jpg`).
- `www.tiffanystales.com_.2025-11-03T19_57_31.206Z.md` — scraped **real site content** (nav, welcome copy, services, FAQs, testimonial, contact, location). Use this as the canonical copy source.
- `better_auth.md` — Better Auth Google provider reference.

---

## 13. Suggested next steps

Done recently: mobile hamburger nav, logged-in avatar menu, `db:*` scripts, `getSafeSession()`
hardening, Drizzle migration files, switched the active DB to **Neon**, **Google OAuth wired up**,
and the **production auth fixes** (`trustedOrigins` + Vercel-aware `baseURL`) deployed to Vercel.

- [ ] **🔴 Register the prod redirect URI in Google Console** — add
      `https://tiffany-s-tales.vercel.app/api/auth/callback/google` to OAuth client
      `…om1jpc03…`, and ensure test users / consent screen are set (§8). **This is the only thing
      left for production Google sign-in** (see §0).
- [ ] **Verify a Resend domain** so member welcome emails deliver (only the owner gets them in test
      mode), then set `RESEND_FROM` locally + in Vercel; also add `RESEND_API_KEY` to Vercel (§8).
- [ ] **Tidy `.env`**: remove the duplicate `GOOGLE_*` keys so only one active pair remains (§9).
- [ ] (Optional) Set `BETTER_AUTH_URL=https://tiffany-s-tales.vercel.app` in the Vercel dashboard
      so the env matches the code (the code already compensates for a stale localhost value).
- [ ] **Rotate the Neon DB password** (it was shared in plain text).
- [ ] Wire the **contact form** to a backend (server action → DB table or email).
- [ ] **Email verification** + password reset (Better Auth `emailVerification` / `sendResetPassword`).
- [ ] Real **billing** for the £10/month membership (the original scaffold hinted at Polar).
- [ ] Capture extra sign-up fields (e.g. **preferred pack**) via Better Auth `user.additionalFields`.
- [ ] Replace placeholder Unsplash photos + clip-art logo with **real brand assets** (transparent-PNG logo).
- [ ] Resolve `npm audit` advisories from `drizzle-kit` build-time deps (dev-only).

---

## 14. Git

- Branch: `main`, tracks `origin/main` (`github.com/xxxarbel/tiffany-s_tales`). Vercel
  auto-deploys every push to `main`.
- Recent history (newest last): … → session-read hardening (`getSafeSession`) → Drizzle auth
  migration + Neon production setup (`d0d9940`) → DESIGN.md refresh + checkpoint skill (`2f3177e`)
  → **trust Vercel origins** (`8cfed12`) → **force production base URL on Vercel** (`ad5cb21`)
  → **Resend registration emails** (`624460a`).
- **State now:** `HEAD` = `624460a` on `main`; working tree clean. **`origin/main` is at `ad5cb21`,
  so `624460a` (Resend emails + docs) is committed locally but UNPUSHED** — production therefore
  does *not* yet have the email feature. Run `git push origin main` to deploy it (and add
  `RESEND_API_KEY` to Vercel first, or prod sign-ups silently skip the emails).
- ⚠️ `.env` is gitignored (and holds live secrets) — keep it that way. `checkpoint` commits but
  does **not** push.
