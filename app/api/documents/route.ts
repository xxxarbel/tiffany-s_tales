import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { getSafeSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import {
  deleteDocument,
  ingestText,
  listDocuments,
} from "@/lib/voice/documents";

// Upload / list / delete knowledge documents for the voice agent. Uploaded files
// are text-extracted, chunked, and stored in Postgres so lookup_knowledge can
// ground answers on them. The pg driver and the PDF/Word parsers need the Node
// runtime. Owner-only: every handler is gated behind the admin role.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Admin gate for the knowledge endpoints. Unlike requireAdmin() (which redirects
 * — fine for pages, wrong for a JSON API), this returns a 401 the client can
 * handle. Returns null when authorised, or a 401 Response otherwise.
 */
async function ensureAdmin(): Promise<Response | null> {
  const session = await getSafeSession();
  if (!isAdmin(session?.user)) {
    return json({ error: "Not authorised." }, 401);
  }
  return null;
}

/** Extract plain text from a supported upload, by extension. */
async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".markdown")) {
    return file.text();
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (name.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      // pdf-parse inserts "-- N of M --" dividers between pages; drop them so the
      // page numbering doesn't end up as searchable knowledge content.
      return (result.text ?? "")
        .replace(/^\s*-{2,}\s*\d+\s+of\s+\d+\s*-{2,}\s*$/gm, "")
        .replace(/\n{3,}/g, "\n\n");
    } finally {
      await parser.destroy();
    }
  }

  if (name.endsWith(".docx")) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value ?? "";
  }

  throw new UnsupportedTypeError(file.name);
}

class UnsupportedTypeError extends Error {
  constructor(filename: string) {
    super(`Unsupported file type: ${filename}. Use .txt, .md, .pdf, or .docx.`);
    this.name = "UnsupportedTypeError";
  }
}

export async function POST(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  let file: File | null = null;
  let titleField = "";
  try {
    const form = await request.formData();
    const f = form.get("file");
    if (f instanceof File) file = f;
    const t = form.get("title");
    if (typeof t === "string") titleField = t;
  } catch {
    return json({ error: "Expected multipart form data with a 'file' field." }, 400);
  }

  if (!file) return json({ error: "Missing 'file'." }, 400);
  if (file.size === 0) return json({ error: "File is empty." }, 400);
  if (file.size > MAX_BYTES) {
    return json({ error: "File is too large (max 10 MB)." }, 413);
  }

  let content: string;
  try {
    content = (await extractText(file)).trim();
  } catch (err) {
    if (err instanceof UnsupportedTypeError) return json({ error: err.message }, 400);
    console.error("documents: text extraction failed:", err);
    return json({ error: "Could not read text from that file." }, 422);
  }

  if (!content) {
    return json(
      { error: "No readable text found (a scanned/image-only PDF has no text layer)." },
      422,
    );
  }

  const title = titleField.trim() || file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
  const source = `upload:${file.name}`;

  try {
    const document = await ingestText({ title, source, content });
    return json({ ok: true, document });
  } catch (err) {
    console.error("documents: ingest failed:", err);
    return json({ error: "Could not save the document. Is the store running?" }, 503);
  }
}

export async function GET() {
  const denied = await ensureAdmin();
  if (denied) return denied;

  try {
    return json({ documents: await listDocuments() });
  } catch (err) {
    console.error("documents: list failed:", err);
    return json({ documents: [], error: "Document store unavailable." }, 503);
  }
}

export async function DELETE(request: Request) {
  const denied = await ensureAdmin();
  if (denied) return denied;

  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return json({ error: "Missing or invalid 'id'." }, 400);
  }
  try {
    const removed = await deleteDocument(id);
    return json({ ok: removed });
  } catch (err) {
    console.error("documents: delete failed:", err);
    return json({ error: "Could not delete the document." }, 503);
  }
}
