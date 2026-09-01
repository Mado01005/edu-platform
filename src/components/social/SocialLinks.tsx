import type { SocialIconName } from '@/config/socials';
import { SOCIAL_LINKS } from '@/config/socials';
import { cn } from '@/lib/utils';

type SocialLinksProps = Readonly<{
  className?: string;
}>;

type SocialIconProps = Readonly<{
  icon: SocialIconName;
}>;

function SocialIcon({ icon }: SocialIconProps) {
  if (icon === 'tiktok') {
    return (
      <svg aria-hidden="true" className="size-[1.05rem]" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.72-.02-.5-.03-1-.01-1.49.18-1.9 1.17-3.72 2.69-4.96 1.73-1.42 4.15-2.1 6.45-1.66.02 1.48-.04 2.96-.04 4.44-1.05-.34-2.28-.25-3.2.4-.66.43-1.16 1.09-1.42 1.83-.22.53-.16 1.11-.15 1.67.25 1.7 1.89 3.13 3.63 2.97 1.16-.01 2.27-.69 2.87-1.68.2-.35.42-.71.43-1.13.1-1.91.06-3.81.07-5.72.01-4.31-.01-8.62.02-12.93Z" />
      </svg>
    );
  }

  if (icon === 'snapchat') {
    return (
      <svg aria-hidden="true" className="size-[1.15rem]" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 2.5c-3 0-5 2.2-5 5.3V11c0 .8-.7 1.4-1.5 1.5l-1 .2c-.5.1-.7.8-.2 1.1L6.4 15c.4.2.6.6.6 1.1v.7c0 .5.4.9.9.9h1.4c.5 0 .9.2 1.3.5l.8.6c.4.3.9.3 1.3 0l.8-.6c.4-.3.8-.5 1.3-.5h1.4c.5 0 .9-.4.9-.9v-.7c0-.5.2-.9.6-1.1l2.1-1.2c.5-.3.3-1-.2-1.1l-1-.2c-.8-.1-1.5-.7-1.5-1.5V7.8c0-3.1-2.1-5.3-5.1-5.3Z"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (icon === 'x') {
    return (
      <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.451-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" className="size-[1.05rem]" fill="currentColor" viewBox="0 0 24 24">
      <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.414c0-3.025 1.79-4.697 4.533-4.697 1.313 0 2.686.236 2.686.236v2.972h-1.513c-1.49 0-1.956.931-1.956 1.887v2.261h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073Z" />
    </svg>
  );
}

export function SocialLinks({ className }: SocialLinksProps) {
  return (
    <ul aria-label="Oqool Academy social media" className={cn('flex flex-wrap items-center gap-3', className)}>
      {SOCIAL_LINKS.map((social) => (
        <li className="flex" key={social.name}>
          <a
            aria-label={social.ariaLabel}
            className="relative flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/20 bg-emerald-900/60 text-white/80 transition-all duration-200 before:absolute before:-inset-1 before:content-[''] hover:scale-105 hover:border-[#D4A345]/50 hover:text-[#D4A345] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#D4A345]/30"
            href={social.url}
            rel="noopener noreferrer"
            target="_blank"
            title={social.name}
          >
            <SocialIcon icon={social.icon} />
          </a>
        </li>
      ))}
    </ul>
  );
}
