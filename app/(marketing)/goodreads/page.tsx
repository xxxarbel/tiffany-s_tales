import { BookOpen, BookMarked, Star } from "lucide-react";

import { getPublicBookshelf, type GoodreadsBookRow } from "@/lib/goodreads";
import { Card } from "@/components/ui/card";
import { BookCover } from "@/components/book-cover";

export const metadata = {
  title: "Good Reads · Tiffany's Tales",
};

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
              ? "size-3.5 fill-current text-primary"
              : "size-3.5 text-muted-foreground/30"
          }
        />
      ))}
    </div>
  );
}

function BookTile({ book }: { book: GoodreadsBookRow }) {
  return (
    <div className="flex flex-col gap-2">
      <BookCover
        src={book.coverUrl}
        alt={`Cover of ${book.title}`}
        title={book.title}
        subtitle={book.author}
        className="aspect-[2/3] w-full rounded-md shadow-sm"
      />
      <div className="flex flex-col gap-0.5">
        <p className="line-clamp-2 text-sm leading-snug font-semibold">
          {book.title}
        </p>
        {book.author ? (
          <p className="line-clamp-1 text-xs text-muted-foreground">
            {book.author}
          </p>
        ) : null}
        {book.myRating ? <StarRating rating={book.myRating} /> : null}
      </div>
    </div>
  );
}

function Shelf({
  title,
  description,
  icon,
  books,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  books: GoodreadsBookRow[];
}) {
  if (books.length === 0) return null;
  return (
    <div>
      <div className="mb-5 flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-primary">
          {icon}
        </span>
        <div>
          <h2 className="font-display text-xl font-bold sm:text-2xl">
            {title}
            <span className="ml-2 text-base font-normal text-muted-foreground tabular-nums">
              {books.length}
            </span>
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-x-5 gap-y-7 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
        {books.map((book) => (
          <BookTile key={book.id} book={book} />
        ))}
      </div>
    </div>
  );
}

export default async function GoodreadsPage() {
  const { read, currentlyReading, toRead } = await getPublicBookshelf();
  const hasBooks =
    read.length > 0 || currentlyReading.length > 0 || toRead.length > 0;

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-14 text-center">
        <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
          From the shelf
        </p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Good Reads
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Every book Riette has read and everything on her to-read pile — straight
          from her Goodreads shelves.
        </p>
      </div>

      {hasBooks ? (
        <div className="space-y-16">
          <Shelf
            title="Currently reading"
            description="What Riette has her nose in right now."
            icon={<BookOpen className="size-5" />}
            books={currentlyReading}
          />
          <Shelf
            title="Read"
            description="Books Riette has finished and rated."
            icon={<Star className="size-5" />}
            books={read}
          />
          <Shelf
            title="Want to read"
            description="On the to-read pile — maybe a future club pick."
            icon={<BookMarked className="size-5" />}
            books={toRead}
          />
        </div>
      ) : (
        <Card className="mx-auto max-w-md items-center gap-2 bg-secondary p-10 text-center text-secondary-foreground">
          <BookMarked className="size-7 text-primary" />
          <p className="font-display text-lg font-semibold">
            The shelf is being stocked
          </p>
          <p className="text-sm text-muted-foreground">
            Riette&apos;s Goodreads books will appear here soon. Check back shortly!
          </p>
        </Card>
      )}
    </section>
  );
}
