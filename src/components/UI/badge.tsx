import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] transition-colors',
  {
    variants: {
      variant: {
        default:
          'border-violet-400/20 bg-violet-400/10 text-violet-200',
        secondary:
          'border-white/10 bg-white/5 text-zinc-300',
        success:
          'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
        outline:
          'border-white/15 bg-transparent text-zinc-300',
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
