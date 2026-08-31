'use client';

import type { Role } from '@prisma/client';
import {
  Activity,
  BookOpen,
  CalendarPlus,
  ChevronDown,
  ClipboardCheck,
  CreditCard,
  FileText,
  GraduationCap,
  HardDrive,
  Home,
  KeyRound,
  Landmark,
  LayoutDashboard,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  ReceiptText,
  School,
  Search,
  Settings,
  TicketCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { OqoolEmblem, OqoolWordmark } from '@/components/branding/OqoolBrand';
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
  getNavigationSections,
  type NavigationItem,
  type NavigationItemKey,
} from '@/lib/lms/navigation';
import { isAdminRole } from '@/lib/lms/roles';
import { cn } from '@/lib/utils';

interface AppSidebarProps {
  role: Role;
}

const iconByKey: Record<NavigationItemKey, typeof LayoutDashboard> = {
  'accounting-approvals': CreditCard,
  'accounting-invoices': ReceiptText,
  'accounting-ledger': Landmark,
  'admin-curriculum': School,
  'admin-radar': Activity,
  'admin-storage': HardDrive,
  'admin-users': Users,
  catalog: BookOpen,
  dashboard: LayoutDashboard,
  live: Radio,
  'parent-attendance': Users,
  'parent-invoices': ReceiptText,
  'parent-reports': FileText,
  profile: TrendingUp,
  settings: Settings,
  'support-lookup': Search,
  'support-resets': KeyRound,
  'support-tickets': TicketCheck,
  'teacher-courses': GraduationCap,
  'teacher-grading': ClipboardCheck,
  'teacher-home': Home,
  'teacher-zoom': CalendarPlus,
};

function matchesPath(pathname: string, currentHash: string, item: NavigationItem) {
  const [, itemHash] = item.href.split('#');
  if (itemHash) {
    const route = item.href.split(/[?#]/)[0];
    return (
      (pathname === route || pathname.startsWith(`${route}/`)) &&
      currentHash === `#${itemHash}`
    );
  }
  const routes = item.activeRoutes ?? [item.href.split(/[?#]/)[0]];
  if (currentHash && routes.includes(pathname)) return false;
  return routes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function NavigationLink({
  collapsed,
  currentHash,
  item,
  mobile,
  pathname,
}: {
  collapsed: boolean;
  currentHash: string;
  item: NavigationItem;
  mobile: boolean;
  pathname: string;
}) {
  const Icon = iconByKey[item.key];
  const active = matchesPath(pathname, currentHash, item);
  const link = (
    <Link
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed && !mobile ? item.label : undefined}
      className={cn(
        'group flex min-w-0 items-center rounded-xl border-l-4 px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-in-out',
        collapsed && !mobile ? 'justify-center gap-0' : 'gap-3',
        active
          ? 'border-brand-gold bg-brand-gold/10 font-semibold text-brand-base'
          : 'border-transparent text-slate-600 hover:bg-brand-gold/10 hover:text-brand-gold',
      )}
      href={item.href}
      title={collapsed && !mobile ? item.label : item.description}
    >
      <Icon aria-hidden="true" className="size-5 shrink-0" />
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

  return mobile ? <SheetClose asChild>{link}</SheetClose> : link;
}

function SidebarNavigation({
  collapsed,
  currentHash,
  mobile = false,
  pathname,
  role,
}: {
  collapsed: boolean;
  currentHash: string;
  mobile?: boolean;
  pathname: string;
  role: Role;
}) {
  const visibleSections = getNavigationSections(role);
  const collapsibleSections = isAdminRole(role) && !collapsed;

  return (
    <nav
      aria-label={mobile ? 'Mobile portal navigation' : 'Portal navigation'}
      className="flex min-w-0 flex-col gap-5"
    >
      {visibleSections.map((section) => {
        const links = (
          <div className="flex min-w-0 flex-col gap-1">
            {section.items.map((item) => (
              <NavigationLink
                collapsed={collapsed}
                currentHash={currentHash}
                item={item}
                key={`${section.label}-${item.href}`}
                mobile={mobile}
                pathname={pathname}
              />
            ))}
          </div>
        );

        if (collapsibleSections) {
          return (
            <details className="group/section min-w-0" key={section.label} open>
              <summary className="mb-2 flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 [&::-webkit-details-marker]:hidden">
                <span className="truncate">{section.label}</span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-3 shrink-0 transition group-open/section:rotate-180"
                />
              </summary>
              {links}
            </details>
          );
        }

        return (
          <section className="min-w-0" key={section.label}>
            <h2
              className={cn(
                'mb-2 truncate px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400',
                collapsed && !mobile && 'sr-only',
              )}
            >
              {section.label}
            </h2>
            {links}
          </section>
        );
      })}
    </nav>
  );
}

export function AppSidebar({ role }: AppSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [currentHash, setCurrentHash] = useState('');

  useEffect(() => {
    function synchronizeHash() {
      setCurrentHash(window.location.hash);
    }
    synchronizeHash();
    window.addEventListener('hashchange', synchronizeHash);
    return () => window.removeEventListener('hashchange', synchronizeHash);
  }, [pathname]);

  return (
    <>
      <aside
        className={cn(
          'sticky top-20 hidden h-[calc(100vh-6rem)] min-w-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-brand-rim bg-white shadow-sm shadow-brand-base/5 transition-[width] duration-200 ease-in-out md:flex',
          collapsed ? 'w-20' : 'w-72',
        )}
      >
        <div
          className={cn(
            'flex min-w-0 items-center border-b border-brand-rim p-3',
            collapsed ? 'flex-col justify-center gap-2' : 'justify-between gap-3',
          )}
        >
          <div className={cn('flex min-w-0 items-center gap-2', collapsed && 'justify-center')}>
            <OqoolEmblem className="size-9" decorative />
            <div className={cn('min-w-0', collapsed && 'sr-only')}>
              <OqoolWordmark />
              <p className="sr-only">
                {isAdminRole(role) ? 'Full platform navigation' : 'Your navigation'}
              </p>
            </div>
          </div>
          <button
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-pressed={collapsed}
            className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-brand-rim bg-white text-slate-500 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-brand-gold hover:bg-brand-gold/10 hover:text-brand-gold hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold"
            onClick={() => setCollapsed((value) => !value)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden="true" className="size-5" />
            ) : (
              <PanelLeftClose aria-hidden="true" className="size-5" />
            )}
          </button>
        </div>

        <div
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-12 pt-4 [scrollbar-gutter:stable]"
          data-sidebar-scroll-region
        >
          <SidebarNavigation
            collapsed={collapsed}
            currentHash={currentHash}
            pathname={pathname}
            role={role}
          />
        </div>

        <div
          className={cn(
            'border-t border-brand-rim p-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400',
            collapsed ? 'text-center' : 'truncate px-5',
          )}
          title={role}
        >
          {collapsed ? role.slice(0, 1) : role.replaceAll('_', ' ')}
        </div>
      </aside>

      <Sheet>
        <SheetTrigger asChild>
          <button
            aria-label="Open portal navigation"
            className="fixed bottom-24 left-4 z-40 flex h-11 items-center gap-2 rounded-full border border-brand-gold bg-brand-base px-4 text-sm font-semibold text-brand-gold shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-brand-surface hover:text-brand-gold-hover hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold focus-visible:ring-offset-2 md:hidden"
            type="button"
          >
            <Menu aria-hidden="true" className="size-4" />
            Menu
          </button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader className="border-b border-brand-rim p-5">
            <SheetTitle className="flex items-center gap-3 text-left">
              <OqoolEmblem className="size-9" decorative />
              <OqoolWordmark />
              <span className="sr-only">Oqool Academy navigation</span>
            </SheetTitle>
            <SheetDescription>
              Only the tools available to your role are shown.
            </SheetDescription>
          </SheetHeader>
          <div
            className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-12 pt-5 [scrollbar-gutter:stable]"
            data-mobile-sidebar-scroll-region
          >
            <SidebarNavigation
              collapsed={false}
              currentHash={currentHash}
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
