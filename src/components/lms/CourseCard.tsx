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
import { enrollCourseAction } from '@/app/lms/actions';
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
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { cn } from '@/lib/utils';

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

export function CourseCard({ course, enrolled, user }: CourseCardProps) {
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
  const enroll = enrollCourseAction.bind(null, course.id);
  const instructorName = course.teacher.name ?? 'Dr. Abdallah Saad';

  return (
    <Card className="group overflow-hidden border-white/10 bg-zinc-950/90 py-0 transition duration-500 hover:-translate-y-1.5 hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-950/40">
      <div className="relative aspect-video overflow-hidden bg-zinc-900">
        {course.imageUrl ? (
          <Image
            alt={`${course.title} course cover`}
            className="object-cover transition duration-700 group-hover:scale-105"
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
            src={course.imageUrl}
          />
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(192,132,252,.8),transparent_26%),radial-gradient(circle_at_85%_75%,rgba(59,130,246,.5),transparent_30%),linear-gradient(135deg,#18181b,#09090b)]"
          >
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.12)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.12)_1px,transparent_1px)] [background-size:28px_28px]" />
            <BookOpen className="absolute bottom-5 left-5 size-12 text-white/70 transition duration-500 group-hover:-rotate-6 group-hover:scale-110" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/10" />
        <Badge className="absolute right-3 top-3 border-white/10 bg-black/70 text-white backdrop-blur-md">
          {categories[0]}
        </Badge>
        <span className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/65 px-2.5 py-1 text-[10px] font-bold text-zinc-200 backdrop-blur-md">
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
            <span className="block truncate text-xs font-black text-zinc-200">
              {instructorName}
            </span>
            <span className="block text-[10px] font-medium text-zinc-500">
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
          <span className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-zinc-400">
            <Layers3 className="size-3.5 shrink-0 text-violet-300" aria-hidden="true" />
            <span className="truncate">
              {course.modules.length} {course.modules.length === 1 ? 'Module' : 'Modules'}
            </span>
          </span>
          <span className="flex min-w-0 items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-zinc-400">
            {lessonTypes.has('PDF') ? (
              <FileText className="size-3.5 shrink-0 text-fuchsia-300" aria-hidden="true" />
            ) : (
              <PlayCircle className="size-3.5 shrink-0 text-fuchsia-300" aria-hidden="true" />
            )}
            <span className="truncate">{contentLabel(lessonTypes)}</span>
          </span>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-zinc-500">
          {course._count.zoomSessions > 0 ? (
            <Radio className="size-3 text-emerald-300" aria-hidden="true" />
          ) : (
            <BookOpen className="size-3 text-violet-300" aria-hidden="true" />
          )}
          {lessonCount} {lessonCount === 1 ? 'lesson' : 'lessons'}
          {course._count.zoomSessions > 0
            ? ` · ${course._count.zoomSessions} live ${course._count.zoomSessions === 1 ? 'session' : 'sessions'}`
            : ''}
        </p>
      </CardContent>

      <CardFooter className="pt-5">
        {user?.role === 'STUDENT' ? (
          <form action={enroll} className="w-full">
            <ActionSubmitButton
              className="flex h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-400 to-fuchsia-500 px-4 text-sm font-black text-black shadow-lg shadow-violet-950/30 transition hover:from-violet-300 hover:to-fuchsia-400"
              pendingLabel={enrolled ? 'Opening…' : 'Enrolling…'}
            >
              {enrolled ? 'Continue course' : 'Enroll now'}
              <ArrowRight className="size-4" aria-hidden="true" />
            </ActionSubmitButton>
          </form>
        ) : user ? (
          <Link
            className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
            href={
              user.role === 'ADMIN' || user.role === 'TEACHER'
                ? '/teacher/courses'
                : '/dashboard'
            }
          >
            Open your workspace
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        ) : (
          <Link
            className={cn(
              buttonVariants(),
              'w-full bg-gradient-to-r from-violet-400 to-fuchsia-500 text-black hover:from-violet-300 hover:to-fuchsia-400',
            )}
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
