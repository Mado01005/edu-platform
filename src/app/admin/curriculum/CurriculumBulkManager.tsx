'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { BookOpenCheck, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/UI/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/UI/dialog';

type CurriculumItemType = 'subject' | 'course' | 'module';
type CurriculumItem = { id: string; type: CurriculumItemType };

interface CurriculumBulkManagerProps {
  courses: Array<{
    gradeLevel: string | null;
    id: string;
    modules: Array<{ id: string; lessonCount: number; title: string }>;
    subjectName: string | null;
    title: string;
  }>;
  subjects: Array<{ grade: string; id: string; name: string }>;
}

function keyFor(item: CurriculumItem) {
  return `${item.type}:${item.id}`;
}

function gradeLabel(grade: string) {
  return `Grade ${grade.replace('GRADE_', '')}`;
}

export function CurriculumBulkManager({
  courses,
  subjects,
}: CurriculumBulkManagerProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const allItems = useMemo<CurriculumItem[]>(
    () => [
      ...subjects.map((subject) => ({
        id: subject.id,
        type: 'subject' as const,
      })),
      ...courses.flatMap((course) => [
        { id: course.id, type: 'course' as const },
        ...course.modules.map((courseModule) => ({
          id: courseModule.id,
          type: 'module' as const,
        })),
      ]),
    ],
    [courses, subjects],
  );
  const allSelected =
    allItems.length > 0 &&
    allItems.every((item) => selected.has(keyFor(item)));

  function toggle(item: CurriculumItem) {
    setSelected((current) => {
      const next = new Set(current);
      const key = keyFor(item);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(allItems.map(keyFor)));
  }

  async function deleteSelected() {
    const items = allItems.filter((item) => selected.has(keyFor(item)));
    if (!items.length) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/curriculum', {
        body: JSON.stringify({ items }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      });
      const result = (await response.json()) as {
        error?: string;
        storageCleanupWarning?: string | null;
      };
      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to delete curriculum items.');
      }
      if (result.storageCleanupWarning) {
        window.alert(result.storageCleanupWarning);
      }
      setSelected(new Set());
      setConfirming(false);
      window.location.reload();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to delete curriculum items.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      <label className="flex items-center gap-3 rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-4 text-sm font-black text-slate-800">
        <input
          checked={allSelected}
          className="size-5 accent-emerald-600"
          disabled={!allItems.length}
          onChange={toggleAll}
          type="checkbox"
        />
        Select all curriculum items
        <span className="ml-auto text-xs text-slate-500">
          {selected.size} selected
        </span>
      </label>

      <section className="flex min-w-0 flex-col gap-4">
        <div className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <BookOpenCheck className="size-5 text-[#084B2B]" aria-hidden="true" />
            Subjects
          </h2>
          <ul className="mt-4 flex flex-col gap-2">
            {subjects.map((subject) => {
              const item = { id: subject.id, type: 'subject' as const };
              return (
                <li
                  className="flex min-w-0 items-center gap-3 rounded-xl border border-emerald-950/10 bg-white p-3"
                  key={subject.id}
                >
                  <input
                    aria-label={`Select subject ${subject.name}`}
                    checked={selected.has(keyFor(item))}
                    className="size-5 shrink-0 accent-emerald-600"
                    onChange={() => toggle(item)}
                    type="checkbox"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">
                    {subject.name}
                  </span>
                  <span className="shrink-0 text-xs text-slate-500">
                    {gradeLabel(subject.grade)}
                  </span>
                </li>
              );
            })}
            {!subjects.length ? (
              <li className="rounded-xl border border-dashed border-slate-300 bg-[#F8FAF7] p-5 text-center text-sm text-slate-600">
                No subjects created yet.
              </li>
            ) : null}
          </ul>
        </div>

        <div className="rounded-2xl border border-emerald-950/10 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Courses &amp; modules
          </h2>
          <ul className="mt-4 flex flex-col gap-3">
            {courses.map((course) => {
              const courseItem = { id: course.id, type: 'course' as const };
              return (
                <li
                  className="rounded-xl border border-emerald-950/10 bg-white p-3"
                  key={course.id}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <input
                      aria-label={`Select course ${course.title}`}
                      checked={selected.has(keyFor(courseItem))}
                      className="size-5 shrink-0 accent-emerald-600"
                      onChange={() => toggle(courseItem)}
                      type="checkbox"
                    />
                    <Link
                      className="min-w-0 flex-1 truncate text-sm font-black text-slate-900 hover:text-[#084B2B]"
                      href={`/teacher/courses/${course.id}`}
                    >
                      {course.title}
                    </Link>
                    <span className="shrink-0 text-xs text-slate-500">
                      {course.subjectName ??
                        (course.gradeLevel
                          ? gradeLabel(course.gradeLevel)
                          : 'All grades')}
                    </span>
                  </div>
                  {course.modules.length ? (
                    <ul className="mt-3 flex flex-col gap-2 border-l-2 border-slate-100 pl-4">
                      {course.modules.map((courseModule) => {
                        const moduleItem = {
                          id: courseModule.id,
                          type: 'module' as const,
                        };
                        return (
                          <li
                            className="flex min-w-0 items-center gap-3 rounded-lg bg-[#F8FAF7] p-2.5"
                            key={courseModule.id}
                          >
                            <input
                              aria-label={`Select module ${courseModule.title}`}
                              checked={selected.has(keyFor(moduleItem))}
                              className="size-4 shrink-0 accent-emerald-600"
                              onChange={() => toggle(moduleItem)}
                              type="checkbox"
                            />
                            <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">
                              {courseModule.title}
                            </span>
                            <span className="shrink-0 text-[11px] text-slate-500">
                              {courseModule.lessonCount} lessons
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
            {!courses.length ? (
              <li className="rounded-xl border border-dashed border-slate-300 bg-[#F8FAF7] p-5 text-center text-sm text-slate-600">
                No courses created yet.
              </li>
            ) : null}
          </ul>
        </div>
      </section>

      {selected.size ? (
        <div className="sticky bottom-4 z-30 flex justify-center px-2">
          <Button
            className="w-full max-w-md shadow-xl"
            onClick={() => setConfirming(true)}
            size="lg"
            variant="destructive"
          >
            <Trash2 className="size-4" />
            Bulk Delete Selected Items ({selected.size})
          </Button>
        </div>
      ) : null}

      <Dialog
        onOpenChange={(open) => {
          if (!pending) setConfirming(open);
        }}
        open={confirming}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selected.size} curriculum item
              {selected.size === 1 ? '' : 's'}?
            </DialogTitle>
            <DialogDescription>
              Selected subjects also delete their courses. Selected courses
              and modules delete dependent lessons and linked content records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={pending} variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={pending}
              onClick={() => void deleteSelected()}
              variant="destructive"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {pending ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
