import type { User } from '@prisma/client';
import type { ReactNode } from 'react';
import { LmsHeader } from '@/components/lms/LmsHeader';

export function PortalShell({
  children,
  user,
}: {
  children: ReactNode;
  user: Pick<User, 'avatarUrl' | 'email' | 'name' | 'role'>;
}) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-start overflow-x-hidden bg-black px-4 text-white">
      <div className="box-border flex w-full max-w-md min-w-0 flex-col gap-4">
        <LmsHeader user={user} />
        <main className="flex w-full min-w-0 flex-col gap-4 pb-24">
          {children}
        </main>
      </div>
    </div>
  );
}
