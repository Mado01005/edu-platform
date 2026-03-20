import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getAllSubjects } from '@/lib/content';
import Navbar from '@/components/Navbar';
import SubjectCard from '@/components/SubjectCard';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const subjects = getAllSubjects();

  return (
    <div className="min-h-screen">
      <Navbar
        userName={session.user?.name ?? undefined}
        userImage={session.user?.image ?? undefined}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-10 fade-in">
          <p className="text-indigo-400 text-sm font-medium mb-2">
            Welcome back, {session.user?.name?.split(' ')[0]} 👋
          </p>
          <h1 className="text-4xl font-bold text-white mb-3">Your Courses</h1>
          <p className="text-gray-400 text-lg max-w-xl">
            Select a subject below to explore lessons, videos, and reading materials.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
          <div className="glass-card rounded-xl px-5 py-4">
            <p className="text-2xl font-bold text-white">{subjects.length}</p>
            <p className="text-sm text-gray-400 mt-0.5">Subjects</p>
          </div>
          <div className="glass-card rounded-xl px-5 py-4">
            <p className="text-2xl font-bold text-white">
              {subjects.reduce((acc, s) => acc + s.lessons.length, 0)}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">Lessons</p>
          </div>
          <div className="glass-card rounded-xl px-5 py-4 hidden sm:block">
            <p className="text-2xl font-bold text-white">
              {subjects.reduce((acc, s) => acc + s.lessons.filter((l) => l.hasVideo).length, 0)}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">Videos</p>
          </div>
        </div>

        {/* Subject grid */}
        {subjects.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <div className="text-5xl mb-4">📂</div>
            <p className="text-lg font-medium">No subjects found</p>
            <p className="text-sm mt-2">
              Add folders inside the{' '}
              <code className="bg-white/5 px-1 rounded">/content</code> directory to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.slug}
                slug={subject.slug}
                title={subject.title}
                icon={subject.icon}
                color={subject.color}
                lessonCount={subject.lessons.length}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
