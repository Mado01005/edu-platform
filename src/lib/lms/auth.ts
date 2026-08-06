import 'server-only';

import { Prisma, type Role, type User } from '@prisma/client';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { cache } from 'react';
import {
  ACTIVE_SESSION_COOKIE,
  hasValidActiveSession,
} from '@/lib/lms/active-session';
import { normalizePhoneNumber } from '@/lib/phone';
import { getPrisma } from '@/lib/prisma';
import { recordStudentActivity } from '@/lib/lms/health';
import {
  ADMIN_ROLES,
  TEACHING_ROLES,
  hasLmsRole,
  isLmsRole,
} from '@/lib/lms/roles';
import { createSupabaseServerClient } from '@/lib/supabase/ssr-server';

export class LmsAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

function readDisplayName(claims: Record<string, unknown>) {
  const metadata = claims.user_metadata;

  if (!metadata || typeof metadata !== 'object') {
    return null;
  }

  const candidate =
    Reflect.get(metadata, 'full_name') ??
    Reflect.get(metadata, 'name') ??
    Reflect.get(metadata, 'display_name');

  return typeof candidate === 'string' && candidate.trim()
    ? candidate.trim()
    : null;
}

function readAppRole(claims: Record<string, unknown>): Role {
  const metadata = claims.app_metadata;
  const role =
    metadata && typeof metadata === 'object'
      ? Reflect.get(metadata, 'role')
      : null;

  return isLmsRole(role) ? role : 'STUDENT';
}

export async function getVerifiedLmsIdentity() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims as Record<string, unknown> | undefined;
  const supabaseId = claims?.sub;
  const claimEmail = claims?.email;
  const claimPhone = claims?.phone;
  const phoneNumber =
    typeof claimPhone === 'string'
      ? normalizePhoneNumber(claimPhone)
      : null;
  const email =
    typeof claimEmail === 'string' && claimEmail.trim()
      ? claimEmail.trim().toLowerCase()
      : typeof supabaseId === 'string' && phoneNumber
        ? `${supabaseId}@invalid.local`
        : null;

  if (
    !claims ||
    error ||
    typeof supabaseId !== 'string' ||
    !email
  ) {
    return null;
  }

  return {
    supabaseId,
    email,
    name: readDisplayName(claims),
    phoneNumber,
    role: readAppRole(claims),
  };
}

async function synchronizeLmsUser(
  identity: NonNullable<Awaited<ReturnType<typeof getVerifiedLmsIdentity>>>,
) {
  const prisma = getPrisma();
  let user = await prisma.user.findUnique({
    where: { supabaseId: identity.supabaseId },
  });

  if (user) return user;

  const existingEmailUser = await prisma.user.findUnique({
    where: { email: identity.email },
  });

  if (existingEmailUser) {
    return prisma.user.update({
      where: { id: existingEmailUser.id },
      data: {
        supabaseId: identity.supabaseId,
        ...(identity.name ? { name: identity.name } : {}),
        ...(identity.phoneNumber
          ? { phoneNumber: identity.phoneNumber }
          : {}),
      },
    });
  }

  try {
    user = await prisma.user.create({
      data: {
        email: identity.email,
        name: identity.name,
        phoneNumber: identity.phoneNumber,
        role: identity.role,
        supabaseId: identity.supabaseId,
      },
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      throw error;
    }

    user = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseId: identity.supabaseId },
          { email: identity.email },
        ],
      },
    });
  }

  return user;
}

export const getLmsUserWithoutActiveSessionCheck = cache(
  async function getLmsUserWithoutActiveSessionCheck(): Promise<User | null> {
    const identity = await getVerifiedLmsIdentity();

    if (!identity) {
      return null;
    }

    const user = await synchronizeLmsUser(identity);

    if (!user || user.status !== 'ACTIVE') {
      return null;
    }

    let activeUser = user;

    if (
      user.email !== identity.email ||
      (identity.name && user.name !== identity.name) ||
      (identity.phoneNumber && user.phoneNumber !== identity.phoneNumber)
    ) {
      activeUser = await getPrisma().user.update({
        where: { id: user.id },
        data: {
          email: identity.email,
          ...(identity.name ? { name: identity.name } : {}),
          ...(identity.phoneNumber
            ? { phoneNumber: identity.phoneNumber }
            : {}),
        },
      });
    }

    return activeUser;
  },
);

export type LmsAuthState = {
  reason: 'concurrent_login' | 'signed_out' | null;
  user: User | null;
};

export const getLmsAuthState = cache(
  async function getLmsAuthState(): Promise<LmsAuthState> {
    const activeUser = await getLmsUserWithoutActiveSessionCheck();
    if (!activeUser) {
      return { reason: 'signed_out', user: null };
    }

    if (activeUser.role === 'STUDENT') {
      const cookieStore = await cookies();
      const cookieToken = cookieStore.get(ACTIVE_SESSION_COOKIE)?.value;
      if (!hasValidActiveSession(activeUser, cookieToken)) {
        return { reason: 'concurrent_login', user: null };
      }

      try {
        await recordStudentActivity(activeUser.id);
      } catch (error) {
        console.error('[LMS_STUDENT_ACTIVITY_TOUCH]', error);
      }
    }

    return { reason: null, user: activeUser };
  },
);

export const getLmsUser = cache(async function getLmsUser() {
  return (await getLmsAuthState()).user;
});

export async function requireAdminPage() {
  return requireLmsPageRole(ADMIN_ROLES, 'admin-required');
}

export async function requireLmsUser(): Promise<User> {
  const user = await getLmsUser();

  if (!user) {
    throw new LmsAuthError('Authentication required.');
  }

  return user;
}

export async function requireLmsRole(
  allowed: readonly Role[],
): Promise<User> {
  const user = await requireLmsUser();

  if (!allowed.includes(user.role)) {
    throw new LmsAuthError('You do not have access to this resource.', 403);
  }

  return user;
}

export async function requireLmsPageUser() {
  const state = await getLmsAuthState();

  if (!state.user) {
    if (state.reason === 'concurrent_login') {
      redirect('/lms/login?reason=concurrent_login');
    }
    redirect('/lms/login');
  }

  return state.user;
}

export async function requireLmsPageRole(
  allowed: readonly Role[],
  notice = 'role-required',
) {
  const user = await requireLmsPageUser();

  if (!hasLmsRole(user.role, allowed)) {
    redirect(`/dashboard?notice=${encodeURIComponent(notice)}`);
  }

  return user;
}

export async function requireTeacherPage() {
  return requireLmsPageRole(TEACHING_ROLES, 'teacher-required');
}
