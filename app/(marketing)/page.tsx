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
import { BookCover } from "@/components/book-cover";
import { getBookOfMonth } from "@/lib/book-of-the-month";

// Each pack meets at a real venue. Exterior shots are Creative Commons photos
// from Geograph (CC BY-SA 2.0) — credited under each image as the licence
// requires. The Muggleton interior is Riette's own meet-up photo. Each tile
// shows what the venue looks like, then links to /login (the Subscribe page).
const packs = [
  {
    name: "Sittingbourne Pack",
    icon: BookOpen,
    venue: "The Jenny Wren",
    blurb:
      "Settle in with a warm drink and good company while we talk books. We meet the 1st Monday of every month at 7:30pm at The Jenny Wren, Staplehurst Road.",
    photos: [
      {
        src: "/images/venue-jennywren-exterior.jpg",
        label: "Outside",
        alt: "The Jenny Wren, Sittingbourne — exterior",
        credit: "© David Anstiss (CC BY-SA 2.0)",
      },
    ],
  },
  {
    name: "Maidstone Pack",
    icon: Coffee,
    venue: "The Muggleton Inn",
    blurb:
      "The home of Tiffany's Tales — friendly faces, lively discussion and a fresh read every month. We meet the 1st Wednesday of every month at 7:30pm at The Muggleton Inn, High Street.",
    photos: [
      {
        src: "/images/venue-muggleton-exterior.jpg",
        label: "Outside",
        alt: "The Muggleton Inn, Maidstone — exterior",
        credit: "© Paul Gillett (CC BY-SA 2.0)",
      },
      {
        src: "/images/riette-meetup-2.jpg",
        label: "Inside",
        alt: "Inside The Muggleton Inn during a Tiffany's Tales meet-up",
        credit: null,
      },
    ],
  },
];

export default async function HomePage() {
  // The owner-curated Book of the Month (same source as /admin and the
  // /book-of-the-month page). Show the real pick when a title has been set,
  // otherwise fall back to the generic invitation copy.
  const pick = await getBookOfMonth();
  const hasPick = pick.title.trim().length > 0;

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
              // The whole tile is a link to the Subscribe page (/login).
              <Link
                key={pack.name}
                href="/login"
                aria-label={`Subscribe — ${pack.name}`}
                className="group block"
              >
                <Card className="h-full gap-0 overflow-hidden pt-0 transition-transform group-hover:-translate-y-1">
                {/* Venue photo strip: exterior (+ interior when we have one) so
                    visitors can see what the place looks like. */}
                <div
                  className={`grid h-44 gap-px overflow-hidden bg-border ${
                    pack.photos.length > 1 ? "grid-cols-2" : "grid-cols-1"
                  }`}
                >
                  {pack.photos.map((photo, i) => (
                    <div key={photo.src} className="relative overflow-hidden">
                      <Image
                        src={photo.src}
                        alt={photo.alt}
                        fill
                        sizes="(min-width: 640px) 11rem, 45vw"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {/* Pack icon over the first photo only. */}
                      {i === 0 ? (
                        <div className="absolute top-3 left-3 flex size-10 items-center justify-center rounded-full bg-background/85 shadow-sm backdrop-blur">
                          <pack.icon className="size-5 text-primary" />
                        </div>
                      ) : null}
                      {/* Outside / Inside label. */}
                      <span className="absolute top-3 right-3 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground backdrop-blur">
                        {photo.label}
                      </span>
                      {/* CC BY-SA attribution, required by the photo licence. */}
                      {photo.credit ? (
                        <span className="absolute right-0 bottom-0 max-w-full truncate rounded-tl-md bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground backdrop-blur">
                          {photo.credit}
                        </span>
                      ) : null}
                    </div>
                  ))}
                </div>
                <CardHeader className="pt-5">
                  <CardTitle className="font-display text-xl">
                    {pack.name}
                  </CardTitle>
                  <CardDescription>
                    <span className="font-medium text-foreground">
                      {pack.venue}
                    </span>
                    {" — "}
                    {pack.blurb}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <span className="inline-flex h-auto items-center px-0 text-sm font-medium text-primary">
                    Subscribe to join this pack
                    <ArrowRight
                      data-icon="inline-end"
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* From our meet-ups — real photos of Riette hosting a gathering, books
          and goodie bags laid out on the table. */}
      <section id="meetups" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
            From our meet-ups
          </p>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Pull up a chair
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            A peek at one of our gatherings — this month&apos;s reads on the
            table, a little something for everyone, and good company all around.
          </p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2">
          <div className="relative aspect-[3/4] overflow-hidden rounded-3xl shadow-md ring-1 ring-foreground/10">
            <Image
              src="/images/riette-meetup-1.jpg"
              alt="Riette hosting a Tiffany's Tales meet-up, books and goodie bags set out on the table"
              fill
              sizes="(min-width: 640px) 28rem, 90vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-3xl shadow-md ring-1 ring-foreground/10 sm:mt-12">
            <Image
              src="/images/riette-meetup-2.jpg"
              alt="A meet-up table set with the month's books and Tiffany's Tales goodie bags"
              fill
              sizes="(min-width: 640px) 28rem, 90vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>

      {/* Book of the Month — pulled live from the admin-curated pick. */}
      <section id="book-of-the-month" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 rounded-3xl bg-plum p-10 text-cream sm:p-14 lg:grid-cols-[auto_1fr]">
          <div className="relative mx-auto aspect-[2/3] h-72 overflow-hidden rounded-xl shadow-2xl ring-1 ring-cream/10">
            {hasPick ? (
              <BookCover
                src={pick.coverUrl || null}
                alt={`Cover of ${pick.title}`}
                title={pick.title}
                subtitle={pick.author || null}
                className="h-full w-full"
              />
            ) : (
              <Image
                src="/images/book-of-month.jpg"
                alt="An open book beside a cup of coffee and reading glasses"
                fill
                sizes="12rem"
                className="object-cover"
              />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold tracking-[0.2em] text-sage uppercase">
              Book of the Month{pick.month ? ` · ${pick.month}` : ""}
            </p>
            {hasPick ? (
              <>
                <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                  {pick.title}
                </h2>
                {pick.author ? (
                  <p className="mt-1 text-lg text-cream/70">by {pick.author}</p>
                ) : null}
                {pick.description ? (
                  <p className="mt-4 line-clamp-4 max-w-xl leading-relaxed text-cream/80">
                    {pick.description}
                  </p>
                ) : null}
                <Button
                  variant="secondary"
                  className="mt-6 h-10 px-5"
                  render={<Link href="/book-of-the-month" />}
                >
                  See this month&apos;s read
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </>
            ) : (
              <>
                <h2 className="mt-2 font-display text-3xl font-bold sm:text-4xl">
                  This month&apos;s pick
                </h2>
                <p className="mt-4 max-w-xl leading-relaxed text-cream/80">
                  Each month we choose a story to read and discuss together —
                  from page-turning thrillers to heart-warming romances and
                  everything in between. Grab a copy, find a comfy chair, and
                  join the conversation.
                </p>
                <Button
                  variant="secondary"
                  className="mt-6 h-10 px-5"
                  render={<Link href="/book-of-the-month" />}
                >
                  See this month&apos;s read
                  <ArrowRight data-icon="inline-end" />
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
