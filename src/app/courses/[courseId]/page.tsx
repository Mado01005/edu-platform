import { notFound, redirect } from 'next/navigation';
import { requireLmsPageUser } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function CourseEntryPage({ params, searchParams }: { params: Promise<{ courseId: string }>; searchParams: Promise<{ preview?: string }> }) {
  const [{ courseId: slug }, query, user] = await Promise.all([params, searchParams, requireLmsPageUser()]);
  const course = await getPrisma().course.findUnique({
    where: { slug },
    select: {
      id: true, isPublished: true, teacherId: true,
      modules: { orderBy: { position: 'asc' }, select: { lessons: { orderBy: { position: 'asc' }, select: { id: true }, take: 1 } } },
    },
  });
  if (!course) notFound();
  const preview = query.preview === 'true';
  const canTeach = isAdminRole(user.role) || (user.role === 'TEACHER' && user.id === course.teacherId);
  if (preview && !canTeach) redirect('/catalog');
  const lesson = course.modules.flatMap((courseModule) => courseModule.lessons)[0];
  if (!lesson) redirect(canTeach ? `/teacher/courses/${course.id}` : '/catalog');
  redirect(`/courses/${course.id}/learn/lessons/${lesson.id}${preview ? '?preview=true' : ''}`);
}
