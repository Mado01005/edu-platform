import type { Role } from '@prisma/client';
import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { getLmsUser } from '@/lib/lms/auth';
import { isAdminRole } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type SearchResult = {
  description: string;
  href: string;
  id: string;
  label: string;
  type: 'course' | 'lesson' | 'student';
};

function json(results: SearchResult[], status = 200) {
  return NextResponse.json(
    { results },
    {
      headers: {
        'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      },
      status,
    },
  );
}

export async function GET(request: Request) {
  const [lmsUser, legacySession] = await Promise.all([getLmsUser(), auth()]);
  const legacyAdmin = Boolean(legacySession?.user?.isAdmin);
  if (!lmsUser && !legacyAdmin) return json([], 401);

  const url = new URL(request.url);
  const query = url.searchParams.get('q')?.trim().slice(0, 100) ?? '';
  if (query.length < 2) return json([]);

  const role: Role = lmsUser?.role ?? 'ADMIN';
  const prisma = getPrisma();
  const canSearchLearning =
    role === 'STUDENT' || role === 'TEACHER' || isAdminRole(role);
  const canSearchStudents = role === 'SUPPORT' || isAdminRole(role);
  const courseScope =
    role === 'STUDENT'
      ? { enrollments: { some: { studentId: lmsUser!.id } } }
      : role === 'TEACHER'
        ? { teacherId: lmsUser!.id }
        : {};

  const [courses, students] = await Promise.all([
    canSearchLearning
      ? prisma.course.findMany({
          where: {
            ...courseScope,
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              {
                modules: {
                  some: {
                    lessons: {
                      some: { title: { contains: query, mode: 'insensitive' } },
                    },
                  },
                },
              },
            ],
          },
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            slug: true,
            title: true,
            modules: {
              orderBy: { position: 'asc' },
              select: {
                lessons: {
                  orderBy: { position: 'asc' },
                  where: { title: { contains: query, mode: 'insensitive' } },
                  select: { id: true, title: true },
                  take: 4,
                },
              },
            },
          },
          take: 8,
        })
      : Promise.resolve([]),
    canSearchStudents
      ? prisma.user.findMany({
          where: {
            role: 'STUDENT',
            status: 'ACTIVE',
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { email: { contains: query, mode: 'insensitive' } },
            ],
          },
          orderBy: [{ name: 'asc' }, { email: 'asc' }],
          select: { email: true, id: true, name: true },
          take: 8,
        })
      : Promise.resolve([]),
  ]);

  const results: SearchResult[] = [];
  for (const course of courses) {
    results.push({
      description: role === 'STUDENT' ? 'Enrolled course' : 'Course workspace',
      href:
        role === 'STUDENT'
          ? `/courses/${course.slug}`
          : `/teacher/courses/${course.id}`,
      id: course.id,
      label: course.title,
      type: 'course',
    });
    for (const lesson of course.modules.flatMap((module) => module.lessons)) {
      results.push({
        description: `${course.title} · Lesson`,
        href:
          role === 'STUDENT'
            ? `/courses/${course.id}/learn/lessons/${lesson.id}`
            : `/teacher/courses/${course.id}?tab=curriculum`,
        id: lesson.id,
        label: lesson.title,
        type: 'lesson',
      });
    }
  }

  for (const student of students) {
    results.push({
      description: student.email,
      href: `/support?q=${encodeURIComponent(student.email)}&student=${encodeURIComponent(student.id)}`,
      id: student.id,
      label: student.name?.trim() || student.email,
      type: 'student',
    });
  }

  return json(results.slice(0, 24));
}
