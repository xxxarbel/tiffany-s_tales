import Link from "next/link";
import { ArrowRight, CalendarDays, Quote } from "lucide-react";

import { getBookOfMonth } from "@/lib/book-of-the-month";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Book of the Month · Tiffany's Tales",
  description:
    "The book the Tiffany's Tales pack is reading and discussing this month.",
};

export default async function BookOfMonthPage() {
  const pick = await getBookOfMonth();
  const hasPick = pick.published && pick.title.trim().length > 0;

  if (!hasPick) {
    return (
      <section className="mx-auto max-w-3xl px-6 py-24 text-center">
        <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
          Book of the Month
        </p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          This month&apos;s pick is on its way
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          We&apos;re choosing our next read. Check back soon to see what the pack
          is reading — and join the conversation.
        </p>
        <Button className="mt-8 h-11 px-7" render={<Link href="/contact" />}>
          Ask about this month&apos;s read
        </Button>
      </section>
    );
  }

  const hasLink = /^https?:\/\//i.test(pick.purchaseUrl);

  return (
    <section className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
      <div className="mb-10 text-center">
        <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
          Book of the Month
        </p>
        {pick.month ? (
          <p className="font-display text-lg text-muted-foreground">
            {pick.month}
          </p>
        ) : null}
      </div>

      {/* Featured book */}
      <div className="grid items-center gap-10 rounded-3xl bg-plum p-8 text-cream sm:p-12 lg:grid-cols-[auto_1fr]">
        <div className="mx-auto aspect-[2/3] w-52 overflow-hidden rounded-xl shadow-2xl ring-1 ring-cream/10">
          <BookCover
            src={pick.coverUrl || null}
            alt={`Cover of ${pick.title}`}
            title={pick.title}
            subtitle={pick.author || null}
            className="h-full w-full"
          />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            {pick.title}
          </h1>
          {pick.author ? (
            <p className="mt-1 text-lg text-cream/70">by {pick.author}</p>
          ) : null}
          {pick.description ? (
            <p className="mt-5 max-w-2xl leading-relaxed whitespace-pre-line text-cream/85">
              {pick.description}
            </p>
          ) : null}
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              variant="secondary"
              className="h-10 px-5"
              render={<Link href="/contact" />}
            >
              Ask about this month&apos;s read
            </Button>
            {hasLink ? (
              <Button
                variant="outline"
                className="h-10 border-cream/40 bg-transparent px-5 text-cream hover:bg-cream/10 hover:text-cream"
                render={
                  <a
                    href={pick.purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  />
                }
              >
                Find the book
                <ArrowRight data-icon="inline-end" />
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Extra details */}
      {pick.whyPicked || pick.meetingInfo ? (
        <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
          {pick.whyPicked ? (
            <Card className="gap-3 p-6">
              <div className="flex items-center gap-2 text-primary">
                <Quote className="size-5" />
                <p className="font-display text-lg font-semibold text-foreground">
                  Why we picked it
                </p>
              </div>
              <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
                {pick.whyPicked}
              </p>
            </Card>
          ) : null}
          {pick.meetingInfo ? (
            <Card className="gap-3 p-6">
              <div className="flex items-center gap-2 text-primary">
                <CalendarDays className="size-5" />
                <p className="font-display text-lg font-semibold text-foreground">
                  When we discuss it
                </p>
              </div>
              <p className="leading-relaxed whitespace-pre-line text-muted-foreground">
                {pick.meetingInfo}
              </p>
            </Card>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
