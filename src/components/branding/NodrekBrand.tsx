import Image from 'next/image';
import { siteConfig } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

interface NodrekEmblemProps {
  className?: string;
  decorative?: boolean;
}

export function NodrekEmblem({
  className,
  decorative = false,
}: NodrekEmblemProps) {
  return (
    <Image
      alt={decorative ? '' : `${siteConfig.name} emblem`}
      aria-hidden={decorative || undefined}
      className={cn('size-10 shrink-0 object-contain', className)}
      height={64}
      src={siteConfig.brand.logo}
      width={64}
    />
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
