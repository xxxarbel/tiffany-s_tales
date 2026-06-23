"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookHeart, PawPrint, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  addBookAction,
  deleteBookAction,
  updateRatingAction,
  type LogState,
} from "@/app/log-a-book/actions";
import type { BookLogRow } from "@/lib/book-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

/**
 * Five-paw rating control. Interactive by default (click a paw to set, click the
 * same paw again to clear); pass `readOnly` for a static display. When `name` is
 * set it renders a hidden input so the value posts with a form.
 */
function PawRating({
  value,
  onChange,
  name,
  readOnly = false,
  className,
}: {
  value: number;
  onChange?: (value: number) => void;
  name?: string;
  readOnly?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      role={readOnly ? "img" : "radiogroup"}
      aria-label={
        readOnly
          ? value
            ? `Rated ${value} out of 5 paws`
            : "Not yet rated"
          : "Rate from one to five paws"
      }
    >
      {name ? <input type="hidden" name={name} value={value} /> : null}
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= shown;
        const Paw = (
          <PawPrint
            className={cn(
              "size-5 transition-colors",
              filled ? "fill-primary text-primary" : "text-muted-foreground/40"
            )}
          />
        );
        if (readOnly) {
          return (
            <span key={n} aria-hidden>
              {Paw}
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} paw${n > 1 ? "s" : ""}`}
            aria-pressed={value === n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onFocus={() => setHover(n)}
            onBlur={() => setHover(0)}
            onClick={() => onChange?.(value === n ? 0 : n)}
            className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {Paw}
          </button>
        );
      })}
    </div>
  );
}

function BookLogRowItem({
  entry,
  busy,
  onRate,
  onDelete,
}: {
  entry: BookLogRow;
  busy: boolean;
  onRate: (id: string, rating: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{entry.title}</p>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {entry.author ? (
            <p className="truncate text-sm text-muted-foreground">
              by {entry.author}
            </p>
          ) : null}
          {entry.genre ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {entry.genre}
            </span>
          ) : null}
        </div>
      </div>
      <PawRating
        value={entry.rating ?? 0}
        onChange={(rating) => onRate(entry.id, rating)}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove ${entry.title}`}
        disabled={busy}
        onClick={() => onDelete(entry.id)}
        className="text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="size-4" />
      </Button>
    </li>
  );
}

export function BookLog({ entries }: { entries: BookLogRow[] }) {
  const router = useRouter();
  const [pendingRow, startRowTransition] = useTransition();

  // Add-book form (server action via useActionState). Inputs are controlled so
  // they can be cleared after a successful add.
  const [state, formAction, adding] = useActionState<LogState, FormData>(
    addBookAction,
    null
  );
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [genre, setGenre] = useState("");
  const [rating, setRating] = useState(0);
  const [handledToken, setHandledToken] = useState<string | null>(null);

  // Clear the form once per successful add. Adjusting state during render (guarded
  // by the token so it runs once) is React's recommended alternative to calling
  // setState inside an effect.
  if (state?.ok && state.token !== handledToken) {
    setHandledToken(state.token);
    setTitle("");
    setAuthor("");
    setGenre("");
    setRating(0);
  }

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Book added to your log.");
    else toast.error(state.error);
  }, [state]);

  function handleRate(id: string, value: number) {
    startRowTransition(async () => {
      const res = await updateRatingAction(id, value);
      if (res.ok) router.refresh();
      else toast.error("Couldn't update that rating. Please try again.");
    });
  }

  function handleDelete(id: string) {
    startRowTransition(async () => {
      const res = await deleteBookAction(id);
      if (res.ok) {
        router.refresh();
        toast.success("Book removed from your log.");
      } else {
        toast.error("Couldn't remove that book. Please try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Add a book */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg">Add a book</CardTitle>
          <CardDescription>
            What did you read? Give it a paw rating if you&apos;d like.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="title">Title</FieldLabel>
                  <Input
                    id="title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="The Midnight Library"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="author">Author</FieldLabel>
                  <Input
                    id="author"
                    name="author"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="Matt Haig"
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="genre">Genre</FieldLabel>
                <Input
                  id="genre"
                  name="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Fiction, fantasy, memoir…"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="rating">Your rating</FieldLabel>
                <PawRating name="rating" value={rating} onChange={setRating} />
              </Field>
              <Button type="submit" className="h-10 w-fit" disabled={adding}>
                {adding ? <Spinner /> : <Plus data-icon="inline-start" />}
                Add to my log
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {/* The log */}
      <Card className="gap-0 py-0">
        <CardHeader className="border-b py-4">
          <CardTitle className="font-display text-lg">
            Your reading log
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
              {entries.length}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length > 0 ? (
            <ul className="divide-y">
              {entries.map((entry) => (
                <BookLogRowItem
                  key={entry.id}
                  entry={entry}
                  busy={pendingRow}
                  onRate={handleRate}
                  onDelete={handleDelete}
                />
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <BookHeart className="size-8 text-primary/60" />
              <p className="font-medium text-foreground">No books yet</p>
              <p className="max-w-xs text-sm text-muted-foreground">
                Add the first book you&apos;ve read above — it&apos;ll show up
                here with its paw rating.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
