import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsUser } from '@/lib/lms/auth';
import {
  NotificationError,
  readPushEndpoint,
  readPushSubscription,
  removePushSubscription,
  savePushSubscription,
} from '@/lib/lms/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_SUBSCRIPTION_BODY_BYTES = 12_000;

async function readRequestBody(request: Request) {
  const body = await request.text();
  if (Buffer.byteLength(body, 'utf8') > MAX_SUBSCRIPTION_BODY_BYTES) {
    throw new NotificationError('Push subscription payload is too large.', 413);
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new NotificationError('A valid JSON request body is required.');
  }
}

function errorResponse(error: unknown) {
  if (error instanceof LmsAuthError || error instanceof NotificationError) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status },
    );
  }

  console.error('[WEB_PUSH_SUBSCRIPTION]', error);
  return NextResponse.json(
    { error: 'Unable to update this push subscription.' },
    { status: 500 },
  );
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new NotificationError('Invalid request origin.', 403);
    }

    const user = await requireLmsUser();
    const subscription = readPushSubscription(await readRequestBody(request));
    await savePushSubscription(user.id, subscription);

    return NextResponse.json({ subscribed: true, success: true }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new NotificationError('Invalid request origin.', 403);
    }

    const user = await requireLmsUser();
    const body = await readRequestBody(request);
    const endpoint = readPushEndpoint(
      body && typeof body === 'object' ? Reflect.get(body, 'endpoint') : null,
    );
    const result = await removePushSubscription(user.id, endpoint);

    return NextResponse.json({
      removed: result.count,
      subscribed: false,
      success: true,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
