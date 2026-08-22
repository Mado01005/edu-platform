import Image from 'next/image';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Layers3,
  Search,
  SlidersHorizontal,
  Video,
  Zap,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/UI/button';
import { Card } from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import { CourseCard } from '@/components/lms/CourseCard';
import { LmsHeader } from '@/components/lms/LmsHeader';
import { getLmsUser } from '@/lib/lms/auth';
import { serializeCoursePrice } from '@/lib/lms/catalog-serialization';
import { withPrismaRetry } from '@/lib/prisma';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
export const revalidate = 60;

const getCachedPublishedCourses = unstable_cache(
  async () => {
    const courses = await withPrismaRetry((database) =>
      database.course.findMany({
        where: { isPublished: true },
        select: {
          id: true,
          title: true,
          description: true,
          imageUrl: true,
          priceEGP: true,
          priceUSD: true,
          gradeLevel: true,
          subject: { select: { grade: true, id: true, name: true } },
          teacher: { select: { name: true } },
          modules: {
            orderBy: { position: 'asc' },
            select: {
              lessons: {
                orderBy: { position: 'asc' },
                select: { contentType: true },
              },
            },
          },
          _count: { select: { enrollments: true, zoomSessions: true } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 500,
      }),
    );

    // Cache only JSON-safe values. Prisma Decimal instances are converted to
    // strings by Next's data cache, so serializing here keeps cache hits and
    // misses identical at runtime.
    return courses.map((course) => ({
      ...course,
      priceEGP: serializeCoursePrice(course.priceEGP),
      priceUSD: serializeCoursePrice(course.priceUSD),
    }));
  },
  ['published-course-catalog-v3'],
  { revalidate: 60, tags: ['catalog'] },
);

const getCachedPaymentChannels = unstable_cache(
  async () =>
    withPrismaRetry((database) =>
      database.paymentChannel.findMany({
        where: { isActive: true },
        orderBy: { displayName: 'asc' },
        select: {
          accountValue: true,
          currency: true,
          displayName: true,
          instructions: true,
          method: true,
        },
      }),
    ),
  ['active-payment-channels-v1'],
  { revalidate: 60, tags: ['catalog'] },
);

function categoryHref(category: string, query: string) {
  const params = new URLSearchParams();

  if (query) params.set('q', query);
  if (category !== 'all') params.set('category', category);

  const search = params.toString();
  return search ? `/catalog?${search}` : '/catalog';
}

const featureMetrics = [
  {
    icon: Zap,
    label: 'Active Students',
    value: '300+',
  },
  {
    icon: Video,
    label: 'Live Interactive Zoom Sessions',
    value: 'Live',
  },
  {
    icon: Layers3,
    label: 'Structured Course Modules & Resources',
    value: 'Guided',
  },
] as const;

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const userPromise = getLmsUser();
  const enrollmentRowsPromise = userPromise.then((user) =>
    user?.role === 'STUDENT'
      ? withPrismaRetry((database) =>
          database.enrollment.findMany({
            where: { studentId: user.id },
            select: { courseId: true },
          }),
        )
      : [],
  );
  const [
    { category, q },
    user,
    cachedCatalog,
    cachedPaymentChannels,
    enrollmentRows,
  ] =
    await Promise.all([
      searchParams,
      userPromise,
      getCachedPublishedCourses(),
      getCachedPaymentChannels(),
      enrollmentRowsPromise,
    ]);
  const query = q?.trim().slice(0, 100) ?? '';
  const gradeOptions = Array.from(
    new Set(cachedCatalog.map((course) => course.gradeLevel).filter(Boolean)),
  )
    .sort()
    .map((grade) => ({
      id: `grade:${grade}`,
      label: `Grade ${String(grade).replace('GRADE_', '')}`,
    }));
  const subjectOptions = Array.from(
    new Map(
      cachedCatalog
        .filter((course) => course.subject)
        .map((course) => [course.subject!.id, course.subject!]),
    ).values(),
  )
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((subject) => ({
      id: `subject:${subject.id}`,
      label: subject.name,
    }));
  const categoryOptions = [
    { id: 'all', label: 'All Courses' },
    ...gradeOptions,
    ...subjectOptions,
  ];
  const activeCategory = categoryOptions.some(
    (option) => option.id === category,
  )
    ? category!
    : 'all';
  const enrolledCourseIds = new Set(
    enrollmentRows.map(({ courseId }) => courseId),
  );
  const normalizedQuery = query.toLocaleLowerCase();
  const catalog = normalizedQuery
    ? cachedCatalog.filter((course) =>
        [course.title, course.description ?? '', course.subject?.name ?? ''].some(
          (value) => value.toLocaleLowerCase().includes(normalizedQuery),
        ),
      )
    : cachedCatalog;
  const paymentChannels =
    user?.role === 'STUDENT' ? cachedPaymentChannels : [];
  const courses =
    activeCategory === 'all'
      ? catalog
      : catalog.filter((course) =>
          activeCategory.startsWith('grade:')
            ? course.gradeLevel === activeCategory.slice(6)
            : activeCategory.startsWith('subject:') &&
              course.subject?.id === activeCategory.slice(8),
        );

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAF7] text-slate-900">
      <LmsHeader user={user} />

      <main className="mx-auto flex w-full max-w-[92rem] min-w-0 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8 lg:gap-10">
        <section className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white shadow-sm shadow-emerald-950/5">
          <div className="grid min-w-0 lg:min-h-[25rem] lg:grid-cols-2 lg:items-stretch">
            <div className="flex min-w-0 flex-col justify-center p-6 sm:p-10 lg:p-12">
              <h1 className="max-w-2xl text-4xl font-bold leading-[1.08] tracking-[-0.035em] text-slate-900 sm:text-5xl lg:text-6xl">
                Courses built for real progress.
              </h1>
              <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
                Learn through structured paths, expert-led video, protected
                in-app resources, and live classes—all inside one thoughtfully
                designed workspace.
              </p>
              <div className="mt-7 flex min-w-0 flex-col gap-3 sm:flex-row">
                <Link
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'shadow-sm',
                  )}
                  href="#course-catalog"
                >
                  Browse catalog
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
                <Link
                  className={buttonVariants({ size: 'lg', variant: 'outline' })}
                  href="/live-classes"
                >
                  <CalendarDays className="size-4" aria-hidden="true" />
                  View schedule
                </Link>
              </div>
            </div>
            <div className="relative min-h-64 overflow-hidden bg-slate-100 lg:min-h-full">
              <Image
                alt="A learner taking notes while studying online at home"
                className="object-cover object-center"
                fill
                priority
                sizes="(min-width: 1024px) 50vw, 100vw"
                src="/images/catalog-learning-hero.png"
              />
            </div>
          </div>
        </section>

        <section className="grid min-w-0 gap-4 rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm shadow-emerald-950/5 sm:grid-cols-3 sm:p-6">
          {featureMetrics.map(({ icon: Icon, label, value }) => (
            <div className="flex min-w-0 items-center gap-3 sm:border-r sm:border-emerald-950/10 sm:last:border-r-0" key={label}>
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-[#084B2B]">
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-xl font-bold text-slate-900">{value}</span>
                <span className="block text-xs text-slate-500">{label}</span>
              </span>
            </div>
          ))}
        </section>

        <section
          className="scroll-mt-32"
          id="course-catalog"
        >
          <div className="mb-6 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#084B2B]">
                <BookOpen className="size-4" aria-hidden="true" />
                Course catalog
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                Find your next skill.
              </h2>
            </div>
            <p className="text-sm font-medium text-slate-500">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'} available
            </p>
          </div>

          <form className="flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-emerald-950/10 bg-white p-2 shadow-sm shadow-emerald-950/5 sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search courses</span>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <Input
                className="h-12 border-transparent bg-transparent pl-11 focus:border-[#084B2B]"
                defaultValue={query}
                name="q"
                placeholder="Search courses, skills, or instructors"
                type="search"
              />
            </label>
            {activeCategory !== 'all' ? (
              <input name="category" type="hidden" value={activeCategory} />
            ) : null}
            <Button className="h-12 shrink-0 px-6" type="submit">
              Search
            </Button>
          </form>

          <div
            aria-label="Course categories"
            className="mt-4 flex min-w-0 flex-wrap gap-2"
            role="navigation"
          >
            {categoryOptions.map((courseCategory) => {
              const active = courseCategory.id === activeCategory;

              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-w-0 items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-medium transition-colors',
                    active
                      ? 'border-emerald-200 bg-emerald-100 text-[#084B2B]'
                      : 'border-emerald-950/10 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#084B2B]',
                  )}
                  href={categoryHref(courseCategory.id, query)}
                  key={courseCategory.id}
                >
                  {courseCategory.id === 'all' ? (
                    <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  ) : null}
                  {courseCategory.label}
                </Link>
              );
            })}
          </div>

          {courses.length ? (
            <div className="mt-7 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
              {courses.map((course) => (
                <CourseCard
                  channels={paymentChannels}
                  course={course}
                  enrolled={enrolledCourseIds.has(course.id)}
                  key={course.id}
                  user={user}
                />
              ))}
            </div>
          ) : (
            <Card className="mt-7 items-center border-dashed p-10 text-center sm:p-14">
              <span className="flex size-12 items-center justify-center rounded-xl bg-emerald-100 text-[#084B2B]">
                <Search className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">No matching courses</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
                Try another search phrase or choose a different category.
              </p>
              <Link
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'mt-5',
                )}
                href="/catalog"
              >
                Clear filters
              </Link>
            </Card>
          )}
        </section>
      </main>

      <footer className="mt-10 border-t border-[#D4AF37]/25 bg-[#042917] text-white">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-4 px-4 py-7 text-sm text-emerald-100/75 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Oqool Academy. Structured learning, clearly protected.</p>
          <nav aria-label="Legal and support links" className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link className="hover:text-white" href="/privacy">Privacy</Link>
            <Link className="hover:text-white" href="/terms">Terms</Link>
            <a className="hover:text-white" href="mailto:support@edu-platform.me">Support</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
