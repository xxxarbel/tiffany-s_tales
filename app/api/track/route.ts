import { randomUUID } from "node:crypto"
import { cookies, headers } from "next/headers"

import { db } from "@/lib/db"
import { pageview } from "@/lib/schema"

// Opaque first-party visitor id. Lets us count unique visitors without storing
// any IP or other PII. ~180 days so a returning visitor isn't double-counted.
const VISITOR_COOKIE = "tt_vid"
const VISITOR_MAX_AGE = 60 * 60 * 24 * 180

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless/i

function deviceFromUserAgent(ua: string): "mobile" | "desktop" {
  return /mobile|android|iphone|ipad|ipod/i.test(ua) ? "mobile" : "desktop"
}

/**
 * Records a single first-party pageview. Called by `<PageviewTracker />` via
 * `navigator.sendBeacon`, so we keep it cheap and always return 204 — a tracking
 * failure must never surface to the visitor.
 */
export async function POST(request: Request) {
  let path: unknown
  let referrer: unknown
  try {
    ;({ path, referrer } = await request.json())
  } catch {
    return new Response(null, { status: 204 })
  }

  if (typeof path !== "string" || path.length === 0 || path.length > 2048) {
    return new Response(null, { status: 204 })
  }

  const headerList = await headers()
  const ua = headerList.get("user-agent") ?? ""
  if (BOT_RE.test(ua)) return new Response(null, { status: 204 })

  // Resolve (or mint) the visitor id from a first-party cookie.
  const cookieStore = await cookies()
  let visitorId = cookieStore.get(VISITOR_COOKIE)?.value
  if (!visitorId) {
    visitorId = randomUUID()
    cookieStore.set(VISITOR_COOKIE, visitorId, {
      maxAge: VISITOR_MAX_AGE,
      sameSite: "lax",
      path: "/",
      secure: process.env.NODE_ENV === "production",
    })
  }

  // `x-vercel-ip-country` is injected by Vercel's edge in production.
  const country = headerList.get("x-vercel-ip-country") || null

  try {
    await db.insert(pageview).values({
      id: randomUUID(),
      path,
      visitorId,
      referrer: typeof referrer === "string" && referrer ? referrer : null,
      country,
      device: deviceFromUserAgent(ua),
    })
  } catch (error) {
    console.error("[track] failed to record pageview:", error)
  }

  return new Response(null, { status: 204 })
}
