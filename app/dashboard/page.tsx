import Link from "next/link";
import { redirect } from "next/navigation";

import { getSafeSession } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SignOutButton } from "@/components/auth/sign-out-button";

export default async function DashboardPage() {
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

  return (
    <main className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-display text-lg font-bold">
            Tiffany&apos;s Tales
          </Link>
          <SignOutButton />
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold">
          Welcome, {user.name}! 🐾
        </h1>
        <p className="mt-2 text-muted-foreground">
          You&apos;re part of the Tiffany&apos;s Tales pack. Here are your
          membership details.
        </p>

        <Card className="mt-8 max-w-md">
          <CardHeader>
            <CardTitle className="font-display text-xl">Your account</CardTitle>
            <CardDescription>The details we have on file.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{user.name}</span>
            </div>
            <Separator />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <Separator />
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Member since</span>
              <span className="font-medium">{memberSince}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
