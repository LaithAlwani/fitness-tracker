import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The Convex client + generated API are consumed from the workspace package
  // `@liftify/convex`. Transpile it so Next bundles its TS/ESM sources.
  transpilePackages: ["@liftify/convex", "@liftify/shared"],
};

export default nextConfig;
