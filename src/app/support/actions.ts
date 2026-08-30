'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  createStudentSupportNotice,
  resendStudentNotification,
  resetStudentTemporaryPassword,
  SupportPortalError,
} from '@/lib/lms/support';
import { requireLmsRole } from '@/lib/lms/auth';
import { SUPPORT_ROLES } from '@/lib/lms/roles';

function readText(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key);

  if (typeof value !== 'string') return '';

  return value.slice(0, maxLength);
}

function supportDestination(
  formData: FormData,
  state: { error?: string; notice?: string },
) {
  const params = new URLSearchParams();
  const query = readText(formData, 'query', 160).trim();
  const studentId = readText(formData, 'studentId', 100).trim();

  if (query) params.set('q', query);
  if (studentId) params.set('student', studentId);
  if (state.notice) params.set('notice', state.notice);
  if (state.error) params.set('error', state.error);

  return `/support/operations?${params.toString()}`;
}

function errorCode(error: unknown) {
  if (error instanceof SupportPortalError) return error.code;

  console.error('[SUPPORT_PORTAL_ACTION]', error);
  return 'operation-failed';
}

export async function resetStudentPasswordAction(formData: FormData) {
  await requireLmsRole(SUPPORT_ROLES);
  let failure: string | null = null;

  try {
    await resetStudentTemporaryPassword({
      confirmation: formData.get('confirmation') === 'confirmed',
      password: readText(formData, 'password', 129),
      passwordConfirmation: readText(
        formData,
        'passwordConfirmation',
        129,
      ),
      studentId: readText(formData, 'studentId', 100),
    });
  } catch (error) {
    failure = errorCode(error);
  }

  if (failure) {
    redirect(supportDestination(formData, { error: failure }));
  }

  revalidatePath('/support/operations');
  redirect(supportDestination(formData, { notice: 'password-reset' }));
}

export async function createSupportNoticeAction(formData: FormData) {
  await requireLmsRole(SUPPORT_ROLES);
  let failure: string | null = null;

  try {
    await createStudentSupportNotice({
      message: readText(formData, 'message', 1_001),
      studentId: readText(formData, 'studentId', 100),
      title: readText(formData, 'title', 121),
    });
  } catch (error) {
    failure = errorCode(error);
  }

  if (failure) {
    redirect(supportDestination(formData, { error: failure }));
  }

  revalidatePath('/support/operations');
  redirect(supportDestination(formData, { notice: 'notice-created' }));
}

export async function resendNotificationAction(formData: FormData) {
  await requireLmsRole(SUPPORT_ROLES);
  let failure: string | null = null;

  try {
    await resendStudentNotification({
      notificationId: readText(formData, 'notificationId', 100),
      studentId: readText(formData, 'studentId', 100),
    });
  } catch (error) {
    failure = errorCode(error);
  }

  if (failure) {
    redirect(supportDestination(formData, { error: failure }));
  }

  revalidatePath('/support/operations');
  redirect(supportDestination(formData, { notice: 'notice-resent' }));
}
