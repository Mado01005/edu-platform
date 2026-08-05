import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { LmsAuthError, requireLmsUser } from '@/lib/lms/auth';
import {
  markAllNotificationsRead,
  NotificationError,
} from '@/lib/lms/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      throw new NotificationError('Invalid request origin.', 403);
    }

    const user = await requireLmsUser();
    const result = await markAllNotificationsRead(user.id);

    return NextResponse.json({ markedRead: result.count, success: true });
  } catch (error) {
    if (error instanceof LmsAuthError || error instanceof NotificationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[NOTIFICATION_MARK_ALL_READ]', error);
    return NextResponse.json(
      { error: 'Unable to mark notifications as read.' },
      { status: 500 },
    );
  }
}
