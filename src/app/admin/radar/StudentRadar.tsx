'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { AccountStatus, GradeLevel, Role } from '@prisma/client';
import {
  Activity,
  BellRing,
  CheckCircle2,
  Loader2,
  PencilLine,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/UI/badge';
import { Button, buttonVariants } from '@/components/UI/button';
import { Input } from '@/components/UI/input';
import {
  EditStudentModal,
  type AdminCourseOption,
  type EditableAdminUser,
} from '@/components/Admin/edit-student-modal';
import { LMS_ROLES } from '@/lib/lms/roles';

export type RadarStudent = {
  assignmentScore: number;
  enrolledCourseIds: string[];
  gradeLevel: GradeLevel | null;
  healthPercentage: number;
  id: string;
  isAtRisk: boolean;
  lastLoginAt: string;
  name: string | null;
  phoneNumber: string | null;
  role: Role;
  status: AccountStatus;
  subscriptions: EditableAdminUser['subscriptions'];
  videoCompletion: number;
};

const gradeLevels = Array.from({ length: 12 }, (_, index) =>
  `GRADE_${index + 1}`,
);
function gradeLabel(value: string | null) {
  return value ? value.replace('GRADE_', 'Grade ') : 'Unassigned';
}

type RadarFilters = {
  grade: string;
  query: string;
  status: string;
};

function radarPageHref(filters: RadarFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  if (filters.grade !== 'ALL') params.set('grade', filters.grade);
  if (filters.status !== 'ALL') params.set('status', filters.status);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/admin/radar?${query}` : '/admin/radar';
}

export function StudentRadar({
  atRiskCount,
  availableCourses,
  currentAdminRole,
  filteredCount,
  filters,
  healthyCount,
  page,
  pageCount,
  students,
  totalStudents,
}: {
  atRiskCount: number;
  availableCourses: AdminCourseOption[];
  currentAdminRole: Role;
  filteredCount: number;
  filters: RadarFilters;
  healthyCount: number;
  page: number;
  pageCount: number;
  students: RadarStudent[];
  totalStudents: number;
}) {
  const [roster, setRoster] = useState(students);
  const [editingStudent, setEditingStudent] = useState<RadarStudent | null>(null);
  const [pendingStudentIds, setPendingStudentIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const assignableRoles = currentAdminRole === 'SUPER_ADMIN'
    ? LMS_ROLES
    : LMS_ROLES.filter((role) => role !== 'SUPER_ADMIN');

  async function toggleStatus(student: RadarStudent) {
    setPendingStudentIds((current) => new Set(current).add(student.id));
    setError('');
    setNotice('');
    try {
      const nextStatus: AccountStatus = student.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
      const response = await fetch('/api/admin/users/update-status', {
        body: JSON.stringify({ status: nextStatus, targetId: student.id }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || 'Unable to update this account.');
      setRoster((current) => current.filter((entry) => entry.id !== student.id));
      setNotice(`${student.name?.trim() || 'The student'} is now disabled.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to update this account.');
    } finally {
      setPendingStudentIds((current) => {
        const next = new Set(current);
        next.delete(student.id);
        return next;
      });
    }
  }

  async function notifyStudent(student: RadarStudent) {
    setPendingStudentIds((current) => new Set(current).add(student.id));
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/notifications/push', {
        body: JSON.stringify({
          includeParents: true,
          message:
            'Your engagement is below the 70% academy health threshold. Please sign in and continue your current learning plan.',
          studentId: student.id,
          title: 'Learning follow-up needed',
          type: 'ANNOUNCEMENT',
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const body = (await response.json()) as {
        error?: string;
        push?: { delivered?: number };
        recipients?: number;
      };
      if (!response.ok) {
        throw new Error(body.error || 'Unable to send this follow-up.');
      }
      const recipients = body.recipients ?? 0;
      const pushed = body.push?.delivered ?? 0;
      setNotice(
        `Follow-up created for ${recipients} in-app ${recipients === 1 ? 'recipient' : 'recipients'}${pushed ? `; browser push delivered to ${pushed}.` : '.'}`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to send this follow-up.',
      );
    } finally {
      setPendingStudentIds((current) => {
        const next = new Set(current);
        next.delete(student.id);
        return next;
      });
    }
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-4">
      <section className="grid min-w-0 grid-cols-3 gap-2" aria-label="Radar metrics">
        {[
          { badge: 'bg-sky-50', icon: Activity, label: 'Active', tone: 'text-sky-700', value: totalStudents },
          { badge: 'bg-emerald-50', icon: CheckCircle2, label: 'Healthy', tone: 'text-emerald-700', value: healthyCount },
          { badge: 'bg-red-50', icon: ShieldAlert, label: 'At-Risk', tone: 'text-red-700', value: atRiskCount },
        ].map(({ badge, icon: Icon, label, tone, value }) => (
          <article
            className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm"
            key={label}
          >
            <span className={`mx-auto flex size-8 items-center justify-center rounded-xl ${badge} ${tone}`}>
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
            <p className="truncate text-[9px] font-black uppercase tracking-wider text-slate-600">
              {label}
            </p>
          </article>
        ))}
      </section>

      <form
        action="/admin/radar"
        className="flex min-w-0 flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        method="get"
      >
        <label className="relative min-w-0">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
            aria-hidden="true"
          />
          <Input
            aria-label="Search radar students"
            className="pl-10"
            defaultValue={filters.query}
            maxLength={160}
            name="q"
            placeholder="Search name or phone"
          />
        </label>
        <div className="grid min-w-0 grid-cols-2 gap-2">
          <select
            aria-label="Filter by grade level"
            className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            defaultValue={filters.grade}
            name="grade"
          >
            <option value="ALL">All grades</option>
            {gradeLevels.map((level) => (
              <option key={level} value={level}>
                {gradeLabel(level)}
              </option>
            ))}
            <option value="UNASSIGNED">Unassigned</option>
          </select>
          <select
            aria-label="Filter by engagement status"
            className="h-11 min-w-0 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            defaultValue={filters.status}
            name="status"
          >
            <option value="ALL">All statuses</option>
            <option value="HEALTHY">Healthy</option>
            <option value="AT_RISK">At-Risk</option>
          </select>
        </div>
        <Button className="w-full" type="submit" variant="outline">
          Apply radar filters
        </Button>
        <p className="text-center text-[10px] font-bold uppercase tracking-wider text-slate-600">
          {filteredCount} matching {filteredCount === 1 ? 'student' : 'students'}
        </p>
      </form>

      {(error || notice) && (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            error
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          role={error ? 'alert' : 'status'}
        >
          {error || notice}
        </div>
      )}

      <section className="flex min-w-0 flex-col gap-3" aria-label="Student engagement radar">
        {roster.map((student) => (
          <article
            className={`min-w-0 rounded-2xl border p-4 ${
              student.isAtRisk
                ? 'border-red-200 bg-red-50/50'
                : 'border-emerald-200 bg-white shadow-sm'
            }`}
            key={student.id}
          >
            <div className="flex min-w-0 items-start gap-3">
              <span
                className={`flex size-12 shrink-0 items-center justify-center rounded-2xl text-lg font-black ${
                  student.isAtRisk
                    ? 'bg-red-100 text-red-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                {Math.round(student.healthPercentage)}
              </span>
              <div className="min-w-0 flex-1">
                <button
                  className="block max-w-full truncate text-left font-black text-slate-900 transition hover:text-sky-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                  onClick={() => setEditingStudent(student)}
                  type="button"
                >
                  {student.name ?? 'Unnamed student'}
                </button>
                <p className="truncate text-xs text-slate-600">{student.phoneNumber || 'No phone provided'}</p>
                <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                  <Badge variant="secondary">{gradeLabel(student.gradeLevel)}</Badge>
                  <Badge
                    className={
                      student.isAtRisk
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                    }
                  >
                    {student.isAtRisk ? 'At-Risk' : 'Healthy'}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-4 grid min-w-0 grid-cols-3 gap-2 text-center">
              {[
                ['Health', student.healthPercentage],
                ['Video', student.videoCompletion],
                ['Work', student.assignmentScore],
              ].map(([label, value]) => (
                <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-2" key={label}>
                  <p className="text-sm font-black text-slate-900">{Math.round(Number(value))}%</p>
                  <p className="truncate text-[9px] font-bold uppercase text-slate-600">
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-3 text-xs text-slate-600">
              Last active{' '}
              {new Intl.DateTimeFormat('en-US', {
                dateStyle: 'medium',
                timeZone: 'UTC',
              }).format(new Date(student.lastLoginAt))}
            </p>

            {student.isAtRisk ? (
              <Button
                className="mt-3 w-full"
                disabled={pendingStudentIds.has(student.id)}
                onClick={() => void notifyStudent(student)}
                size="sm"
              >
                {pendingStudentIds.has(student.id) ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <BellRing className="size-4" />
                )}
                Notify student &amp; parent
              </Button>
            ) : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                onClick={() => setEditingStudent(student)}
                size="sm"
                type="button"
                variant="outline"
              >
                <PencilLine className="size-4" aria-hidden="true" /> Edit
              </Button>
              <Button
                disabled={pendingStudentIds.has(student.id)}
                onClick={() => void toggleStatus(student)}
                size="sm"
                type="button"
                variant="outline"
              >
                {pendingStudentIds.has(student.id) ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                Disable
              </Button>
            </div>
          </article>
        ))}

        {!filteredCount ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600">
            No students match these filters.
          </div>
        ) : null}

        {pageCount > 1 ? (
          <nav
            aria-label="Radar table pages"
            className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-2"
          >
            {page > 1 ? (
              <Link
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
                href={radarPageHref(filters, page - 1)}
              >
                Previous
              </Link>
            ) : (
              <span aria-disabled="true" className={`${buttonVariants({ size: 'sm', variant: 'outline' })} opacity-50`}>
                Previous
              </span>
            )}
            <span className="text-xs font-bold text-slate-600">
              {page} / {pageCount}
            </span>
            {page < pageCount ? (
              <Link
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
                href={radarPageHref(filters, page + 1)}
              >
                Next
              </Link>
            ) : (
              <span aria-disabled="true" className={`${buttonVariants({ size: 'sm', variant: 'outline' })} opacity-50`}>
                Next
              </span>
            )}
          </nav>
        ) : null}
      </section>

      {editingStudent ? (
        <EditStudentModal
          assignableRoles={assignableRoles}
          availableCourses={availableCourses}
          key={editingStudent.id}
          onOpenChange={(open) => {
            if (!open) setEditingStudent(null);
          }}
          onSaved={(updated) => {
            setRoster((current) => current
              .filter((entry) => entry.id !== updated.id || updated.status === 'ACTIVE')
              .map((entry) => entry.id === updated.id ? { ...entry, ...updated } : entry));
            setNotice(`Saved ${updated.name?.trim() || 'the student'}.`);
          }}
          user={editingStudent}
        />
      ) : null}
    </div>
  );
}
