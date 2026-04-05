import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized: Valid session required' }, { status: 401 });
    }

    const userId = session.user.id;
    const { lesson_id, language_type, raw_content } = await req.json();

    if (!lesson_id || !language_type || !raw_content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('snippets')
      .insert({
        user_id: userId,
        lesson_id,
        language_type,
        raw_content,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('[FORGE_API] Insertion Error:', error);
      return NextResponse.json({ error: 'Database insertion failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error('[FORGE_API] Fatal Error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
