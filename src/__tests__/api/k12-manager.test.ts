const mockTeacherFindFirst = jest.fn();
const mockStudentFindMany = jest.fn();
const mockStudentUpdateMany = jest.fn();
const mockSubjectUpsert = jest.fn();
const mockRequireLmsRole = jest.fn();
const mockRevalidatePath = jest.fn();

const mockTransaction = {
  subject: { upsert: mockSubjectUpsert },
  user: {
    findFirst: mockTeacherFindFirst,
    findMany: mockStudentFindMany,
    updateMany: mockStudentUpdateMany,
  },
};

const mockPrismaTransaction = jest.fn(
  async (operation: (transaction: typeof mockTransaction) => unknown) =>
    operation(mockTransaction),
);

class MockLmsAuthError extends Error {
  constructor(message: string, public readonly status = 401) {
    super(message);
  }
}

jest.mock('server-only', () => ({}));

jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({ $transaction: mockPrismaTransaction }),
}));

jest.mock('@/lib/lms/auth', () => ({
  LmsAuthError: MockLmsAuthError,
  requireLmsRole: mockRequireLmsRole,
}));

jest.mock('next/cache', () => ({
  revalidatePath: mockRevalidatePath,
}));

import { PUT as assignSubjectTeacher } from '@/app/api/admin/k12/subjects/route';
import {
  bulkAssignStudentGrade,
  K12_CORE_SUBJECTS,
  K12_GRADES,
  readBulkGradeAssignment,
  readSubjectAssignment,
  upsertCoreSubjectAssignment,
} from '@/lib/lms/k12';

describe('K-12 manager invariants', () => {
  beforeEach(() => {
    mockRequireLmsRole.mockResolvedValue({
      id: 'admin_1',
      role: 'ADMIN',
    });
  });

  it('defines twelve grades with exactly four core subject slots', () => {
    expect(K12_GRADES).toHaveLength(12);
    expect(new Set(K12_GRADES).size).toBe(12);
    expect(K12_CORE_SUBJECTS).toEqual([
      'Mathematics',
      'English',
      'Science',
      'Arabic',
    ]);
  });

  it('rejects arbitrary subjects and invalid grades', () => {
    expect(() =>
      readSubjectAssignment({
        grade: 'COLLEGE',
        subjectName: 'Robotics',
        teacherId: 'teacher_1',
      }),
    ).toThrow('Choose a valid grade, core subject, and teacher.');
  });

  it('only upserts a subject for an active TEACHER account', async () => {
    mockTeacherFindFirst.mockResolvedValue({ id: 'teacher_1' });
    mockSubjectUpsert.mockResolvedValue({
      grade: 'GRADE_4',
      id: 'subject_1',
      name: 'Mathematics',
      teacherId: 'teacher_1',
    });

    await upsertCoreSubjectAssignment(
      readSubjectAssignment({
        grade: 'GRADE_4',
        subjectName: 'Mathematics',
        teacherId: 'teacher_1',
      }),
    );

    expect(mockTeacherFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'teacher_1',
          role: 'TEACHER',
          status: 'ACTIVE',
        },
      }),
    );
    expect(mockSubjectUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          grade_name: { grade: 'GRADE_4', name: 'Mathematics' },
        },
        update: { teacherId: 'teacher_1' },
      }),
    );
  });

  it('rejects a subject assignment when the account is not an active teacher', async () => {
    mockTeacherFindFirst.mockResolvedValue(null);

    await expect(
      upsertCoreSubjectAssignment(
        readSubjectAssignment({
          grade: 'GRADE_2',
          subjectName: 'Science',
          teacherId: 'support_1',
        }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockSubjectUpsert).not.toHaveBeenCalled();
  });

  it('updates grades only when every target has the STUDENT role', async () => {
    mockStudentFindMany.mockResolvedValue([
      { id: 'student_1', role: 'STUDENT' },
      { id: 'support_1', role: 'SUPPORT' },
    ]);

    await expect(
      bulkAssignStudentGrade(
        readBulkGradeAssignment({
          grade: 'GRADE_7',
          studentIds: ['student_1', 'support_1'],
        }),
      ),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockStudentUpdateMany).not.toHaveBeenCalled();
  });

  it('deduplicates student ids and preserves the STUDENT filter on update', async () => {
    mockStudentFindMany.mockResolvedValue([
      { id: 'student_1', role: 'STUDENT' },
      { id: 'student_2', role: 'STUDENT' },
    ]);
    mockStudentUpdateMany.mockResolvedValue({ count: 2 });
    const input = readBulkGradeAssignment({
      grade: 'GRADE_9',
      studentIds: ['student_1', 'student_1', 'student_2'],
    });

    const result = await bulkAssignStudentGrade(input);

    expect(result.updatedCount).toBe(2);
    expect(mockStudentUpdateMany).toHaveBeenCalledWith({
      data: { gradeLevel: 'GRADE_9' },
      where: {
        id: { in: ['student_1', 'student_2'] },
        role: 'STUDENT',
      },
    });
  });

  it('rejects cross-origin subject mutations before checking authorization', async () => {
    const response = await assignSubjectTeacher(
      new Request('https://academy.test/api/admin/k12/subjects', {
        body: JSON.stringify({
          grade: 'GRADE_1',
          subjectName: 'English',
          teacherId: 'teacher_1',
        }),
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://attacker.test',
        },
        method: 'PUT',
      }),
    );

    expect(response.status).toBe(403);
    expect(mockRequireLmsRole).not.toHaveBeenCalled();
  });

  it('requires ADMIN or SUPER_ADMIN for a same-origin subject mutation', async () => {
    mockTeacherFindFirst.mockResolvedValue({ id: 'teacher_1' });
    mockSubjectUpsert.mockResolvedValue({
      grade: 'GRADE_1',
      id: 'subject_1',
      name: 'English',
      teacherId: 'teacher_1',
    });

    const response = await assignSubjectTeacher(
      new Request('https://academy.test/api/admin/k12/subjects', {
        body: JSON.stringify({
          grade: 'GRADE_1',
          subjectName: 'English',
          teacherId: 'teacher_1',
        }),
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://academy.test',
        },
        method: 'PUT',
      }),
    );

    expect(response.status).toBe(200);
    expect(mockRequireLmsRole).toHaveBeenCalledWith([
      'SUPER_ADMIN',
      'ADMIN',
    ]);
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/k12');
  });
});
