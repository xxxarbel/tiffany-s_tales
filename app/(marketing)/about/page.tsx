import Image from "next/image";
import { Coffee, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const metadata = {
  title: "About · Tiffany's Tales",
};

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

export default function AboutPage() {
  return (
    <>
      {/* About */}
      <section className="mx-auto max-w-6xl px-6 py-20">
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
            <h1 className="font-display text-3xl font-bold sm:text-4xl">
              Your literary sanctuary
            </h1>
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

      {/* FAQ */}
      <section className="bg-muted/50 py-20">
        <div className="mx-auto max-w-3xl px-6">
          <div className="text-center">
            <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
              Good to know
            </p>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Frequently Asked Questions
            </h2>
          </div>
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
    </>
  );
}
