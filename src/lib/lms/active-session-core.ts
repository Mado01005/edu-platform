import { createHash, randomBytes } from 'node:crypto';

export const ACTIVE_SESSION_COOKIE = 'active_session_id';
export const ACTIVE_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function activeSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ACTIVE_SESSION_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function hashActiveSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function generateActiveSessionToken() {
  return randomBytes(24).toString('base64url');
}

export function hasValidActiveSession(
  user: { activeSessionToken: string | null; role: string },
  cookieToken: string | undefined,
) {
  if (user.role !== 'STUDENT') return true;
  if (!user.activeSessionToken || !cookieToken) return false;

  return hashActiveSessionToken(cookieToken) === user.activeSessionToken;
}
