import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/whats-new', '/sitemap.xml', '/robots.txt'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public/static paths, PWA assets, and all API routes that handle their own auth
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icon-')
  ) {
    return NextResponse.next();
  }

  // For API routes, let them handle their own auth and return JSON 401s
  // instead of redirecting to /login (which causes the 307 flood)
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|content/.*).*)'],
};
