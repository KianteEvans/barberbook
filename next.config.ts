import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The `postgres` driver and stripe SDK are server-only; keep them external so
  // Next doesn't try to bundle native/conditional imports.
  serverExternalPackages: ["postgres", "bcryptjs"],
};

export default nextConfig;
