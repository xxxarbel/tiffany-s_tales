import { revalidatePath } from "next/cache"

import { syncInstagramFeed } from "@/lib/instagram"

// Must hit the live Behold feed and the DB on every run — never cache.
export const dynamic = "force-dynamic"

/**
 * Daily Instagram sync, triggered by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}` automatically when CRON_SECRET is set;
 * we reject anything else so the endpoint can't be run by outsiders. Refreshes
 * the @tiffanystales posts from the configured (or default) Behold feed.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  const authorized =
    !!secret && request.headers.get("authorization") === `Bearer ${secret}`
  if (!authorized) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const result = await syncInstagramFeed()
    revalidatePath("/instagram")
    revalidatePath("/reviews")
    return Response.json({ ok: true, ...result })
  } catch (error) {
    console.error("[cron] instagram sync failed:", error)
    return Response.json({ ok: false }, { status: 500 })
  }
}
