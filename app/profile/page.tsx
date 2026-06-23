import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, Mail, ShieldCheck } from "lucide-react";

import { getSafeSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { account } from "@/lib/schema";
import { getUserProfile } from "@/lib/user-profile";
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
import { SiteHeader } from "@/components/site-header";
import { ProfileForm } from "@/components/auth/profile-form";
import { ReadingProfileForm } from "@/components/auth/reading-profile-form";

const providerLabels: Record<string, string> = {
  credential: "Email & password",
  google: "Google",
};

export default async function ProfilePage() {
  const session = await getSafeSession();
  if (!session) {
    redirect("/login");
  }

  const { user } = session;
  const memberSince = new Date(user.createdAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // The member's free-text reading profile (the "about you / your taste" answers).
  const readingProfile = await getUserProfile(user.id);

  // Which sign-in methods are linked to this account (credential / google).
  let providers: string[] = [];
  try {
    const rows = await db
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, user.id));
    providers = [...new Set(rows.map((r) => r.providerId))];
  } catch (error) {
    console.error("[profile] failed to load sign-in methods:", error);
  }

  return (
    <div className="min-h-svh bg-muted/40">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-6 py-10">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Your profile
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update your details and review your account information.
          </p>
        </div>

        <div className="mt-8 grid gap-6">
          {/* Editable details */}
          <ProfileForm
            user={{ name: user.name, email: user.email, image: user.image }}
          />

          {/* About you & reading taste */}
          <ReadingProfileForm profile={readingProfile} />

          {/* Account info (read-only) */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-xl">
                Account information
              </CardTitle>
              <CardDescription>
                Details on file for your membership.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="size-4" />
                  Email
                </span>
                <span className="flex items-center gap-2 font-medium">
                  {user.email}
                  {user.emailVerified ? (
                    <Badge variant="secondary" className="gap-1">
                      <ShieldCheck data-icon="inline-start" />
                      Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline">Unverified</Badge>
                  )}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="size-4" />
                  Member since
                </span>
                <span className="font-medium">{memberSince}</span>
              </div>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="size-4" />
                  Sign-in methods
                </span>
                <span className="flex flex-wrap justify-end gap-1.5">
                  {providers.length > 0 ? (
                    providers.map((p) => (
                      <Badge key={p} variant="outline">
                        {providerLabels[p] ?? p}
                      </Badge>
                    ))
                  ) : (
                    <span className="font-medium text-muted-foreground">—</span>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8">
          <Button variant="ghost" size="sm" render={<Link href="/dashboard" />}>
            <ArrowLeft data-icon="inline-start" />
            Back to dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}
