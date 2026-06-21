// Retrieval over the Postgres document store, backing the lookup_knowledge tool.
// Full-text search today; a vector path can be added here later (see
// scripts/voice-db-setup.mjs / the schema comment about embeddings on Neon).
//
// Ported from the Deepgram scaffold's lib/db/documents.ts. The only change: it
// shares the app's existing connection pool (lib/db.ts) instead of opening its
// own, so there's a single pg pool for both Drizzle and this raw SQL.

import { pool } from "@/lib/db";

// A `type` (not `interface`) so it satisfies pg's `Record<string, unknown>` row
// constraint — interfaces lack the implicit index signature pg's generic needs.
export type SearchHit = {
  title: string;
  content: string;
  rank: number;
};

/**
 * Top-k chunks matching `q`, ranked by Postgres full-text relevance.
 * `websearch_to_tsquery` accepts natural phrasing ("how much does it cost") and
 * never throws on punctuation, so raw user/agent queries are safe to pass in.
 */
export async function searchDocuments(q: string, k = 3): Promise<SearchHit[]> {
  const { rows } = await pool.query<SearchHit>(
    `SELECT d.title,
            c.content,
            ts_rank_cd(c.content_tsv, websearch_to_tsquery('english', $1)) AS rank
       FROM chunks c
       JOIN documents d ON d.id = c.document_id
      WHERE c.content_tsv @@ websearch_to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $2`,
    [q, k],
  );
  return rows;
}

/**
 * A single grounded answer string for the agent, assembled from the best
 * matching chunks. Returns null when nothing matches (or the store is empty) so
 * the caller can fall back to the static FAQ.
 */
export async function groundedAnswer(q: string): Promise<string | null> {
  const hits = await searchDocuments(q, 3);
  if (hits.length === 0) return null;
  // Join the top chunks into one compact passage for the think model to voice.
  // Strip leading markdown heading markers so the grounding text reads as prose.
  return hits
    .map((h) => h.content.replace(/^#+\s+/gm, "").trim())
    .join("\n\n");
}

// ---- Ingestion (uploads via app/api/documents; CLI uses scripts/ingest-knowledge.mjs) ----

const MAX_CHARS = 500; // target chunk size
const OVERLAP = 80; // chars of overlap between consecutive chunks

/**
 * Split text into ~MAX_CHARS chunks on paragraph boundaries, with small overlap.
 * Mirrors scripts/ingest-knowledge.mjs (that script runs in a separate Node
 * runtime and can't import this TS, hence the intentional duplication).
 */
export function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let buf = "";
  for (const p of paragraphs) {
    if (buf && buf.length + p.length + 2 > MAX_CHARS) {
      chunks.push(buf);
      buf = buf.slice(Math.max(0, buf.length - OVERLAP)); // carry a little context
    }
    buf = buf ? `${buf}\n\n${p}` : p;
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

export type IngestResult = { documentId: number; title: string; chunks: number };

/**
 * Upsert one document and (re)build its chunks in a transaction. Idempotent per
 * `source`: re-ingesting the same source replaces its chunks rather than
 * duplicating them. Throws if the text yields no chunks.
 */
export async function ingestText({
  title,
  source,
  content,
}: {
  title: string;
  source: string;
  content: string;
}): Promise<IngestResult> {
  const pieces = chunkText(content);
  if (pieces.length === 0) {
    throw new Error("Document has no readable text.");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query<{ id: number }>(
      `INSERT INTO documents (title, source, metadata, updated_at)
         VALUES ($1, $2, $3, now())
       ON CONFLICT (source)
         DO UPDATE SET title = EXCLUDED.title, metadata = EXCLUDED.metadata, updated_at = now()
       RETURNING id`,
      [title, source, JSON.stringify({ uploaded: true })],
    );
    const documentId = rows[0].id;

    await client.query(`DELETE FROM chunks WHERE document_id = $1`, [documentId]);
    for (let i = 0; i < pieces.length; i++) {
      await client.query(
        `INSERT INTO chunks (document_id, chunk_index, content) VALUES ($1, $2, $3)`,
        [documentId, i, pieces[i]],
      );
    }
    await client.query("COMMIT");
    return { documentId, title, chunks: pieces.length };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export type DocumentSummary = {
  id: number;
  title: string;
  source: string | null;
  chunks: number;
  updated_at: string;
};

/** All stored documents with their chunk counts, newest first. */
export async function listDocuments(): Promise<DocumentSummary[]> {
  const { rows } = await pool.query<DocumentSummary>(
    `SELECT d.id,
            d.title,
            d.source,
            count(c.id)::int AS chunks,
            d.updated_at
       FROM documents d
       LEFT JOIN chunks c ON c.document_id = d.id
      GROUP BY d.id
      ORDER BY d.updated_at DESC`,
  );
  return rows;
}

/** Delete a document (its chunks cascade via the FK). Returns true if removed. */
export async function deleteDocument(id: number): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM documents WHERE id = $1`, [id]);
  return (rowCount ?? 0) > 0;
}
