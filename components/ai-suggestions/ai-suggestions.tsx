"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RefreshCw, Sparkles, Wand2 } from "lucide-react";

import { generateSuggestionsAction } from "@/app/ai-suggestions/actions";
import type { StoredSuggestions } from "@/lib/ai-suggestions";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent } from "@/components/ui/card";

export function AiSuggestions({
  existing,
  enabled,
  onCooldown,
  nextAvailableAtMs,
}: {
  existing: StoredSuggestions | null;
  enabled: boolean;
  /** Server-computed: true while the member is inside the 24h cooldown. */
  onCooldown: boolean;
  /** Epoch ms the member may next regenerate, or null if they never have. */
  nextAvailableAtMs: number | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleGenerate() {
    startTransition(async () => {
      const res = await generateSuggestionsAction();
      if (res?.ok) {
        router.refresh();
        toast.success("Tiffany found some new picks for you.");
      } else if (res) {
        toast.error(res.error);
      }
    });
  }

  if (!enabled) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
          <Sparkles className="size-8 text-primary/60" />
          <p className="font-medium text-foreground">Not available yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Tiffany&apos;s AI suggestions aren&apos;t switched on right now.
            Check back soon — she&apos;ll be ready to pick books just for you.
          </p>
        </CardContent>
      </Card>
    );
  }

  const suggestions = existing?.suggestions ?? [];
  const hasSuggestions = suggestions.length > 0;
  const generatedAt = existing?.generatedAt
    ? new Date(existing.generatedAt)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Button
            type="button"
            className="h-10 w-fit"
            disabled={pending || onCooldown}
            onClick={handleGenerate}
          >
            {pending ? (
              <Spinner />
            ) : hasSuggestions ? (
              <RefreshCw data-icon="inline-start" />
            ) : (
              <Wand2 data-icon="inline-start" />
            )}
            {hasSuggestions ? "Refresh" : "Get suggestions"}
          </Button>
          {pending ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Tiffany is reading up on you… this takes a moment.
            </p>
          ) : generatedAt ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Last updated{" "}
              {generatedAt.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              {onCooldown && nextAvailableAtMs ? (
                <>
                  {" · "}New picks available{" "}
                  {new Date(nextAvailableAtMs).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      </div>

      {hasSuggestions ? (
        <ul className="flex flex-col gap-4">
          {suggestions.map((book, i) => (
            <li key={`${book.title}-${i}`}>
              <Card className="overflow-hidden py-0">
                <CardContent className="flex gap-4 p-4">
                  <BookCover
                    src={book.coverUrl}
                    title={book.title}
                    subtitle={book.author}
                    alt={book.title}
                    className="h-36 w-24 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold leading-snug text-foreground">
                      {book.title}
                    </p>
                    {book.author ? (
                      <p className="text-sm text-muted-foreground">
                        by {book.author}
                      </p>
                    ) : null}
                    <p className="mt-2 text-sm leading-relaxed text-foreground/90">
                      {book.reason}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Sparkles className="size-8 text-primary/60" />
            <p className="font-medium text-foreground">No suggestions yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Tap <span className="font-medium">Get suggestions</span> and
              Tiffany will read your profile and reading log, then track down a
              few books she thinks you&apos;ll love.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
