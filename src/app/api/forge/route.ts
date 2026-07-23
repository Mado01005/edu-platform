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

    if (
      typeof lesson_id !== 'string' ||
      !/^[a-zA-Z0-9_-]{1,100}$/.test(lesson_id) ||
      typeof language_type !== 'string' ||
      !/^[a-zA-Z0-9_+#.-]{1,40}$/.test(language_type) ||
      typeof raw_content !== 'string' ||
      !raw_content.trim() ||
      raw_content.length > 100_000
    ) {
      return NextResponse.json({ error: 'Invalid snippet payload.' }, { status: 400 });
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
