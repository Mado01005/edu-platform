import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { updateLessonProgressAction } from '@/app/lms/actions';
import { CoursePlayer } from '@/components/course/course-player';
import { CourseSidebar } from '@/components/course/course-sidebar';
import { LessonResources } from '@/components/course/lesson-resources';
import { DiscussionThread } from '@/components/lms/DiscussionThread';
import { LmsHeader } from '@/components/lms/LmsHeader';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { AssignmentSubmissionCard } from '@/components/course/assignment-submission-card';
import { ProtectedContentShell } from '@/components/course/protected-content-shell';
import { requireLmsPageUser } from '@/lib/lms/auth';
import {
  formatLessonPlayerHeading,
  getCoursePlayerBreadcrumbs,
  mergeCoursePlayerMaterials,
  resolvePrimaryLessonContent,
} from '@/lib/lms/course-player';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function LessonPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const [{ courseId, lessonId }, query, user] = await Promise.all([
    params,
    searchParams,
    requireLmsPageUser(),
  ]);
  const course = await getPrisma().course.findUnique({
    where: { id: courseId },
    include: {
      materials: {
        orderBy: { createdAt: 'desc' },
        select: {
          fileSize: true,
          fileType: true,
          fileUrl: true,
          id: true,
          title: true,
        },
      },
      enrollments: {
        where: { studentId: user.id },
        select: { id: true },
      },
      modules: {
        orderBy: { position: 'asc' },
        include: {
          materials: {
            orderBy: { createdAt: 'desc' },
            select: {
              fileSize: true, fileType: true, fileUrl: true, id: true, title: true,
            },
          },
          lessons: {
            orderBy: { position: 'asc' },
            include: {
              assignment: {
                include: {
                  submissions: {
                    where: { studentId: user.id },
                    select: { feedback: true, fileUrl: true, grade: true, status: true },
                    take: 1,
                  },
                },
              },
              materials: {
                orderBy: { createdAt: 'desc' },
                select: {
                  fileSize: true,
                  fileType: true,
                  fileUrl: true,
                  id: true,
                  title: true,
                },
              },
              progress: {
                where: { studentId: user.id },
                select: { isCompleted: true, watchPercentage: true },
              },
            },
          },
        },
      },
    },
  });

  if (!course) notFound();
  const lessons = course.modules.flatMap((module) =>
    module.lessons.map((lesson) => ({ ...lesson, moduleMaterials: module.materials, moduleTitle: module.title })),
  );
  const activeIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  const lesson = lessons[activeIndex];

  if (!lesson) notFound();

  const canTeach =
    isAdminRole(user.role) ||
    (user.role === 'TEACHER' && user.id === course.teacherId);
  const isEnrolled = course.enrollments.length > 0;
  const isPreview = query.preview === 'true';

  if (isPreview && !canTeach) redirect('/catalog');

  if (
    !isPreview && ((!course.isPublished && !canTeach) ||
    (course.isPublished && !isEnrolled && !canTeach && !lesson.isFree))
  ) {
    redirect('/catalog');
  }

  const discussions = await getPrisma().discussion.findMany({
    where: { lessonId, parentId: null },
    include: {
      user: { select: { name: true, email: true } },
      replies: {
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { name: true, email: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  const completed = lesson.progress[0]?.isCompleted ?? false;
  const previous = lessons[activeIndex - 1];
  const next = lessons[activeIndex + 1];
  const previewSuffix = isPreview ? '?preview=true' : '';
  const lessonMaterials = mergeCoursePlayerMaterials(
    lesson.materials,
    lesson.moduleMaterials,
  );
  const directPdfMaterial = lesson.pdfUrl
    ? [
        {
          fileSize: null,
          fileType: 'PDF',
          fileUrl: lesson.pdfUrl,
          id: `lesson-pdf-${lesson.id}`,
          title: `${lesson.title} resource`,
        },
      ]
    : [];
  const resourceMaterials = mergeCoursePlayerMaterials(
    directPdfMaterial,
    lessonMaterials,
    course.materials,
  );
  const qualitySources = {
    '1080p': lesson.videoUrl1080,
    '360p': lesson.videoUrl360,
    '480p': lesson.videoUrl480,
    '720p': lesson.videoUrl720,
  };
  const primaryContent = resolvePrimaryLessonContent({
    contentType: lesson.contentType,
    lessonTitle: lesson.title,
    materials: lessonMaterials,
    pdfUrl: lesson.pdfUrl,
    qualitySources,
    videoUrl: lesson.videoUrl,
  });
  const isVideoLesson = primaryContent.kind === 'video';
  const toggleProgress =
    user.role === 'STUDENT' && !isPreview && !isVideoLesson
      ? updateLessonProgressAction.bind(null, lesson.id, !completed)
      : null;
  const breadcrumbs = getCoursePlayerBreadcrumbs({
    courseSlug: course.slug,
    courseTitle: course.title,
    lessonTitle: lesson.title,
    preview: isPreview,
  });
  const sidebarModules = course.modules.map((courseModule) => ({
    id: courseModule.id,
    lessons: courseModule.lessons.map((item) => ({
      completed: item.progress[0]?.isCompleted ?? false,
      id: item.id,
      title: item.title,
    })),
    title: courseModule.title,
  }));

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <LmsHeader user={user} />
      <ProtectedContentShell>
      <main className="mx-auto grid w-full max-w-[1500px] min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="flex min-w-0 flex-col gap-5 px-4 py-6 sm:px-8 lg:px-10">
          <Breadcrumbs items={breadcrumbs} role={user.role} />
          {isPreview ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-800">
              <span aria-hidden="true">👁️ </span>
              STUDENT PREVIEW MODE — Editing controls are hidden. You are viewing this course as a student.
            </div>
          ) : null}
          <h1 className="min-w-0 break-words text-2xl font-bold text-slate-900">
            {formatLessonPlayerHeading(
              course.title,
              lesson.moduleTitle,
              lesson.title,
            )}
          </h1>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
            <CoursePlayer
              autoPlayNextHref={
                user.autoPlayNext && next
                  ? `/courses/${courseId}/learn/lessons/${next.id}${previewSuffix}`
                  : undefined
              }
              defaultPlaybackSpeed={user.defaultPlaybackSpeed}
              initialWatchPercentage={
                lesson.progress[0]?.watchPercentage ?? 0
              }
              key={lesson.id}
              lessonId={
                user.role === 'STUDENT' && !isPreview ? lesson.id : undefined
              }
              primaryContent={primaryContent}
              preferredQuality={user.defaultVideoQuality}
              qualitySources={qualitySources}
              title={lesson.title}
            />
          </div>

          <nav
            aria-label="Lesson navigation"
            className="grid min-w-0 grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm"
          >
            {previous ? (
              <Link
                className="flex min-h-10 min-w-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800"
                href={`/courses/${courseId}/learn/lessons/${previous.id}${previewSuffix}`}
              >
                <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">Previous Lesson</span>
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex min-h-10 min-w-0 items-center gap-1 rounded-lg px-3 py-2 text-sm font-semibold text-slate-300"
              >
                <ChevronLeft aria-hidden="true" className="size-4 shrink-0" />
                <span className="truncate">Previous Lesson</span>
              </span>
            )}
            {next ? (
              <Link
                className="flex min-h-10 min-w-0 items-center justify-end gap-1 rounded-lg px-3 py-2 text-right text-sm font-semibold text-slate-700 transition hover:bg-sky-50 hover:text-sky-800"
                href={`/courses/${courseId}/learn/lessons/${next.id}${previewSuffix}`}
              >
                <span className="truncate">Next Lesson</span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </Link>
            ) : (
              <span
                aria-disabled="true"
                className="flex min-h-10 min-w-0 items-center justify-end gap-1 rounded-lg px-3 py-2 text-right text-sm font-semibold text-slate-300"
              >
                <span className="truncate">Next Lesson</span>
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              </span>
            )}
          </nav>

          {toggleProgress ? (
            <form action={toggleProgress} className="flex justify-end">
              <ActionSubmitButton
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${completed ? 'bg-emerald-100 text-emerald-800' : 'border border-slate-200 bg-white'}`}
                pendingLabel="Updating…"
              >
                <Check className="size-4" />
                {completed ? 'Completed' : 'Mark complete'}
              </ActionSubmitButton>
            </form>
          ) : null}

          {lesson.contentType === 'TEXT' && lesson.textContent ? (
            <section className="prose max-w-none whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
              {lesson.textContent}
            </section>
          ) : null}

          <LessonResources materials={resourceMaterials} />

          {lesson.contentType === 'ASSIGNMENT' && lesson.assignment && user.role === 'STUDENT' && !isPreview ? (
            <AssignmentSubmissionCard
              assignmentId={lesson.assignment.id}
              dueAt={lesson.assignment.dueAt?.toISOString() ?? null}
              initialSubmission={lesson.assignment.submissions[0] ?? null}
              instructions={lesson.assignment.instructions}
            />
          ) : null}

          <DiscussionThread discussions={discussions} lessonId={lesson.id} />
        </article>

        <CourseSidebar
          activeLessonId={lesson.id}
          courseId={courseId}
          modules={sidebarModules}
          previewSuffix={previewSuffix}
        />
      </main>
      </ProtectedContentShell>
    </div>
  );
}
