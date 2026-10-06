import Image from 'next/image';
import { siteConfig } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

interface NodrekEmblemProps {
  className?: string;
  decorative?: boolean;
  preload?: boolean;
  sizes?: string;
}

export function NodrekEmblem({
  className,
  decorative = false,
  preload = false,
  sizes = '40px',
}: NodrekEmblemProps) {
  return (
    <span className={cn('relative block size-10 shrink-0', className, 'rounded-full overflow-hidden ring-1 ring-brand-gold/40 shadow-sm')}>
      <Image
        alt={decorative ? '' : siteConfig.name}
        aria-hidden={decorative || undefined}
        className="object-cover w-full h-full"
        height={512}
        preload={preload}
        sizes={sizes}
        src={siteConfig.brand.logo}
        width={512}
      />
    </span>
  );
}

interface NodrekWordmarkProps {
  className?: string;
  compact?: boolean;
}

export function NodrekWordmark({
  className,
  compact = false,
}: NodrekWordmarkProps) {
  return (
    <span className={cn('min-w-0', className)}>
      <span className="block text-sm font-extrabold leading-tight tracking-tight text-brand-base">
        {siteConfig.name}
      </span>
      {compact ? null : (
        <span
          className="mt-0.5 block text-[10px] font-semibold leading-relaxed text-brand-base"
          dir="rtl"
          lang="ar"
        >
          {siteConfig.arabicName}
        </span>
      )}
    </span>
  );
}
