import { cn } from '@/lib/utils';

interface OqoolEmblemProps {
  className?: string;
  decorative?: boolean;
}

export function OqoolEmblem({
  className,
  decorative = false,
}: OqoolEmblemProps) {
  return (
    <svg
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : 'Oqool Academy emblem'}
      className={cn('size-10 shrink-0', className)}
      fill="none"
      role={decorative ? undefined : 'img'}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect fill="#084B2B" height="48" rx="14" width="48" />
      <path
        d="M13 16.75c4.68 0 8.33 1.08 11 3.25 2.67-2.17 6.32-3.25 11-3.25v16c-4.48 0-8.15 1.08-11 3.25-2.85-2.17-6.52-3.25-11-3.25v-16Z"
        fill="#FDF8E8"
        stroke="#D4AF37"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
      <path d="M24 20v16" stroke="#D4AF37" strokeWidth="1.75" />
      <path
        d="M17.5 13.5c1.8-2 3.97-3 6.5-3s4.7 1 6.5 3"
        stroke="#D4AF37"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <circle cx="24" cy="11" fill="#D4AF37" r="2" />
    </svg>
  );
}

interface OqoolWordmarkProps {
  className?: string;
  compact?: boolean;
}

export function OqoolWordmark({
  className,
  compact = false,
}: OqoolWordmarkProps) {
  return (
    <span className={cn('min-w-0', className)}>
      <span className="block truncate whitespace-nowrap text-base font-extrabold tracking-tight text-brand-700">
        Oqool Academy
      </span>
      {compact ? null : (
        <span
          className="mt-0.5 block truncate whitespace-nowrap text-[10px] font-semibold tracking-wide text-[#8C6B1B]"
          dir="rtl"
          lang="ar"
        >
          أكاديمية عقول
        </span>
      )}
    </span>
  );
}
