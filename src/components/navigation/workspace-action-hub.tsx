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
      accent: 'bg-emerald-100 text-[#084B2B]',
      description: 'Start a course and add lessons in one guided workspace.',
      href:
        mode === 'admin'
          ? '/admin/curriculum#new-course'
          : '/teacher/courses#new-course',
      icon: PlusCircle,
      label: 'Create Course',
    },
    {
      accent: 'bg-emerald-100 text-[#084B2B]',
      description:
        mode === 'admin'
          ? 'See attendance, activity, and students who may need help.'
          : 'Review when students joined live classes and lessons.',
      href: mode === 'admin' ? '/admin/radar' : '/teacher/attendance',
      icon: BarChart3,
      label: 'View Attendance',
    },
    {
      accent: 'bg-emerald-100 text-[#084B2B]',
      description: 'Change your profile, notifications, and learning preferences.',
      href: '/settings',
      icon: Settings,
      label: 'App Settings',
    },
  ] as const;

  return (
    <section className="w-full min-w-0 rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5 sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#084B2B]">
        {mode === 'admin' ? 'Admin home' : 'Teacher home'}
      </p>
      <h1 className="mt-2 break-words text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {userName ? `Welcome, ${userName.split(' ')[0]}.` : 'What would you like to do?'}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Choose a card below. Every common task is one tap away.
      </p>

      <div className="mt-6 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-3">
        {actions.map(({ accent, description, href, icon: Icon, label }) => (
          <Link
            className="group flex min-w-0 flex-col rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#084B2B]"
            href={href}
            key={label}
          >
            <span className={`flex size-11 items-center justify-center rounded-2xl ${accent}`}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span className="mt-5 flex min-w-0 items-center justify-between gap-2 text-lg font-semibold text-slate-900">
              <span className="min-w-0">{label}</span>
              <ArrowRight className="size-4 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#084B2B]" aria-hidden="true" />
            </span>
            <span className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
