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
  contact-form.tsx            # marketing contact form (client)
  auth/
    auth-nav.tsx              # header session state (client, useSession)
    login-form.tsx            # signIn.email (client)
    signup-form.tsx           # signUp.email — captures name/email/password (client)
    sign-out-button.tsx       # signOut (client)
  ui/                         # shadcn components (button, card, accordion, tabs, field, …)
lib/
  auth.ts                     # betterAuth() config (server)
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
  `nextCookies()` plugin) → Drizzle adapter (`provider: "pg"`) → Postgres.
- **Tables** (`lib/schema.ts`, snake_case columns): `user`, `session`, `account`
  (stores hashed password under `provider_id = 'credential'`), `verification`.
- **Captured at sign-up:** name, email, password (hashed — verified, never plaintext).
- **Flows:** `/login` Tabs → `authClient.signUp.email` / `signIn.email` → redirect to
  `/dashboard`. `/dashboard` reads session server-side via
  `auth.api.getSession({ headers: await headers() })` and redirects to `/login` if absent.
- **Health check:** `GET /api/auth/ok` → `{ ok: true }`.
- **Verified working end-to-end** (sign-up persists row, login issues session, wrong
  password → 401).

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
```
⚠️ The DB password + secret in the repo are **throwaway local-dev values**. Use real
secrets management before deploying. Never commit a real `.env`.

---

## 10. How to run

```bash
docker compose up -d     # start Postgres (container: tiffany_tales_db, port 5432)
npm install              # if deps not installed
# first time / after schema change:
DATABASE_URL="postgres://tiffany:tiffany_dev_pw@localhost:5432/tiffany_tales" npx drizzle-kit push
npm run dev              # http://localhost:3000
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

---

## 12. Design reference assets (`.design/.specs/`)

- `Pink and Cream Girly Book Review Planner.jpg` — the **colour scheme** source (purple + sage green) and the review-card layout inspiration.
- `WhatsApp Image 2026-06-14 at 12.54.56.jpeg` — the **logo** source (copied to `public/logo.jpg`).
- `www.tiffanystales.com_.2025-11-03T19_57_31.206Z.md` — scraped **real site content** (nav, welcome copy, services, FAQs, testimonial, contact, location). Use this as the canonical copy source.

---

## 13. Suggested next steps (not yet done)

- [ ] Wire the **contact form** to a backend (server action → DB table or email).
- [ ] **Email verification** + password reset (Better Auth `emailVerification` / `sendResetPassword`).
- [ ] Real **billing** for the £10/month membership (the original scaffold hinted at Polar).
- [ ] Capture extra sign-up fields (e.g. **preferred pack**) via Better Auth `user.additionalFields`.
- [ ] Replace placeholder Unsplash photos + clip-art logo with **real brand assets** (transparent-PNG logo).
- [ ] Mobile nav (hamburger) — current nav hides links under `lg`.
- [ ] Resolve `npm audit` advisories from `drizzle-kit` build-time deps (dev-only).
- [ ] Generate proper Drizzle **migration files** (currently using `push`).

---

## 14. Git

- Branch: `master`. Commits so far: initial build → shadcn + purple/green theme + photos + real content.
- The auth/DB feature (this batch) is **not yet committed** — run the `checkpoint` skill
  (`.agents/.skills/checkpoint/SKILL.md`) to lint/type-check/build and commit.
