import 'server-only';

import type { Role, User as LmsUser } from '@prisma/client';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/supabase/ssr-server';

const BEARER_TOKEN_PATTERN = /^Bearer[\t ]+([^\s,]+)$/i;

export type ApiAuthSource = 'bearer' | 'cookie';

export type ApiAuthSuccess = {
  accessToken: string | null;
  ok: true;
  profile: LmsUser | null;
  role: Role | null;
  source: ApiAuthSource;
  user: User;
};

export type ApiAuthFailure = {
  ok: false;
  response: NextResponse;
};

export type ApiAuthResult = ApiAuthSuccess | ApiAuthFailure;

export type RequireApiAuthOptions = {
  /**
   * Allows an existing Supabase SSR cookie to authenticate a browser request
   * when no Authorization header was sent. Bearer-only is the secure default.
   * A present but malformed or invalid Authorization header never falls back
   * to cookies.
   */
  allowCookieAuth?: boolean;
  /**
   * Resolves the validated Supabase identity against the authoritative Prisma
   * profile and enforces its current role. SUPER_ADMIN is always allowed.
   * Omitting this option keeps the lightweight identity-only behavior used by
   * Proxy.
   */
  allowedRoles?: readonly Role[];
  /**
   * Proxy has its own request/cookie lifecycle, so callers there must provide
   * a stateless client for explicit Bearer validation instead of constructing
   * the regular `next/headers` SSR client.
   */
  bearerClientFactory?: () =>
    | Pick<SupabaseClient, 'auth'>
    | Promise<Pick<SupabaseClient, 'auth'>>;
};

export function apiUnauthorized(): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized: Session missing or invalid.' },
    {
      status: 401,
      headers: {
        'Cache-Control': 'private, no-store',
        'WWW-Authenticate': 'Bearer',
      },
    },
  );
}

export function apiForbidden(): NextResponse {
  return NextResponse.json(
    { error: 'Forbidden: Insufficient permissions.' },
    {
      status: 403,
      headers: { 'Cache-Control': 'private, no-store' },
    },
  );
}

function readBearerToken(authorization: string) {
  const match = BEARER_TOKEN_PATTERN.exec(authorization);
  return match?.[1] ?? null;
}

/**
 * Authenticates an API request with a server-validated Supabase access token.
 *
 * This deliberately calls `getUser(token)` instead of trusting `getSession()`:
 * the latter reads potentially spoofable request storage and does not validate
 * the embedded user. Cookie auth is opt-in for existing same-origin browser
 * flows and is also validated by Supabase Auth with `getUser()`.
 */
export async function requireApiAuth(
  request: Request,
  options: RequireApiAuthOptions = {},
): Promise<ApiAuthResult> {
  async function authorizeUser(
    user: User,
    accessToken: string | null,
    source: ApiAuthSource,
  ): Promise<ApiAuthResult> {
    if (!options.allowedRoles?.length) {
      return {
        accessToken,
        ok: true,
        profile: null,
        role: null,
        source,
        user,
      };
    }

    const profile = await getPrisma().user.findUnique({
      where: { supabaseId: user.id },
    });

    if (!profile || profile.status !== 'ACTIVE') {
      return { ok: false, response: apiForbidden() };
    }

    if (
      profile.role !== 'SUPER_ADMIN' &&
      !options.allowedRoles.includes(profile.role)
    ) {
      return { ok: false, response: apiForbidden() };
    }

    return {
      accessToken,
      ok: true,
      profile,
      role: profile.role,
      source,
      user,
    };
  }

  const authorization = request.headers.get('authorization');

  if (authorization !== null) {
    const accessToken = readBearerToken(authorization);
    if (!accessToken) {
      return { ok: false, response: apiUnauthorized() };
    }

    try {
      const supabase = options.bearerClientFactory
        ? await options.bearerClientFactory()
        : await createSupabaseServerClient();
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(accessToken);

      if (error || !user) {
        return { ok: false, response: apiUnauthorized() };
      }

      return authorizeUser(user, accessToken, 'bearer');
    } catch {
      return { ok: false, response: apiUnauthorized() };
    }
  }

  if (!options.allowCookieAuth) {
    return { ok: false, response: apiUnauthorized() };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: false, response: apiUnauthorized() };
    }

    return authorizeUser(user, null, 'cookie');
  } catch {
    return { ok: false, response: apiUnauthorized() };
  }
}
