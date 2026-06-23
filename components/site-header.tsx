"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BookHeart,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  UserRound,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { authClient } from "@/lib/auth-client"
import { Logo } from "@/components/logo"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { UserAvatar, UserMenu } from "@/components/auth/user-menu"
import { SignOutButton } from "@/components/auth/sign-out-button"

const navLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Book Club Benefits", href: "/benefits" },
  { label: "Book Reviews", href: "/reviews" },
  { label: "Book of the Month", href: "/book-of-the-month" },
  { label: "Good Reads", href: "/goodreads" },
  { label: "Instagram", href: "/instagram" },
  { label: "Contact", href: "/contact" },
]

const accountLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Log a Book", href: "/log-a-book", icon: BookHeart },
  { label: "Profile", href: "/profile", icon: UserRound },
]

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href)
}

export function SiteHeader() {
  const { data: session, isPending } = authClient.useSession()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Hide the AI Suggestions tab until the server confirms an Anthropic key is
  // set, so members never see a tab for a feature that isn't configured. Same
  // gating idea as the voice launcher; only the boolean is fetched, not the key.
  const [aiEnabled, setAiEnabled] = useState(false)
  useEffect(() => {
    let active = true
    fetch("/api/ai-suggestions/config")
      .then((res) => res.json())
      .then((data) => {
        if (active && data?.enabled) setAiEnabled(true)
      })
      .catch(() => {
        /* keep the tab hidden if the config endpoint is unavailable */
      })
    return () => {
      active = false
    }
  }, [])

  // Admin link is shown only to admins; the route itself is server-guarded.
  const isAdmin = (session?.user as { role?: string | null })?.role === "admin"
  let sessionLinks = isAdmin
    ? [...accountLinks, { label: "Admin", href: "/admin", icon: ShieldCheck }]
    : accountLinks
  if (aiEnabled) {
    sessionLinks = [
      ...sessionLinks,
      {
        label: "Tiffany AI Suggestions",
        href: "/ai-suggestions",
        icon: Sparkles,
      },
    ]
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto max-w-6xl px-6">
        {/* Top bar: the logo is centered on desktop — a 3-column grid pins the
            auth/cart cluster to the right while keeping the logo truly centered
            — and a simple left-aligned row on mobile. Centering the logo frees
            the row below for the full set of tabs. */}
        <div className="flex items-center justify-between gap-4 py-3 lg:grid lg:grid-cols-[1fr_auto_1fr]">
          <div aria-hidden className="hidden lg:block" />
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2.5 lg:justify-self-center"
          >
            <Logo size={40} priority className="ring-2 ring-primary/25" />
            <span className="font-display text-xl font-bold tracking-tight sm:text-2xl">
              Tiffany&apos;s Tales
            </span>
          </Link>

          <div className="flex items-center gap-2 lg:justify-self-end">
            {/* Desktop auth cluster */}
            <div className="hidden items-center gap-2 lg:flex">
              {isPending ? (
                <Skeleton className="size-9 rounded-full" />
              ) : session ? (
                <UserMenu user={session.user} />
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className="h-9 px-3"
                    render={<Link href="/login" />}
                  >
                    Log in
                  </Button>
                  <Button className="h-9 px-4" render={<Link href="/login" />}>
                    Join my pack
                  </Button>
                </>
              )}
            </div>

            <Button variant="ghost" size="icon" aria-label="Cart">
              <ShoppingBag />
            </Button>

            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label="Open menu"
                  />
                }
              >
                <Menu />
              </SheetTrigger>
              <SheetContent side="right" className="w-72 gap-0">
                <SheetHeader className="border-b">
                  <SheetTitle className="font-display text-lg">
                    Tiffany&apos;s Tales
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-2">
                  {navLinks.map((link) => (
                    <SheetClose
                      key={link.href}
                      render={<Link href={link.href} />}
                      className={cn(
                        "rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                        isActive(pathname, link.href) &&
                          "bg-muted text-foreground"
                      )}
                    >
                      {link.label}
                    </SheetClose>
                  ))}
                  {session
                    ? sessionLinks.map((link) => (
                        <SheetClose
                          key={link.href}
                          render={<Link href={link.href} />}
                          className={cn(
                            "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted",
                            isActive(pathname, link.href) &&
                              "bg-muted text-foreground"
                          )}
                        >
                          <link.icon className="size-4" />
                          {link.label}
                        </SheetClose>
                      ))
                    : null}
                </nav>
                <div className="mt-auto flex flex-col gap-3 border-t p-4">
                  {session ? (
                    <>
                      <div className="flex items-center gap-3">
                        <UserAvatar user={session.user} className="size-9" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">
                            {session.user.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {session.user.email}
                          </p>
                        </div>
                      </div>
                      <SignOutButton className="w-full" />
                    </>
                  ) : (
                    <>
                      <Button
                        className="h-10 w-full"
                        render={<Link href="/login" />}
                      >
                        Join my pack
                      </Button>
                      <Button
                        variant="outline"
                        className="h-10 w-full"
                        render={<Link href="/login" />}
                      >
                        Log in
                      </Button>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Desktop tabs — their own full-width row beneath the centered logo, so
            the growing tab set has the whole header width to breathe. */}
        <nav className="hidden items-center justify-center gap-5 border-t py-2.5 text-sm font-medium lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary after:transition-transform hover:text-foreground",
                isActive(pathname, link.href)
                  ? "text-foreground after:scale-x-100"
                  : "text-muted-foreground after:scale-x-0"
              )}
            >
              {link.label}
            </Link>
          ))}
          {session ? (
            <>
              <span aria-hidden className="h-4 w-px bg-border" />
              {sessionLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative flex items-center gap-1.5 py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:rounded-full after:bg-primary after:transition-transform hover:text-foreground",
                    isActive(pathname, link.href)
                      ? "text-foreground after:scale-x-100"
                      : "text-muted-foreground after:scale-x-0"
                  )}
                >
                  <link.icon className="size-4" />
                  {link.label}
                </Link>
              ))}
            </>
          ) : null}
        </nav>
      </div>
    </header>
  )
}
