import Image from "next/image";
import {
  BookOpen,
  Check,
  Gift,
  MapPin,
  MessageCircle,
  Users,
} from "lucide-react";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = {
  title: "Book Club Benefits · Tiffany's Tales",
};

const benefits = [
  {
    icon: Users,
    image: "/images/benefit-connection.jpg",
    title: "Real Discussion",
    text: "Engaging discussions with fellow members, both online and at our monthly in-person meet-ups.",
  },
  {
    icon: BookOpen,
    image: "/images/benefit-story.jpg",
    title: "A New Book Every Month",
    text: "Receive a brand-new book each month at our in-person meetings — and help choose what we read next.",
  },
  {
    icon: Gift,
    image: "/images/benefit-discussion.jpg",
    title: "Treats & Community",
    text: "Bookish merchandise and treats, plus access to our Discord social platform to chat with the pack every day.",
  },
];

const included = [
  "Engaging discussions, online and in person",
  "Access to our Discord social platform",
  "Monthly in-person meet-ups",
  "A brand-new book every month at meetings",
  "Bookish merchandise and treats",
  "A genre pool of Crime/Thriller, Fantasy, Romance and Historical Fiction",
];

const meetups = [
  {
    pack: "Maidstone Pack",
    when: "1st Wednesday of every month, 7:30pm",
    where: "The Muggleton Inn, 8–9 High Street, Maidstone, ME14 1HJ",
  },
  {
    pack: "Sittingbourne Pack",
    when: "1st Monday of every month, 7:30pm",
    where: "The Jenny Wren, Staplehurst Road, Sittingbourne, ME10 5TA",
  },
];

export default function BenefitsPage() {
  return (
    <>
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
            Membership benefits
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Why Join the Pack?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            One simple membership — just £10 a month, with everything below
            included.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {benefits.map((b) => (
            <Card
              key={b.title}
              className="gap-0 overflow-hidden pt-0 text-center transition-shadow hover:shadow-md"
            >
              <div className="relative h-40 overflow-hidden">
                <Image
                  src={b.image}
                  alt={b.title}
                  fill
                  sizes="(min-width: 640px) 20rem, 90vw"
                  className="object-cover"
                />
                <div className="absolute bottom-0 left-1/2 flex size-12 -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full bg-background shadow-md ring-1 ring-foreground/10">
                  <b.icon className="size-5 text-primary" />
                </div>
              </div>
              <CardHeader className="items-center justify-items-center gap-2 pt-10">
                <CardTitle className="font-display text-xl">{b.title}</CardTitle>
                <CardDescription className="text-balance">
                  {b.text}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* What's included */}
      <section className="bg-muted/50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
              What&apos;s included
            </p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Everything you get for £10 a month
            </h2>
          </div>
          <ul className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
            {included.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="size-4 text-primary" />
                </span>
                <span className="text-sm leading-relaxed text-foreground/90">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Where we meet */}
      <section className="mx-auto max-w-4xl px-6 py-20">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
            Where we meet
          </p>
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Choose your pack
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Pick the gathering nearest you — both packs are the same £10 a month.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {meetups.map((m) => (
            <Card key={m.pack} className="gap-3">
              <CardHeader className="gap-2">
                <CardTitle className="font-display text-xl">{m.pack}</CardTitle>
                <CardDescription className="font-medium text-foreground/80">
                  {m.when}
                </CardDescription>
                <CardDescription className="flex items-start gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  {m.where}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
        <p className="mt-8 flex items-center justify-center gap-2 text-center text-sm text-muted-foreground">
          <MessageCircle className="size-4 text-primary" />
          Between meet-ups, the whole pack keeps chatting every day on Discord.
        </p>
      </section>
    </>
  );
}
