import { cairoDateTimeLocalToUtc, formatCairoDateTime, formatUtcDateTime } from '@/lib/lms/timezone';

describe('Cairo scheduling helpers', () => {
  it('converts a summer Cairo time using the EEST offset', () => {
    expect(cairoDateTimeLocalToUtc('2026-08-20T18:00')?.toISOString()).toBe('2026-08-20T15:00:00.000Z');
  });

  it('converts a winter Cairo time using the EET offset', () => {
    expect(cairoDateTimeLocalToUtc('2026-12-20T18:00')?.toISOString()).toBe('2026-12-20T16:00:00.000Z');
  });

  it('rejects invalid local date-time values and labels both zones', () => {
    expect(cairoDateTimeLocalToUtc('not-a-date')).toBeNull();
    expect(formatCairoDateTime('2026-08-20T15:00:00.000Z')).toContain('GMT+3');
    expect(formatUtcDateTime('2026-08-20T15:00:00.000Z')).toContain('UTC');
  });
});
