import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev', // Fallback for standard R2 public domains
      },
      {
        protocol: 'https',
        hostname: process.env.R2_PUBLIC_URL ? new URL(process.env.R2_PUBLIC_URL).hostname : 'pub-*.r2.dev',
      }
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://embed.tawk.to https://*.tawk.to https://sdk.scdn.co; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tawk.to; img-src 'self' blob: data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://*.supabase.co https://*.r2.dev https://pub-* https://*.tawk.to https://i.scdn.co https://*.spotifycdn.com; font-src 'self' https://fonts.gstatic.com https://*.tawk.to; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.tawk.to wss://*.tawk.to https://api.spotify.com https://*.spotify.com https://*.scdn.co wss://*.spotify.com; frame-src 'self' https://player.vimeo.com https://open.spotify.com;"
          }
        ],
      },
    ];
  },
};

export default nextConfig;
