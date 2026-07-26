import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsUser } from '@/lib/lms/auth';
import { getPresignedUploadUrl, getPublicUrl } from '@/lib/r2';
import { SettingsError } from '@/lib/lms/settings';

export const runtime = 'nodejs';

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const CONTENT_TYPE_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function readUpload(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new SettingsError('Valid avatar details are required.');
  }

  const contentType = Reflect.get(value, 'contentType');
  const size = Reflect.get(value, 'size');
  if (
    typeof contentType !== 'string' ||
    !(contentType in CONTENT_TYPE_EXTENSION) ||
    typeof size !== 'number' ||
    !Number.isFinite(size) ||
    size <= 0 ||
    size > MAX_AVATAR_BYTES
  ) {
    throw new SettingsError(
      'Choose a JPEG, PNG, or WebP avatar no larger than 5 MB.',
    );
  }

  return { contentType, size };
}

export async function POST(request: Request) {
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
    const input = readUpload(body);
    const extension = CONTENT_TYPE_EXTENSION[input.contentType];
    const key = `avatars/${user.id}/${randomUUID()}.${extension}`;
    const expiresIn = 10 * 60;

    return NextResponse.json({
      expiresIn,
      key,
      publicUrl: getPublicUrl(key),
      requiredHeaders: {
        'Content-Type': input.contentType,
      },
      uploadUrl: await getPresignedUploadUrl(
        key,
        input.contentType,
        expiresIn,
      ),
    });
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof SettingsError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[LMS_AVATAR_UPLOAD]', error);
    return NextResponse.json(
      { error: 'Unable to prepare the avatar upload.' },
      { status: 500 },
    );
  }
}
