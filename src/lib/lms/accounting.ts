import 'server-only';

import {
  PaymentCurrency,
  PaymentMethod,
  Prisma,
} from '@prisma/client';
import { getPrisma } from '@/lib/prisma';

const MONEY_PATTERN = /^\d{1,9}(?:\.\d{1,2})?$/;
const RATE_PATTERN = /^\d{1,6}(?:\.\d{1,4})?$/;
const RECEIPT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/_-]{2,79}$/;

export class AccountingError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

async function lockAccountingMutation(tx: Prisma.TransactionClient) {
  // Accounting writes touch several tables whose invariant triggers lock
  // different user-role sets. Serializing these low-volume mutations avoids
  // cross-operator lock-order cycles while retaining transaction rollback.
  await tx.$executeRaw`
    select pg_advisory_xact_lock(
      hashtextextended('wayground:lms:accounting-mutation', 0)
    )
  `;
}

function requiredText(
  value: unknown,
  label: string,
  maximumLength: number,
) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new AccountingError(`${label} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new AccountingError(
      `${label} must be ${maximumLength} characters or fewer.`,
    );
  }
  return normalized;
}

function optionalText(
  value: unknown,
  label: string,
  maximumLength: number,
) {
  if (value === null || value === undefined || value === '') return null;
  return requiredText(value, label, maximumLength);
}

function parseMoney(value: unknown) {
  const normalized = requiredText(value, 'Amount', 20);
  if (!MONEY_PATTERN.test(normalized)) {
    throw new AccountingError(
      'Enter a positive amount with no more than two decimal places.',
    );
  }
  const amount = new Prisma.Decimal(normalized);
  if (amount.lte(0)) {
    throw new AccountingError('Payment amount must be greater than zero.');
  }
  return amount;
}

function parseExchangeRate(value: unknown) {
  const normalized = requiredText(value, 'Exchange rate', 20);
  if (!RATE_PATTERN.test(normalized)) {
    throw new AccountingError(
      'Enter a positive exchange rate with no more than four decimal places.',
    );
  }
  const rate = new Prisma.Decimal(normalized);
  if (rate.lte(0)) {
    throw new AccountingError('Exchange rate must be greater than zero.');
  }
  return rate;
}

function paymentCurrency(value: unknown): PaymentCurrency {
  if (value !== 'USD' && value !== 'EGP') {
    throw new AccountingError('Choose USD or EGP.');
  }
  return value;
}

function paymentMethod(value: unknown): PaymentMethod {
  if (
    value !== 'WIRE_TRANSFER' &&
    value !== 'CASH' &&
    value !== 'ONLINE_CARD'
  ) {
    throw new AccountingError('Choose a valid payment method.');
  }
  return value;
}

function optionalHttpsUrl(value: unknown) {
  const raw = optionalText(value, 'Receipt URL', 2_048);
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') throw new Error('invalid protocol');
    return url.toString();
  } catch {
    throw new AccountingError('Receipt URL must be a valid HTTPS URL.');
  }
}

export function readManualPaymentInput(value: unknown) {
  if (!value || typeof value !== 'object') {
    throw new AccountingError('A valid payment record is required.');
  }

  const currency = paymentCurrency(Reflect.get(value, 'currency'));
  const amount = parseMoney(Reflect.get(value, 'amount'));
  const exchangeRate =
    currency === 'EGP'
      ? parseExchangeRate(Reflect.get(value, 'exchangeRate'))
      : null;
  const receiptNumber = requiredText(
    Reflect.get(value, 'receiptNumber'),
    'Receipt number',
    80,
  );

  if (!RECEIPT_PATTERN.test(receiptNumber)) {
    throw new AccountingError(
      'Receipt number may contain letters, numbers, slashes, dashes, and underscores.',
    );
  }

  return {
    amountEGP: currency === 'EGP' ? amount : null,
    amountUSD:
      currency === 'USD'
        ? amount
        : amount.div(exchangeRate!).toDecimalPlaces(2),
    approveNow: Reflect.get(value, 'approveNow') === true,
    currency,
    exchangeRate,
    notes: optionalText(Reflect.get(value, 'notes'), 'Notes', 1_000),
    paymentType: paymentMethod(Reflect.get(value, 'paymentType')),
    receiptNumber,
    receiptUrl: optionalHttpsUrl(Reflect.get(value, 'receiptUrl')),
    studentId: requiredText(
      Reflect.get(value, 'studentId'),
      'Student',
      100,
    ),
    subscriptionId: optionalText(
      Reflect.get(value, 'subscriptionId'),
      'Subscription',
      100,
    ),
  };
}

async function assertStudent(studentId: string) {
  const student = await getPrisma().user.findFirst({
    where: { id: studentId, role: 'STUDENT', status: 'ACTIVE' },
    select: { id: true },
  });
  if (!student) throw new AccountingError('Student account not found.', 404);
}

export async function createManualPayment({
  actorId,
  input,
}: {
  actorId: string;
  input: ReturnType<typeof readManualPaymentInput>;
}) {
  const prisma = getPrisma();
  await assertStudent(input.studentId);

  try {
    return await prisma.$transaction(async (tx) => {
      await lockAccountingMutation(tx);

      if (input.subscriptionId) {
        const subscription = await tx.studentSubscription.findFirst({
          where: {
            id: input.subscriptionId,
            studentId: input.studentId,
          },
          select: { id: true, status: true },
        });
        if (!subscription) {
          throw new AccountingError(
            'The selected subscription does not belong to this student.',
            409,
          );
        }
        if (subscription.status !== 'PENDING') {
          throw new AccountingError(
            'Only a pending subscription can be linked to a payment.',
            409,
          );
        }
      }

      const approvedAt = input.approveNow ? new Date() : null;

      // A linked subscription must be locked before the ledger row. The
      // database role-invariant triggers also lock the referenced users, so
      // keeping this order consistent with approveSubscription prevents a
      // subscription-row -> user-row / user-row -> subscription-row deadlock.
      if (approvedAt && input.subscriptionId) {
        const approval = await tx.studentSubscription.updateMany({
          where: { id: input.subscriptionId, status: 'PENDING' },
          data: {
            approvedAt,
            approvedById: actorId,
            status: 'APPROVED',
          },
        });
        if (approval.count !== 1) {
          throw new AccountingError(
            'The linked subscription is no longer pending.',
            409,
          );
        }
        const subscription = await tx.studentSubscription.findUniqueOrThrow({
          where: { id: input.subscriptionId },
          select: { courseId: true, studentId: true },
        });
        await tx.enrollment.upsert({
          where: {
            studentId_courseId: {
              courseId: subscription.courseId,
              studentId: subscription.studentId,
            },
          },
          create: {
            courseId: subscription.courseId,
            studentId: subscription.studentId,
          },
          update: {},
        });
      }

      const payment = await tx.uSDManualLedger.create({
        data: {
          amountEGP: input.amountEGP,
          amountUSD: input.amountUSD,
          approvedAt,
          approvedById: input.approveNow ? actorId : null,
          createdById: actorId,
          currency: input.currency,
          exchangeRate: input.exchangeRate,
          notes: input.notes,
          paymentType: input.paymentType,
          receiptNumber: input.receiptNumber,
          receiptUrl: input.receiptUrl,
          status: input.approveNow ? 'APPROVED' : 'PENDING',
          studentId: input.studentId,
          subscriptionId: input.subscriptionId,
        },
        select: { id: true, receiptNumber: true, status: true },
      });

      if (input.approveNow) {
        await tx.systemNotification.create({
          data: {
            message: `Payment receipt ${input.receiptNumber} was approved.`,
            title: 'Payment approved',
            type: 'PAYMENT',
            userId: input.studentId,
          },
        });
      }

      return payment;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new AccountingError('That receipt number already exists.', 409);
    }
    throw error;
  }
}

export async function createPendingSubscription({
  courseId,
  studentId,
}: {
  courseId: string;
  studentId: string;
}) {
  const prisma = getPrisma();
  await assertStudent(studentId);
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!course) throw new AccountingError('Course not found.', 404);

  try {
    return await prisma.$transaction(async (tx) => {
      await lockAccountingMutation(tx);

      const existing = await tx.studentSubscription.findUnique({
        where: { studentId_courseId: { courseId, studentId } },
        select: { id: true, status: true },
      });

      if (existing?.status === 'APPROVED') {
        throw new AccountingError(
          'This student subscription is already approved.',
          409,
        );
      }
      if (existing?.status === 'PENDING') return existing;
      if (existing) {
        const reopened = await tx.studentSubscription.updateMany({
          where: {
            id: existing.id,
            status: { in: ['REJECTED', 'EXPIRED'] },
          },
          data: {
            approvedAt: null,
            approvedById: null,
            status: 'PENDING',
          },
        });
        if (reopened.count === 1) {
          return { id: existing.id, status: 'PENDING' as const };
        }

        const concurrent = await tx.studentSubscription.findUnique({
          where: { id: existing.id },
          select: { id: true, status: true },
        });
        if (concurrent?.status === 'PENDING') return concurrent;
        if (concurrent?.status === 'APPROVED') {
          throw new AccountingError(
            'This student subscription was approved by another operator.',
            409,
          );
        }
        throw new AccountingError(
          'This subscription changed while it was being reopened.',
          409,
        );
      }

      return tx.studentSubscription.create({
        data: { courseId, studentId },
        select: { id: true, status: true },
      });
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      const concurrent = await prisma.studentSubscription.findUnique({
        where: { studentId_courseId: { courseId, studentId } },
        select: { id: true, status: true },
      });
      if (concurrent?.status === 'PENDING') return concurrent;
    }
    throw error;
  }
}

export async function approveSubscription({
  actorId,
  subscriptionId,
}: {
  actorId: string;
  subscriptionId: string;
}) {
  const prisma = getPrisma();
  const subscription = await prisma.studentSubscription.findUnique({
    where: { id: subscriptionId },
    select: {
      course: { select: { title: true } },
      courseId: true,
      id: true,
      status: true,
      studentId: true,
    },
  });
  if (!subscription) {
    throw new AccountingError('Subscription not found.', 404);
  }
  if (subscription.status !== 'PENDING') {
    throw new AccountingError('Only pending subscriptions can be approved.', 409);
  }

  return prisma.$transaction(async (tx) => {
    await lockAccountingMutation(tx);
    const approvedAt = new Date();
    const updated = await tx.studentSubscription.updateMany({
      where: { id: subscription.id, status: 'PENDING' },
      data: {
        approvedAt,
        approvedById: actorId,
        status: 'APPROVED',
      },
    });
    if (updated.count !== 1) {
      throw new AccountingError('This subscription is no longer pending.', 409);
    }
    await tx.enrollment.upsert({
      where: {
        studentId_courseId: {
          courseId: subscription.courseId,
          studentId: subscription.studentId,
        },
      },
      create: {
        courseId: subscription.courseId,
        studentId: subscription.studentId,
      },
      update: {},
    });
    await tx.systemNotification.create({
      data: {
        message: `Your subscription to ${subscription.course.title} is now active.`,
        title: 'Subscription approved',
        type: 'PAYMENT',
        userId: subscription.studentId,
      },
    });
    return { id: subscription.id, status: 'APPROVED' as const };
  });
}

export async function approvePayment({
  actorId,
  paymentId,
}: {
  actorId: string;
  paymentId: string;
}) {
  const prisma = getPrisma();
  const payment = await prisma.uSDManualLedger.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      receiptNumber: true,
      status: true,
      studentId: true,
      subscription: {
        select: {
          courseId: true,
          id: true,
          status: true,
          studentId: true,
        },
      },
    },
  });
  if (!payment) throw new AccountingError('Payment not found.', 404);
  if (payment.status !== 'PENDING') {
    throw new AccountingError('Only pending payments can be approved.', 409);
  }

  await prisma.$transaction(async (tx) => {
    await lockAccountingMutation(tx);
    const approvedAt = new Date();
    // Match approveSubscription's lock order: subscription first, then the
    // ledger row. Both tables' invariant triggers lock their referenced users.
    if (payment.subscription) {
      const subscriptionApproval = await tx.studentSubscription.updateMany({
        where: { id: payment.subscription.id, status: 'PENDING' },
        data: {
          approvedAt,
          approvedById: actorId,
          status: 'APPROVED',
        },
      });
      if (
        subscriptionApproval.count !== 1 &&
        payment.subscription.status !== 'APPROVED'
      ) {
        throw new AccountingError(
          'The linked subscription is no longer pending.',
          409,
        );
      }
      await tx.enrollment.upsert({
        where: {
          studentId_courseId: {
            courseId: payment.subscription.courseId,
            studentId: payment.subscription.studentId,
          },
        },
        create: {
          courseId: payment.subscription.courseId,
          studentId: payment.subscription.studentId,
        },
        update: {},
      });
    }

    const updated = await tx.uSDManualLedger.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: {
        approvedAt,
        approvedById: actorId,
        status: 'APPROVED',
      },
    });
    if (updated.count !== 1) {
      throw new AccountingError('This payment is no longer pending.', 409);
    }
    await tx.systemNotification.create({
      data: {
        message: `Payment receipt ${payment.receiptNumber} was approved.`,
        title: 'Payment approved',
        type: 'PAYMENT',
        userId: payment.studentId,
      },
    });
  });

  return { id: payment.id, status: 'APPROVED' as const };
}
