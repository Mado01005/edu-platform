jest.mock('server-only', () => ({}));

import {
  calculateActivityScore,
  calculateStudentHealth,
  isHealthAtRisk,
} from '@/lib/lms/health';

describe('student health score engine', () => {
  const now = new Date('2026-08-05T12:00:00.000Z');

  it('flags every score below 70 and keeps 70 healthy', () => {
    expect(isHealthAtRisk(69.99)).toBe(true);
    expect(isHealthAtRisk(70)).toBe(false);
  });

  it('applies the 30/40/30 activity, video, and assignment weights', () => {
    const result = calculateStudentHealth({
      assignmentCompletion: 60,
      lastActiveAt: new Date('2026-07-21T12:00:00.000Z'),
      now,
      videoCompletion: 80,
    });

    expect(result.activityScore).toBe(50);
    expect(result.healthPercentage).toBe(65);
    expect(result.isAtRisk).toBe(true);
  });

  it('decays activity linearly to zero over 30 days', () => {
    expect(calculateActivityScore(now, now)).toBe(100);
    expect(
      calculateActivityScore(
        new Date('2026-07-06T12:00:00.000Z'),
        now,
      ),
    ).toBe(0);
  });
});
