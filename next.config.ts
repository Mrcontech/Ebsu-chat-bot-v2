import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // mysql2 is a Node.js driver; keep it out of the server bundle.
  serverExternalPackages: ["mysql2"],
  // Everything is served from this machine. No remote images, fonts or scripts,
  // so the demo works with the network switched off.
  images: { unoptimized: true },
  poweredByHeader: false,
  experimental: { optimizePackageImports: ["@phosphor-icons/react"] },
  // Do not write AGENTS.md / CLAUDE.md into the project on `next dev`.
  agentRules: false,
};

export default nextConfig;
