import Link from "next/link";

import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { InstagramIcon } from "@/components/icons/instagram-icon";

export function SiteFooter() {
  return (
    <footer className="bg-plum text-cream/80">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Link href="/" className="flex w-fit items-center gap-2.5">
              <Logo size={44} className="ring-2 ring-sage/50" />
              <span className="font-display text-xl font-bold text-cream">
                Tiffany&apos;s Tales
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-cream/70">
              A cosy book club bringing readers together to share stories,
              friendship and a love of books. Join my pack today!
            </p>
          </div>

          {/* Explore */}
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wide text-cream uppercase">
              Explore
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm">
              <li>
                <Link href="/about" className="transition-colors hover:text-cream">
                  About
                </Link>
              </li>
              <li>
                <Link
                  href="/benefits"
                  className="transition-colors hover:text-cream"
                >
                  Book Club Benefits
                </Link>
              </li>
              <li>
                <Link
                  href="/reviews"
                  className="transition-colors hover:text-cream"
                >
                  Book Reviews
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-cream">
                  Join / Log in
                </Link>
              </li>
            </ul>
          </div>

          {/* Visit & follow */}
          <div>
            <h3 className="font-display text-sm font-semibold tracking-wide text-cream uppercase">
              Visit
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-cream/70">
              Maidstone,
              <br />
              United Kingdom
            </p>
            <a
              href="https://www.instagram.com/tiffanystales/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-sage transition-colors hover:text-cream"
            >
              <InstagramIcon className="size-4" />
              Follow on Instagram
            </a>
          </div>
        </div>

        <Separator className="my-8 bg-cream/15" />

        <p className="text-center text-xs text-cream/50">
          © {new Date().getFullYear()} Tiffany&apos;s Tales Book Club ·
          Maidstone, United Kingdom
        </p>
      </div>
    </footer>
  );
}
