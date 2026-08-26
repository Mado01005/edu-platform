import { Check, ChevronDown, ListTree, LockKeyhole } from 'lucide-react';
import Link from 'next/link';

type SidebarLesson = {
  completed: boolean;
  id: string;
  locked?: boolean;
  title: string;
};

type SidebarModule = {
  id: string;
  lessons: SidebarLesson[];
  title: string;
};

export function CourseSidebar({
  activeLessonId,
  courseId,
  modules,
  previewSuffix,
}: {
  activeLessonId: string;
  courseId: string;
  modules: SidebarModule[];
  previewSuffix: string;
}) {
  const lessonCount = modules.reduce(
    (count, courseModule) => count + courseModule.lessons.length,
    0,
  );

  return (
    <aside className="min-w-0 border-t border-emerald-950/10 bg-white lg:min-h-[calc(100vh-73px)] lg:border-l lg:border-t-0">
      <div className="flex items-center gap-2 border-b border-emerald-950/10 p-4 font-bold text-slate-900">
        <ListTree aria-hidden="true" className="size-4 text-[#084B2B]" />
        Course content
        <span className="ml-auto text-xs font-medium text-slate-500">
          {lessonCount} lessons
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-2 p-3">
        {modules.map((courseModule) => {
          const containsActiveLesson = courseModule.lessons.some(
            (lesson) => lesson.id === activeLessonId,
          );

          return (
            <details
              className="group min-w-0 overflow-hidden rounded-xl border border-emerald-950/10 bg-white open:border-emerald-500"
              key={courseModule.id}
              open={containsActiveLesson}
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 bg-[#F8FAF7] px-3 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-emerald-50 group-open:text-[#084B2B]">
                <span className="min-w-0 flex-1 break-words">
                  {courseModule.title}
                </span>
                <ChevronDown
                  aria-hidden="true"
                  className="size-4 shrink-0 text-slate-400 transition group-open:rotate-180"
                />
              </summary>
              <div className="border-t border-emerald-950/10 py-1">
                {courseModule.lessons.map((lesson) => {
                  const active = lesson.id === activeLessonId;
                  return (
                    <Link
                      aria-disabled={lesson.locked || undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-w-0 items-start gap-3 border-l-4 px-3 py-3 text-sm transition ${
                        active
                          ? 'border-[#084B2B] bg-emerald-50 font-medium text-[#084B2B]'
                          : lesson.locked
                            ? 'pointer-events-none border-transparent bg-slate-50 text-slate-400'
                          : 'border-transparent text-slate-600 hover:bg-[#F8FAF7] hover:text-slate-900'
                      }`}
                      href={`/courses/${courseId}/learn/lessons/${lesson.id}${previewSuffix}`}
                      key={lesson.id}
                    >
                      <span
                        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
                          lesson.completed
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {lesson.completed ? (
                          <Check aria-hidden="true" className="size-3" />
                        ) : lesson.locked ? (
                          <LockKeyhole aria-hidden="true" className="size-2.5" />
                        ) : null}
                      </span>
                      <span className="min-w-0 break-words">{lesson.title}</span>
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </aside>
  );
}
