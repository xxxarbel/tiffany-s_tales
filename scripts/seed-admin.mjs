// Promotes the owner account to the admin role.
//
// The Better Auth `create.before` hook stamps role=admin for new sign-ups with
// the admin email, but it does NOT fire for accounts that already exist. Run
// this once per database (local and Neon) to promote a pre-existing owner row.
//
// Usage (loads DATABASE_URL + ADMIN_EMAIL from .env):
//   npm run db:seed-admin
// Idempotent: re-running it is a no-op once the role is already "admin".

import { Pool } from "pg";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "arbeling@gmail.com").toLowerCase();

if (!process.env.DATABASE_URL) {
  console.error("[seed-admin] DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const { rowCount, rows } = await pool.query(
    `UPDATE "user"
       SET role = 'admin', updated_at = now()
     WHERE lower(email) = $1
       AND (role IS DISTINCT FROM 'admin')
     RETURNING email`,
    [ADMIN_EMAIL]
  );

  if (rowCount > 0) {
    console.log(`[seed-admin] promoted to admin: ${rows.map((r) => r.email).join(", ")}`);
  } else {
    // Either already admin, or the account doesn't exist in this DB yet.
    const existing = await pool.query(
      `SELECT role FROM "user" WHERE lower(email) = $1`,
      [ADMIN_EMAIL]
    );
    if (existing.rowCount > 0) {
      console.log(`[seed-admin] ${ADMIN_EMAIL} is already admin — nothing to do`);
    } else {
      console.log(
        `[seed-admin] no account for ${ADMIN_EMAIL} yet — it will be made admin automatically on sign-up`
      );
    }
  }
} catch (error) {
  console.error("[seed-admin] failed:", error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
