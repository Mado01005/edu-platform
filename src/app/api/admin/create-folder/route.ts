import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, folderName, parentId } = await req.json();

    if (!lessonId || !folderName) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Insert the new folder record into the content_items SQL table
    const { data, error } = await supabaseAdmin.from('content_items').insert({
      lesson_id: lessonId,
      parent_id: parentId || null,
      item_type: 'folder',
      name: folderName,
      file_type: null,
      url: null,
      vimeo_id: null,
    }).select().single();

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optional: log activity
    Promise.resolve(supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: 'FOLDER_CREATED',
      details: { lessonId, folderName, parentId },
    })).catch(() => {});

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error('Create folder error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
