import type { InstagramPostRow } from "@/lib/instagram";
import { Card } from "@/components/ui/card";
import { BookCover } from "@/components/book-cover";
import { InstagramIcon } from "@/components/icons/instagram-icon";

function formatPostedAt(value: Date | string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

/**
 * A single Instagram book-review post: a square photo, a clamped caption, the
 * month it was posted, and a link out to the original post. Reused on the
 * dedicated /instagram page and the /reviews wall. The image uses `BookCover`
 * (plain <img> + graceful fallback) since Behold/Instagram CDN URLs rotate and
 * occasionally expire.
 */
export function InstagramPostCard({ post }: { post: InstagramPostRow }) {
  const postedAt = formatPostedAt(post.postedAt);
  return (
    <Card className="gap-0 overflow-hidden p-0">
      <BookCover
        src={post.imageUrl}
        alt={post.altText ?? "Instagram book review post"}
        className="aspect-square w-full"
      />
      <div className="flex flex-col gap-2 p-4">
        {post.caption ? (
          <p className="line-clamp-4 text-sm leading-relaxed whitespace-pre-line">
            {post.caption}
          </p>
        ) : null}
        <div className="mt-1 flex items-center justify-between gap-2">
          {postedAt ? (
            <span className="text-xs text-muted-foreground">{postedAt}</span>
          ) : (
            <span />
          )}
          {post.permalink ? (
            <a
              href={post.permalink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-primary transition-colors hover:text-primary/80"
            >
              <InstagramIcon className="size-3.5" />
              View on Instagram
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
