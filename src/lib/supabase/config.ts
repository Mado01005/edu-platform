export const PRODUCTION_SITE_URL = 'https://edu-platform.me';

export const PRODUCTION_AUTH_CALLBACK_URLS = [
  'https://edu-platform.me/auth/callback',
  'https://www.edu-platform.me/auth/callback',
] as const;

const GOOGLE_PROVIDER_CALLBACK_PATH = '/auth/v1/callback';
const APPLICATION_CALLBACK_PATH = '/auth/callback';

function normalizeHttpOrigin(value: string | undefined) {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * Returns the provider callback that belongs in Google Cloud Console.
 *
 * This is not the `redirectTo` value used by `signInWithOAuth`. Supabase first
 * receives Google's response here, then redirects the browser to the
 * application callback from its URL allowlist.
 */
export function getGoogleOAuthRedirectUrl(
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
) {
  const origin = normalizeHttpOrigin(supabaseUrl);
  return origin
    ? new URL(GOOGLE_PROVIDER_CALLBACK_PATH, origin).toString()
    : null;
}

/** Returns the PKCE callback URL used as Supabase's `redirectTo` value. */
export function getApplicationOAuthCallbackUrl(
  applicationOrigin: string,
  next?: string,
) {
  const origin = normalizeHttpOrigin(applicationOrigin);
  if (!origin) {
    throw new Error('The authentication callback origin is not configured.');
  }

  const callback = new URL(APPLICATION_CALLBACK_PATH, origin);
  if (next) callback.searchParams.set('next', next);
  return callback.toString();
}
