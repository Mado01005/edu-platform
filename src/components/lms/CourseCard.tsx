import Image from 'next/image';
import Link from 'next/link';
import type { ContentType, User } from '@prisma/client';
import {
  ArrowRight,
  BookOpen,
  FileText,
  Layers3,
  PlayCircle,
  Radio,
  Users,
} from 'lucide-react';
import { CourseAccessActions } from '@/components/checkout/CourseAccessActions';
import type { CheckoutChannel } from '@/components/checkout/online-checkout-modal';
import { Avatar, AvatarFallback } from '@/components/UI/avatar';
import { Badge } from '@/components/UI/badge';
import { buttonVariants } from '@/components/UI/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/UI/card';
import { cn } from '@/lib/utils';
import { isTeachingRole } from '@/lib/lms/roles';

export const COURSE_CATEGORIES = [
  'All Courses',
  'Web Development',
  'Cloud & DevOps',
  'Computer Science',
  'Live Sessions',
] as const;

export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

export interface CatalogCourse {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  priceEGP: string;
  priceUSD: string;
  teacher: { name: string | null };
  modules: Array<{
    lessons: Array<{ contentType: ContentType }>;
  }>;
  _count: {
    enrollments: number;
    zoomSessions: number;
  };
}

interface CourseCardProps {
  course: CatalogCourse;
  channels: CheckoutChannel[];
  enrolled: boolean;
  user: Pick<User, 'role'> | null;
}

export function getCourseCategories(course: CatalogCourse): CourseCategory[] {
  const searchable = `${course.title} ${course.description ?? ''}`.toLowerCase();
  const categories: CourseCategory[] = [];

  if (/(web|next|react|full[ -]?stack|javascript|typescript)/.test(searchable)) {
    categories.push('Web Development');
  }
  if (/(cloud|devops|r2|aws|docker|kubernetes|architecture)/.test(searchable)) {
    categories.push('Cloud & DevOps');
  }
  if (/(computer|algorithm|database|postgres|prisma|data structure)/.test(searchable)) {
    categories.push('Computer Science');
  }
  if (course._count.zoomSessions > 0) {
    categories.push('Live Sessions');
  }

  return categories.length ? categories : ['Computer Science'];
}

function instructorInitials(name: string | null) {
  const value = name?.trim() || 'Way Ground';
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function contentLabel(types: Set<ContentType>) {
  const hasVideo =
    types.has('VIMEO') || types.has('YOUTUBE') || types.has('R2_VIDEO');
  const hasPdf = types.has('PDF');

  if (hasVideo && hasPdf) return 'Videos + PDFs';
  if (hasVideo) return 'Video lessons';
  if (hasPdf) return 'PDF resources';
  return 'Guided lessons';
}

export function CourseCard({ channels, course, enrolled, user }: CourseCardProps) {
  const lessonTypes = new Set(
    course.modules.flatMap((module) =>
      module.lessons.map((lesson) => lesson.contentType),
    ),
  );
  const lessonCount = course.modules.reduce(
    (total, module) => total + module.lessons.length,
    0,
  );
  const categories = getCourseCategories(course);
  const instructorName = course.teacher.name ?? 'Dr. Abdallah Saad';

  return (
    <Card className="group overflow-hidden py-0 transition duration-200 hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-sm">
      <div className="relative aspect-video overflow-hidden bg-slate-100">
        {course.imageUrl ? (
          <Image
            alt={`${course.title} course cover`}
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            src={course.imageUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-sky-100"
          >
            <BookOpen className="absolute bottom-5 left-5 size-12 text-sky-600 transition duration-300 group-hover:-rotate-3" />
          </div>
        )}
        <Badge className="absolute right-3 top-3 border-slate-200 bg-white text-slate-700 shadow-sm">
          {categories[0]}
        </Badge>
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-600 shadow-sm">
          <Users className="size-3" aria-hidden="true" />
          {course._count.enrollments} learners
        </span>
      </div>

      <CardHeader className="gap-3 pt-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar className="size-8">
            <AvatarFallback className="text-[10px]">
              {instructorInitials(course.teacher.name)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0">
            <span className="block truncate text-xs font-semibold text-slate-700">
              {instructorName}
            </span>
            <span className="block text-[10px] font-medium text-slate-500">
              Course instructor
            </span>
          </span>
        </div>
        <CardTitle className="line-clamp-2 min-h-14 break-words text-xl">
          {course.title}
        </CardTitle>
        <CardDescription className="line-clamp-3 min-h-[4.5rem]">
          {course.description ??
            'A structured course with practical lessons and guided resources.'}
        </CardDescription>
      </CardHeader>

      <CardContent className="mt-5">
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <span className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            <Layers3 className="size-3.5 shrink-0 text-sky-600" aria-hidden="true" />
            <span className="truncate">
              {course.modules.length} {course.modules.length === 1 ? 'Module' : 'Modules'}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
            {lessonTypes.has('PDF') ? (
              <FileText className="size-3.5 shrink-0 text-sky-600" aria-hidden="true" />
            ) : (
              <PlayCircle className="size-3.5 shrink-0 text-sky-600" aria-hidden="true" />
            )}
            <span className="truncate">{contentLabel(lessonTypes)}</span>
          </span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
          {course._count.zoomSessions > 0 ? (
            <Radio className="size-3 text-emerald-600" aria-hidden="true" />
          ) : (
            <BookOpen className="size-3 text-sky-600" aria-hidden="true" />
          )}
          {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
          {course._count.zoomSessions > 0
            ? ` · ${course._count.zoomSessions} live ${course._count.zoomSessions === 1 ? 'session' : 'sessions'}`
            : ''}
        </p>
        {Number(course.priceEGP) > 0 || Number(course.priceUSD) > 0 ? (
          <p className="mt-3 text-sm font-bold text-slate-900">
            {Number(course.priceEGP) > 0 ? `${course.priceEGP} EGP` : ''}
            {Number(course.priceEGP) > 0 && Number(course.priceUSD) > 0 ? ' · ' : ''}
            {Number(course.priceUSD) > 0 ? `${course.priceUSD} USD` : ''}
          </p>
        ) : (
          <p className="mt-3 text-sm font-bold text-emerald-700">Free access</p>
        )}
      </CardContent>

      <CardFooter className="pt-5">
        {user?.role === 'STUDENT' ? (
          <CourseAccessActions channels={channels} course={course} enrolled={enrolled} />
        ) : user ? (
          <Link
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            href={
              isTeachingRole(user.role)
                ? '/teacher/courses'
                : '/dashboard'
            }
          >
            Open your workspace
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <Link
            className={cn(buttonVariants(), 'w-full')}
            href={`/lms/login?next=${encodeURIComponent('/catalog')}`}
          >
            Sign in to enroll
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
