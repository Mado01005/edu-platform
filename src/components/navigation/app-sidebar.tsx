'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import type { Role } from '@prisma/client';
import {
  Activity,
  BookOpen,
  GraduationCap,
  HardDrive,
  KeyRound,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  School,
  Settings,
  Users,
} from 'lucide-react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/UI/sheet';
import {
  ACCOUNTING_ROLES,
  ADMIN_ROLES,
  SUPPORT_ROLES,
  TEACHING_ROLES,
  WORKSPACE_ROLES,
} from '@/lib/lms/roles';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  role: Role;
}

type NavigationItem = {
  activeRoutes?: readonly string[];
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles: readonly Role[];
};

const sections: readonly {
  items: readonly NavigationItem[];
  label: string;
}[] = [
  {
    label: 'Academic management',
    items: [
      {
        href: '/dashboard',
        icon: LayoutDashboard,
        label: 'Dashboard',
        roles: WORKSPACE_ROLES,
      },
      {
        href: '/catalog',
        icon: BookOpen,
        label: 'Catalog',
        roles: WORKSPACE_ROLES,
      },
      {
        activeRoutes: ['/live', '/live-classes'],
        href: '/live',
        icon: Radio,
        label: 'Live Classes',
        roles: WORKSPACE_ROLES,
      },
      {
        activeRoutes: ['/admin/curriculum', '/admin/k12'],
        href: '/admin/curriculum',
        icon: School,
        label: 'K-12 Manager',
        roles: ADMIN_ROLES,
      },
      {
        href: '/teacher',
        icon: GraduationCap,
        label: 'Teacher Studio',
        roles: TEACHING_ROLES,
      },
    ],
  },
  {
    label: 'Student & operations radar',
    items: [
      {
        href: '/admin/radar',
        icon: Activity,
        label: 'Activity Radar',
        roles: ADMIN_ROLES,
      },
      {
        href: '/admin/codes',
        icon: KeyRound,
        label: 'Digital Prepaid Codes',
        roles: ADMIN_ROLES,
      },
      {
        href: '/admin/users',
        icon: Users,
        label: 'Manage Users',
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    label: 'Financial & support portals',
    items: [
      {
        href: '/support',
        icon: LifeBuoy,
        label: 'Support Portal',
        roles: SUPPORT_ROLES,
      },
      {
        href: '/accounting',
        icon: Landmark,
        label: 'Accounting Ledger',
        roles: ACCOUNTING_ROLES,
      },
      {
        href: '/admin/storage',
        icon: HardDrive,
        label: 'Cloudflare R2 Storage',
        roles: ADMIN_ROLES,
      },
    ],
  },
  {
    label: 'Account',
    items: [
      {
        href: '/settings',
        icon: Settings,
        label: 'Platform Settings',
        roles: WORKSPACE_ROLES,
      },
    ],
  },
] as const;

function matchesPath(pathname: string, item: NavigationItem) {
  const routes = item.activeRoutes ?? [item.href];
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function SidebarNavigation({
  collapsed,
  mobile = false,
  pathname,
  role,
}: {
  collapsed: boolean;
  mobile?: boolean;
  pathname: string;
  role: Role;
}) {
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);

  return (
    <nav
      aria-label={mobile ? 'Mobile portal navigation' : 'Portal navigation'}
      className="flex min-w-0 flex-col gap-5"
    >
      {visibleSections.map((section) => (
        <section className="min-w-0" key={section.label}>
          <h2
            className={cn(
              'mb-2 truncate px-3 text-[9px] font-black uppercase tracking-[0.18em] text-zinc-600',
              collapsed && !mobile && 'sr-only',
            )}
          >
            {section.label}
          </h2>
          <div className="flex min-w-0 flex-col gap-1">
            {section.items.map((item) => {
              const active = matchesPath(pathname, item);
              const link = (
                <Link
                  aria-current={active ? 'page' : undefined}
                  aria-label={collapsed && !mobile ? item.label : undefined}
                  className={cn(
                    'group flex min-w-0 items-center rounded-xl px-3 py-2.5 text-sm font-bold transition',
                    collapsed && !mobile
                      ? 'justify-center gap-0'
                      : 'gap-3',
                    active
                      ? 'bg-violet-400 text-black shadow-lg shadow-violet-500/15'
                      : 'text-zinc-400 hover:bg-white/5 hover:text-white',
                  )}
                  href={item.href}
                  title={collapsed && !mobile ? item.label : undefined}
                >
                  <item.icon
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate whitespace-nowrap',
                      collapsed && !mobile && 'sr-only',
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );

              return mobile ? (
                <SheetClose asChild key={item.href}>
                  {link}
                </SheetClose>
              ) : (
                <div key={item.href}>{link}</div>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      <aside
        className={cn(
          'sticky top-16 -mt-6 hidden h-[calc(100vh-4rem)] min-w-0 shrink-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-zinc-950/95 shadow-2xl shadow-black/30 backdrop-blur-xl transition-[width] duration-200 md:flex',
          collapsed ? 'w-20' : 'w-72',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center border-b border-white/10 p-3',
            collapsed ? 'justify-center' : 'justify-between gap-3',
          )}
        >
          <div className={cn('min-w-0 px-2', collapsed && 'sr-only')}>
            <p className="truncate text-xs font-black uppercase tracking-[0.18em] text-violet-300">
              Way Ground
            </p>
            <p className="mt-0.5 truncate text-[10px] font-bold text-zinc-600">
              Portal navigation
            </p>
          </div>
          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-400 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <div
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-12 pt-4 [scrollbar-gutter:stable]"
          data-sidebar-scroll-region
        >
          <SidebarNavigation
            collapsed={collapsed}
            pathname={pathname}
            role={role}
          />
        </div>

        <div
          className={cn(
            'border-t border-white/10 p-3 text-[10px] font-black uppercase tracking-wider text-zinc-600',
            collapsed ? 'text-center' : 'truncate px-5',
          )}
          title={role}
        >
          {collapsed ? role.slice(0, 1) : role.replace('_', ' ')}
        </div>
      </aside>

      <Sheet>
        <SheetTrigger asChild>
          <button
            aria-label="Open portal navigation"
            className="fixed bottom-24 left-4 z-40 flex h-11 items-center gap-2 rounded-full border border-violet-300/25 bg-violet-400 px-4 text-sm font-black text-black shadow-xl shadow-black/50 transition hover:bg-violet-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white md:hidden"
            type="button"
          >
            <Menu className="size-4" aria-hidden="true" />
            Menu
          </button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader className="border-b border-white/10 p-5">
            <SheetTitle>Way Ground navigation</SheetTitle>
            <SheetDescription>
              Choose a workspace tool. This menu closes after selection.
            </SheetDescription>
          </SheetHeader>
          <div
            className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-12 pt-5 [scrollbar-gutter:stable]"
            data-mobile-sidebar-scroll-region
          >
            <SidebarNavigation
              collapsed={false}
              mobile
              pathname={pathname}
              role={role}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
