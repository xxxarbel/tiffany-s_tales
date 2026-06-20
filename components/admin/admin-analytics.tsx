"use client"

import { useState } from "react"
import { Eye, Users } from "lucide-react"

import type { AnalyticsSummary, Breakdown } from "@/lib/analytics"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const numberFormat = new Intl.NumberFormat("en-GB")

function rangeLabel(days: number) {
  return `${days} days`
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  })
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string
  value: number
  icon: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-bold tabular-nums">
          {numberFormat.format(value)}
        </p>
      </CardContent>
    </Card>
  )
}

function DailyChart({ daily }: { daily: AnalyticsSummary["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => d.count))
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Pageviews per day
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-40 items-end gap-px">
          {daily.map((d) => (
            <div
              key={d.date}
              className="group/bar relative flex flex-1 items-end"
              style={{ minWidth: 2 }}
            >
              <div
                className="w-full rounded-t-sm bg-primary/70 transition-colors group-hover/bar:bg-primary"
                style={{ height: `${Math.max((d.count / max) * 100, d.count > 0 ? 4 : 0)}%` }}
              />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded bg-foreground px-1.5 py-0.5 text-xs whitespace-nowrap text-background opacity-0 transition-opacity group-hover/bar:opacity-100">
                {formatDay(d.date)}: {numberFormat.format(d.count)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownTable({
  title,
  label,
  rows,
}: {
  title: string
  label: string
  rows: Breakdown[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        {rows.length === 0 ? (
          <p className="px-(--card-spacing) text-sm text-muted-foreground">
            No data yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{label}</TableHead>
                <TableHead className="w-20 text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label}>
                  <TableCell className="max-w-0 truncate font-medium">
                    {row.label}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {numberFormat.format(row.count)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

export function AdminAnalytics({
  summaries,
}: {
  summaries: AnalyticsSummary[]
}) {
  const [activeDays, setActiveDays] = useState(
    summaries[1]?.days ?? summaries[0]?.days ?? 30
  )
  const summary =
    summaries.find((s) => s.days === activeDays) ?? summaries[0]

  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">No analytics available.</p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          First-party traffic for this site, from our own database. Vercel Web
          Analytics runs alongside and feeds the Vercel dashboard.
        </p>
        <div className="flex gap-1 rounded-lg border bg-background p-1">
          {summaries.map((s) => (
            <Button
              key={s.days}
              size="sm"
              variant={s.days === activeDays ? "default" : "ghost"}
              onClick={() => setActiveDays(s.days)}
              className={cn(s.days !== activeDays && "text-muted-foreground")}
            >
              {rangeLabel(s.days)}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="Pageviews"
          value={summary.totalPageviews}
          icon={<Eye className="size-4" />}
        />
        <StatCard
          title="Unique visitors"
          value={summary.uniqueVisitors}
          icon={<Users className="size-4" />}
        />
      </div>

      <DailyChart daily={summary.daily} />

      <div className="grid gap-4 lg:grid-cols-2">
        <BreakdownTable
          title="Top pages"
          label="Path"
          rows={summary.topPaths}
        />
        <BreakdownTable
          title="Top referrers"
          label="Referrer"
          rows={summary.topReferrers}
        />
        <BreakdownTable
          title="By country"
          label="Country"
          rows={summary.byCountry}
        />
        <BreakdownTable
          title="By device"
          label="Device"
          rows={summary.byDevice}
        />
      </div>
    </div>
  )
}
