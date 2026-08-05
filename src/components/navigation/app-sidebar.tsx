'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';
import {
  Activity,
  BookOpen,
  CreditCard,
  LockKeyhole,
  PlusCircle,
  Settings,
} from 'lucide-react';
import { isAdminRole } from '@/lib/lms/roles';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  role: Role;
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const admin = isAdminRole(role);
  const radarHref = admin ? '/admin/radar' : '/teacher/attendance';
  const items = [
    {
      href: '/teacher/courses',
      icon: BookOpen,
      label: 'My Courses & Lessons',
    },
    {
      href: '/teacher/courses#new-course',
      icon: PlusCircle,
      label: 'Create New Course',
    },
    {
      href: radarHref,
      icon: Activity,
      label: 'Student Radar & Roster',
    },
    {
      href: admin ? '/accounting' : null,
      icon: CreditCard,
      label: 'Accounting & Invoices',
    },
    {
      href: '/settings',
      icon: Settings,
      label: 'Platform Settings',
    },
  ] as const;

  return (
    <aside className="sticky top-20 hidden w-64 shrink-0 flex-col gap-4 md:flex">
      <div className="rounded-3xl border border-white/10 bg-zinc-950/90 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
        <div className="px-3 pb-3 pt-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300">
            Workspace
          </p>
          <p className="mt-1 text-sm font-bold text-zinc-400">
            Choose what you want to do.
          </p>
        </div>

        <nav aria-label="Workspace navigation" className="flex flex-col gap-1.5">
          {items.map(({ href, icon: Icon, label }) => {
            const route = href?.split('#')[0];
            const active = route && !href?.includes('#')
              ? pathname === route ||
                (route !== '/settings' && pathname.startsWith(`${route}/`))
              : false;

            if (!href) {
              return (
                <div
                  aria-disabled="true"
                  className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-zinc-600"
                  key={label}
                  title="Administrator access is required"
                >
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-sm font-bold leading-5">
                    {label}
                  </span>
                  <LockKeyhole className="size-3.5 shrink-0" aria-hidden="true" />
                </div>
              );
            }

            return (
              <Link
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition',
                  active
                    ? 'bg-violet-400 text-black shadow-lg shadow-violet-500/15'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white',
                )}
                href={href}
                key={label}
              >
                <Icon className="size-5 shrink-0" aria-hidden="true" />
                <span className="min-w-0 leading-5">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4">
        <p className="text-xs font-black text-emerald-200">Need a quick start?</p>
        <p className="mt-1 text-xs leading-5 text-zinc-400">
          Use the large action cards in your workspace home.
        </p>
      </div>
    </aside>
  );
}
