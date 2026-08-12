'use client';

import type { Role } from '@prisma/client';
import { ArrowLeft, ChevronRight, Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getRoleHome } from '@/lib/lms/navigation';

const segmentLabels: Record<string, string> = {
  accounting: 'Accounting',
  admin: 'Admin',
  catalog: 'Course Catalog',
  courses: 'Courses',
  curriculum: 'Curriculum',
  dashboard: 'Dashboard',
  grading: 'Grading Desk',
  k12: 'K-12 Manager',
  learn: 'Course Player',
  lessons: 'Lesson',
  'live-classes': 'Live Schedule',
  lms: 'Learning Account',
  mps: 'Parent Portal',
  profile: 'Profile & Progress',
  receipts: 'Receipts',
  settings: 'Settings',
  storage: 'Storage',
  support: 'Support',
  teacher: 'Teacher Studio',
  users: 'Manage Users',
};

const navigablePaths = new Set([
  '/accounting',
  '/admin',
  '/admin/curriculum',
  '/admin/k12',
  '/admin/radar',
  '/admin/storage',
  '/admin/users',
  '/catalog',
  '/dashboard',
  '/live-classes',
  '/lms/profile',
  '/settings',
  '/support',
  '/teacher',
  '/teacher/courses',
  '/teacher/grading',
]);

function segmentLabel(segment: string) {
  if (segmentLabels[segment]) return segmentLabels[segment];
  if (/^c[a-z0-9]{20,}$/i.test(segment)) return 'Course';
  if (/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(segment)) return 'Record';
  return decodeURIComponent(segment)
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function Breadcrumbs({ role }: { role: Role }) {
  const pathname = usePathname();
  const router = useRouter();
  const home = getRoleHome(role);
  if (pathname === home) return null;

  const segments = pathname.split('/').filter(Boolean);
  if (!segments.length) return null;

  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-0 pb-3">
      <nav
        aria-label="Breadcrumbs"
        className="custom-scrollbar flex min-w-0 flex-1 items-center gap-1 overflow-x-auto text-xs font-medium text-slate-500"
      >
        <Link
          aria-label="Home"
          className="flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 transition hover:bg-sky-50 hover:text-sky-700"
          href={home}
        >
          <Home aria-hidden="true" className="size-3.5" />
          Home
        </Link>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const current = index === segments.length - 1;
          return (
            <span className="flex shrink-0 items-center gap-1" key={href}>
              <ChevronRight aria-hidden="true" className="size-3 text-slate-300" />
              {current || !navigablePaths.has(href) ? (
                <span aria-current={current ? 'page' : undefined} className="max-w-44 truncate px-2 py-1.5 text-slate-900">
                  {segmentLabel(segment)}
                </span>
              ) : (
                <Link
                  className="max-w-44 truncate rounded-lg px-2 py-1.5 transition hover:bg-sky-50 hover:text-sky-700"
                  href={href}
                >
                  {segmentLabel(segment)}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      {segments.length > 1 ? (
        <button
          className="flex min-h-9 shrink-0 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
          onClick={() => router.back()}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-3.5" />
          Back
        </button>
      ) : null}
    </div>
  );
}
