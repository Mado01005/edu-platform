import Image from 'next/image';
import Link from 'next/link';
import { siteConfig } from '@/lib/siteConfig';
import { cn } from '@/lib/utils';

interface NodrekLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const logoWidths = { sm: 'w-24 sm:w-28', md: 'w-28 sm:w-32', lg: 'w-40 sm:w-52' } as const;

export function NodrekLogo({
  className,
  size = 'md',
}: NodrekLogoProps) {
  return (
    <Link
      aria-label={`${siteConfig.name} Home`}
      className={cn(
        'inline-flex min-h-11 shrink-0 items-center outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/30',
        logoWidths[size],
        className,
      )}
      href={siteConfig.routes.home}
    >
      <Image
        alt={`${siteConfig.name} - ${siteConfig.arabicName}`}
        className="block h-auto w-full max-w-full object-contain"
        height={siteConfig.brand.officialArtworkHeight}
        loading="eager"
        src={siteConfig.brand.officialArtwork}
        unoptimized
        width={siteConfig.brand.officialArtworkWidth}
      />
    </Link>
  );
}
