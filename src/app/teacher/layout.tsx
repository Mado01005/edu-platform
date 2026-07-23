import Link from 'next/link';
import { BookOpen, CalendarDays, GraduationCap } from 'lucide-react';
import { requireTeacherPage } from '@/lib/lms/auth';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacher = await requireTeacherPage();

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-black px-4 text-white">
      <div className="flex w-full max-w-md flex-col gap-4 box-border">
        <header className="sticky top-0 z-40 -mx-4 flex min-w-0 items-center justify-between border-b border-white/10 bg-black/90 px-4 py-4 backdrop-blur">
          <Link
            className="flex min-w-0 items-center gap-2 font-black tracking-tight"
            href="/teacher/courses"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-400 text-black">
              <GraduationCap className="size-5" />
            </span>
            <span className="truncate">Teacher Studio</span>
          </Link>
          <span className="max-w-32 truncate text-xs text-zinc-500">
            {teacher.name ?? teacher.email}
          </span>
        </header>

        <nav className="grid w-full grid-cols-2 gap-2">
          <Link
            className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm font-bold hover:border-violet-400/50"
            href="/teacher/courses"
          >
            <BookOpen className="size-4 shrink-0" />
            <span className="truncate">Courses</span>
          </Link>
          <Link
            className="flex min-w-0 items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-950 px-3 py-3 text-sm font-bold hover:border-violet-400/50"
            href="/live-classes"
          >
            <CalendarDays className="size-4 shrink-0" />
            <span className="truncate">Live classes</span>
          </Link>
        </nav>

        <main className="flex w-full min-w-0 flex-col gap-4 pb-24">{children}</main>
      </div>
    </div>
  );
}
