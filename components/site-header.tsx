"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { LayoutDashboard, Menu, ShoppingBag } from "lucide-react"

import { authClient } from "@/lib/auth-client"
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
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Book Club Benefits", href: "#benefits" },
  { label: "Book Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
]

export function SiteHeader() {
  const { data: session, isPending } = authClient.useSession()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <a href="#home" className="flex items-center gap-2.5">
          <Image
            src="/logo.jpg"
            alt="Tiffany's Tales logo"
            width={40}
            height={40}
            priority
            className="rounded-full ring-2 ring-primary/25"
          />
          <span className="font-display text-xl font-bold tracking-tight sm:text-2xl">
            Tiffany&apos;s Tales
          </span>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
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
                    render={<a href={link.href} />}
                    className="rounded-md px-3 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
                  >
                    {link.label}
                  </SheetClose>
                ))}
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
                    <Button
                      variant="secondary"
                      className="h-10 w-full"
                      render={<Link href="/dashboard" />}
                    >
                      <LayoutDashboard data-icon="inline-start" />
                      My account
                    </Button>
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
    </header>
  )
}
