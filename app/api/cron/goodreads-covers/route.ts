import { revalidatePath } from "next/cache"

import { resolveMissingCovers } from "@/lib/goodreads"

// Resolves a batch of book covers on each run — must hit the DB + external
// cover sources every time, so never cache.
export const dynamic = "force-dynamic"
// Give the batch room to run (Vercel caps this to the plan limit).
export const maxDuration = 60

/**
 * Background cover backfill, triggered by Vercel Cron (see vercel.json). Imports
 * upsert books without resolving covers (that would time out on a full library),
 * so this fills them in over time, a time-bounded batch per run. Guarded by
 * `CRON_SECRET` exactly like the Instagram cron; revalidates the book pages when
 * it actually changed something.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authorized =
    !!secret && request.headers.get("authorization") === `Bearer ${secret}`
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const result = await resolveMissingCovers({ deadlineMs: 55_000 })
    if (result.updated > 0) {
      revalidatePath("/reviews")
      revalidatePath("/goodreads")
    }
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error("[cron] goodreads cover backfill failed:", error)
    return Response.json({ ok: false }, { status: 500 })
  }
}
