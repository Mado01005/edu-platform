import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteR2Folder } from '@/lib/r2';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { lessonSlug, subjectSlug } = await req.json();

    if (!lessonSlug || !subjectSlug) {
      return NextResponse.json({ error: 'Missing slugs' }, { status: 400 });
    }

    // 1. Recursive R2 deletion for the entire lesson folder
    const r2Prefix = `${subjectSlug}/${lessonSlug}/`;
    try {
      await deleteR2Folder(r2Prefix);
      console.log(`Deleted R2 folder: ${r2Prefix}`);
    } catch (r2Error) {
      console.error('R2 lesson folder deletion failed:', r2Error);
    }

    // 2. Delete the lesson record (with CASCADE enabled in DB it should delete content_items)
    // If not enabled, we do it explicitly.
    const { error: dbError } = await supabaseAdmin
      .from('lessons')
      .delete()
      .eq('slug', lessonSlug)
      .eq('subject_id', (await supabaseAdmin.from('subjects').select('id').eq('slug', subjectSlug).single()).data?.id);

    if (dbError) {
      console.error('Database lesson deletion error:', dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    // 3. Log activity
    Promise.resolve(supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: 'LESSON_DELETED',
      details: { lessonSlug, subjectSlug },
    })).catch(() => {});

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    console.error('Delete lesson error:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
