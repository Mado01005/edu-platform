import type { ElementType, ReactNode } from 'react';
import type { LocalizedText } from '@/lib/landing/types';

export function LandingCopy({
  as: Component = 'span',
  children,
  className,
}: {
  as?: ElementType;
  children: LocalizedText;
  className?: string;
}) {
  return (
    <>
      <Component className={className} data-language-copy="en" dir="ltr" lang="en">
        {children.en}
      </Component>
      <Component className={className} data-language-copy="ar" dir="rtl" lang="ar">
        {children.ar}
      </Component>
    </>
  );
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

