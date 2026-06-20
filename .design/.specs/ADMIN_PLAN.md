# Admin area for Tiffany's Tales — Implementation Plan

> Plan for a role-gated admin area: user management + runtime-editable email
> addresses, built on Better Auth's official `admin` plugin. Status: **proposed,
> not yet implemented**. Last updated: 2026-06-20.

## Context

The owner (`arbeling@gmail.com`) needs an admin area that the rest of the
membership can't see. Today there is **no concept of roles** — every signed-in
user is equal — and the app's operational email addresses (contact recipient,
the "from" on verification/welcome mail, the admin-notification recipient) are
**hard-coded env vars read once at module load**, so they can't be changed
without a redeploy. The contact form is a **no-op** (it only toasts).

This change adds a role-gated `/admin` area where the owner can: see every user
and their details, remove / pause (reversible) / promote-demote users, and edit
the three app email addresses at runtime. It also wires the contact form to
actually email the configured recipient.

Foundation: **Better Auth `^1.6.18` ships an official `admin` plugin**
(`better-auth/plugins/admin`) that auto-serves `/api/auth/admin/*` endpoints
(listUsers, setRole, banUser, unbanUser, removeUser, …). We build on it rather
than hand-rolling. Runtime-editable settings need a new DB table since none
exists.

### Confirmed decisions
- **Contact form**: wire it to actually send to the configured contact recipient (reply-to = sender).
- **Pause** = Better Auth ban, **reversible, indefinite** (manual resume). No timed expiry.
- **Editable emails**: all three — contact recipient, verification/welcome `from`, admin-notification recipient.

---

## Implementation (ordered)

### 1. Schema — `lib/schema.ts`
Add admin-plugin columns (all nullable so existing rows are unaffected; snake_case DB names):
- `user`: `role text`, `banned boolean`, `ban_reason text`, `ban_expires timestamp`
- `session`: `impersonated_by text`

Add a key/value settings table and export it in `schema`:
- `app_settings`: `key text primary key`, `value text`, `updated_at timestamp not null`

### 2. Migration — apply to BOTH databases
Repo uses tracked migrations, so: `npm run db:generate` → review the `0001_*.sql`
(only `ALTER TABLE … ADD COLUMN`, all nullable, + `CREATE TABLE app_settings`;
nothing destructive) → `npm run db:migrate` against **local**, then again with
`DATABASE_URL` pointed at **Neon** (prod). Missing columns in either DB = 500s on
sign-in. (`.env` currently points at Neon by default — see DESIGN §9.)

### 3. Auth server — `lib/auth.ts`
- Register the plugin **before `nextCookies()`** (nextCookies must stay last):
  `admin({ defaultRole: "user", adminRoles: ["admin"] })`.
- Keep a configurable `const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "arbeling@gmail.com"` (deterministic at module load — auth must not depend on a DB read that can fail).
- **Bootstrap admin by email**: add `databaseHooks.user.create.before` that stamps `role: "admin"` when `user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()` (the `role` field is `input:false`, so only a server hook can set it). Leave the existing `create.after` (registration emails) untouched.
- Add a guard helper (new `lib/admin.ts` or in `auth.ts`): `requireAdmin()` → `getSafeSession()`; redirect `/login` if no session, redirect `/dashboard` if `session.user.role !== "admin"`; returns the session. **This is the real protection** (header link is cosmetic).

### 4. Bootstrap the EXISTING owner row
`create.before` won't fire for the already-existing `arbeling@gmail.com`. Add
`scripts/seed-admin.ts` (drizzle `update` set role=admin where lower(email)=ADMIN_EMAIL,
idempotent) + a `db:seed-admin` npm script. Run once against local and once
against Neon. (SQL equivalent: `UPDATE "user" SET role='admin' WHERE lower(email)=lower('arbeling@gmail.com');`)

### 5. Auth client — `lib/auth-client.ts`
`createAuthClient({ plugins: [adminClient()] })` (from `better-auth/client/plugins`).
Exposes `authClient.admin.*` and surfaces `role` on `useSession()`.

### 6. Settings store + email refactor
- New `lib/settings.ts`: `getSettings()` / `updateSettings(partial)` over `app_settings`, with a process-local cache busted on write, and **env fallback wrapped in try/catch** (mirror `getSafeSession` — never let a DB error break email). Keys + fallbacks:
  - `emailFrom` ← DB ?? `RESEND_FROM` ?? `"Tiffany's Tales <onboarding@resend.dev>"`
  - `adminNotificationRecipient` ← DB ?? `ADMIN_EMAIL` ?? `"arbeling@gmail.com"`
  - `contactRecipient` ← DB ?? `CONTACT_EMAIL` ?? `adminNotificationRecipient`
- Refactor `lib/email.ts`: remove the module-load `FROM`/`ADMIN_EMAIL` constants; each function does `const s = await getSettings()` instead. `sendRegistrationEmails` and `sendVerificationEmail` are already `async` and already awaited in `auth.ts`, so **no caller changes**. Add `sendContactEmail({ name, email, message, sendCopy })` → to `contactRecipient`, `from: emailFrom`, `replyTo: email`, optional copy to sender; same never-throws / no-op-without-`RESEND_API_KEY` pattern.

### 7. Contact form wiring
- New server action `app/(marketing)/contact/actions.ts` (`"use server"`, public): validate name/email/message, call `sendContactEmail`, return `{ ok, error? }`.
- `components/contact-form.tsx` stays client: submit via the action, toast on `ok`, pass the existing "Send me a copy" checkbox as `sendCopy`. Keep Field/FieldGroup structure. (Read `node_modules/next/dist/docs/` for 16.2.9 Server Action conventions first — modified Next.js.)

### 8. UI primitives
Add `table` and `alert-dialog` via `npx shadcn@latest add table alert-dialog`.
**Verify they pull Base UI** (style is `base-nova`, stack is `@base-ui/react`, NOT
Radix — like the existing sheet/dropdown-menu). `table` is plain styled markup
(safe). If `alert-dialog` comes through as Radix, hand-author a thin Base UI
wrapper matching conventions (`render` prop not `asChild`, semantic tokens,
`data-icon` on button icons, `gap-*`). `select`/`switch` not needed — buttons +
alert-dialog + text inputs cover everything.

### 9. Admin route — `app/admin/page.tsx` (server)
- `await requireAdmin()`; render `<SiteHeader />` (same pattern as dashboard/profile).
- SSR-fetch users via `auth.api.listUsers({ headers: await headers() })`, plus an
  `account` join mapping `userId → providerId[]` for a Provider column (listUsers
  returns user rows only). Load `getSettings()`. Pass both to a client component.
- Client `components/admin/admin-panel.tsx` with existing `Tabs`: **Users** and **Email settings**.
  - **Users tab** (`admin-users-table.tsx`): table of name, email, verified (badge),
    created, provider, role, banned. Per-row actions behind `alert-dialog`:
    Remove (`admin.removeUser`), Pause/Resume (`admin.banUser` / `admin.unbanUser`),
    Make/Revoke admin (`admin.setRole` admin↔user). Disable Pause+Remove on the
    current user's **own** row (compare `id`); the plugin also blocks self-ban/delete
    server-side. Toast + refetch after each.
  - **Email settings tab** (`admin-settings-form.tsx`): Field/FieldGroup + Input for
    the three addresses; submit to a `"use server"` `updateSettingsAction` that calls
    `requireAdmin()` inside, validates email format, `updateSettings`, busts cache.

### 10. Header — `components/site-header.tsx`
`useSession()` now exposes `role`. Compute `isAdmin = session?.user?.role === "admin"`
and add an **Admin** link (lucide `ShieldCheck`) to the account-links block
(desktop nav + mobile Sheet) only when `isAdmin`, following the existing
`accountLinks.map` + active-state pattern.

### 11. Env / docs
Add `CONTACT_EMAIL` (new fallback) to `.env`/`.env.example`; `ADMIN_EMAIL` and
`RESEND_FROM` already exist. Note that DB `app_settings`, once set, override these
at runtime.

---

## Files

**Create**: `lib/settings.ts`, `lib/admin.ts` (or guard in `auth.ts`), `scripts/seed-admin.ts`,
`app/admin/page.tsx`, `app/(marketing)/contact/actions.ts`,
`components/admin/admin-panel.tsx`, `components/admin/admin-users-table.tsx`,
`components/admin/admin-settings-form.tsx`, `components/ui/table.tsx`,
`components/ui/alert-dialog.tsx`, `drizzle/0001_*.sql` (+ meta) via generate.

**Modify**: `lib/schema.ts`, `lib/auth.ts`, `lib/auth-client.ts`, `lib/email.ts`,
`components/site-header.tsx`, `components/contact-form.tsx`, `package.json`,
`.env` / `.env.example`.

---

## Risks / notes
- **nextCookies must stay last** in the plugins array; `admin()` goes before it.
- **Module-load → runtime config**: email addresses move from import-time constants to per-send async reads; safe (callers already await), but `getSettings()` must fall back to env on any DB error so mail never breaks.
- **Migration + seed must hit BOTH local and Neon**; existing rows have `role = null` (treated as non-admin) until the seed runs.
- **Base UI vs Radix**: verify `shadcn add` output matches the existing Base UI components.
- **Resend domain caveat (pre-existing)**: editing the `from` to a custom domain only delivers once that domain is verified at resend.com/domains; otherwise Resend test mode still only delivers to the account owner. The admin UI changes the address, not Resend's verification state.
- Not building admin **createUser** (interacts awkwardly with `requireEmailVerification`); out of scope for the 4 requested user actions.

---

## Verification (end-to-end)
1. After migrate+seed, `db:studio` shows the new columns, `app_settings`, and `arbeling@gmail.com` role=admin in **both** DBs.
2. Sign in as the owner → **Admin** link appears (desktop + mobile); sign in as a normal user → no link, and visiting `/admin` redirects to `/dashboard`.
3. Users tab lists everyone with all fields incl. provider.
4. `setRole` flips admin↔user (Admin link appears/disappears after refresh); **Pause** blocks that user's next sign-in (403/banned), **Resume** restores; **Remove** deletes (session/account cascade). Confirm dialogs show; own-row Pause/Remove disabled.
5. Email settings: edit all three, save → `app_settings` upserted, cache busted.
6. Register a new member → admin notice goes to the **configured** recipient from the **configured** `from`, proving runtime config with no redeploy.
7. Submit the contact form → email lands at `contactRecipient`, reply-to = submitter, copy delivered when checked, toast reflects the result.
8. Resilience: unset `RESEND_API_KEY` → sends no-op without throwing; a bad `DATABASE_URL` → `getSettings()` falls back to env and verification mail still builds.
