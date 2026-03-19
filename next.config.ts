import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Serve /content files via API route
  async rewrites() {
    return [
      {
        source: '/content-files/:path*',
        destination: '/api/content/:path*',
      },
    ];
  },
  images: {
    // Allow all remote patterns (adjust for production)
    remotePatterns: [],
    // Unoptimized for local content files served via API
    unoptimized: false,
  },
};

export default nextConfig;
