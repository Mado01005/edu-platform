import { NextResponse } from 'next/server';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { AttendanceError, recordLiveAttendance, type LiveAttendanceAction } from '@/lib/lms/attendance';
import { LmsAuthError, requireLmsRole } from '@/lib/lms/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const student = await requireLmsRole(['STUDENT']);
    const body = (await request.json().catch(() => null)) as {
      action?: unknown;
      zoomSessionId?: unknown;
    } | null;
    if (typeof body?.zoomSessionId !== 'string' || !body.zoomSessionId.trim()) {
      return NextResponse.json({ error: 'Live class is required.' }, { status: 400 });
    }
    const action: LiveAttendanceAction = body.action === 'heartbeat' || body.action === 'leave' ? body.action : 'join';
    const result = await recordLiveAttendance(student.id, body.zoomSessionId, action);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AttendanceError || error instanceof LmsAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[LIVE_ATTENDANCE]', error);
    return NextResponse.json(
      { error: 'Unable to record live attendance.' },
      { status: 500 },
    );
  }
}
