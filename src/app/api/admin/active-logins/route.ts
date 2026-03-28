import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sessions, error } = await supabaseAdmin
      .from('live_sessions')
      .select('user_email, last_active_at')
      .order('last_active_at', { ascending: false });

    if (error) {
      console.error('Fetch active logins error:', error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json(sessions || []);
  } catch (error: unknown) {
    console.error('Fetch active logins error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
