import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

interface NodrekLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'onDark';
}

const logoHeights = { sm: 'size-9 sm:size-10', md: 'size-9 sm:size-10', lg: 'size-12 sm:size-14' } as const;

export function NodrekLogo({
  className,
  size = 'md',
  tone = 'default',
}: NodrekLogoProps) {
  const onDark = tone === 'onDark';

  return (
    <Link
      aria-label={`${siteConfig.name} Home`}
      className={cn(
        'group inline-flex min-h-11 shrink-0 items-center gap-2.5 outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/30',
        className,
      )}
      href={siteConfig.routes.home}
    >
      {/* Mint plate on dark surfaces so the opaque logo image does not show as a mismatched box. */}
      <span className={cn(onDark && 'shrink-0 rounded-2xl bg-brand-mint-light p-1')}>
        <span className={cn('relative block shrink-0 overflow-hidden rounded-full shadow-sm ring-1 ring-brand-gold/40 transition-transform duration-300 group-hover:rotate-2', logoHeights[size])}>
          <Image alt={siteConfig.name} className="object-cover w-full h-full" fill preload sizes="56px" src={siteConfig.brand.logo} />
        </span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="flex items-center gap-1.5">
          <span className={cn('text-lg font-extrabold tracking-tight sm:text-xl', onDark ? 'text-brand-ivory' : 'text-brand-base')}>NUDREK</span>
          <span className={cn('font-arabic text-base font-bold sm:text-lg', onDark ? 'text-brand-gold' : 'text-brand-base')} dir="rtl">نُدرك</span>
        </span>
        <span className={cn('text-[10px] font-medium tracking-wide sm:text-[11px]', onDark ? 'text-brand-sage' : 'text-brand-surface/75')}>Learning Hub</span>
      </span>
    </Link>
  );
}
