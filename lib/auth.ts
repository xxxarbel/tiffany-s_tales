import { headers } from "next/headers";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { schema } from "@/lib/schema";
import {
  sendRegistrationEmails,
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

// The owner account. Signing up / signing in with this email grants the admin
// role. Configurable so the admin can be moved without code changes.
export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL ?? "arbeling@gmail.com"
).toLowerCase();

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
    minPasswordLength: 8,
    // The account is inactive until the email is verified: sign-up does NOT
    // create a session, and sign-in is blocked (403) until verification. Google
    // sign-ins are exempt — Google already verifies the email.
    requireEmailVerification: true,
    // Forgot-password flow. requestPasswordReset issues a one-time token and
    // calls this with the reset `url` (Better Auth's callback that redirects to
    // /reset-password?token=… on our site). Delivered via Resend like the other
    // transactional mail. Never throws, so a mail failure can't break the flow.
    resetPasswordTokenExpiresIn: 60 * 60, // reset link valid for 1 hour
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({ name: user.name, email: user.email, url });
    },
  },
  // On email/password sign-up — and on any sign-in attempt while still
  // unverified — Better Auth issues a one-time token and calls
  // sendVerificationEmail with the verification `url`. Clicking the link marks
  // the address verified and (via autoSignInAfterVerification) signs the member
  // in straight away.
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    expiresIn: 60 * 60, // verification link valid for 1 hour
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail({ name: user.name, email: user.email, url });
    },
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
  // Let Google sign-in attach to an existing email/password account with the
  // same address (e.g. the owner registered with a password first, then signs
  // in with Google). Without this, Better Auth rejects it with
  // "account_not_linked". Safe because Google verifies the email it returns.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Runs before the row is inserted. The admin plugin marks `role` as
        // input:false, so it can't be set from the sign-up payload — but a
        // server-side hook can. Stamp the admin role when the owner registers.
        before: async (user) => {
          if (user.email.toLowerCase() === ADMIN_EMAIL) {
            return { data: { ...user, role: "admin" } };
          }
          return { data: user };
        },
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
  plugins: [
    // The admin plugin serves /api/auth/admin/* (list/ban/setRole/remove …) and
    // adds role/banned fields to the session user. Must come before nextCookies.
    admin({ defaultRole: "user", adminRoles: ["admin"] }),
    // nextCookies must be the last plugin so it can set cookies on responses.
    nextCookies(),
  ],
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
