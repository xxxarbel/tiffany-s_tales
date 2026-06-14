import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";

import { db } from "@/lib/db";
import { schema } from "@/lib/schema";

export const auth = betterAuth({
  appName: "Tiffany's Tales",
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
  },
  // nextCookies must be the last plugin so it can set cookies on responses.
  plugins: [nextCookies()],
});
