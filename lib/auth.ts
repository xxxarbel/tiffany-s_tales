import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { schema } from "@/lib/schema";
import { sendRegistrationEmails } from "@/lib/email";

// Google sign-in activates only once both credentials are provided, so the app
// keeps building and running with email/password before Google is configured.
const googleEnabled = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
);

// Resolve the base URL. On Vercel, BETTER_AUTH_URL may be unset (or wrongly left
// as localhost), which makes Better Auth reject requests with "Invalid origin"
// and build OAuth callbacks against localhost (-> Google redirect_uri_mismatch).
// A localhost base URL is never correct inside a Vercel deployment, so there we
// always use the deployment's own production domain instead.
const vercelProductionURL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;
const configuredURL = process.env.BETTER_AUTH_URL;
const baseURL =
  process.env.VERCEL && (!configuredURL || configuredURL.includes("localhost"))
    ? vercelProductionURL
    : configuredURL ?? vercelProductionURL;

// CSRF/origin whitelist. Better Auth only trusts `baseURL` by default, so the
// production and preview Vercel origins must be added explicitly or sign-in
// requests from them get a 403 "Invalid origin".
const trustedOrigins = [
  "http://localhost:3000",
  "https://tiffany-s-tales.vercel.app",
  "https://tiffany-s-tales-*.vercel.app", // Vercel preview deployments
];

export const auth = betterAuth({
  appName: "Tiffany's Tales",
  baseURL,
  trustedOrigins,
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
  databaseHooks: {
    user: {
      create: {
        // Fires after a user row is created — covers both email/password and
        // Google sign-up. Emails the owner and welcomes the new member.
        // sendRegistrationEmails never throws, so a mail failure can't break
        // registration; the extra try/catch is belt-and-suspenders.
        after: async (user) => {
          try {
            await sendRegistrationEmails({ name: user.name, email: user.email });
          } catch (error) {
            console.error("[auth] registration emails failed:", error);
          }
        },
      },
    },
  },
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
