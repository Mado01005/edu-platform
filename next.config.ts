import type { NextConfig } from 'next';

function getConfiguredR2Origin() {
  const configuredUrl =
    process.env.R2_PUBLIC_URL ?? process.env.NEXT_PUBLIC_R2_PUBLIC_URL;

  if (!configuredUrl) return '';

  try {
    return new URL(configuredUrl).origin;
  } catch {
    return '';
  }
}

const r2PublicOrigin = getConfiguredR2Origin();
const r2PublicSource = r2PublicOrigin ? ` ${r2PublicOrigin}` : '';
const developmentEvalSource =
  process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';

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
            value: `default-src 'self' https://pub-7bcb18f4378c4e489916424048e040ec.r2.dev https://*.r2.cloudflarestorage.com${r2PublicSource}; script-src 'self'${developmentEvalSource} 'unsafe-inline' https://sdk.scdn.co https://cdn.jsdelivr.net https://va.vercel-scripts.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' blob: data: https://avatars.githubusercontent.com https://lh3.googleusercontent.com https://i.scdn.co https://*.scdn.co https://*.supabase.co https://*.r2.dev https://*.r2.cloudflarestorage.com https://grainy-gradients.vercel.app https://sdk.scdn.co${r2PublicSource}; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.spotify.com https://*.spotify.com https://*.r2.cloudflarestorage.com https://vitals.vercel-insights.com; media-src 'self' blob: https://*.r2.dev https://*.r2.cloudflarestorage.com${r2PublicSource}; frame-src 'self' https://player.vimeo.com https://www.youtube-nocookie.com https://open.spotify.com https://pub-7bcb18f4378c4e489916424048e040ec.r2.dev https://*.r2.cloudflarestorage.com https://view.officeapps.live.com https://sdk.scdn.co https://*.scdn.co; child-src 'self' https://pub-7bcb18f4378c4e489916424048e040ec.r2.dev https://*.r2.cloudflarestorage.com;`
          }
        ],
      },
    ];
  },
};

export default nextConfig;
