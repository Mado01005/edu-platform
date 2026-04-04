import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, name, url, itemType, fileType, parentId } = await req.json();

    if (!lessonId || !name || !url) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin.from('content_items').insert({
      lesson_id: lessonId,
      parent_id: parentId || null,
      name,
      url,
      item_type: itemType || 'embed',
      file_type: fileType || 'video',
      created_at: new Date().toISOString()
    }).select().single();

    if (error) {
       console.error('Embed video error:', error);
       const message = error instanceof Error ? error.message : 'Internal Server Error';
       return NextResponse.json({ error: message }, { status: 500 });
    }

    return NextResponse.json({ success: true, item: data });
  } catch (error: unknown) {
    console.error('Embed error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
