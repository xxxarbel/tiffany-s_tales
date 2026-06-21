// Creates the voice agent's knowledge store (documents + chunks) in the existing
// Tiffany's Tales Postgres database.
//
// Usage (loads DATABASE_URL from .env):
//   npm run voice:db
//
// Idempotent: every statement is CREATE ... IF NOT EXISTS, so it's safe to run
// repeatedly (local and Neon). Applied by a plain node runner rather than
// drizzle-kit because (a) these tables aren't part of the Drizzle schema — only
// raw SQL in lib/voice/documents.ts reads them — and (b) the generated tsvector
// column and GIN index aren't expressible through drizzle-kit.
//
// Full-text search only: unlike the original Deepgram scaffold this OMITS the
// pgvector extension and the embedding column (the local postgres:17 image has
// no pgvector, and the code only uses FTS). Embeddings can be added later on
// Neon — see drizzle/0002_voice_knowledge.sql.

import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.error("[voice:db] DATABASE_URL is not set. Run with `npm run voice:db` (loads .env).");
  process.exit(1);
}

const SQL = `
-- One row per ingested source document (a markdown/text file, an upload, etc.).
CREATE TABLE IF NOT EXISTS documents (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       TEXT NOT NULL,
  source      TEXT UNIQUE,                       -- file path / upload id; used for idempotent re-ingest
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Retrieval unit: a document is split into chunks at ingest time.
CREATE TABLE IF NOT EXISTS chunks (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id  BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index  INT NOT NULL,
  content      TEXT NOT NULL,
  -- Generated FTS vector — kept in sync automatically, no app-side maintenance.
  content_tsv  tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

-- FTS index used by searchDocuments() in lib/voice/documents.ts.
CREATE INDEX IF NOT EXISTS chunks_content_tsv_idx ON chunks USING GIN (content_tsv);
`;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  await pool.query(SQL);
  console.log("[voice:db] documents + chunks tables are ready (FTS, no embeddings).");
} catch (error) {
  console.error("[voice:db] failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
