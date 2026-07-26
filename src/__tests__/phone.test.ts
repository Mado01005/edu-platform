import {
  isValidE164PhoneNumber,
  normalizePartialPhoneNumber,
  normalizePhoneNumber,
} from '@/lib/phone';

describe('phone normalization', () => {
  test.each([
    ['01012345678', 'EG', '+201012345678'],
    ['01025272693', 'EG', '+201025272693'],
    ['06 12 34 56 78', 'FR', '+33612345678'],
    ['050 123 4567', 'AE', '+971501234567'],
    ['202-555-0123', 'US', '+12025550123'],
  ] as const)(
    'normalizes %s from %s into E.164',
    (input, country, expected) => {
      expect(normalizePhoneNumber(input, country)).toBe(expected);
      expect(isValidE164PhoneNumber(expected)).toBe(true);
    },
  );

  test('strips the Egypt national trunk prefix before emitting input state', () => {
    expect(normalizePartialPhoneNumber('01025272693', 'EG')).toBe(
      '+201025272693',
    );
  });

  test.each(['', '123', '+00012345678', 'not-a-number'])(
    'rejects invalid value %s',
    (input) => {
      expect(normalizePhoneNumber(input)).toBeNull();
    },
  );
});
