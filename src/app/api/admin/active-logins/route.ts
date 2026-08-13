import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdminApiAuth } from '@/lib/admin-api-auth';

export async function GET(request: Request = new Request('http://localhost')) {
  try {
    const actor = await requireAdminApiAuth(request);
    if (!actor.ok) return actor.response;

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
