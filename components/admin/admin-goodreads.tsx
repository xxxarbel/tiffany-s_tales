"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Upload, RefreshCw, Star, Eye, EyeOff } from "lucide-react"

import type { GoodreadsBookRow } from "@/lib/goodreads"
import {
  importGoodreadsCsvAction,
  syncGoodreadsRssAction,
  setBookHiddenAction,
  type ImportState,
} from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { BookCover } from "@/components/book-cover"

function importToast(state: ImportState) {
  if (!state) return
  if (state.ok) {
    toast.success(
      `Imported ${state.total} book${state.total === 1 ? "" : "s"} — ` +
        `${state.imported} new, ${state.updated} updated.`
    )
  } else {
    toast.error(state.error)
  }
}

function CsvImportCard() {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    importGoodreadsCsvAction,
    null
  )
  useEffect(() => importToast(state), [state])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">
          Import from CSV (full library)
        </CardTitle>
        <CardDescription>
          In Goodreads: <strong>My Books → Import/Export → Export Library</strong>
          , then upload the downloaded <code>.csv</code> here. This brings in
          every book with its full review, rating and dates.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="goodreads-csv">Library export file</FieldLabel>
            <Input
              id="goodreads-csv"
              name="file"
              type="file"
              accept=".csv,text/csv"
              required
              className="file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm"
            />
            <FieldDescription>
              Re-uploading later updates existing books in place — no duplicates.
            </FieldDescription>
          </Field>
          <Button type="submit" className="h-10 w-fit" disabled={pending}>
            {pending ? <Spinner /> : <Upload data-icon="inline-start" />}
            Import CSV
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function RssSyncCard({ userId }: { userId: string | null }) {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    syncGoodreadsRssAction,
    null
  )
  useEffect(() => importToast(state), [state])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">Sync from RSS</CardTitle>
        <CardDescription>
          Pull your recent reads automatically from your public Goodreads feed.
          Quick to refresh, but limited to ~100 books and review text may be
          truncated by Goodreads.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="goodreads-user-id">
              Goodreads user id
            </FieldLabel>
            <Input
              id="goodreads-user-id"
              name="userId"
              inputMode="numeric"
              defaultValue={userId ?? ""}
              placeholder="e.g. 12345678"
              required
            />
            <FieldDescription>
              The number in your profile URL:
              goodreads.com/user/show/<strong>12345678</strong>-name. Your
              profile must be public.
            </FieldDescription>
          </Field>
          <Button type="submit" className="h-10 w-fit" disabled={pending}>
            {pending ? <Spinner /> : <RefreshCw data-icon="inline-start" />}
            Save &amp; sync
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function BookRow({ book }: { book: GoodreadsBookRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggleHidden() {
    startTransition(async () => {
      const res = await setBookHiddenAction(book.id, !book.hidden)
      if (res.ok) {
        toast.success(book.hidden ? "Book shown on reviews." : "Book hidden.")
        router.refresh()
      } else {
        toast.error("Couldn't update that book.")
      }
    })
  }

  return (
    <TableRow className={book.hidden ? "opacity-50" : undefined}>
      <TableCell>
        <div className="flex items-center gap-3">
          <BookCover
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            title={book.title}
            subtitle={book.author}
            className="h-12 w-8 shrink-0 rounded"
          />
          <div className="flex flex-col">
            <span className="font-medium">{book.title}</span>
            <span className="text-xs text-muted-foreground">
              {book.author ?? "—"}
            </span>
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-nowrap">
        {book.myRating ? (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Star className="size-3.5 fill-current text-primary" />
            {book.myRating}/5
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        <Badge variant="outline">{book.shelf ?? "—"}</Badge>
      </TableCell>
      <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
        {book.myReview ? "Review" : "—"}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={book.hidden ? "Show on reviews" : "Hide from reviews"}
          disabled={pending}
          onClick={toggleHidden}
        >
          {pending ? (
            <Spinner />
          ) : book.hidden ? (
            <EyeOff className="text-muted-foreground" />
          ) : (
            <Eye />
          )}
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function AdminGoodreads({
  books,
  total,
  userId,
}: {
  books: GoodreadsBookRow[]
  total: number
  userId: string | null
}) {
  // Local copy isn't needed — server actions revalidate /admin — but keep the
  // count reactive to the latest server render.
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? books : books.slice(0, 20)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <CsvImportCard />
        <RssSyncCard userId={userId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Imported books
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-sm font-normal text-muted-foreground tabular-nums">
              {total}
            </span>
          </CardTitle>
          <CardDescription>
            Read-shelf books with a rating or review appear on the public{" "}
            <code>/reviews</code> page. Hide any you don&apos;t want shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {books.length === 0 ? (
            <p className="px-(--card-spacing) text-sm text-muted-foreground">
              Nothing imported yet. Upload a CSV or sync from RSS above.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="hidden sm:table-cell">Shelf</TableHead>
                    <TableHead className="hidden md:table-cell">Review</TableHead>
                    <TableHead className="w-12 text-right">Show</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((book) => (
                    <BookRow key={book.id} book={book} />
                  ))}
                </TableBody>
              </Table>
              {books.length > 20 ? (
                <div className="px-(--card-spacing) pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? "Show fewer" : `Show all ${books.length}`}
                  </Button>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
