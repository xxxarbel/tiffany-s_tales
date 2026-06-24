import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Coffee, PawPrint } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";

const packs = [
  {
    name: "Sittingbourne Pack",
    icon: BookOpen,
    image: "/images/reading-cozy.jpg",
    blurb:
      "Settle in with a warm drink and good company while we talk books. We meet the 1st Monday of every month at 7:30pm at The Jenny Wren, Staplehurst Road.",
  },
  {
    name: "Maidstone Pack",
    icon: Coffee,
    image: "/images/pack-maidstone.jpg",
    blurb:
      "The home of Tiffany's Tales — friendly faces, lively discussion and a fresh read every month. We meet the 1st Wednesday of every month at 7:30pm at The Muggleton Inn, High Street.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section id="hero" className="relative overflow-hidden bg-gradient-to-br from-primary to-plum text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <Badge
              variant="secondary"
              className="mb-5 gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide uppercase"
            >
              <PawPrint className="size-3.5" />
              Maidstone · United Kingdom
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-tight text-balance sm:text-5xl lg:text-6xl">
              Welcome to Tiffany&apos;s Tales Book Club
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-cream/85 lg:mx-0">
              I&apos;ve always loved the idea of a book club, and I am part of
              an online club, but I miss interacting with real people. At
              Tiffany&apos;s Tales, I believe in the power of stories to unite
              and inspire.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button
                variant="secondary"
                className="h-11 px-7 text-base"
                render={<Link href="/login" />}
              >
                Join my pack today!
              </Button>
              <Button
                variant="outline"
                className="h-11 border-cream/40 bg-transparent px-7 text-base text-cream hover:bg-cream/10 hover:text-cream"
                render={<a href="#book-of-the-month" />}
              >
                This month&apos;s read
              </Button>
            </div>
          </div>
          {/* The logo is always the hero centrepiece — never replaced by a photo. */}
          <div className="relative mx-auto flex aspect-square w-full max-w-sm items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-sage/25 blur-2xl" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-sage/30 to-cream/10" />
            <Logo
              size={360}
              priority
              className="relative size-full shadow-2xl ring-8 ring-cream/15"
            />
          </div>
        </div>
      </section>

      {/* Packs */}
      <section id="packs" className="bg-muted/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
              Our packs
            </p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Find Your Pack
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
              Pick the gathering that feels like home.
            </p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
            {packs.map((pack) => (
              <Card
                key={pack.name}
                className="gap-0 pt-0 transition-transform hover:-translate-y-1"
              >
                <div className="relative h-44 overflow-hidden">
                  <Image
                    src={pack.image}
                    alt={pack.name}
                    fill
                    sizes="(min-width: 640px) 22rem, 90vw"
                    className="object-cover"
                  />
                  <div className="absolute top-3 left-3 flex size-10 items-center justify-center rounded-full bg-background/85 shadow-sm backdrop-blur">
                    <pack.icon className="size-5 text-primary" />
                  </div>
                </div>
                <CardHeader className="pt-5">
                  <CardTitle className="font-display text-xl">
                    {pack.name}
                  </CardTitle>
                  <CardDescription>{pack.blurb}</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <Button
                    variant="link"
                    className="h-auto px-0"
                    render={<Link href="/contact" />}
                  >
                    More info
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Book of the Month */}
      <section id="book-of-the-month" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 rounded-3xl bg-plum p-10 text-cream sm:p-14 lg:grid-cols-[auto_1fr]">
          <div className="relative mx-auto aspect-[4/5] h-72 overflow-hidden rounded-xl shadow-2xl ring-1 ring-cream/10">
            <Image
              src="/images/book-of-month.jpg"
              alt="An open book beside a cup of coffee and reading glasses"
              fill
              sizes="15rem"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-sage uppercase">
              Book of the Month
            </p>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
              June&apos;s Pick
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-cream/80">
              Each month we choose a story to read and discuss together — from
              page-turning thrillers to heart-warming romances and everything in
              between. Grab a copy, find a comfy chair, and join the
              conversation.
            </p>
            <Button
              variant="secondary"
              className="mt-6 h-10 px-5"
              render={<Link href="/contact" />}
            >
              Ask about this month&apos;s read
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
