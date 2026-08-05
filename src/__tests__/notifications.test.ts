const mockPushFindUnique = jest.fn();
const mockPushCount = jest.fn();
const mockPushUpsert = jest.fn();
const mockQueryRaw = jest.fn();

const mockTransaction = {
  $queryRaw: mockQueryRaw,
  webPushSubscription: {
    count: mockPushCount,
    findUnique: mockPushFindUnique,
    upsert: mockPushUpsert,
  },
};

jest.mock('server-only', () => ({}));
jest.mock('@/lib/prisma', () => ({
  getPrisma: () => ({
    $transaction: (
      operation: (transaction: typeof mockTransaction) => unknown,
    ) => operation(mockTransaction),
  }),
}));
jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    sendNotification: jest.fn(),
    setVapidDetails: jest.fn(),
  },
}));

import {
  NotificationError,
  readPushEndpoint,
  savePushSubscription,
} from '@/lib/lms/notifications';

const subscription = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/subscription-1',
  keys: {
    auth: 'auth-key',
    p256dh: 'p256dh-key',
  },
};

describe('web push subscription ownership', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPushCount.mockResolvedValue(0);
    mockQueryRaw.mockResolvedValue([]);
    mockPushUpsert.mockResolvedValue({ id: 'push-id' });
  });

  it('rejects arbitrary HTTPS endpoints before they can become SSRF targets', () => {
    expect(() =>
      readPushEndpoint('https://internal.example.test/push'),
    ).toThrow('endpoint must belong to a supported browser push service.');
    expect(
      readPushEndpoint('https://fcm.googleapis.com/fcm/send/subscription-id'),
    ).toBe('https://fcm.googleapis.com/fcm/send/subscription-id');
  });

  it('creates or refreshes an endpoint owned by the current user', async () => {
    mockPushFindUnique.mockResolvedValue({ userId: 'user-1' });

    await expect(
      savePushSubscription('user-1', subscription),
    ).resolves.toEqual({ id: 'push-id' });

    expect(mockPushUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: {
          auth: 'auth-key',
          p256dh: 'p256dh-key',
        },
      }),
    );
  });

  it('does not transfer an endpoint between user accounts', async () => {
    mockPushFindUnique.mockResolvedValue({ userId: 'user-2' });

    await expect(
      savePushSubscription('user-1', subscription),
    ).rejects.toEqual(
      expect.objectContaining<Partial<NotificationError>>({
        message: 'This browser push subscription belongs to another account.',
        status: 409,
      }),
    );
    expect(mockPushUpsert).not.toHaveBeenCalled();
  });
});
