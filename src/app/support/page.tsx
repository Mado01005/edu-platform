import Link from 'next/link';
import {
  AlertCircle,
  Bell,
  BookOpen,
  CheckCircle2,
  Headphones,
  KeyRound,
  Mail,
  Phone,
  Search,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import {
  createSupportNoticeAction,
  resendNotificationAction,
  resetStudentPasswordAction,
} from '@/app/support/actions';
import { PortalShell } from '@/components/erp/PortalShell';
import { ActionSubmitButton } from '@/components/lms/ActionSubmitButton';
import { Badge } from '@/components/UI/badge';
import { Button, buttonVariants } from '@/components/UI/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import { Textarea } from '@/components/UI/textarea';
import { requireLmsPageRole } from '@/lib/lms/auth';
import { SUPPORT_ROLES } from '@/lib/lms/roles';
import {
  getStudentSupportRecord,
  searchStudentsForSupport,
  SupportPortalError,
} from '@/lib/lms/support';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const NOTICE_MESSAGES: Record<string, string> = {
  'notice-created': 'The support notice is now in the student notification center.',
  'notice-resent': 'A fresh unread copy of the selected notification was created.',
  'password-reset': 'The temporary password was set successfully.',
};

const ERROR_MESSAGES: Record<string, string> = {
  'confirmation-required': 'Confirm that the student requested the reset.',
  'identity-mismatch': 'The LMS and Supabase identities did not match. No password was changed.',
  'invalid-notice': 'Enter a valid notice title and message.',
  'invalid-password': 'Use a temporary password between 12 and 128 characters.',
  'invalid-search': 'Enter at least 3 characters from a name, email address, or phone number.',
  'invalid-student': 'Choose a valid student account.',
  'notification-not-found': 'Choose an available non-payment notification.',
  'operation-failed': 'The operation could not be completed. Try again.',
  'password-mismatch': 'The temporary passwords do not match.',
  'password-update-failed': 'Supabase could not update the password. Try again.',
  'student-not-found': 'That student account is no longer available.',
};

type SupportSearchParams = {
  error?: string | string[];
  notice?: string | string[];
  q?: string | string[];
  student?: string | string[];
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function supportStudentHref(query: string, studentId: string) {
  const params = new URLSearchParams({ q: query, student: studentId });
  return `/support?${params.toString()}`;
}

function gradeLabel(grade: string | null) {
  return grade ? grade.replace('GRADE_', 'Grade ') : 'Grade not assigned';
}

function notificationDate(value: Date) {
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(value);
}

export default async function SupportPortalPage({
  searchParams,
}: {
  searchParams: Promise<SupportSearchParams>;
}) {
  const [operator, params] = await Promise.all([
    requireLmsPageRole(SUPPORT_ROLES, 'support-required'),
    searchParams,
  ]);
  const query = firstValue(params.q).trim().slice(0, 160);
  const selectedStudentId = firstValue(params.student).trim().slice(0, 100);
  const noticeCode = firstValue(params.notice);
  const errorCode = firstValue(params.error);
  const [studentSearchResult, selectedStudentResult] =
    await Promise.allSettled([
      query ? searchStudentsForSupport(query) : Promise.resolve([]),
      selectedStudentId
        ? getStudentSupportRecord(selectedStudentId)
        : Promise.resolve(null),
    ]);
  const students =
    studentSearchResult.status === 'fulfilled'
      ? studentSearchResult.value
      : [];
  const selectedStudent =
    selectedStudentResult.status === 'fulfilled'
      ? selectedStudentResult.value
      : null;
  const searchError =
    studentSearchResult.status === 'rejected'
      ? studentSearchResult.reason instanceof SupportPortalError
        ? ERROR_MESSAGES[studentSearchResult.reason.code] ??
          ERROR_MESSAGES['operation-failed']
        : ERROR_MESSAGES['operation-failed']
      : '';

  const noticeMessage = NOTICE_MESSAGES[noticeCode];
  const errorMessage = ERROR_MESSAGES[errorCode] ?? searchError;

  return (
    <PortalShell user={operator}>
      <div className="box-border flex w-full max-w-md min-w-0 flex-col gap-4">
          <header className="w-full min-w-0 rounded-3xl border border-[#D4AF37]/40 bg-[#FDF8E8] p-5 shadow-sm shadow-emerald-950/5">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-[#084B2B] text-white shadow-sm">
              <Headphones className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-[#8C6B1B]">
              Customer support
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Student account desk
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Verify an account, review active course enrollments, reset a
              requested password, or resend an operational notice.
            </p>
          </header>

          {noticeMessage ? (
            <div
              className="flex min-w-0 items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="min-w-0 leading-6">{noticeMessage}</p>
            </div>
          ) : null}

          {errorMessage ? (
            <div
              className="flex min-w-0 items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="min-w-0 leading-6">{errorMessage}</p>
            </div>
          ) : null}

          <Card className="scroll-mt-28" id="student-lookup">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="size-5 text-[#084B2B]" aria-hidden="true" />
                Find a student
              </CardTitle>
              <CardDescription>
                Search with at least three characters from an email address or
                phone number. Results are limited to student accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-5 pt-4">
              <form action="/support" className="flex min-w-0 flex-col gap-3" method="get">
                <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-600" htmlFor="support-search">
                  Phone or email
                </label>
                <Input
                  defaultValue={query}
                  id="support-search"
                  maxLength={160}
                  minLength={3}
                  name="q"
                  placeholder="student@example.com or +20…"
                  required
                  type="search"
                />
                <Button className="w-full" type="submit">
                  <Search className="size-4" aria-hidden="true" />
                  Search accounts
                </Button>
              </form>
            </CardContent>
          </Card>

          {query && !searchError ? (
            <Card>
              <CardHeader>
                <CardTitle>Search results</CardTitle>
                <CardDescription>
                  {students.length
                    ? `${students.length} matching student account${students.length === 1 ? '' : 's'}`
                    : 'No student accounts matched that phone or email.'}
                </CardDescription>
              </CardHeader>
              {students.length ? (
                <CardContent className="flex flex-col gap-3 pb-5 pt-4">
                  {students.map((student) => {
                    const selected = student.id === selectedStudentId;

                    return (
                      <Link
                        className={`flex min-w-0 items-start gap-3 rounded-2xl border p-4 transition ${
                          selected
                            ? 'border-[#084B2B] bg-emerald-50'
                            : 'border-emerald-950/10 bg-white hover:border-emerald-300 hover:bg-emerald-50/50'
                        }`}
                        href={supportStudentHref(query, student.id)}
                        key={student.id}
                        prefetch={false}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#084B2B]">
                          <User className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-slate-900">
                            {student.name?.trim() || 'Unnamed student'}
                          </span>
                          <span className="mt-1 block break-all text-xs text-slate-600">
                            {student.email}
                          </span>
                          {student.phoneNumber ? (
                            <span className="mt-1 block break-all text-xs text-slate-500">
                              {student.phoneNumber}
                            </span>
                          ) : null}
                          <span className="mt-2 flex min-w-0 flex-wrap gap-2">
                            <Badge variant="secondary">
                              {gradeLabel(student.gradeLevel)}
                            </Badge>
                            <Badge>{student._count.enrollments} enrolled</Badge>
                            <Badge
                              className={
                                student.status === 'ACTIVE'
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-red-200 bg-red-50 text-red-700'
                              }
                            >
                              {student.status}
                            </Badge>
                          </span>
                        </span>
                      </Link>
                    );
                  })}
                </CardContent>
              ) : null}
            </Card>
          ) : null}

          {selectedStudent ? (
            <>
              <Card>
                <CardHeader>
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#084B2B] text-white">
                      <ShieldCheck className="size-5" aria-hidden="true" />
                    </span>
                    <Badge
                      className={
                        selectedStudent.status === 'ACTIVE'
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }
                    >
                      {selectedStudent.status}
                    </Badge>
                  </div>
                  <CardTitle className="pt-2 text-xl">
                    {selectedStudent.name?.trim() || 'Unnamed student'}
                  </CardTitle>
                  <CardDescription>
                    {gradeLabel(selectedStudent.gradeLevel)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pb-5 pt-4">
                  <p className="flex min-w-0 items-start gap-3 rounded-xl bg-[#F8FAF7] p-3 text-sm text-slate-700">
                    <Mail className="mt-0.5 size-4 shrink-0 text-[#084B2B]" aria-hidden="true" />
                    <span className="min-w-0 break-all">{selectedStudent.email}</span>
                  </p>
                  <p className="flex min-w-0 items-start gap-3 rounded-xl bg-[#F8FAF7] p-3 text-sm text-slate-700">
                    <Phone className="mt-0.5 size-4 shrink-0 text-[#084B2B]" aria-hidden="true" />
                    <span className="min-w-0 break-all">
                      {selectedStudent.phoneNumber || 'No phone number on file'}
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="size-5 text-[#084B2B]" aria-hidden="true" />
                    Course enrollment status
                  </CardTitle>
                  <CardDescription>
                    Current LMS enrollment records only.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 pb-5 pt-4">
                  {selectedStudent.enrollments.length ? (
                    selectedStudent.enrollments.map((enrollment) => (
                      <div
                        className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-4"
                        key={enrollment.id}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-slate-900">
                            {enrollment.course.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-slate-500">
                            {enrollment.course.subject
                              ? `${gradeLabel(enrollment.course.subject.grade)} · ${enrollment.course.subject.name}`
                              : 'General course'}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1.5">
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-800">
                            Enrolled
                          </Badge>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                            {enrollment.course.isPublished ? 'Published' : 'Private'}
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-emerald-200 p-4 text-sm leading-6 text-slate-500">
                      This student has no course enrollments.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="scroll-mt-28" id="credential-resets">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="size-5 text-[#8C6B1B]" aria-hidden="true" />
                    Temporary password reset
                  </CardTitle>
                  <CardDescription>
                    The LMS identity is matched exactly to Supabase before any
                    password is changed. Never send passwords through an
                    in-app notification.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-5 pt-4">
                  <form action={resetStudentPasswordAction} className="flex min-w-0 flex-col gap-3">
                    <input name="studentId" type="hidden" value={selectedStudent.id} />
                    <input name="query" type="hidden" value={query} />
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-600" htmlFor="temporary-password">
                      Temporary password
                    </label>
                    <Input
                      autoComplete="new-password"
                      id="temporary-password"
                      maxLength={128}
                      minLength={12}
                      name="password"
                      required
                      type="password"
                    />
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-600" htmlFor="temporary-password-confirmation">
                      Confirm temporary password
                    </label>
                    <Input
                      autoComplete="new-password"
                      id="temporary-password-confirmation"
                      maxLength={128}
                      minLength={12}
                      name="passwordConfirmation"
                      required
                      type="password"
                    />
                    <label className="flex min-w-0 items-start gap-3 rounded-2xl border border-[#D4AF37]/40 bg-[#FDF8E8] p-4 text-sm leading-6 text-[#8C6B1B]">
                      <input
                        className="mt-1 size-4 shrink-0 accent-emerald-700"
                        name="confirmation"
                        required
                        type="checkbox"
                        value="confirmed"
                      />
                      <span>
                        I verified that this student requested a password reset.
                      </span>
                    </label>
                    <ActionSubmitButton
                      className={cn(
                        buttonVariants(),
                        'w-full bg-[#084B2B] text-white hover:bg-[#063B22]',
                      )}
                      pendingLabel="Resetting…"
                    >
                      <KeyRound className="size-4" aria-hidden="true" />
                      Set temporary password
                    </ActionSubmitButton>
                  </form>
                </CardContent>
              </Card>

              <Card className="scroll-mt-28" id="support-tickets">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="size-5 text-[#084B2B]" aria-hidden="true" />
                    Resend a recent notice
                  </CardTitle>
                  <CardDescription>
                    Payment alerts are intentionally unavailable in this portal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-5 pt-4">
                  {selectedStudent.notifications.length ? (
                    <form action={resendNotificationAction} className="flex min-w-0 flex-col gap-3">
                      <input name="studentId" type="hidden" value={selectedStudent.id} />
                      <input name="query" type="hidden" value={query} />
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-600" htmlFor="notification-to-resend">
                        Recent notification
                      </label>
                      <select
                        className="h-12 w-full min-w-0 rounded-xl border border-emerald-950/10 bg-white px-4 text-sm text-slate-900 outline-none focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100"
                        id="notification-to-resend"
                        name="notificationId"
                        required
                      >
                        <option value="">Choose a notification</option>
                        {selectedStudent.notifications.map((notification) => (
                          <option key={notification.id} value={notification.id}>
                            {notification.title} · {notificationDate(notification.createdAt)}
                          </option>
                        ))}
                      </select>
                      <ActionSubmitButton
                        className={cn(
                          buttonVariants({ variant: 'outline' }),
                          'w-full',
                        )}
                        pendingLabel="Resending…"
                      >
                        <Send className="size-4" aria-hidden="true" />
                        Create unread copy
                      </ActionSubmitButton>
                    </form>
                  ) : (
                    <p className="rounded-2xl border border-dashed border-emerald-200 p-4 text-sm leading-6 text-slate-500">
                      No support-visible notifications are available to resend.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="size-5 text-[#084B2B]" aria-hidden="true" />
                    Create support notice
                  </CardTitle>
                  <CardDescription>
                    Send an unread operational message to this student.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-5 pt-4">
                  <form action={createSupportNoticeAction} className="flex min-w-0 flex-col gap-3">
                    <input name="studentId" type="hidden" value={selectedStudent.id} />
                    <input name="query" type="hidden" value={query} />
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-600" htmlFor="support-notice-title">
                      Title
                    </label>
                    <Input
                      id="support-notice-title"
                      maxLength={120}
                      minLength={3}
                      name="title"
                      placeholder="Account assistance"
                      required
                    />
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-slate-600" htmlFor="support-notice-message">
                      Message
                    </label>
                    <Textarea
                      id="support-notice-message"
                      maxLength={1000}
                      minLength={3}
                      name="message"
                      placeholder="Write the support update…"
                      required
                    />
                    <ActionSubmitButton
                      className={cn(buttonVariants(), 'w-full')}
                      pendingLabel="Sending…"
                    >
                      <Send className="size-4" aria-hidden="true" />
                      Send support notice
                    </ActionSubmitButton>
                  </form>
                </CardContent>
              </Card>
            </>
          ) : selectedStudentId ? (
            <Card className="border-red-400/20">
              <CardHeader>
                <CardTitle>Student unavailable</CardTitle>
                <CardDescription>
                  Return to the search results and choose a current student
                  account.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-5 pt-4">
                <Link
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-[#084B2B] px-4 text-sm font-black text-white transition hover:bg-[#063B22]"
                  href={query ? `/support?q=${encodeURIComponent(query)}` : '/support'}
                >
                  Back to search
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Select a student to begin</CardTitle>
                <CardDescription>
                  Account tools appear only after a student is selected from
                  a phone or email search.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
      </div>
    </PortalShell>
  );
}
