import { revalidatePath } from 'next/cache';
import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsUser } from '@/lib/lms/auth';
import {
  readLearningSettings,
  readNotificationSettings,
  readProfileSettings,
  SettingsError,
  updateProfileSettings,
} from '@/lib/lms/settings';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new SettingsError('Invalid request origin.', 403);
    }

    const user = await requireLmsUser();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new SettingsError('A valid JSON request body is required.');
    }

    if (!body || typeof body !== 'object') {
      throw new SettingsError('A valid settings update is required.');
    }

    const section = Reflect.get(body, 'section');
    const values = Reflect.get(body, 'values');
    let updated;

    if (section === 'profile') {
      updated = await updateProfileSettings(
        user,
        readProfileSettings(values, user.id),
      );
    } else if (section === 'learning') {
      updated = await getPrisma().user.update({
        where: { id: user.id },
        data: readLearningSettings(values),
      });
    } else if (section === 'notifications') {
      updated = await getPrisma().user.update({
        where: { id: user.id },
        data: readNotificationSettings(values),
      });
    } else {
      throw new SettingsError('Choose a valid settings section.');
    }

    revalidatePath('/settings');
    revalidatePath('/lms/profile');
    revalidatePath('/dashboard');

    return NextResponse.json({
      user: {
        avatarUrl: updated.avatarUrl,
        autoPlayNext: updated.autoPlayNext,
        bio: updated.bio,
        defaultPlaybackSpeed: updated.defaultPlaybackSpeed,
        defaultVideoQuality: updated.defaultVideoQuality,
        headline: updated.headline,
        name: updated.name,
        notifyAnnouncements: updated.notifyAnnouncements,
        notifyDiscussions: updated.notifyDiscussions,
        notifyZoomClasses: updated.notifyZoomClasses,
        phoneNumber: updated.phoneNumber,
        phoneVerified: updated.phoneVerified,
        timezone: updated.timezone,
      },
    });
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof SettingsError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS_SETTINGS_UPDATE]', error);
    return NextResponse.json(
      { error: 'Unable to update these settings.' },
      { status: 500 },
    );
  }
}
