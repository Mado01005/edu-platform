'use server';

import type { ContentType, Role } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getPrisma } from '@/lib/prisma';
import {
  LmsAuthError,
  requireLmsRole,
  requireLmsUser,
} from '@/lib/lms/auth';
import { TEACHING_ROLES, isAdminRole } from '@/lib/lms/roles';
import { recalculateStudentHealthScores } from '@/lib/lms/health';
import { getVideoEmbedUrl } from '@/lib/lms/video';

const CONTENT_TYPES = new Set<ContentType>([
  'VIMEO',
  'YOUTUBE',
  'R2_VIDEO',
  'PDF',
  'TEXT',
]);

function requiredString(formData: FormData, name: string, max = 200) {
  const value = formData.get(name);

  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${name} is required.`);
  }

  return value.trim().slice(0, max);
}

function optionalString(formData: FormData, name: string, max = 10_000) {
  const value = formData.get(name);
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, max)
    : null;
}

function contentType(formData: FormData): ContentType {
  const value = formData.get('contentType');

  if (typeof value !== 'string' || !CONTENT_TYPES.has(value as ContentType)) {
    throw new Error('A valid lesson content type is required.');
  }

  return value as ContentType;
}

function assertR2PublicUrl(value: string | null) {
  if (!value) return null;
  const publicBase = process.env.R2_PUBLIC_URL;

  if (!publicBase) {
    throw new Error('R2_PUBLIC_URL is not configured.');
  }

  const url = new URL(value);
  const base = new URL(publicBase);
  const basePath = base.pathname.replace(/\/+$/, '');

  if (
    url.protocol !== 'https:' ||
    url.origin !== base.origin ||
    (basePath && !url.pathname.startsWith(`${basePath}/`))
  ) {
    throw new Error('The file URL must belong to the configured R2 public domain.');
  }

  return url.toString();
}

async function requireTeacher(allowed: readonly Role[] = TEACHING_ROLES) {
  return requireLmsRole(allowed);
}

async function teacherCourse(courseId: string) {
  const teacher = await requireTeacher();
  const course = await getPrisma().course.findUnique({
    where: { id: courseId },
    select: { id: true, teacherId: true },
  });

  if (
    !course ||
    (!isAdminRole(teacher.role) && course.teacherId !== teacher.id)
  ) {
    throw new LmsAuthError('Course not found.', 404);
  }

  return { course, teacher };
}

export async function createCourseAction(formData: FormData) {
  const teacher = await requireTeacher();
  const course = await getPrisma().course.create({
    data: {
      title: requiredString(formData, 'title'),
      description: optionalString(formData, 'description'),
      teacherId: teacher.id,
    },
  });

  redirect(`/teacher/courses/${course.id}/edit`);
}

export async function updateCourseAction(courseId: string, formData: FormData) {
  await teacherCourse(courseId);
  const isPublished = formData.get('isPublished') === 'on';

  if (isPublished) {
    const lessonCount = await getPrisma().lesson.count({
      where: { module: { courseId } },
    });
    if (!lessonCount) {
      throw new Error('Add at least one lesson before publishing this course.');
    }
  }

  await getPrisma().course.update({
    where: { id: courseId },
    data: {
      title: requiredString(formData, 'title'),
      description: optionalString(formData, 'description'),
      imageUrl: assertR2PublicUrl(
        optionalString(formData, 'imageUrl', 2_000),
      ),
      isPublished,
    },
  });
  revalidatePath(`/teacher/courses/${courseId}/edit`);
  revalidatePath('/teacher/courses');
  revalidatePath('/catalog');
}

export async function createModuleAction(courseId: string, formData: FormData) {
  await teacherCourse(courseId);
  const lastModule = await getPrisma().module.findFirst({
    where: { courseId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  await getPrisma().module.create({
    data: {
      courseId,
      title: requiredString(formData, 'title'),
      position: (lastModule?.position ?? 0) + 1,
    },
  });
  revalidatePath(`/teacher/courses/${courseId}/edit`);
}

export async function createLessonAction(moduleId: string, formData: FormData) {
  const courseModule = await getPrisma().module.findUnique({
    where: { id: moduleId },
    select: { courseId: true },
  });

  if (!courseModule) {
    throw new Error('Module not found.');
  }

  await teacherCourse(courseModule.courseId);
  const lastLesson = await getPrisma().lesson.findFirst({
    where: { moduleId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  await getPrisma().lesson.create({
    data: {
      moduleId,
      title: requiredString(formData, 'title'),
      contentType: contentType(formData),
      position: (lastLesson?.position ?? 0) + 1,
    },
  });
  revalidatePath(`/teacher/courses/${courseModule.courseId}/edit`);
}

export async function updateLessonAction(
  lessonId: string,
  formData: FormData,
) {
  const lesson = await getPrisma().lesson.findUnique({
    where: { id: lessonId },
    select: { module: { select: { courseId: true } } },
  });

  if (!lesson) {
    throw new Error('Lesson not found.');
  }

  await teacherCourse(lesson.module.courseId);
  const type = contentType(formData);
  const videoUrl =
    type === 'VIMEO' || type === 'YOUTUBE'
      ? optionalString(formData, 'videoUrl', 2_000)
      : type === 'R2_VIDEO'
        ? assertR2PublicUrl(optionalString(formData, 'r2VideoUrl', 2_000))
        : null;
  if (
    (type === 'VIMEO' || type === 'YOUTUBE') &&
    videoUrl &&
    !getVideoEmbedUrl(videoUrl, type)
  ) {
    throw new Error(`Enter a valid ${type === 'VIMEO' ? 'Vimeo' : 'YouTube'} HTTPS URL.`);
  }
  const pdfUrl =
    type === 'PDF'
      ? assertR2PublicUrl(optionalString(formData, 'pdfUrl', 2_000))
      : null;

  await getPrisma().lesson.update({
    where: { id: lessonId },
    data: {
      title: requiredString(formData, 'title'),
      contentType: type,
      videoUrl,
      pdfUrl,
      textContent:
        type === 'TEXT' ? optionalString(formData, 'textContent') : null,
      isFree: formData.get('isFree') === 'on',
    },
  });
  revalidatePath(`/teacher/courses/${lesson.module.courseId}/edit`);
}

export async function reorderModulesAction(
  courseId: string,
  orderedIds: string[],
) {
  await teacherCourse(courseId);
  const existing = await getPrisma().module.findMany({
    where: { courseId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map(({ id }) => id));

  if (
    new Set(orderedIds).size !== orderedIds.length ||
    orderedIds.length !== existingIds.size ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error('Invalid module order.');
  }

  await getPrisma().$transaction(
    orderedIds.map((id, index) =>
      getPrisma().module.update({
        where: { id },
        data: { position: index + 1 },
      }),
    ),
  );
  revalidatePath(`/teacher/courses/${courseId}/edit`);
}

export async function reorderLessonsAction(
  moduleId: string,
  orderedIds: string[],
) {
  const courseModule = await getPrisma().module.findUnique({
    where: { id: moduleId },
    select: { courseId: true },
  });

  if (!courseModule) throw new Error('Module not found.');
  await teacherCourse(courseModule.courseId);
  const existing = await getPrisma().lesson.findMany({
    where: { moduleId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map(({ id }) => id));

  if (
    new Set(orderedIds).size !== orderedIds.length ||
    orderedIds.length !== existingIds.size ||
    orderedIds.some((id) => !existingIds.has(id))
  ) {
    throw new Error('Invalid lesson order.');
  }

  await getPrisma().$transaction(
    orderedIds.map((id, index) =>
      getPrisma().lesson.update({
        where: { id },
        data: { position: index + 1 },
      }),
    ),
  );
  revalidatePath(`/teacher/courses/${courseModule.courseId}/edit`);
}

export async function scheduleZoomAction(
  courseId: string,
  formData: FormData,
) {
  const { teacher } = await teacherCourse(courseId);
  const meetingUrl = requiredString(formData, 'meetingUrl', 2_000);
  const parsedUrl = new URL(meetingUrl);

  const zoomHost = parsedUrl.hostname.toLowerCase();
  if (
    parsedUrl.protocol !== 'https:' ||
    (zoomHost !== 'zoom.us' && !zoomHost.endsWith('.zoom.us'))
  ) {
    throw new Error('Enter a valid Zoom HTTPS meeting URL.');
  }

  const startTimeValue = requiredString(formData, 'startTime', 100);
  const startTime = new Date(
    /(?:Z|[+-]\d{2}:\d{2})$/.test(startTimeValue)
      ? startTimeValue
      : `${startTimeValue}:00Z`,
  );
  const duration = Number(requiredString(formData, 'duration', 5));

  if (
    Number.isNaN(startTime.getTime()) ||
    startTime.getTime() <= Date.now() ||
    !Number.isInteger(duration) ||
    duration < 5 ||
    duration > 480
  ) {
    throw new Error('Enter a valid start time and duration.');
  }

  await getPrisma().zoomSession.create({
    data: {
      courseId,
      teacherId: teacher.id,
      title: requiredString(formData, 'title'),
      meetingUrl: parsedUrl.toString(),
      startTime,
      duration,
    },
  });
  revalidatePath(`/teacher/courses/${courseId}/edit`);
  revalidatePath('/live-classes');
}

export async function enrollCourseAction(courseId: string) {
  const student = await requireLmsRole(['STUDENT']);
  const course = await getPrisma().course.findFirst({
    where: { id: courseId, isPublished: true },
    include: {
      modules: {
        orderBy: { position: 'asc' },
        include: { lessons: { orderBy: { position: 'asc' }, take: 1 } },
      },
    },
  });

  if (!course) throw new Error('Course not found.');

  await getPrisma().enrollment.upsert({
    where: {
      studentId_courseId: { studentId: student.id, courseId },
    },
    create: { studentId: student.id, courseId },
    update: {},
  });

  const firstLesson = course.modules.flatMap((module) => module.lessons)[0];
  revalidatePath('/catalog');
  redirect(
    firstLesson
      ? `/courses/${courseId}/learn/lessons/${firstLesson.id}`
      : '/dashboard',
  );
}

export async function updateLessonProgressAction(
  lessonId: string,
  completed: boolean,
) {
  const student = await requireLmsRole(['STUDENT']);
  const lesson = await getPrisma().lesson.findUnique({
    where: { id: lessonId },
    select: {
      contentType: true,
      module: { select: { courseId: true } },
    },
  });

  if (!lesson) throw new Error('Lesson not found.');
  if (['R2_VIDEO', 'VIMEO', 'YOUTUBE'].includes(lesson.contentType)) {
    throw new LmsAuthError(
      'Video progress must be recorded by the video player.',
      409,
    );
  }
  const enrollment = await getPrisma().enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: lesson.module.courseId,
      },
    },
  });

  if (!enrollment && student.role === 'STUDENT') {
    throw new LmsAuthError('Enroll before updating lesson progress.', 403);
  }

  await getPrisma().lessonProgress.upsert({
    where: {
      studentId_lessonId: { studentId: student.id, lessonId },
    },
    create: {
      studentId: student.id,
      lessonId,
      isCompleted: completed,
      watchPercentage: completed ? 100 : 0,
    },
    update: {
      isCompleted: completed,
      ...(completed ? { watchPercentage: 100 } : {}),
    },
  });
  await recalculateStudentHealthScores([student.id]);
  revalidatePath(`/courses/${lesson.module.courseId}/learn/lessons/${lessonId}`);
}

export async function createDiscussionAction(
  lessonId: string,
  parentId: string | null,
  formData: FormData,
) {
  const user = await requireLmsUser();
  const message = requiredString(formData, 'message', 4_000);
  const lesson = await getPrisma().lesson.findUnique({
    where: { id: lessonId },
    include: {
      module: {
        include: {
          course: {
            include: {
              enrollments: {
                where: { studentId: user.id },
                select: { id: true },
              },
            },
          },
        },
      },
    },
  });
  const course = lesson?.module.course;
  const canParticipate =
    !!lesson &&
    !!course &&
    (lesson.isFree ||
      course.enrollments.length > 0 ||
      isAdminRole(user.role) ||
      (user.role === 'TEACHER' && course.teacherId === user.id));

  if (!canParticipate) {
    throw new LmsAuthError('Enroll before joining this discussion.', 403);
  }

  if (parentId) {
    const parent = await getPrisma().discussion.findFirst({
      where: { id: parentId, lessonId },
      select: { id: true },
    });
    if (!parent) throw new Error('Discussion parent not found.');
  }

  await getPrisma().discussion.create({
    data: { lessonId, userId: user.id, parentId, message },
  });
  revalidatePath('/courses', 'layout');
}
