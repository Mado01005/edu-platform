import type { User } from '@prisma/client';
import type { ReactNode } from 'react';
import { LmsHeader } from '@/components/lms/LmsHeader';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { MobileDock } from '@/components/navigation/mobile-dock';
import { isWorkspaceRole } from '@/lib/lms/roles';

export function PortalShell({
  children,
  user,
}: {
  children: ReactNode;
  user: Pick<User, 'avatarUrl' | 'email' | 'name' | 'role'>;
}) {
  const showWorkspaceSidebar = isWorkspaceRole(user.role);

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-black text-white">
      <LmsHeader user={user} />
      <div
        className={`mx-auto flex w-full min-w-0 items-start gap-6 px-4 py-6 sm:px-6 ${
          showWorkspaceSidebar ? 'max-w-7xl' : 'max-w-4xl'
        }`}
      >
        {showWorkspaceSidebar ? <AppSidebar role={user.role} /> : null}
        <main className="flex w-full min-w-0 flex-1 flex-col gap-4 pb-24 md:pb-10">
          {children}
        </main>
      </div>
      <MobileDock role={user.role} />
    </div>
  );
}
