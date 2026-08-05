import { NextResponse } from 'next/server';
import { LmsAuthError, requireLmsUser } from '@/lib/lms/auth';
import { getNotificationFeed } from '@/lib/lms/notifications';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const user = await requireLmsUser();
    const feed = await getNotificationFeed(user.id);

    return NextResponse.json(feed, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error) {
    if (error instanceof LmsAuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error('[NOTIFICATION_FEED]', error);
    return NextResponse.json(
      { error: 'Unable to load notifications.' },
      { status: 500 },
    );
  }
}
