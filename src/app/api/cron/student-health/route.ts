import { NextResponse } from 'next/server';
import { refreshAllStudentHealthScores } from '@/lib/lms/health';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (
    !cronSecret ||
    request.headers.get('authorization') !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const summary = await refreshAllStudentHealthScores();
    return NextResponse.json({ ...summary, success: true });
  } catch (error) {
    console.error('[STUDENT_HEALTH_CRON]', error);
    return NextResponse.json(
      { error: 'Unable to refresh student health scores.', success: false },
      { status: 500 },
    );
  }
}
