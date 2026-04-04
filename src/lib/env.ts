/**
 * Environment variable validation for EduPortal
 * Ensures critical keys are present at startup
 */

import { logger } from './logger';

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'R2_BUCKET',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_ENDPOINT',
  'R2_PUBLIC_URL',
  'AUTH_SECRET',
  'SPOTIFY_CLIENT_ID',
  'SPOTIFY_CLIENT_SECRET'
] as const;

export function validateEnv() {
  const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]);

  if (missing.length > 0) {
    const errorMsg = `Missing critical environment variables: ${missing.join(', ')}`;
    logger.error(errorMsg, { missing });
    
    // In production, we want to know immediately if secrets are missing
    if (process.env.NODE_ENV === 'production') {
      throw new Error(errorMsg);
    }
  } else {
    logger.info('Environment validation successful');
  }
}

// Automatically validate on import if not in build environment
if (process.env.NODE_ENV !== 'test' && !process.env.NEXT_PHASE) {
  validateEnv();
}
