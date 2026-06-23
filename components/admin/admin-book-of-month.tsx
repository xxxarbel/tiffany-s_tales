"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import {
  saveBookOfMonthAction,
  type SettingsState,
} from "@/app/admin/actions";
import { type BookOfMonth } from "@/lib/book-of-the-month";
import { BookCover } from "@/components/book-cover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";

export function AdminBookOfMonth({ book }: { book: BookOfMonth }) {
  const [draft, setDraft] = useState<BookOfMonth>(book);
  const [state, formAction, pending] = useActionState<SettingsState, FormData>(
    saveBookOfMonthAction,
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Book of the Month saved.");
    else if (state.error) toast.error(state.error);
  }, [state]);

  function set<K extends keyof BookOfMonth>(key: K, value: BookOfMonth[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="font-display text-xl">Book of the Month</CardTitle>
        <CardDescription>
          Choose the book the pack is reading this month. It appears on the
          public “Book of the Month” page. Leave “Published” off to prepare next
          month&apos;s pick in advance.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction}>
          {/* Base UI checkbox isn't a native control, so submit via a hidden input. */}
          <input
            type="hidden"
            name="published"
            value={draft.published ? "true" : "false"}
          />
          <FieldGroup>
            {/* Publish toggle */}
            <Field>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="published"
                  checked={draft.published}
                  onCheckedChange={(checked) =>
                    set("published", checked === true)
                  }
                />
                <FieldLabel htmlFor="published" className="mb-0">
                  Published — visible on the site
                </FieldLabel>
              </div>
              <FieldDescription>
                When off, visitors see a “coming soon” message instead.
              </FieldDescription>
            </Field>

            {/* Month + title */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="month">Month</FieldLabel>
                <Input
                  id="month"
                  name="month"
                  value={draft.month}
                  onChange={(e) => set("month", e.target.value)}
                  placeholder="June 2026"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="title">Book title</FieldLabel>
                <Input
                  id="title"
                  name="title"
                  value={draft.title}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Project Hail Mary"
                  required
                />
              </Field>
            </div>

            {/* Author */}
            <Field>
              <FieldLabel htmlFor="author">Author</FieldLabel>
              <Input
                id="author"
                name="author"
                value={draft.author}
                onChange={(e) => set("author", e.target.value)}
                placeholder="Andy Weir"
              />
            </Field>

            {/* Cover URL + live preview */}
            <Field>
              <FieldLabel htmlFor="coverUrl">Cover image</FieldLabel>
              <div className="flex items-start gap-3">
                <div className="aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-md border">
                  <BookCover
                    src={draft.coverUrl || null}
                    alt="Cover preview"
                    title={draft.title || "Cover"}
                    subtitle={draft.author || null}
                    className="h-full w-full"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    id="coverUrl"
                    name="coverUrl"
                    value={draft.coverUrl}
                    onChange={(e) => set("coverUrl", e.target.value)}
                    placeholder="https://…/cover.jpg"
                  />
                  <FieldDescription className="mt-2">
                    Paste a cover image URL, or leave it blank and we&apos;ll
                    try to find one automatically from the title and author.
                  </FieldDescription>
                </div>
              </div>
            </Field>

            {/* Description */}
            <Field>
              <FieldLabel htmlFor="description">
                What it&apos;s about
              </FieldLabel>
              <Textarea
                id="description"
                name="description"
                rows={5}
                value={draft.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="A short synopsis of the book…"
              />
              <FieldDescription>
                The blurb shown beside the cover.
              </FieldDescription>
            </Field>

            {/* Why picked */}
            <Field>
              <FieldLabel htmlFor="whyPicked">Why we picked it</FieldLabel>
              <Textarea
                id="whyPicked"
                name="whyPicked"
                rows={3}
                value={draft.whyPicked}
                onChange={(e) => set("whyPicked", e.target.value)}
                placeholder="A note on why this book was chosen…"
              />
              <FieldDescription>
                Optional — shown in its own card on the page.
              </FieldDescription>
            </Field>

            {/* Meeting info */}
            <Field>
              <FieldLabel htmlFor="meetingInfo">When we discuss it</FieldLabel>
              <Textarea
                id="meetingInfo"
                name="meetingInfo"
                rows={2}
                value={draft.meetingInfo}
                onChange={(e) => set("meetingInfo", e.target.value)}
                placeholder="e.g. Maidstone Pack — last Thursday of the month, 7pm."
              />
              <FieldDescription>
                Optional — when and where the pack meets to talk about it.
              </FieldDescription>
            </Field>

            {/* Purchase / info link */}
            <Field>
              <FieldLabel htmlFor="purchaseUrl">Book link</FieldLabel>
              <Input
                id="purchaseUrl"
                name="purchaseUrl"
                type="url"
                value={draft.purchaseUrl}
                onChange={(e) => set("purchaseUrl", e.target.value)}
                placeholder="https://www.goodreads.com/book/…"
              />
              <FieldDescription>
                Optional — a “Find the book” button links here (Goodreads, a shop,
                etc.).
              </FieldDescription>
            </Field>

            <Button type="submit" className="h-10 w-fit" disabled={pending}>
              {pending ? <Spinner /> : <Save data-icon="inline-start" />}
              Save Book of the Month
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
