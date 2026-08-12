'use server';

import { GradeLevel, Prisma, type ContentType, type Role } from '@prisma/client';
import { nanoid } from 'nanoid';
import { revalidatePath, revalidateTag } from 'next/cache';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getPrisma } from '@/lib/prisma';
import {
  LmsAuthError,
  requireLmsRole,
  requireLmsUser,
} from '@/lib/lms/auth';
import { TEACHING_ROLES, isAdminRole } from '@/lib/lms/roles';
import { recalculateStudentHealthScores } from '@/lib/lms/health';
import { getVideoEmbedUrl } from '@/lib/lms/video';
import { cairoDateTimeLocalToUtc } from '@/lib/lms/timezone';

const CONTENT_TYPES = new Set<ContentType>([
  'VIMEO',
  'YOUTUBE',
  'R2_VIDEO',
  'PDF',
  'TEXT',
  'QUIZ',
  'ASSIGNMENT',
]);

const nullableDescription = z
  .string()
  .trim()
  .max(10_000, 'Description must be 10,000 characters or fewer.')
  .transform((value) => value || null);
const moneyString = z
  .string()
  .trim()
  .regex(
    /^\d{1,9}(?:\.\d{1,2})?$/,
    'Use a non-negative amount with up to two decimal places.',
  );
const createCourseSchema = z.object({
  description: nullableDescription,
  gradeLevel: z.nativeEnum(GradeLevel).nullable(),
  subjectId: z
    .string()
    .trim()
    .max(128, 'Subject selection is invalid.')
    .transform((value) => value || null),
  title: z
    .string()
    .trim()
    .min(1, 'Course title is required.')
    .max(200, 'Course title must be 200 characters or fewer.'),
});
const updateCourseSchema = createCourseSchema.omit({ subjectId: true }).extend({
  imageUrl: z
    .string()
    .trim()
    .max(2_000, 'Course image URL is too long.')
    .transform((value) => value || null),
  isPublished: z.boolean(),
  gradeLevel: z.nativeEnum(GradeLevel).nullable(),
  priceEGP: moneyString,
  priceUSD: moneyString,
});

export type CourseActionState = {
  error: string | null;
  success: boolean;
};

function courseActionFailure(error: unknown): CourseActionState {
  if (isRedirectError(error)) throw error;

  console.error('Course Save Error:', error);
  return {
    error:
      error instanceof Error
        ? error.message
        : 'Failed to save course.',
    success: false,
  };
}

function parseCourseInput<T extends z.ZodTypeAny>(
  schema: T,
  input: unknown,
): z.infer<T> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new Error(
      result.error.issues[0]?.message ?? 'Enter valid course details.',
    );
  }

  return result.data;
}

function slugBase(title: string) {
  return (
    title
      .normalize('NFKD')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 170) || 'course'
  );
}

async function createCourseWithUniqueSlug({
  description,
  gradeLevel,
  subjectId,
  teacherId,
  title,
}: {
  description: string | null;
  gradeLevel: GradeLevel | null;
  subjectId: string | null;
  teacherId: string;
  title: string;
}) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await getPrisma().course.create({
        data: {
          description,
          gradeLevel,
          slug: `${slugBase(title)}-${nanoid(4).toLowerCase()}`,
          subjectId,
          teacherId,
          title,
        },
      });
    } catch (error) {
      if (
        !(error instanceof Prisma.PrismaClientKnownRequestError) ||
        error.code !== 'P2002'
      ) {
        throw error;
      }
    }
  }

  throw new Error('Unable to create a unique course address. Try again.');
}

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

export async function createCourseAction(
  _previousState: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  try {
    const input = parseCourseInput(createCourseSchema, {
      description: formData.get('description') ?? '',
      gradeLevel: formData.get('gradeLevel') || null,
      subjectId: formData.get('subjectId') ?? '',
      title: formData.get('title'),
    });
    const teacher = await requireTeacher();
    let gradeLevel = input.gradeLevel;

    if (input.subjectId) {
      const subject = await getPrisma().subject.findUnique({
        where: { id: input.subjectId },
        select: { grade: true, teacherId: true },
      });

      if (
        !subject ||
        (!isAdminRole(teacher.role) && subject.teacherId !== teacher.id)
      ) {
        throw new Error('Choose a subject you are allowed to teach.');
      }
      if (gradeLevel && subject.grade !== gradeLevel) {
        throw new Error('The selected subject does not belong to that grade.');
      }
      gradeLevel = subject.grade;
    }

    const course = await createCourseWithUniqueSlug({
      ...input,
      gradeLevel,
      teacherId: teacher.id,
    });

    redirect(`/teacher/courses/${course.id}`);
  } catch (error) {
    return courseActionFailure(error);
  }
}

export async function updateCourseAction(
  courseId: string,
  _previousState: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  try {
    const input = parseCourseInput(updateCourseSchema, {
      description: formData.get('description') ?? '',
      imageUrl: formData.get('imageUrl') ?? '',
      gradeLevel: formData.get('gradeLevel') || null,
      isPublished: formData.get('isPublished') === 'on',
      priceEGP: formData.get('priceEGP'),
      priceUSD: formData.get('priceUSD'),
      title: formData.get('title'),
    });
    await teacherCourse(courseId);

    if (input.isPublished) {
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
        description: input.description,
        gradeLevel: input.gradeLevel,
        imageUrl: assertR2PublicUrl(input.imageUrl),
        isPublished: input.isPublished,
        priceEGP: new Prisma.Decimal(input.priceEGP),
        priceUSD: new Prisma.Decimal(input.priceUSD),
        title: input.title,
      },
    });
    revalidatePath(`/teacher/courses/${courseId}`);
    revalidatePath('/teacher/courses');
    revalidatePath('/catalog');
    revalidateTag('catalog', 'max');
    return { error: null, success: true };
  } catch (error) {
    return courseActionFailure(error);
  }
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
  revalidatePath(`/teacher/courses/${courseId}`);
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

  const type = contentType(formData);
  const title = requiredString(formData, 'title');
  await getPrisma().$transaction(async (transaction) => {
    const lesson = await transaction.lesson.create({
      data: {
        moduleId,
        title,
        contentType: type,
        position: (lastLesson?.position ?? 0) + 1,
      },
    });
    if (type === 'QUIZ' || type === 'ASSIGNMENT') {
      await transaction.assignment.create({
        data: {
          courseId: courseModule.courseId,
          lessonId: lesson.id,
          title,
          type: type === 'QUIZ' ? 'QUIZ' : 'HOMEWORK',
        },
      });
    }
  });
  revalidatePath(`/teacher/courses/${courseModule.courseId}`);
}

export async function updateLessonAction(
  lessonId: string,
  formData: FormData,
) {
  const lesson = await getPrisma().lesson.findUnique({
    where: { id: lessonId },
    select: {
      assignment: { select: { id: true, _count: { select: { submissions: true } } } },
      module: { select: { courseId: true } },
    },
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
  const videoUrl360 =
    type === 'R2_VIDEO'
      ? assertR2PublicUrl(optionalString(formData, 'videoUrl360', 2_000))
      : null;
  const videoUrl480 =
    type === 'R2_VIDEO'
      ? assertR2PublicUrl(optionalString(formData, 'videoUrl480', 2_000))
      : null;
  const videoUrl720 =
    type === 'R2_VIDEO'
      ? assertR2PublicUrl(optionalString(formData, 'videoUrl720', 2_000))
      : null;
  const videoUrl1080 =
    type === 'R2_VIDEO'
      ? assertR2PublicUrl(optionalString(formData, 'videoUrl1080', 2_000))
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

  const durationRaw = optionalString(formData, 'durationMin', 4);
  const durationMin = durationRaw ? Number(durationRaw) : null;
  if (durationMin !== null && (!Number.isInteger(durationMin) || durationMin < 1 || durationMin > 1440)) {
    throw new Error('Duration must be between 1 and 1,440 minutes.');
  }

  const instructions = optionalString(formData, 'instructions', 20_000);
  const questionRaw = optionalString(formData, 'questionCount', 3);
  const questionCount = questionRaw ? Number(questionRaw) : 0;
  if (!Number.isInteger(questionCount) || questionCount < 0 || questionCount > 500) {
    throw new Error('Question count must be between 0 and 500.');
  }
  const dueAtValue = optionalString(formData, 'dueAt', 100);
  const dueAt = dueAtValue ? cairoDateTimeLocalToUtc(dueAtValue) : null;
  if (dueAtValue && !dueAt) throw new Error('Enter a valid Cairo due date and time.');

  const title = requiredString(formData, 'title');
  if (
    lesson.assignment?._count.submissions &&
    type !== 'QUIZ' &&
    type !== 'ASSIGNMENT'
  ) {
    throw new Error(
      'This activity has student submissions and cannot be changed to another lesson type.',
    );
  }
  await getPrisma().$transaction(async (transaction) => {
    await transaction.lesson.update({
      where: { id: lessonId },
      data: {
        title,
        contentType: type,
        durationMin: ['VIMEO', 'YOUTUBE', 'R2_VIDEO'].includes(type) ? durationMin : null,
        videoUrl,
        videoUrl360,
        videoUrl480,
        videoUrl720,
        videoUrl1080,
        pdfUrl,
        textContent: type === 'TEXT' ? optionalString(formData, 'textContent') : null,
        isFree: formData.get('isFree') === 'on',
      },
    });
    if (type === 'QUIZ' || type === 'ASSIGNMENT') {
      await transaction.assignment.upsert({
        where: { lessonId },
        create: {
          courseId: lesson.module.courseId,
          lessonId,
          title,
          type: type === 'QUIZ' ? 'QUIZ' : 'HOMEWORK',
          instructions,
          questionCount: type === 'QUIZ' ? questionCount : 0,
          dueAt,
        },
        update: {
          title,
          type: type === 'QUIZ' ? 'QUIZ' : 'HOMEWORK',
          instructions,
          questionCount: type === 'QUIZ' ? questionCount : 0,
          dueAt,
        },
      });
    } else if (lesson.assignment) {
      await transaction.assignment.delete({ where: { id: lesson.assignment.id } });
    }
  });
  revalidatePath(`/teacher/courses/${lesson.module.courseId}`);
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
  revalidatePath(`/teacher/courses/${courseId}`);
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
  revalidatePath(`/teacher/courses/${courseModule.courseId}`);
}

export async function scheduleZoomAction(
  courseId: string,
  _previousState: CourseActionState,
  formData: FormData,
): Promise<CourseActionState> {
  try {
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
    const startTime = cairoDateTimeLocalToUtc(startTimeValue);
    const duration = Number(requiredString(formData, 'duration', 5));

    if (
      !startTime ||
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
    revalidatePath(`/teacher/courses/${courseId}`);
    revalidatePath('/live-classes');
    return { error: null, success: true };
  } catch (error) {
    return courseActionFailure(error);
  }
}

export async function cancelZoomSessionAction(sessionId: string) {
  const session = await getPrisma().zoomSession.findUnique({
    where: { id: sessionId },
    select: { courseId: true },
  });
  if (!session) throw new Error('Zoom session not found.');
  await teacherCourse(session.courseId);
  await getPrisma().zoomSession.delete({ where: { id: sessionId } });
  revalidatePath(`/teacher/courses/${session.courseId}`);
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
  if (course.priceEGP.gt(0) || course.priceUSD.gt(0)) {
    throw new LmsAuthError('Paid courses require an approved online payment.', 409);
  }

  await getPrisma().enrollment.upsert({
    where: {
      studentId_courseId: { studentId: student.id, courseId },
    },
    create: { studentId: student.id, courseId },
    update: {},
  });

  const firstLesson = course.modules.flatMap((module) => module.lessons)[0];
  revalidatePath('/catalog');
  revalidateTag('catalog', 'max');
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
