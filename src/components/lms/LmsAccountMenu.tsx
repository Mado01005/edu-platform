'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  Activity,
  BookOpen,
  ChevronDown,
  HardDrive,
  Landmark,
  LayoutDashboard,
  LifeBuoy,
  Loader2,
  LogOut,
  School,
  Settings,
  Users,
} from 'lucide-react';
import type { Role } from '@prisma/client';
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
import { isAdminRole } from '@/lib/lms/roles';

interface LmsAccountMenuProps {
  user: {
    email: string;
    name: string | null;
    role: Role;
    avatarUrl?: string | null;
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

export function LmsAccountMenu({ user }: LmsAccountMenuProps) {
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
          className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-1.5 pr-2 text-left transition hover:border-violet-400/30 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
          type="button"
        >
          <Avatar>
            <AvatarImage
              alt={`${displayName} avatar`}
              src={user.avatarUrl ?? undefined}
            />
            <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 sm:block">
            <span className="block max-w-28 truncate text-xs font-black text-white">
              {displayName}
            </span>
            <Badge className="mt-0.5 px-1.5 py-0 text-[8px]" variant="secondary">
              {user.role}
            </Badge>
          </span>
          <ChevronDown className="hidden size-3.5 shrink-0 text-zinc-500 sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent>
        <DropdownMenuLabel className="min-w-0">
          <span className="block truncate text-sm font-black text-white">
            {displayName}
          </span>
          <span className="mt-0.5 block truncate font-normal text-zinc-500">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard">
            <LayoutDashboard />
            Dashboard
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/catalog">
            <BookOpen />
            Catalog
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        {user.role === 'TEACHER' || isAdminRole(user.role) ? (
          <DropdownMenuItem asChild>
            <Link href="/teacher/courses">
              <BookOpen />
              Teacher studio
            </Link>
          </DropdownMenuItem>
        ) : null}
        {isAdminRole(user.role) ? (
          <>
            <DropdownMenuItem asChild>
              <Link href="/admin/users">
                <Users />
                Manage users
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/storage">
                <HardDrive />
                R2 storage
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/k12">
                <School />
                K-12 manager
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/admin/radar">
                <Activity />
                Activity radar
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        {user.role === 'SUPPORT' || isAdminRole(user.role) ? (
          <DropdownMenuItem asChild>
            <Link href="/support">
              <LifeBuoy />
              Support portal
            </Link>
          </DropdownMenuItem>
        ) : null}
        {user.role === 'ACCOUNTING' || isAdminRole(user.role) ? (
          <DropdownMenuItem asChild>
            <Link href="/accounting">
              <Landmark />
              Accounting
            </Link>
          </DropdownMenuItem>
        ) : null}
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
