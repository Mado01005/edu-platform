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
        hostname: 'i.scdn.co',
      },
      {
        protocol: 'https',
        hostname: '*.r2.dev',
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
            value: "default-src 'self' https://pub-7bcb18f4378c4e489916424048e040ec.r2.dev; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://embed.tawk.to https://*.tawk.to; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.tawk.to; img-src 'self' blob: data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://i.scdn.co https://*.scdn.co https://*.supabase.co https://*.r2.dev https://*.tawk.to; font-src 'self' https://fonts.gstatic.com https://*.tawk.to; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.tawk.to wss://*.tawk.to https://api.spotify.com https://*.spotify.com; frame-src 'self' https://player.vimeo.com https://open.spotify.com https://pub-7bcb18f4378c4e489916424048e040ec.r2.dev https://view.officeapps.live.com; child-src 'self' https://pub-7bcb18f4378c4e489916424048e040ec.r2.dev;"
          }
        ],
      },
    ];
  },
};

export default nextConfig;
