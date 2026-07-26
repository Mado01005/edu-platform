import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-32 w-full min-w-0 resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-white outline-none backdrop-blur-md transition placeholder:text-zinc-500 focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

export { Textarea };
