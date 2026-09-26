import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

interface NodrekLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const logoHeights = { sm: 'size-9 sm:size-10', md: 'size-9 sm:size-10', lg: 'size-12 sm:size-14' } as const;

export function NodrekLogo({
  className,
  size = 'md',
}: NodrekLogoProps) {
  return (
    <Link
      aria-label={`${siteConfig.name} Home`}
      className={cn(
        'group inline-flex min-h-11 shrink-0 items-center gap-2.5 outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/30',
        className,
      )}
      href={siteConfig.routes.home}
    >
      <span className={cn('relative shrink-0', logoHeights[size])}>
        <Image alt="Nodrek Emblem" className="object-contain" fill preload sizes="56px" src={siteConfig.brand.logo} />
      </span>
      <span className="flex flex-col leading-none">
        <span className="flex items-center gap-1.5">
          <span className="text-lg font-extrabold tracking-tight text-brand-base sm:text-xl">NODREK</span>
          <span className="font-arabic text-base font-bold text-brand-base sm:text-lg" dir="rtl">نُدرك</span>
        </span>
        <span className="text-[10px] font-medium tracking-wide text-brand-surface/75 sm:text-[11px]">Learning Hub</span>
      </span>
    </Link>
  );
}
