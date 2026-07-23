import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSupabaseRequestContext } from '@/lib/supabase/proxy';

const PUBLIC_PATHS = [
  '/login',
  '/lms/login',
  '/auth/callback',
  '/catalog',
  '/api/auth',
  '/sitemap.xml',
  '/robots.txt',
];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function redirectWithSessionCookies(
  destination: URL,
  response: NextResponse,
) {
  const redirectResponse = NextResponse.redirect(destination);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // The LMS catalog is the canonical product entry point. Keep the legacy
  // NextAuth login available for existing users without routing new visitors
  // through the retired portal landing flow.
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/catalog', request.url));
  }

  // Allow public/static paths, PWA assets
  if (
    PUBLIC_PATHS.some((path) => matchesRoute(pathname, path)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icon-')
  ) {
    return NextResponse.next();
  }

  // C8: The middleware matcher excludes all /api/* routes (they never reach here).
  // Individual API route handlers check auth themselves.
  // This middleware only protects page routes.

  const isTeacherRoute = matchesRoute(pathname, '/teacher');
  const isSupabaseOnlyRoute =
    isTeacherRoute ||
    matchesRoute(pathname, '/lms/profile') ||
    matchesRoute(pathname, '/courses') ||
    matchesRoute(pathname, '/live-classes');
  const isDashboardRoute = matchesRoute(pathname, '/dashboard');

  if (isSupabaseOnlyRoute || isDashboardRoute) {
    const { response, supabase, userId } =
      await getSupabaseRequestContext(request);

    if (!userId) {
      // Preserve the existing NextAuth-backed dashboard while the LMS routes use
      // Supabase Auth exclusively.
      if (isDashboardRoute && (await auth())) {
        return response;
      }

      const loginUrl = new URL('/lms/login', request.url);
      loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
      return redirectWithSessionCookies(loginUrl, response);
    }

    if (isTeacherRoute) {
      const { data: profile, error } = await supabase!
        .from('lms_users')
        .select('role')
        .eq('supabase_id', userId)
        .maybeSingle();

      if (
        error ||
        !profile ||
        (profile.role !== 'TEACHER' && profile.role !== 'ADMIN')
      ) {
        return redirectWithSessionCookies(
          new URL('/dashboard', request.url),
          response,
        );
      }
    }

    return response;
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon-.*\\.png|apple-.*\\.png|manifest\\.json|sw\\.js|content/.*).*)'],
};
