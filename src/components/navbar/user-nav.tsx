'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { Role } from '@prisma/client';
import {
  ChevronDown,
  Loader2,
  LogOut,
  UserRoundCog,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/UI/avatar';
import { Badge } from '@/components/UI/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/UI/dropdown-menu';
import { createSupabaseBrowserClient } from '@/lib/supabase/ssr-client';

interface UserNavProps {
  user: {
    avatarUrl?: string | null;
    email: string;
    name: string | null;
    role: Role;
  };
}

function initials(name: string | null, email: string) {
  const source = name?.trim() || email;
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

async function revokeBrowserPushSubscription() {
  if (!('serviceWorker' in navigator)) return true;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return true;

    let serverRevoked = false;
    let browserRevoked = false;

    try {
      const response = await fetch('/api/notifications/subscriptions', {
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      });
      serverRevoked = response.ok;
    } catch {
      // Browser revocation below still invalidates the endpoint. The server
      // removes stale endpoints after the push service returns 404/410.
    }

    try {
      browserRevoked = await subscription.unsubscribe();
    } catch {
      // A successful server deletion is sufficient to stop future delivery.
    }

    return serverRevoked || browserRevoked;
  } catch {
    return false;
  }
}

export function UserNav({ user }: UserNavProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const displayName = user.name?.trim() || user.email.split('@')[0];

  async function handleSignOut() {
    setPending(true);
    setError('');

    try {
      if (!(await revokeBrowserPushSubscription())) {
        setError(
          'Browser notifications could not be revoked. Disable push and try signing out again.',
        );
        setPending(false);
        return;
      }

      await fetch('/api/lms/session', {
        credentials: 'same-origin',
        method: 'DELETE',
      }).catch(() => undefined);

      const supabase = createSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError('Could not sign out. Please try again.');
        setPending(false);
        return;
      }

      router.push('/catalog');
      router.refresh();
    } catch {
      setError('Could not sign out. Please try again.');
      setPending(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label={`Open account menu for ${displayName}`}
          className="flex min-w-0 max-w-[11rem] items-center gap-2 whitespace-nowrap rounded-xl border border-slate-200 bg-white p-1.5 pr-2 text-left transition hover:border-sky-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:max-w-[13rem]"
          type="button"
        >
          <Avatar>
            <AvatarImage
              alt={`${displayName} avatar`}
              src={user.avatarUrl ?? undefined}
            />
            <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-1 sm:block">
            <span className="block max-w-28 truncate whitespace-nowrap text-xs font-semibold text-slate-900">
              {displayName}
            </span>
            <Badge
              className="mt-0.5 max-w-full truncate whitespace-nowrap px-1.5 py-0 text-[8px]"
              variant="secondary"
            >
              {user.role}
            </Badge>
          </span>
          <ChevronDown className="hidden size-3.5 shrink-0 text-slate-400 sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {displayName}
          </span>
          <span className="mt-0.5 block truncate font-normal text-slate-500">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <UserRoundCog />
            Profile &amp; Account Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {error ? (
          <p className="px-2 py-1.5 text-xs leading-5 text-red-300">{error}</p>
        ) : null}
        <DropdownMenuItem
          className="text-red-300 focus:bg-red-500/10 focus:text-red-200"
          disabled={pending}
          onSelect={(event) => {
            event.preventDefault();
            void handleSignOut();
          }}
        >
          {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
          {pending ? 'Signing out…' : 'Sign Out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
