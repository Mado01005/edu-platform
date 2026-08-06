'use client';

import type { Role } from '@prisma/client';
import { BookOpen, CalendarDays, Home, UserRound } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getRoleHome } from '@/lib/lms/navigation';
import { cn } from '@/lib/utils';

function dockDestinations(role: Role) {
  if (role === 'PARENT') {
    return {
      catalog: '/mps#report-cards',
      profile: '/mps#invoices',
      schedule: '/mps#attendance',
    };
  }
  if (role === 'TEACHER') {
    return {
      catalog: '/teacher/courses',
      profile: '/settings',
      schedule: '/live-classes',
    };
  }
  if (role === 'SUPPORT') {
    return {
      catalog: '/support#student-lookup',
      profile: '/settings',
      schedule: '/support#support-tickets',
    };
  }
  if (role === 'ACCOUNTING') {
    return {
      catalog: '/accounting#payment-approvals',
      profile: '/settings',
      schedule: '/accounting#revenue-ledger',
    };
  }
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') {
    return {
      catalog: '/catalog',
      profile: '/settings',
      schedule: '/live-classes',
    };
  }
  return {
    catalog: '/catalog',
    profile: '/lms/profile',
    schedule: '/live-classes',
  };
}

export function MobileDock({ role }: { role: Role }) {
  const pathname = usePathname();
  const [currentHash, setCurrentHash] = useState('');
  const destinations = dockDestinations(role);
  const items = [
    { href: getRoleHome(role), icon: Home, label: 'Home' },
    { href: destinations.catalog, icon: BookOpen, label: 'Catalog' },
    { href: destinations.schedule, icon: CalendarDays, label: 'Schedule' },
    { href: destinations.profile, icon: UserRound, label: 'Profile' },
  ] as const;

  useEffect(() => {
    function synchronizeHash() {
      setCurrentHash(window.location.hash);
    }
    synchronizeHash();
    window.addEventListener('hashchange', synchronizeHash);
    return () => window.removeEventListener('hashchange', synchronizeHash);
  }, [pathname]);

  return (
    <nav
      aria-label="Mobile quick navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-zinc-950/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(0,0,0,.45)] backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-4 gap-1">
        {items.map(({ href, icon: Icon, label }) => {
          const route = href.split(/[?#]/)[0];
          const itemHash = href.includes('#') ? `#${href.split('#')[1]}` : '';
          const active =
            (pathname === route || pathname.startsWith(`${route}/`)) &&
            (itemHash ? currentHash === itemHash : !currentHash);

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
              <Icon aria-hidden="true" className="size-4.5 shrink-0" />
              <span className="w-full truncate text-center">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
