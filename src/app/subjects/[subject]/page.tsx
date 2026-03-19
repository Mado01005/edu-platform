import { cookies } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { AUTH_COOKIE } from '@/lib/auth';
import { getSubject } from '@/lib/content';
import Navbar from '@/components/Navbar';
import LessonCard from '@/components/LessonCard';

interface Props {
  params: Promise<{ subject: string }>;
}

export default async function SubjectPage({ params }: Props) {
  const { subject: subjectSlug } = await params;

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
  if (!subject) notFound();

  return (
    <div className="min-h-screen">
      <Navbar userName={user?.name} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8 fade-in" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-indigo-400 transition-colors">Dashboard</Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-gray-300">{subject.title}</span>
        </nav>

        {/* Subject header */}
        <div className="flex items-center gap-5 mb-10 fade-in">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${subject.color} flex items-center justify-center text-3xl shadow-xl flex-shrink-0`}>
            {subject.icon}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{subject.title}</h1>
            <p className="text-gray-400 mt-1">
              {subject.lessons.length} {subject.lessons.length === 1 ? 'lesson' : 'lessons'} available
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className={`h-px bg-gradient-to-r ${subject.color} opacity-30 mb-8`} />

        {/* Lessons list */}
        {subject.lessons.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-lg font-medium">No lessons yet</p>
            <p className="text-sm mt-2">
              Add lesson folders inside{' '}
              <code className="bg-white/5 px-1 rounded">/content/{subjectSlug}/</code>
            </p>
          </div>
        ) : (
          <div className="space-y-3 fade-in">
            {subject.lessons.map((lesson, i) => (
              <LessonCard
                key={lesson.slug}
                subjectSlug={subjectSlug}
                slug={lesson.slug}
                title={lesson.title}
                hasVideo={!!lesson.video}
                hasPdf={!!lesson.pdf}
                imageCount={lesson.images.length}
                index={i}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
