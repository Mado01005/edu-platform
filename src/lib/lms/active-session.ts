import 'server-only';

import type { User } from '@prisma/client';
import {
  generateActiveSessionToken,
  hashActiveSessionToken,
} from '@/lib/lms/active-session-core';
import { getPrisma } from '@/lib/prisma';

export {
  ACTIVE_SESSION_COOKIE,
  ACTIVE_SESSION_COOKIE_MAX_AGE,
  activeSessionCookieOptions,
  hashActiveSessionToken,
  hasValidActiveSession,
} from '@/lib/lms/active-session-core';

type SessionUser = Pick<User, 'activeSessionToken' | 'id' | 'role'>;

export function describeLoginDevice(userAgent: string | null) {
  if (!userAgent?.trim()) return 'Unknown Device';

  const browser = /Edg\//.test(userAgent)
    ? 'Edge'
    : /OPR\//.test(userAgent)
      ? 'Opera'
      : /CriOS\//.test(userAgent)
        ? 'Chrome'
        : /FxiOS\//.test(userAgent)
          ? 'Firefox'
          : /Chrome\//.test(userAgent)
            ? 'Chrome'
            : /Firefox\//.test(userAgent)
              ? 'Firefox'
              : /Safari\//.test(userAgent)
                ? 'Safari'
                : 'Browser';
  const device = /iPhone/.test(userAgent)
    ? 'iPhone'
    : /iPad/.test(userAgent)
      ? 'iPad'
      : /Android/.test(userAgent)
        ? 'Android'
        : /Windows/.test(userAgent)
          ? 'Windows'
          : /Macintosh|Mac OS X/.test(userAgent)
            ? 'macOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : 'Unknown Device';

  return `${browser} on ${device}`;
}

export async function activateStudentSession(
  user: Pick<SessionUser, 'id' | 'role'>,
  userAgent: string | null,
) {
  if (user.role !== 'STUDENT') return null;

  const token = generateActiveSessionToken();
  await getPrisma().user.update({
    where: { id: user.id },
    data: {
      activeSessionToken: hashActiveSessionToken(token),
      lastLoginAt: new Date(),
      lastLoginDevice: describeLoginDevice(userAgent),
    },
  });

  return token;
}

export async function deactivateStudentSession(
  user: Pick<SessionUser, 'id' | 'role'>,
  cookieToken: string | undefined,
) {
  if (user.role !== 'STUDENT' || !cookieToken) return;

  await getPrisma().user.updateMany({
    where: {
      activeSessionToken: hashActiveSessionToken(cookieToken),
      id: user.id,
    },
    data: { activeSessionToken: null },
  });
}
