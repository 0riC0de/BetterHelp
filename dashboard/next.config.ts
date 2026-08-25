import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "standalone",
  turbopack: { root: process.cwd() },
};

export default nextConfig;
