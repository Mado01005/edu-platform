import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 disabled:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#084B2B] focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-[#084B2B] text-white hover:bg-[#063B22]',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        outline: 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#084B2B]',
        ghost: 'bg-transparent text-slate-600 shadow-none hover:bg-slate-100 hover:text-slate-900',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
      },
      size: {
        default: 'h-11 px-4 py-2',
        sm: 'h-9 px-3',
        lg: 'h-12 px-6',
        icon: 'size-10 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      data-slot="button"
      type={type}
      {...props}
    />
  );
}

export { Button, buttonVariants };
