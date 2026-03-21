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

    const { subjectId, lessonId, fileName, fileType, publicUrl, itemType = 'file' } = await req.json();

    if (!lessonId || !fileName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Insert the new record into the content_items SQL table
    const { data, error } = await supabaseAdmin.from('content_items').insert({
      lesson_id: lessonId,
      item_type: itemType,
      file_type: fileType,
      name: fileName,
      url: publicUrl,
    }).select().single();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error('Upload complete error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
