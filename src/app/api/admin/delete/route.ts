import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteR2Object } from '@/lib/r2';

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

    // For entity cascading, clean up the exact R2 objects BEFORE deleting the DB row(s)
    if (type === 'item') {
      const { data: item } = await supabaseAdmin
        .from('content_items')
        .select('url')
        .eq('id', id)
        .maybeSingle();

      if (item?.url) {
        const publicBase = process.env.R2_PUBLIC_URL || '';
        if (publicBase && item.url.startsWith(publicBase)) {
          let r2Key = item.url.substring(publicBase.length).replace(/^\/+/, '');
          r2Key = decodeURIComponent(r2Key);
          try {
            await deleteR2Object(r2Key);
          } catch (r2Err) {
            console.warn(`[Delete] R2 cleanup failed for key "${r2Key}":`, r2Err);
          }
        }
      }
    } else if (type === 'lesson' || type === 'subject') {
      // If deleting a Subject or Lesson, we must pull exact URLs of ALL nested content_items
      // because slug-based folder deletion fails if the item was ever renamed (R2 Drift).
      let lessonIds: string[] = [];
      
      if (type === 'lesson') {
        lessonIds.push(id);
      } else {
        // Find all lessons in this subject
        const { data: lessons } = await supabaseAdmin.from('lessons').select('id').eq('subject_id', id);
        if (lessons) lessonIds = lessons.map(l => l.id);
      }

      if (lessonIds.length > 0) {
        const { data: items } = await supabaseAdmin.from('content_items').select('url').in('lesson_id', lessonIds);
        if (items && items.length > 0) {
          const publicBase = process.env.R2_PUBLIC_URL || '';
          for (const item of items) {
             if (publicBase && item.url?.startsWith(publicBase)) {
                let r2Key = item.url.substring(publicBase.length).replace(/^\/+/, '');
                r2Key = decodeURIComponent(r2Key);
                try {
                   await deleteR2Object(r2Key);
                } catch (r2Err) {
                   console.warn(`[Cascade Delete] Orphan capture failed for R2 key "${r2Key}":`, r2Err);
                }
             }
          }
        }
      }
    }

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
