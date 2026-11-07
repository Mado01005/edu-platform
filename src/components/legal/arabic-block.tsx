import type { ReactNode } from 'react';

export function ArabicBlock({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-3 rounded-2xl border border-emerald-950/10 bg-[#EEF5F1] p-5 text-base leading-8 text-slate-700" dir="rtl" lang="ar">
      {children}
    </div>
  );
}
