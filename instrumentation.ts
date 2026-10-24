// Runs once when a Next.js server starts.
export async function register() {
  // Server start only: skip the Edge runtime and `next build` (no database there).
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  // Not awaited, so a slow or unreachable database can't hold up startup.
  const { syncAdminPasswordFromEnv } = await import("@/lib/admin-password");
  void syncAdminPasswordFromEnv();
}
