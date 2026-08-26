import { NextResponse } from 'next/server';
import { requireApiAuth } from '@/lib/auth-guard';
import { isSameOriginRequest } from '@/lib/http/same-origin';
import { ADMIN_ROLES } from '@/lib/lms/roles';
import { getPrisma } from '@/lib/prisma';
import { batchDeleteR2Objects } from '@/lib/r2';
import { extractR2Key } from '@/lib/validation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type CurriculumItemType = 'subject' | 'course' | 'module';

function readItems(value: unknown) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 100) return null;
  const items: { id: string; type: CurriculumItemType }[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const id = Reflect.get(item, 'id');
    const type = Reflect.get(item, 'type');
    if (
      typeof id !== 'string' ||
      id.length < 1 ||
      id.length > 128 ||
      (type !== 'subject' && type !== 'course' && type !== 'module')
    ) {
      return null;
    }
    items.push({ id, type });
  }
  return Array.from(new Map(items.map((item) => [`${item.type}:${item.id}`, item])).values());
}

export async function DELETE(request: Request) {
  try {
    if (!isSameOriginRequest(request)) {
      return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
    }
    const auth = await requireApiAuth(request, {
      allowedRoles: ADMIN_ROLES,
      allowCookieAuth: true,
    });
    if (!auth.ok) return auth.response;

    const body = (await request.json()) as Record<string, unknown>;
    const items = readItems(body.items);
    if (!items) {
      return NextResponse.json(
        { error: 'Select between 1 and 100 valid subjects, courses, or modules.' },
        { status: 400 },
      );
    }
    const subjectIds = items.filter((item) => item.type === 'subject').map((item) => item.id);
    const requestedCourseIds = items.filter((item) => item.type === 'course').map((item) => item.id);
    const requestedModuleIds = items.filter((item) => item.type === 'module').map((item) => item.id);
    const subjectCourses = subjectIds.length
      ? await getPrisma().course.findMany({
          where: { subjectId: { in: subjectIds } },
          select: { id: true },
        })
      : [];
    const courseIds = Array.from(new Set([
      ...requestedCourseIds,
      ...subjectCourses.map((course) => course.id),
    ]));
    const lessonFilters = [
      ...(courseIds.length ? [{ module: { courseId: { in: courseIds } } }] : []),
      ...(requestedModuleIds.length ? [{ moduleId: { in: requestedModuleIds } }] : []),
    ];
    const materialFilters = [
      ...(courseIds.length
        ? [
            { courseId: { in: courseIds } },
            { module: { courseId: { in: courseIds } } },
            { lesson: { module: { courseId: { in: courseIds } } } },
          ]
        : []),
      ...(requestedModuleIds.length
        ? [
            { moduleId: { in: requestedModuleIds } },
            { lesson: { moduleId: { in: requestedModuleIds } } },
          ]
        : []),
    ];
    const [lessons, materials, submissions, courses] = await Promise.all([
      lessonFilters.length
        ? getPrisma().lesson.findMany({
            where: { OR: lessonFilters },
            select: {
              pdfUrl: true,
              videoUrl: true,
              videoUrl1080: true,
              videoUrl360: true,
              videoUrl480: true,
              videoUrl720: true,
            },
          })
        : [],
      materialFilters.length
        ? getPrisma().courseMaterial.findMany({
            where: { OR: materialFilters },
            select: { objectKey: true },
          })
        : [],
      lessonFilters.length
        ? getPrisma().assignmentSubmission.findMany({
            where: { lesson: { OR: lessonFilters } },
            select: { objectKey: true },
          })
        : [],
      courseIds.length
        ? getPrisma().course.findMany({
            where: { id: { in: courseIds } },
            select: { imageUrl: true },
          })
        : [],
    ]);
    const objectKeys = new Set<string>([
      ...materials.map((item) => item.objectKey),
      ...submissions.flatMap((item) => item.objectKey ? [item.objectKey] : []),
    ]);
    const urls = [
      ...lessons.flatMap((lesson) => [
        lesson.videoUrl,
        lesson.videoUrl360,
        lesson.videoUrl480,
        lesson.videoUrl720,
        lesson.videoUrl1080,
        lesson.pdfUrl,
      ]),
      ...courses.map((course) => course.imageUrl),
    ];
    for (const url of urls) {
      if (!url) continue;
      const key = extractR2Key(url);
      if (key) objectKeys.add(key);
    }

    const deleted = await getPrisma().$transaction(async (transaction) => {
      const modules = requestedModuleIds.length
        ? await transaction.module.deleteMany({
            where: {
              id: { in: requestedModuleIds },
              ...(courseIds.length ? { courseId: { notIn: courseIds } } : {}),
            },
          })
        : { count: 0 };
      const coursesResult = courseIds.length
        ? await transaction.course.deleteMany({ where: { id: { in: courseIds } } })
        : { count: 0 };
      const subjects = subjectIds.length
        ? await transaction.subject.deleteMany({ where: { id: { in: subjectIds } } })
        : { count: 0 };
      return {
        courses: coursesResult.count,
        modules: modules.count,
        subjects: subjects.count,
      };
    });

    let storageCleanupWarning: string | null = null;
    try {
      await batchDeleteR2Objects(Array.from(objectKeys));
    } catch (error) {
      console.error('[CURRICULUM_R2_BULK_CLEANUP]', error);
      storageCleanupWarning =
        'Curriculum records were deleted, but one or more R2 objects require orphan cleanup.';
    }
    return NextResponse.json({
      deleted,
      deletedAssets: storageCleanupWarning ? 0 : objectKeys.size,
      storageCleanupWarning,
      success: true,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'A valid JSON request body is required.' }, { status: 400 });
    }
    console.error('[CURRICULUM_BULK_DELETE]', error);
    return NextResponse.json(
      { error: 'Unable to delete the selected curriculum items.' },
      { status: 500 },
    );
  }
}
