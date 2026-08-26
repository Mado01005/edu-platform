import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { GradeLevel } from '@prisma/client';
import { normalizePhoneNumber } from '@/lib/phone';
import {
  ACTIVE_SESSION_COOKIE,
  DEVICE_ID_COOKIE,
  activateStudentSession,
  activeSessionCookieOptions,
  deviceIdCookieOptions,
  normalizeOrCreateDeviceId,
  readClientIp,
} from '@/lib/lms/active-session';
import { recalculateStudentHealthScores } from '@/lib/lms/health';
import { getPrisma } from '@/lib/prisma';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const DEFAULT_AUTH_REDIRECT = '/dashboard';
const MAX_REDIRECT_PATH_LENGTH = 2_048;

function safeNextPath(value: string | null) {
  if (
    !value ||
    value.length > MAX_REDIRECT_PATH_LENGTH ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const base = new URL('https://auth-redirect.invalid');
    const target = new URL(value, base);

    if (target.origin !== base.origin) {
      return DEFAULT_AUTH_REDIRECT;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

function authErrorMessage(error: string | null, errorCode: string | null) {
  const reason = (errorCode ?? error)?.toLowerCase();

  if (reason === 'access_denied') {
    return 'Sign-in was cancelled.';
  }

  if (reason === 'temporarily_unavailable' || reason === 'server_error') {
    return 'Sign-in is temporarily unavailable. Please try again.';
  }

  return 'Unable to complete sign in. Please try again.';
}

function loginErrorRedirect(
  origin: string,
  message: string,
  next: string,
  reason: 'oauth_failed' | 'oauth_missing_code' | 'oauth_provider_error',
) {
  const errorUrl = new URL('/lms/login', origin);
  errorUrl.searchParams.set('error', message);
  errorUrl.searchParams.set('next', next);
  errorUrl.searchParams.set('reason', reason);

  const response = NextResponse.redirect(errorUrl);
  response.headers.set(
    'Cache-Control',
    'private, no-cache, no-store, must-revalidate, max-age=0',
  );
  return response;
}

function createOAuthCallbackClient(
  request: NextRequest,
  response: NextResponse,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Supabase server configuration is missing.');
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });
}

function readGradeLevel(value: unknown): GradeLevel | null {
  return typeof value === 'string' && /^GRADE_(?:[1-9]|1[0-2])$/.test(value)
    ? (value as GradeLevel)
    : null;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { origin, searchParams } = requestUrl;
  const code = searchParams.get('code');
  const next = safeNextPath(searchParams.get('next'));
  const oauthError = searchParams.get('error');
  const oauthErrorCode = searchParams.get('error_code');

  if (oauthError || oauthErrorCode || searchParams.has('error_description')) {
    return loginErrorRedirect(
      origin,
      authErrorMessage(oauthError, oauthErrorCode),
      next,
      'oauth_provider_error',
    );
  }

  if (!code) {
    return loginErrorRedirect(
      origin,
      'The sign-in link is missing or has expired. Please try again.',
      next,
      'oauth_missing_code',
    );
  }

  try {
    // Bind Supabase's PKCE verifier cleanup and new session cookies directly
    // to the redirect that reaches the browser. A separate cookies() store can
    // lose those mutations when a new NextResponse is constructed afterward.
    const response = NextResponse.redirect(new URL(next, origin));
    const supabase = createOAuthCallbackClient(request, response);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const user = data.session?.user;

    if (!error && user?.email) {
      const metadataPhone = normalizePhoneNumber(
        typeof user.user_metadata?.phone_number === 'string'
          ? user.user_metadata.phone_number
          : '',
      );
      let synchronizedAuthUser = user;

      if (metadataPhone && !normalizePhoneNumber(user.phone ?? '')) {
        const { data: linkedPhone, error: phoneLinkError } =
          await getSupabaseAdminClient().auth.admin.updateUserById(user.id, {
            phone: metadataPhone,
            phone_confirm: false,
            user_metadata: {
              ...user.user_metadata,
              phone_number: metadataPhone,
            },
          });
        if (!phoneLinkError && linkedPhone.user) {
          synchronizedAuthUser = linkedPhone.user;
        } else {
          // Keep email confirmation healthy when Supabase Phone Auth has not
          // been configured yet. The number remains staged in metadata and
          // Prisma, but is not treated as a verified Auth phone.
          console.warn(
            '[LMS_AUTH_PHONE_LINK_DEFERRED]',
            phoneLinkError?.code ?? 'phone-provider-unavailable',
          );
        }
      }

      const metadataName =
        synchronizedAuthUser.user_metadata?.full_name ??
        synchronizedAuthUser.user_metadata?.name;
      const hasMetadataName =
        typeof metadataName === 'string' && metadataName.trim();
      const name = hasMetadataName ? metadataName.trim() : 'New Student';
      const phoneNumber =
        normalizePhoneNumber(synchronizedAuthUser.phone ?? '') ?? metadataPhone;
      const phoneVerified = Boolean(
        phoneNumber &&
          normalizePhoneNumber(synchronizedAuthUser.phone ?? '') ===
            phoneNumber &&
          synchronizedAuthUser.phone_confirmed_at,
      );
      const gradeLevel = readGradeLevel(
        synchronizedAuthUser.user_metadata?.grade_level,
      );

      const profile = await getPrisma().user.upsert({
        where: { supabaseId: user.id },
        update: {
          email: user.email.toLowerCase(),
          ...(hasMetadataName ? { name } : {}),
          phoneNumber,
          phoneVerified,
          ...(gradeLevel ? { gradeLevel } : {}),
        },
        create: {
          supabaseId: user.id,
          email: user.email.toLowerCase(),
          name,
          phoneNumber,
          phoneVerified,
          gradeLevel,
          role: 'STUDENT',
        },
      });
      await recalculateStudentHealthScores([profile.id]);

      const deviceId = normalizeOrCreateDeviceId(
        request.cookies.get(DEVICE_ID_COOKIE)?.value,
      );
      const activeSessionToken = await activateStudentSession(
        profile,
        request.headers.get('user-agent'),
        deviceId,
        readClientIp(request.headers),
      );
      if (activeSessionToken) {
        response.cookies.set(
          ACTIVE_SESSION_COOKIE,
          activeSessionToken,
          activeSessionCookieOptions(),
        );
        response.cookies.set(
          DEVICE_ID_COOKIE,
          deviceId,
          deviceIdCookieOptions(),
        );
      } else {
        response.cookies.delete(ACTIVE_SESSION_COOKIE);
      }
      response.headers.set(
        'Cache-Control',
        'private, no-cache, no-store, must-revalidate, max-age=0',
      );
      return response;
    }
  } catch {
    // A valid Auth session without a synchronized LMS profile must not enter
    // the application. Do not expose provider or database errors in the URL.
  }

  return loginErrorRedirect(
    origin,
    'Unable to complete sign in. Please try again.',
    next,
    'oauth_failed',
  );
}
