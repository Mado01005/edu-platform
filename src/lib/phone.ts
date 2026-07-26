import {
  getCountryCallingCode,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js/min';

export const DEFAULT_PHONE_COUNTRY: CountryCode = 'EG';

export function normalizePartialPhoneNumber(
  value: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
) {
  const normalized = value.trim();
  if (!normalized) return '';

  const parsed = parsePhoneNumberFromString(normalized, defaultCountry);
  if (parsed) return parsed.number;

  // Remove the national trunk prefix before combining a country calling code.
  // For example, Egypt +20 with 01025272693 becomes +201025272693.
  const nationalDigits = normalized.replace(/\D/g, '').replace(/^0+/, '');
  return nationalDigits
    ? `+${getCountryCallingCode(defaultCountry)}${nationalDigits}`
    : '';
}

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
