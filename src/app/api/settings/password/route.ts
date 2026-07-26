import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsUser } from '@/lib/lms/auth';
import { SettingsError } from '@/lib/lms/settings';
import { createSupabaseServerClient } from '@/lib/supabase/ssr-server';

export const dynamic = 'force-dynamic';

function readPasswords(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new SettingsError('Complete all password fields.');
  }

  const currentPassword = Reflect.get(value, 'currentPassword');
  const newPassword = Reflect.get(value, 'newPassword');
  const confirmPassword = Reflect.get(value, 'confirmPassword');

  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    typeof confirmPassword !== 'string'
  ) {
    throw new SettingsError('Complete all password fields.');
  }
  if (newPassword.length < 8 || newPassword.length > 128) {
    throw new SettingsError(
      'The new password must be between 8 and 128 characters.',
    );
  }
  if (newPassword !== confirmPassword) {
    throw new SettingsError('The new passwords do not match.');
  }
  if (currentPassword === newPassword) {
    throw new SettingsError(
      'Choose a new password that differs from the current password.',
    );
  }

  return { currentPassword, newPassword };
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new SettingsError('Invalid request origin.', 403);
    }

    await requireLmsUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new SettingsError('A valid JSON request body is required.');
    }
    const passwords = readPasswords(body);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({
      current_password: passwords.currentPassword,
      password: passwords.newPassword,
    });

    if (error) {
      throw new SettingsError(
        error.message.toLowerCase().includes('password')
          ? 'The current password is incorrect or the new password is not allowed.'
          : 'Unable to update the password.',
        400,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof SettingsError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS_PASSWORD_UPDATE]', error);
    return NextResponse.json(
      { error: 'Unable to update the password.' },
      { status: 500 },
    );
  }
}
