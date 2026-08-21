'use client';

import type { Role } from '@prisma/client';
import Image from 'next/image';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useState } from 'react';
import {
  ChevronDown,
  GraduationCap,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react';
import { OqoolEmblem, OqoolWordmark } from '@/components/branding/OqoolBrand';
import { CommandMenu } from '@/components/navigation/command-menu';

interface NavbarProps {
  isAdmin?: boolean;
  roleLabel?: Role;
  userImage?: string;
  userName?: string;
}

export default function Navbar({
  isAdmin,
  roleLabel,
  userImage,
  userName,
}: NavbarProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const initials = userName?.trim().charAt(0).toUpperCase() || '?';
  const visibleRole: Role = roleLabel ?? (isAdmin ? 'ADMIN' : 'STUDENT');

  async function handleLogout() {
    setLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
  }

  const avatar = userImage ? (
    <Image
      alt={userName ?? 'User'}
      className="size-9 shrink-0 rounded-full object-cover"
      height={36}
      referrerPolicy="no-referrer"
      src={userImage}
      width={36}
    />
  ) : (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#084B2B] text-xs font-bold text-white">
      {initials}
    </span>
  );

  return (
    <>
      <header className="sticky top-0 z-50 h-16 w-full border-b border-emerald-950/10 bg-white px-4 shadow-sm">
        <div className="mx-auto flex h-full w-full max-w-7xl min-w-0 items-center justify-between gap-4">
          <Link
            className="group flex min-w-max shrink-0 items-center gap-3"
            href="/dashboard"
            id="nav-logo"
          >
            <OqoolEmblem
              className="transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-md"
              decorative
            />
            <OqoolWordmark className="hidden max-w-40 sm:block" />
          </Link>

          <div className="ml-auto w-10 min-w-0 sm:w-full sm:max-w-md lg:ml-0">
            <CommandMenu role={visibleRole} />
          </div>

          <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 whitespace-nowrap">
            {userName ? (
              <Link
                className="hidden min-w-0 max-w-[13rem] items-center gap-2 rounded-xl border border-emerald-950/10 bg-white p-1.5 pr-2 transition hover:border-emerald-300 hover:bg-emerald-50 sm:flex"
                href="/profile"
              >
                {avatar}
                <span className="min-w-0 flex-1">
                  <span className="block max-w-28 truncate whitespace-nowrap text-xs font-semibold text-slate-900">
                    {userName}
                  </span>
                  <span className="mt-0.5 block max-w-full truncate whitespace-nowrap text-[8px] font-semibold uppercase tracking-[0.12em] text-[#084B2B]">
                    {visibleRole}
                  </span>
                </span>
                <ChevronDown className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              </Link>
            ) : null}

            <button
              aria-label={loggingOut ? 'Signing out' : 'Sign out'}
              className="hidden h-10 shrink-0 items-center gap-2 rounded-xl border border-emerald-950/10 bg-white px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 lg:flex"
              disabled={loggingOut}
              id="logout-btn"
              onClick={() => void handleLogout()}
              type="button"
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              <span className="hidden xl:inline">
                {loggingOut ? 'Signing out…' : 'Sign out'}
              </span>
            </button>

            <button
              aria-expanded={menuOpen}
              aria-label="Toggle account menu"
              className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-950/10 bg-white text-slate-600 sm:hidden"
              onClick={() => setMenuOpen((current) => !current)}
              type="button"
            >
              {menuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen ? (
        <div className="fixed inset-x-4 top-20 z-50 flex min-w-0 flex-col gap-2 rounded-2xl border border-emerald-950/10 bg-white p-3 shadow-md sm:hidden">
          {userName ? (
            <Link
              className="flex min-w-0 items-center gap-3 rounded-xl bg-[#F8FAF7] p-3"
              href="/profile"
              onClick={() => setMenuOpen(false)}
            >
              {avatar}
              <span className="min-w-0 flex-1">
                <span className="block truncate whitespace-nowrap text-sm font-semibold text-slate-900">
                  {userName}
                </span>
                <span className="block truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-wider text-[#084B2B]">
                  {visibleRole}
                </span>
              </span>
            </Link>
          ) : null}
          {isAdmin ? (
            <Link className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/admin" onClick={() => setMenuOpen(false)}>
              <GraduationCap className="size-4" aria-hidden="true" /> Admin home
            </Link>
          ) : null}
          <Link className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100" href="/settings" onClick={() => setMenuOpen(false)}>
            <Settings className="size-4" aria-hidden="true" /> Settings
          </Link>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm font-bold text-red-300 hover:bg-red-400/10 disabled:opacity-50"
            disabled={loggingOut}
            onClick={() => void handleLogout()}
            type="button"
          >
            <LogOut className="size-4" aria-hidden="true" />
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      ) : null}
    </>
  );
}
