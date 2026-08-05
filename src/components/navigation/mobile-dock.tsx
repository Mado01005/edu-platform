'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@prisma/client';
import { BookOpen, CalendarDays, ScanLine, Settings } from 'lucide-react';
import { isAdminRole, isTeachingRole } from '@/lib/lms/roles';
import { cn } from '@/lib/utils';

export function MobileDock({ role }: { role: Role }) {
  const pathname = usePathname();
  const teaching = isTeachingRole(role);
  const items = [
    {
      href: teaching ? '/teacher/courses' : '/catalog',
      icon: BookOpen,
      label: 'Courses',
    },
    {
      href: '/live-classes',
      icon: CalendarDays,
      label: 'Live',
    },
    {
      href: isAdminRole(role) ? '/admin/codes' : '/catalog#digital-code',
      icon: ScanLine,
      label: 'Scanner',
    },
    {
      href: '/settings',
      icon: Settings,
      label: 'Settings',
    },
  ] as const;

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,.45)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-1">
        {items.map(({ href, icon: Icon, label }) => {
          const route = href.split('#')[0];
          const active = pathname === route || pathname.startsWith(`${route}/`);

          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-black transition',
                active
                  ? 'bg-violet-400/15 text-violet-200'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-white',
              )}
              href={href}
              key={label}
            >
              <Icon className="size-4.5 shrink-0" aria-hidden="true" />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
