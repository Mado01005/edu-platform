import type { Metadata } from 'next';
import { BentoGridFeatures } from '@/components/landing/BentoGridFeatures';
import { FaqAccordion } from '@/components/landing/FaqAccordion';
import { FinalCta } from '@/components/landing/FinalCta';
import { Footer } from '@/components/landing/Footer';
import { HeroSection } from '@/components/landing/HeroSection';
import { HowItWorks } from '@/components/landing/HowItWorks';
import { Navbar } from '@/components/landing/Navbar';
import { ProblemSolution } from '@/components/landing/ProblemSolution';
import { SubjectExplorer, type LandingCourse } from '@/components/landing/SubjectExplorer';
import { Testimonials } from '@/components/landing/Testimonials';
import { TrustBar, type LandingFaculty } from '@/components/landing/TrustBar';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Oqool Academy | أكاديمية عقول',
  description:
    'English-first bilingual secondary STEM mastery for Egypt and Saudi Arabia, with live teaching, structured curriculum, exams, and parent progress tracking.',
};

const FALLBACK_COURSES: LandingCourse[] = [
  'Physics',
  'Pure Mathematics',
  'Mechanics',
  'Chemistry',
  'Biology',
].map((subject, index) => ({
  chapterCount: 0,
  grade: (['1st Sec', '2nd Sec', '3rd Sec'] as const)[index % 3],
  id: `path-${subject.toLowerCase().replaceAll(' ', '-')}`,
  instructorAvatar: null,
  instructorName: 'Oqool Faculty',
  previewLessonId: null,
  subject: subject as LandingCourse['subject'],
  title: `${subject} mastery path`,
}));

function secondaryGrade(value: string | null): LandingCourse['grade'] | null {
  if (value === 'GRADE_10') return '1st Sec';
  if (value === 'GRADE_11') return '2nd Sec';
  if (value === 'GRADE_12') return '3rd Sec';
  return null;
}

function courseSubject(value: string): LandingCourse['subject'] | null {
  const normalized = value.toLowerCase();
  if (normalized.includes('mechanic')) return 'Mechanics';
  if (normalized.includes('physics')) return 'Physics';
  if (normalized.includes('chem')) return 'Chemistry';
  if (normalized.includes('bio')) return 'Biology';
  if (
    normalized.includes('math') ||
    normalized.includes('calculus') ||
    normalized.includes('algebra')
  ) {
    return 'Pure Mathematics';
  }
  return null;
}

async function landingData() {
  try {
    const prisma = getPrisma();
    const [courses, faculty, nextClass] = await Promise.all([
      prisma.course.findMany({
        where: { isPublished: true },
        orderBy: { title: 'asc' },
        select: {
          gradeLevel: true,
          id: true,
          modules: {
            orderBy: { position: 'asc' },
            select: {
              lessons: {
                orderBy: { position: 'asc' },
                select: { id: true, isFree: true },
              },
            },
          },
          subject: { select: { name: true } },
          teacher: { select: { avatarUrl: true, name: true } },
          title: true,
        },
      }),
      prisma.user.findMany({
        where: {
          status: 'ACTIVE',
          OR: [{ role: 'TEACHER' }, { courses: { some: { isPublished: true } } }],
        },
        orderBy: { name: 'asc' },
        select: {
          avatarUrl: true,
          bio: true,
          headline: true,
          id: true,
          name: true,
          teacherSubjects: { select: { name: true } },
        },
        take: 6,
      }),
      prisma.zoomSession.findFirst({
        where: { startTime: { gte: new Date() }, course: { isPublished: true } },
        orderBy: { startTime: 'asc' },
        select: { startTime: true, title: true },
      }),
    ]);

    const published: LandingCourse[] = courses.flatMap((course) => {
      const grade = secondaryGrade(course.gradeLevel);
      const subject = courseSubject(
        `${course.subject?.name ?? ''} ${course.title}`,
      );
      if (!grade || !subject) return [];

      const lessons = course.modules.flatMap((module) => module.lessons);
      return [{
        chapterCount: course.modules.length,
        grade,
        id: course.id,
        instructorAvatar: course.teacher.avatarUrl,
        instructorName: course.teacher.name ?? 'Oqool Faculty',
        previewLessonId: lessons.find((lesson) => lesson.isFree)?.id ?? null,
        subject,
        title: course.title,
      }];
    });
    const facultyCards: LandingFaculty[] = faculty.map((teacher) => ({
      avatarUrl: teacher.avatarUrl,
      credential:
        teacher.headline ??
        teacher.bio?.slice(0, 120) ??
        'Oqool Academy academic specialist',
      id: teacher.id,
      name: teacher.name ?? 'Oqool Faculty Member',
      subjects: teacher.teacherSubjects.map((subject) => subject.name).slice(0, 4),
    }));

    return {
      courses: published.length ? published : FALLBACK_COURSES,
      faculty: facultyCards.length
        ? facultyCards
        : [{
            avatarUrl: null,
            credential: 'Secondary education subject specialist',
            id: 'oqool-faculty',
            name: 'Oqool Academic Faculty',
            subjects: ['Mathematics', 'Sciences', 'Languages'],
          }],
      nextClass: nextClass
        ? { startTime: nextClass.startTime.toISOString(), title: nextClass.title }
        : null,
    };
  } catch (error) {
    console.error('[LANDING_DATA]', error);
    return {
      courses: FALLBACK_COURSES,
      faculty: [{
        avatarUrl: null,
        credential: 'Secondary education subject specialist',
        id: 'oqool-faculty',
        name: 'Oqool Academic Faculty',
        subjects: ['Mathematics', 'Sciences', 'Languages'],
      }],
      nextClass: null,
    };
  }
}

export default async function RootPage() {
  const data = await landingData();

  return (
    <main className="min-h-dvh w-full min-w-0 max-w-full overflow-x-clip bg-[#FAFAF7] bg-[radial-gradient(circle_at_10%_8%,rgba(167,243,208,0.30),transparent_28%),radial-gradient(circle_at_92%_22%,rgba(254,243,199,0.48),transparent_28%)] text-[#1A2E22]">
      <Navbar />
      <HeroSection nextClass={data.nextClass} />
      <TrustBar faculty={data.faculty} />
      <ProblemSolution />
      <BentoGridFeatures />
      <HowItWorks />
      <SubjectExplorer courses={data.courses} />
      <Testimonials />
      <FaqAccordion />
      <FinalCta />
      <Footer />
    </main>
  );
}
