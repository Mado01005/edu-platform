import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, MessageCircle } from 'lucide-react';
import { OqoolEmblem, OqoolWordmark } from '@/components/branding/OqoolBrand';
import { FacultyGrid, type LandingFaculty } from '@/components/landing/faculty-grid';
import { LiveClassTicker } from '@/components/landing/live-class-ticker';
import { StudentDashboardPreview } from '@/components/landing/student-dashboard-preview';
import { SubjectGrid, type LandingCourse } from '@/components/landing/subject-grid';
import { LanguageToggle } from '@/components/i18n/language-provider';
import { siteConfig } from '@/config/site';
import { getPrisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Oqool Academy | أكاديمية عقول',
  description:
    'English-first bilingual secondary education for Egypt and Saudi Arabia, with live masterclasses, structured curriculum, exams, and parent progress tracking.',
};

const FALLBACK_COURSES: LandingCourse[] = [
  'Physics',
  'Pure Mathematics',
  'Mechanics',
  'Chemistry',
  'Biology',
  'Languages',
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

function courseSubject(value: string): LandingCourse['subject'] {
  const normalized = value.toLowerCase();
  if (normalized.includes('mechanic')) return 'Mechanics';
  if (normalized.includes('physics')) return 'Physics';
  if (normalized.includes('chem')) return 'Chemistry';
  if (normalized.includes('bio')) return 'Biology';
  if (normalized.includes('language') || normalized.includes('english') || normalized.includes('arabic')) return 'Languages';
  return 'Pure Mathematics';
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
      if (!grade) return [];
      const lessons = course.modules.flatMap((module) => module.lessons);
      const subject = courseSubject(`${course.subject?.name ?? ''} ${course.title}`);
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
      credential: teacher.headline ?? teacher.bio?.slice(0, 120) ?? 'Oqool Academy academic specialist',
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
    <main className="w-full min-w-0 overflow-x-hidden bg-[#F8FAF8] text-[#1A2E22]">
      <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <Link aria-label="Oqool Academy home" className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-emerald-200" href="/">
            <OqoolEmblem className="size-11" />
            <OqoolWordmark className="hidden sm:block" />
          </Link>
          <nav aria-label="Primary navigation" className="hidden items-center gap-7 lg:flex">
            <a className="text-sm font-bold text-slate-600 hover:text-[#084B2B]" href="#curriculum">Curriculum <span className="text-xs text-[#0F6E41]">المناهج</span></a>
            <a className="text-sm font-bold text-slate-600 hover:text-[#084B2B]" href="#faculty">Faculty <span className="text-xs text-[#0F6E41]">هيئة التدريس</span></a>
            <a className="text-sm font-bold text-slate-600 hover:text-[#084B2B]" href="#live-schedule">Live Schedule <span className="text-xs text-[#0F6E41]">المحاضرات المباشرة</span></a>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <LanguageToggle className="px-2 sm:px-3" />
            <Link className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D4AF37]/70 bg-[#084B2B] px-3 text-xs font-extrabold text-white hover:bg-[#0F6E41] sm:px-5 sm:text-sm" href="/lms/login">
              Sign In <span className="mx-1 text-[#F3D878]">/</span> دخول المنصة
            </Link>
          </div>
        </div>
      </header>

      <section className="relative border-b border-emerald-950/10 bg-white" id="live-schedule">
        <div aria-hidden="true" className="oqool-orbit absolute inset-0 opacity-50" />
        <div className="relative mx-auto grid min-h-[calc(100svh-5rem)] w-full max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div className="min-w-0 max-w-2xl">
            <LiveClassTicker startTime={data.nextClass?.startTime ?? null} title={data.nextClass?.title ?? null} />
            <p className="mt-8 text-xs font-black uppercase tracking-[0.22em] text-[#0F6E41]">Egypt · KSA · Secondary excellence</p>
            <h1 className="mt-4 text-5xl font-black leading-[0.98] tracking-[-0.045em] text-[#042D1A] sm:text-6xl lg:text-7xl">
              <span data-language-copy="en">Grow Minds.<br />Shape the Future.</span>
              <span data-language-copy="ar" className="font-arabic">نُنَمِّي العقول...<br />ونصنع المستقبل</span>
            </h1>
            <p className="mt-7 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              <span data-language-copy="en">A protected academic platform for Egyptian and Saudi secondary students—live teaching, chapter mastery, timed exams, and clear family progress reports.</span>
              <span data-language-copy="ar">منصة أكاديمية آمنة لطلاب المرحلة الثانوية في مصر والسعودية: شرح مباشر، وإتقان للفصول، واختبارات زمنية، وتقارير واضحة للأسرة.</span>
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-6 text-sm font-extrabold text-white hover:bg-[#0F6E41]" href="#curriculum">
                <span data-language-copy="en">Explore the curriculum</span><span data-language-copy="ar">استكشف المناهج</span>
                <ArrowRight aria-hidden="true" className="size-4 rtl:rotate-180" />
              </Link>
              <Link className="inline-flex min-h-12 items-center justify-center rounded-xl border border-emerald-950/15 bg-white px-6 text-sm font-extrabold text-[#084B2B] hover:border-[#D4AF37] hover:bg-[#FBF6E2]" href="/catalog">
                <span data-language-copy="en">View all courses</span><span data-language-copy="ar">شاهد كل الدورات</span>
              </Link>
            </div>
          </div>
          <StudentDashboardPreview />
        </div>
      </section>

      <section aria-label="Oqool Academy motto" className="bg-[#084B2B] text-white">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-1 divide-y divide-white/15 px-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-6 lg:px-8">
          {siteConfig.motto.map((item) => (
            <div className="flex min-h-20 items-center justify-center gap-3 px-3 text-center text-sm font-extrabold" key={item.label}>
              <span aria-hidden="true">{item.icon}</span>
              <span data-language-copy="en">{item.label}</span>
              <span data-language-copy="ar">{item.labelArabic}</span>
            </div>
          ))}
        </div>
      </section>

      <SubjectGrid courses={data.courses} />

      <section className="border-y border-emerald-950/10 bg-[#042D1A] py-16 text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
          {siteConfig.values.map((value) => (
            <article className="rounded-2xl border border-white/12 bg-white/[0.04] p-5" key={value.title}>
              <span className="text-2xl" aria-hidden="true">{value.icon}</span>
              <h2 className="mt-5 font-extrabold"><span data-language-copy="en">{value.title}</span><span data-language-copy="ar">{value.titleArabic}</span></h2>
              <p className="mt-2 text-sm leading-6 text-emerald-100/70"><span data-language-copy="en">{value.description}</span><span data-language-copy="ar">{value.descriptionArabic}</span></p>
            </article>
          ))}
        </div>
      </section>

      <FacultyGrid faculty={data.faculty} />

      <section className="bg-[#FBF6E2] py-16">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6">
          <CheckCircle2 aria-hidden="true" className="size-9 text-[#084B2B]" />
          <h2 className="mt-5 text-3xl font-black text-[#1A2E22] sm:text-4xl"><span data-language-copy="en">Ready to build lasting mastery?</span><span data-language-copy="ar">هل أنت مستعد لبناء فهم يدوم؟</span></h2>
          <Link className="mt-7 inline-flex min-h-12 items-center justify-center rounded-xl bg-[#084B2B] px-7 text-sm font-extrabold text-white hover:bg-[#0F6E41]" href="/lms/login?mode=signup"><span data-language-copy="en">Create a student account</span><span data-language-copy="ar">أنشئ حساب الطالب</span></Link>
        </div>
      </section>

      <footer className="bg-[#042D1A] text-white">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.3fr_0.7fr_0.8fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3"><OqoolEmblem className="size-12" /><OqoolWordmark className="[&_span]:text-white" /></div>
            <p className="mt-5 max-w-md text-sm leading-7 text-emerald-100/70"><span data-language-copy="en">Structured learning, expert teaching, and real progress for every family.</span><span data-language-copy="ar">تعلم منظم، ومعلمون خبراء، وتقدم حقيقي لكل أسرة.</span></p>
          </div>
          <nav aria-label="Footer navigation" className="flex flex-col items-start gap-3 text-sm text-emerald-100/75">
            <a className="hover:text-white" href="#curriculum">Curriculum · المناهج</a>
            <a className="hover:text-white" href="#faculty">Faculty · هيئة التدريس</a>
            <Link className="hover:text-white" href="/privacy">Privacy · الخصوصية</Link>
            <Link className="hover:text-white" href="/terms">Terms · الشروط</Link>
          </nav>
          <div>
            <a className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D4AF37]/45 px-4 text-sm font-extrabold text-[#F3D878] hover:bg-white/5" href={siteConfig.support.whatsappUrl} rel="noopener noreferrer" target="_blank"><MessageCircle aria-hidden="true" className="size-4" /> WhatsApp support</a>
            <a className="mt-3 block text-sm text-emerald-100/70 hover:text-white" href={`mailto:${siteConfig.support.email}`}>{siteConfig.support.email}</a>
          </div>
        </div>
        <div className="border-t border-[#D4AF37]/20 px-4 py-5 text-center text-xs text-emerald-100/55">© {new Date().getFullYear()} {siteConfig.title}. All rights reserved.</div>
      </footer>
    </main>
  );
}
