'use client';

import { useState } from 'react';
import { Gauge, Loader2, Play, Save, WandSparkles } from 'lucide-react';
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

const SPEEDS = [1, 1.25, 1.5, 2] as const;
const QUALITIES = [
  { label: 'Auto (recommended)', value: 'AUTO' },
  { label: '1080p', value: '1080P' },
  { label: '720p', value: '720P' },
  { label: '480p', value: '480P' },
  { label: '360p (Data Saver)', value: '360P' },
] as const;

interface LearningPreferencesFormProps {
  initialUser: SettingsUserData;
}

export function LearningPreferencesForm({
  initialUser,
}: LearningPreferencesFormProps) {
  const [autoPlayNext, setAutoPlayNext] = useState(initialUser.autoPlayNext);
  const [defaultPlaybackSpeed, setDefaultPlaybackSpeed] = useState(
    initialUser.defaultPlaybackSpeed,
  );
  const [defaultVideoQuality, setDefaultVideoQuality] = useState(
    initialUser.defaultVideoQuality,
  );
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<SettingsNotice | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);

    try {
      await saveSettingsSection('learning', {
        autoPlayNext,
        defaultPlaybackSpeed,
        defaultVideoQuality,
      });
      setNotice({
        message: 'Learning preferences saved.',
        type: 'success',
      });
    } catch (error) {
      setNotice(
        errorNotice(error, 'Unable to save the learning preferences.'),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Play className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="mt-2 text-xl">
            Video &amp; learning preferences
          </CardTitle>
          <p className="text-sm leading-6 text-slate-600">
            Tune the default lesson experience to match your pace and
            connection.
          </p>
        </CardHeader>
        <CardContent className="pb-5 pt-6">
          <form className="flex min-w-0 flex-col gap-6" onSubmit={handleSubmit}>
            <fieldset className="min-w-0">
              <legend className="flex items-center gap-2 text-sm font-black">
                <Gauge className="size-4 text-sky-700" aria-hidden="true" />
                Default playback speed
              </legend>
              <div className="mt-3 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-4">
                {SPEEDS.map((speed) => (
                  <label
                    className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border text-sm font-black transition ${
                      defaultPlaybackSpeed === speed
                        ? 'border-sky-600 bg-sky-600 text-white'
                        : 'border-slate-300 bg-white text-slate-600 hover:border-sky-300 hover:text-sky-700'
                    }`}
                    key={speed}
                  >
                    <input
                      checked={defaultPlaybackSpeed === speed}
                      className="sr-only"
                      name="playback-speed"
                      onChange={() => setDefaultPlaybackSpeed(speed)}
                      type="radio"
                      value={speed}
                    />
                    {speed.toFixed(speed === 1 ? 1 : 2).replace(/0$/, '')}x
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="min-w-0 text-sm font-black">
              Default video quality
              <select
                className="mt-2 h-12 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-4 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
                onChange={(event) =>
                  setDefaultVideoQuality(event.target.value)
                }
                value={defaultVideoQuality}
              >
                {QUALITIES.map((quality) => (
                  <option key={quality.value} value={quality.value}>
                    {quality.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex min-w-0 items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                <WandSparkles className="size-5" aria-hidden="true" />
              </span>
              <label className="min-w-0 flex-1" htmlFor="autoplay-next">
                <span className="block text-sm font-black">
                  Autoplay next lesson
                </span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  Move to the next lesson when the current R2 video finishes.
                </span>
              </label>
              <Switch
                aria-label="Autoplay next lesson"
                checked={autoPlayNext}
                id="autoplay-next"
                onCheckedChange={setAutoPlayNext}
              />
            </div>

            <Button
              className="w-full sm:w-fit"
              disabled={pending}
              type="submit"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {pending ? 'Saving…' : 'Save learning preferences'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <SettingsToast notice={notice} onDismiss={() => setNotice(null)} />
    </>
  );
}
