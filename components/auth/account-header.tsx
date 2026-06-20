"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, UserRound } from "lucide-react"

import { cn } from "@/lib/utils"
import { UserMenu, type SessionUser } from "@/components/auth/user-menu"

const navLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/profile", label: "Profile", icon: UserRound },
]

export function AccountHeader({ user }: { user: SessionUser }) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.jpg"
            alt="Tiffany's Tales logo"
            width={36}
            height={36}
            priority
            className="rounded-full ring-2 ring-primary/25"
          />
          <span className="hidden font-display text-lg font-bold tracking-tight sm:inline">
            Tiffany&apos;s Tales
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full bg-muted/60 p-1">
          {navLinks.map((link) => {
            const active = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <link.icon className="size-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>

        <UserMenu user={user} />
      </div>
    </header>
  )
}
