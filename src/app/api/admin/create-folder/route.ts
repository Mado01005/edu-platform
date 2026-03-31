import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonId, subjectId, folderName, parentId } = await req.json();

    if (!folderName || (!lessonId && !subjectId)) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    let data, error;

    if (!lessonId && subjectId) {
      // Create a new LESSON (Module)
      const slug = folderName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const result = await supabaseAdmin.from('lessons').insert({
        subject_id: subjectId,
        title: folderName,
        slug
      }).select().single();
      data = result.data;
      error = result.error;
    } else {
      // Create a new FOLDER inside a lesson
      const result = await supabaseAdmin.from('content_items').insert({
        lesson_id: lessonId,
        parent_id: parentId || null,
        item_type: 'folder',
        name: folderName,
      }).select().single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Optional: log activity
    const activityDetails = lessonId 
      ? { lessonId, folderName, parentId } 
      : { subjectId, lessonTitle: folderName };

    Promise.resolve(supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: lessonId ? 'FOLDER_CREATED' : 'LESSON_CREATED',
      details: activityDetails,
    })).catch(() => {});

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error('Create folder error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
