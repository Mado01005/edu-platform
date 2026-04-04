import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { deleteR2Object } from '@/lib/r2';
import { validateDeleteInput, extractR2Key } from '@/lib/validation';
import { ApiErrors, createSuccessResponse } from '@/lib/errors';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user?.isAdmin) {
      return ApiErrors.UNAUTHORIZED();
    }

    const { lessonSlug, subjectSlug } = await req.json();

    // Validate input
    const validation = validateDeleteInput({ lessonSlug, subjectSlug });
    if (!validation.isValid) {
      return ApiErrors.INVALID_INPUT(validation.errors);
    }

    if (!lessonSlug || !subjectSlug) {
      return ApiErrors.MISSING_PARAMETER('lessonSlug or subjectSlug');
    }

    // 1. Delete the lesson record first (database cascade should handle content_items internally)
    const { error: dbError } = await supabaseAdmin
      .from('lessons')
      .delete()
      .eq('slug', lessonSlug)
      .eq('subject_id', (await supabaseAdmin.from('subjects').select('id').eq('slug', subjectSlug).single()).data?.id);

    if (dbError) {
      console.error('Database lesson deletion error:', dbError);
      return ApiErrors.DATABASE_ERROR(dbError.message);
    }

    // 2. Only after successful DB deletion, fetch and delete exact R2 object keys attached to this lesson
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
        for (const item of contentItems) {
          const r2Key = extractR2Key(item.url || '');
          if (r2Key) {
            try {
              await deleteR2Object(r2Key);
              console.log(`Deleted exact R2 object (Lesson Tier): ${r2Key}`);
            } catch (err) {
              console.warn(`[Delete Lesson] R2 cleanup failed for key: ${r2Key}`);
            }
          }
        }
      }
    }

    // 3. Log activity
    await supabaseAdmin.from('activity_logs').insert({
      user_email: session.user?.email || 'admin',
      user_name: session.user?.name || 'Admin',
      action: 'LESSON_DELETED',
      details: { lessonSlug, subjectSlug },
    });

    return createSuccessResponse({ success: true });

  } catch (error: unknown) {
    console.error('Delete lesson error:', error);
    return ApiErrors.INTERNAL_ERROR();
  }
}
