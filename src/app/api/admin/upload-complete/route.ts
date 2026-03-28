import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { subjectId, lessonId, fileName, fileType, publicUrl, itemType = 'file', vimeoId } = await req.json();

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
      vimeo_id: vimeoId,
    }).select().single();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-log the upload as an activity event for "What's New" notifications (non-blocking)
    Promise.resolve(supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: 'NEW_CONTENT_ADDED',
      url: publicUrl,
      details: { subjectId, lessonId, fileName, fileType, itemType },
    })).catch(() => {});

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error('Upload complete error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
