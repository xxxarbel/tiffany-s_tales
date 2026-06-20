import { PawPrint, Star } from "lucide-react";

import { Card } from "@/components/ui/card";

export const metadata = {
  title: "Book Reviews · Tiffany's Tales",
};

export default function ReviewsPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
          From the pack
        </p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Book Reviews
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          What our members are reading — and what they think.
        </p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card className="justify-center gap-5 bg-primary p-8 text-primary-foreground sm:p-10">
          <PawPrint className="size-8 text-sage" />
          <blockquote className="font-display text-xl leading-relaxed font-medium text-balance sm:text-2xl">
            Being part of Tiffany&apos;s Tales Book Club has reignited my
            passion for reading and introduced me to a wonderful community of
            like-minded individuals. I look forward to our meetings every
            month!
          </blockquote>
          <p className="text-sm font-semibold tracking-[0.15em] text-primary-foreground/70 uppercase">
            — A happy member
          </p>
        </Card>
        <Card className="gap-4 bg-secondary p-6 text-secondary-foreground">
          <div className="flex items-center gap-1" aria-label="Rated 5 out of 5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="size-5 fill-current text-primary" />
            ))}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            <p>
              <span className="font-semibold">Title:</span> This month&apos;s
              pick
            </p>
            <p>
              <span className="font-semibold">Author:</span> Chosen together
            </p>
            <p>
              <span className="font-semibold">Year:</span> 2026
            </p>
          </div>
          <p className="text-sm leading-relaxed">
            A heartfelt, page-turning read that sparked one of our liveliest
            discussions yet — highly recommended for the whole pack.
          </p>
        </Card>
      </div>
    </section>
  );
}
