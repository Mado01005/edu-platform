import { redirect } from 'next/navigation';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function PreviewIndexPage() {
  let lessonId: string | null = null;

  try {
    const lesson = await getPrisma().lesson.findFirst({
      where: {
        isFree: true,
        module: { course: { isPublished: true } },
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    lessonId = lesson?.id ?? null;
  } catch (error) {
    console.error('[FREE_PREVIEW_LOOKUP]', error);
  }

  redirect(lessonId ? `/preview/${lessonId}` : '/catalog');
}
