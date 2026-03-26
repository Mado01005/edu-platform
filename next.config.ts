import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    domains: ['lh3.googleusercontent.com', 'i.scdn.co', 'avatars.githubusercontent.com'],
    remotePatterns: [
      // Google profile images (lh3.googleusercontent.com)
      // Google profile images
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Spotify album covers
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
      },
      // GitHub profile images (just in case)
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },
};

export default nextConfig;
