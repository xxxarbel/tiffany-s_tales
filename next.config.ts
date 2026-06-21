import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the PDF/Word text extractors (used by the voice agent's knowledge
  // uploads) out of the bundle — they're Node-only and don't bundle cleanly.
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
