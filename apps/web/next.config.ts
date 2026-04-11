import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@aucta/api", "@aucta/auth", "@aucta/shared"],
  typescript: {
    // Pre-existing type errors in upstream packages (e.g. @aucta/api).
    // Run `turbo typecheck` separately to catch type issues.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
