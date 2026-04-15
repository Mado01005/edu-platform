/**
 * VELOCITY PULSE LOGIC TEST
 * 
 * Tests the velocity/learning-rate calculation logic.
 * DATABASE SAFETY: Fully mocked — no production DB access.
 */

// ── Mocks ───────────────────────────────────────────────────────────────
const mockAuth = jest.fn();
jest.mock('@/auth', () => ({
  auth: mockAuth,
}));

jest.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    }),
  },
}));

// ── Velocity Calculation Pure Logic ─────────────────────────────────────

interface StudentActivity {
  email: string;
  completions: number;
  logins: number;
  totalDays: number;
  lastActiveDate: string;
}

interface VelocityResult {
  email: string;
  velocity: number;
  status: 'on-track' | 'at-risk' | 'failing';
  daysSinceActive: number;
}

function calculateVelocity(student: StudentActivity): VelocityResult {
  const daysSinceActive = Math.floor(
    (Date.now() - new Date(student.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const velocity = student.totalDays > 0 ? student.completions / student.totalDays : 0;

  let status: 'on-track' | 'at-risk' | 'failing';
  if (velocity >= 0.5 && daysSinceActive <= 3) {
    status = 'on-track';
  } else if (velocity >= 0.2 || daysSinceActive <= 7) {
    status = 'at-risk';
  } else {
    status = 'failing';
  }

  return { email: student.email, velocity, status, daysSinceActive };
}

// ── Imports (after mocks) ───────────────────────────────────────────────
import { GET as velocityGet } from '@/app/api/admin/velocity/route';

// ── Tests ───────────────────────────────────────────────────────────────

describe('📊 Velocity Pulse Logic', () => {
  
  describe('Pure velocity calculation', () => {
    it('should flag active, high-completion student as on-track', () => {
      const result = calculateVelocity({
        email: 'star@uni.edu',
        completions: 15,
        logins: 20,
        totalDays: 10,
        lastActiveDate: new Date().toISOString(),
      });
      expect(result.status).toBe('on-track');
      expect(result.velocity).toBe(1.5);
      expect(result.daysSinceActive).toBe(0);
    });

    it('should flag low-velocity student as at-risk', () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
      const result = calculateVelocity({
        email: 'mediocre@uni.edu',
        completions: 3,
        logins: 10,
        totalDays: 10,
        lastActiveDate: twoDaysAgo,
      });
      expect(result.status).toBe('at-risk');
      expect(result.velocity).toBe(0.3);
    });

    it('should flag inactive, low-completion student as failing', () => {
      const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      const result = calculateVelocity({
        email: 'ghost@uni.edu',
        completions: 1,
        logins: 2,
        totalDays: 30,
        lastActiveDate: twoWeeksAgo,
      });
      expect(result.status).toBe('failing');
      expect(result.velocity).toBeCloseTo(0.033, 2);
      expect(result.daysSinceActive).toBeGreaterThanOrEqual(13);
    });

    it('should handle zero-day edge case without division by zero', () => {
      const result = calculateVelocity({
        email: 'new@uni.edu',
        completions: 0,
        logins: 1,
        totalDays: 0,
        lastActiveDate: new Date().toISOString(),
      });
      expect(result.velocity).toBe(0);
      expect(result.status).toBe('at-risk');
    });

    it('should identify failing students from batch', () => {
      const students: StudentActivity[] = [
        { email: 'a@uni.edu', completions: 10, logins: 15, totalDays: 5, lastActiveDate: new Date().toISOString() },
        { email: 'b@uni.edu', completions: 0, logins: 1, totalDays: 20, lastActiveDate: new Date(Date.now() - 30 * 86400000).toISOString() },
        { email: 'c@uni.edu', completions: 2, logins: 5, totalDays: 10, lastActiveDate: new Date(Date.now() - 2 * 86400000).toISOString() },
      ];

      const results = students.map(calculateVelocity);
      const failing = results.filter(r => r.status === 'failing');
      const onTrack = results.filter(r => r.status === 'on-track');

      expect(failing).toHaveLength(1);
      expect(failing[0].email).toBe('b@uni.edu');
      expect(onTrack).toHaveLength(1);
      expect(onTrack[0].email).toBe('a@uni.edu');
    });
  });

  describe('Deprecated velocity API endpoint', () => {
    it('should return empty data for authenticated admin', async () => {
      mockAuth.mockResolvedValue({
        user: { email: 'admin@test.com', isAdmin: true },
      });
      const res = await velocityGet();
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data).toEqual([]);
    });

    it('should block non-admin users', async () => {
      mockAuth.mockResolvedValue({
        user: { email: 'student@test.com', isAdmin: false },
      });
      const res = await velocityGet();
      expect(res.status).toBe(401);
    });
  });
});
