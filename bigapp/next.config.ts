import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["adm-zip", "busboy"],
  experimental: {
    serverActions: {
      bodySizeLimit: '2gb',
    },
    // Next.js 16+ uses proxyClientMaxBodySize instead of middlewareClientMaxBodySize
    proxyClientMaxBodySize: '2gb',
  },
};

export default nextConfig;
