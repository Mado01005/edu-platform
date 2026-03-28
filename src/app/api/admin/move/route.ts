import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id, targetId } = await req.json();

    if (!type || !id || !targetId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    let query;
    if (type === 'lesson') {
      query = supabaseAdmin.from('lessons').update({ subject_id: targetId }).eq('id', id);
    } else if (type === 'item') {
      query = supabaseAdmin.from('content_items').update({ lesson_id: targetId }).eq('id', id);
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const { data, error } = await query.select().single();

    if (error) {
      console.error(`Move ${type} error:`, error);
      const message = error instanceof Error ? error.message : 'Internal Server Error';
      return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: data });
  } catch (error: unknown) {
    console.error('Move crash:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
