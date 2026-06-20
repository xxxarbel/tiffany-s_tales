import { PawPrint, Star } from "lucide-react";

import { getPublicReviews, type GoodreadsBookRow } from "@/lib/goodreads";
import { getPublicInstagramPosts } from "@/lib/instagram";
import { Card } from "@/components/ui/card";
import { BookCover } from "@/components/book-cover";
import { InstagramPostCard } from "@/components/instagram-post-card";
import { InstagramIcon } from "@/components/icons/instagram-icon";

export const metadata = {
  title: "Book Reviews · Tiffany's Tales",
};

function formatDateRead(value: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`Rated ${rating} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={
            i < rating
              ? "size-4 fill-current text-primary"
              : "size-4 text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

function ReviewCard({ book }: { book: GoodreadsBookRow }) {
  const dateRead = formatDateRead(book.dateRead);
  return (
    <Card className="gap-0 p-0">
      <div className="flex gap-4 p-5">
        <BookCover
          src={book.coverUrl}
          alt={`Cover of ${book.title}`}
          title={book.title}
          subtitle={book.author}
          className="h-28 w-20 shrink-0 rounded-md shadow-sm"
        />
        <div className="flex min-w-0 flex-col gap-1.5">
          <h3 className="font-display text-lg leading-snug font-semibold">
            {book.title}
          </h3>
          {book.author ? (
            <p className="text-sm text-muted-foreground">{book.author}</p>
          ) : null}
          {book.myRating ? <StarRating rating={book.myRating} /> : null}
          {dateRead ? (
            <p className="mt-auto text-xs text-muted-foreground">
              Read {dateRead}
            </p>
          ) : null}
        </div>
      </div>
      {book.myReview ? (
        <p className="border-t px-5 py-4 text-sm leading-relaxed whitespace-pre-line">
          {book.myReview}
        </p>
      ) : null}
    </Card>
  );
}

export default async function ReviewsPage() {
  const [books, instagramPosts] = await Promise.all([
    getPublicReviews(),
    getPublicInstagramPosts(),
  ]);

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

      <Card className="mb-10 justify-center gap-5 bg-primary p-8 text-primary-foreground sm:p-10">
        <PawPrint className="size-8 text-sage" />
        <blockquote className="font-display text-xl leading-relaxed font-medium text-balance sm:text-2xl">
          Being part of Tiffany&apos;s Tales Book Club has reignited my passion
          for reading and introduced me to a wonderful community of like-minded
          individuals. I look forward to our meetings every month!
        </blockquote>
        <p className="text-sm font-semibold tracking-[0.15em] text-primary-foreground/70 uppercase">
          — A happy member
        </p>
      </Card>

      {books.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2">
          {books.map((book) => (
            <ReviewCard key={book.id} book={book} />
          ))}
        </div>
      ) : (
        <Card className="items-center gap-2 bg-secondary p-10 text-center text-secondary-foreground">
          <PawPrint className="size-7 text-primary" />
          <p className="font-display text-lg font-semibold">
            Our reviews are on their way
          </p>
          <p className="max-w-md text-sm text-muted-foreground">
            We&apos;re busy reading! Check back soon to see what the pack has
            been enjoying.
          </p>
        </Card>
      )}

      {instagramPosts.length > 0 ? (
        <div className="mt-16">
          <div className="mb-6 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
              <InstagramIcon className="size-5" />
            </span>
            <div>
              <h2 className="font-display text-xl font-bold sm:text-2xl">
                From Instagram @tiffanystales
              </h2>
              <p className="text-sm text-muted-foreground">
                The latest reviews straight from Riette&apos;s Instagram.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {instagramPosts.map((post) => (
              <InstagramPostCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
