import { Settings2 } from 'lucide-react';
import { PortalShell } from '@/components/erp/PortalShell';
import { SettingsCenter } from '@/components/settings/SettingsCenter';
import { requireLmsPageUser } from '@/lib/lms/auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const user = await requireLmsPageUser();
  const { data: authUser } =
    await getSupabaseAdminClient().auth.admin.getUserById(user.supabaseId);
  const providers = Array.from(
    new Set(
      (authUser.user?.identities ?? [])
        .map((identity) => identity.provider)
        .filter((provider): provider is string => Boolean(provider)),
    ),
  ).sort();

  if (!providers.length) {
    const fallbackProvider = authUser.user?.app_metadata?.provider;
    if (typeof fallbackProvider === 'string') providers.push(fallbackProvider);
  }

  return (
    <PortalShell user={user}>
      <div className="flex w-full min-w-0 flex-col gap-6">
          <header className="w-full rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.24),transparent_52%)] p-5 sm:p-7">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-400 text-black shadow-lg shadow-violet-500/20">
              <Settings2 className="size-5" aria-hidden="true" />
            </span>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.2em] text-violet-300">
              Personal control center
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
              Settings built around how you learn.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Manage your public profile, lesson defaults, notifications, and
              credentials from one secure workspace.
            </p>
          </header>

          <SettingsCenter
            initialUser={{
              avatarUrl: user.avatarUrl,
              autoPlayNext: user.autoPlayNext,
              bio: user.bio,
              defaultPlaybackSpeed: user.defaultPlaybackSpeed,
              defaultVideoQuality: user.defaultVideoQuality,
              email: user.email,
              headline: user.headline,
              name: user.name,
              notifyAnnouncements: user.notifyAnnouncements,
              notifyDiscussions: user.notifyDiscussions,
              notifyZoomClasses: user.notifyZoomClasses,
              phoneNumber: user.phoneNumber,
              phoneVerified: user.phoneVerified,
              timezone: user.timezone,
            }}
            providers={providers}
          />
      </div>
    </PortalShell>
  );
}
