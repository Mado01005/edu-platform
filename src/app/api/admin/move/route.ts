import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    // @ts-ignore
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id, targetId } = await req.json();
    if (!type || !id || !targetId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    let table = '';
    let column = '';

    if (type === 'item') {
      table = 'content_items';
      column = 'lesson_id';
    } else if (type === 'lesson') {
      table = 'lessons';
      column = 'subject_id';
    } else {
      return NextResponse.json({ error: 'Invalid move type' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ [column]: targetId })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Move ${type} error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data });
  } catch (error: any) {
    console.error('Move crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
