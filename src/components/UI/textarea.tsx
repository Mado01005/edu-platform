import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({
  className,
  ...props
}: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'min-h-32 w-full min-w-0 resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-70',
        className,
      )}
      data-slot="textarea"
      {...props}
    />
  );
}

export { Textarea };
