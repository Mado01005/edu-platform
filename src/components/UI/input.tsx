import * as React from 'react';
import { cn } from '@/lib/utils';

function Input({
  className,
  type,
  ...props
}: React.ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'h-12 w-full min-w-0 rounded-xl border border-emerald-950/10 bg-white px-4 text-sm text-slate-900 shadow-sm outline-none transition-all duration-200 ease-in-out placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70',
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input };
