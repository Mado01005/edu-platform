import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const email = (session.user?.email || '').toLowerCase();

    const { data: snippets, error } = await supabaseAdmin
      .from('user_snippets')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(snippets);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { content, source_title, page_number } = await req.json();
    const email = (session.user?.email || '').toLowerCase();

    if (!content) return NextResponse.json({ error: 'Snippet content is required' }, { status: 400 });

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await req.json();
    const email = (session.user?.email || '').toLowerCase();

    const { error } = await supabaseAdmin
      .from('user_snippets')
      .delete()
      .eq('id', id)
      .eq('user_email', email);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
