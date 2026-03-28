import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch unique active user emails from live_sessions table
    const { data: sessions, error } = await supabaseAdmin
      .from('live_sessions')
      .select('user_email')
      .gt('last_active_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

    if (error) throw error;

    // Return the raw logs structure that AdminClient expects
    // AdminClient does: logs.map((l: any) => l.user_email)
    return NextResponse.json(sessions || []);
  } catch (error: unknown) {
    console.error('Fetch active logins error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
