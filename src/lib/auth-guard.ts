import 'server-only';

import type { SupabaseClient, User } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/ssr-server';

const BEARER_TOKEN_PATTERN = /^Bearer[\t ]+([^\s,]+)$/i;

export type ApiAuthSource = 'bearer' | 'cookie';

export type ApiAuthSuccess = {
  accessToken: string | null;
  ok: true;
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
    { error: 'Unauthorized' },
    {
      status: 401,
      headers: {
        'Cache-Control': 'private, no-store',
        'WWW-Authenticate': 'Bearer',
      },
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

      return {
        accessToken,
        ok: true,
        source: 'bearer',
        user,
      };
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

    return {
      accessToken: null,
      ok: true,
      source: 'cookie',
      user,
    };
  } catch {
    return { ok: false, response: apiUnauthorized() };
  }
}
