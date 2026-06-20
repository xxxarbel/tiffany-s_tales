# Tiffany's Tales — Design & Build Handoff

> Single source of truth for continuing work after a context reset. Covers the
> brand, design system, page structure, tech stack, auth/DB setup, the admin
> area, and how to run.
> Last updated: 2026-06-20.

## 0. Where we are right now (restart anchor)

- **Code state:** `HEAD` = `503b85a` on `main`, **pushed to `origin/main` and deployed to
  Vercel**. Working tree clean (only `.env` differs locally, and it's gitignored).
- **The app is now multi-page** (not one scrolling page): a `(marketing)` route group with
  real routes (`/`, `/about`, `/benefits`, `/reviews`, `/contact`) plus `/login`, `/dashboard`,
  `/profile`, and an admin area at `/admin`. The header nav are **route tabs** (§6).
- **Auth:** email/password **with required email verification** + **Google OAuth**
  (with trusted account-linking). See §8.
- **Admin area** (`/admin`, owner only): list users, remove / pause (reversible ban) / promote
  them, and edit the app's email addresses at runtime. Built on Better Auth's **admin plugin**.
  `arbeling@gmail.com` is auto-granted the admin role. See §8a.
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
| Icons | `lucide-react` (^1.18.0) | ⚠️ Does NOT export `Instagram` — inline SVG used in the footer. Verify an icon exists before importing. |
| Toasts | `sonner` | `<Toaster />` in `app/layout.tsx`. |
| Auth | **Better Auth** (^1.6.18) | email+password (**verification required**) + **Google OAuth** + **admin plugin**. See §8. |
| ORM | **Drizzle ORM** (^0.45.2) + `drizzle-kit` | `push` (dev) and generated **migration files** (`drizzle/`). |
| Database | **Postgres 17 via Docker** (active for local dev) / **Neon serverless Postgres** (production) | `.env` `DATABASE_URL` currently = local Docker; Neon is used in prod via Vercel env. See §9. |
| Hosting | **Vercel** | Prod at **`https://tiffany-s-tales.vercel.app`**; auto-deploys on push to `main`. Env vars set in the Vercel dashboard. |
| Email | **Resend** (`resend` SDK) | Verification, welcome, admin-notification, and contact emails via `lib/email.ts`. Addresses are runtime-editable (§8b). Needs a verified domain to email non-owner addresses. |
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
whose layout (`app/(marketing)/layout.tsx`) provides the **`SiteHeader` + `SiteFooter`**.
Clicking a nav tab navigates to a real page (no more scroll-to-anchor).

**Marketing routes** (`(marketing)` group):
1. **`/`** (Home) — Hero (logo medallion, "Join my pack today!" → `/login`) + "Find Your Pack"
   (Sittingbourne & Maidstone cards) + Book of the Month panel. ⚠️ "Pamper Night" was removed — don't re-add.
2. **`/about`** — "Your literary sanctuary" + FAQ accordion (monthly + Discord; suggestions; £10/month).
3. **`/benefits`** — 3 photo cards (Real Connection / Lively Discussion / A Fresh Story).
4. **`/reviews`** — purple testimonial quote card + planner-style 5-star review card.
5. **`/contact`** — `<ContactForm />`, **wired to actually send** (server action → Resend) to the
   configured contact recipient, reply-to = sender, optional "send me a copy". See §8b.

**Auth/member routes** (standalone, outside the group):
- **`/login`** — Tabs: Subscribe | Log in, + "Continue with Google" (when `isGoogleEnabled`).
  Redirects to `/dashboard` if already authed.
- **`/dashboard`** — protected member home: welcome + stat cards (member since, membership, pack)
  + Book of the Month + next meet-up.
- **`/profile`** — protected: editable name + photo (`authClient.updateUser`), read-only account
  info (email + verified badge, member since, linked sign-in providers).
- **`/admin`** — owner-only (see §8a).

**Header nav** (`components/site-header.tsx`, client, route-based active state via `usePathname`):
- Always: Home · About · Book Club Benefits · Book Reviews · Contact.
- When signed in: **Dashboard · Profile** (and **Admin** when `role === "admin"`), plus the avatar
  `UserMenu`. Logged out: Log in / Join my pack. Mobile = `Sheet` with the same links.

---

## 7. File map

```
app/
  globals.css                       # Tailwind v4 theme + colour tokens (EDIT COLOURS HERE)
  layout.tsx                        # fonts, metadata, <Toaster /> (root layout)
  (marketing)/
    layout.tsx                      # SiteHeader + children + SiteFooter
    page.tsx                        # Home (hero + packs + book of the month)
    about/page.tsx                  # About + FAQ
    benefits/page.tsx               # Benefits cards
    reviews/page.tsx                # Testimonial + review card
    contact/page.tsx                # Contact page
    contact/actions.ts              # "use server" submitContact -> sendContactEmail
  login/page.tsx                    # /login — Tabs + Google (redirects if authed)
  dashboard/page.tsx                # /dashboard — protected member home
  profile/page.tsx                  # /profile — protected; editable profile + account info
  admin/page.tsx                    # /admin — requireAdmin(); users + email settings
  admin/actions.ts                  # "use server" updateSettingsAction (admin-guarded)
  api/auth/[...all]/route.ts        # Better Auth handler (serves /api/auth/* incl. /admin/*)
components/
  site-header.tsx                   # sticky header: route tabs + auth + mobile Sheet (client)
  site-footer.tsx                   # deep-plum footer (logo, explore links, Instagram)
  logo.tsx                          # shared Logo (next/image)
  contact-form.tsx                  # contact form (client) -> submitContact server action
  admin/
    admin-panel.tsx                 # Tabs: Users | Email settings (client)
    admin-users-table.tsx           # user table + per-row actions + confirm AlertDialog (client)
    admin-settings-form.tsx         # edit the 3 email addresses (client)
  auth/
    user-menu.tsx                   # avatar + dropdown (Dashboard/Profile/Sign out) (client)
    login-form.tsx                  # signIn.email; handles 403 unverified (client)
    signup-form.tsx                 # signUp.email; shows "check your email" (client)
    profile-form.tsx                # authClient.updateUser name/image (client)
    sign-out-button.tsx             # signOut (client)
    google-button.tsx               # signIn.social google (client)
    auth-nav.tsx                    # LEGACY — superseded by site-header (unused)
  ui/                               # shadcn/Base UI: button card accordion badge textarea label
                                    #   separator sonner field checkbox tabs spinner skeleton sheet
                                    #   avatar dropdown-menu input table alert-dialog
lib/
  auth.ts                           # betterAuth() + admin plugin + ADMIN_EMAIL + getSafeSession()
  admin.ts                          # requireAdmin() guard + isAdmin()
  auth-client.ts                    # createAuthClient({ plugins: [adminClient()] })
  db.ts                             # drizzle + pg Pool (connectionString = DATABASE_URL)
  email.ts                          # Resend: verification / welcome / admin-notice / contact emails
  settings.ts                       # app_settings get/update (runtime email config, env fallback)
  schema.ts                         # Better Auth tables + admin columns + app_settings
  utils.ts                          # cn()
scripts/
  seed-admin.mjs                    # promote an existing owner row to admin (npm run db:seed-admin)
drizzle/
  0000_better_auth_init.sql         # base auth tables
  0001_tough_firedrake.sql          # admin columns + app_settings
  meta/                             # drizzle-kit journal + snapshots
public/  logo.jpg, images/          # brand logo (don't replace) + section photos (placeholders)
docker-compose.yml                  # Postgres 17 (local dev DB — container tiffany_tales_db:5432)
drizzle.config.ts  components.json  .env / .env.example
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
  column + `getSettings()`. Renders `AdminPanel` (Tabs: **Users** | **Email settings**).
  - **Users tab:** table (member, provider, joined, role, status) + per-row dropdown → confirm
    `AlertDialog` → **Make/Revoke admin** (`setRole`), **Pause/Resume** (`banUser`/`unbanUser` —
    reversible, indefinite), **Remove** (`removeUser`). Own-row Pause/Remove disabled. Mutations
    `router.refresh()` to re-fetch.
  - **Email settings tab:** edits the 3 addresses (§8b) via an admin-guarded server action.

### 8b. Runtime-editable email settings (`lib/settings.ts` + `lib/email.ts`)
- `lib/settings.ts`: `getSettings()` / `updateSettings()` over `app_settings`. Read on each call
  (small PK select), DB value **?? env fallback ?? default**, wrapped in try/catch so a DB error
  falls back to env and never breaks email. Three settings:
  - `emailFrom` ← DB ?? `RESEND_FROM` ?? `"Tiffany's Tales <onboarding@resend.dev>"`
  - `adminNotificationRecipient` ← DB ?? `ADMIN_EMAIL` ?? `arbeling@gmail.com`
  - `contactRecipient` ← DB ?? `CONTACT_EMAIL` ?? `adminNotificationRecipient`
- `lib/email.ts` reads these **per send** (no module-load constants). Functions: `sendVerificationEmail`,
  `sendRegistrationEmails` (admin notice + member welcome), `sendContactEmail` (to contact recipient,
  reply-to = sender, optional copy). All never throw; no-op when `RESEND_API_KEY` is unset.
- ⚠️ **Resend domain limitation** (unchanged): in test mode (no verified domain, from
  `onboarding@resend.dev`) Resend only delivers to the **account owner** (`arbeling@gmail.com`).
  Member welcomes / verification to other addresses are **rejected (403)** until a domain is verified
  at <https://resend.com/domains> and `RESEND_FROM` (or the admin "From address") is set to it.

### 8c. Schema changes & migrations
- Local Docker DB: edit `lib/schema.ts`, then `npm run db:push` (diffs and applies; the dev workflow).
- Generated migrations live in `drizzle/` (`0000` base, `0001` admin columns + `app_settings`).
- **Neon (production) has been migrated** to the admin schema. Because Neon already had the base
  tables (and a partial `role`/`banned` from earlier), the `0001` changes were applied as
  idempotent `ALTER TABLE … ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS` SQL run
  directly against the Neon `DATABASE_URL` (not via `drizzle-kit migrate`, which would have tripped
  on the existing base tables). `public.user` now has role/banned/ban_reason/ban_expires,
  `public.session` has impersonated_by, and `public.app_settings` exists.
  - ℹ️ Neon also has a built-in **`neon_auth` schema** with its own `user` table — unrelated to
    this app, which uses **`public`**. Don't be confused by it when querying.

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
- Then **redeploy** (Vercel applies env changes only to a new deployment).

---

## 10. How to run

```bash
docker compose up -d     # start local Postgres (container tiffany_tales_db, port 5432)
npm install              # if deps not installed
npm run db:push          # sync lib/schema.ts -> local DB (first time / after schema change)
npm run db:seed-admin    # (optional) promote an existing arbeling@gmail.com row to admin
npm run dev              # http://localhost:3000  (uses local Docker DB per .env)
```
**DB scripts** (drizzle-kit auto-loads `DATABASE_URL` from `.env`):
```bash
npm run db:push       # sync schema -> DB (dev workflow)
npm run db:studio     # Drizzle Studio GUI
npm run db:generate   # generate SQL migration files
npm run db:migrate    # apply generated migrations
npm run db:seed-admin # node --env-file=.env scripts/seed-admin.mjs (promote owner to admin)
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
1. Ensure Vercel env vars are set (§9). 2. Ensure Neon has the current schema (it does — §8c; for
future schema changes apply them to Neon too, e.g. `IF NOT EXISTS` SQL or `db:push` against the
Neon URL). 3. `git push origin main` → Vercel auto-builds & deploys.

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
  `node -e "console.log('X' in require('lucide-react'))"`.
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
- **Admin schema needs both DBs.** Any new admin/schema column must be applied to **both** the local
  Docker DB and Neon, or the side that's missing it will 500 on session reads.
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

---

## 13. Suggested next steps

Done recently: **multi-page restructure** (route tabs), **dashboard + profile pages**, **required
email verification** (Resend), **Google account linking**, the **admin area** (users +
runtime-editable email settings), **contact form wired to send**, local DB switched to **Docker**,
**Neon migrated** to the admin schema, and all of it **deployed to Vercel** (`503b85a`).

- [ ] **Verify a Resend domain** so member welcome + verification emails deliver to non-owner
      addresses, then set `RESEND_FROM` (or the admin "From address") + add `RESEND_API_KEY` to Vercel (§8b).
- [ ] **Rotate the Neon DB password** (shared in plain text).
- [ ] (Optional) Set `BETTER_AUTH_URL=https://tiffany-s-tales.vercel.app` in Vercel so env matches code.
- [ ] **Password reset** (Better Auth `sendResetPassword`).
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
- Recent history (newest last): … → Resend registration emails (`624460a`) → **member dashboard +
  profile pages** (`2285385`) → **admin area + multi-page split + email verification** (`503b85a`).
- **State now:** `HEAD` = `503b85a` on `main`, **pushed and deployed**. Working tree clean (only the
  gitignored `.env`, which points at the local Docker DB, differs).
- ⚠️ `.env` is gitignored and holds live secrets — keep it that way. `checkpoint` commits but does **not** push.
```
