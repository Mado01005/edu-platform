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

    const { lessonId, subjectId, folderName, parentId } = await req.json();

    // C6: Validate folder name
    if (!folderName || typeof folderName !== 'string' || folderName.trim().length === 0 || folderName.length > 200) {
      return NextResponse.json({ error: 'Invalid or missing folder name (max 200 chars)' }, { status: 400 });
    }

    if (!lessonId && !subjectId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // C6: Validate UUID formats
    if (lessonId && !isValidUUID(lessonId)) {
      return NextResponse.json({ error: 'Invalid lesson ID' }, { status: 400 });
    }
    if (subjectId && !isValidUUID(subjectId)) {
      return NextResponse.json({ error: 'Invalid subject ID' }, { status: 400 });
    }
    if (parentId && !isValidUUID(parentId)) {
      return NextResponse.json({ error: 'Invalid parent ID' }, { status: 400 });
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
        file_type: null, // Folders never have file types
        name: folderName,
      }).select().single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Database insert error:', error);
      return NextResponse.json({ error: 'Database operation failed' }, { status: 500 });
    }

    // Log activity
    const activityDetails = lessonId 
      ? { lessonId, folderName, parentId } 
      : { subjectId, lessonTitle: folderName };

    try {
      await supabaseAdmin.from('activity_logs').insert({
        user_email: session.user?.email || 'admin',
        user_name: session.user?.name || 'Admin',
        action: lessonId ? 'FOLDER_CREATED' : 'LESSON_CREATED',
        details: activityDetails,
      });
    } catch (logErr) {
      console.error('Failed to log folder creation:', logErr);
    }

    return NextResponse.json({ success: true, data });

  } catch (error: unknown) {
    console.error('Create folder error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
