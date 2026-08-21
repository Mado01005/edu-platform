import type { User } from '@prisma/client';
import type { ReactNode } from 'react';
import { LmsHeader } from '@/components/lms/LmsHeader';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { Breadcrumbs } from '@/components/navigation/breadcrumbs';
import { MobileDock } from '@/components/navigation/mobile-dock';

export function PortalShell({
  children,
  user,
}: {
  children: ReactNode;
  user: Pick<User, 'avatarUrl' | 'email' | 'name' | 'role'>;
}) {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-surface-canvas text-brand-700 transition-colors duration-200 ease-in-out">
      <LmsHeader user={user} />
      <div className="mx-auto flex w-full max-w-[92rem] min-w-0 items-start gap-6 px-4 py-6 sm:px-6">
        <AppSidebar role={user.role} />
        <main className="flex w-full min-w-0 flex-1 flex-col gap-4 pb-24 md:pb-10">
          <Breadcrumbs role={user.role} />
          {children}
        </main>
      </div>
      <MobileDock role={user.role} />
    </div>
  );
}
