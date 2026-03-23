export const ADMIN_EMAILS = ['abdallahsaad2150@gmail.com', 'abdallahsaad828asd@gmail.com'];
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

export const isMasterAdmin = (email?: string | null) => {
  if (!email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase().trim() === email.toLowerCase().trim());
};
