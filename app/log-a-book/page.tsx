import { redirect } from "next/navigation";

import { getSafeSession } from "@/lib/auth";
import { getBookLog } from "@/lib/book-log";
import { SiteHeader } from "@/components/site-header";
import { BookLog } from "@/components/book-log/book-log";

export const metadata = {
  title: "Log a Book · Tiffany's Tales",
};

export default async function LogABookPage() {
  const session = await getSafeSession();
  if (!session) {
    redirect("/login");
  }

  const entries = await getBookLog(session.user.id);

  return (
    <div className="min-h-svh bg-muted/40">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-10">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">
            Log a Book
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep track of every book you read — with Tiffany&apos;s Tales or
            anywhere else. Add the title and author, and rate each one from one
            to five paws.
          </p>
        </div>
        <BookLog entries={entries} />
      </main>
    </div>
  );
}
