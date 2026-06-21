import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { schema } from "@/lib/schema";

// Exported so raw-SQL consumers (the voice agent's full-text knowledge search in
// lib/voice/documents.ts) can share the same connection pool as Drizzle.
export const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export const db = drizzle(pool, { schema });
