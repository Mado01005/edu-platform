'use client';

import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Ban,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Search,
  ShieldCheck,
  UserRoundCog,
  Users,
  UserX,
} from 'lucide-react';
import type { AccountStatus, Role } from '@prisma/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/UI/avatar';
import { Badge } from '@/components/UI/badge';
import { Button } from '@/components/UI/button';
import { Card, CardContent } from '@/components/UI/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/UI/dropdown-menu';
import { Input } from '@/components/UI/input';
import { LMS_ROLES } from '@/lib/lms/roles';

export interface AdminUserRecord {
  authPresent: boolean;
  avatarUrl: string | null;
  createdAt: string;
  email: string;
  emailConfirmed: boolean;
  enrolledCourses: number;
  id: string;
  name: string | null;
  role: Role;
  status: AccountStatus;
}

interface UserManagementConsoleProps {
  authStatusAvailable: boolean;
  currentAdminId: string;
  currentAdminRole: Role;
  initialUsers: AdminUserRecord[];
}

type RoleFilter = 'ALL' | Role;

function initials(name: string | null, email: string) {
  return (name?.trim() || email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatJoinedDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(value));
}

function roleBadgeClass(role: Role) {
  if (role === 'SUPER_ADMIN') {
    return 'border-amber-400/20 bg-amber-400/10 text-amber-200';
  }

  if (role === 'ADMIN') {
    return 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200';
  }

  if (role === 'TEACHER') {
    return 'border-sky-400/20 bg-sky-400/10 text-sky-200';
  }

  if (role === 'SUPPORT') {
    return 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200';
  }

  if (role === 'ACCOUNTING') {
    return 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';
  }

  if (role === 'PARENT') {
    return 'border-pink-400/20 bg-pink-400/10 text-pink-200';
  }

  return 'border-violet-400/20 bg-violet-400/10 text-violet-200';
}

function accountState(user: AdminUserRecord) {
  if (user.status === 'DISABLED') {
    return {
      className: 'border-red-400/20 bg-red-400/10 text-red-200',
      icon: UserX,
      label: 'Disabled',
    };
  }

  if (!user.authPresent) {
    return {
      className: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
      icon: AlertTriangle,
      label: 'Auth missing',
    };
  }

  if (!user.emailConfirmed) {
    return {
      className: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
      icon: AlertTriangle,
      label: 'Pending',
    };
  }

  return {
    className: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
    icon: CheckCircle2,
    label: 'Active',
  };
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(body.error || 'The requested change could not be saved.');
  }

  return body;
}

export function UserManagementConsole({
  authStatusAvailable,
  currentAdminId,
  currentAdminRole,
  initialUsers,
}: UserManagementConsoleProps) {
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('ALL');
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const metrics = useMemo(
    () => ({
      admins: users.filter(
        (user) => user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
      ).length,
      students: users.filter((user) => user.role === 'STUDENT').length,
      teachers: users.filter((user) => user.role === 'TEACHER').length,
      total: users.length,
    }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return users.filter((user) => {
      const matchesRole =
        roleFilter === 'ALL' || user.role === roleFilter;
      const matchesQuery =
        !normalizedQuery ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.name?.toLowerCase().includes(normalizedQuery);

      return matchesRole && Boolean(matchesQuery);
    });
  }, [query, roleFilter, users]);
  const assignableRoles =
    currentAdminRole === 'SUPER_ADMIN'
      ? LMS_ROLES
      : LMS_ROLES.filter((role) => role !== 'SUPER_ADMIN');

  async function changeRole(user: AdminUserRecord, role: Role) {
    setPendingAction(`role:${user.id}`);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/users/update-role', {
        body: JSON.stringify({ role, targetId: user.id }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const body = await readResponse<{ user: { id: string; role: Role } }>(
        response,
      );

      setUsers((current) =>
        current.map((entry) =>
          entry.id === body.user.id
            ? { ...entry, role: body.user.role }
            : entry,
        ),
      );
      setNotice(`Updated ${user.email} to ${role}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update this role.',
      );
    } finally {
      setPendingAction(null);
    }
  }

  async function changeStatus(
    user: AdminUserRecord,
    status: AccountStatus,
  ) {
    setPendingAction(`status:${user.id}`);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/admin/users/update-status', {
        body: JSON.stringify({ status, targetId: user.id }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const body = await readResponse<{
        user: { id: string; status: AccountStatus };
      }>(response);

      setUsers((current) =>
        current.map((entry) =>
          entry.id === body.user.id
            ? { ...entry, status: body.user.status }
            : entry,
        ),
      );
      setNotice(
        `${user.email} is now ${
          status === 'DISABLED' ? 'disabled' : 'active'
        }.`,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to update this account.',
      );
    } finally {
      setPendingAction(null);
    }
  }

  const metricCards = [
    { icon: Users, label: 'Total Users', value: metrics.total },
    { icon: GraduationCap, label: 'Students', value: metrics.students },
    { icon: UserRoundCog, label: 'Teachers', value: metrics.teachers },
    { icon: ShieldCheck, label: 'Admins', value: metrics.admins },
  ] as const;

  return (
    <>
      <div className="grid w-full min-w-0 grid-cols-2 gap-3">
        {metricCards.map(({ icon: Icon, label, value }) => (
          <Card className="rounded-2xl bg-white/[0.03]" key={label}>
            <CardContent className="flex min-w-0 items-center gap-3 px-4 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-400/10 text-violet-200">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-black text-white">
                  {value}
                </span>
                <span className="block truncate text-[10px] font-bold uppercase tracking-[0.13em] text-zinc-500">
                  {label}
                </span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {!authStatusAvailable ? (
        <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm leading-6 text-amber-100">
          Supabase account statuses are temporarily unavailable. Prisma role
          management remains visible, but mutations are paused until Auth can
          be reached.
        </div>
      ) : null}

      {notice ? (
        <div
          className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm font-bold text-emerald-100"
          role="status"
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div
          className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-100"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <Card className="rounded-2xl bg-white/[0.03]">
        <CardContent className="flex min-w-0 flex-col gap-3 px-4 py-4">
          <label className="relative min-w-0">
            <span className="sr-only">Search by name or email</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
              aria-hidden="true"
            />
            <Input
              className="pl-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or email"
              type="search"
              value={query}
            />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Filter by role</span>
            <select
              className="h-12 w-full min-w-0 rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm font-bold text-white outline-none transition focus:border-violet-400/50 focus:ring-4 focus:ring-violet-400/10"
              onChange={(event) =>
                setRoleFilter(event.target.value as RoleFilter)
              }
              value={roleFilter}
            >
              <option value="ALL">All roles</option>
              {LMS_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      <div
        aria-label="User data table"
        className="flex w-full min-w-0 flex-col gap-3"
        role="table"
      >
        <div className="sr-only" role="row">
          <span role="columnheader">User</span>
          <span role="columnheader">Email</span>
          <span role="columnheader">Enrolled courses</span>
          <span role="columnheader">Role</span>
          <span role="columnheader">Joined</span>
          <span role="columnheader">Actions</span>
        </div>

        {filteredUsers.map((user) => {
          const state = accountState(user);
          const StateIcon = state.icon;
          const isSelf = user.id === currentAdminId;
          const isPending = pendingAction?.endsWith(user.id) ?? false;
          const isProtectedSuperAdmin =
            currentAdminRole !== 'SUPER_ADMIN' &&
            user.role === 'SUPER_ADMIN';

          return (
            <Card
              className="rounded-2xl bg-white/[0.03]"
              key={user.id}
              role="row"
            >
              <CardContent className="flex min-w-0 flex-col gap-4 px-4 py-4">
                <div className="flex min-w-0 items-start gap-3" role="cell">
                  <Avatar className="size-11">
                    {user.avatarUrl ? (
                      <AvatarImage alt="" src={user.avatarUrl} />
                    ) : null}
                    <AvatarFallback>
                      {initials(user.name, user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-white">
                      {user.name?.trim() || 'Unnamed user'}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {user.email}
                    </p>
                    <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                      <Badge className={roleBadgeClass(user.role)}>
                        {user.role}
                      </Badge>
                      <Badge className={state.className}>
                        <StateIcon className="size-3" aria-hidden="true" />
                        {state.label}
                      </Badge>
                      {isSelf ? (
                        <Badge variant="secondary">You</Badge>
                      ) : null}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        aria-label={`Manage ${user.email}`}
                        disabled={
                          isPending ||
                          !authStatusAvailable ||
                          isProtectedSuperAdmin
                        }
                        size="icon"
                        variant="ghost"
                      >
                        {isPending ? (
                          <Loader2
                            className="size-4 animate-spin"
                            aria-hidden="true"
                          />
                        ) : (
                          <MoreHorizontal
                            className="size-4"
                            aria-hidden="true"
                          />
                        )}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Change role</DropdownMenuLabel>
                      {assignableRoles.map((role) => (
                        <DropdownMenuItem
                          disabled={
                            user.role === role ||
                            (isSelf && role !== user.role)
                          }
                          key={role}
                          onSelect={() => void changeRole(user, role)}
                        >
                          <ShieldCheck />
                          Set {role}
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={isSelf}
                        onSelect={() =>
                          void changeStatus(
                            user,
                            user.status === 'DISABLED'
                              ? 'ACTIVE'
                              : 'DISABLED',
                          )
                        }
                      >
                        {user.status === 'DISABLED' ? (
                          <RotateCcw />
                        ) : (
                          <Ban />
                        )}
                        {user.status === 'DISABLED'
                          ? 'Enable account'
                          : 'Disable account'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="grid min-w-0 grid-cols-2 gap-3 text-xs">
                  <div
                    className="min-w-0 rounded-xl bg-black/50 px-3 py-3"
                    role="cell"
                  >
                    <p className="flex items-center gap-1.5 font-bold text-zinc-500">
                      <BookOpenCheck className="size-3.5" aria-hidden="true" />
                      Enrolled
                    </p>
                    <p className="mt-1 font-black text-white">
                      {user.enrolledCourses} courses
                    </p>
                  </div>
                  <div
                    className="min-w-0 rounded-xl bg-black/50 px-3 py-3"
                    role="cell"
                  >
                    <p className="flex items-center gap-1.5 font-bold text-zinc-500">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      Joined
                    </p>
                    <p className="mt-1 truncate font-black text-white">
                      {formatJoinedDate(user.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!filteredUsers.length ? (
          <Card className="rounded-2xl border-dashed bg-transparent">
            <CardContent className="px-5 py-10 text-center">
              <Users className="mx-auto size-8 text-zinc-700" />
              <p className="mt-3 font-black text-white">No users found</p>
              <p className="mt-1 text-sm text-zinc-500">
                Adjust the search or role filter.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

    </>
  );
}
