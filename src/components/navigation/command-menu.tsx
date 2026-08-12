'use client';

import type { Role } from '@prisma/client';
import { Command } from 'cmdk';
import {
  BookOpen,
  GraduationCap,
  Loader2,
  Search,
  Settings,
  UserRoundSearch,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getNavigationItems } from '@/lib/lms/navigation';

type RemoteResult = {
  description: string;
  href: string;
  id: string;
  label: string;
  type: 'course' | 'lesson' | 'student';
};

const resultIcon = {
  course: BookOpen,
  lesson: GraduationCap,
  student: UserRoundSearch,
} as const;

export function CommandMenu({ role }: { role: Role }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [remoteResults, setRemoteResults] = useState<RemoteResult[]>([]);
  const [loading, setLoading] = useState(false);
  const pages = useMemo(() => {
    const unique = new Map(
      getNavigationItems(role).map((item) => [item.href, item]),
    );
    if (role !== 'PARENT' && !unique.has('/settings')) {
      unique.set('/settings', {
        description: 'Change your profile, notifications, and account preferences.',
        href: '/settings',
        key: 'settings',
        keywords: ['account', 'profile', 'preferences'],
        label: 'Settings',
        roles: [role],
      });
    }
    return [...unique.values()];
  }, [role]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!open || normalizedQuery.length < 2 || role === 'PARENT') {
      setRemoteResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/lms/navigation/search?q=${encodeURIComponent(normalizedQuery)}`,
          { cache: 'no-store', signal: controller.signal },
        );
        if (!response.ok) {
          setRemoteResults([]);
          return;
        }
        const payload = (await response.json()) as { results?: RemoteResult[] };
        setRemoteResults(Array.isArray(payload.results) ? payload.results : []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setRemoteResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [open, query, role]);

  function select(href: string) {
    setOpen(false);
    setQuery('');
    router.push(href);
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label="Search courses, students, and pages"
        className="group flex h-10 w-10 min-w-0 items-center gap-3 rounded-xl border border-slate-300 bg-white px-2.5 text-left transition hover:border-sky-400 hover:bg-sky-50 sm:w-full sm:px-3"
        onClick={() => setOpen(true)}
        type="button"
      >
        <Search
          aria-hidden="true"
          className="size-4 shrink-0 text-slate-400 transition group-hover:text-sky-600"
        />
        <span className="hidden min-w-0 flex-1 truncate text-xs font-medium text-slate-500 sm:block">
          Search courses, students, pages...
        </span>
        <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-1 font-mono text-[9px] font-semibold text-slate-500 lg:block">
          ⌘K
        </kbd>
      </button>

      <Command.Dialog
        className="fixed left-1/2 top-[12vh] z-[101] flex max-h-[76vh] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-sm"
        label="Global command search"
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery('');
        }}
        open={open}
        overlayClassName="fixed inset-0 z-[100] bg-slate-950/40"
      >
        <div className="flex min-w-0 items-center gap-3 border-b border-slate-200 px-4 sm:px-5">
          {loading ? (
            <Loader2 aria-hidden="true" className="size-5 shrink-0 animate-spin text-sky-600" />
          ) : (
            <Search aria-hidden="true" className="size-5 shrink-0 text-slate-400" />
          )}
          <Command.Input
            aria-label="Search courses, students, pages, and settings"
            autoFocus
            className="h-16 min-w-0 flex-1 bg-transparent text-base font-medium text-slate-900 outline-none placeholder:text-slate-400"
            onValueChange={setQuery}
            placeholder="Search courses, students, pages..."
            value={query}
          />
          <button
            className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setOpen(false)}
            type="button"
          >
            Esc
          </button>
        </div>

        <Command.List className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4">
          <Command.Empty className="px-4 py-12 text-center text-sm text-slate-500">
            No matching pages or records.
          </Command.Empty>

          <Command.Group
            className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:pt-1 [&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-slate-400"
            heading="Pages & settings"
          >
            {pages.map((item) => (
              <Command.Item
                className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-slate-600 outline-none data-[selected=true]:bg-sky-600 data-[selected=true]:text-white"
                key={item.href}
                onSelect={() => select(item.href)}
                value={`${item.label} ${item.description} ${item.keywords.join(' ')}`}
              >
                <Settings aria-hidden="true" className="size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-black">{item.label}</span>
                  <span className="mt-0.5 block truncate text-xs opacity-65">
                    {item.description}
                  </span>
                </span>
                <span className="shrink-0 text-[9px] font-black uppercase opacity-50">
                  Enter ↵
                </span>
              </Command.Item>
            ))}
          </Command.Group>

          {remoteResults.length ? (
            <Command.Group
              className="mt-3 border-t border-slate-200 pt-3 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:text-[9px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.16em] [&_[cmdk-group-heading]]:text-slate-400"
              heading={role === 'SUPPORT' || role === 'ADMIN' || role === 'SUPER_ADMIN' ? 'Courses, lessons & students' : 'Courses & lessons'}
            >
              {remoteResults.map((result) => {
                const Icon = resultIcon[result.type];
                return (
                  <Command.Item
                    className="flex min-w-0 cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-slate-600 outline-none data-[selected=true]:bg-sky-600 data-[selected=true]:text-white"
                    key={`${result.type}-${result.id}`}
                    onSelect={() => select(result.href)}
                    value={`${result.label} ${result.description} ${result.type}`}
                  >
                    <Icon aria-hidden="true" className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black">{result.label}</span>
                      <span className="mt-0.5 block truncate text-xs opacity-65">
                        {result.description}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md border border-current/15 px-1.5 py-1 text-[8px] font-black uppercase opacity-60">
                      {result.type}
                    </span>
                  </Command.Item>
                );
              })}
            </Command.Group>
          ) : null}
        </Command.List>

        <div className="flex min-w-0 items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
          <span>↑↓ Navigate · Enter Select</span>
          <span className="truncate">Role: {role.replaceAll('_', ' ')}</span>
        </div>
      </Command.Dialog>
    </>
  );
}
