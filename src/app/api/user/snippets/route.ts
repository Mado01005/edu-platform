import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = (session.user?.email || '').toLowerCase();

    const { data: snippets, error } = await supabaseAdmin
      .from('user_snippets')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(snippets);
  } catch (error: unknown) {
    console.error('[user snippets GET]', error);
    return NextResponse.json({ error: 'Unable to load snippets.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, source_title, page_number } = await req.json();
    const email = (session.user?.email || '').toLowerCase();

    if (
      typeof content !== 'string' ||
      !content.trim() ||
      content.length > 10_000 ||
      (source_title !== undefined &&
        (typeof source_title !== 'string' || source_title.length > 200)) ||
      (page_number !== undefined &&
        page_number !== null &&
        (!Number.isInteger(page_number) || page_number < 1 || page_number > 100_000))
    ) {
      return NextResponse.json({ error: 'Invalid snippet payload.' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('user_snippets')
      .insert({
        user_email: email,
        content,
        source_title,
        page_number
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: unknown) {
    console.error('[user snippets POST]', error);
    return NextResponse.json({ error: 'Unable to save snippet.' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    const email = session.user.email.toLowerCase();
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)) {
      return NextResponse.json({ error: 'Invalid snippet identifier.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('user_snippets')
      .delete()
      .eq('id', id)
      .eq('user_email', email);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[user snippets DELETE]', error);
    return NextResponse.json({ error: 'Unable to delete snippet.' }, { status: 500 });
  }
}
