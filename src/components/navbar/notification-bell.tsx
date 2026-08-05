'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarCheck2,
  CheckCheck,
  GraduationCap,
  Loader2,
  Megaphone,
  ReceiptText,
} from 'lucide-react';
import { Button } from '@/components/UI/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/UI/dropdown-menu';

interface NotificationItem {
  createdAt: string;
  id: string;
  isRead: boolean;
  message: string;
  title: string;
  type: string;
}

interface NotificationFeedResponse {
  error?: string;
  notifications: NotificationItem[];
  push: {
    configured: boolean;
    publicKey: string | null;
  };
  unreadCount: number;
}

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const decoded = window.atob(base64);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes.buffer as ArrayBuffer;
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '';

  const elapsedSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1_000));
  if (elapsedSeconds < 60) return 'Just now';
  if (elapsedSeconds < 3_600) return `${Math.floor(elapsedSeconds / 60)}m ago`;
  if (elapsedSeconds < 86_400) return `${Math.floor(elapsedSeconds / 3_600)}h ago`;
  if (elapsedSeconds < 604_800) return `${Math.floor(elapsedSeconds / 86_400)}d ago`;

  return new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(timestamp));
}

function notificationPresentation(type: string) {
  if (type === 'ATTENDANCE') {
    return {
      Icon: CalendarCheck2,
      label: 'Attendance',
      tone: 'bg-cyan-400/10 text-cyan-300',
    };
  }
  if (type === 'GRADE') {
    return {
      Icon: GraduationCap,
      label: 'Grade',
      tone: 'bg-violet-400/10 text-violet-300',
    };
  }
  if (type === 'PAYMENT') {
    return {
      Icon: ReceiptText,
      label: 'Payment',
      tone: 'bg-emerald-400/10 text-emerald-300',
    };
  }
  if (type === 'ANNOUNCEMENT') {
    return {
      Icon: Megaphone,
      label: 'Announcement',
      tone: 'bg-amber-400/10 text-amber-300',
    };
  }

  return {
    Icon: BellRing,
    label: 'System',
    tone: 'bg-white/5 text-zinc-300',
  };
}

async function responseError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
  } | null;
  return body?.error || fallback;
}

async function persistPushSubscription(subscription: PushSubscription) {
  return fetch('/api/notifications/subscriptions', {
    body: JSON.stringify(subscription.toJSON()),
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });
}

function pushKeysMatch(
  registeredKey: ArrayBuffer | null,
  configuredKey: ArrayBuffer,
) {
  if (!registeredKey) return false;
  const registered = new Uint8Array(registeredKey);
  const configured = new Uint8Array(configuredKey);
  return (
    registered.length === configured.length &&
    registered.every((value, index) => value === configured[index])
  );
}

async function removeStoredPushSubscription(subscription: PushSubscription) {
  return fetch('/api/notifications/subscriptions', {
    body: JSON.stringify({ endpoint: subscription.endpoint }),
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    method: 'DELETE',
  });
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [markingRead, setMarkingRead] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [pushPending, setPushPending] = useState(false);
  const [pushError, setPushError] = useState('');
  const refreshPending = useRef(false);
  const feedRequestVersion = useRef(0);
  const notificationMutationPending = useRef(false);

  const refreshFeed = useCallback(async (showLoading = false) => {
    if (refreshPending.current || notificationMutationPending.current) return;
    refreshPending.current = true;
    const requestVersion = ++feedRequestVersion.current;
    if (showLoading) setLoading(true);

    try {
      const response = await fetch('/api/notifications', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!response.ok) {
        throw new Error(
          await responseError(response, 'Unable to load notifications.'),
        );
      }

      const feed = (await response.json()) as NotificationFeedResponse;
      if (requestVersion !== feedRequestVersion.current) return;
      setNotifications(feed.notifications);
      setUnreadCount(feed.unreadCount);
      setPushConfigured(feed.push.configured);
      setVapidPublicKey(feed.push.publicKey);
      setFeedError('');
    } catch (error) {
      setFeedError(
        error instanceof Error ? error.message : 'Unable to load notifications.',
      );
    } finally {
      setLoading(false);
      refreshPending.current = false;
    }
  }, []);

  useEffect(() => {
    void refreshFeed(true);

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'visible') void refreshFeed();
    };
    const interval = window.setInterval(refreshWhenVisible, 60_000);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    const serviceWorker = 'serviceWorker' in navigator ? navigator.serviceWorker : null;
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'WAYGROUND_NOTIFICATION') void refreshFeed();
    };
    serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [refreshFeed]);

  useEffect(() => {
    if (
      !pushConfigured ||
      !vapidPublicKey ||
      !window.isSecureContext ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window) ||
      !('Notification' in window)
    ) {
      setPushSupported(false);
      setPushSubscribed(false);
      return;
    }

    let active = true;
    setPushSupported(true);
    setPushPermission(Notification.permission);
    void navigator.serviceWorker.ready
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return false;

        const configuredKey = applicationServerKey(vapidPublicKey);
        if (
          !pushKeysMatch(
            subscription.options.applicationServerKey,
            configuredKey,
          )
        ) {
          const removal = await removeStoredPushSubscription(subscription);
          if (!removal.ok) {
            throw new Error(
              await responseError(
                removal,
                'Unable to rotate this browser push subscription.',
              ),
            );
          }
          await subscription.unsubscribe();
          const replacement = await registration.pushManager.subscribe({
            applicationServerKey: configuredKey,
            userVisibleOnly: true,
          });
          const replacementResponse = await persistPushSubscription(replacement);
          if (!replacementResponse.ok) {
            await replacement.unsubscribe();
            throw new Error(
              await responseError(
                replacementResponse,
                'Unable to rotate this browser push subscription.',
              ),
            );
          }
          return true;
        }

        const response = await persistPushSubscription(subscription);
        if (response.ok) return true;

        if (response.status === 409) {
          await subscription.unsubscribe();
          return false;
        }

        throw new Error(
          await responseError(
            response,
            'Unable to verify this browser push subscription.',
          ),
        );
      })
      .then((subscribed) => {
        if (active) setPushSubscribed(subscribed);
      })
      .catch((error) => {
        if (active) {
          setPushSubscribed(false);
          setPushError(
            error instanceof Error
              ? error.message
              : 'Unable to verify browser push.',
          );
        }
      });

    return () => {
      active = false;
    };
  }, [pushConfigured, vapidPublicKey]);

  async function markAllRead() {
    if (!unreadCount || markingRead) return;

    const previousNotifications = notifications;
    const previousUnreadCount = unreadCount;
    notificationMutationPending.current = true;
    feedRequestVersion.current += 1;
    setMarkingRead(true);
    setFeedError('');
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, isRead: true })),
    );
    setUnreadCount(0);

    try {
      const response = await fetch('/api/notifications/read-all', {
        credentials: 'same-origin',
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error(
          await responseError(response, 'Unable to mark notifications as read.'),
        );
      }
    } catch (error) {
      setNotifications(previousNotifications);
      setUnreadCount(previousUnreadCount);
      setFeedError(
        error instanceof Error
          ? error.message
          : 'Unable to mark notifications as read.',
      );
    } finally {
      notificationMutationPending.current = false;
      setMarkingRead(false);
    }
  }

  async function togglePushSubscription() {
    if (!pushSupported || !vapidPublicKey || pushPending) return;

    setPushPending(true);
    setPushError('');

    try {
      const registration = await navigator.serviceWorker.ready;
      const currentSubscription =
        await registration.pushManager.getSubscription();

      if (currentSubscription) {
        const response = await removeStoredPushSubscription(currentSubscription);
        if (!response.ok) {
          throw new Error(
            await responseError(response, 'Unable to disable browser push.'),
          );
        }

        await currentSubscription.unsubscribe();
        setPushSubscribed(false);
        return;
      }

      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== 'granted') {
        throw new Error('Browser notification permission was not granted.');
      }

      const subscription = await registration.pushManager.subscribe({
        applicationServerKey: applicationServerKey(vapidPublicKey),
        userVisibleOnly: true,
      });

      const response = await persistPushSubscription(subscription);
      if (!response.ok) {
        await subscription.unsubscribe();
        throw new Error(
          await responseError(response, 'Unable to enable browser push.'),
        );
      }

      setPushSubscribed(true);
    } catch (error) {
      setPushError(
        error instanceof Error
          ? error.message
          : 'Unable to update browser push.',
      );
    } finally {
      setPushPending(false);
    }
  }

  return (
    <DropdownMenu
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) void refreshFeed();
      }}
      open={open}
    >
      <DropdownMenuTrigger asChild>
        <button
          aria-label={
            unreadCount
              ? `Notifications, ${unreadCount} unread`
              : 'Notifications'
          }
          className="relative flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition hover:border-violet-400/30 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          type="button"
        >
          <Bell className="size-4.5" aria-hidden="true" />
          {unreadCount ? (
            <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-black bg-red-500 px-1 text-[9px] font-black leading-none text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-80 max-w-[calc(100vw-2rem)] overflow-hidden p-0"
        collisionPadding={16}
      >
        <div className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <span className="min-w-0">
            <span className="block text-sm font-black text-white">
              Notifications
            </span>
            <span className="mt-0.5 block text-[10px] font-bold uppercase tracking-[0.14em] text-zinc-500">
              {unreadCount ? `${unreadCount} unread` : 'All caught up'}
            </span>
          </span>
          <button
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[10px] font-black text-violet-300 transition hover:bg-violet-400/10 disabled:opacity-40"
            disabled={!unreadCount || markingRead}
            onClick={() => void markAllRead()}
            type="button"
          >
            {markingRead ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <CheckCheck className="size-3.5" aria-hidden="true" />
            )}
            Mark read
          </button>
        </div>

        <div className="max-h-[min(60vh,20rem)] overflow-y-auto overscroll-contain p-1.5">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-10 text-xs font-bold text-zinc-500">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Loading alerts…
            </div>
          ) : notifications.length ? (
            notifications.map((notification) => {
              const presentation = notificationPresentation(notification.type);
              const Icon = presentation.Icon;

              return (
                <article
                  className={`relative flex min-w-0 gap-3 rounded-xl px-3 py-3 ${
                    notification.isRead ? 'bg-transparent' : 'bg-violet-400/[0.06]'
                  }`}
                  key={notification.id}
                >
                  <span
                    className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${presentation.tone}`}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 items-start gap-2">
                      <span className="min-w-0 flex-1 break-words text-xs font-black text-white">
                        {notification.title}
                      </span>
                      {!notification.isRead ? (
                        <span
                          aria-label="Unread"
                          className="mt-1 size-2 shrink-0 rounded-full bg-violet-400"
                        />
                      ) : null}
                    </span>
                    <span className="mt-1 block break-words text-[11px] leading-5 text-zinc-400">
                      {notification.message}
                    </span>
                    <span className="mt-2 flex min-w-0 items-center justify-between gap-2 text-[9px] font-bold uppercase tracking-[0.12em] text-zinc-600">
                      <span className="truncate">{presentation.label}</span>
                      <time className="shrink-0 normal-case tracking-normal" dateTime={notification.createdAt}>
                        {relativeTime(notification.createdAt)}
                      </time>
                    </span>
                  </span>
                </article>
              );
            })
          ) : (
            <div className="px-5 py-10 text-center">
              <BellRing className="mx-auto size-7 text-zinc-700" aria-hidden="true" />
              <p className="mt-3 text-sm font-black text-white">No alerts yet</p>
              <p className="mt-1 text-xs leading-5 text-zinc-500">
                Attendance, grades, payments, and academy notices will appear here.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-white/10 p-3">
          {feedError ? (
            <p className="mb-2 break-words text-[11px] font-bold leading-5 text-red-300" role="alert">
              {feedError}
            </p>
          ) : null}
          {pushError ? (
            <p className="mb-2 break-words text-[11px] font-bold leading-5 text-red-300" role="alert">
              {pushError}
            </p>
          ) : null}

          {pushConfigured ? (
            pushSupported ? (
              <Button
                className="h-9 w-full text-xs"
                disabled={pushPending || pushPermission === 'denied'}
                onClick={() => void togglePushSubscription()}
                size="sm"
                variant="outline"
              >
                {pushPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                ) : pushSubscribed ? (
                  <BellOff className="size-3.5" aria-hidden="true" />
                ) : (
                  <BellRing className="size-3.5" aria-hidden="true" />
                )}
                {pushPermission === 'denied'
                  ? 'Push blocked in browser'
                  : pushSubscribed
                    ? 'Disable browser push'
                    : 'Enable browser push'}
              </Button>
            ) : (
              <p className="text-center text-[10px] font-bold leading-5 text-zinc-600">
                Browser push is unavailable on this device. In-app alerts remain active.
              </p>
            )
          ) : (
            <p className="text-center text-[10px] font-bold leading-5 text-zinc-600">
              In-app alerts are active. Browser push can be enabled when VAPID keys are configured.
            </p>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
