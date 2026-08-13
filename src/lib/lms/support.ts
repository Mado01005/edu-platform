import 'server-only';

import type { Prisma } from '@prisma/client';
import {
  deliverSystemNotification,
  NotificationError,
} from '@/lib/lms/notifications';
import { normalizePhoneNumber } from '@/lib/phone';
import { getPrisma } from '@/lib/prisma';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

const MIN_SEARCH_LENGTH = 3;
const MAX_SEARCH_LENGTH = 160;
const MAX_RESULTS = 20;
const MIN_TEMP_PASSWORD_LENGTH = 12;
const MAX_TEMP_PASSWORD_LENGTH = 128;
const MAX_NOTICE_TITLE_LENGTH = 120;
const MAX_NOTICE_MESSAGE_LENGTH = 1_000;

// Support may resend operational and academic notices, but never payment data.
const SUPPORT_NOTIFICATION_TYPES = [
  'ANNOUNCEMENT',
  'ATTENDANCE',
  'GRADE',
  'SYSTEM',
] as const;

function isSupportNotificationType(
  value: string,
): value is (typeof SUPPORT_NOTIFICATION_TYPES)[number] {
  return SUPPORT_NOTIFICATION_TYPES.includes(
    value as (typeof SUPPORT_NOTIFICATION_TYPES)[number],
  );
}

export type SupportPortalErrorCode =
  | 'confirmation-required'
  | 'identity-mismatch'
  | 'invalid-notice'
  | 'invalid-password'
  | 'invalid-search'
  | 'invalid-student'
  | 'notification-not-found'
  | 'password-mismatch'
  | 'password-update-failed'
  | 'student-not-found';

export class SupportPortalError extends Error {
  constructor(
    message: string,
    public readonly code: SupportPortalErrorCode,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function assertStudentId(studentId: string) {
  const normalized = studentId.trim();

  if (!normalized || normalized.length > 100) {
    throw new SupportPortalError(
      'Choose a valid student account.',
      'invalid-student',
    );
  }

  return normalized;
}

export function normalizeSupportSearchQuery(value: string) {
  const query = value.trim();

  if (
    query.length < MIN_SEARCH_LENGTH ||
    query.length > MAX_SEARCH_LENGTH
  ) {
    throw new SupportPortalError(
      `Enter ${MIN_SEARCH_LENGTH} to ${MAX_SEARCH_LENGTH} characters.`,
      'invalid-search',
    );
  }

  return query;
}

const supportStudentSummarySelect = {
  email: true,
  gradeLevel: true,
  id: true,
  name: true,
  phoneNumber: true,
  status: true,
  _count: {
    select: {
      enrollments: true,
    },
  },
} satisfies Prisma.UserSelect;

export async function searchStudentsForSupport(rawQuery: string) {
  const query = normalizeSupportSearchQuery(rawQuery);
  const phoneDigits = query.replace(/\D/g, '');
  const matches: Prisma.UserWhereInput[] = [
    {
      name: {
        contains: query,
        mode: 'insensitive',
      },
    },
    {
      email: {
        contains: query,
        mode: 'insensitive',
      },
    },
    {
      phoneNumber: {
        contains: query,
        mode: 'insensitive',
      },
    },
  ];

  if (phoneDigits.length >= MIN_SEARCH_LENGTH) {
    matches.push({
      phoneNumber: {
        contains: phoneDigits,
        mode: 'insensitive',
      },
    });
  }

  return getPrisma().user.findMany({
    where: {
      role: 'STUDENT',
      OR: matches,
    },
    orderBy: [{ status: 'asc' }, { email: 'asc' }],
    select: supportStudentSummarySelect,
    take: MAX_RESULTS,
  });
}

export async function getStudentSupportRecord(rawStudentId: string) {
  const studentId = assertStudentId(rawStudentId);

  return getPrisma().user.findFirst({
    where: {
      id: studentId,
      role: 'STUDENT',
    },
    select: {
      email: true,
      gradeLevel: true,
      id: true,
      name: true,
      phoneNumber: true,
      status: true,
      enrollments: {
        orderBy: { createdAt: 'desc' },
        select: {
          course: {
            select: {
              id: true,
              isPublished: true,
              subject: {
                select: {
                  grade: true,
                  name: true,
                },
              },
              title: true,
            },
          },
          createdAt: true,
          id: true,
        },
      },
      notifications: {
        where: {
          type: {
            in: [...SUPPORT_NOTIFICATION_TYPES],
          },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          createdAt: true,
          id: true,
          isRead: true,
          title: true,
          type: true,
        },
        take: 8,
      },
    },
  });
}

async function getExactStudentIdentity(rawStudentId: string) {
  const studentId = assertStudentId(rawStudentId);
  const student = await getPrisma().user.findFirst({
    where: {
      id: studentId,
      role: 'STUDENT',
    },
    select: {
      email: true,
      id: true,
      phoneNumber: true,
      supabaseId: true,
    },
  });

  if (!student) {
    throw new SupportPortalError(
      'The selected student account no longer exists.',
      'student-not-found',
      404,
    );
  }

  const { data, error } =
    await getSupabaseAdminClient().auth.admin.getUserById(student.supabaseId);
  const authUser = data.user;

  if (error || !authUser || authUser.id !== student.supabaseId) {
    throw new SupportPortalError(
      'The matching authentication account could not be verified.',
      'identity-mismatch',
      409,
    );
  }

  const expectedEmail = student.email.trim().toLowerCase();
  const actualEmail = authUser.email?.trim().toLowerCase() ?? null;
  const usesSyntheticEmail = expectedEmail.endsWith('@invalid.local');

  if (!usesSyntheticEmail && actualEmail !== expectedEmail) {
    throw new SupportPortalError(
      'The LMS and authentication email identities do not match.',
      'identity-mismatch',
      409,
    );
  }

  if (usesSyntheticEmail) {
    const expectedPhone = student.phoneNumber
      ? normalizePhoneNumber(student.phoneNumber)
      : null;
    const actualPhone = authUser.phone
      ? normalizePhoneNumber(authUser.phone)
      : null;

    if (!expectedPhone || actualPhone !== expectedPhone) {
      throw new SupportPortalError(
        'The LMS and authentication phone identities do not match.',
        'identity-mismatch',
        409,
      );
    }
  } else if (student.phoneNumber && authUser.phone) {
    const expectedPhone = normalizePhoneNumber(student.phoneNumber);
    const actualPhone = normalizePhoneNumber(authUser.phone);

    if (!expectedPhone || actualPhone !== expectedPhone) {
      throw new SupportPortalError(
        'The LMS and authentication phone identities do not match.',
        'identity-mismatch',
        409,
      );
    }
  }

  return student;
}

export async function resetStudentTemporaryPassword({
  confirmation,
  password,
  passwordConfirmation,
  studentId,
}: {
  confirmation: boolean;
  password: string;
  passwordConfirmation: string;
  studentId: string;
}) {
  if (!confirmation) {
    throw new SupportPortalError(
      'Confirm that the student requested this password reset.',
      'confirmation-required',
    );
  }

  if (
    password.length < MIN_TEMP_PASSWORD_LENGTH ||
    password.length > MAX_TEMP_PASSWORD_LENGTH ||
    !password.trim() ||
    password.includes('\0')
  ) {
    throw new SupportPortalError(
      `Temporary passwords must contain ${MIN_TEMP_PASSWORD_LENGTH} to ${MAX_TEMP_PASSWORD_LENGTH} characters.`,
      'invalid-password',
    );
  }

  if (password !== passwordConfirmation) {
    throw new SupportPortalError(
      'The temporary password confirmation does not match.',
      'password-mismatch',
    );
  }

  const student = await getExactStudentIdentity(studentId);
  const { error } =
    await getSupabaseAdminClient().auth.admin.updateUserById(
      student.supabaseId,
      { password },
    );

  if (error) {
    throw new SupportPortalError(
      'Supabase rejected the password reset.',
      'password-update-failed',
      502,
    );
  }

  try {
    await deliverSystemNotification({
      broadcast: false,
      includeParents: false,
      message:
        'A support specialist reset your password. Contact the academy immediately if you did not request this change.',
      studentId: student.id,
      title: 'Your password was reset',
      type: 'ANNOUNCEMENT',
      url: '/lms/login',
      userIds: [],
    });
  } catch (notificationError) {
    // The password operation has already succeeded; do not retry it or expose
    // the temporary credential because a follow-up notice failed.
    console.error('[SUPPORT_PASSWORD_RESET_NOTICE]', notificationError);
  }
}

async function deliverSupportNotice({
  message,
  studentId,
  title,
  type,
}: {
  message: string;
  studentId: string;
  title: string;
  type: (typeof SUPPORT_NOTIFICATION_TYPES)[number];
}) {
  try {
    return await deliverSystemNotification({
      broadcast: false,
      includeParents: false,
      message,
      studentId,
      title,
      type,
      url: '/dashboard',
      userIds: [],
    });
  } catch (error) {
    if (error instanceof NotificationError && error.status === 404) {
      throw new SupportPortalError(
        'The selected student account is not active.',
        'student-not-found',
        404,
      );
    }

    throw new SupportPortalError(
      'The notification could not be delivered.',
      'invalid-notice',
      502,
    );
  }
}

export async function createStudentSupportNotice({
  message,
  studentId: rawStudentId,
  title,
}: {
  message: string;
  studentId: string;
  title: string;
}) {
  const studentId = assertStudentId(rawStudentId);
  const normalizedTitle = title.trim();
  const normalizedMessage = message.trim();

  if (
    normalizedTitle.length < 3 ||
    normalizedTitle.length > MAX_NOTICE_TITLE_LENGTH ||
    normalizedMessage.length < 3 ||
    normalizedMessage.length > MAX_NOTICE_MESSAGE_LENGTH
  ) {
    throw new SupportPortalError(
      'Enter a title and message within the allowed lengths.',
      'invalid-notice',
    );
  }

  const studentExists = await getPrisma().user.count({
    where: {
      id: studentId,
      role: 'STUDENT',
    },
  });

  if (studentExists !== 1) {
    throw new SupportPortalError(
      'The selected student account no longer exists.',
      'student-not-found',
      404,
    );
  }

  return deliverSupportNotice({
    message: normalizedMessage,
    studentId,
    title: normalizedTitle,
    type: 'ANNOUNCEMENT',
  });
}

export async function resendStudentNotification({
  notificationId: rawNotificationId,
  studentId: rawStudentId,
}: {
  notificationId: string;
  studentId: string;
}) {
  const studentId = assertStudentId(rawStudentId);
  const notificationId = rawNotificationId.trim();

  if (!notificationId || notificationId.length > 100) {
    throw new SupportPortalError(
      'Choose a valid recent notification.',
      'notification-not-found',
    );
  }

  const source = await getPrisma().systemNotification.findFirst({
    where: {
      id: notificationId,
      userId: studentId,
      type: {
        in: [...SUPPORT_NOTIFICATION_TYPES],
      },
      user: {
        role: 'STUDENT',
      },
    },
    select: {
      message: true,
      title: true,
      type: true,
    },
  });

  if (!source || !isSupportNotificationType(source.type)) {
    throw new SupportPortalError(
      'That notification is unavailable for support resend.',
      'notification-not-found',
      404,
    );
  }

  return deliverSupportNotice({
    message: source.message,
    studentId,
    title: source.title,
    type: source.type,
  });
}
