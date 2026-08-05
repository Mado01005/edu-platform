import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  PlusCircle,
  Settings,
} from 'lucide-react';

export function WorkspaceActionHub({
  mode,
  userName,
}: {
  mode: 'admin' | 'teacher';
  userName?: string | null;
}) {
  const actions = [
    {
      accent: 'bg-violet-300 text-black',
      description: 'Start a course and add lessons in one guided workspace.',
      href: '/teacher/courses#new-course',
      icon: PlusCircle,
      label: 'Create Course',
    },
    {
      accent: 'bg-cyan-300 text-black',
      description:
        mode === 'admin'
          ? 'See attendance, activity, and students who may need help.'
          : 'Review when students joined live classes and lessons.',
      href: mode === 'admin' ? '/admin/radar' : '/teacher/attendance',
      icon: BarChart3,
      label: 'View Attendance',
    },
    {
      accent: 'bg-emerald-300 text-black',
      description: 'Change your profile, notifications, and learning preferences.',
      href: '/settings',
      icon: Settings,
      label: 'App Settings',
    },
  ] as const;

  return (
    <section className="w-full min-w-0 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.2),transparent_48%)] p-5 sm:p-7">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
        {mode === 'admin' ? 'Admin home' : 'Teacher home'}
      </p>
      <h1 className="mt-2 break-words text-3xl font-black tracking-tight sm:text-4xl">
        {userName ? `Welcome, ${userName.split(' ')[0]}.` : 'What would you like to do?'}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
        Choose a card below. Every common task is one tap away.
      </p>

      <div className="mt-6 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-3">
        {actions.map(({ accent, description, href, icon: Icon, label }) => (
          <Link
            className="group flex min-w-0 flex-col rounded-3xl border border-white/10 bg-black/55 p-4 transition hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-black/75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            href={href}
            key={label}
          >
            <span className={`flex size-11 items-center justify-center rounded-2xl ${accent}`}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="mt-5 flex min-w-0 items-center justify-between gap-2 text-lg font-black">
              <span className="min-w-0">{label}</span>
              <ArrowRight className="size-4 shrink-0 text-zinc-600 transition group-hover:translate-x-1 group-hover:text-violet-300" aria-hidden="true" />
            </span>
            <span className="mt-2 text-sm leading-6 text-zinc-400">
              {description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
