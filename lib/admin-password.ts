import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "better-auth/crypto";

import { db } from "@/lib/db";
import { account, user } from "@/lib/schema";

/**
 * Makes ADMIN_PASSWORD (env) the owner's email/password login, so the admin
 * password lives in the environment rather than only in the database. Runs at
 * server start (see instrumentation.ts): ensures the ADMIN_EMAIL account exists,
 * is an admin with a verified email, and has a password login matching
 * ADMIN_PASSWORD. To change the password, change the env var and redeploy.
 * Never throws — a failure is logged and the server starts normally.
 */
export async function syncAdminPasswordFromEnv() {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;
  // Same owner email (and default) as lib/auth.ts, which stamps the admin role.
  const email = (process.env.ADMIN_EMAIL ?? "arbeling@gmail.com").toLowerCase();
  if (password.length < 8) {
    console.error("[admin] ADMIN_PASSWORD is shorter than 8 characters — ignored");
    return;
  }

  try {
    let [owner] = await db
      .select()
      .from(user)
      .where(sql`lower(${user.email}) = ${email}`);
    if (!owner) {
      [owner] = await db
        .insert(user)
        .values({ id: randomUUID(), name: "Admin", email, emailVerified: true, role: "admin" })
        .returning();
    } else if (owner.role !== "admin" || !owner.emailVerified) {
      await db
        .update(user)
        .set({ role: "admin", emailVerified: true, updatedAt: new Date() })
        .where(eq(user.id, owner.id));
    }

    const [credential] = await db
      .select()
      .from(account)
      .where(and(eq(account.userId, owner.id), eq(account.providerId, "credential")));
    if (credential?.password && (await verifyPassword({ hash: credential.password, password }))) {
      console.log(`[admin] ${email} password login already matches ADMIN_PASSWORD`);
      return;
    }

    const hash = await hashPassword(password);
    if (credential) {
      await db
        .update(account)
        .set({ password: hash, updatedAt: new Date() })
        .where(eq(account.id, credential.id));
    } else {
      // Same shape Better Auth gives an email/password sign-up's account row.
      await db.insert(account).values({
        id: randomUUID(),
        accountId: owner.id,
        providerId: "credential",
        userId: owner.id,
        password: hash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    console.log(`[admin] ${email} password login set from ADMIN_PASSWORD`);
  } catch (error) {
    console.error("[admin] could not apply ADMIN_PASSWORD:", error);
  }
}
