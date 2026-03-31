import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getSubject } from '@/lib/content';
import { supabaseAdmin } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import LessonCard from '@/components/LessonCard';
import AdminActionBar from '@/components/Admin/AdminActionBar';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ subject: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { subject: subjectParam } = await params;
  const subjectSlug = decodeURIComponent(subjectParam);
  const subject = await getSubject(subjectSlug);
  
  if (!subject) return { title: 'Subject Not Found' };
  
  return {
    title: `${subject.title} - EduPortal`,
    description: `Explore the ${subject.title} curriculum on EduPortal featuring ${subject.lessons.length} active modules.`,
    openGraph: {
      title: `${subject.title} Curriculum`,
      description: `Access specialized content for ${subject.title}.`,
      type: 'website',
      url: `/subjects/${subject.slug}`,
    },
    alternates: {
      canonical: `/subjects/${subject.slug}`,
    },
  };
}

export default async function SubjectPage({ params }: Props) {
  const { subject: subjectParam } = await params;
  const subjectSlug = decodeURIComponent(subjectParam);

  const session = await auth();
  if (!session) redirect('/login');

  const subject = await getSubject(subjectSlug);
  if (!subject) notFound();

  // Check for recently added content (last 24h) for "NEW" badges
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: newLogs } = await supabaseAdmin
    .from('activity_logs')
    .select('details')
    .eq('action', 'NEW_CONTENT_ADDED')
    .gte('created_at', since);
  const newLessonIds = new Set((newLogs || []).map(l => l.details?.lessonId).filter(Boolean));

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
        {/* Diagnostic Log for Identity Fix */}
        <script dangerouslySetInnerHTML={{ 
          __html: `console.log("Admin Status (Hydrated):", ${!!(session.user as any)?.isAdmin});` 
        }} />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 fade-in" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-indigo-400 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-300">{subject.title}</span>
        </nav>

        {/* Admin Action Bar */}
        {((session.user as any)?.isAdmin || (session.user as any)?.isSuperAdmin) && (
          <AdminActionBar 
            subject={{
              id: subject.id,
              slug: subject.slug,
              title: subject.title
            }}
          />
        )}

        {/* Subject header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-12 fade-in text-center md:text-left mt-6">
          <div className={`w-24 h-24 md:w-28 md:h-28 rounded-[2rem] bg-gradient-to-br ${subject.color} flex items-center justify-center text-5xl shadow-[0_0_40px_rgba(255,255,255,0.15)] flex-shrink-0 relative group`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${subject.color} rounded-[2rem] blur-xl opacity-40 group-hover:opacity-70 transition-opacity duration-700`}></div>
            <span className="relative z-10 scale-110">{subject.icon}</span>
          </div>
          <div className="flex-1 mt-2">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-gray-200 to-gray-500 tracking-tight mb-4 select-none drop-shadow-lg">
              {subject.title}
            </h1>
            <p className="text-gray-400 text-lg md:text-xl font-bold uppercase tracking-widest inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] animate-pulse"></span>
              {subject.lessons.length} {subject.lessons.length === 1 ? 'Module' : 'Modules'} Active
            </p>
          </div>
        </div>

        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent mb-12" />

        {/* Cyber-Timeline Lessons list */}
        {subject.lessons.length === 0 ? (
          <div className="text-center py-20 text-gray-500 border border-white/5 bg-black/40 backdrop-blur-xl rounded-3xl mx-auto max-w-2xl">
            <div className="text-6xl mb-6 opacity-80">📖</div>
            <p className="text-2xl font-black text-white mb-2">No active modules</p>
            <p className="text-base mt-2">
              The administrator is currently uploading folders to{' '}
              <code className="bg-white/10 px-2 py-1 rounded-md text-indigo-300 font-mono text-sm max-w-full inline-block truncate mt-2 border border-white/10 shadow-inner">/content/{subjectSlug}/</code>
            </p>
          </div>
        ) : (
          <div className="relative pl-0 sm:pl-2 md:pl-6 space-y-6 fade-in scale-in" style={{ animationDelay: '0.2s' }}>
            {/* The Vertical Cyber-Track Line connecting all nodes - hidden on tiny screens to save space */}
            <div className={`absolute left-[38px] md:left-[51px] top-6 bottom-16 w-1 sm:w-1.5 rounded-full bg-gradient-to-b ${subject.color} opacity-30 shadow-[0_0_15px_rgba(255,255,255,0.2)] hidden sm:block`}></div>

            {subject.lessons.map((lesson, i) => (
              <LessonCard
                key={lesson.slug}
                subjectSlug={subjectSlug}
                slug={lesson.slug}
                title={lesson.title}
                hasVideo={lesson.hasVideo}
                hasPdf={lesson.hasPdf}
                hasDocx={lesson.hasDocx}
                imageCount={lesson.imageCount}
                index={i}
                color={subject.color}
                isNew={newLessonIds.has(lesson.slug)}
              />
            ))}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
