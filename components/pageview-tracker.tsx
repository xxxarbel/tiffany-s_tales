"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

// Paths we don't count as public pageviews: admin, member area, auth screens and
// the API itself. Keeps the in-app analytics focused on the marketing site.
const IGNORED_PREFIXES = ["/admin", "/dashboard", "/login", "/api"]

function isIgnored(pathname: string) {
  return IGNORED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

/**
 * Fires a first-party pageview beacon to `/api/track` on every client-side
 * navigation. Renders nothing. Uses `navigator.sendBeacon` so the request is
 * fire-and-forget and survives the page unloading. This is separate from Vercel
 * Web Analytics (`<Analytics />`) — it powers the admin Analytics tab from our
 * own database.
 */
export function PageviewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || isIgnored(pathname)) return
    if (typeof navigator === "undefined" || !navigator.sendBeacon) return

    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
    })
    const blob = new Blob([payload], { type: "application/json" })
    navigator.sendBeacon("/api/track", blob)
  }, [pathname])

  return null
}
