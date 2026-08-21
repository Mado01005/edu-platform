import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-emerald-200 bg-emerald-50 text-[#084B2B]',
        secondary:
          'border-emerald-950/10 bg-slate-100 text-slate-700',
        success:
          'border-emerald-200 bg-emerald-50 text-emerald-700',
        outline:
          'border-slate-300 bg-transparent text-slate-600',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      data-slot="badge"
      {...props}
    />
  );
}

export { Badge, badgeVariants };
