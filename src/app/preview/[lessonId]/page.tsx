import Link from 'next/link';
import { ArrowLeft, LockKeyhole } from 'lucide-react';
import { notFound } from 'next/navigation';
import { NodrekEmblem, NodrekWordmark } from '@/components/branding/NodrekBrand';
import { CoursePlayer } from '@/components/course/course-player';
import { LanguageToggle } from '@/components/i18n/language-provider';
import { mergeCoursePlayerMaterials, resolvePrimaryLessonContent } from '@/lib/lms/course-player';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export default async function GuestLessonPreviewPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { lessonId } = await params;
  const lesson = await getPrisma().lesson.findFirst({
    where: {
      id: lessonId,
      isFree: true,
      module: { course: { isPublished: true } },
    },
    select: {
      contentType: true,
      id: true,
      materials: {
        orderBy: { createdAt: 'desc' },
        select: { fileSize: true, fileType: true, fileUrl: true, id: true, isDownloadable: true, title: true },
      },
      module: {
        select: {
          course: { select: { id: true, title: true } },
          materials: {
            orderBy: { createdAt: 'desc' },
            select: { fileSize: true, fileType: true, fileUrl: true, id: true, isDownloadable: true, title: true },
          },
          title: true,
        },
      },
      pdfUrl: true,
      textContent: true,
      title: true,
      videoUrl: true,
      videoUrl1080: true,
      videoUrl360: true,
      videoUrl480: true,
      videoUrl720: true,
    },
  });
  if (!lesson) notFound();

  const qualitySources = {
    '1080p': lesson.videoUrl1080,
    '360p': lesson.videoUrl360,
    '480p': lesson.videoUrl480,
    '720p': lesson.videoUrl720,
  };
  const materials = mergeCoursePlayerMaterials(lesson.materials, lesson.module.materials);
  const primaryContent = resolvePrimaryLessonContent({
    contentType: lesson.contentType,
    lessonTitle: lesson.title,
    materials,
    pdfUrl: lesson.pdfUrl,
    qualitySources,
    videoUrl: lesson.videoUrl,
  });

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#EEF5F1] text-[#052F26]">
      <header className="border-b border-emerald-950/10 bg-white">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link className="flex min-w-0 items-center gap-3" href="/">
            <NodrekEmblem className="size-10" />
            <NodrekWordmark className="hidden sm:block" />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            <Link className="inline-flex min-h-10 items-center rounded-xl bg-[#052F26] px-4 text-xs font-extrabold text-white hover:bg-[#093F33]" href="/lms/login?mode=signup">Join Nodrek Learning Hub</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-12">
        <Link className="inline-flex items-center gap-2 text-sm font-extrabold text-[#052F26]" href="/#curriculum"><ArrowLeft aria-hidden="true" className="size-4" /> Back to curriculum</Link>
        <div className="mt-6 rounded-2xl border border-[#D8A649]/40 bg-[#EEF5F1] p-4 text-sm text-[#052F26]">
          <p className="flex items-center gap-2 font-extrabold"><LockKeyhole aria-hidden="true" className="size-4 text-[#052F26]" /> Free guest lesson · no account required</p>
          <p className="mt-1 text-xs text-slate-600">Progress, discussions, homework, and the next lesson unlock after sign-in and enrollment.</p>
        </div>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-[#093F33]">{lesson.module.course.title} · {lesson.module.title}</p>
        <h1 className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">{lesson.title}</h1>
        <div className="mt-6 min-w-0 rounded-2xl border border-emerald-950/10 bg-white p-2">
          <CoursePlayer
            defaultPlaybackSpeed={1}
            initialWatchPercentage={0}
            primaryContent={primaryContent}
            preferredQuality="AUTO"
            qualitySources={qualitySources}
            title={lesson.title}
            watermark="Nodrek Learning Hub — Guest Preview"
          />
        </div>
        {lesson.contentType === 'TEXT' && lesson.textContent ? <article className="mt-6 whitespace-pre-wrap rounded-2xl border border-emerald-950/10 bg-white p-5 text-sm leading-7 text-slate-700">{lesson.textContent}</article> : null}
      </main>
    </div>
  );
}
