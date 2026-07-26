import 'server-only';

import type { User } from '@prisma/client';
import { deleteR2Object } from '@/lib/r2';
import { getPrisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/phone';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2] as const;
export const VIDEO_QUALITIES = ['AUTO', '1080P', '720P', '480P'] as const;

export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];
export type VideoQuality = (typeof VIDEO_QUALITIES)[number];

export class SettingsError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

function optionalText(
  value: unknown,
  label: string,
  maximumLength: number,
) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new SettingsError(`${label} must be text.`);
  }

  const normalized = value.trim();
  if (!normalized) return null;
  if (normalized.length > maximumLength) {
    throw new SettingsError(
      `${label} must be ${maximumLength} characters or fewer.`,
    );
  }
  return normalized;
}

function requiredName(value: unknown) {
  if (typeof value !== 'string') {
    throw new SettingsError('Full name is required.');
  }
  const name = value.trim();
  if (name.length < 2 || name.length > 100) {
    throw new SettingsError('Full name must be between 2 and 100 characters.');
  }
  return name;
}

function optionalPhone(value: unknown) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string') {
    throw new SettingsError('Phone number must be text.');
  }

  const normalized = normalizePhoneNumber(value);
  if (!normalized) {
    throw new SettingsError('Enter a valid international phone number.');
  }
  return normalized;
}

function timezone(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.length > 100) {
    throw new SettingsError('Select a valid timezone.');
  }

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
  } catch {
    throw new SettingsError('Select a valid timezone.');
  }

  return value;
}

function readAvatarKey(
  avatarUrl: string | null,
  userId: string,
): string | null {
  if (!avatarUrl) return null;
  const publicBase =
    process.env.R2_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_R2_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_R2_PUBLIC_DOMAIN;

  if (!publicBase) {
    throw new SettingsError('Avatar storage is not configured.', 500);
  }

  let avatar: URL;
  let base: URL;
  try {
    avatar = new URL(avatarUrl);
    base = new URL(publicBase);
  } catch {
    throw new SettingsError('Select a valid uploaded avatar.');
  }

  const basePath = base.pathname.replace(/\/+$/, '');
  if (
    avatar.protocol !== 'https:' ||
    avatar.origin !== base.origin ||
    (basePath && !avatar.pathname.startsWith(`${basePath}/`))
  ) {
    throw new SettingsError('The avatar must use the configured R2 domain.');
  }

  const relativePath = avatar.pathname.slice(basePath.length).replace(/^\/+/, '');
  let key: string;
  try {
    key = decodeURIComponent(relativePath);
  } catch {
    throw new SettingsError('The avatar path is invalid.');
  }

  if (
    !key.startsWith(`avatars/${userId}/`) ||
    key.includes('..') ||
    key.includes('//')
  ) {
    throw new SettingsError('The avatar does not belong to this account.');
  }

  return key;
}

export function readProfileSettings(
  value: unknown,
  userId: string,
) {
  if (!value || typeof value !== 'object') {
    throw new SettingsError('A valid profile is required.');
  }

  const avatarUrl = optionalText(
    Reflect.get(value, 'avatarUrl'),
    'Avatar URL',
    2048,
  );

  return {
    avatarKey: readAvatarKey(avatarUrl, userId),
    avatarUrl,
    bio: optionalText(Reflect.get(value, 'bio'), 'Bio', 1000),
    headline: optionalText(
      Reflect.get(value, 'headline'),
      'Headline',
      120,
    ),
    name: requiredName(Reflect.get(value, 'name')),
    phoneNumber: optionalPhone(Reflect.get(value, 'phoneNumber')),
    timezone: timezone(Reflect.get(value, 'timezone')),
  };
}

export function readLearningSettings(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new SettingsError('Valid learning preferences are required.');
  }

  const playbackSpeed = Reflect.get(value, 'defaultPlaybackSpeed');
  const videoQuality = Reflect.get(value, 'defaultVideoQuality');
  const autoPlayNext = Reflect.get(value, 'autoPlayNext');

  if (
    typeof playbackSpeed !== 'number' ||
    !PLAYBACK_SPEEDS.includes(playbackSpeed as PlaybackSpeed) ||
    typeof videoQuality !== 'string' ||
    !VIDEO_QUALITIES.includes(videoQuality as VideoQuality) ||
    typeof autoPlayNext !== 'boolean'
  ) {
    throw new SettingsError('Choose valid playback preferences.');
  }

  return {
    autoPlayNext,
    defaultPlaybackSpeed: playbackSpeed,
    defaultVideoQuality: videoQuality,
  };
}

export function readNotificationSettings(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new SettingsError('Valid notification preferences are required.');
  }

  const notifyZoomClasses = Reflect.get(value, 'notifyZoomClasses');
  const notifyAnnouncements = Reflect.get(value, 'notifyAnnouncements');
  const notifyDiscussions = Reflect.get(value, 'notifyDiscussions');

  if (
    typeof notifyZoomClasses !== 'boolean' ||
    typeof notifyAnnouncements !== 'boolean' ||
    typeof notifyDiscussions !== 'boolean'
  ) {
    throw new SettingsError('Choose valid notification preferences.');
  }

  return {
    notifyAnnouncements,
    notifyDiscussions,
    notifyZoomClasses,
  };
}

export async function updateProfileSettings(
  user: {
    avatarUrl: string | null;
    bio: string | null;
    headline: string | null;
    id: string;
    name: string | null;
    phoneNumber: string | null;
    phoneVerified: boolean;
    supabaseId: string;
    timezone: string;
  },
  input: ReturnType<typeof readProfileSettings>,
) {
  const prisma = getPrisma();
  if (input.phoneNumber) {
    const existingOwner = await prisma.user.findFirst({
      where: {
        id: { not: user.id },
        phoneNumber: input.phoneNumber,
      },
      select: { id: true },
    });
    if (existingOwner) {
      throw new SettingsError(
        'That phone number is already linked to another account.',
        409,
      );
    }
  }

  const phoneChanged = input.phoneNumber !== user.phoneNumber;
  let updated: User;
  try {
    updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: input.avatarUrl,
        bio: input.bio,
        headline: input.headline,
        name: input.name,
        phoneNumber: input.phoneNumber,
        phoneVerified: phoneChanged ? false : user.phoneVerified,
        timezone: input.timezone,
      },
    });
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      Reflect.get(error, 'code') === 'P2002'
    ) {
      throw new SettingsError(
        'That phone number is already linked to another account.',
        409,
      );
    }
    throw error;
  }

  const supabase = getSupabaseAdminClient();
  const { data: authResult, error: authReadError } =
    await supabase.auth.admin.getUserById(user.supabaseId);

  if (authReadError || !authResult.user) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        headline: user.headline,
        name: user.name,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        timezone: user.timezone,
      },
    });
    throw new SettingsError('Unable to synchronize the account profile.', 502);
  }

  const authPhone = normalizePhoneNumber(authResult.user.phone ?? '');
  const authPhoneChanged = authPhone !== input.phoneNumber;
  const userMetadata = {
    ...authResult.user.user_metadata,
    avatar_url: input.avatarUrl,
    full_name: input.name,
    name: input.name,
    phone_number: input.phoneNumber,
  };
  let { error: authUpdateError } =
    await supabase.auth.admin.updateUserById(user.supabaseId, {
      ...(authPhoneChanged
        ? {
            phone: input.phoneNumber ?? '',
            phone_confirm: false,
          }
        : {}),
      user_metadata: userMetadata,
    });

  // Supabase rejects assigning an Auth phone while the Phone provider is
  // disabled. A first phone can still be staged safely in metadata and Prisma
  // without granting phone access. Once Phone Auth is enabled, the next save
  // links the number and OTP verification can confirm it.
  if (authUpdateError && !authPhone && input.phoneNumber) {
    const fallback = await supabase.auth.admin.updateUserById(
      user.supabaseId,
      { user_metadata: userMetadata },
    );
    authUpdateError = fallback.error;
  }

  if (authUpdateError) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        headline: user.headline,
        name: user.name,
        phoneNumber: user.phoneNumber,
        phoneVerified: user.phoneVerified,
        timezone: user.timezone,
      },
    });
    throw new SettingsError(
      authUpdateError.message.toLowerCase().includes('phone')
        ? 'Unable to link that phone number to this account.'
        : 'Unable to synchronize the account profile.',
      authUpdateError.message.toLowerCase().includes('phone') ? 409 : 502,
    );
  }

  if (user.avatarUrl && user.avatarUrl !== input.avatarUrl) {
    try {
      const previousKey = readAvatarKey(user.avatarUrl, user.id);
      if (previousKey) await deleteR2Object(previousKey);
    } catch (error) {
      console.warn('[SETTINGS_AVATAR_CLEANUP]', error);
    }
  }

  return updated;
}
