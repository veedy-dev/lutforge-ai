import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable runtime configuration
  publicRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL,
  },
  // Also add server runtime config for SSR
  serverRuntimeConfig: {
    apiUrl: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL,
  },
};

export default nextConfig;
