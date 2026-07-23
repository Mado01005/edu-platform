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
        'h-12 w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none backdrop-blur-md transition placeholder:text-zinc-500 focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      data-slot="input"
      type={type}
      {...props}
    />
  );
}

export { Input };
