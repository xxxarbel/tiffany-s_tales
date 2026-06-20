"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { RefreshCw, Heart, Eye, EyeOff } from "lucide-react"

import type { InstagramPostRow } from "@/lib/instagram"
import {
  syncInstagramAction,
  setInstagramPostHiddenAction,
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
import { BookCover } from "@/components/book-cover"

function syncToast(state: ImportState) {
  if (!state) return
  if (state.ok) {
    toast.success(
      `Synced ${state.total} post${state.total === 1 ? "" : "s"} — ` +
        `${state.imported} new, ${state.updated} updated.`
    )
  } else {
    toast.error(state.error)
  }
}

function formatPostedAt(value: Date | string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function captionSnippet(caption: string | null) {
  if (!caption) return "—"
  const text = caption.trim().replace(/\s+/g, " ")
  return text.length > 80 ? `${text.slice(0, 80)}…` : text
}

function ConnectFeedCard({ feedUrl }: { feedUrl: string | null }) {
  const [state, formAction, pending] = useActionState<ImportState, FormData>(
    syncInstagramAction,
    null
  )
  useEffect(() => syncToast(state), [state])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">
          Connect Behold feed
        </CardTitle>
        <CardDescription>
          Instagram no longer lets apps read personal accounts, so we sync
          through <strong>Behold.so</strong>. Set <strong>@tiffanystales</strong>{" "}
          to a Professional account, connect it on{" "}
          <a
            href="https://behold.so"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            behold.so
          </a>
          , create a JSON feed, and paste its URL here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="behold-feed-url">Behold feed URL</FieldLabel>
            <Input
              id="behold-feed-url"
              name="feedUrl"
              type="url"
              inputMode="url"
              defaultValue={feedUrl ?? ""}
              placeholder="https://feeds.behold.so/..."
              required
            />
            <FieldDescription>
              The free tier refreshes about once a day, so brand-new posts can
              take up to a day to appear after a sync.
            </FieldDescription>
          </Field>
          <Button type="submit" className="h-10 w-fit" disabled={pending}>
            {pending ? <Spinner /> : <RefreshCw data-icon="inline-start" />}
            Sync now
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function PostRow({ post }: { post: InstagramPostRow }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggleHidden() {
    startTransition(async () => {
      const res = await setInstagramPostHiddenAction(post.id, !post.hidden)
      if (res.ok) {
        toast.success(post.hidden ? "Post shown on reviews." : "Post hidden.")
        router.refresh()
      } else {
        toast.error("Couldn't update that post.")
      }
    })
  }

  return (
    <TableRow className={post.hidden ? "opacity-50" : undefined}>
      <TableCell>
        <BookCover
          src={post.imageUrl}
          alt={post.altText ?? "Instagram post"}
          className="size-12 rounded-md"
        />
      </TableCell>
      <TableCell>
        <span className="line-clamp-2 max-w-md text-sm">
          {captionSnippet(post.caption)}
        </span>
      </TableCell>
      <TableCell className="hidden sm:table-cell whitespace-nowrap text-xs text-muted-foreground">
        {formatPostedAt(post.postedAt)}
      </TableCell>
      <TableCell className="hidden md:table-cell whitespace-nowrap">
        {post.likeCount != null ? (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Heart className="size-3.5 fill-current text-primary" />
            {post.likeCount}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={post.hidden ? "Show on reviews" : "Hide from reviews"}
          disabled={pending}
          onClick={toggleHidden}
        >
          {pending ? (
            <Spinner />
          ) : post.hidden ? (
            <EyeOff className="text-muted-foreground" />
          ) : (
            <Eye />
          )}
        </Button>
      </TableCell>
    </TableRow>
  )
}

export function AdminInstagram({
  posts,
  total,
  feedUrl,
}: {
  posts: InstagramPostRow[]
  total: number
  feedUrl: string | null
}) {
  const [showAll, setShowAll] = useState(false)
  const visible = showAll ? posts : posts.slice(0, 20)

  return (
    <div className="space-y-6">
      <ConnectFeedCard feedUrl={feedUrl} />

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Imported posts
            <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-sm font-normal text-muted-foreground tabular-nums">
              {total}
            </span>
          </CardTitle>
          <CardDescription>
            Posts appear on the public <code>/instagram</code> page and the
            reviews wall. Hide any you don&apos;t want shown.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          {posts.length === 0 ? (
            <p className="px-(--card-spacing) text-sm text-muted-foreground">
              Nothing synced yet. Paste a Behold feed URL and sync above.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Post</TableHead>
                    <TableHead>Caption</TableHead>
                    <TableHead className="hidden sm:table-cell">Date</TableHead>
                    <TableHead className="hidden md:table-cell">Likes</TableHead>
                    <TableHead className="w-12 text-right">Show</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((post) => (
                    <PostRow key={post.id} post={post} />
                  ))}
                </TableBody>
              </Table>
              {posts.length > 20 ? (
                <div className="px-(--card-spacing) pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAll((v) => !v)}
                  >
                    {showAll ? "Show fewer" : `Show all ${posts.length}`}
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
