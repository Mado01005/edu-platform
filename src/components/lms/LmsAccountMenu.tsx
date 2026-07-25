'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  LayoutDashboard,
  Loader2,
  LogOut,
  Settings,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/UI/avatar';
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

interface LmsAccountMenuProps {
  user: {
    email: string;
    name: string | null;
    role: 'STUDENT' | 'TEACHER' | 'ADMIN';
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

export function LmsAccountMenu({ user }: LmsAccountMenuProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const displayName = user.name?.trim() || user.email.split('@')[0];

  async function handleSignOut() {
    setPending(true);
    setError('');

    try {
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
          <Link href="/lms/profile#settings">
            <Settings />
            Settings
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
