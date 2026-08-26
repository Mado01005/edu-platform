import 'server-only';

import { Prisma, type User } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import {
  generateActiveSessionToken,
  hashActiveSessionToken,
  selectOldestSessionIdsToRevoke,
} from '@/lib/lms/active-session-core';
import { getPrisma } from '@/lib/prisma';

export {
  ACTIVE_SESSION_COOKIE,
  ACTIVE_SESSION_COOKIE_MAX_AGE,
  activeSessionCookieOptions,
  DEVICE_ID_COOKIE,
  deviceIdCookieOptions,
  hashActiveSessionToken,
  hasValidActiveSession,
} from '@/lib/lms/active-session-core';

type SessionUser = Pick<User, 'activeSessionToken' | 'id' | 'role'>;
const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{24}$/;

export function normalizeOrCreateDeviceId(value: string | undefined) {
  return value && DEVICE_ID_PATTERN.test(value)
    ? value
    : randomBytes(18).toString('base64url');
}

export function readClientIp(headers: Headers) {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const direct = headers.get('x-real-ip')?.trim();
  return (forwarded || direct || null)?.slice(0, 128) ?? null;
}

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
  deviceId = normalizeOrCreateDeviceId(undefined),
  ipAddress: string | null = null,
) {
  if (user.role !== 'STUDENT') return null;

  const token = generateActiveSessionToken();
  const tokenHash = hashActiveSessionToken(token);
  const now = new Date();
  await getPrisma().$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`select pg_advisory_xact_lock(hashtextextended(${`student-device:${user.id}`}, 0))`,
    );
    await tx.userSession.upsert({
      where: { userId_deviceId: { deviceId, userId: user.id } },
      create: {
        deviceId,
        ipAddress,
        lastActiveAt: now,
        tokenHash,
        userAgent: userAgent?.trim().slice(0, 1_000) || 'Unknown Device',
        userId: user.id,
      },
      update: {
        ipAddress,
        lastActiveAt: now,
        revokedAt: null,
        tokenHash,
        userAgent: userAgent?.trim().slice(0, 1_000) || 'Unknown Device',
      },
    });
    const active = await tx.userSession.findMany({
      where: { userId: user.id, revokedAt: null },
      orderBy: [{ lastActiveAt: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    const sessionIdsToRevoke = selectOldestSessionIdsToRevoke(active);
    if (sessionIdsToRevoke.length) {
      await tx.userSession.updateMany({
        where: { id: { in: sessionIdsToRevoke } },
        data: { revokedAt: now },
      });
    }
    // Retain the legacy columns during the rollout so older deployments can
    // still identify the latest login while the session ledger is deployed.
    await tx.user.update({
      where: { id: user.id },
      data: {
        activeSessionToken: tokenHash,
        lastLoginAt: now,
        lastLoginDevice: describeLoginDevice(userAgent),
      },
    });
  });

  return token;
}

export async function deactivateStudentSession(
  user: Pick<SessionUser, 'id' | 'role'>,
  cookieToken: string | undefined,
) {
  if (user.role !== 'STUDENT' || !cookieToken) return;

  const tokenHash = hashActiveSessionToken(cookieToken);
  const now = new Date();
  await getPrisma().$transaction([
    getPrisma().userSession.updateMany({
      where: { tokenHash, userId: user.id },
      data: { revokedAt: now },
    }),
    getPrisma().user.updateMany({
      where: { activeSessionToken: tokenHash, id: user.id },
      data: { activeSessionToken: null },
    }),
  ]);
}

export async function hasValidStudentSession(
  user: Pick<SessionUser, 'id' | 'role'>,
  cookieToken: string | undefined,
) {
  if (user.role !== 'STUDENT') return true;
  if (!cookieToken) return false;

  const tokenHash = hashActiveSessionToken(cookieToken);
  const session = await getPrisma().userSession.findFirst({
    where: { revokedAt: null, tokenHash, userId: user.id },
    select: { id: true, lastActiveAt: true },
  });
  if (!session) return false;
  if (Date.now() - session.lastActiveAt.getTime() > 60_000) {
    await getPrisma().userSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { lastActiveAt: new Date() },
    });
  }
  return true;
}
