'use client';

import type { GradeLevel } from '@prisma/client';
import { useMemo, useState } from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  Loader2,
  Search,
  Users,
} from 'lucide-react';

type TeacherOption = {
  id: string;
  name: string | null;
};

type SubjectSlot = {
  id: string | null;
  name: string;
  teacherId: string | null;
};

type GradeCard = {
  grade: GradeLevel;
  label: string;
  subjects: SubjectSlot[];
};

type StudentRecord = {
  enrolledCourses: number;
  gradeLevel: GradeLevel | null;
  id: string;
  name: string | null;
  phoneNumber: string | null;
};

interface K12ManagerProps {
  initialGrades: GradeCard[];
  initialStudents: StudentRecord[];
  teachers: TeacherOption[];
}

const MAX_BULK_STUDENTS = 500;

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(body.error || 'The requested update could not be saved.');
  }

  return body;
}

function accountLabel(student: StudentRecord) {
  return student.name?.trim() || `Student ${student.id.slice(-6)}`;
}

export function K12Manager({
  initialGrades,
  initialStudents,
  teachers,
}: K12ManagerProps) {
  const [grades, setGrades] = useState(initialGrades);
  const [students, setStudents] = useState(initialStudents);
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [targetGrade, setTargetGrade] = useState<GradeLevel | ''>('');
  const [pendingSubjects, setPendingSubjects] = useState<Set<string>>(
    () => new Set(),
  );
  const [bulkPending, setBulkPending] = useState(false);
  const [subjectNotice, setSubjectNotice] = useState('');
  const [subjectError, setSubjectError] = useState('');
  const [studentNotice, setStudentNotice] = useState('');
  const [studentError, setStudentError] = useState('');

  const gradeLabels = useMemo(
    () => new Map(grades.map(({ grade, label }) => [grade, label])),
    [grades],
  );
  const normalizedQuery = studentQuery.trim().toLowerCase();
  const filteredStudents = useMemo(
    () =>
      students.filter(
        (student) =>
          !normalizedQuery ||
          student.name?.toLowerCase().includes(normalizedQuery) ||
          student.phoneNumber?.toLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery, students],
  );
  const selectedVisibleCount = filteredStudents.filter(({ id }) =>
    selectedStudentIds.includes(id),
  ).length;
  const shouldClearVisible =
    selectedVisibleCount > 0 &&
    (selectedVisibleCount === filteredStudents.length ||
      selectedStudentIds.length >= MAX_BULK_STUDENTS);

  async function assignTeacher(
    grade: GradeLevel,
    subjectName: string,
    teacherId: string,
  ) {
    if (!teacherId) return;

    const pendingKey = `${grade}:${subjectName}`;
    setPendingSubjects((current) => new Set(current).add(pendingKey));
    setSubjectError('');
    setSubjectNotice('');

    try {
      const response = await fetch('/api/admin/k12/subjects', {
        body: JSON.stringify({ grade, subjectName, teacherId }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PUT',
      });
      const { subject } = await readResponse<{
        subject: {
          grade: GradeLevel;
          id: string;
          name: string;
          teacherId: string;
        };
      }>(response);

      setGrades((current) =>
        current.map((gradeCard) =>
          gradeCard.grade !== subject.grade
            ? gradeCard
            : {
                ...gradeCard,
                subjects: gradeCard.subjects.map((slot) =>
                  slot.name === subject.name
                    ? {
                        ...slot,
                        id: subject.id,
                        teacherId: subject.teacherId,
                      }
                    : slot,
                ),
              },
        ),
      );

      const teacher = teachers.find(({ id }) => id === subject.teacherId);
      setSubjectNotice(
        `${subjectName} in ${gradeLabels.get(grade)} is assigned to ${teacher?.name?.trim() || 'the selected teacher'}.`,
      );
    } catch (error) {
      setSubjectError(
        error instanceof Error
          ? error.message
          : 'Unable to assign this teacher.',
      );
    } finally {
      setPendingSubjects((current) => {
        const next = new Set(current);
        next.delete(pendingKey);
        return next;
      });
    }
  }

  function toggleStudent(studentId: string) {
    setStudentError('');
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds((current) =>
        current.filter((id) => id !== studentId),
      );
      return;
    }
    if (selectedStudentIds.length >= MAX_BULK_STUDENTS) {
      setStudentError(
        `Bulk updates are limited to ${MAX_BULK_STUDENTS} students at a time. Save this group before selecting more.`,
      );
      return;
    }
    setSelectedStudentIds((current) => [...current, studentId]);
  }

  function toggleVisibleStudents() {
    const visibleIds = filteredStudents.map(({ id }) => id);
    if (shouldClearVisible) {
      setSelectedStudentIds((current) =>
        current.filter((id) => !visibleIds.includes(id)),
      );
      return;
    }

    const combined = [...new Set([...selectedStudentIds, ...visibleIds])];
    if (combined.length > MAX_BULK_STUDENTS) {
      setStudentError(
        `Selected the first ${MAX_BULK_STUDENTS} students. Save this group before selecting more.`,
      );
    }
    setSelectedStudentIds(combined.slice(0, MAX_BULK_STUDENTS));
  }

  async function updateStudentGrades() {
    if (!targetGrade || selectedStudentIds.length === 0) return;

    setBulkPending(true);
    setStudentError('');
    setStudentNotice('');

    try {
      const response = await fetch('/api/admin/k12/students/grade', {
        body: JSON.stringify({
          grade: targetGrade,
          studentIds: selectedStudentIds,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const result = await readResponse<{
        grade: GradeLevel;
        studentIds: string[];
        updatedCount: number;
      }>(response);
      const updatedIds = new Set(result.studentIds);

      setStudents((current) =>
        current.map((student) =>
          updatedIds.has(student.id)
            ? { ...student, gradeLevel: result.grade }
            : student,
        ),
      );
      setSelectedStudentIds([]);
      setStudentNotice(
        `${result.updatedCount} ${result.updatedCount === 1 ? 'student was' : 'students were'} assigned to ${gradeLabels.get(result.grade)}.`,
      );
    } catch (error) {
      setStudentError(
        error instanceof Error
          ? error.message
          : 'Unable to update these student grades.',
      );
    } finally {
      setBulkPending(false);
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <section className="flex w-full min-w-0 flex-col gap-4">
        <header className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
            <BookOpenCheck className="size-4" aria-hidden="true" />
            Grade and subject manager
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight">
            Twelve grades, four core subjects each.
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Every saved subject is assigned to exactly one active teacher.
          </p>
        </header>

        {!teachers.length ? (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm font-bold text-amber-100">
            Create or promote an active teacher before assigning subject slots.
          </div>
        ) : null}
        {subjectNotice ? (
          <div
            className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100"
            role="status"
          >
            {subjectNotice}
          </div>
        ) : null}
        {subjectError ? (
          <div
            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-100"
            role="alert"
          >
            {subjectError}
          </div>
        ) : null}

        <div className="grid w-full min-w-0 grid-cols-1 gap-3">
          {grades.map((gradeCard) => (
            <article
              className="flex w-full min-w-0 flex-col gap-3 rounded-3xl border border-white/10 bg-white/[0.03] p-4"
              key={gradeCard.grade}
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                    Academic level
                  </p>
                  <h3 className="truncate text-xl font-black">
                    {gradeCard.label}
                  </h3>
                </div>
                <span className="shrink-0 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[10px] font-black text-violet-200">
                  4 subjects
                </span>
              </div>

              <div className="flex w-full min-w-0 flex-col gap-2">
                {gradeCard.subjects.map((subject) => {
                  const pendingKey = `${gradeCard.grade}:${subject.name}`;
                  const isPending = pendingSubjects.has(pendingKey);

                  return (
                    <label
                      className="flex w-full min-w-0 flex-col gap-2 rounded-2xl border border-white/5 bg-black p-3"
                      key={subject.name}
                    >
                      <span className="flex min-w-0 items-center justify-between gap-3">
                        <span className="truncate text-sm font-black">
                          {subject.name}
                        </span>
                        {subject.teacherId ? (
                          <CheckCircle2
                            className="size-4 shrink-0 text-emerald-300"
                            aria-label="Teacher assigned"
                          />
                        ) : null}
                      </span>
                      <span className="relative block w-full min-w-0">
                        <select
                          aria-label={`Primary teacher for ${subject.name} in ${gradeCard.label}`}
                          className="h-11 w-full min-w-0 appearance-none rounded-xl border border-white/10 bg-zinc-950 px-3 pr-10 text-sm font-bold text-white outline-none transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-400/10 disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={isPending || !teachers.length}
                          onChange={(event) =>
                            void assignTeacher(
                              gradeCard.grade,
                              subject.name,
                              event.target.value,
                            )
                          }
                          value={subject.teacherId ?? ''}
                        >
                          <option value="">Assign primary teacher</option>
                          {teachers.map((teacher) => (
                            <option key={teacher.id} value={teacher.id}>
                              {teacher.name?.trim() || `Teacher ${teacher.id.slice(-6)}`}
                            </option>
                          ))}
                        </select>
                        {isPending ? (
                          <Loader2
                            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-violet-300"
                            aria-hidden="true"
                          />
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="flex w-full min-w-0 flex-col gap-4 rounded-3xl border border-white/10 bg-zinc-950 p-4">
        <header className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
            <Users className="size-4" aria-hidden="true" />
            Student grade enrollment
          </div>
          <h2 className="mt-3 text-2xl font-black tracking-tight">
            Bulk assign students.
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Select student accounts, choose one grade, and save the group in a
            single update.
          </p>
        </header>

        {studentNotice ? (
          <div
            className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100"
            role="status"
          >
            {studentNotice}
          </div>
        ) : null}
        {studentError ? (
          <div
            className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-100"
            role="alert"
          >
            {studentError}
          </div>
        ) : null}

        <label className="relative min-w-0">
          <span className="sr-only">Search student accounts</span>
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
            aria-hidden="true"
          />
          <input
            className="h-12 w-full min-w-0 rounded-xl border border-white/10 bg-black pl-10 pr-4 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/10"
            onChange={(event) => setStudentQuery(event.target.value)}
            placeholder="Search name or phone"
            type="search"
            value={studentQuery}
          />
        </label>

        <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="min-w-0">
            <span className="sr-only">Target grade</span>
            <select
              className="h-12 w-full min-w-0 rounded-xl border border-white/10 bg-black px-3 text-sm font-bold text-white outline-none transition focus:border-cyan-400/50 focus:ring-4 focus:ring-cyan-400/10"
              onChange={(event) =>
                setTargetGrade(event.target.value as GradeLevel | '')
              }
              value={targetGrade}
            >
              <option value="">Choose target grade</option>
              {grades.map(({ grade, label }) => (
                <option key={grade} value={grade}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            className="h-12 w-full min-w-0 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-black text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!filteredStudents.length}
            onClick={toggleVisibleStudents}
            type="button"
          >
            {shouldClearVisible
              ? 'Clear visible'
              : `Select visible (max ${MAX_BULK_STUDENTS})`}
          </button>
        </div>

        <div className="flex max-h-96 w-full min-w-0 flex-col gap-2 overflow-y-auto overscroll-contain pr-1">
          {filteredStudents.map((student) => (
            <label
              className="flex w-full min-w-0 cursor-pointer items-start gap-3 rounded-2xl border border-white/5 bg-black p-3 transition hover:border-cyan-400/20"
              key={student.id}
            >
              <input
                checked={selectedStudentIds.includes(student.id)}
                className="mt-1 size-4 shrink-0 accent-cyan-300"
                onChange={() => toggleStudent(student.id)}
                type="checkbox"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-black">
                  {accountLabel(student)}
                </span>
                <span className="mt-0.5 block truncate text-xs text-zinc-500">
                  {student.phoneNumber || 'No phone provided'}
                </span>
                <span className="mt-2 flex min-w-0 flex-wrap gap-2 text-[10px] font-bold text-zinc-400">
                  <span className="rounded-full bg-white/5 px-2 py-1">
                    {student.gradeLevel
                      ? gradeLabels.get(student.gradeLevel)
                      : 'Grade unassigned'}
                  </span>
                  <span className="rounded-full bg-white/5 px-2 py-1">
                    {student.enrolledCourses}{' '}
                    {student.enrolledCourses === 1 ? 'course' : 'courses'}
                  </span>
                </span>
              </span>
            </label>
          ))}

          {!filteredStudents.length ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-zinc-500">
              No student accounts match this search.
            </div>
          ) : null}
        </div>

        <button
          className="flex min-h-12 w-full min-w-0 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-3 text-sm font-black text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          disabled={
            bulkPending || !targetGrade || selectedStudentIds.length === 0
          }
          onClick={() => void updateStudentGrades()}
          type="button"
        >
          {bulkPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          ) : null}
          {bulkPending
            ? 'Updating students…'
            : `Assign ${selectedStudentIds.length || ''} ${selectedStudentIds.length === 1 ? 'student' : 'students'}`.trim()}
        </button>
      </section>
    </div>
  );
}
