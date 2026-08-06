import Link from 'next/link';
import {
  Bell,
  CircleUserRound,
  Clock3,
  Mail,
  Settings2,
  ShieldCheck,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/UI/avatar';
import { Badge } from '@/components/UI/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/UI/card';
import { PortalShell } from '@/components/erp/PortalShell';
import { requireLmsPageUser } from '@/lib/lms/auth';

export const dynamic = 'force-dynamic';

function initials(name: string | null, email: string) {
  return (name?.trim() || email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

export default async function LmsProfilePage() {
  const user = await requireLmsPageUser();
  const displayName = user.name?.trim() || user.email.split('@')[0];

  return (
    <PortalShell user={user}>
      <div className="flex w-full max-w-4xl min-w-0 flex-col gap-6">
        <Card className="overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,.18),transparent_46%)] p-6 sm:p-8">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center">
            <Avatar className="size-20 border-violet-400/20 shadow-xl shadow-violet-950/40">
              <AvatarImage
                alt={`${displayName} avatar`}
                src={user.avatarUrl ?? undefined}
              />
              <AvatarFallback className="text-xl">
                {initials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Badge>{user.role}</Badge>
              <h1 className="mt-3 truncate text-3xl font-black tracking-tight">
                {displayName}
              </h1>
              {user.headline ? (
                <p className="mt-1 break-words text-sm font-bold text-violet-200">
                  {user.headline}
                </p>
              ) : null}
              <p className="mt-1 flex min-w-0 items-center gap-2 text-sm text-zinc-400">
                <Mail className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>
          </div>
          {user.bio ? (
            <p className="mt-5 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-zinc-300">
              {user.bio}
            </p>
          ) : null}
        </Card>

        <section className="scroll-mt-28" id="settings">
          <div className="mb-4">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-violet-300">
              Account preferences
            </p>
            <h2 className="mt-2 text-2xl font-black">Settings</h2>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet-400/10 text-violet-300">
                  <CircleUserRound className="size-5" aria-hidden="true" />
                </span>
                <CardTitle className="mt-2 text-lg">Learning profile</CardTitle>
                <CardDescription>
                  Your display name and role are synchronized with your school account.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-5 pb-5">
                <p className="text-xs font-bold text-zinc-500">
                  Contact an administrator to change protected account details.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <span className="flex size-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
                  <Clock3 className="size-5" aria-hidden="true" />
                </span>
                <CardTitle className="mt-2 text-lg">Local schedule</CardTitle>
                <CardDescription>
                  Live-class times automatically follow your device timezone.
                </CardDescription>
              </CardHeader>
              <CardContent className="mt-5 pb-5">
                <p className="text-xs font-bold text-zinc-500">
                  No manual timezone setup is required.
                </p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="sm:flex-row sm:items-center">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-400/10 text-emerald-300">
                  <ShieldCheck className="size-5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <CardTitle className="text-lg">Secure account</CardTitle>
                  <CardDescription className="mt-1">
                    Sessions are protected through Supabase Auth and server-verified roles.
                  </CardDescription>
                </span>
                <span className="ml-auto hidden items-center gap-2 text-xs font-bold text-zinc-500 sm:flex">
                  <Bell className="size-4" aria-hidden="true" />
                  Essential notices enabled
                </span>
              </CardHeader>
              <CardContent className="pb-5 pt-4">
                <Link
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-400 px-4 text-sm font-black text-black transition hover:bg-violet-300"
                  href="/settings"
                >
                  <Settings2 className="size-4" aria-hidden="true" />
                  Open rich settings
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </PortalShell>
  );
}
