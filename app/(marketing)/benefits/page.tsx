import Image from "next/image";
import { MessageCircle, Sparkles, Users } from "lucide-react";

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
    title: "Real Connection",
    text: "Swap the screen for a sofa. Meet readers near you and build genuine friendships.",
  },
  {
    icon: MessageCircle,
    image: "/images/benefit-discussion.jpg",
    title: "Lively Discussion",
    text: "Every voice matters. Share your take, hear new perspectives and dig into the story.",
  },
  {
    icon: Sparkles,
    image: "/images/benefit-story.jpg",
    title: "A Fresh Story",
    text: "A new book every month, chosen together — with plenty of room for your suggestions.",
  },
];

export default function BenefitsPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-12 text-center">
        <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
          Membership benefits
        </p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Why Join the Pack?
        </h1>
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
  );
}
