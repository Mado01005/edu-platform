import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AUTH_COOKIE } from '@/lib/auth';
import { getLesson, getSubject } from '@/lib/content';
import Navbar from '@/components/Navbar';
import VideoPlayer from '@/components/VideoPlayer';
import PDFViewer from '@/components/PDFViewer';
import ImageGallery from '@/components/ImageGallery';

interface Props {
  params: Promise<{ subject: string; lesson: string }>;
}

export default async function LessonPage({ params }: Props) {
  const { subject: subjectSlug, lesson: lessonSlug } = await params;

  const cookieStore = await cookies();
  const session = cookieStore.get(AUTH_COOKIE);
  if (!session) redirect('/login');

  let user: { username: string; name: string } | null = null;
  try {
    user = JSON.parse(session.value);
  } catch {
    redirect('/login');
  }

  const subject = getSubject(subjectSlug);
  const lesson = getLesson(subjectSlug, lessonSlug);
  if (!subject || !lesson) notFound();

  return (
    <div className="min-h-screen">
      <Navbar userName={user?.name} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 fade-in flex-wrap" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-indigo-400 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href={`/subjects/${subjectSlug}`} className="hover:text-indigo-400 transition-colors">
            {subject.title}
          </Link>
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-300">{lesson.title}</span>
        </nav>

        {/* Lesson title */}
        <div className="mb-10 fade-in">
          <div className="flex items-center gap-3 mb-3">
            <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${subject.color} text-base shadow-md`}>
              {subject.icon}
            </span>
            <span className="text-sm text-gray-400">{subject.title}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white">{lesson.title}</h1>
        </div>

        {/* Content sections */}
        <div className="space-y-10">
          {/* Video */}
          {lesson.video && (
            <section id="lesson-video">
              <SectionHeader icon="🎬" title="Video Lecture" />
              <VideoPlayer src={lesson.video} title={lesson.title} />
            </section>
          )}

          {/* PDF */}
          {lesson.pdf && (
            <section id="lesson-pdf">
              <SectionHeader icon="📄" title="Reading Material" />
              <PDFViewer src={lesson.pdf} title={lesson.title} />
            </section>
          )}

          {/* Images */}
          {lesson.images.length > 0 && (
            <section id="lesson-images">
              <SectionHeader icon="🖼️" title={`Image Gallery (${lesson.images.length})`} />
              <ImageGallery images={lesson.images} title={lesson.title} />
            </section>
          )}

          {/* Empty state */}
          {!lesson.video && !lesson.pdf && lesson.images.length === 0 && (
            <div className="text-center py-20 text-gray-500">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-lg font-medium">No content yet</p>
              <p className="text-sm mt-2">
                Add a <code className="bg-white/5 px-1 rounded">video.mp4</code>,{' '}
                <code className="bg-white/5 px-1 rounded">lesson.pdf</code>, or images to this lesson folder.
              </p>
            </div>
          )}
        </div>

        {/* Back button */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <Link
            href={`/subjects/${subjectSlug}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-indigo-400 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to {subject.title}
          </Link>
        </div>
      </main>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xl">{icon}</span>
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <div className="flex-1 h-px bg-white/5" />
    </div>
  );
}
