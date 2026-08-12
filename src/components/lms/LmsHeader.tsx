import Link from 'next/link';
import type { User } from '@prisma/client';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  UserPlus,
} from 'lucide-react';
import { buttonVariants } from '@/components/UI/button';
import { NotificationBell } from '@/components/navbar/notification-bell';
import { UserNav } from '@/components/navbar/user-nav';
import { CommandMenu } from '@/components/navigation/command-menu';
import { cn } from '@/lib/utils';

interface LmsHeaderProps {
  user: Pick<User, 'avatarUrl' | 'email' | 'name' | 'role'> | null;
}

const navigation = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/catalog', icon: BookOpen, label: 'Catalog' },
  { href: '/live-classes', icon: CalendarDays, label: 'Live' },
] as const;

export function LmsHeader({ user }: LmsHeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-200 bg-white px-4 shadow-sm">
        <div className="mx-auto flex h-full w-full max-w-7xl min-w-0 items-center justify-between gap-4">
          {/* Left zone: brand */}
          <Link
            aria-label="Way Ground LMS catalog"
            className="group flex min-w-max shrink-0 items-center gap-3 font-bold"
            href="/catalog"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white transition-colors group-hover:bg-sky-700">
              <GraduationCap className="size-5" aria-hidden="true" />
            </span>
            <span className="hidden min-w-0 sm:block">
              <span className="block max-w-32 truncate whitespace-nowrap text-base tracking-tight text-slate-900">
                Way Ground
              </span>
            </span>
          </Link>

          {/* Center zone: global command search for signed-in users. */}
          {user ? (
            <div className="ml-auto w-10 min-w-0 sm:w-full sm:max-w-md lg:ml-0">
              <CommandMenu role={user.role} />
            </div>
          ) : (
            <nav
              aria-label="Primary navigation"
              className="hidden min-w-0 flex-1 items-center justify-center gap-2 lg:flex"
            >
              {navigation.map(({ href, icon: Icon, label }) => (
                <Link
                  className="flex min-w-0 items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
                  href={href}
                  key={href}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </nav>
          )}

          {/* Right zone: alerts and account. */}
          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
            {user ? (
              <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                <NotificationBell />
                <UserNav user={user} />
              </div>
            ) : (
              <div className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                <Link
                  className={cn(
                    buttonVariants({ size: 'sm', variant: 'ghost' }),
                    'h-10 px-2.5 sm:px-3',
                  )}
                  href="/lms/login"
                >
                  Sign in
                  <ArrowRight
                    className="hidden size-4 sm:block"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'h-10 rounded-xl px-3.5',
                  )}
                  href="/lms/login?mode=signup"
                >
                  <UserPlus className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Create account</span>
                  <span className="sm:hidden">Join</span>
                </Link>
              </div>
            )}
          </div>
        </div>
    </header>
  );
}
