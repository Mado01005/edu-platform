import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id } = await req.json();

    if (!type || !id) {
      return NextResponse.json({ error: 'Missing type or id' }, { status: 400 });
    }

    let table = '';
    if (type === 'subject') table = 'subjects';
    else if (type === 'lesson') table = 'lessons';
    else if (type === 'item') table = 'content_items';
    else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    const { error } = await supabaseAdmin.from(table).delete().eq('id', id);
    if (error) {
       console.error(`Delete ${type} error:`, error);
       const message = error instanceof Error ? error.message : 'Internal Server Error';
       return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Delete crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
