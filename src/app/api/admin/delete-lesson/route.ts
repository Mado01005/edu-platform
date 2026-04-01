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

    const { lessonSlug, subjectSlug } = await req.json();

    if (!lessonSlug || !subjectSlug) {
      return NextResponse.json({ error: 'Missing slugs' }, { status: 400 });
    }

    // 1. Fetch exact R2 object keys attached to this lesson before database cascade drops them.
    // This entirely solves R2 drift: if slugs are renamed, folder deletion fails, leaving massive orphaned storage.
    const { data: lessonData } = await supabaseAdmin
      .from('lessons')
      .select('id')
      .eq('slug', lessonSlug)
      .eq('subject_id', (await supabaseAdmin.from('subjects').select('id').eq('slug', subjectSlug).single()).data?.id)
      .single();

    if (lessonData?.id) {
      const { data: contentItems } = await supabaseAdmin
        .from('content_items')
        .select('url')
        .eq('lesson_id', lessonData.id);

      if (contentItems && contentItems.length > 0) {
        const publicBase = process.env.R2_PUBLIC_URL || '';
        for (const item of contentItems) {
          if (publicBase && item.url?.startsWith(publicBase)) {
            let key = item.url.replace(publicBase, '');
            if (key.startsWith('/')) key = key.substring(1);
            key = decodeURIComponent(key);

            try {
              await deleteR2Object(key);
              console.log(`Deleted exact R2 object (Lesson Tier): ${key}`);
            } catch (err) {
              console.warn(`[Delete Lesson] Orphan capture failed for R2 key: ${key}`);
            }
          }
        }
      }
    }

    // 2. Delete the lesson record (database cascade should handle content_items internally)
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
