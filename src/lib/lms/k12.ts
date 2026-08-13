import 'server-only';

import type { GradeLevel } from '@prisma/client';
import { getPrisma } from '@/lib/prisma';

export const K12_GRADES = [
  'GRADE_1',
  'GRADE_2',
  'GRADE_3',
  'GRADE_4',
  'GRADE_5',
  'GRADE_6',
  'GRADE_7',
  'GRADE_8',
  'GRADE_9',
  'GRADE_10',
  'GRADE_11',
  'GRADE_12',
] as const satisfies readonly GradeLevel[];

export const K12_CORE_SUBJECTS = [
  'Mathematics',
  'English',
  'Science',
  'Arabic',
] as const;

export type K12CoreSubjectName = (typeof K12_CORE_SUBJECTS)[number];

export class K12Error extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function isSafeIdentifier(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 1 &&
    value.length <= 128 &&
    /^[A-Za-z0-9_-]+$/.test(value)
  );
}

export function isGradeLevel(value: unknown): value is GradeLevel {
  return (
    typeof value === 'string' &&
    K12_GRADES.includes(value as GradeLevel)
  );
}

export function isK12CoreSubjectName(
  value: unknown,
): value is K12CoreSubjectName {
  return (
    typeof value === 'string' &&
    K12_CORE_SUBJECTS.includes(value as K12CoreSubjectName)
  );
}

export function gradeLabel(grade: GradeLevel) {
  return `Grade ${grade.replace('GRADE_', '')}`;
}

export function readSubjectAssignment(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new K12Error('A grade, core subject, and teacher are required.');
  }

  const grade = Reflect.get(value, 'grade');
  const subjectName = Reflect.get(value, 'subjectName');
  const teacherId = Reflect.get(value, 'teacherId');

  if (
    !isGradeLevel(grade) ||
    !isK12CoreSubjectName(subjectName) ||
    !isSafeIdentifier(teacherId)
  ) {
    throw new K12Error('Choose a valid grade, core subject, and teacher.');
  }

  return { grade, subjectName, teacherId };
}

export function readBulkGradeAssignment(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new K12Error('A grade and at least one student are required.');
  }

  const grade = Reflect.get(value, 'grade');
  const rawStudentIds = Reflect.get(value, 'studentIds');

  if (!isGradeLevel(grade) || !Array.isArray(rawStudentIds)) {
    throw new K12Error('Choose a valid grade and student list.');
  }

  const studentIds = [...new Set(rawStudentIds)];

  if (
    studentIds.length < 1 ||
    studentIds.length > 500 ||
    !studentIds.every(isSafeIdentifier)
  ) {
    throw new K12Error(
      'Choose between 1 and 500 valid student accounts.',
    );
  }

  return { grade, studentIds };
}

export async function getK12ManagerData() {
  const prisma = getPrisma();
  const [subjects, teachers, students] = await Promise.all([
    prisma.subject.findMany({
      where: { name: { in: [...K12_CORE_SUBJECTS] } },
      select: {
        grade: true,
        id: true,
        name: true,
        teacherId: true,
      },
    }),
    prisma.user.findMany({
      where: { role: 'TEACHER', status: 'ACTIVE' },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: { id: true, name: true },
    }),
    prisma.user.findMany({
      where: { role: 'STUDENT', status: 'ACTIVE' },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      select: {
        _count: { select: { enrollments: true } },
        gradeLevel: true,
        id: true,
        name: true,
        phoneNumber: true,
      },
    }),
  ]);

  const subjectsBySlot = new Map(
    subjects.map((subject) => [
      `${subject.grade}:${subject.name}`,
      subject,
    ]),
  );

  return {
    grades: K12_GRADES.map((grade) => ({
      grade,
      label: gradeLabel(grade),
      subjects: K12_CORE_SUBJECTS.map((name) => {
        const subject = subjectsBySlot.get(`${grade}:${name}`);

        return {
          id: subject?.id ?? null,
          name,
          teacherId: subject?.teacherId ?? null,
        };
      }),
    })),
    students: students.map((student) => ({
      enrolledCourses: student._count.enrollments,
      gradeLevel: student.gradeLevel,
      id: student.id,
      name: student.name,
      phoneNumber: student.phoneNumber,
    })),
    teachers,
  };
}

export async function upsertCoreSubjectAssignment(
  input: ReturnType<typeof readSubjectAssignment>,
) {
  return getPrisma().$transaction(async (transaction) => {
    const teacher = await transaction.user.findFirst({
      where: {
        id: input.teacherId,
        role: 'TEACHER',
        status: 'ACTIVE',
      },
      select: { id: true },
    });

    if (!teacher) {
      throw new K12Error(
        'The selected account is not an active teacher.',
        409,
      );
    }

    return transaction.subject.upsert({
      where: {
        grade_name: {
          grade: input.grade,
          name: input.subjectName,
        },
      },
      create: {
        grade: input.grade,
        name: input.subjectName,
        teacherId: teacher.id,
      },
      update: { teacherId: teacher.id },
      select: {
        grade: true,
        id: true,
        name: true,
        teacherId: true,
      },
    });
  });
}

export async function bulkAssignStudentGrade(
  input: ReturnType<typeof readBulkGradeAssignment>,
) {
  return getPrisma().$transaction(async (transaction) => {
    const students = await transaction.user.findMany({
      where: { id: { in: input.studentIds } },
      select: { id: true, role: true },
    });

    if (
      students.length !== input.studentIds.length ||
      students.some((student) => student.role !== 'STUDENT')
    ) {
      throw new K12Error(
        'Every selected account must be an existing student.',
        409,
      );
    }

    const result = await transaction.user.updateMany({
      where: {
        id: { in: input.studentIds },
        role: 'STUDENT',
      },
      data: { gradeLevel: input.grade },
    });

    if (result.count !== input.studentIds.length) {
      throw new K12Error(
        'One or more accounts changed while the update was running.',
        409,
      );
    }

    return {
      grade: input.grade,
      studentIds: input.studentIds,
      updatedCount: result.count,
    };
  });
}
