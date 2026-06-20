"use client"

import { useState } from "react"
import { BookOpen, PawPrint } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Book cover image with a graceful fallback. Covers come from Goodreads, Open
 * Library or Google Books and occasionally 404, so on error we swap to a
 * fallback instead of a broken image. When `title` is provided the fallback is a
 * branded text cover (title + author) so a referenced book always shows a
 * "picture"; otherwise it's a neutral icon placeholder (e.g. for non-book
 * images like Instagram thumbnails). Plain <img> by design — these are many
 * small external images that don't need Next image optimisation/domain config.
 */
export function BookCover({
  src,
  alt,
  className,
  title,
  subtitle,
}: {
  src: string | null
  alt: string
  className?: string
  /** Book title — when set, the fallback is a generated text cover. */
  title?: string
  /** Author or other subtitle shown under the title on the text cover. */
  subtitle?: string | null
}) {
  const [failed, setFailed] = useState(false)

  if (!src || failed) {
    if (title) {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center gap-1 bg-secondary p-3 text-center text-secondary-foreground",
            className
          )}
          aria-label={alt}
        >
          <p className="line-clamp-4 font-display text-xs leading-snug font-semibold text-balance">
            {title}
          </p>
          {subtitle ? (
            <p className="line-clamp-2 text-[0.625rem] leading-tight text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
          <PawPrint className="mt-0.5 size-4 text-primary/60" />
        </div>
      )
    }
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted text-muted-foreground",
          className
        )}
        aria-label={alt}
      >
        <BookOpen className="size-1/3" />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn("object-cover", className)}
    />
  )
}
