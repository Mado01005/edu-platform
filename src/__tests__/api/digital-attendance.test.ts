const mockRequireLmsRole = jest.fn();
const mockRecordLiveAttendance = jest.fn();

class MockLmsAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

class MockAttendanceError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: MockLmsAuthError,
  requireLmsRole: mockRequireLmsRole,
}));
jest.mock('@/lib/lms/attendance', () => ({
  AttendanceError: MockAttendanceError,
  recordLiveAttendance: mockRecordLiveAttendance,
}));

import { POST } from '@/app/api/lms/attendance/live/route';

describe('live-class digital attendance route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireLmsRole.mockResolvedValue({ id: 'student-1', role: 'STUDENT' });
    mockRecordLiveAttendance.mockResolvedValue({ meetingUrl: 'https://zoom.us/j/123' });
  });

  it('records attendance for the authenticated student before returning Zoom URL', async () => {
    const response = await POST(new Request('https://academy.test/api/lms/attendance/live', {
      body: JSON.stringify({ zoomSessionId: 'zoom-1' }),
      headers: { 'Content-Type': 'application/json', Origin: 'https://academy.test' },
      method: 'POST',
    }));

    expect(response.status).toBe(200);
    expect(mockRequireLmsRole).toHaveBeenCalledWith(['STUDENT']);
    expect(mockRecordLiveAttendance).toHaveBeenCalledWith('student-1', 'zoom-1', 'join');
    await expect(response.json()).resolves.toEqual({ meetingUrl: 'https://zoom.us/j/123' });
  });

  it('rejects cross-origin attendance writes', async () => {
    const response = await POST(new Request('https://academy.test/api/lms/attendance/live', {
      body: JSON.stringify({ zoomSessionId: 'zoom-1' }),
      headers: { 'Content-Type': 'application/json', Origin: 'https://evil.test' },
      method: 'POST',
    }));

    expect(response.status).toBe(403);
    expect(mockRecordLiveAttendance).not.toHaveBeenCalled();
  });
});
