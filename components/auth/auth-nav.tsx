"use client"

import Link from "next/link"
import { LayoutDashboard, ShoppingBag } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export function AuthNav() {
  const { data: session, isPending } = authClient.useSession()

  return (
    <div className="flex items-center gap-2">
      {isPending ? (
        <Skeleton className="h-9 w-28 rounded-lg" />
      ) : session ? (
        <Button
          variant="secondary"
          className="hidden h-9 px-4 sm:inline-flex"
          render={<Link href="/dashboard" />}
        >
          <LayoutDashboard data-icon="inline-start" />
          My account
        </Button>
      ) : (
        <>
          <Button
            variant="ghost"
            className="hidden h-9 px-3 sm:inline-flex"
            render={<Link href="/login" />}
          >
            Log in
          </Button>
          <Button
            className="hidden h-9 px-4 sm:inline-flex"
            render={<Link href="/login" />}
          >
            Join my pack
          </Button>
        </>
      )}
      <Button variant="ghost" size="icon" aria-label="Cart">
        <ShoppingBag />
      </Button>
    </div>
  )
}
