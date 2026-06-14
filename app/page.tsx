import Image from "next/image";

const navLinks = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Book Club Benefits", href: "#benefits" },
  { label: "Book of the Month", href: "#book-of-the-month" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
];

const packs = [
  {
    name: "Sittingbourne Pack",
    emoji: "📚",
    blurb:
      "Our Sittingbourne gathering meets monthly in a cosy local spot — settle in with a warm drink and good company while we talk books.",
  },
  {
    name: "Maidstone Pack",
    emoji: "☕",
    blurb:
      "The home of Tiffany's Tales. Friendly faces, lively discussion and a fresh read every month right here in Maidstone.",
  },
];

const benefits = [
  {
    icon: "🤝",
    title: "Real Connection",
    text: "Swap the screen for a sofa. Meet readers near you and build genuine friendships.",
  },
  {
    icon: "💬",
    title: "Lively Discussion",
    text: "Every voice matters. Share your take, hear new perspectives and dig into the story.",
  },
  {
    icon: "✨",
    title: "A Fresh Story",
    text: "A new book every month, chosen together — with plenty of room for your suggestions.",
  },
];

const faqs = [
  {
    q: "How often do we meet?",
    a: "We meet once a month. Each pack has its own evening, so you can pick the one that suits you best.",
  },
  {
    q: "Can I suggest a book?",
    a: "Absolutely — suggestions are always welcome! This club is built around the reads you'd love to talk about.",
  },
  {
    q: "How much does it cost?",
    a: "Only £10 a month. That covers your spot at the table and a wonderful new story to share.",
  },
  {
    q: "Do I need to be a fast reader?",
    a: "Not at all. Read at your own pace — the joy is in sharing the journey, not racing to the last page.",
  },
];

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
    <div id="home" className="font-sans text-ink">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-brand/15 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <a href="#home" className="flex items-center gap-2.5">
            <Logo size={44} priority className="ring-2 ring-brand-light/50" />
            <span className="font-display text-xl font-bold tracking-tight text-ink sm:text-2xl">
              Tiffany&apos;s Tales
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-muted lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-brand-dark"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-muted">
            <a
              href="#contact"
              className="hidden rounded-full bg-brand px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark sm:inline-block"
            >
              Join my pack
            </a>
            <span aria-hidden className="text-lg">
              🛒
            </span>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-soft to-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:py-28 lg:grid-cols-2">
          <div className="text-center lg:text-left">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-semibold uppercase tracking-[0.15em] text-brand-dark ring-1 ring-brand/15">
              <span aria-hidden>🐾</span> Maidstone · United Kingdom
            </p>
            <h1 className="font-display text-4xl font-bold leading-tight text-ink sm:text-5xl lg:text-6xl">
              Welcome to Tiffany&apos;s Tales Book Club
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted lg:mx-0">
              I&apos;ve always loved the idea of a book club. I&apos;m part of
              an online one, but I missed the warmth of real people in the same
              room. So I started this — a place to share stories, make friends
              and rediscover the joy of reading together.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
              <a
                href="#packs"
                className="rounded-full bg-brand px-7 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
              >
                Join my pack today!
              </a>
              <a
                href="#book-of-the-month"
                className="rounded-full border border-brand/30 px-7 py-3 text-base font-semibold text-brand-dark transition-colors hover:bg-brand-soft"
              >
                This month&apos;s read
              </a>
            </div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-0 rotate-3 rounded-3xl bg-gradient-to-br from-brand to-brand-light" />
            <div className="absolute inset-0 -rotate-2 rounded-3xl border border-brand/25 bg-cream/70" />
            <div className="relative flex h-full flex-col items-center justify-center gap-4 rounded-3xl bg-white/80 p-10 text-center shadow-sm">
              <Logo
                size={176}
                priority
                className="shadow-md ring-4 ring-brand-light/40"
              />
              <p className="font-display text-2xl font-semibold text-ink">
                A love for reading &amp; a sense of belonging
              </p>
              <p className="text-sm text-muted">
                Good books. Good people. Good conversation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
            Why Join the Pack?
          </h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-brand/15 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-3xl">
                {b.icon}
              </div>
              <h3 className="font-display text-xl font-semibold text-ink">
                {b.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted">{b.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Packs / Services */}
      <section id="packs" className="bg-parchment/70 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Find Your Pack
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              Pick the gathering that feels like home.
            </p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-2">
            {packs.map((pack) => (
              <article
                key={pack.name}
                className="overflow-hidden rounded-2xl border border-brand/15 bg-white shadow-sm transition-transform hover:-translate-y-1"
              >
                <div className="flex h-44 items-center justify-center bg-gradient-to-br from-brand-soft to-sage/40 text-6xl">
                  {pack.emoji}
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl font-semibold text-ink">
                    {pack.name}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    {pack.blurb}
                  </p>
                  <a
                    href="#contact"
                    className="mt-4 inline-block text-sm font-semibold text-brand-dark hover:underline"
                  >
                    More info →
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Book of the Month */}
      <section id="book-of-the-month" className="mx-auto max-w-6xl px-6 py-20">
        <div className="grid items-center gap-12 rounded-3xl bg-forest p-10 text-cream sm:p-14 lg:grid-cols-[auto_1fr]">
          <div className="mx-auto flex h-64 w-44 items-center justify-center rounded-lg bg-gradient-to-br from-brand-light to-brand text-6xl shadow-lg">
            📕
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-light">
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
            <a
              href="#contact"
              className="mt-6 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Ask about this month&apos;s read
            </a>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-parchment/70 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center font-display text-3xl font-bold text-ink sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <div className="mt-10 space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-brand/15 bg-white p-5 shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-display text-lg font-semibold text-ink">
                  {faq.q}
                  <span className="text-brand transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial / Reviews */}
      <section id="reviews" className="mx-auto max-w-4xl px-6 py-20 text-center">
        <span className="font-display text-6xl leading-none text-brand-light">
          &ldquo;
        </span>
        <blockquote className="mt-2 font-display text-2xl font-medium leading-relaxed text-ink sm:text-3xl">
          Being part of Tiffany&apos;s Tales has reignited my passion for
          reading — and given me a wonderful new circle of friends.
        </blockquote>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.15em] text-muted">
          — A happy member
        </p>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-parchment/70 py-20">
        <div className="mx-auto max-w-2xl px-6">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold text-ink sm:text-4xl">
              Get in Touch
            </h2>
            <p className="mt-3 text-muted">
              Got a question or want to join a pack? Drop me a message — I&apos;d
              love to hear from you.
            </p>
          </div>
          <form className="space-y-5 rounded-2xl border border-brand/15 bg-white p-8 shadow-sm">
            <div>
              <label
                htmlFor="name"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                className="w-full rounded-lg border border-brand/20 bg-cream px-4 py-2.5 text-ink outline-none focus:border-brand"
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="w-full rounded-lg border border-brand/20 bg-cream px-4 py-2.5 text-ink outline-none focus:border-brand"
              />
            </div>
            <div>
              <label
                htmlFor="message"
                className="mb-1 block text-sm font-medium text-ink"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                className="w-full rounded-lg border border-brand/20 bg-cream px-4 py-2.5 text-ink outline-none focus:border-brand"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-full bg-brand px-6 py-3 font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest py-12 text-cream/80">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 text-center">
          <div className="flex items-center gap-2.5">
            <Logo size={44} className="ring-2 ring-brand-light/50" />
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
            className="text-sm font-medium text-sage transition-colors hover:text-cream"
          >
            Follow on Instagram
          </a>
          <p className="mt-4 text-xs text-cream/50">
            © {new Date().getFullYear()} Tiffany&apos;s Tales Book Club. A cosy
            corner for book lovers.
          </p>
        </div>
      </footer>
    </div>
  );
}
