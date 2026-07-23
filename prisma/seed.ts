import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

config({ path: '.env.local', quiet: true });
config({ path: '.env', quiet: true });

const prisma = new PrismaClient();

const seedIds = {
  teacher: 'seed-user-teacher-wayground',
  students: [
    'seed-user-student-1-wayground',
    'seed-user-student-2-wayground',
    'seed-user-student-3-wayground',
  ],
  course: 'seed-course-fullstack-cloud',
  modules: [
    'seed-module-next-react',
    'seed-module-prisma-supabase',
  ],
  lessons: [
    'seed-lesson-modern-web-architecture',
    'seed-lesson-course-syllabus',
    'seed-lesson-schema-indexing',
  ],
  zoomSession: 'seed-zoom-fullstack-workshop',
} as const;

const studentProfiles = [
  {
    id: seedIds.students[0],
    supabaseId: 'seed-auth-student-1-wayground',
    name: 'Omar Hassan',
    email: 'student1@wayground.com',
  },
  {
    id: seedIds.students[1],
    supabaseId: 'seed-auth-student-2-wayground',
    name: 'Tala Mahmoud',
    email: 'student2@wayground.com',
  },
  {
    id: seedIds.students[2],
    supabaseId: 'seed-auth-student-3-wayground',
    name: 'Youssef Ahmed',
    email: 'student3@wayground.com',
  },
] as const;

function tomorrowAtSixUtc() {
  const startTime = new Date();
  startTime.setUTCDate(startTime.getUTCDate() + 1);
  startTime.setUTCHours(18, 0, 0, 0);
  return startTime;
}

async function main() {
  const result = await prisma.$transaction(async (tx) => {
    const teacher = await tx.user.upsert({
      where: { email: 'teacher@wayground.com' },
      create: {
        id: seedIds.teacher,
        supabaseId: 'seed-auth-teacher-wayground',
        name: 'Dr. Abdallah Saad',
        email: 'teacher@wayground.com',
        role: 'TEACHER',
      },
      update: {
        name: 'Dr. Abdallah Saad',
        role: 'TEACHER',
      },
    });

    const students = [];

    for (const profile of studentProfiles) {
      students.push(
        await tx.user.upsert({
          where: { email: profile.email },
          create: {
            id: profile.id,
            supabaseId: profile.supabaseId,
            name: profile.name,
            email: profile.email,
            role: 'STUDENT',
          },
          update: {
            name: profile.name,
            role: 'STUDENT',
          },
        }),
      );
    }

    const course = await tx.course.upsert({
      where: { id: seedIds.course },
      create: {
        id: seedIds.course,
        title: 'Full-Stack Web Development & Cloud Architecture',
        description:
          'Master Next.js App Router, Supabase PostgreSQL, Prisma ORM, and Cloudflare R2 storage.',
        isPublished: true,
        teacherId: teacher.id,
      },
      update: {
        title: 'Full-Stack Web Development & Cloud Architecture',
        description:
          'Master Next.js App Router, Supabase PostgreSQL, Prisma ORM, and Cloudflare R2 storage.',
        isPublished: true,
        teacherId: teacher.id,
      },
    });

    const nextModule = await tx.module.upsert({
      where: { id: seedIds.modules[0] },
      create: {
        id: seedIds.modules[0],
        title: 'Next.js & React Core Mechanics',
        position: 1,
        courseId: course.id,
      },
      update: {
        title: 'Next.js & React Core Mechanics',
        position: 1,
        courseId: course.id,
      },
    });

    const databaseModule = await tx.module.upsert({
      where: { id: seedIds.modules[1] },
      create: {
        id: seedIds.modules[1],
        title: 'Database Layer with Prisma & Supabase',
        position: 2,
        courseId: course.id,
      },
      update: {
        title: 'Database Layer with Prisma & Supabase',
        position: 2,
        courseId: course.id,
      },
    });

    const introductionLesson = await tx.lesson.upsert({
      where: { id: seedIds.lessons[0] },
      create: {
        id: seedIds.lessons[0],
        title: '1.1 Introduction to Modern Web Architecture',
        position: 1,
        contentType: 'VIMEO',
        videoUrl: 'https://vimeo.com/76979871',
        isFree: true,
        moduleId: nextModule.id,
      },
      update: {
        title: '1.1 Introduction to Modern Web Architecture',
        position: 1,
        contentType: 'VIMEO',
        videoUrl: 'https://vimeo.com/76979871',
        pdfUrl: null,
        textContent: null,
        isFree: true,
        moduleId: nextModule.id,
      },
    });

    await tx.lesson.upsert({
      where: { id: seedIds.lessons[1] },
      create: {
        id: seedIds.lessons[1],
        title: '1.2 Course Syllabus & Setup Guide',
        position: 2,
        contentType: 'PDF',
        pdfUrl:
          'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        moduleId: nextModule.id,
      },
      update: {
        title: '1.2 Course Syllabus & Setup Guide',
        position: 2,
        contentType: 'PDF',
        videoUrl: null,
        pdfUrl:
          'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        textContent: null,
        isFree: false,
        moduleId: nextModule.id,
      },
    });

    await tx.lesson.upsert({
      where: { id: seedIds.lessons[2] },
      create: {
        id: seedIds.lessons[2],
        title: '2.1 Schema Design & PostgreSQL Indexing',
        position: 1,
        contentType: 'YOUTUBE',
        videoUrl: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
        moduleId: databaseModule.id,
      },
      update: {
        title: '2.1 Schema Design & PostgreSQL Indexing',
        position: 1,
        contentType: 'YOUTUBE',
        videoUrl: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
        pdfUrl: null,
        textContent: null,
        isFree: false,
        moduleId: databaseModule.id,
      },
    });

    for (const student of students) {
      await tx.enrollment.upsert({
        where: {
          studentId_courseId: {
            studentId: student.id,
            courseId: course.id,
          },
        },
        create: {
          studentId: student.id,
          courseId: course.id,
        },
        update: {},
      });
    }

    await tx.lessonProgress.upsert({
      where: {
        studentId_lessonId: {
          studentId: students[0].id,
          lessonId: introductionLesson.id,
        },
      },
      create: {
        studentId: students[0].id,
        lessonId: introductionLesson.id,
        isCompleted: true,
      },
      update: { isCompleted: true },
    });

    const startTime = tomorrowAtSixUtc();
    const zoomSession = await tx.zoomSession.upsert({
      where: { id: seedIds.zoomSession },
      create: {
        id: seedIds.zoomSession,
        title: 'Full-Stack Architecture Live Workshop',
        meetingUrl: 'https://zoom.us/j/12345678901',
        startTime,
        duration: 60,
        courseId: course.id,
        teacherId: teacher.id,
      },
      update: {
        title: 'Full-Stack Architecture Live Workshop',
        meetingUrl: 'https://zoom.us/j/12345678901',
        startTime,
        duration: 60,
        courseId: course.id,
        teacherId: teacher.id,
      },
    });

    return {
      teacher,
      students,
      course,
      introductionLesson,
      zoomSession,
    };
  });

  console.info('LMS seed completed.', {
    teacher: result.teacher.email,
    students: result.students.map(({ email }) => email),
    course: result.course.title,
    completedLesson: result.introductionLesson.title,
    zoomStartTime: result.zoomSession.startTime.toISOString(),
  });
}

main()
  .catch((error: unknown) => {
    console.error('LMS seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
