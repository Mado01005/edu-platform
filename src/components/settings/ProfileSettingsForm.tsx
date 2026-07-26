'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Loader2,
  Save,
  Trash2,
  UserRound,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/UI/avatar';
import { Button } from '@/components/UI/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/UI/card';
import { Input } from '@/components/UI/input';
import { Textarea } from '@/components/UI/textarea';
import {
  errorNotice,
  saveSettingsSection,
} from '@/components/settings/settings-client';
import { SettingsToast } from '@/components/settings/SettingsToast';
import type {
  SettingsNotice,
  SettingsUserData,
} from '@/components/settings/types';

const TIMEZONES = [
  'UTC',
  'Africa/Cairo',
  'Africa/Casablanca',
  'Africa/Johannesburg',
  'America/Chicago',
  'America/Los_Angeles',
  'America/New_York',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Europe/Berlin',
  'Europe/London',
] as const;

function initials(name: string, email: string) {
  return (name.trim() || email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

interface ProfileSettingsFormProps {
  initialUser: SettingsUserData;
}

export function ProfileSettingsForm({
  initialUser,
}: ProfileSettingsFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialUser.avatarUrl);
  const [bio, setBio] = useState(initialUser.bio ?? '');
  const [headline, setHeadline] = useState(initialUser.headline ?? '');
  const [name, setName] = useState(initialUser.name ?? '');
  const [timezone, setTimezone] = useState(initialUser.timezone);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<SettingsNotice | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function persistProfile(nextAvatarUrl = avatarUrl) {
    await saveSettingsSection('profile', {
      avatarUrl: nextAvatarUrl,
      bio,
      headline,
      name,
      timezone,
    });
  }

  async function uploadAvatar(file: File) {
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size <= 0 ||
      file.size > 5 * 1024 * 1024
    ) {
      setNotice({
        message: 'Choose a JPEG, PNG, or WebP avatar no larger than 5 MB.',
        type: 'error',
      });
      return;
    }

    setUploading(true);
    setNotice(null);
    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current);
      return nextPreviewUrl;
    });

    try {
      const presignResponse = await fetch('/api/settings/avatar', {
        body: JSON.stringify({
          contentType: file.type,
          size: file.size,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const presign = (await presignResponse.json()) as {
        error?: string;
        publicUrl?: string;
        uploadUrl?: string;
      };

      if (!presignResponse.ok || !presign.uploadUrl || !presign.publicUrl) {
        throw new Error(presign.error ?? 'Unable to prepare the avatar upload.');
      }

      const uploadResponse = await fetch(presign.uploadUrl, {
        body: file,
        headers: { 'Content-Type': file.type },
        method: 'PUT',
      });
      if (!uploadResponse.ok) {
        throw new Error(
          'R2 rejected the avatar upload. Check the bucket CORS configuration.',
        );
      }

      await persistProfile(presign.publicUrl);
      setAvatarUrl(presign.publicUrl);
      setNotice({
        message: 'Avatar and profile updated successfully.',
        type: 'success',
      });
    } catch (error) {
      setNotice(errorNotice(error, 'Unable to upload the avatar.'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setNotice(null);

    try {
      await persistProfile();
      setNotice({
        message: 'Profile updated successfully.',
        type: 'success',
      });
    } catch (error) {
      setNotice(errorNotice(error, 'Unable to update the profile.'));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">
            <UserRound className="size-5" aria-hidden="true" />
          </span>
          <CardTitle className="mt-2 text-xl">Profile &amp; public bio</CardTitle>
          <p className="text-sm leading-6 text-zinc-400">
            Shape how your name and expertise appear across the learning space.
          </p>
        </CardHeader>
        <CardContent className="pb-5 pt-6">
          <form className="flex min-w-0 flex-col gap-5" onSubmit={handleSubmit}>
            <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center">
              <Avatar className="size-20 border-violet-400/30">
                <AvatarImage
                  alt={`${name || initialUser.email} avatar`}
                  src={previewUrl ?? avatarUrl ?? undefined}
                />
                <AvatarFallback className="text-lg">
                  {initials(name, initialUser.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-black">Custom avatar</p>
                <p className="mt-1 text-xs leading-5 text-zinc-500">
                  JPEG, PNG, or WebP. Uploaded directly to Cloudflare R2, up to
                  5 MB.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    size="sm"
                    type="button"
                  >
                    {uploading ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Camera className="size-4" />
                    )}
                    {uploading ? 'Uploading…' : 'Choose image'}
                  </Button>
                  {avatarUrl ? (
                    <Button
                      disabled={uploading}
                      onClick={() => {
                        setAvatarUrl(null);
                        setPreviewUrl(null);
                      }}
                      size="sm"
                      type="button"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                      Remove
                    </Button>
                  ) : null}
                </div>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadAvatar(file);
                  }}
                  ref={fileInputRef}
                  type="file"
                />
              </div>
            </div>

            <label className="min-w-0 text-sm font-bold">
              Full name
              <Input
                autoComplete="name"
                className="mt-2"
                maxLength={100}
                onChange={(event) => setName(event.target.value)}
                required
                value={name}
              />
            </label>

            <label className="min-w-0 text-sm font-bold">
              Title or headline
              <Input
                className="mt-2"
                maxLength={120}
                onChange={(event) => setHeadline(event.target.value)}
                placeholder="Full-Stack Developer & Educator"
                value={headline}
              />
            </label>

            <label className="min-w-0 text-sm font-bold">
              Short bio
              <Textarea
                className="mt-2"
                maxLength={1000}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Share what you are learning, building, or teaching."
                value={bio}
              />
              <span className="mt-1 block text-right text-xs font-medium text-zinc-600">
                {bio.length}/1000
              </span>
            </label>

            <label className="min-w-0 text-sm font-bold">
              Timezone
              <select
                className="mt-2 h-12 w-full min-w-0 rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm outline-none focus:border-violet-400/50 focus:ring-4 focus:ring-violet-500/10"
                onChange={(event) => setTimezone(event.target.value)}
                value={timezone}
              >
                {!TIMEZONES.includes(timezone as (typeof TIMEZONES)[number]) ? (
                  <option value={timezone}>{timezone}</option>
                ) : null}
                {TIMEZONES.map((zone) => (
                  <option key={zone} value={zone}>
                    {zone}
                  </option>
                ))}
              </select>
            </label>

            <Button
              className="w-full sm:w-fit"
              disabled={pending || uploading}
              type="submit"
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {pending ? 'Saving…' : 'Save profile'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <SettingsToast notice={notice} onDismiss={() => setNotice(null)} />
    </>
  );
}
