import { redirect } from "next/navigation";

import { getSafeSession } from "@/lib/auth";

/**
 * Server-side admin guard for admin pages. Redirects unauthenticated users to
 * /login and non-admins to /dashboard. Returns the session for admins.
 *
 * This is the real protection — the header "Admin" link is cosmetic only.
 */
export async function requireAdmin() {
  const session = await getSafeSession();
  if (!session) {
    redirect("/login");
  }
  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }
  return session;
}

/** True when the given session user has the admin role. */
export function isAdmin(user: { role?: string | null } | undefined | null) {
  return user?.role === "admin";
}
