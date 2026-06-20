# Enable Vercel Web Analytics + first-party analytics in Admin

## Context

Enable Vercel Web Analytics and display **all the analytics information inside the admin page**.

Two distinct needs, and an important constraint:

- **Enabling Vercel Web Analytics** is trivial — `@vercel/analytics@^2.0.1` is already a dependency; it just needs `<Analytics />` mounted in the root layout so data flows to Vercel's own dashboard.
- **Showing the numbers in our admin page** cannot use Vercel's data: Vercel Web Analytics exposes **no public REST API** to read aggregated stats back into your own app (the only export path is "Analytics Drains", which streams raw events and is plan-gated). Confirmed against current Vercel docs.

**Decision:** mount `<Analytics />` for Vercel's dashboard **and** build lightweight **first-party** pageview tracking into our existing Postgres, then render it in a new admin "Analytics" tab. This works on any plan, gives full control, and shows real data in admin.

Stack notes: Next.js **16.2.9** (customized — App Router, Route Handlers per `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`), React 19, Drizzle ORM over `pg`, Better Auth, server components + server actions (no REST data routes today except auth). Admin UI is a shadcn/base-ui `Tabs` layout.

## Implementation

### 1. Mount Vercel Analytics — `app/layout.tsx`
Per Vercel docs the Next.js import is `import { Analytics } from "@vercel/analytics/next"`. Render `<Analytics />` inside `<body>` next to the existing `<Toaster />`. Also mount our own `<PageviewTracker />` (below) here.

### 2. First-party tracker (client) — `components/pageview-tracker.tsx` (new)
`"use client"` component that watches the path with `usePathname()` (from `next/navigation`) and fires a beacon on each change via `navigator.sendBeacon("/api/track", blob)` where `blob = new Blob([JSON.stringify({ path, referrer: document.referrer })], { type: "application/json" })`. Skip tracking when `pathname` starts with `/admin`, `/api`, `/dashboard`, or `/login` so internal/admin navigation doesn't pollute public stats. Renders `null`.

### 3. Ingest route — `app/api/track/route.ts` (new)
`POST` Route Handler:
- Parse `{ path, referrer }` from `await request.json()`.
- Resolve a stable visitor id from a first-party cookie (`tt_vid`); if missing, generate `crypto.randomUUID()` and set it on the response (max-age ~180 days, `sameSite: lax`, not httpOnly-sensitive — it's only an opaque random id, **no PII / no IP stored**).
- Read `country` from the Vercel geo header (`x-vercel-ip-country`) and a coarse `device` (`mobile`/`desktop`) from the `user-agent`; optionally drop obvious bots by UA.
- Insert one row into the `pageview` table via Drizzle. Return `204`.
Use `headers()`/`cookies()` from `next/headers` (async in Next 16).

### 4. Schema — `lib/schema.ts`
Add a `pageview` table and include it in the exported `schema` object (mirrors the existing `appSettings` style):
```ts
export const pageview = pgTable("pageview", {
  id: text("id").primaryKey(),            // crypto.randomUUID()
  path: text("path").notNull(),
  visitorId: text("visitor_id"),
  referrer: text("referrer"),
  country: text("country"),
  device: text("device"),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
});
```
Add to: `export const schema = { user, session, account, verification, appSettings, pageview };`
Apply with `npm run db:push` (or `db:generate` + `db:migrate`). Consider an index on `created_at` for range scans.

### 5. Aggregation utility — `lib/analytics.ts` (new)
Server-only `getAnalyticsSummary(days: number)` using Drizzle/SQL aggregates over `pageview` filtered to the last `days`:
- `totalPageviews` (count), `uniqueVisitors` (count distinct `visitor_id`)
- `topPaths`, `topReferrers`, `byCountry`, `byDevice` (group-by + count, ordered desc, limited)
- `daily` series (`date_trunc('day', created_at)` → count) for the chart
Compute for the windows the UI needs (e.g. 7 / 30 / 90 day) — each is a handful of cheap grouped queries.

### 6. Wire into admin — `app/admin/page.tsx`
After `requireAdmin()`, call `getAnalyticsSummary(...)` for the needed windows and pass the result(s) as a new `analytics` prop into `<AdminPanel />`.

### 7. New tab — `components/admin/admin-panel.tsx`
Add a third `TabsTrigger`/`TabsContent` ("Analytics", `BarChart3` icon from `lucide-react`) rendering `<AdminAnalytics analytics={analytics} />`. Keep the existing Users/Email tabs unchanged.

### 8. Dashboard component — `components/admin/admin-analytics.tsx` (new)
`"use client"`. Renders:
- Summary cards: Pageviews, Unique visitors.
- A simple bar chart of the daily series using `div` heights (no new dependency).
- Small tables (reuse `@/components/ui/table`) for Top paths, Top referrers, By country, By device.
- A 7/30/90-day range toggle held in local `useState`, switching between the pre-fetched windows passed from the server — no reloads, so the active tab is preserved.

## Files
- New: `components/pageview-tracker.tsx`, `app/api/track/route.ts`, `lib/analytics.ts`, `components/admin/admin-analytics.tsx`
- Edit: `app/layout.tsx`, `lib/schema.ts`, `app/admin/page.tsx`, `components/admin/admin-panel.tsx`
- DB: `npm run db:push`

## Verification
1. `npm run db:push` — confirm the `pageview` table is created.
2. `npm run dev`; visit a few public pages (`/`, `/events`, etc.). Confirm the beacon hits `/api/track` (Network tab → 204) and rows appear in `pageview` (`npm run db:studio` or a quick query).
3. Confirm internal paths (`/admin`, `/dashboard`) are **not** tracked.
4. Sign in as admin → `/admin` → **Analytics** tab: verify cards, chart, and tables show the data and the 7/30/90 toggle updates the view without losing the tab.
5. Verify `<Analytics />` loads (Vercel script request in Network); full Vercel-dashboard numbers populate only after deploy to Vercel.
6. `npm run lint` and `npm run build` clean.

## Notes / trade-offs
- First-party numbers are computed from our own DB and will differ slightly from Vercel's dashboard (different bot filtering / dedup). Both run in parallel; the admin tab shows ours.
- The `tt_vid` cookie is a first-party analytics cookie (opaque random id, no PII). Flag if a consent banner is desired before storing it.
