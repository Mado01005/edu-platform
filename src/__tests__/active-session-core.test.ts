import {
  ACTIVE_SESSION_COOKIE,
  hashActiveSessionToken,
  hasValidActiveSession,
} from '@/lib/lms/active-session-core';

describe('student active session validation', () => {
  it('stores and compares a one-way token hash', () => {
    const rawToken = 'browser-secret-token';
    const tokenHash = hashActiveSessionToken(rawToken);

    expect(ACTIVE_SESSION_COOKIE).toBe('active_session_id');
    expect(tokenHash).toHaveLength(64);
    expect(tokenHash).not.toBe(rawToken);
    expect(
      hasValidActiveSession(
        { activeSessionToken: tokenHash, role: 'STUDENT' },
        rawToken,
      ),
    ).toBe(true);
  });

  it('rejects a missing or replaced student device token', () => {
    const tokenHash = hashActiveSessionToken('new-device-token');

    expect(
      hasValidActiveSession(
        { activeSessionToken: tokenHash, role: 'STUDENT' },
        undefined,
      ),
    ).toBe(false);
    expect(
      hasValidActiveSession(
        { activeSessionToken: tokenHash, role: 'STUDENT' },
        'old-device-token',
      ),
    ).toBe(false);
  });

  it('does not apply the student-only blocker to staff roles', () => {
    expect(
      hasValidActiveSession(
        { activeSessionToken: null, role: 'TEACHER' },
        undefined,
      ),
    ).toBe(true);
  });
});
