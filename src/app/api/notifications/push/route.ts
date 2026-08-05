import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';
import {
  deliverSystemNotification,
  NotificationError,
  readNotificationDeliveryRequest,
} from '@/lib/lms/notifications';
import { SUPPORT_ROLES, isAdminRole } from '@/lib/lms/roles';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_NOTIFICATION_BODY_BYTES = 16_000;

async function readRequestBody(request: Request) {
  const body = await request.text();
  if (Buffer.byteLength(body, 'utf8') > MAX_NOTIFICATION_BODY_BYTES) {
    throw new NotificationError('Notification payload is too large.', 413);
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    throw new NotificationError('A valid JSON request body is required.');
  }
}

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new NotificationError('Invalid request origin.', 403);
    }

    const actor = await requireLmsRole(SUPPORT_ROLES);
    const deliveryRequest = readNotificationDeliveryRequest(
      await readRequestBody(request),
    );
    if (
      !isAdminRole(actor.role) &&
      (deliveryRequest.broadcast ||
        deliveryRequest.userIds.length > 0 ||
        deliveryRequest.type === 'PAYMENT')
    ) {
      throw new NotificationError(
        'Support may send operational notices only to a selected student and linked parents.',
        403,
      );
    }
    const summary = await deliverSystemNotification(deliveryRequest);

    return NextResponse.json(
      { success: true, ...summary },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof NotificationError) {
      return NextResponse.json(
        { error: error.message, success: false },
        { status: error.status },
      );
    }

    console.error('[NOTIFICATION_PUSH]', error);
    return NextResponse.json(
      { error: 'Unable to deliver this notification.', success: false },
      { status: 500 },
    );
  }
}
