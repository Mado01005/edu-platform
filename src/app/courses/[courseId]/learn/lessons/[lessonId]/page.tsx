import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  ListTree,
} from 'lucide-react';
import { updateLessonProgressAction } from '@/app/lms/actions';
import { DiscussionThread } from '@/components/lms/DiscussionThread';
import { LmsHeader } from '@/components/lms/LmsHeader';
import { UniversalVideoPlayer } from '@/components/lms/UniversalVideoPlayer';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { MaterialList } from '@/components/course/material-list';
import { requireLmsPageUser } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function LessonPlayerPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const [{ courseId, lessonId }, user] = await Promise.all([
    params,
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
          lessons: {
            orderBy: { position: 'asc' },
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
    module.lessons.map((lesson) => ({ ...lesson, moduleTitle: module.title })),
  );
  const activeIndex = lessons.findIndex((lesson) => lesson.id === lessonId);
  const lesson = lessons[activeIndex];

  if (!lesson) notFound();

  const canTeach =
    isAdminRole(user.role) ||
    (user.role === 'TEACHER' && user.id === course.teacherId);
  const isEnrolled = course.enrollments.length > 0;

  if (
    (!course.isPublished && !canTeach) ||
    (course.isPublished && !isEnrolled && !canTeach && !lesson.isFree)
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
    user.role === 'STUDENT' && !isVideoLesson
      ? updateLessonProgressAction.bind(null, lesson.id, !completed)
      : null;
  const previous = lessons[activeIndex - 1];
  const next = lessons[activeIndex + 1];

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      <LmsHeader user={user} />
      <main className="mx-auto grid w-full max-w-[1500px] min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="flex min-w-0 flex-col gap-7 px-4 py-6 sm:px-8 lg:px-10">
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.2em] text-violet-300">
              {course.title} · {lesson.moduleTitle}
            </p>
            <h1 className="mt-2 break-words text-2xl font-black sm:text-3xl">
              {lesson.title}
            </h1>
          </div>

          <UniversalVideoPlayer
            autoPlayNextHref={
              user.autoPlayNext && next
                ? `/courses/${courseId}/learn/lessons/${next.id}`
                : undefined
            }
            defaultPlaybackSpeed={user.defaultPlaybackSpeed}
            initialWatchPercentage={
              lesson.progress[0]?.watchPercentage ?? 0
            }
            key={lesson.id}
            lessonId={user.role === 'STUDENT' ? lesson.id : undefined}
            preferredQuality={user.defaultVideoQuality}
            title={lesson.title}
            type={lesson.contentType}
            url={
              lesson.contentType === 'PDF'
                ? lesson.pdfUrl
                : lesson.videoUrl
            }
          />

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 gap-2">
              {previous ? (
                <Link
                  className="flex min-w-0 items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold hover:bg-white/5"
                  href={`/courses/${courseId}/learn/lessons/${previous.id}`}
                >
                  <ChevronLeft className="size-4 shrink-0" />
                  <span className="truncate">Previous</span>
                </Link>
              ) : null}
              {next ? (
                <Link
                  className="flex min-w-0 items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-bold hover:bg-white/5"
                  href={`/courses/${courseId}/learn/lessons/${next.id}`}
                >
                  <span className="truncate">Next</span>
                  <ChevronRight className="size-4 shrink-0" />
                </Link>
              ) : null}
            </div>
            {toggleProgress ? (
              <form action={toggleProgress}>
                <ActionSubmitButton
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black ${completed ? 'bg-emerald-300 text-black' : 'border border-white/10'}`}
                  pendingLabel="Updating…"
                >
                  <Check className="size-4" />
                  {completed ? 'Completed' : 'Mark complete'}
                </ActionSubmitButton>
              </form>
            ) : null}
          </div>

          {lesson.contentType === 'TEXT' && lesson.textContent ? (
            <section className="prose prose-invert max-w-none whitespace-pre-wrap rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm leading-7 text-zinc-300">
              {lesson.textContent}
            </section>
          ) : null}

          {lesson.pdfUrl ? (
            <section className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-zinc-950 p-4">
              <FileText className="size-6 shrink-0 text-violet-300" />
              <span className="min-w-0 flex-1">
                <span className="block font-black">Lesson resource</span>
                <span className="block truncate text-xs text-zinc-500">PDF document</span>
              </span>
              <a
                className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-black"
                href={lesson.pdfUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <Download className="size-4" /> Open
              </a>
            </section>
          ) : null}

          <MaterialList
            courseMaterials={course.materials}
            lessonMaterials={lesson.materials}
          />

          <DiscussionThread discussions={discussions} lessonId={lesson.id} />
        </article>

        <aside className="min-w-0 border-t border-white/10 bg-zinc-950 lg:min-h-[calc(100vh-73px)] lg:border-l lg:border-t-0">
          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-white/10 p-4 font-black">
              <ListTree className="size-4 text-violet-300" />
              Course content
              <span className="ml-auto text-xs text-zinc-500">{lessons.length} lessons</span>
            </summary>
            <div className="flex min-w-0 flex-col">
              {course.modules.map((module) => (
                <section className="min-w-0 border-b border-white/10" key={module.id}>
                  <h2 className="break-words bg-black/30 px-4 py-3 text-sm font-black">
                    {module.title}
                  </h2>
                  {module.lessons.map((item) => {
                    const itemCompleted = item.progress[0]?.isCompleted ?? false;
                    return (
                      <Link
                        className={`flex min-w-0 items-start gap-3 px-4 py-3 text-sm transition hover:bg-white/5 ${item.id === lesson.id ? 'bg-violet-500/10 text-violet-100' : 'text-zinc-400'}`}
                        href={`/courses/${courseId}/learn/lessons/${item.id}`}
                        key={item.id}
                      >
                        <span className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${itemCompleted ? 'border-emerald-300 bg-emerald-300 text-black' : 'border-zinc-700'}`}>
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
    </div>
  );
}
