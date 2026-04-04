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

  // Strict RBAC check for admin API routes
  if (pathname.startsWith('/api/admin/')) {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // For non-admin API routes, let them handle their own auth
  if (pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated and hitting root path (/), redirect to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon-.*\\.png|apple-.*\\.png|manifest\\.json|sw\\.js|content/.*).*)'],
};