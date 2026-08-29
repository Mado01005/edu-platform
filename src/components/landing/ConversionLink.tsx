'use client';

import Link from 'next/link';
import type { MouseEvent, ReactNode } from 'react';
import {
  currentUtmAttribution,
  trackLandingEvent,
} from '@/lib/landing/analytics';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { useLanguage } from '@/components/i18n/language-provider';
import type { LandingEventName } from '@/lib/landing/types';
import type { LocalizedText } from '@/lib/landing/types';
import { getWhatsAppUrl, type WhatsAppIntent } from '@/lib/siteConfig';

type ConversionLinkProps = {
  children: ReactNode;
  className: string;
  eventName: LandingEventName;
  href: string;
  label?: string;
  newTab?: boolean;
  whatsapp?: boolean;
};

export function ConversionLink({
  children,
  className,
  eventName,
  href,
  label,
  newTab = false,
  whatsapp = false,
}: ConversionLinkProps) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    trackLandingEvent(eventName, label ? { label } : {});
    if (whatsapp && eventName !== 'whatsapp_click') {
      trackLandingEvent('whatsapp_click', { placement: label ?? eventName });
    }

    const attribution = currentUtmAttribution();
    if (!whatsapp || !attribution) return;

    event.preventDefault();
    const url = new URL(href);
    const message = url.searchParams.get('text') ?? '';
    url.searchParams.set('text', `${message}\n\nCampaign: ${attribution}`);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  };

  if (href.startsWith('/')) {
    return (
      <Link className={className} href={href} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <a
      className={className}
      href={href}
      onClick={handleClick}
      rel={newTab ? 'noopener noreferrer' : undefined}
      target={newTab ? '_blank' : undefined}
    >
      {children}
    </a>
  );
}

export function WhatsAppLink({
  before,
  children,
  className,
  eventName,
  intent,
  label,
}: {
  before?: ReactNode;
  children: LocalizedText;
  className: string;
  eventName: LandingEventName;
  intent: WhatsAppIntent;
  label: string;
}) {
  const { locale } = useLanguage();

  return (
    <ConversionLink
      className={className}
      eventName={eventName}
      href={getWhatsAppUrl(intent, locale)}
      label={label}
      newTab
      whatsapp
    >
      {before}
      {children.en === children.ar ? children.en : <LandingCopy>{children}</LandingCopy>}
    </ConversionLink>
  );
}
