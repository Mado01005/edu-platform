import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getLesson, getSubject } from '@/lib/content';
import { supabaseAdmin } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import FolderExplorer from '@/components/FolderExplorer';
import ViewTracker from '@/components/ViewTracker';
import CompleteButton from '@/components/CompleteButton';
import BookmarkButton from '@/components/BookmarkButton';
import ShareButton from '@/components/ShareButton';
import SnippetTool from '@/components/UI/SnippetTool';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ subject: string; lesson: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject: subjectParam, lesson: lessonParam } = await params;
  const subjectSlug = decodeURIComponent(subjectParam);
  const lessonSlug = decodeURIComponent(lessonParam);
  
  const lesson = await getLesson(subjectSlug, lessonSlug);
  if (!lesson) return { title: 'Lesson Not Found' };
  
  return {
    title: `${lesson.title} - EduPortal`,
    description: `Study ${lesson.title} on EduPortal. Includes video lessons, PDF materials, and interactive content.`,
    openGraph: {
      title: `${lesson.title} — Learning Module`,
      description: `Study ${lesson.title} and master the curriculum.`,
      url: `/subjects/${subjectSlug}/${lessonSlug}`,
      type: 'article',
    },
    alternates: {
      canonical: `/subjects/${subjectSlug}/${lessonSlug}`,
    },
  };
}

export default async function LessonPage({ params }: Props) {
  const { subject: subjectParam, lesson: lessonParam } = await params;
  const subjectSlug = decodeURIComponent(subjectParam);
  const lessonSlug = decodeURIComponent(lessonParam);

  const session = await auth();
  if (!session) redirect('/login');
  // @ts-ignore
  if (session.user?.isBanned) redirect('/banned');

  // Run all data fetches in parallel instead of sequential waterfall
  const [subject, lesson, { data: logs }] = await Promise.all([
    getSubject(subjectSlug),
    getLesson(subjectSlug, lessonSlug),
    supabaseAdmin.from('activity_logs')
      .select('details')
      .eq('action', 'Completed Lesson')
      .eq('user_email', session.user?.email || '')
  ]);
  
  const isCompleted = logs?.some(l => l.details?.subjectSlug === subjectSlug && l.details?.lessonSlug === lessonSlug) || false;
  
  if (!subject || !lesson) notFound();

  return (
    <div className="min-h-screen bg-[#05050A] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(0,0,0,0))] relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
      
      <div className="relative z-10">
      <Navbar
        userName={session.user?.name ?? undefined}
        userImage={session.user?.image ?? undefined}
        isAdmin={(session.user as any)?.isAdmin}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        <ViewTracker 
          action="VIEW_LESSON" 
          details={{ subject: subject.title, lesson: lesson.title }} 
        />

        <SnippetTool sourceTitle={lesson.title} />

        {/* ... existing breadcrumbs logic ... */}

        {/* Lesson Payload Header */}
        <div className="mb-14 fade-in">
          <div className="flex items-center gap-4 mb-4">
            <span className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${subject.color} text-2xl shadow-[0_0_20px_rgba(255,255,255,0.1)]`}>
              {subject.icon}
            </span>
            <span className="text-sm font-bold tracking-widest uppercase text-indigo-400 border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 rounded-md">{subject.title}</span>
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 tracking-tight select-none">
            {lesson.title}
          </h1>
        </div>

        {/* Content sections */}
        <div className="space-y-6">
          {lesson.content && lesson.content.length > 0 ? (
             <FolderExplorer 
               content={lesson.content} 
               subject={{ title: subject.title, slug: subjectSlug, id: subject.id }} 
               lesson={{ title: lesson.title, slug: lessonSlug, id: lesson.id }} 
             />
          ) : (
            <div className="text-center py-20 text-gray-500">
              <div className="text-5xl mb-4">📭</div>
              <p className="text-lg font-medium">No content yet</p>
              <p className="text-sm mt-2">
                Add files (videos, PDFs, images) or sub-folders to this lesson folder.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <CompleteButton subjectSlug={subjectSlug} lessonSlug={lessonSlug} initialCompleted={isCompleted} />
          <BookmarkButton subjectSlug={subjectSlug} lessonSlug={lessonSlug} lessonTitle={lesson.title} subjectTitle={subject.title} />
          <ShareButton title={lesson.title} />
        </div>

        <div className="mt-12 pt-8 border-t border-white/10">
          <Link
            href={`/subjects/${encodeURIComponent(subjectSlug)}`}
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            BACK TO {subject.title.toUpperCase()} MAP
          </Link>
        </div>
      </main>
      </div>
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
