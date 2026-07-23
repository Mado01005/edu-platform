import Link from 'next/link';
import type { User } from '@prisma/client';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
} from 'lucide-react';
import { buttonVariants } from '@/components/UI/button';
import { LmsAccountMenu } from '@/components/lms/LmsAccountMenu';
import { cn } from '@/lib/utils';

interface LmsHeaderProps {
  user: Pick<User, 'email' | 'name' | 'role'> | null;
}

const navigation = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/catalog', icon: BookOpen, label: 'Catalog' },
  { href: '/live-classes', icon: CalendarDays, label: 'Live' },
] as const;

export function LmsHeader({ user }: LmsHeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/75 backdrop-blur-xl">
      <div className="mx-auto w-full max-w-7xl min-w-0 px-4 sm:px-6">
        <div className="flex h-16 min-w-0 items-center gap-3">
          <Link
            className="group flex min-w-0 items-center gap-2.5 font-black"
            href="/catalog"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-400 to-fuchsia-500 text-black shadow-lg shadow-violet-500/20 transition group-hover:scale-105">
              <GraduationCap className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block truncate text-sm tracking-tight text-white">
                Way Ground
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.24em] text-violet-300">
                Learning platform
              </span>
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="ml-5 hidden min-w-0 items-center gap-1 md:flex"
          >
            {navigation.map(({ href, icon: Icon, label }) => (
              <Link
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
                href={href}
                key={href}
              >
                <Icon className="size-4" aria-hidden="true" />
                {label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex min-w-0 shrink-0 items-center">
            {user ? (
              <LmsAccountMenu user={user} />
            ) : (
              <Link
                className={cn(
                  buttonVariants({ size: 'sm' }),
                  'h-10 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 px-3.5 text-black shadow-lg shadow-violet-500/20 hover:from-violet-300 hover:to-fuchsia-400',
                )}
                href="/lms/login"
              >
                Sign in
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            )}
          </div>
        </div>

        <nav
          aria-label="Mobile navigation"
          className="grid min-w-0 grid-cols-3 border-t border-white/5 py-1 md:hidden"
        >
          {navigation.map(({ href, icon: Icon, label }) => (
            <Link
              className="flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-bold text-zinc-400 transition hover:bg-white/5 hover:text-white"
              href={href}
              key={href}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
