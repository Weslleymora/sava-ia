import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Necessário para pdf-parse (usa módulos Node.js nativos)
  serverExternalPackages: ['pdf-parse', 'mammoth'],
  turbopack: {
    root: path.resolve(__dirname),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
