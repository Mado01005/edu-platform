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

    const { lessonId, itemType, subjectId } = await req.json();

    if (!lessonId && !subjectId) {
      return NextResponse.json({ error: 'Must provide lessonId or subjectId to purge' }, { status: 400 });
    }

    let query = supabaseAdmin.from('content_items').delete();

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    // Optionally filter by item_type (e.g., only purge 'file' items, keep 'vimeo' embeds)
    if (itemType) {
      query = query.eq('item_type', itemType);
    }

    // If subjectId provided instead, get all lessons for that subject first
    if (subjectId && !lessonId) {
      const { data: lessons } = await supabaseAdmin
        .from('lessons')
        .select('id')
        .eq('subject_id', subjectId);

      if (!lessons || lessons.length === 0) {
        return NextResponse.json({ purged: 0, message: 'No lessons found for this subject' });
      }

      const lessonIds = lessons.map(l => l.id);
      
      let subjectQuery = supabaseAdmin
        .from('content_items')
        .delete()
        .in('lesson_id', lessonIds);

      if (itemType) {
        subjectQuery = subjectQuery.eq('item_type', itemType);
      }

      const { data, error } = await subjectQuery.select('id');

      if (error) {
        console.error('Purge error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Log the purge action
      Promise.resolve(supabaseAdmin.from('activity_logs').insert({
        user_email: session.user?.email || 'admin',
        user_name: session.user?.name || 'Admin',
        action: 'CONTENT_PURGED',
        details: { subjectId, itemType, purgedCount: data?.length || 0 },
      })).catch(() => {});

      return NextResponse.json({
        purged: data?.length || 0,
        message: `Purged ${data?.length || 0} items from subject`,
      });
    }

    // Lesson-level purge
    const { data, error } = await query.select('id');

    if (error) {
      console.error('Purge error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the purge action
    Promise.resolve(supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: 'CONTENT_PURGED',
      details: { lessonId, itemType, purgedCount: data?.length || 0 },
    })).catch(() => {});

    return NextResponse.json({
      purged: data?.length || 0,
      message: `Purged ${data?.length || 0} items from lesson`,
    });

  } catch (error: any) {
    console.error('Purge content crash:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
