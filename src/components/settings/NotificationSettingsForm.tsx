'use client';

import { useState } from 'react';
import {
  BellRing,
  Loader2,
  Megaphone,
  MessageCircleMore,
  Save,
  Video,
} from 'lucide-react';
import { Button } from '@/components/UI/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Switch } from '@/components/UI/switch';
import {
  errorNotice,
  saveSettingsSection,
} from '@/components/settings/settings-client';
import { SettingsToast } from '@/components/settings/SettingsToast';
import type {
  SettingsNotice,
  SettingsUserData,
} from '@/components/settings/types';

interface NotificationSettingsFormProps {
  initialUser: SettingsUserData;
}

export function NotificationSettingsForm({
  initialUser,
}: NotificationSettingsFormProps) {
  const [notifyAnnouncements, setNotifyAnnouncements] = useState(
    initialUser.notifyAnnouncements,
  );
  const [notifyDiscussions, setNotifyDiscussions] = useState(
    initialUser.notifyDiscussions,
  );
  const [notifyZoomClasses, setNotifyZoomClasses] = useState(
    initialUser.notifyZoomClasses,
  );
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<SettingsNotice | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);

    try {
      await saveSettingsSection('notifications', {
        notifyAnnouncements,
        notifyDiscussions,
        notifyZoomClasses,
      });
      setNotice({
        message: 'Notification preferences saved.',
        type: 'success',
      });
    } catch (error) {
      setNotice(
        errorNotice(error, 'Unable to save notification preferences.'),
      );
    } finally {
      setPending(false);
    }
  }

  const items = [
    {
      checked: notifyZoomClasses,
      description:
        'Email & SMS alerts 1 hour before scheduled live sessions.',
      icon: Video,
      id: 'notify-zoom',
      label: 'Zoom class reminders',
      onChange: setNotifyZoomClasses,
      tone: 'text-cyan-300 bg-cyan-400/10',
    },
    {
      checked: notifyAnnouncements,
      description:
        'Instant updates when instructors post course updates.',
      icon: Megaphone,
      id: 'notify-announcements',
      label: 'Course announcements',
      onChange: setNotifyAnnouncements,
      tone: 'text-amber-300 bg-amber-400/10',
    },
    {
      checked: notifyDiscussions,
      description: 'Notify me when someone replies to my Q&A posts.',
      icon: MessageCircleMore,
      id: 'notify-discussions',
      label: 'Discussion replies',
      onChange: setNotifyDiscussions,
      tone: 'text-emerald-300 bg-emerald-400/10',
    },
  ] as const;

  return (
    <>
      <Card>
        <CardHeader>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-400/10 text-amber-300">
            <BellRing className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="mt-2 text-xl">Notification center</CardTitle>
          <p className="text-sm leading-6 text-zinc-400">
            Choose which learning events should reach your inbox.
          </p>
        </CardHeader>
        <CardContent className="pb-5 pt-6">
          <form className="flex min-w-0 flex-col gap-3" onSubmit={handleSubmit}>
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  className="flex min-w-0 items-start gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  key={item.id}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${item.tone}`}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <label className="min-w-0 flex-1" htmlFor={item.id}>
                    <span className="block text-sm font-black">
                      {item.label}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-zinc-500">
                      {item.description}
                    </span>
                  </label>
                  <Switch
                    aria-label={item.label}
                    checked={item.checked}
                    id={item.id}
                    onCheckedChange={item.onChange}
                  />
                </div>
              );
            })}

            <Button
              className="mt-3 w-full sm:w-fit"
              disabled={pending}
              type="submit"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {pending ? 'Saving…' : 'Save notifications'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <SettingsToast notice={notice} onDismiss={() => setNotice(null)} />
    </>
  );
}
