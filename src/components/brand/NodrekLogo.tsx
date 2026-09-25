import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

interface NodrekLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
}

const emblemSizes = { sm: 40, md: 48, lg: 128 } as const;

export function NodrekLogo({
  className,
  size = 'md',
  showWordmark = false,
}: NodrekLogoProps) {
  const emblemSize = emblemSizes[size];

  return (
    <Link
      aria-label={`${siteConfig.name} Home`}
      className={cn(
        'nodrek-logo-link group flex w-fit min-h-11 min-w-11 shrink-0 items-center gap-2 rounded-xl outline-none transform-gpu transition-transform duration-300 hover:-translate-y-0.5 hover:scale-[1.02] focus-visible:ring-4 focus-visible:ring-brand-gold/30',
        className,
      )}
      href={siteConfig.routes.home}
    >
      <span className="relative isolate block shrink-0" style={{ height: emblemSize, width: emblemSize }}>
        <span
          aria-hidden="true"
          className="animate-star-glow pointer-events-none absolute left-[66%] top-[12%] size-[24%] rounded-full bg-brand-gold/60 blur-md"
        />
        <Image
          alt=""
          aria-hidden="true"
          className="animate-nodrek-float relative block size-full object-contain transform-gpu transition-[filter] duration-300 group-hover:brightness-105"
          height={512}
          loading="eager"
          sizes={`${emblemSize}px`}
          src={siteConfig.brand.logo}
          width={512}
        />
      </span>
      {showWordmark ? (
        <span className="hidden min-w-0 leading-tight min-[420px]:block">
          <span className="block text-sm font-black text-brand-base">{siteConfig.name}</span>
          <span className="block font-arabic text-[11px] font-bold text-brand-base" dir="rtl" lang="ar">
            {siteConfig.arabicName}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
