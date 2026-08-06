import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Layers3,
  Search,
  SlidersHorizontal,
  Sparkles,
  Video,
  Zap,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/UI/button';
import { Card } from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import {
  COURSE_CATEGORIES,
  CourseCard,
  getCourseCategories,
  type CourseCategory,
} from '@/components/lms/CourseCard';
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
  ['published-course-catalog-v2'],
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

function selectedCategory(value: string | undefined): CourseCategory {
  return COURSE_CATEGORIES.includes(value as CourseCategory)
    ? (value as CourseCategory)
    : 'All Courses';
}

function categoryHref(category: CourseCategory, query: string) {
  const params = new URLSearchParams();

  if (query) params.set('q', query);
  if (category !== 'All Courses') params.set('category', category);

  const search = params.toString();
  return search ? `/catalog?${search}` : '/catalog';
}

const featureMetrics = [
  {
    icon: Zap,
    label: 'Active Students',
    value: '300+',
    accent: 'text-amber-300',
    glow: 'bg-amber-400/15',
  },
  {
    icon: Video,
    label: 'Live Interactive Zoom Sessions',
    value: 'Live',
    accent: 'text-cyan-300',
    glow: 'bg-cyan-400/15',
  },
  {
    icon: Layers3,
    label: 'Structured Course Modules & Resources',
    value: 'Guided',
    accent: 'text-violet-300',
    glow: 'bg-violet-400/15',
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
  const activeCategory = selectedCategory(category);
  const enrolledCourseIds = new Set(
    enrollmentRows.map(({ courseId }) => courseId),
  );
  const normalizedQuery = query.toLocaleLowerCase();
  const catalog = normalizedQuery
    ? cachedCatalog.filter((course) =>
        [course.title, course.description ?? ''].some((value) =>
          value.toLocaleLowerCase().includes(normalizedQuery),
        ),
      )
    : cachedCatalog;
  const paymentChannels =
    user?.role === 'STUDENT' ? cachedPaymentChannels : [];
  const courses =
    activeCategory === 'All Courses'
      ? catalog
      : catalog.filter((course) =>
          getCourseCategories(course).includes(activeCategory),
        );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[720px] bg-[radial-gradient(circle_at_18%_15%,rgba(124,58,237,.22),transparent_30%),radial-gradient(circle_at_82%_12%,rgba(37,99,235,.16),transparent_28%)]"
      />
      <LmsHeader user={user} />

      <main className="relative mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-10 px-4 py-8 sm:px-6 sm:py-12 lg:gap-14 lg:py-16">
        <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/70 p-5 shadow-2xl shadow-violet-950/20 backdrop-blur-sm sm:p-8 lg:p-10">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 size-72 rounded-full bg-violet-500/15 blur-3xl"
          />
          <div className="relative grid min-w-0 gap-10 lg:grid-cols-12 lg:items-center">
            <div className="min-w-0 lg:col-span-7">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Built for focused learning
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
                Courses built for
                <span className="mt-1 block bg-gradient-to-r from-violet-300 via-fuchsia-300 to-cyan-300 bg-clip-text text-transparent">
                  real progress.
                </span>
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
                Learn through structured paths, expert-led video, downloadable
                resources, and live classes—all inside one thoughtfully designed
                workspace.
              </p>
              <div className="mt-7 flex min-w-0 flex-col gap-3 sm:flex-row">
                <Link
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'bg-gradient-to-r from-violet-400 to-fuchsia-500 text-black shadow-xl shadow-violet-950/40 hover:from-violet-300 hover:to-fuchsia-400',
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

            <Card className="relative overflow-hidden border-white/10 bg-black/55 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6 lg:col-span-5">
              <div
                aria-hidden="true"
                className="absolute -right-12 -top-12 size-40 rounded-full bg-fuchsia-500/15 blur-3xl"
              />
              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-500">
                  Way Ground network
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  Learn with momentum.
                </h2>
                <div className="mt-5 flex min-w-0 flex-col gap-3">
                  {featureMetrics.map(
                    ({ accent, glow, icon: Icon, label, value }) => (
                      <div
                        className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.035] p-3.5"
                        key={label}
                      >
                        <span
                          className={cn(
                            'flex size-10 shrink-0 items-center justify-center rounded-xl',
                            glow,
                            accent,
                          )}
                        >
                          <Icon className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xl font-black text-white">
                            {value}
                          </span>
                          <span className="block truncate text-xs font-medium text-zinc-500">
                            {label}
                          </span>
                        </span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </Card>
          </div>
        </section>

        <section
          className="scroll-mt-32"
          id="course-catalog"
        >
          <div className="mb-6 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
                <BookOpen className="size-4" aria-hidden="true" />
                Course catalog
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Find your next skill.
              </h2>
            </div>
            <p className="text-sm font-medium text-zinc-500">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'} available
            </p>
          </div>

          <form className="flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2 backdrop-blur-md sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search courses</span>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                aria-hidden="true"
              />
              <Input
                className="h-12 border-transparent bg-transparent pl-11 focus:border-purple-500/50"
                defaultValue={query}
                name="q"
                placeholder="Search courses, skills, or instructors"
                type="search"
              />
            </label>
            {activeCategory !== 'All Courses' ? (
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
            {COURSE_CATEGORIES.map((courseCategory) => {
              const active = courseCategory === activeCategory;

              return (
                <Link
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-w-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-bold transition',
                    active
                      ? 'border-violet-400/40 bg-violet-400 text-black shadow-lg shadow-violet-950/30'
                      : 'border-white/10 bg-white/[0.035] text-zinc-400 hover:border-violet-400/30 hover:bg-white/[0.07] hover:text-white',
                  )}
                  href={categoryHref(courseCategory, query)}
                  key={courseCategory}
                >
                  {courseCategory === 'All Courses' ? (
                    <SlidersHorizontal className="size-3.5" aria-hidden="true" />
                  ) : null}
                  {courseCategory}
                </Link>
              );
            })}
          </div>

          {courses.length ? (
            <div className="mt-7 grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
            <Card className="mt-7 items-center border-dashed bg-zinc-950/60 p-10 text-center sm:p-14">
              <span className="flex size-12 items-center justify-center rounded-2xl bg-white/5 text-zinc-500">
                <Search className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-black">No matching courses</h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
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
    </div>
  );
}
