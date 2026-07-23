// C9: Admin emails moved to environment variable to avoid leaking privileged accounts in source code.
// Set ADMIN_EMAILS as a comma-separated list in .env, e.g.: ADMIN_EMAILS=admin1@example.com,admin2@example.com
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
export const ADMIN_EMAIL = ADMIN_EMAILS[0] || '';

export const isMasterAdmin = (email?: string | null) => {
  if (!email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase().trim() === email.toLowerCase().trim());
};
