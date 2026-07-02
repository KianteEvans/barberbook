import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The `postgres` driver and stripe SDK are server-only; keep them external so
  // Next doesn't try to bundle native/conditional imports.
  serverExternalPackages: ["postgres", "bcryptjs"],
  experimental: {
    serverActions: {
      // Default is 1MB; barber photo uploads go through server actions.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
