import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { schema } from "@/lib/schema";

// Google sign-in activates only once both credentials are provided, so the app
// keeps building and running with email/password before Google is configured.
const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

export const auth = betterAuth({
  appName: "Tiffany's Tales",
  baseURL: process.env.BETTER_AUTH_URL,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          prompt: "select_account",
        },
      }
    : undefined,
  // nextCookies must be the last plugin so it can set cookies on responses.
  plugins: [nextCookies()],
});

export const isGoogleEnabled = googleEnabled;

/**
 * Reads the current session without throwing. If the database is unreachable
 * (e.g. a misconfigured DATABASE_URL in production), this returns null instead
 * of crashing the page so the login form still renders.
 */
export async function getSafeSession() {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (error) {
    console.error("[auth] getSession failed:", error);
    return null;
  }
}
