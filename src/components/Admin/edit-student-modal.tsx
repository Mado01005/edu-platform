'use client';

import { useState } from 'react';
import type {
  AccountStatus,
  GradeLevel,
  Role,
  SubscriptionStatus,
} from '@prisma/client';
import { Loader2, PencilLine, X } from 'lucide-react';
import { Button } from '@/components/UI/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/UI/dialog';
import { Input } from '@/components/UI/input';

export type AdminCourseOption = {
  id: string;
  title: string;
};

export type EditableAdminUser = {
  enrolledCourseIds: string[];
  gradeLevel: GradeLevel | null;
  id: string;
  name: string | null;
  phoneNumber: string | null;
  role: Role;
  status: AccountStatus;
  subscriptions: Array<{
    courseId: string;
    status: SubscriptionStatus;
  }>;
};

type CourseDraft = {
  courseId: string;
  hasAccess: boolean;
  paymentStatus: SubscriptionStatus | null;
};

const GRADE_LEVELS = Array.from(
  { length: 12 },
  (_, index) => `GRADE_${index + 1}` as GradeLevel,
);
const PAYMENT_STATUSES: SubscriptionStatus[] = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
];

function gradeLabel(value: GradeLevel) {
  return `Grade ${value.replace('GRADE_', '')}`;
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(body.error || 'The requested change could not be saved.');
  }
  return body;
}

export function EditStudentModal({
  assignableRoles,
  availableCourses,
  isSelf = false,
  onOpenChange,
  onSaved,
  user,
}: {
  assignableRoles: readonly Role[];
  availableCourses: AdminCourseOption[];
  isSelf?: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (user: EditableAdminUser) => void;
  user: EditableAdminUser;
}) {
  const [name, setName] = useState(user.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? '');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel | ''>(
    user.gradeLevel ?? '',
  );
  const [role, setRole] = useState<Role>(user.role);
  const [status, setStatus] = useState<AccountStatus>(user.status);
  const [courses, setCourses] = useState<CourseDraft[]>(() =>
    availableCourses.map((course) => ({
      courseId: course.id,
      hasAccess: user.enrolledCourseIds.includes(course.id),
      paymentStatus:
        user.subscriptions.find((entry) => entry.courseId === course.id)
          ?.status ?? null,
    })),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateCourse(courseId: string, update: Partial<CourseDraft>) {
    setCourses((current) =>
      current.map((course) =>
        course.courseId === courseId ? { ...course, ...update } : course,
      ),
    );
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      let nextRole = user.role;
      let nextStatus = user.status;
      let nextName = user.name;
      let nextPhone = user.phoneNumber;
      let nextGrade = user.gradeLevel;
      let enrolledCourseIds = user.enrolledCourseIds;
      let subscriptions = user.subscriptions;

      if (role !== user.role) {
        const response = await fetch('/api/admin/users/update-role', {
          body: JSON.stringify({ role, targetId: user.id }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        const body = await readResponse<{ user: { role: Role } }>(response);
        nextRole = body.user.role;
      }
      if (status !== user.status) {
        const response = await fetch('/api/admin/users/update-status', {
          body: JSON.stringify({ status, targetId: user.id }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        const body = await readResponse<{ user: { status: AccountStatus } }>(
          response,
        );
        nextStatus = body.user.status;
      }

      const profileResponse = await fetch('/api/admin/users/update-profile', {
        body: JSON.stringify({
          gradeLevel: role === 'STUDENT' ? gradeLevel || null : null,
          name,
          phoneNumber,
          targetId: user.id,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const profile = await readResponse<{
        user: {
          gradeLevel: GradeLevel | null;
          name: string | null;
          phoneNumber: string | null;
        };
      }>(profileResponse);
      nextName = profile.user.name;
      nextPhone = profile.user.phoneNumber;
      nextGrade = profile.user.gradeLevel;

      if (role === 'STUDENT' && availableCourses.length) {
        const accessResponse = await fetch(
          '/api/admin/users/update-course-access',
          {
            body: JSON.stringify({ courses, targetId: user.id }),
            headers: { 'Content-Type': 'application/json' },
            method: 'PATCH',
          },
        );
        const access = await readResponse<{
          user: {
            enrolledCourseIds: string[];
            subscriptions: EditableAdminUser['subscriptions'];
          };
        }>(accessResponse);
        enrolledCourseIds = access.user.enrolledCourseIds;
        subscriptions = access.user.subscriptions;
      }

      onSaved({
        enrolledCourseIds,
        gradeLevel: nextGrade,
        id: user.id,
        name: nextName,
        phoneNumber: nextPhone,
        role: nextRole,
        status: nextStatus,
        subscriptions,
      });
      onOpenChange(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save this student.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-2xl overflow-y-auto border-slate-200 bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <PencilLine className="size-5 text-sky-600" aria-hidden="true" />
            Edit student information
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            Update contact details, account status, grade, and course access.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700" role="alert">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-bold text-slate-700 sm:col-span-2">
            Student name
            <Input
              autoFocus
              maxLength={100}
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="space-y-2 text-sm font-bold text-slate-700 sm:col-span-2">
            Phone number
            <Input
              inputMode="tel"
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+20 10 1234 5678"
              type="tel"
              value={phoneNumber}
            />
          </label>
          <label className="space-y-2 text-sm font-bold text-slate-700">
            Assigned grade level
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
              disabled={role !== 'STUDENT'}
              onChange={(event) => setGradeLevel(event.target.value as GradeLevel | '')}
              value={gradeLevel}
            >
              <option value="">Unassigned</option>
              {GRADE_LEVELS.map((grade) => (
                <option key={grade} value={grade}>{gradeLabel(grade)}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-bold text-slate-700">
            Account role
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
              disabled={isSelf}
              onChange={(event) => setRole(event.target.value as Role)}
              value={role}
            >
              {assignableRoles.map((option) => (
                <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
              ))}
            </select>
          </label>
          <label className="space-y-2 text-sm font-bold text-slate-700 sm:col-span-2">
            Account status
            <select
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100 disabled:bg-slate-100"
              disabled={isSelf}
              onChange={(event) => setStatus(event.target.value as AccountStatus)}
              value={status}
            >
              <option value="ACTIVE">Active</option>
              <option value="DISABLED">Disabled</option>
            </select>
          </label>
        </div>

        {role === 'STUDENT' ? (
          <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div>
              <h3 className="font-black text-slate-900">Course access &amp; payment</h3>
              <p className="text-xs text-slate-600">Access and payment records are managed separately for each course.</p>
            </div>
            {availableCourses.map((course) => {
              const draft = courses.find((entry) => entry.courseId === course.id);
              if (!draft) return null;
              return (
                <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm" key={course.id}>
                  <label className="flex items-center gap-3 font-bold text-slate-900">
                    <input
                      checked={draft.hasAccess}
                      className="size-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                      onChange={(event) => updateCourse(course.id, { hasAccess: event.target.checked })}
                      type="checkbox"
                    />
                    <span className="min-w-0 flex-1 truncate">{course.title}</span>
                  </label>
                  <label className="mt-3 block space-y-1 text-xs font-bold text-slate-600">
                    Payment status
                    <select
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900"
                      onChange={(event) => updateCourse(course.id, {
                        paymentStatus: event.target.value
                          ? event.target.value as SubscriptionStatus
                          : null,
                      })}
                      value={draft.paymentStatus ?? ''}
                    >
                      <option disabled={draft.paymentStatus !== null} value="">
                        Not recorded
                      </option>
                      {PAYMENT_STATUSES.map((option) => (
                        <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
            {!availableCourses.length ? (
              <p className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-center text-sm text-slate-600">
                No courses are available yet.
              </p>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={saving} onClick={() => onOpenChange(false)} type="button" variant="outline">
            <X className="size-4" aria-hidden="true" /> Cancel
          </Button>
          <Button disabled={saving} onClick={() => void save()} type="button">
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <PencilLine className="size-4" aria-hidden="true" />}
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
