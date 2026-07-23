import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-black transition disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400',
  {
    variants: {
      variant: {
        default: 'bg-violet-400 text-black hover:bg-violet-300',
        secondary: 'bg-white text-black hover:bg-zinc-200',
        outline: 'border border-white/10 bg-transparent text-white hover:bg-white/5',
        ghost: 'bg-transparent text-zinc-300 hover:bg-white/5 hover:text-white',
        destructive: 'bg-red-500 text-white hover:bg-red-400',
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
