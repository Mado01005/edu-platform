const mockUserFindFirst = jest.fn();
const mockCourseFindUnique = jest.fn();
const mockSubscriptionFindFirst = jest.fn();
const mockSubscriptionFindUnique = jest.fn();
const mockSubscriptionCreate = jest.fn();
const mockSubscriptionUpdateMany = jest.fn();
const mockSubscriptionFindUniqueOrThrow = jest.fn();
const mockEnrollmentUpsert = jest.fn();
const mockLedgerCreate = jest.fn();
const mockLedgerFindUnique = jest.fn();
const mockLedgerUpdateMany = jest.fn();
const mockNotificationCreate = jest.fn();
const mockAdvisoryLock = jest.fn();
const transactionOrder: string[] = [];

const mockTransaction = {
  $executeRaw: mockAdvisoryLock,
  enrollment: { upsert: mockEnrollmentUpsert },
  studentSubscription: {
    create: mockSubscriptionCreate,
    findFirst: mockSubscriptionFindFirst,
    findUnique: mockSubscriptionFindUnique,
    findUniqueOrThrow: mockSubscriptionFindUniqueOrThrow,
    updateMany: mockSubscriptionUpdateMany,
  },
  systemNotification: { create: mockNotificationCreate },
  uSDManualLedger: {
    create: mockLedgerCreate,
    updateMany: mockLedgerUpdateMany,
  },
};

const mockTransactionRunner = jest.fn(
  async (operation: (transaction: typeof mockTransaction) => unknown) =>
    operation(mockTransaction),
);

jest.mock('server-only', () => ({}));
jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    $transaction: mockTransactionRunner,
    course: { findUnique: mockCourseFindUnique },
    studentSubscription: { findUnique: mockSubscriptionFindUnique },
    uSDManualLedger: { findUnique: mockLedgerFindUnique },
    user: { findFirst: mockUserFindFirst },
  }),
}));

import {
  approvePayment,
  approveSubscription,
  createManualPayment,
  createPendingSubscription,
  readManualPaymentInput,
} from '@/lib/lms/accounting';

describe('accounting transaction lock order', () => {
  beforeEach(() => {
    transactionOrder.length = 0;
    mockAdvisoryLock.mockImplementation(async () => {
      transactionOrder.push('advisoryLock');
      return [{ pg_advisory_xact_lock: null }];
    });
    mockUserFindFirst.mockResolvedValue({ id: 'student-1' });
    mockCourseFindUnique.mockResolvedValue({ id: 'course-1' });
    mockSubscriptionFindFirst.mockResolvedValue({
      id: 'subscription-1',
      status: 'PENDING',
    });
    mockSubscriptionUpdateMany.mockImplementation(async () => {
      transactionOrder.push('studentSubscription');
      return { count: 1 };
    });
    mockSubscriptionCreate.mockImplementation(async () => {
      transactionOrder.push('studentSubscription');
      return { id: 'subscription-1', status: 'PENDING' };
    });
    mockSubscriptionFindUniqueOrThrow.mockResolvedValue({
      courseId: 'course-1',
      studentId: 'student-1',
    });
    mockEnrollmentUpsert.mockResolvedValue({ id: 'enrollment-1' });
    mockLedgerCreate.mockImplementation(async () => {
      transactionOrder.push('uSDManualLedger');
      return {
        id: 'payment-1',
        receiptNumber: 'RECEIPT-001',
        status: 'APPROVED',
      };
    });
    mockLedgerFindUnique.mockResolvedValue({
      id: 'payment-1',
      receiptNumber: 'RECEIPT-001',
      status: 'PENDING',
      studentId: 'student-1',
      subscription: {
        courseId: 'course-1',
        id: 'subscription-1',
        status: 'PENDING',
        studentId: 'student-1',
      },
    });
    mockLedgerUpdateMany.mockImplementation(async () => {
      transactionOrder.push('uSDManualLedger');
      return { count: 1 };
    });
    mockNotificationCreate.mockResolvedValue({ id: 'notification-1' });
    mockTransactionRunner.mockImplementation(async (operation) =>
      operation(mockTransaction),
    );
  });

  it('locks the linked subscription before creating an approved ledger row', async () => {
    const input = readManualPaymentInput({
      amount: '125.00',
      approveNow: true,
      currency: 'USD',
      paymentType: 'WIRE_TRANSFER',
      receiptNumber: 'RECEIPT-001',
      studentId: 'student-1',
      subscriptionId: 'subscription-1',
    });

    await createManualPayment({ actorId: 'accountant-1', input });

    expect(transactionOrder).toEqual([
      'advisoryLock',
      'studentSubscription',
      'uSDManualLedger',
    ]);
    expect(mockTransactionRunner).toHaveBeenCalledTimes(1);
  });

  it('locks the linked subscription before approving its ledger row', async () => {
    await approvePayment({
      actorId: 'accountant-1',
      paymentId: 'payment-1',
    });

    expect(transactionOrder).toEqual([
      'advisoryLock',
      'studentSubscription',
      'uSDManualLedger',
    ]);
    expect(mockTransactionRunner).toHaveBeenCalledTimes(1);
  });

  it('takes the shared lock before creating a pending subscription', async () => {
    mockSubscriptionFindUnique.mockResolvedValue(null);

    await createPendingSubscription({
      courseId: 'course-1',
      studentId: 'student-1',
    });

    expect(transactionOrder).toEqual([
      'advisoryLock',
      'studentSubscription',
    ]);
    expect(mockTransactionRunner).toHaveBeenCalledTimes(1);
  });

  it('takes the shared lock before directly approving a subscription', async () => {
    mockSubscriptionFindUnique.mockResolvedValue({
      course: { title: 'Mathematics' },
      courseId: 'course-1',
      id: 'subscription-1',
      status: 'PENDING',
      studentId: 'student-1',
    });

    await approveSubscription({
      actorId: 'accountant-1',
      subscriptionId: 'subscription-1',
    });

    expect(transactionOrder).toEqual([
      'advisoryLock',
      'studentSubscription',
    ]);
    expect(mockTransactionRunner).toHaveBeenCalledTimes(1);
  });
});
