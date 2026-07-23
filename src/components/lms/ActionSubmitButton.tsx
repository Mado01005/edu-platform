'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useFormStatus } from 'react-dom';

type ActionSubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingLabel?: string;
};

export function ActionSubmitButton({
  children,
  className,
  pendingLabel = 'Saving…',
  ...props
}: ActionSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      {...props}
      aria-disabled={pending}
      className={`${className ?? ''} disabled:cursor-wait disabled:opacity-60`}
      disabled={pending || props.disabled}
      type="submit"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : children}
      {pending ? pendingLabel : null}
    </button>
  );
}
