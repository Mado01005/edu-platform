'use client';

import type { ReactNode } from 'react';

export function ProtectedContentShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-w-0 select-none"
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}
