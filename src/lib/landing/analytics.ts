'use client';

import type { LandingEventName } from '@/lib/landing/types';

type AnalyticsValue = string | number | boolean;
type AnalyticsPayload = Readonly<Record<string, AnalyticsValue>>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (command: 'event', eventName: string, payload?: AnalyticsPayload) => void;
  }
}

export function trackLandingEvent(
  eventName: LandingEventName,
  payload: AnalyticsPayload = {},
) {
  if (typeof window === 'undefined') return;

  try {
    if (window.gtag) {
      window.gtag('event', eventName, payload);
    } else {
      window.dataLayer?.push({ event: eventName, ...payload });
    }
    window.dispatchEvent(
      new CustomEvent('oqool:analytics', { detail: { eventName, payload } }),
    );
  } catch {
    // Marketing interactions must remain functional when analytics is blocked.
  }
}

export function currentUtmAttribution() {
  if (typeof window === 'undefined') return '';

  const params = new URLSearchParams(window.location.search);
  const attribution = new URLSearchParams();
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    const value = params.get(key);
    if (value) attribution.set(key, value.slice(0, 120));
  }
  return attribution.toString();
}
