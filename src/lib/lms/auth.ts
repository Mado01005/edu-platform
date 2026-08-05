import 'server-only';

import type { Role, User } from '@prisma/client';
import { redirect } from 'next/navigation';
import { normalizePhoneNumber } from '@/lib/phone';
import { getPrisma } from '@/lib/prisma';
import { recordStudentActivity } from '@/lib/lms/health';
import {
  ADMIN_ROLES,
  TEACHING_ROLES,
  hasLmsRole,
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
  };
}

export async function getLmsUser(): Promise<User | null> {
  const identity = await getVerifiedLmsIdentity();

  if (!identity) {
    return null;
  }

  const user = await getPrisma().user.findUnique({
    where: { supabaseId: identity.supabaseId },
  });

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

  if (activeUser.role === 'STUDENT') {
    try {
      await recordStudentActivity(activeUser.id);
    } catch (error) {
      console.error('[LMS_STUDENT_ACTIVITY_TOUCH]', error);
    }
  }

  return activeUser;
}

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
  const user = await getLmsUser();

  if (!user) {
    redirect('/lms/login');
  }

  return user;
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
