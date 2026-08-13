const mockRequireApiAuth = jest.fn();
const mockSubjectCreate = jest.fn();
const mockSubjectFindFirst = jest.fn();
const mockCourseCreate = jest.fn();
const mockVerifyOtp = jest.fn();
const mockUserUpdate = jest.fn();
const mockAdminUpdateUserById = jest.fn();

jest.mock('server-only', () => ({}));
jest.mock('nanoid', () => ({ nanoid: () => 'abc123' }));
jest.mock('@/lib/auth-guard', () => ({ requireApiAuth: mockRequireApiAuth }));
jest.mock('@/lib/lms/curriculum-owner', () => ({
  resolveCurriculumTeacherId: async () => 'teacher-profile-1',
}));
jest.mock('@/lib/http/same-origin', () => ({ isSameOriginRequest: () => true }));
jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    course: { create: mockCourseCreate },
    subject: { create: mockSubjectCreate, findFirst: mockSubjectFindFirst },
    user: { update: mockUserUpdate },
  }),
}));
jest.mock('@/lib/supabase/ssr-server', () => ({
  createSupabaseServerClient: async () => ({
    auth: { verifyOtp: mockVerifyOtp },
  }),
}));
jest.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdminClient: () => ({
    auth: { admin: { updateUserById: mockAdminUpdateUserById } },
  }),
}));

import { POST as createSubject } from '@/app/api/subjects/route';
import { POST as createCourse } from '@/app/api/courses/route';
import { PATCH as manualVerifyPhone, POST as verifyPhoneOtp } from '@/app/api/auth/phone/route';

function jsonRequest(path: string, body: Record<string, unknown>, method = 'POST') {
  return new Request(`https://www.edu-platform.me${path}`, {
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', Origin: 'https://www.edu-platform.me' },
    method,
  });
}

describe('critical admin operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireApiAuth.mockResolvedValue({
      ok: true,
      profile: {
        id: 'admin-profile-1',
        phoneNumber: '+201025272693',
        role: 'SUPER_ADMIN',
      },
      user: { id: 'supabase-admin-1' },
    });
  });

  it('creates a subject from name and gradeLevel', async () => {
    mockSubjectCreate.mockResolvedValue({
      grade: 'GRADE_5',
      id: 'subject-1',
      name: 'Mathematics',
      teacherId: 'admin-profile-1',
    });
    const response = await createSubject(
      jsonRequest('/api/subjects', {
        gradeLevel: 'GRADE_5',
        name: 'Mathematics',
      }),
    );

    expect(response.status).toBe(201);
    expect(mockSubjectCreate).toHaveBeenCalledWith({
      data: {
        grade: 'GRADE_5',
        name: 'Mathematics',
        teacherId: 'teacher-profile-1',
      },
    });
  });

  it('creates a course attached to the selected subject', async () => {
    mockSubjectFindFirst.mockResolvedValue({ grade: 'GRADE_5' });
    mockCourseCreate.mockImplementation(async ({ data }) => ({ id: 'course-1', ...data }));
    const response = await createCourse(
      jsonRequest('/api/courses', {
        description: 'Core mathematics',
        gradeLevel: 'GRADE_5',
        subjectId: 'subject-1',
        title: 'Grade 5 Mathematics',
      }),
    );

    expect(response.status).toBe(201);
    expect(mockCourseCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        gradeLevel: 'GRADE_5',
        subjectId: 'subject-1',
        teacherId: 'teacher-profile-1',
        title: 'Grade 5 Mathematics',
      }),
    });
  });

  it('verifies a phone OTP and synchronizes PostgreSQL phoneVerified', async () => {
    mockVerifyOtp.mockResolvedValue({
      data: {
        user: {
          id: 'supabase-admin-1',
          phone: '+201025272693',
          phone_confirmed_at: '2026-08-13T10:00:00.000Z',
        },
      },
      error: null,
    });
    mockUserUpdate.mockResolvedValue({
      id: 'admin-profile-1',
      phoneNumber: '+201025272693',
      phoneVerified: true,
    });
    const response = await verifyPhoneOtp(
      jsonRequest('/api/auth/phone', {
        phone: '+20 102 527 2693',
        token: '123456',
      }),
    );

    expect(response.status).toBe(200);
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      phone: '+201025272693',
      token: '123456',
      type: 'sms',
    });
    expect(mockUserUpdate).toHaveBeenCalledWith({
      data: { phoneNumber: '+201025272693', phoneVerified: true },
      select: { id: true, phoneNumber: true, phoneVerified: true },
      where: { supabaseId: 'supabase-admin-1' },
    });
  });

  it('allows a super admin to manually confirm the saved phone', async () => {
    mockAdminUpdateUserById.mockResolvedValue({
      data: {
        user: { phone_confirmed_at: '2026-08-13T10:00:00.000Z' },
      },
      error: null,
    });
    mockUserUpdate.mockResolvedValue({ phoneVerified: true });
    const response = await manualVerifyPhone(
      jsonRequest('/api/auth/phone', {}, 'PATCH'),
    );

    expect(response.status).toBe(200);
    expect(mockAdminUpdateUserById).toHaveBeenCalledWith(
      'supabase-admin-1',
      { phone: '+201025272693', phone_confirm: true },
    );
  });
});
