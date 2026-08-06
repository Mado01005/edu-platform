import { GraduationCap } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { CommandMenu } from '@/components/navigation/command-menu';
import { MobileDock } from '@/components/navigation/mobile-dock';

export function ParentPortalShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-black text-white">
      <header className="sticky top-0 z-50 h-16 w-full border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur-md">
        <div className="mx-auto flex h-full w-full max-w-7xl min-w-0 items-center justify-between gap-3">
          <Link
            aria-label="MPS plus parent portal"
            className="flex min-w-max shrink-0 items-center gap-3"
            href="/mps"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-300 text-black">
              <GraduationCap aria-hidden="true" className="size-5" />
            </span>
            <span className="hidden text-sm font-black sm:block">MPS+ Parent Radar</span>
          </Link>
          <div className="ml-auto w-10 min-w-0 sm:w-full sm:max-w-md">
            <CommandMenu role="PARENT" />
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl min-w-0 items-start gap-6 px-4 py-6 sm:px-6">
        <AppSidebar role="PARENT" />
        <main className="box-border flex w-full max-w-md min-w-0 flex-1 flex-col gap-4 pb-24 md:pb-12">
          <Breadcrumbs role="PARENT" />
          {children}
        </main>
      </div>
      <MobileDock role="PARENT" />
    </div>
  );
}
