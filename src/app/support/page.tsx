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
          <header className="w-full min-w-0 rounded-3xl border border-cyan-400/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.2),transparent_56%)] p-5">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-cyan-300 text-black shadow-lg shadow-cyan-500/20">
              <Headphones className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-cyan-300">
              Customer support
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">
              Student account desk
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Verify an account, review active course enrollments, reset a
              requested password, or resend an operational notice.
            </p>
          </header>

          {noticeMessage ? (
            <div
              className="flex min-w-0 items-start gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="min-w-0 leading-6">{noticeMessage}</p>
            </div>
          ) : null}

          {errorMessage ? (
            <div
              className="flex min-w-0 items-start gap-3 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100"
              role="alert"
            >
              <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <p className="min-w-0 leading-6">{errorMessage}</p>
            </div>
          ) : null}

          <Card className="scroll-mt-28" id="student-lookup">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="size-5 text-cyan-300" aria-hidden="true" />
                Find a student
              </CardTitle>
              <CardDescription>
                Search with at least three characters from an email address or
                phone number. Results are limited to student accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-5 pt-4">
              <form action="/support" className="flex min-w-0 flex-col gap-3" method="get">
                <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400" htmlFor="support-search">
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
                            ? 'border-cyan-300/50 bg-cyan-300/10'
                            : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                        }`}
                        href={supportStudentHref(query, student.id)}
                        key={student.id}
                        prefetch={false}
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-200">
                          <User className="size-5" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black text-white">
                            {student.name?.trim() || 'Unnamed student'}
                          </span>
                          <span className="mt-1 block break-all text-xs text-zinc-400">
                            {student.email}
                          </span>
                          {student.phoneNumber ? (
                            <span className="mt-1 block break-all text-xs text-zinc-500">
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
                                  ? 'bg-emerald-400 text-black'
                                  : 'bg-red-400 text-black'
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
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-cyan-300 text-black">
                      <ShieldCheck className="size-5" aria-hidden="true" />
                    </span>
                    <Badge
                      className={
                        selectedStudent.status === 'ACTIVE'
                          ? 'bg-emerald-400 text-black'
                          : 'bg-red-400 text-black'
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
                  <p className="flex min-w-0 items-start gap-3 rounded-xl bg-white/[0.04] p-3 text-sm text-zinc-300">
                    <Mail className="mt-0.5 size-4 shrink-0 text-cyan-300" aria-hidden="true" />
                    <span className="min-w-0 break-all">{selectedStudent.email}</span>
                  </p>
                  <p className="flex min-w-0 items-start gap-3 rounded-xl bg-white/[0.04] p-3 text-sm text-zinc-300">
                    <Phone className="mt-0.5 size-4 shrink-0 text-cyan-300" aria-hidden="true" />
                    <span className="min-w-0 break-all">
                      {selectedStudent.phoneNumber || 'No phone number on file'}
                    </span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="size-5 text-violet-300" aria-hidden="true" />
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
                        className="flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                        key={enrollment.id}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-black text-white">
                            {enrollment.course.title}
                          </span>
                          <span className="mt-1 block text-xs leading-5 text-zinc-500">
                            {enrollment.course.subject
                              ? `${gradeLabel(enrollment.course.subject.grade)} · ${enrollment.course.subject.name}`
                              : 'General course'}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1.5">
                          <Badge className="bg-emerald-400 text-black">
                            Enrolled
                          </Badge>
                          <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                            {enrollment.course.isPublished ? 'Published' : 'Private'}
                          </span>
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-zinc-500">
                      This student has no course enrollments.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="scroll-mt-28" id="credential-resets">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <KeyRound className="size-5 text-amber-300" aria-hidden="true" />
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
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400" htmlFor="temporary-password">
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
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400" htmlFor="temporary-password-confirmation">
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
                    <label className="flex min-w-0 items-start gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                      <input
                        className="mt-1 size-4 shrink-0 accent-amber-300"
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
                        'w-full bg-amber-300 hover:bg-amber-200',
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
                    <Bell className="size-5 text-fuchsia-300" aria-hidden="true" />
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
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400" htmlFor="notification-to-resend">
                        Recent notification
                      </label>
                      <select
                        className="h-12 w-full min-w-0 rounded-xl border border-white/10 bg-zinc-900 px-4 text-sm text-white outline-none focus:border-fuchsia-400/50 focus:ring-4 focus:ring-fuchsia-400/10"
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
                    <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm leading-6 text-zinc-500">
                      No support-visible notifications are available to resend.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="size-5 text-cyan-300" aria-hidden="true" />
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
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400" htmlFor="support-notice-title">
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
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400" htmlFor="support-notice-message">
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
                  className="inline-flex h-11 w-full items-center justify-center rounded-xl border border-white/10 px-4 text-sm font-black text-white transition hover:bg-white/5"
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
