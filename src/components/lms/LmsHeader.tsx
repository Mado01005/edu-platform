import Link from 'next/link';
import { BookOpen, CalendarDays, GraduationCap, LayoutDashboard } from 'lucide-react';

export function LmsHeader() {
  return (
    <header className="border-b border-white/10 bg-black/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl min-w-0 items-center gap-3 px-4 py-4">
        <Link className="flex min-w-0 items-center gap-2 font-black" href="/catalog">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-400 text-black">
            <GraduationCap className="size-5" />
          </span>
          <span className="hidden truncate sm:block">EduPortal LMS</span>
        </Link>
        <nav className="ml-auto flex min-w-0 items-center gap-1">
          <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5" href="/dashboard">
            <LayoutDashboard className="size-4" />
            <span className="hidden md:inline">Dashboard</span>
          </Link>
          <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5" href="/catalog">
            <BookOpen className="size-4" />
            <span className="hidden md:inline">Catalog</span>
          </Link>
          <Link className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-zinc-300 hover:bg-white/5" href="/live-classes">
            <CalendarDays className="size-4" />
            <span className="hidden md:inline">Live</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
