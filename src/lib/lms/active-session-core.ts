import { createHash, randomBytes } from 'node:crypto';

export const ACTIVE_SESSION_COOKIE = 'active_session_id';
export const DEVICE_ID_COOKIE = 'oqool_device_id';
export const ACTIVE_SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
export const MAX_STUDENT_DEVICES = 2;

export function activeSessionCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ACTIVE_SESSION_COOKIE_MAX_AGE,
    path: '/',
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
  };
}

export function deviceIdCookieOptions() {
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

export function selectOldestSessionIdsToRevoke(
  activeSessions: ReadonlyArray<{ id: string }>,
  deviceLimit = MAX_STUDENT_DEVICES,
) {
  const retainedSessionCount = Math.max(0, deviceLimit);
  return activeSessions
    .slice(0, Math.max(0, activeSessions.length - retainedSessionCount))
    .map(({ id }) => id);
}

export function hasValidActiveSession(
  user: { activeSessionToken: string | null; role: string },
  cookieToken: string | undefined,
) {
  if (user.role !== 'STUDENT') return true;
  if (!user.activeSessionToken || !cookieToken) return false;

  return hashActiveSessionToken(cookieToken) === user.activeSessionToken;
}
