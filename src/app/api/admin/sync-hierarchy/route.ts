import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

// P4.0: Chunk size for parallel hierarchy upserts
const HIERARCHY_CHUNK_SIZE = 10;

interface SyncRequestItem {
  subjectName: string;
  lessonName: string;
}

interface SyncRequestBody {
  items: SyncRequestItem[];
  currentSubjectId?: string;
  currentLessonId?: string;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SyncRequestBody = await req.json();
    const { items, currentSubjectId } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items provided' }, { status: 400 });
    }

    // Deduplicate pairs
    const uniquePairs = items.filter((v, i, a) => a.findIndex(t => (t.subjectName === v.subjectName && t.lessonName === v.lessonName)) === i);

    console.log(`[SYNC] Processing ${uniquePairs.length} unique subject/lesson pairs`);
    const syncStart = Date.now();

    const resultIds: Record<string, { subjectId: string; lessonId: string }> = {};

    // P4.0: Process pairs in parallel chunks instead of sequentially
    // to reduce latency from O(N*RTT) to O(N/chunk * RTT)
    const processPair = async (pair: SyncRequestItem): Promise<void> => {
      const subjectSlug = pair.subjectName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const lessonSlug = pair.lessonName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

      let subjectId = currentSubjectId;

      // Only perform subject upsert if no currentSubjectId is provided
      if (!subjectId) {
        let { data: subject, error: subjectError } = await supabaseAdmin
          .from('subjects')
          .select('id')
          .eq('slug', subjectSlug)
          .maybeSingle();

        if (!subject) {
          const { data: newSubject, error: newSubjectError } = await supabaseAdmin
            .from('subjects')
            .insert({
              title: pair.subjectName,
              slug: subjectSlug,
              icon: '📂',
              color: 'from-slate-500 to-slate-700'
            })
            .select('id')
            .single();

          if (newSubjectError) {
            console.error('Failed to create subject:', newSubjectError);
            return;
          }
          subjectId = newSubject.id;
        } else {
          subjectId = subject.id;
        }
      }

      if (!subjectId) return;

      // Upsert Lesson under the determined subjectId
      let { data: lesson, error: lessonError } = await supabaseAdmin
        .from('lessons')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('slug', lessonSlug)
        .maybeSingle();

      if (!lesson) {
        const { data: newLesson, error: newLessonError } = await supabaseAdmin
          .from('lessons')
          .insert({
            title: pair.lessonName,
            slug: lessonSlug,
            subject_id: subjectId
          })
          .select('id')
          .single();

        if (newLessonError) {
          console.error('Failed to create lesson:', newLessonError);
          return;
        }
        lesson = newLesson;
      }

      if (!lesson) return;

      resultIds[`${pair.subjectName}|${pair.lessonName}`] = {
        subjectId: subjectId,
        lessonId: lesson.id
      };
    };

    // Process in chunks to avoid connection pool exhaustion
    for (let i = 0; i < uniquePairs.length; i += HIERARCHY_CHUNK_SIZE) {
      const chunk = uniquePairs.slice(i, i + HIERARCHY_CHUNK_SIZE);
      await Promise.allSettled(chunk.map(processPair));
    }

    console.log(`[SYNC] Completed in ${Date.now() - syncStart}ms — ${Object.keys(resultIds).length}/${uniquePairs.length} pairs resolved`);

    return NextResponse.json({ success: true, mappings: resultIds });

  } catch (error: any) {
    console.error('Sync hierarchy error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}
