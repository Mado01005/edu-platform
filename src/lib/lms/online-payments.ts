import 'server-only';

import { randomUUID } from 'node:crypto';
import {
  type OnlinePaymentMethod,
  type PaymentCurrency,
  Prisma,
} from '@prisma/client';
import { lockAccountingMutation } from '@/lib/lms/accounting';
import { deliverSystemNotification } from '@/lib/lms/notifications';
import { getPrisma } from '@/lib/prisma';
import { getR2ObjectMetadata } from '@/lib/r2';
import { normalizePhoneNumber } from '@/lib/phone';
import { dispatchPaymentWhatsApp } from '@/lib/lms/whatsapp';

export const RECEIPT_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;

const METHOD_CURRENCY: Record<OnlinePaymentMethod, PaymentCurrency> = {
  INSTAPAY: 'EGP',
  ONLINE_CARD: 'EGP',
  PAYPAL: 'USD',
  USD_WIRE: 'USD',
  VODAFONE_CASH: 'EGP',
};

export class OnlinePaymentError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

function boundedText(value: unknown, label: string, maximum: number) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new OnlinePaymentError(`${label} is required.`);
  }
  const normalized = value.trim();
  if (normalized.length > maximum) {
    throw new OnlinePaymentError(`${label} is too long.`);
  }
  return normalized;
}

function method(value: unknown): OnlinePaymentMethod {
  if (
    value !== 'INSTAPAY' &&
    value !== 'VODAFONE_CASH' &&
    value !== 'ONLINE_CARD' &&
    value !== 'USD_WIRE' &&
    value !== 'PAYPAL'
  ) {
    throw new OnlinePaymentError('Choose a valid online payment method.');
  }
  return value;
}

function receiptType(value: unknown) {
  if (
    typeof value !== 'string' ||
    !RECEIPT_CONTENT_TYPES.includes(value as (typeof RECEIPT_CONTENT_TYPES)[number])
  ) {
    throw new OnlinePaymentError('Upload a JPG, PNG, or WebP receipt image.');
  }
  return value;
}

export async function getCheckoutCourse(studentId: string, courseId: string) {
  const course = await getPrisma().course.findFirst({
    where: {
      id: courseId,
      isPublished: true,
      enrollments: { none: { studentId } },
    },
    select: { id: true, priceEGP: true, priceUSD: true, title: true },
  });
  if (!course) throw new OnlinePaymentError('Course is unavailable for checkout.', 404);
  return course;
}

async function getCheckoutTarget(
  studentId: string,
  courseId: string,
  moduleId?: unknown,
) {
  const course = await getCheckoutCourse(studentId, courseId);
  if (moduleId === undefined || moduleId === null || moduleId === '') {
    return {
      amountEGP: course.priceEGP,
      course,
      module: null,
      purchaseKind: 'TERM_PACKAGE' as const,
      targetKey: 'term',
    };
  }
  const normalizedModuleId = boundedText(moduleId, 'Chapter', 128);
  const chapter = await getPrisma().module.findFirst({
    where: {
      courseId: course.id,
      id: normalizedModuleId,
      chapterAccess: { none: { studentId } },
    },
    select: { id: true, standalonePriceEGP: true, title: true },
  });
  if (!chapter || chapter.standalonePriceEGP.lte(0)) {
    throw new OnlinePaymentError('This chapter is unavailable for standalone checkout.', 404);
  }
  return {
    amountEGP: chapter.standalonePriceEGP,
    course,
    module: chapter,
    purchaseKind: 'CHAPTER' as const,
    targetKey: chapter.id,
  };
}

export async function prepareReceiptUpload({
  contentType,
  courseId,
  fileName,
  fileSize,
  method: rawMethod,
  moduleId,
  studentId,
}: {
  contentType: unknown;
  courseId: unknown;
  fileName: unknown;
  fileSize: unknown;
  method: unknown;
  moduleId?: unknown;
  studentId: string;
}) {
  const normalizedCourseId = boundedText(courseId, 'Course', 128);
  const normalizedMethod = method(rawMethod);
  const normalizedType = receiptType(contentType);
  if (!Number.isInteger(fileSize) || Number(fileSize) < 1 || Number(fileSize) > MAX_RECEIPT_BYTES) {
    throw new OnlinePaymentError('Receipt image must be 8 MB or smaller.');
  }
  const [target, channel] = await Promise.all([
    getCheckoutTarget(studentId, normalizedCourseId, moduleId),
    getPrisma().paymentChannel.findFirst({
      where: { isActive: true, method: normalizedMethod },
      select: { currency: true, id: true },
    }),
  ]);
  if (!channel || channel.currency !== METHOD_CURRENCY[normalizedMethod]) {
    throw new OnlinePaymentError('This payment method is not currently available.', 409);
  }
  if (target.purchaseKind === 'CHAPTER' && channel.currency !== 'EGP') {
    throw new OnlinePaymentError('Standalone chapters are available in EGP only.', 409);
  }
  const amount = channel.currency === 'EGP' ? target.amountEGP : target.course.priceUSD;
  if (amount.lte(0)) {
    throw new OnlinePaymentError(`This course does not have a ${channel.currency} checkout price.`, 409);
  }

  const original = boundedText(fileName, 'File name', 255);
  const extension =
    normalizedType === 'image/png'
      ? 'png'
      : normalizedType === 'image/webp'
        ? 'webp'
        : 'jpg';
  const stem = original
    .replace(/\.[^.]+$/, '')
    .replace(/[^A-Za-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'receipt';
  return {
    contentType: normalizedType,
    key: `lms/receipts/${studentId}/${target.course.id}/${target.targetKey}/${randomUUID()}-${stem}.${extension}`,
    method: normalizedMethod,
    moduleId: target.module?.id ?? null,
  };
}

export async function submitOnlinePayment({
  courseId,
  method: rawMethod,
  moduleId,
  receiptContentType,
  receiptObjectKey,
  studentId,
  transactionReference,
}: {
  courseId: unknown;
  method: unknown;
  moduleId?: unknown;
  receiptContentType: unknown;
  receiptObjectKey: unknown;
  studentId: string;
  transactionReference?: unknown;
}) {
  const normalizedCourseId = boundedText(courseId, 'Course', 128);
  const normalizedMethod = method(rawMethod);
  const normalizedType = receiptType(receiptContentType);
  const key = boundedText(receiptObjectKey, 'Receipt', 1_000);
  const target = await getCheckoutTarget(studentId, normalizedCourseId, moduleId);
  const expectedPrefix = `lms/receipts/${studentId}/${normalizedCourseId}/${target.targetKey}/`;
  if (!key.startsWith(expectedPrefix) || key.includes('..')) {
    throw new OnlinePaymentError('Receipt does not belong to this checkout.', 403);
  }
  const reference =
    transactionReference === undefined || transactionReference === null || transactionReference === ''
      ? null
      : boundedText(transactionReference, 'Transaction reference', 120);

  const [channel, metadata] = await Promise.all([
    getPrisma().paymentChannel.findFirst({
      where: { isActive: true, method: normalizedMethod },
      select: { currency: true },
    }),
    getR2ObjectMetadata(key),
  ]);
  if (!channel || channel.currency !== METHOD_CURRENCY[normalizedMethod]) {
    throw new OnlinePaymentError('This payment method is not currently available.', 409);
  }
  if (target.purchaseKind === 'CHAPTER' && channel.currency !== 'EGP') {
    throw new OnlinePaymentError('Standalone chapters are available in EGP only.', 409);
  }
  if (
    !metadata ||
    metadata.contentType !== normalizedType ||
    !metadata.sizeBytes ||
    metadata.sizeBytes > MAX_RECEIPT_BYTES
  ) {
    throw new OnlinePaymentError('Uploaded receipt metadata could not be verified.', 409);
  }
  const receiptSizeBytes = metadata.sizeBytes;
  const amount = channel.currency === 'EGP' ? target.amountEGP : target.course.priceUSD;
  if (amount.lte(0)) throw new OnlinePaymentError('Course price is unavailable.', 409);

  try {
    return await getPrisma().$transaction(async (tx) => {
      await lockAccountingMutation(tx);
      return tx.onlinePaymentSubmission.create({
        data: {
          amount,
          courseId: target.course.id,
          currency: channel.currency,
          moduleId: target.module?.id ?? null,
          paymentMethod: normalizedMethod,
          purchaseKind: target.purchaseKind,
          receiptContentType: normalizedType,
          receiptObjectKey: key,
          receiptSizeBytes,
          studentId,
          transactionReference: reference,
        },
        select: { id: true, status: true },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new OnlinePaymentError('A pending payment already exists for this course.', 409);
    }
    throw error;
  }
}

async function notifyPaymentResult({
  approved,
  courseTitle,
  reason,
  studentId,
}: {
  approved: boolean;
  courseTitle: string;
  reason?: string;
  studentId: string;
}) {
  try {
    await deliverSystemNotification({
      broadcast: false,
      includeParents: true,
      message: approved
        ? `Payment approved. ${courseTitle} is now available.`
        : `Payment needs a new receipt${reason ? `: ${reason}` : '.'}`,
      studentId,
      title: approved ? 'Course access approved' : 'Receipt rejected',
      type: 'PAYMENT',
      url: approved ? '/dashboard' : '/catalog',
      userIds: [],
    });
  } catch (error) {
    console.error('[ONLINE_PAYMENT_NOTIFICATION]', error);
  }
}

export async function approveOnlinePayment(paymentId: string, reviewerId: string) {
  const prisma = getPrisma();
  const result = await prisma.$transaction(async (tx) => {
    await lockAccountingMutation(tx);
    const payment = await tx.onlinePaymentSubmission.findUnique({
      where: { id: paymentId },
      select: {
        course: { select: { title: true } },
        courseId: true,
        id: true,
        module: { select: { id: true, title: true } },
        moduleId: true,
        purchaseKind: true,
        status: true,
        student: { select: { name: true, parentPhone: true, phoneNumber: true } },
        studentId: true,
      },
    });
    if (!payment) throw new OnlinePaymentError('Payment not found.', 404);
    if (payment.status !== 'PENDING') {
      throw new OnlinePaymentError('Only a pending payment can be approved.', 409);
    }
    const reviewedAt = new Date();
    const invoiceNumber = `WG-${reviewedAt.getUTCFullYear()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const updated = await tx.onlinePaymentSubmission.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { invoiceNumber, reviewedAt, reviewedById: reviewerId, status: 'APPROVED' },
    });
    if (updated.count !== 1) throw new OnlinePaymentError('Payment was already reviewed.', 409);
    if (payment.purchaseKind === 'CHAPTER') {
      if (!payment.moduleId) throw new OnlinePaymentError('Chapter payment is missing its target.', 409);
      await tx.studentChapterAccess.upsert({
        where: { studentId_moduleId: { moduleId: payment.moduleId, studentId: payment.studentId } },
        create: {
          approvedById: reviewerId,
          moduleId: payment.moduleId,
          studentId: payment.studentId,
        },
        update: { approvedAt: reviewedAt, approvedById: reviewerId },
      });
    } else {
      await tx.studentSubscription.upsert({
        where: { studentId_courseId: { courseId: payment.courseId, studentId: payment.studentId } },
        create: {
          approvedAt: reviewedAt,
          approvedById: reviewerId,
          courseId: payment.courseId,
          status: 'APPROVED',
          studentId: payment.studentId,
        },
        update: { approvedAt: reviewedAt, approvedById: reviewerId, status: 'APPROVED' },
      });
      await tx.enrollment.upsert({
        where: { studentId_courseId: { courseId: payment.courseId, studentId: payment.studentId } },
        create: { courseId: payment.courseId, studentId: payment.studentId },
        update: {},
      });
    }
    const targetTitle = payment.module?.title
      ? `${payment.course.title} — ${payment.module.title}`
      : payment.course.title;
    const phones = [...new Set([
      normalizePhoneNumber(payment.student.phoneNumber ?? ''),
      normalizePhoneNumber(payment.student.parentPhone ?? ''),
    ].filter((phone): phone is string => Boolean(phone)))];
    if (phones.length) {
      await tx.whatsAppDispatch.createMany({
        data: phones.map((phoneNumber) => ({
          message: `Oqool Academy: ${payment.student.name ?? 'Student'} now has access to ${targetTitle}. Payment ${invoiceNumber} was approved.`,
          paymentId: payment.id,
          phoneNumber,
          studentId: payment.studentId,
        })),
        skipDuplicates: true,
      });
    }
    return { courseTitle: targetTitle, invoiceNumber, paymentId: payment.id, studentId: payment.studentId };
  });
  await notifyPaymentResult({ approved: true, courseTitle: result.courseTitle, studentId: result.studentId });
  await dispatchPaymentWhatsApp(result.paymentId);
  return result;
}

export async function rejectOnlinePayment(
  paymentId: string,
  reviewerId: string,
  rawReason: unknown,
) {
  const reason = boundedText(rawReason, 'Rejection reason', 500);
  const prisma = getPrisma();
  const result = await prisma.$transaction(async (tx) => {
    await lockAccountingMutation(tx);
    const payment = await tx.onlinePaymentSubmission.findUnique({
      where: { id: paymentId },
      select: { course: { select: { title: true } }, id: true, status: true, studentId: true },
    });
    if (!payment) throw new OnlinePaymentError('Payment not found.', 404);
    if (payment.status !== 'PENDING') throw new OnlinePaymentError('Payment was already reviewed.', 409);
    const updated = await tx.onlinePaymentSubmission.updateMany({
      where: { id: payment.id, status: 'PENDING' },
      data: { rejectionReason: reason, reviewedAt: new Date(), reviewedById: reviewerId, status: 'REJECTED' },
    });
    if (updated.count !== 1) throw new OnlinePaymentError('Payment was already reviewed.', 409);
    return { courseTitle: payment.course.title, studentId: payment.studentId };
  });
  await notifyPaymentResult({ approved: false, courseTitle: result.courseTitle, reason, studentId: result.studentId });
  return result;
}

export async function updatePaymentChannel({
  actorId,
  accountValue,
  displayName,
  instructions,
  isActive,
  method: rawMethod,
}: {
  actorId: string;
  accountValue: unknown;
  displayName: unknown;
  instructions?: unknown;
  isActive: unknown;
  method: unknown;
}) {
  const normalizedMethod = method(rawMethod);
  const normalizedInstructions =
    instructions === undefined || instructions === null || instructions === ''
      ? null
      : boundedText(instructions, 'Instructions', 1_000);
  const normalizedAccountValue = boundedText(accountValue, 'Account or handle', 200);
  const normalizedDisplayName = boundedText(displayName, 'Display name', 80);
  return getPrisma().$transaction(async (tx) => {
    await lockAccountingMutation(tx);
    return tx.paymentChannel.upsert({
      where: { method: normalizedMethod },
      create: {
        accountValue: normalizedAccountValue,
        currency: METHOD_CURRENCY[normalizedMethod],
        displayName: normalizedDisplayName,
        instructions: normalizedInstructions,
        isActive: isActive === true,
        method: normalizedMethod,
        updatedById: actorId,
      },
      update: {
        accountValue: normalizedAccountValue,
        currency: METHOD_CURRENCY[normalizedMethod],
        displayName: normalizedDisplayName,
        instructions: normalizedInstructions,
        isActive: isActive === true,
        updatedById: actorId,
      },
    });
  });
}
