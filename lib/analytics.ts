import { and, countDistinct, desc, gte, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { pageview } from "@/lib/schema";

// Read-only aggregates over the first-party `pageview` table, powering the admin
// Analytics tab. All queries are scoped to a trailing time window and are cheap
// grouped counts. No PII is read or returned.

export type Breakdown = { label: string; count: number };
export type DailyPoint = { date: string; count: number };

export type AnalyticsSummary = {
  days: number;
  totalPageviews: number;
  uniqueVisitors: number;
  topPaths: Breakdown[];
  topReferrers: Breakdown[];
  byCountry: Breakdown[];
  byDevice: Breakdown[];
  daily: DailyPoint[];
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toDateKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

/** Builds a zero-filled daily series so the chart has one bar per day. */
function fillDaily(
  rows: { day: Date | string; count: number }[],
  days: number,
  now: number
): DailyPoint[] {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(toDateKey(row.day), Number(row.count));

  const series: DailyPoint[] = [];
  // Start at the oldest day in the window and walk forward to today.
  const startMs = now - (days - 1) * DAY_MS;
  for (let i = 0; i < days; i++) {
    const key = toDateKey(new Date(startMs + i * DAY_MS));
    series.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return series;
}

/**
 * Aggregates pageviews from the trailing `days` window. Returns totals plus
 * top-N breakdowns and a daily series. Never throws — on a DB error it returns
 * an empty summary so the admin page still renders.
 */
export async function getAnalyticsSummary(
  days: number
): Promise<AnalyticsSummary> {
  const now = Date.now();
  const since = new Date(now - days * DAY_MS);
  const inWindow = gte(pageview.createdAt, since);

  const empty: AnalyticsSummary = {
    days,
    totalPageviews: 0,
    uniqueVisitors: 0,
    topPaths: [],
    topReferrers: [],
    byCountry: [],
    byDevice: [],
    daily: fillDaily([], days, now),
  };

  try {
    const totalsQuery = db
      .select({
        total: sql<number>`count(*)::int`,
        unique: countDistinct(pageview.visitorId),
      })
      .from(pageview)
      .where(inWindow);

    const topPathsQuery = db
      .select({ label: pageview.path, count: sql<number>`count(*)::int` })
      .from(pageview)
      .where(inWindow)
      .groupBy(pageview.path)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    const topReferrersQuery = db
      .select({ label: pageview.referrer, count: sql<number>`count(*)::int` })
      .from(pageview)
      .where(and(inWindow, isNotNull(pageview.referrer)))
      .groupBy(pageview.referrer)
      .orderBy(desc(sql`count(*)`))
      .limit(8);

    const byCountryQuery = db
      .select({ label: pageview.country, count: sql<number>`count(*)::int` })
      .from(pageview)
      .where(and(inWindow, isNotNull(pageview.country)))
      .groupBy(pageview.country)
      .orderBy(desc(sql`count(*)`))
      .limit(8);

    const byDeviceQuery = db
      .select({ label: pageview.device, count: sql<number>`count(*)::int` })
      .from(pageview)
      .where(and(inWindow, isNotNull(pageview.device)))
      .groupBy(pageview.device)
      .orderBy(desc(sql`count(*)`));

    const dailyQuery = db
      .select({
        day: sql<Date>`date_trunc('day', ${pageview.createdAt})`,
        count: sql<number>`count(*)::int`,
      })
      .from(pageview)
      .where(inWindow)
      .groupBy(sql`date_trunc('day', ${pageview.createdAt})`)
      .orderBy(sql`date_trunc('day', ${pageview.createdAt})`);

    const [totals, topPaths, topReferrers, byCountry, byDevice, daily] =
      await Promise.all([
        totalsQuery,
        topPathsQuery,
        topReferrersQuery,
        byCountryQuery,
        byDeviceQuery,
        dailyQuery,
      ]);

    const toBreakdown = (
      rows: { label: string | null; count: number }[]
    ): Breakdown[] =>
      rows.map((r) => ({ label: r.label ?? "—", count: Number(r.count) }));

    return {
      days,
      totalPageviews: Number(totals[0]?.total ?? 0),
      uniqueVisitors: Number(totals[0]?.unique ?? 0),
      topPaths: toBreakdown(topPaths),
      topReferrers: toBreakdown(topReferrers),
      byCountry: toBreakdown(byCountry),
      byDevice: toBreakdown(byDevice),
      daily: fillDaily(daily, days, now),
    };
  } catch (error) {
    console.error("[analytics] summary failed:", error);
    return empty;
  }
}
