import 'server-only';

import { createHash } from 'node:crypto';
import { getPrisma } from '@/lib/prisma';

export const PARENT_PORTAL_SESSION_COOKIE = 'wayground_mps_session';

const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export function hashParentPortalSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** Validates the opaque MPS cookie against a live, active parent session. */
export async function validateParentPortalSessionToken(
  token: string | null | undefined,
) {
  if (!token || !SESSION_TOKEN_PATTERN.test(token)) return null;

  const prisma = getPrisma();
  const session = await prisma.parentPortalSession.findFirst({
    where: {
      expiresAt: { gt: new Date() },
      revokedAt: null,
      tokenHash: hashParentPortalSessionToken(token),
      parent: { role: 'PARENT', status: 'ACTIVE' },
    },
    select: {
      id: true,
      lastSeenAt: true,
      parent: {
        select: { email: true, id: true, name: true, phoneNumber: true },
      },
    },
  });

  if (!session) return null;

  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60_000) {
    await prisma.parentPortalSession.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  return session;
}
