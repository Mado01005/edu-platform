import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';


type FocusStatus = 'completed' | 'interrupted';

export async function POST(req: Request) {
  try {
   
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized: Valid session required' }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { lesson_id, duration_minutes, status } = body;

    // 2. Strict Payload Validation
    if (!lesson_id || typeof lesson_id !== 'string') {
      return NextResponse.json({ error: 'Invalid or missing lesson_id (UUID expected)' }, { status: 400 });
    }

    if (typeof duration_minutes !== 'number' || duration_minutes < 0) {
      return NextResponse.json({ error: 'Invalid duration_minutes (positive integer expected)' }, { status: 400 });
    }

    if (!['completed', 'interrupted'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status. Must be "completed" or "interrupted"' }, { status: 400 });
    }

    const focusStatus = status as FocusStatus;

    // 3. Database Insertion
    // Using supabaseAdmin here to execute the insert securely. 
    // Even though RLS is enabled in the database, the API acts as the authoritative gatekeeper 
    // because NextAuth encapsulates the JWT mapping before handing it to Supabase.
    const { data, error } = await supabaseAdmin
      .from('focus_sessions')
      .insert({
        user_id: userId,
        lesson_id,
        duration_minutes,
        status: focusStatus,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[FOCUS_API] Insertion Error:', error);
      return NextResponse.json({ error: 'Database insertion failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error('[FOCUS_API] Fatal Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    // 1. Verify Session
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // 2. Secure Data Retrieval (Enforcing the ONLY SELECT their own records constraint via API logic)
    const { data, error } = await supabaseAdmin
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[FOCUS_API] Fetch Error:', error);
      return NextResponse.json({ error: 'Database query failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error('[FOCUS_API] GET Fatal Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
