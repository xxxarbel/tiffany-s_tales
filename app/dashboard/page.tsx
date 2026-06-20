import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  ExternalLink,
  Heart,
  Users,
} from "lucide-react";

import { getSafeSession } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/auth/user-menu";
import { SiteHeader } from "@/components/site-header";

export default async function DashboardPage() {
  const session = await getSafeSession();
  if (!session) {
    redirect("/login");
  }

  const { user } = session;
  const firstName = user.name?.trim().split(/\s+/)[0] ?? "friend";
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-svh bg-muted/40">
      <SiteHeader />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Welcome */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <UserAvatar
              user={user}
              className="size-14 ring-2 ring-primary/20"
            />
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                Welcome back, {firstName}! 🐾
              </h1>
              <p className="text-sm text-muted-foreground">
                You&apos;re part of the Tiffany&apos;s Tales pack.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="h-7 gap-1.5 self-start px-3">
            <BadgeCheck data-icon="inline-start" />
            Active member
          </Badge>
        </div>

        {/* Stat cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="gap-1">
              <CardDescription className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                Member since
              </CardDescription>
              <CardTitle className="font-display text-xl">
                {memberSince}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="gap-1">
              <CardDescription className="flex items-center gap-1.5">
                <Heart className="size-4" />
                Membership
              </CardDescription>
              <CardTitle className="font-display text-xl">
                £10 / month
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="gap-1">
              <CardDescription className="flex items-center gap-1.5">
                <Users className="size-4" />
                Your pack
              </CardDescription>
              <CardTitle className="font-display text-xl">Maidstone</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* Book of the month */}
          <Card className="overflow-hidden lg:col-span-2">
            <div className="grid gap-0 sm:grid-cols-[160px_1fr]">
              <div className="relative h-44 sm:h-full">
                <Image
                  src="/images/book-of-month.jpg"
                  alt="This month's book"
                  fill
                  sizes="160px"
                  className="object-cover"
                />
              </div>
              <div className="flex flex-col justify-center gap-2 p-6">
                <Badge variant="secondary" className="w-fit gap-1.5">
                  <BookOpen data-icon="inline-start" />
                  Book of the month
                </Badge>
                <h2 className="font-display text-xl font-bold">
                  This month&apos;s read
                </h2>
                <p className="text-sm text-muted-foreground">
                  Pick up your copy and join the conversation on Discord. We
                  meet up once a month to share what we loved — and what we
                  didn&apos;t!
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  className="mt-2 w-fit"
                  render={<Link href="/#book-of-the-month" />}
                >
                  See details
                  <ExternalLink data-icon="inline-end" />
                </Button>
              </div>
            </div>
          </Card>

          {/* Next meet-up */}
          <Card>
            <CardHeader>
              <CardDescription className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                Next meet-up
              </CardDescription>
              <CardTitle className="font-display text-xl">
                Monthly gathering
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
              <p>
                Our packs meet once a month in Maidstone and Sittingbourne.
                Keep an eye on Discord for the next date and venue.
              </p>
              <Separator />
              <p className="text-foreground">
                Suggestions for the next book are always welcome — bring yours
                along!
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer links */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" render={<Link href="/" />}>
            <ArrowLeft data-icon="inline-start" />
            Back to site
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/profile" />}>
            Manage your profile
          </Button>
        </div>
      </main>
    </div>
  );
}
