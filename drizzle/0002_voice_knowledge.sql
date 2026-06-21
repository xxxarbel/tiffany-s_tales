-- Voice agent knowledge store (documents + chunks).
--
-- NOTE: this file is documentation / parity only. It is NOT registered in
-- drizzle/meta/_journal.json, so `drizzle-kit migrate` does not apply it. The
-- live tables are created by the idempotent runner `npm run voice:db`
-- (scripts/voice-db-setup.mjs), because these tables aren't part of the Drizzle
-- schema and the generated tsvector column + GIN index can't be expressed via
-- drizzle-kit. Kept here so the schema is visible alongside the other migrations.
--
-- Full-text search only — no pgvector extension and no embedding column (the
-- local postgres:17 image has no pgvector). To add semantic search later on a
-- pgvector-capable host (e.g. Neon):
--   CREATE EXTENSION IF NOT EXISTS vector;
--   ALTER TABLE chunks ADD COLUMN embedding vector(1536);
--   CREATE INDEX chunks_embedding_idx ON chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS documents (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title       TEXT NOT NULL,
  source      TEXT UNIQUE,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id  BIGINT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index  INT NOT NULL,
  content      TEXT NOT NULL,
  content_tsv  tsvector GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS chunks_content_tsv_idx ON chunks USING GIN (content_tsv);
