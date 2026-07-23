import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { isValidUUID } from '@/lib/validation';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id, title } = await req.json();

    // C5: Comprehensive input validation
    if (!type || !id || !title) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    if (!['subject', 'lesson', 'item'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (!isValidUUID(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    if (typeof title !== 'string' || title.trim().length === 0 || title.length > 200) {
      return NextResponse.json({ error: 'Title must be 1-200 characters' }, { status: 400 });
    }

    let table = '';
    if (type === 'subject') table = 'subjects';
    else if (type === 'lesson') table = 'lessons';
    else if (type === 'item') table = 'content_items';
    else return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

    // Update the title string
    const updatePayload = type === 'item' ? { name: title } : { title: title };

    const { data: updatedData, error } = await supabaseAdmin.from(table).update(updatePayload).eq('id', id).select().single();
    
    if (error) {
       console.error(`Rename ${type} error:`, error);
    // C5: Sanitize error — don't leak raw DB message
    return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: updatedData });
  } catch (error: unknown) {
    console.error('Rename crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
