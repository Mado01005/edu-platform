import {
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'EG';

export function normalizePhoneNumber(
  value: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
) {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = parsePhoneNumberFromString(normalized, defaultCountry);
  if (!parsed || !parsed.isValid()) return null;

  return parsed.number;
}

export function isValidE164PhoneNumber(value: string) {
  return /^\+[1-9]\d{7,14}$/.test(value) && isValidPhoneNumber(value);
}
