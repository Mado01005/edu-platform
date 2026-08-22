import { auth } from '@/auth';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Role } from '@prisma/client';
import { apiUnauthorized, requireApiAuth } from '@/lib/auth-guard';
import {
  applyApiCorsHeaders,
  enforceApiOrigin,
  enforceApiRateLimit,
  getApiRateLimitPolicy,
} from '@/lib/http/api-security';
import {
  ACTIVE_SESSION_COOKIE,
  hasValidActiveSession,
} from '@/lib/lms/active-session-core';
import {
  ACCOUNTING_ROLES,
  ADMIN_ROLES,
  SUPPORT_ROLES,
  TEACHING_ROLES,
  hasLmsRole,
  isLmsRole,
} from '@/lib/lms/roles';
import {
  PARENT_PORTAL_SESSION_COOKIE,
  validateParentPortalSessionToken,
} from '@/lib/lms/parent-session';
import { getSupabaseRequestContext } from '@/lib/supabase/proxy';

const PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/lms/login',
  '/auth/callback',
  '/auth/sync',
  '/catalog',
  '/privacy',
  '/terms',
  '/mps',
  '/sitemap.xml',
  '/robots.txt',
];

const PUBLIC_ASSET_PATHS = new Set([
  '/file.svg',
  '/globe.svg',
  '/next.svg',
  '/noise.svg',
  '/telemetry-worker.js',
  '/vercel.svg',
  '/window.svg',
]);

// These routes must run before a user JWT can exist, or authenticate through a
// separate server-held secret. Keep this list narrow and rate-limit every item.
const NEXTAUTH_PROTOCOL_API = '/api/auth';
const EXACT_API_AUTH_EXEMPTIONS = new Set([
  '/api/mps/login', // Parent login bootstrap; establishes its own session.
  '/api/cron/student-health', // Route validates CRON_SECRET itself.
]);

// Only these existing route handlers are allowed to use a signed NextAuth JWT
// cookie as a compatibility fallback. LMS, teacher, settings, accounting, and
// other Supabase APIs must not inherit legacy portal authentication.
const LEGACY_NEXTAUTH_API_PATHS = new Set([
  '/api/admin/active-logins',
  '/api/admin/announcement',
  '/api/admin/convert-raw',
  '/api/admin/convert-raw/status',
  '/api/admin/create-folder',
  '/api/admin/delete',
  '/api/admin/delete-item',
  '/api/admin/delete-lesson',
  '/api/admin/embed',
  '/api/admin/fix-hierarchy',
  '/api/admin/focus-analytics',
  '/api/admin/lessons',
  '/api/admin/migrate-to-r2',
  '/api/admin/move',
  '/api/admin/move-item',
  '/api/admin/purge-content',
  '/api/admin/purge-orphans',
  '/api/admin/purge-unsupported',
  '/api/admin/rename',
  '/api/admin/roles',
  '/api/admin/storage-stats',
  '/api/admin/subjects',
  '/api/admin/sync-hierarchy',
  '/api/admin/telemetry',
  '/api/admin/upload-complete',
  '/api/admin/upload-complete-batch',
  '/api/admin/upload-initiate',
  '/api/admin/upload-multipart',
  '/api/admin/users/manage',
  '/api/admin/users',
  '/api/admin/velocity',
  '/api/analytics/heartbeat',
  '/api/chat',
  '/api/forge',
  '/api/lms/navigation/search',
  '/api/log',
  '/api/messages',
  '/api/search',
  '/api/social/spotify',
  '/api/spotify/refresh',
  '/api/topology',
  '/api/user/achievements',
  '/api/user/snippets',
  '/api/user/sync-streak',
  '/api/whats-new',
]);

function matchesRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function isApiAuthExempt(pathname: string) {
  return (
    matchesRoute(pathname, NEXTAUTH_PROTOCOL_API) ||
    EXACT_API_AUTH_EXEMPTIONS.has(pathname)
  );
}

function createApiBearerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase server configuration is missing.');
  }

  return createSupabaseClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function protectApiRequest(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const originFailureOrPreflight = enforceApiOrigin(request);
  if (originFailureOrPreflight) return originFailureOrPreflight;

  const rateLimitPolicy = getApiRateLimitPolicy(pathname, request.method);
  if (rateLimitPolicy) {
    const rateLimitResponse = enforceApiRateLimit(
      request,
      rateLimitPolicy,
      'ip',
    );
    if (rateLimitResponse) return rateLimitResponse;
  }

  if (isApiAuthExempt(pathname)) {
    // Cron has its own Bearer secret. On the other bootstrap/protocol routes,
    // a supplied Authorization header is still authoritative and must be valid
    // Supabase auth.
    if (
      pathname !== '/api/cron/student-health' &&
      request.headers.has('authorization')
    ) {
      const result = await requireApiAuth(request, {
        bearerClientFactory: createApiBearerClient,
      });
      if (!result.ok) return result.response;
    }

    return applyApiCorsHeaders(request, NextResponse.next());
  }

  let response: NextResponse;
  let subject: string;

  // A supplied Authorization header is authoritative. It must contain a valid
  // Supabase access token and never downgrades to cookie/legacy authentication.
  if (pathname === '/api/mps/logout') {
    // Logout is not public: it authenticates with the parent portal's opaque,
    // server-validated HttpOnly session. A supplied Bearer remains
    // authoritative and must independently validate before this cookie path.
    if (request.headers.has('authorization')) {
      const result = await requireApiAuth(request, {
        bearerClientFactory: createApiBearerClient,
      });
      if (!result.ok) return result.response;
    }

    const parentSession = await validateParentPortalSessionToken(
      request.cookies.get(PARENT_PORTAL_SESSION_COOKIE)?.value,
    ).catch(() => null);
    if (!parentSession) return apiUnauthorized();

    response = NextResponse.next();
    subject = `mps:${parentSession.parent.id}`;
  } else if (request.headers.has('authorization')) {
    const result = await requireApiAuth(request, {
      bearerClientFactory: createApiBearerClient,
    });

    if (!result.ok) return result.response;

    response = NextResponse.next();
    subject = `supabase:${result.user.id}`;
  } else {
    // Browser APIs may use a validated Supabase SSR cookie. This request-bound
    // adapter also forwards any refreshed auth cookies to the eventual response.
    const supabaseContext = await getSupabaseRequestContext(request).catch(
      () => null,
    );

    if (supabaseContext?.userId) {
      response = supabaseContext.response;
      subject = `supabase:${supabaseContext.userId}`;
    } else {
      // Compatibility fallback for the legacy portal APIs while they continue
      // to use signed NextAuth JWT cookies.
      if (!LEGACY_NEXTAUTH_API_PATHS.has(pathname)) return apiUnauthorized();

      const legacySession = await auth().catch(() => null);
      if (!legacySession?.user?.id) return apiUnauthorized();

      response = supabaseContext?.response ?? NextResponse.next();
      subject = `nextauth:${legacySession.user.id}`;
    }
  }

  if (rateLimitPolicy) {
    const rateLimitResponse = enforceApiRateLimit(
      request,
      rateLimitPolicy,
      'subject',
      subject,
    );
    if (rateLimitResponse) return rateLimitResponse;
  }

  return applyApiCorsHeaders(request, response);
}

const LMS_PAGE_RULES: readonly {
  allowed: readonly Role[];
  notice: string;
  route: string;
}[] = [
  { route: '/admin', allowed: ADMIN_ROLES, notice: 'admin-required' },
  { route: '/teacher', allowed: TEACHING_ROLES, notice: 'teacher-required' },
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

  // @supabase/ssr supplies these headers whenever it rotates auth cookies.
  // They must survive redirects so a CDN cannot cache one user's refreshed
  // session response and so the browser receives the full settlement response.
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = response.headers.get(header);
    if (value) redirectResponse.headers.set(header, value);
  }

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

  if (matchesRoute(pathname, '/api')) {
    return protectApiRequest(request);
  }

  // Refresh an existing Supabase session even when a user navigates directly
  // to a sign-in page. Active users should not be shown a login form, and any
  // rotated cookie/header state must be attached to the redirect response.
  if (pathname === '/login' || pathname === '/lms/login') {
    const supabaseContext = await getSupabaseRequestContext(request);

    if (supabaseContext.userId && supabaseContext.supabase) {
      const { data: profile } = await supabaseContext.supabase
        .from('lms_users')
        .select('status')
        .eq('supabase_id', supabaseContext.userId)
        .maybeSingle();

      if (profile?.status === 'ACTIVE') {
        return redirectWithSessionCookies(
          new URL('/dashboard', request.url),
          supabaseContext.response,
        );
      }
    }

    if (pathname === '/login' && (await auth().catch(() => null))) {
      return redirectWithSessionCookies(
        new URL('/dashboard', request.url),
        supabaseContext.response,
      );
    }

    return supabaseContext.response;
  }

  // Allow public/static paths, PWA assets
  if (
    PUBLIC_PATHS.some((path) => matchesRoute(pathname, path)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/images/') ||
    PUBLIC_ASSET_PATHS.has(pathname) ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icon-')
  ) {
    return NextResponse.next();
  }

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
    const supabaseContext = await getSupabaseRequestContext(request);
    const { supabase, userId } = supabaseContext;

    if (!userId) {
      // Preserve the existing NextAuth-backed dashboard and exact legacy admin
      // landing page while the nested LMS workspaces use Supabase Auth.
      if (
        (isDashboardRoute || pathname === '/admin') &&
        (await auth().catch(() => null))
      ) {
        return supabaseContext.response;
      }

      const loginUrl = new URL('/lms/login', request.url);
      loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
      return redirectWithSessionCookies(loginUrl, supabaseContext.response);
    }

    const { data: profile, error } = await supabase!
      .from('lms_users')
      .select('active_session_token, role, status')
      .eq('supabase_id', userId)
      .maybeSingle();

    if (error || !profile) {
      const syncUrl = new URL('/auth/sync', request.url);
      syncUrl.searchParams.set(
        'next',
        `${pathname}${request.nextUrl.search}`,
      );
      return redirectWithSessionCookies(syncUrl, supabaseContext.response);
    }

    if (profile.status !== 'ACTIVE') {
      const loginUrl = new URL('/lms/login', request.url);
      loginUrl.searchParams.set('error', 'Your account is unavailable.');
      return redirectWithSessionCookies(loginUrl, supabaseContext.response);
    }

    if (
      profile.role === 'STUDENT' &&
      !hasValidActiveSession(
        {
          activeSessionToken: profile.active_session_token,
          role: profile.role,
        },
        request.cookies.get(ACTIVE_SESSION_COOKIE)?.value,
      )
    ) {
      await supabase!.auth.signOut({ scope: 'local' }).catch(() => undefined);
      const loginUrl = new URL('/lms/login', request.url);
      loginUrl.searchParams.set('reason', 'concurrent_login');
      loginUrl.searchParams.set(
        'next',
        `${pathname}${request.nextUrl.search}`,
      );
      const redirectResponse = redirectWithSessionCookies(
        loginUrl,
        supabaseContext.response,
      );
      redirectResponse.cookies.delete(ACTIVE_SESSION_COOKIE);
      return redirectResponse;
    }

    if (
      pageRule &&
      (!isLmsRole(profile.role) ||
        !hasLmsRole(profile.role, pageRule.allowed))
    ) {
      const dashboardUrl = new URL('/dashboard', request.url);
      dashboardUrl.searchParams.set('notice', pageRule.notice);
      return redirectWithSessionCookies(
        dashboardUrl,
        supabaseContext.response,
      );
    }

    return supabaseContext.response;
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
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-.*\\.png|apple-.*\\.png|manifest\\.json|sw\\.js|content/.*).*)'],
};
