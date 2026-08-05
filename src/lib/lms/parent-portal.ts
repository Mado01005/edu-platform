import 'server-only';

import { createHash, randomBytes, scrypt as rawScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { normalizePhoneNumber } from '@/lib/phone';
import { getPrisma } from '@/lib/prisma';

const scrypt = promisify(rawScrypt);
const SESSION_COOKIE = 'wayground_mps_session';
const SESSION_DAYS = 30;
const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const PIN_PATTERN = /^\d{4}$/;
const FAKE_PIN_HASH = '7a4e8d85270c02a8e76d5f44c6768ed0:5149e7499ab90aaa4743685b3df6e99d7241e61c764e408215cd79eb8adb92b8';

export class ParentPortalError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

function readPin(value: unknown) {
  if (typeof value !== 'string' || !PIN_PATTERN.test(value)) {
    throw new ParentPortalError('Enter a valid 4-digit PIN.');
  }
  return value;
}

async function derivePin(pin: string, salt: Buffer) {
  return (await scrypt(pin, salt, 32)) as Buffer;
}

export async function hashParentPin(value: unknown) {
  const pin = readPin(value);
  const salt = randomBytes(16);
  const derived = await derivePin(pin, salt);
  return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

async function verifyParentPin(pin: string, encoded: string) {
  const [saltHex, expectedHex] = encoded.split(':');
  if (!saltHex || !expectedHex) return false;
  try {
    const expected = Buffer.from(expectedHex, 'hex');
    const derived = await derivePin(pin, Buffer.from(saltHex, 'hex'));
    return expected.length === derived.length && timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export async function loginParentPortal(phoneValue: unknown, pinValue: unknown) {
  const phone =
    typeof phoneValue === 'string' ? normalizePhoneNumber(phoneValue) : null;
  const pin = readPin(pinValue);
  if (!phone) throw new ParentPortalError('Phone number or PIN is incorrect.', 401);

  const prisma = getPrisma();
  const parent = await prisma.user.findFirst({
    where: { phoneNumber: phone, role: 'PARENT', status: 'ACTIVE' },
    select: { id: true },
  });
  if (!parent) {
    await verifyParentPin(pin, FAKE_PIN_HASH);
    throw new ParentPortalError('Phone number or PIN is incorrect.', 401);
  }

  const valid = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`select pg_advisory_xact_lock(hashtextextended(${`parent-login:${parent.id}`}, 0))`,
    );
    const credential = await tx.parentPortalCredential.findUnique({
      where: { parentId: parent.id },
    });
    const now = new Date();
    if (!credential) {
      await verifyParentPin(pin, FAKE_PIN_HASH);
      return false;
    }
    if (credential.lockedUntil && credential.lockedUntil > now) {
      throw new ParentPortalError('Too many attempts. Try again in 15 minutes.', 429);
    }
    const matches = await verifyParentPin(pin, credential.pinHash);
    if (!matches) {
      const failedAttempts = credential.failedAttempts + 1;
      await tx.parentPortalCredential.update({
        where: { parentId: parent.id },
        data: {
          failedAttempts: failedAttempts >= MAX_ATTEMPTS ? 0 : failedAttempts,
          lockedUntil:
            failedAttempts >= MAX_ATTEMPTS
              ? new Date(now.getTime() + LOCK_MINUTES * 60_000)
              : null,
        },
      });
      return false;
    }
    await tx.parentPortalCredential.update({
      where: { parentId: parent.id },
      data: { failedAttempts: 0, lastLoginAt: now, lockedUntil: null },
    });
    return true;
  });
  if (!valid) throw new ParentPortalError('Phone number or PIN is incorrect.', 401);

  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1_000);
  await prisma.parentPortalSession.create({
    data: { expiresAt, parentId: parent.id, tokenHash: hashSessionToken(token) },
  });
  return { expiresAt, token };
}

export async function setParentSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    expires: expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
}

export async function getParentPortalSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const prisma = getPrisma();
  const session = await prisma.parentPortalSession.findFirst({
    where: {
      expiresAt: { gt: new Date() },
      revokedAt: null,
      tokenHash: hashSessionToken(token),
      parent: { role: 'PARENT', status: 'ACTIVE' },
    },
    select: {
      id: true,
      lastSeenAt: true,
      parent: { select: { email: true, id: true, name: true, phoneNumber: true } },
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

export async function logoutParentPortal() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await getPrisma().parentPortalSession.updateMany({
      where: { revokedAt: null, tokenHash: hashSessionToken(token) },
      data: { revokedAt: new Date() },
    });
  }
  store.delete(SESSION_COOKIE);
}

export async function configureParentAccess({
  parentId,
  pin,
  studentId,
}: {
  parentId: unknown;
  pin: unknown;
  studentId: unknown;
}) {
  if (typeof parentId !== 'string' || typeof studentId !== 'string') {
    throw new ParentPortalError('Parent and student are required.');
  }
  const pinHash = await hashParentPin(pin);
  const prisma = getPrisma();
  return prisma.$transaction(async (tx) => {
    const [parent, student] = await Promise.all([
      tx.user.findFirst({ where: { id: parentId, role: 'PARENT', status: 'ACTIVE' }, select: { id: true } }),
      tx.user.findFirst({ where: { id: studentId, role: 'STUDENT', status: 'ACTIVE' }, select: { id: true } }),
    ]);
    if (!parent || !student) throw new ParentPortalError('Active parent or student not found.', 404);
    await tx.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId },
      update: {},
    });
    await tx.parentPortalCredential.upsert({
      where: { parentId },
      create: { parentId, pinHash },
      update: { failedAttempts: 0, lockedUntil: null, pinHash },
    });
    await tx.parentPortalSession.updateMany({
      where: { parentId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { parentId, studentId };
  });
}

export async function removeParentStudentLink(parentId: unknown, studentId: unknown) {
  if (typeof parentId !== 'string' || typeof studentId !== 'string') {
    throw new ParentPortalError('Parent and student are required.');
  }
  await getPrisma().parentStudent.deleteMany({ where: { parentId, studentId } });
}
