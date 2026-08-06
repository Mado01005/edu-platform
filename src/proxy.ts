import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Role } from '@prisma/client';
import {
  ACCOUNTING_ROLES,
  ADMIN_ROLES,
  SUPPORT_ROLES,
  TEACHING_ROLES,
  hasLmsRole,
  isLmsRole,
} from '@/lib/lms/roles';
import { getSupabaseRequestContext } from '@/lib/supabase/proxy';

const PUBLIC_PATHS = [
  '/login',
  '/lms/login',
  '/auth/callback',
  '/catalog',
  '/mps',
  '/api/auth',
  '/sitemap.xml',
  '/robots.txt',
];

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

const LMS_PAGE_RULES: readonly {
  allowed: readonly Role[];
  notice: string;
  route: string;
}[] = [
  { route: '/teacher', allowed: TEACHING_ROLES, notice: 'teacher-required' },
  { route: '/admin/users', allowed: ADMIN_ROLES, notice: 'admin-required' },
  { route: '/admin/storage', allowed: ADMIN_ROLES, notice: 'admin-required' },
  { route: '/admin/curriculum', allowed: ADMIN_ROLES, notice: 'admin-required' },
  { route: '/admin/k12', allowed: ADMIN_ROLES, notice: 'admin-required' },
  { route: '/admin/radar', allowed: ADMIN_ROLES, notice: 'admin-required' },
  { route: '/admin/codes', allowed: ADMIN_ROLES, notice: 'admin-required' },
  { route: '/support', allowed: SUPPORT_ROLES, notice: 'support-required' },
  {
    route: '/accounting',
    allowed: ACCOUNTING_ROLES,
    notice: 'accounting-required',
  },
];

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
    pathname.startsWith('/_vercel') ||
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

  const pageRule = LMS_PAGE_RULES.find(({ route }) =>
    matchesRoute(pathname, route),
  );
  const isSupabaseOnlyRoute =
    Boolean(pageRule) ||
    matchesRoute(pathname, '/settings') ||
    matchesRoute(pathname, '/lms/profile') ||
    matchesRoute(pathname, '/courses') ||
    matchesRoute(pathname, '/live') ||
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

    const { data: profile, error } = await supabase!
      .from('lms_users')
      .select('role, status')
      .eq('supabase_id', userId)
      .maybeSingle();

    if (error || !profile || profile.status !== 'ACTIVE') {
      const loginUrl = new URL('/lms/login', request.url);
      loginUrl.searchParams.set('error', 'Your account is unavailable.');
      return redirectWithSessionCookies(loginUrl, response);
    }

    if (
      pageRule &&
      (!isLmsRole(profile.role) ||
        !hasLmsRole(profile.role, pageRule.allowed))
    ) {
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('notice', pageRule.notice);
      return redirectWithSessionCookies(dashboardUrl, response);
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
