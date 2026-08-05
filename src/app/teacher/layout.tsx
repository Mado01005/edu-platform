import Link from 'next/link';
import { BookOpen, CalendarDays } from 'lucide-react';
import { PortalShell } from '@/components/erp/PortalShell';
import { requireTeacherPage } from '@/lib/lms/auth';

export const dynamic = 'force-dynamic';

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const teacher = await requireTeacherPage();

  return (
    <PortalShell user={teacher}>
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

        <div className="flex w-full min-w-0 flex-col gap-4">{children}</div>
    </PortalShell>
  );
}
