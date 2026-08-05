import 'server-only';

import { Prisma, type Role } from '@prisma/client';
import webPush, {
  type PushSubscription as WebPushSubscriptionPayload,
} from 'web-push';
import { getPrisma } from '@/lib/prisma';

export const NOTIFICATION_TYPES = [
  'ATTENDANCE',
  'GRADE',
  'PAYMENT',
  'ANNOUNCEMENT',
  'SYSTEM',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationFeedItem {
  createdAt: string;
  id: string;
  isRead: boolean;
  message: string;
  title: string;
  type: string;
}

export interface NotificationDeliveryRequest {
  broadcast: boolean;
  includeParents: boolean;
  message: string;
  studentId: string | null;
  title: string;
  type: NotificationType;
  url: string;
  userIds: string[];
}

interface VapidConfiguration {
  privateKey: string;
  publicKey: string;
  subject: string;
}

const RECENT_NOTIFICATION_LIMIT = 12;
const MAX_TARGETED_USERS = 100;
const PUSH_BATCH_SIZE = 25;
const MAX_PUSH_SUBSCRIPTIONS_PER_USER = 5;
const PUSH_REQUEST_TIMEOUT_MS = 10_000;
const TRUSTED_PUSH_ENDPOINT_HOSTS = [
  'android.googleapis.com',
  'fcm.googleapis.com',
] as const;
let warnedVapidConfiguration = '';

export class NotificationError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

function warnAboutVapidConfiguration(signature: string, message: string) {
  if (warnedVapidConfiguration === signature) return;
  warnedVapidConfiguration = signature;
  console.warn(`[WEB_PUSH_CONFIG] ${message}`);
}

function getVapidConfiguration(): VapidConfiguration | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? '';
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? '';
  const subject = process.env.VAPID_SUBJECT?.trim() ?? '';
  const configuredValues = [publicKey, privateKey, subject].filter(Boolean).length;

  if (configuredValues === 0) return null;

  if (configuredValues !== 3) {
    warnAboutVapidConfiguration(
      `partial:${configuredValues}`,
      'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, and VAPID_SUBJECT must all be set. In-app notifications remain enabled.',
    );
    return null;
  }

  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) {
    warnAboutVapidConfiguration(
      'invalid-subject',
      'VAPID_SUBJECT must be a mailto: or https:// contact URI. In-app notifications remain enabled.',
    );
    return null;
  }

  try {
    webPush.setVapidDetails(subject, publicKey, privateKey);
  } catch (error) {
    warnAboutVapidConfiguration(
      'invalid-keys',
      `VAPID keys are invalid. In-app notifications remain enabled. ${
        error instanceof Error ? error.message : ''
      }`.trim(),
    );
    return null;
  }

  return { privateKey, publicKey, subject };
}

export function getPushAvailability() {
  const configuration = getVapidConfiguration();

  return configuration
    ? { configured: true as const, publicKey: configuration.publicKey }
    : { configured: false as const, publicKey: null };
}

export async function getNotificationFeed(userId: string) {
  const prisma = getPrisma();
  const [notifications, unreadCount] = await Promise.all([
    prisma.systemNotification.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        id: true,
        isRead: true,
        message: true,
        title: true,
        type: true,
      },
      take: RECENT_NOTIFICATION_LIMIT,
      where: { userId },
    }),
    prisma.systemNotification.count({ where: { isRead: false, userId } }),
  ]);

  return {
    notifications: notifications.map(
      (notification): NotificationFeedItem => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      }),
    ),
    push: getPushAvailability(),
    unreadCount,
  };
}

export async function markAllNotificationsRead(userId: string) {
  return getPrisma().systemNotification.updateMany({
    data: { isRead: true },
    where: { isRead: false, userId },
  });
}

function readBoundedString(
  value: unknown,
  label: string,
  maximumLength: number,
  fallback?: string,
) {
  if (value === undefined && fallback !== undefined) return fallback;

  if (typeof value !== 'string') {
    throw new NotificationError(`${label} must be a string.`);
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maximumLength) {
    throw new NotificationError(
      `${label} must contain 1 to ${maximumLength} characters.`,
    );
  }

  return normalized;
}

function readRecipientId(value: unknown, label: string) {
  return readBoundedString(value, label, 128);
}

function readNotificationUrl(value: unknown) {
  if (value === undefined) return '/dashboard';
  const url = readBoundedString(value, 'url', 500);

  if (!url.startsWith('/') || url.startsWith('//')) {
    throw new NotificationError('url must be a same-origin path.');
  }

  const parsed = new URL(url, 'https://wayground.invalid');
  if (parsed.origin !== 'https://wayground.invalid') {
    throw new NotificationError('url must be a same-origin path.');
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function readNotificationDeliveryRequest(
  value: unknown,
): NotificationDeliveryRequest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NotificationError('A valid notification request is required.');
  }

  const rawBroadcast = Reflect.get(value, 'broadcast');
  if (rawBroadcast !== undefined && typeof rawBroadcast !== 'boolean') {
    throw new NotificationError('broadcast must be a boolean.');
  }
  const broadcast = rawBroadcast === true;

  const rawStudentId = Reflect.get(value, 'studentId');
  const studentId =
    rawStudentId === undefined ? null : readRecipientId(rawStudentId, 'studentId');

  const rawUserIds = Reflect.get(value, 'userIds');
  let userIds: string[] = [];
  if (rawUserIds !== undefined) {
    if (!Array.isArray(rawUserIds) || rawUserIds.length === 0) {
      throw new NotificationError('userIds must be a non-empty array.');
    }
    if (rawUserIds.length > MAX_TARGETED_USERS) {
      throw new NotificationError(
        `userIds cannot contain more than ${MAX_TARGETED_USERS} entries.`,
      );
    }
    userIds = Array.from(
      new Set(rawUserIds.map((entry) => readRecipientId(entry, 'userIds entry'))),
    );
  }

  const recipientModes = Number(broadcast) + Number(Boolean(studentId)) + Number(userIds.length > 0);
  if (recipientModes !== 1) {
    throw new NotificationError(
      'Choose exactly one recipient mode: studentId, userIds, or broadcast.',
    );
  }

  const rawIncludeParents = Reflect.get(value, 'includeParents');
  if (
    rawIncludeParents !== undefined &&
    typeof rawIncludeParents !== 'boolean'
  ) {
    throw new NotificationError('includeParents must be a boolean.');
  }

  const rawType = Reflect.get(value, 'type');
  const normalizedType =
    rawType === undefined
      ? 'ANNOUNCEMENT'
      : readBoundedString(rawType, 'type', 32).toUpperCase();
  if (!NOTIFICATION_TYPES.includes(normalizedType as NotificationType)) {
    throw new NotificationError(
      `type must be one of ${NOTIFICATION_TYPES.join(', ')}.`,
    );
  }

  return {
    broadcast,
    includeParents: rawIncludeParents ?? true,
    message: readBoundedString(
      Reflect.get(value, 'message'),
      'message',
      1_000,
      'You have a new update from Way Ground.',
    ),
    studentId,
    title: readBoundedString(
      Reflect.get(value, 'title'),
      'title',
      120,
      'Way Ground update',
    ),
    type: normalizedType as NotificationType,
    url: readNotificationUrl(Reflect.get(value, 'url')),
    userIds,
  };
}

export function readPushEndpoint(value: unknown) {
  const endpoint = readBoundedString(value, 'endpoint', 4_096);
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint);
  } catch {
    throw new NotificationError('endpoint must be a valid HTTPS URL.');
  }
  const hostname = endpointUrl.hostname.toLowerCase();
  const trustedHost =
    TRUSTED_PUSH_ENDPOINT_HOSTS.includes(
      hostname as (typeof TRUSTED_PUSH_ENDPOINT_HOSTS)[number],
    ) ||
    hostname.endsWith('.push.apple.com') ||
    hostname.endsWith('.push.services.mozilla.com') ||
    hostname.endsWith('.notify.windows.com');

  if (
    endpointUrl.protocol !== 'https:' ||
    !trustedHost ||
    endpointUrl.username ||
    endpointUrl.password ||
    (endpointUrl.port && endpointUrl.port !== '443') ||
    endpointUrl.hash
  ) {
    throw new NotificationError(
      'endpoint must belong to a supported browser push service.',
    );
  }

  return endpoint;
}

export function readPushSubscription(
  value: unknown,
): WebPushSubscriptionPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NotificationError('A valid push subscription is required.');
  }

  const endpoint = readPushEndpoint(Reflect.get(value, 'endpoint'));

  const keys = Reflect.get(value, 'keys');
  if (!keys || typeof keys !== 'object' || Array.isArray(keys)) {
    throw new NotificationError('Push subscription keys are required.');
  }

  return {
    endpoint,
    keys: {
      auth: readBoundedString(Reflect.get(keys, 'auth'), 'auth key', 512),
      p256dh: readBoundedString(
        Reflect.get(keys, 'p256dh'),
        'p256dh key',
        512,
      ),
    },
  };
}

export async function savePushSubscription(
  userId: string,
  subscription: WebPushSubscriptionPayload,
) {
  const prisma = getPrisma();
  const endpoint = readPushEndpoint(subscription.endpoint);
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw(
      Prisma.sql`select pg_advisory_xact_lock(hashtextextended(${`push-user:${userId}`}, 0))`,
    );
    await transaction.$queryRaw(
      Prisma.sql`select pg_advisory_xact_lock(hashtextextended(${`push-endpoint:${endpoint}`}, 0))`,
    );

    const existing = await transaction.webPushSubscription.findUnique({
      where: { endpoint },
      select: { userId: true },
    });

    if (existing && existing.userId !== userId) {
      throw new NotificationError(
        'This browser push subscription belongs to another account.',
        409,
      );
    }

    if (!existing) {
      const subscriptionCount = await transaction.webPushSubscription.count({
        where: { userId },
      });
      if (subscriptionCount >= MAX_PUSH_SUBSCRIPTIONS_PER_USER) {
        throw new NotificationError(
          `Each account may register up to ${MAX_PUSH_SUBSCRIPTIONS_PER_USER} browsers for push notifications.`,
          409,
        );
      }
    }

    return transaction.webPushSubscription.upsert({
      create: {
        auth: subscription.keys.auth,
        endpoint,
        p256dh: subscription.keys.p256dh,
        userId,
      },
      select: { id: true },
      update: {
        auth: subscription.keys.auth,
        p256dh: subscription.keys.p256dh,
      },
      where: { endpoint },
    });
  });
}

export async function removePushSubscription(userId: string, endpoint: string) {
  return getPrisma().webPushSubscription.deleteMany({
    where: { endpoint, userId },
  });
}

async function resolveRecipients(request: NotificationDeliveryRequest) {
  const prisma = getPrisma();
  let baseUsers: Array<{ id: string; role: Role }>;

  if (request.broadcast) {
    baseUsers = await prisma.user.findMany({
      select: { id: true, role: true },
      where: { status: 'ACTIVE' },
    });
  } else if (request.studentId) {
    const student = await prisma.user.findFirst({
      select: { id: true, role: true },
      where: {
        id: request.studentId,
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });

    if (!student) {
      throw new NotificationError('Active student recipient not found.', 404);
    }
    baseUsers = [student];
  } else {
    baseUsers = await prisma.user.findMany({
      select: { id: true, role: true },
      where: { id: { in: request.userIds }, status: 'ACTIVE' },
    });

    if (baseUsers.length !== request.userIds.length) {
      throw new NotificationError(
        'One or more recipient accounts are unavailable.',
        404,
      );
    }
  }

  const recipientIds = new Set(baseUsers.map(({ id }) => id));
  if (request.includeParents && !request.broadcast) {
    const studentIds = baseUsers
      .filter(({ role }) => role === 'STUDENT')
      .map(({ id }) => id);

    if (studentIds.length) {
      const parentLinks = await prisma.parentStudent.findMany({
        select: { parentId: true },
        where: {
          parent: { role: 'PARENT', status: 'ACTIVE' },
          studentId: { in: studentIds },
        },
      });
      parentLinks.forEach(({ parentId }) => recipientIds.add(parentId));
    }
  }

  return Array.from(recipientIds);
}

function getPushStatusCode(error: unknown) {
  if (!error || typeof error !== 'object') return null;
  const statusCode = Reflect.get(error, 'statusCode');
  return typeof statusCode === 'number' ? statusCode : null;
}

export async function deliverSystemNotification(
  request: NotificationDeliveryRequest,
) {
  const prisma = getPrisma();
  const recipientIds = await resolveRecipients(request);

  if (recipientIds.length) {
    await prisma.systemNotification.createMany({
      data: recipientIds.map((userId) => ({
        message: request.message,
        title: request.title,
        type: request.type,
        userId,
      })),
    });
  }

  const vapid = getVapidConfiguration();
  if (!vapid || recipientIds.length === 0) {
    return {
      inAppCreated: recipientIds.length,
      push: {
        attempted: 0,
        configured: Boolean(vapid),
        delivered: 0,
        failed: 0,
        removedSubscriptions: 0,
      },
      recipients: recipientIds.length,
    };
  }

  const subscriptions = await prisma.webPushSubscription.findMany({
    select: {
      auth: true,
      endpoint: true,
      id: true,
      p256dh: true,
    },
    where: { userId: { in: recipientIds } },
  });
  const payload = JSON.stringify({
    icon: '/icon-192x192.png',
    message: request.message,
    tag: `wayground-${request.type.toLowerCase()}`,
    title: request.title,
    type: request.type,
    url: request.url,
  });
  const staleSubscriptionIds = new Set<string>();
  let delivered = 0;
  let failed = 0;

  for (let offset = 0; offset < subscriptions.length; offset += PUSH_BATCH_SIZE) {
    const batch = subscriptions.slice(offset, offset + PUSH_BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (subscription) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: subscription.endpoint,
              keys: {
                auth: subscription.auth,
                p256dh: subscription.p256dh,
              },
            },
            payload,
            {
              TTL: 60 * 60,
              timeout: PUSH_REQUEST_TIMEOUT_MS,
              urgency: 'high',
              vapidDetails: vapid,
            },
          );
          return { delivered: true as const };
        } catch (error) {
          const statusCode = getPushStatusCode(error);
          if (statusCode === 404 || statusCode === 410) {
            staleSubscriptionIds.add(subscription.id);
          } else {
            console.warn(
              '[WEB_PUSH_DELIVERY]',
              statusCode ?? 'unknown-status',
              error instanceof Error ? error.message : 'Unknown push error',
            );
          }
          return { delivered: false as const };
        }
      }),
    );

    delivered += results.filter((result) => result.delivered).length;
    failed += results.filter((result) => !result.delivered).length;
  }

  if (staleSubscriptionIds.size) {
    await prisma.webPushSubscription.deleteMany({
      where: { id: { in: Array.from(staleSubscriptionIds) } },
    });
  }

  return {
    inAppCreated: recipientIds.length,
    push: {
      attempted: subscriptions.length,
      configured: true,
      delivered,
      failed,
      removedSubscriptions: staleSubscriptionIds.size,
    },
    recipients: recipientIds.length,
  };
}
