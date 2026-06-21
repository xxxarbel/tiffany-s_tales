import {
  getBookOfTheMonth,
  searchBooks,
  type BookMatch,
} from "@/lib/goodreads";

// Backs the voice agent's search_books and book_of_the_month tools with the
// club's live Goodreads data. Returns a compact, speakable summary so the think
// model can read it aloud directly. Only exposes already-public (non-hidden)
// shelf data, so no auth is required. The pg driver needs the Node runtime.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const SHELF_PHRASE: Record<string, string> = {
  read: "the club has read",
  "currently-reading": "the club is currently reading",
  "to-read": "is on the club's to-read pile",
};

/** A short spoken phrase for one book, e.g. "Project Hail Mary by Andy Weir". */
function describe(book: BookMatch): string {
  const author = book.author ? ` by ${book.author}` : "";
  const rating =
    book.myRating && book.myRating > 0
      ? `, rated ${book.myRating} out of 5`
      : "";
  return `${book.title}${author}${rating}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const q = (url.searchParams.get("q") ?? "").trim();

  // ---- book_of_the_month ----
  if (action === "book_of_the_month") {
    const book = await getBookOfTheMonth();
    if (!book) {
      return json({
        answer:
          "I couldn't find this month's read just now — the contact page is the best way to ask the team.",
      });
    }
    const where =
      book.shelf === "currently-reading"
        ? "The club is currently reading"
        : "The club's most recent read is";
    return json({
      answer: `${where} ${describe(book)}.`,
      book,
    });
  }

  // ---- search_books ----
  if (!q) {
    return json({ error: "Missing 'q'." }, 400);
  }

  const results = await searchBooks(q, 5);
  if (results.length === 0) {
    return json({
      answer: `I couldn't find anything matching "${q}" on the club's shelves.`,
      results,
    });
  }

  // If a result clearly matches the read shelf, lead with that; otherwise list.
  const readMatch = results.find((b) => b.shelf === "read");
  let answer: string;
  if (results.length === 1) {
    const b = results[0];
    const phrase = (b.shelf && SHELF_PHRASE[b.shelf]) ?? "is on the club's shelves";
    answer = `Yes — ${describe(b)}; ${phrase}.`;
  } else if (readMatch) {
    answer = `Yes, the club has read ${describe(readMatch)}. Other matches: ${results
      .filter((b) => b !== readMatch)
      .slice(0, 3)
      .map((b) => describe(b))
      .join("; ")}.`;
  } else {
    answer = `I found a few matches: ${results
      .slice(0, 4)
      .map((b) => describe(b))
      .join("; ")}.`;
  }

  return json({ answer, results });
}
