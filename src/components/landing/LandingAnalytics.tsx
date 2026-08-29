'use client';

import { useEffect } from 'react';
import { trackLandingEvent } from '@/lib/landing/analytics';

export function LandingAnalytics() {
  useEffect(() => {
    trackLandingEvent('landing_view');
  }, []);

  return null;
}

