import 'server-only';

import type { Role, User } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getPrisma } from '@/lib/prisma';
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
  const email = claims?.email;

  if (
    !claims ||
    error ||
    typeof supabaseId !== 'string' ||
    typeof email !== 'string' ||
    !email.trim()
  ) {
    return null;
  }

  return {
    supabaseId,
    email: email.trim().toLowerCase(),
    name: readDisplayName(claims),
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

  if (
    user.email !== identity.email ||
    (identity.name && user.name !== identity.name)
  ) {
    return getPrisma().user.update({
      where: { id: user.id },
      data: {
        email: identity.email,
        ...(identity.name ? { name: identity.name } : {}),
      },
    });
  }

  return user;
}

export async function requireAdminPage() {
  const user = await requireLmsPageUser();

  if (user.role !== 'ADMIN') {
    redirect('/dashboard?notice=admin-required');
  }

  return user;
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

export async function requireTeacherPage() {
  const user = await requireLmsPageUser();

  if (user.role !== 'TEACHER' && user.role !== 'ADMIN') {
    redirect('/catalog');
  }

  return user;
}
