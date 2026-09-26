import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

interface NodrekLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const logoHeights = { sm: 'h-9 sm:h-10', md: 'h-10 sm:h-12', lg: 'h-14 sm:h-16' } as const;

export function NodrekLogo({
  className,
  size = 'md',
}: NodrekLogoProps) {
  return (
    <Link
      aria-label={`${siteConfig.name} Home`}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/30',
        className,
      )}
      href={siteConfig.routes.home}
    >
      <Image
        alt={`${siteConfig.name} - ${siteConfig.arabicName}`}
        className={cn('block w-auto max-w-full object-contain', logoHeights[size])}
        height={siteConfig.brand.officialArtworkHeight}
        loading="eager"
        src={siteConfig.brand.officialArtwork}
        unoptimized
        width={siteConfig.brand.officialArtworkWidth}
      />
    </Link>
  );
}
