# Instagram (@tiffanystales) → Book Reviews, with Goodreads-style admin controls

## Context

Riette posts book reviews on Instagram **@tiffanystales**. The goal is to sync those posts into the
site's book-review area, with the **same admin experience as the Goodreads import** (a tab to
connect/sync + an imported list with per-item hide/show), and surface the reviews publicly on a
dedicated **Instagram reviews page** (built like the Good Reads page).

**Hard external constraint (researched):** Meta **shut down the Instagram Basic Display API on
4 Dec 2024**, and **personal IG accounts can no longer be read by any API**. Automatic sync
therefore requires **@tiffanystales to be a free Professional (Business/Creator) account**.

**Decisions:**
- **Data source = Behold.so JSON feed.** Connect @tiffanystales once on behold.so (free); it returns
  a stable JSON feed URL (`https://feeds.behold.so/<id>`). Behold handles Meta's app/tokens/refresh.
  We save that URL and fetch+import it server-side — directly mirroring the Goodreads **RSS sync**
  flow (`fetchGoodreadsRss` → `parseGoodreadsRss` → `upsertGoodreadsBooks`).
- **Display:** a dedicated **`/instagram` reviews page in the site nav** is the primary home for the
  synced posts — **built exactly like the Good Reads page** (`/goodreads`): its own nav tab and a
  full grid of post cards. Additionally surface a "From Instagram @tiffanystales" **section on
  `/reviews`** so the reviews page shows them too.

This is a near-exact mirror of the existing Goodreads feature (`lib/goodreads.ts`,
`components/admin/admin-goodreads.tsx`, `app/(marketing)/goodreads/page.tsx`), so reuse those
patterns and primitives throughout. Stack: Next 16 (App Router, server actions), Drizzle + Postgres,
Better Auth admin, base-ui Tabs.

## Prerequisites (done once, outside the code)
1. Set **@tiffanystales** to a **Professional** account (Instagram app → Settings → Account type).
2. Sign up at **behold.so**, connect @tiffanystales, create a **JSON feed**, copy its URL.
3. Paste that URL into the new **Admin → Instagram** tab and click **Sync**.

## Implementation (mirror Goodreads)

### 1. Schema — `lib/schema.ts`
Add an `instagramPost` table and register it in the exported `schema` object (mirrors `goodreadsBook`):
```ts
export const instagramPost = pgTable("instagram_post", {
  id: text("id").primaryKey(),                 // crypto.randomUUID()
  instagramId: text("instagram_id").notNull().unique(), // Behold post id — upsert key
  permalink: text("permalink"),
  caption: text("caption"),                    // the review text (prefer Behold prunedCaption)
  mediaType: text("media_type"),               // IMAGE | VIDEO | CAROUSEL_ALBUM
  imageUrl: text("image_url"),                 // best display image (from sizes, else mediaUrl/thumb)
  altText: text("alt_text"),
  likeCount: integer("like_count"),
  commentsCount: integer("comments_count"),
  postedAt: timestamp("posted_at"),
  hidden: boolean("hidden").$defaultFn(() => false).notNull(),
  createdAt: timestamp("created_at").$defaultFn(() => new Date()).notNull(),
  updatedAt: timestamp("updated_at").$defaultFn(() => new Date()).notNull(),
}, (t) => [index("instagram_post_posted_at_idx").on(t.postedAt)]);
```
Apply with `npm run db:push`. (Like `pageview`/`goodreads_book`, this also needs applying to **Neon**
before prod use — see DESIGN.md §8c.)

### 2. Core — `lib/instagram.ts` (new, mirror `lib/goodreads.ts`)
- Types: `BeholdPost`/`BeholdFeed` (feed shape: top-level `username`,`posts[]`; per post `id`,
  `timestamp`, `permalink`, `mediaType`, `mediaUrl`, `thumbnailUrl`, `sizes` {small/medium/large/full
  → {mediaUrl,width,height}}, `caption`, `prunedCaption`, `altText`, `likeCount`, `commentsCount`),
  `NormalizedPost`, and `InstagramPostRow = typeof instagramPost.$inferSelect`.
- `isBeholdUrl(url)` — **SSRF guard**: require `https:` and host ending in `behold.so` before any fetch.
- `fetchBeholdFeed(url)` — `fetch(url, { next: { revalidate: 3600 } })`, throw on non-OK (mirror `fetchGoodreadsRss`).
- `parseBeholdFeed(json): NormalizedPost[]` — map posts; pick `imageUrl` = `sizes.medium?.mediaUrl ??
  sizes.large?.mediaUrl ?? mediaUrl ?? thumbnailUrl`; `caption` = `prunedCaption || caption`;
  `postedAt` from `timestamp`. Skip items missing `id`.
- `upsertInstagramPosts(posts)` — copy `upsertGoodreadsBooks`: dedupe by `instagramId`, insert with
  `randomUUID()` id, `onConflictDoUpdate` on `instagramId`, `coalesce(excluded.*, existing.*)` for
  enrichment, **never overwrite `hidden`**; return `{ imported, updated, total }`.
- Queries: `getPublicInstagramPosts(limit=48)` (not hidden, `postedAt desc`),
  `getAdminPosts(limit=100)` (`{ posts, total }`), and `get/setBeholdFeedUrl()` via `appSettings`
  key `instagram_behold_feed_url` (mirror `get/setGoodreadsUserId`). All read queries try/catch → empty.

### 3. Server actions — `app/admin/actions.ts` (reuse `ImportState`, `requireAdmin`)
- Extend `revalidateBookPages()` to also `revalidatePath("/instagram")`.
- `syncInstagramAction(_prev, formData)` — read `feedUrl`; reject if not `isBeholdUrl`; `setBeholdFeedUrl`;
  `fetchBeholdFeed` → `parseBeholdFeed` → `upsertInstagramPosts`; error if 0 posts; revalidate; return
  `{ ok, imported, updated, total }`. (Mirror `syncGoodreadsRssAction`.)
- `setInstagramPostHiddenAction(postId, hidden)` — `db.update(instagramPost)…` (mirror `setBookHiddenAction`).

### 4. Admin tab — `components/admin/admin-instagram.tsx` (new, mirror `admin-goodreads.tsx`)
- A **Connect Behold feed** card: `useActionState(syncInstagramAction)`, a feed-URL `<Input>`
  (defaultValue from settings) + **Sync now** button; helper text linking the Prerequisites above.
- An **Imported posts** table: thumbnail (reuse `BookCover` for `<img>`+fallback), caption snippet,
  date, like count, and a per-row **hide/show** toggle (`useTransition` + `setInstagramPostHiddenAction`
  + `router.refresh`), `opacity-50` when hidden — copy `BookRow`. "Show all/fewer" toggle.
- Reuse the same UI primitives as `admin-goodreads.tsx` (Card/Table/Button/Input/Field/Badge/Spinner).
- Wire in `components/admin/admin-panel.tsx`: add `<TabsTrigger value="instagram">` + `<TabsContent>`
  rendering `<AdminInstagram posts total feedUrl />`; add `instagram` to the props type.
- `app/admin/page.tsx`: `const [{ posts, total }, feedUrl] = await Promise.all([getAdminPosts(),
  getBeholdFeedUrl()])`; pass `instagram={{ posts, total, feedUrl }}`.

### 5. Public display
- **Reusable card** `components/instagram-post-card.tsx` (new): square image via `BookCover`
  (`src=imageUrl`, fallback handles expired CDN URLs), `line-clamp` caption, date, and a
  "View on Instagram" link to `permalink` (`target="_blank" rel="noopener"`).
- **`/instagram` (primary)** (`app/(marketing)/instagram/page.tsx`, new): the standalone Instagram
  reviews page — **structured exactly like `app/(marketing)/goodreads/page.tsx`**: centered header
  ("From @tiffanystales"), a responsive grid of `InstagramPostCard` from `getPublicInstagramPosts()`,
  and an empty state before any sync.
- **Nav** (`components/site-header.tsx`): add `{ label: "Instagram", href: "/instagram" }` to
  `navLinks` (sits alongside "Good Reads"), so it appears as a clickable site tab.
- **`/reviews` (secondary)** (`app/(marketing)/reviews/page.tsx`): after the Goodreads grid, render a
  **"From Instagram @tiffanystales"** section (same `InstagramPostCard` grid). Omit when empty.

### 6. Instagram icon (gotcha)
`lucide-react@1.18.0` does **not** export `Instagram` (DESIGN.md §11; the footer uses an inline SVG).
**Reuse that inline SVG** — extract it from `components/site-footer.tsx` into a small
`components/icons/instagram-icon.tsx` and use it for the nav item style, the admin `TabsTrigger`, and
card chrome. Do **not** import `Instagram` from lucide.

### 7. No `next.config.ts` change
Images render via plain `<img>` (through `BookCover`), so external Behold/Instagram CDN domains need
no `images.remotePatterns` — consistent with the existing book covers.

## Files
- New: `lib/instagram.ts`, `components/admin/admin-instagram.tsx`, `components/instagram-post-card.tsx`,
  `app/(marketing)/instagram/page.tsx`, `components/icons/instagram-icon.tsx`.
- Edit: `lib/schema.ts`, `app/admin/actions.ts`, `app/admin/page.tsx`,
  `components/admin/admin-panel.tsx`, `app/(marketing)/reviews/page.tsx`, `components/site-header.tsx`,
  `components/site-footer.tsx` (swap inline SVG for the new shared icon).
- DB: `npm run db:push`.

## Verification
1. `npm run db:push` — confirm `instagram_post` table exists.
2. `npm run dev`; in **Admin → Instagram** paste a real Behold feed URL (or a sample JSON served
   locally) and **Sync** — toast shows imported/updated counts; rows appear in `instagram_post`
   (`npm run db:studio`).
3. Toggle **hide/show** on a post → it disappears/reappears on `/instagram` + `/reviews`.
4. Check the **Instagram** nav tab → `/instagram` grid; check the "From Instagram" section on
   `/reviews`; cards link out to the correct permalinks; expired image URLs fall back gracefully.
5. Reject a non-Behold URL in the sync form (SSRF guard) → friendly error, no fetch.
6. `npm run lint`, `npx tsc --noEmit`, `npm run build` all clean.

## Notes / trade-offs
- **Behold dependency + Professional account** are required for sync; free tier refreshes ~daily, so
  new posts may take up to a day before a Sync picks them up.
- Instagram posts are **image + caption** only (no title/author/rating), so they render as photo
  cards with caption text + a link out — distinct from the structured Goodreads review cards.
- Behold/Instagram image URLs can rotate; re-syncing refreshes them and `BookCover` covers any gap.
- Same prod caveat as recent features: apply `instagram_post` to **Neon** before relying on it live.
