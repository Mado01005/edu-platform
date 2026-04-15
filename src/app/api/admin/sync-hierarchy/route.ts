import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';

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

    const resultIds: Record<string, { subjectId: string; lessonId: string }> = {};

    for (const pair of uniquePairs) {
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
            continue;
          }
          subjectId = newSubject.id;
        } else {
          subjectId = subject.id;
        }
      }

      if (!subjectId) continue;

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
          continue;
        }
        lesson = newLesson;
      }

      if (!lesson) continue;

      resultIds[`${pair.subjectName}|${pair.lessonName}`] = {
        subjectId: subjectId,
        lessonId: lesson.id
      };
    }

    return NextResponse.json({ success: true, mappings: resultIds });

  } catch (error: any) {
    console.error('Sync hierarchy error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal error' }, { status: 500 });
  }
}

