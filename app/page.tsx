import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  Coffee,
  MessageCircle,
  PawPrint,
  ShoppingBag,
  Sparkles,
  Star,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { ContactForm } from "@/components/contact-form";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Book Club Benefits", href: "#benefits" },
  { label: "Book Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
];

const benefits = [
  {
    icon: Users,
    title: "Real Connection",
    text: "Swap the screen for a sofa. Meet readers near you and build genuine friendships.",
  },
  {
    icon: MessageCircle,
    title: "Lively Discussion",
    text: "Every voice matters. Share your take, hear new perspectives and dig into the story.",
  },
  {
    icon: Sparkles,
    title: "A Fresh Story",
    text: "A new book every month, chosen together — with plenty of room for your suggestions.",
  },
];

const packs = [
  {
    name: "Sittingbourne Pack",
    icon: BookOpen,
    image: "/images/reading-cozy.jpg",
    blurb:
      "Our Sittingbourne gathering meets monthly in a cosy local spot — settle in with a warm drink and good company while we talk books.",
  },
  {
    name: "Maidstone Pack",
    icon: Coffee,
    image: "/images/pack-maidstone.jpg",
    blurb:
      "The home of Tiffany's Tales. Friendly faces, lively discussion and a fresh read every month right here in Maidstone.",
  },
];

const faqs = [
  {
    q: "How often do you meet?",
    a: "We meet once a month for book discussions, and we have a Discord group where we can chat every day.",
  },
  {
    q: "Can I suggest a book for discussion?",
    a: "Yes, we welcome book suggestions from our members to ensure diverse and engaging discussions.",
  },
  {
    q: "How much does it cost?",
    a: "Only £10 a month!",
  },
];

function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

function Logo({
  size,
  className = "",
  priority = false,
}: {
  size: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/logo.jpg"
      alt="Tiffany's Tales — book club logo featuring a chihuahua on an open book"
      width={size}
      height={size}
      priority={priority}
      className={`rounded-full object-cover ${className}`}
    />
  );
}

export default function Home() {
  return (
    <div id="home" className="font-sans text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <a href="#home" className="flex items-center gap-2.5">
            <Logo size={40} priority className="ring-2 ring-primary/25" />
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
            <Button
              className="hidden h-9 px-4 sm:inline-flex"
              render={<a href="#contact" />}
            >
              Join my pack
            </Button>
            <Button variant="ghost" size="icon" aria-label="Cart">
              <ShoppingBag />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary to-plum text-cream">
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
                render={<a href="#packs" />}
              >
                Join my pack today!
              </Button>
              <Button
                variant="outline"
                className="h-11 px-7 text-base"
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

      {/* About */}
      <section id="about" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl shadow-md ring-1 ring-foreground/10">
            <Image
              src="/images/community.jpg"
              alt="Shelves filled with beautifully bound books"
              fill
              sizes="(min-width: 1024px) 32rem, 90vw"
              className="object-cover"
            />
          </div>
          <div>
            <Badge
              variant="secondary"
              className="mb-4 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase"
            >
              About the club
            </Badge>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Your literary sanctuary
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              Our book club is a vibrant hub where bookworms from all walks of
              life come together to celebrate the written word. From
              thought-provoking discussions to laid-back chatting about nothing,
              our community fosters a love for reading and a sense of belonging
              — whether you seek literary recommendations, lively debates, or
              simply a place to express your passion for books.
            </p>
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-4">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-primary" />
                <span className="text-sm font-medium">All readers welcome</span>
              </div>
              <div className="flex items-center gap-2">
                <Coffee className="size-5 text-primary" />
                <span className="text-sm font-medium">Monthly meet-ups</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <span className="text-sm font-medium">Just £10 a month</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Why Join the Pack?
          </h2>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {benefits.map((b) => (
            <Card key={b.title} className="text-center transition-shadow hover:shadow-md">
              <CardHeader className="items-center justify-items-center gap-3">
                <div className="flex size-14 items-center justify-center rounded-full bg-secondary">
                  <b.icon className="size-6 text-primary" />
                </div>
                <CardTitle className="font-display text-xl">{b.title}</CardTitle>
                <CardDescription className="text-balance">
                  {b.text}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* Packs */}
      <section id="packs" className="bg-muted/50 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
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
                    render={<a href="#contact" />}
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
              render={<a href="#contact" />}
            >
              Ask about this month&apos;s read
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-muted/50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-display text-3xl font-bold sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <Accordion className="mt-10">
            {faqs.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="font-display text-base font-semibold">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Book Reviews */}
      <section id="reviews" className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">
            Book Reviews
          </h2>
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

      {/* Contact */}
      <section id="contact" className="bg-muted/50 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Contact us
            </h2>
            <p className="mt-3 text-muted-foreground">
              Have a question or want to join our in-person book club? Feel free
              to reach out using the form below!
            </p>
          </div>
          <Card className="p-2">
            <CardContent className="p-6">
              <ContactForm />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-plum py-12 text-cream/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center">
          <div className="flex items-center gap-2.5">
            <Logo size={40} className="ring-2 ring-sage/50" />
            <span className="font-display text-xl font-bold text-cream">
              Tiffany&apos;s Tales
            </span>
          </div>
          <p className="text-sm">
            Tiffany&apos;s Tales · Maidstone · United Kingdom
          </p>
          <a
            href="https://www.instagram.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-sage transition-colors hover:text-cream"
          >
            <InstagramIcon className="size-4" />
            Follow on Instagram
          </a>
          <Separator className="my-2 max-w-xs bg-cream/15" />
          <p className="text-xs text-cream/50">
            © {new Date().getFullYear()} Tiffany&apos;s Tales Book Club ·
            Maidstone, United Kingdom
          </p>
        </div>
      </footer>
    </div>
  );
}
