// Ingest documents/*.md|*.txt into the Postgres knowledge store (documents +
// chunks) that backs the voice agent's lookup_knowledge tool.
//
//   npm run voice:ingest             # ingest ./documents
//   node --env-file=.env scripts/ingest-knowledge.mjs path/to/dir
//
// Self-contained on purpose: a plain Node script can't resolve the app's "@/*"
// TypeScript path alias or import .ts modules, so it talks to Postgres directly
// with `pg`. Re-running is idempotent — each file maps to one document row
// (keyed by its relative `source`), whose chunks are replaced on every run.
// Run `npm run voice:db` first to create the tables.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { Pool } from "pg";

const ROOT = path.resolve(process.argv[2] ?? "documents");
const MAX_CHARS = 500; // target chunk size
const OVERLAP = 80; // chars of overlap between consecutive chunks

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run with `npm run voice:ingest` (loads .env).");
  process.exit(1);
}

/** Split text into ~MAX_CHARS chunks on paragraph boundaries, with small overlap. */
function chunk(text) {
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
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

/** Title = first markdown heading, else the file name. */
function titleFor(text, file) {
  const heading = text.match(/^\s*#\s+(.+)$/m);
  if (heading) return heading[1].trim();
  return path.basename(file).replace(/\.(md|txt)$/i, "").replace(/[-_]/g, " ");
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...(await listFiles(full)));
    else if (/\.(md|txt)$/i.test(e.name)) files.push(full);
  }
  return files;
}

async function main() {
  let files;
  try {
    files = await listFiles(ROOT);
  } catch (err) {
    console.error(`Cannot read documents directory: ${ROOT}\n${err.message}`);
    process.exit(1);
  }

  if (files.length === 0) {
    console.warn(`No .md or .txt files found under ${ROOT} — nothing to ingest.`);
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  let docCount = 0;
  let chunkCount = 0;

  try {
    for (const file of files) {
      const text = await readFile(file, "utf8");
      const source = path.relative(process.cwd(), file).replace(/\\/g, "/");
      const title = titleFor(text, file);
      const pieces = chunk(text);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const { rows } = await client.query(
          `INSERT INTO documents (title, source, metadata, updated_at)
             VALUES ($1, $2, $3, now())
           ON CONFLICT (source)
             DO UPDATE SET title = EXCLUDED.title, metadata = EXCLUDED.metadata, updated_at = now()
           RETURNING id`,
          [title, source, JSON.stringify({ file: source })],
        );
        const documentId = rows[0].id;

        // Replace chunks so re-ingest reflects the current file exactly.
        await client.query(`DELETE FROM chunks WHERE document_id = $1`, [documentId]);
        for (let i = 0; i < pieces.length; i++) {
          await client.query(
            `INSERT INTO chunks (document_id, chunk_index, content) VALUES ($1, $2, $3)`,
            [documentId, i, pieces[i]],
          );
        }
        await client.query("COMMIT");
        docCount++;
        chunkCount += pieces.length;
        console.log(`  ${source} → "${title}" (${pieces.length} chunk${pieces.length === 1 ? "" : "s"})`);
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`  FAILED ${file}: ${err.message}`);
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }

  console.log(`\nIngested ${docCount} document(s), ${chunkCount} chunk(s) into the knowledge store.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
