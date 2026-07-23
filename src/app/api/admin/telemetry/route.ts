import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [{ data: logs, error: logsError }, { data: sessions, error: sessionsError }] =
    await Promise.all([
      supabaseAdmin
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500),
      supabaseAdmin
        .from('live_sessions')
        .select('*')
        .order('last_active_at', { ascending: false })
        .limit(200),
    ]);

  if (logsError || sessionsError) {
    console.error('[Admin telemetry]', logsError ?? sessionsError);
    return NextResponse.json(
      { error: 'Unable to load telemetry.' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { logs: logs ?? [], sessions: sessions ?? [] },
    {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
      },
    },
  );
}
