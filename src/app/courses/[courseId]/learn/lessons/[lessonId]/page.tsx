import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ListTree,
} from 'lucide-react';
import { updateLessonProgressAction } from '@/app/lms/actions';
import { DiscussionThread } from '@/components/lms/DiscussionThread';
import { LmsHeader } from '@/components/lms/LmsHeader';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { UniversalVideoPlayer } from '@/components/lms/UniversalVideoPlayer';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { MaterialList } from '@/components/course/material-list';
import { AssignmentSubmissionCard } from '@/components/course/assignment-submission-card';
import { DocumentViewer } from '@/components/course/document-viewer';
import { ProtectedContentShell } from '@/components/course/protected-content-shell';
import { requireLmsPageUser } from '@/lib/lms/auth';
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
  const isVideoLesson = ['R2_VIDEO', 'VIMEO', 'YOUTUBE'].includes(
    lesson.contentType,
  );
  const toggleProgress =
    user.role === 'STUDENT' && !isPreview && !isVideoLesson
      ? updateLessonProgressAction.bind(null, lesson.id, !completed)
      : null;
  const previous = lessons[activeIndex - 1];
  const next = lessons[activeIndex + 1];
  const previewSuffix = isPreview ? '?preview=true' : '';

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <LmsHeader user={user} />
      <ProtectedContentShell>
      <main className="mx-auto grid w-full max-w-[1500px] min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="flex min-w-0 flex-col gap-7 px-4 py-6 sm:px-8 lg:px-10">
          <Breadcrumbs role={user.role} />
          {isPreview ? (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-black text-sky-800">
              <span aria-hidden="true">👁️ </span>
              STUDENT PREVIEW MODE — Editing controls are hidden. You are viewing this course as a student.
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.2em] text-sky-700">
              {course.title} · {lesson.moduleTitle}
            </p>
            <h1 className="mt-2 break-words text-2xl font-black sm:text-3xl">
              {lesson.title}
            </h1>
          </div>

          <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          <UniversalVideoPlayer
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
            lessonId={user.role === 'STUDENT' && !isPreview ? lesson.id : undefined}
            preferredQuality={user.defaultVideoQuality}
            qualitySources={{
              '1080p': lesson.videoUrl1080,
              '360p': lesson.videoUrl360,
              '480p': lesson.videoUrl480,
              '720p': lesson.videoUrl720,
            }}
            title={lesson.title}
            type={lesson.contentType}
            url={
              lesson.contentType === 'PDF'
                ? lesson.pdfUrl
                : lesson.videoUrl
            }
          />
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 gap-2">
              {previous ? (
                <Link
                  className="flex min-w-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-100"
                  href={`/courses/${courseId}/learn/lessons/${previous.id}${previewSuffix}`}
                >
                  <ChevronLeft className="size-4 shrink-0" />
                  <span className="truncate">Previous</span>
                </Link>
              ) : null}
              {next ? (
                <Link
                  className="flex min-w-0 items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold hover:bg-slate-100"
                  href={`/courses/${courseId}/learn/lessons/${next.id}${previewSuffix}`}
                >
                  <span className="truncate">Next</span>
                  <ChevronRight className="size-4 shrink-0" />
                </Link>
              ) : null}
            </div>
            {toggleProgress ? (
              <form action={toggleProgress}>
                <ActionSubmitButton
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${completed ? 'bg-emerald-100 text-emerald-800' : 'border border-slate-200 bg-white'}`}
                  pendingLabel="Updating…"
                >
                  <Check className="size-4" />
                  {completed ? 'Completed' : 'Mark complete'}
                </ActionSubmitButton>
              </form>
            ) : null}
          </div>

          {lesson.contentType === 'TEXT' && lesson.textContent ? (
            <section className="prose max-w-none whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700 shadow-sm">
              {lesson.textContent}
            </section>
          ) : null}

          {lesson.pdfUrl && lesson.contentType !== 'PDF' ? (
            <DocumentViewer fileType="PDF" title={`${lesson.title} resource`} url={lesson.pdfUrl} />
          ) : null}

          <MaterialList
            courseMaterials={course.materials}
            lessonMaterials={[...lesson.moduleMaterials, ...lesson.materials]}
          />

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

        <aside className="min-w-0 border-t border-slate-200 bg-white lg:min-h-[calc(100vh-73px)] lg:border-l lg:border-t-0">
          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-slate-200 p-4 font-black">
              <ListTree className="size-4 text-sky-700" />
              Course content
              <span className="ml-auto text-xs text-slate-500">{lessons.length} lessons</span>
            </summary>
            <div className="flex min-w-0 flex-col">
              {course.modules.map((module) => (
                <section className="min-w-0 border-b border-slate-200" key={module.id}>
                  <h2 className="break-words bg-slate-50 px-4 py-3 text-sm font-black">
                    {module.title}
                  </h2>
                  {module.lessons.map((item) => {
                    const itemCompleted = item.progress[0]?.isCompleted ?? false;
                    return (
                      <Link
                        className={`flex min-w-0 items-start gap-3 px-4 py-3 text-sm transition hover:bg-slate-50 ${item.id === lesson.id ? 'bg-sky-50 text-sky-800' : 'text-slate-600'}`}
                        href={`/courses/${courseId}/learn/lessons/${item.id}${previewSuffix}`}
                        key={item.id}
                      >
                        <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${itemCompleted ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
                          {itemCompleted ? <Check className="size-3" /> : null}
                        </span>
                        <span className="min-w-0 break-words">{item.title}</span>
                      </Link>
                    );
                  })}
                </section>
              ))}
            </div>
          </details>
        </aside>
      </main>
      </ProtectedContentShell>
    </div>
  );
}
