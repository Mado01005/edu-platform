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
  PencilLine,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
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
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/UI/dialog';
import { LMS_ROLES } from '@/lib/lms/roles';
import {
  EditStudentModal,
  type AdminCourseOption,
  type EditableAdminUser,
} from '@/components/Admin/edit-student-modal';

export interface AdminUserRecord {
  authPresent: boolean;
  avatarUrl: string | null;
  createdAt: string;
  emailConfirmed: boolean;
  enrolledCourseIds: string[];
  enrolledCourses: number;
  gradeLevel: EditableAdminUser['gradeLevel'];
  id: string;
  name: string | null;
  phoneNumber: string | null;
  role: Role;
  status: AccountStatus;
  subscriptions: EditableAdminUser['subscriptions'];
}

interface UserManagementConsoleProps {
  authStatusAvailable: boolean;
  availableCourses: AdminCourseOption[];
  currentAdminId: string;
  currentAdminRole: Role;
  initialUsers: AdminUserRecord[];
}

type RoleFilter = 'ALL' | Role;

function initials(name: string | null) {
  return (name?.trim() || 'User')
    .split(/[\s._-]+/)
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
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (role === 'ADMIN') {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (role === 'TEACHER') {
    return 'border-sky-200 bg-sky-50 text-sky-700';
  }

  if (role === 'SUPPORT') {
    return 'border-cyan-200 bg-cyan-50 text-cyan-700';
  }

  if (role === 'ACCOUNTING') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (role === 'PARENT') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function accountState(user: AdminUserRecord) {
  if (user.status === 'DISABLED') {
    return {
      className: 'border-red-200 bg-red-50 text-red-700',
      icon: UserX,
      label: 'Disabled',
    };
  }

  if (!user.authPresent) {
    return {
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: AlertTriangle,
      label: 'Auth missing',
    };
  }

  if (!user.emailConfirmed) {
    return {
      className: 'border-amber-200 bg-amber-50 text-amber-700',
      icon: AlertTriangle,
      label: 'Pending',
    };
  }

  return {
    className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
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
  availableCourses,
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
  const [editingUser, setEditingUser] = useState<AdminUserRecord | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [deleteUserIds, setDeleteUserIds] = useState<string[]>([]);

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
        user.name?.toLowerCase().includes(normalizedQuery) ||
        user.phoneNumber?.toLowerCase().includes(normalizedQuery);

      return matchesRole && Boolean(matchesQuery);
    });
  }, [query, roleFilter, users]);
  const assignableRoles =
    currentAdminRole === 'SUPER_ADMIN'
      ? LMS_ROLES
      : LMS_ROLES.filter((role) => role !== 'SUPER_ADMIN');
  const selectableUsers = filteredUsers.filter(
    (user) =>
      user.id !== currentAdminId &&
      (currentAdminRole === 'SUPER_ADMIN' || user.role !== 'SUPER_ADMIN'),
  );
  const allVisibleSelected =
    selectableUsers.length > 0 &&
    selectableUsers.every((user) => selectedUserIds.has(user.id));

  function toggleUser(userId: string) {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedUserIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        selectableUsers.forEach((user) => next.delete(user.id));
      } else {
        selectableUsers.forEach((user) => next.add(user.id));
      }
      return next;
    });
  }

  async function deleteUsers() {
    if (!deleteUserIds.length) return;
    setPendingAction('delete:users');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/users', {
        body: JSON.stringify({ userIds: deleteUserIds }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      });
      const body = await readResponse<{ count: number }>(response);
      const deleted = new Set(deleteUserIds);
      setUsers((current) => current.filter((user) => !deleted.has(user.id)));
      setSelectedUserIds((current) => {
        const next = new Set(current);
        deleteUserIds.forEach((id) => next.delete(id));
        return next;
      });
      setDeleteUserIds([]);
      setNotice(`Permanently deleted ${body.count} account${body.count === 1 ? '' : 's'}.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to delete the selected accounts.',
      );
    } finally {
      setPendingAction(null);
    }
  }

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
      setNotice(`Updated ${user.name?.trim() || 'this account'} to ${role}.`);
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
        `${user.name?.trim() || 'This account'} is now ${
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
          <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/50" key={label}>
            <CardContent className="flex min-w-0 items-center gap-3 px-4 py-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-2xl font-black text-slate-900">
                  {value}
                </span>
                <span className="block truncate text-[10px] font-bold uppercase tracking-[0.13em] text-slate-600">
                  {label}
                </span>
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      {!authStatusAvailable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          Supabase account statuses are temporarily unavailable. Prisma role
          management remains visible, but mutations are paused until Auth can
          be reached.
        </div>
      ) : null}

      {notice ? (
        <div
          className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
          role="status"
        >
          {notice}
        </div>
      ) : null}
      {error ? (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
          role="alert"
        >
          {error}
        </div>
      ) : null}

      <Card className="rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
        <CardContent className="flex min-w-0 flex-col gap-3 px-4 py-4">
          <label className="relative min-w-0">
            <span className="sr-only">Search by name or phone number</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              aria-hidden="true"
            />
            <Input
              className="pl-10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search name or phone"
              type="search"
              value={query}
            />
          </label>
          <label className="min-w-0">
            <span className="sr-only">Filter by role</span>
            <select
              className="h-12 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
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
        <Card className="rounded-2xl border-slate-200/80 bg-slate-50 shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 px-4 py-3">
            <label className="flex min-w-0 items-center gap-3 text-sm font-black text-slate-800">
              <input
                aria-label="Select all visible users"
                checked={allVisibleSelected}
                className="size-5 shrink-0 accent-sky-600"
                disabled={!selectableUsers.length || !authStatusAvailable}
                onChange={toggleAllVisible}
                type="checkbox"
              />
              Select all visible users
            </label>
            <span className="shrink-0 text-xs font-bold text-slate-500">
              {selectedUserIds.size} selected
            </span>
          </CardContent>
        </Card>

        <div className="sr-only" role="row">
          <span role="columnheader">User</span>
          <span role="columnheader">Phone</span>
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
              className="card-hover rounded-2xl border-slate-200/80 bg-white shadow-sm shadow-slate-200/50"
              key={user.id}
              role="row"
            >
              <CardContent className="flex min-w-0 flex-col gap-4 px-4 py-4">
                <div className="flex min-w-0 items-start gap-3" role="cell">
                  <input
                    aria-label={`Select ${user.name?.trim() || 'user account'}`}
                    checked={selectedUserIds.has(user.id)}
                    className="mt-3 size-5 shrink-0 accent-sky-600"
                    disabled={
                      !authStatusAvailable || isSelf || isProtectedSuperAdmin
                    }
                    onChange={() => toggleUser(user.id)}
                    type="checkbox"
                  />
                  <Avatar className="size-11">
                    {user.avatarUrl ? (
                      <AvatarImage alt="" src={user.avatarUrl} />
                    ) : null}
                    <AvatarFallback>
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <button
                      className="block max-w-full truncate text-left font-black text-slate-900 transition hover:text-sky-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                      onClick={() => setEditingUser(user)}
                      type="button"
                    >
                      {user.name?.trim() || 'Unnamed user'}
                    </button>
                    <p className="mt-0.5 truncate text-xs text-slate-600">
                      {user.phoneNumber || 'No phone provided'}
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
                        aria-label={`Manage ${user.name?.trim() || 'user account'}`}
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
                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                    role="cell"
                  >
                    <p className="flex items-center gap-1.5 font-bold text-slate-600">
                      <BookOpenCheck className="size-3.5" aria-hidden="true" />
                      Enrolled
                    </p>
                    <p className="mt-1 font-black text-slate-900">
                      {user.enrolledCourses} courses
                    </p>
                  </div>
                  <div
                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                    role="cell"
                  >
                    <p className="flex items-center gap-1.5 font-bold text-slate-600">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      Joined
                    </p>
                    <p className="mt-1 truncate font-black text-slate-900">
                      {formatJoinedDate(user.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex min-w-0 gap-2">
                  <Button
                    className="flex-1 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100"
                    disabled={isProtectedSuperAdmin}
                    onClick={() => setEditingUser(user)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <PencilLine className="size-4" aria-hidden="true" /> Edit
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={isPending || isSelf || isProtectedSuperAdmin}
                    onClick={() => void changeStatus(
                      user,
                      user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED',
                    )}
                    size="sm"
                    type="button"
                    variant={user.status === 'DISABLED' ? 'default' : 'outline'}
                  >
                    {user.status === 'DISABLED' ? 'Enable' : 'Disable'}
                  </Button>
                  <Button
                    aria-label={`Delete ${user.name?.trim() || 'user account'}`}
                    className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                    disabled={
                      isPending ||
                      isSelf ||
                      isProtectedSuperAdmin ||
                      !authStatusAvailable
                    }
                    onClick={() => setDeleteUserIds([user.id])}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {!filteredUsers.length ? (
          <Card className="rounded-2xl border-dashed border-slate-300 bg-slate-50">
            <CardContent className="px-5 py-10 text-center">
              <Users className="mx-auto size-8 text-slate-400" />
              <p className="mt-3 font-black text-slate-900">No users found</p>
              <p className="mt-1 text-sm text-slate-600">
                Adjust the search or role filter.
              </p>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {editingUser ? (
        <EditStudentModal
          assignableRoles={assignableRoles}
          availableCourses={availableCourses}
          isSelf={editingUser.id === currentAdminId}
          key={editingUser.id}
          onOpenChange={(open) => {
            if (!open) setEditingUser(null);
          }}
          onSaved={(updated) => {
            setUsers((current) => current.map((entry) =>
              entry.id === updated.id
                ? {
                    ...entry,
                    ...updated,
                    enrolledCourses: updated.enrolledCourseIds.length,
                  }
                : entry,
            ));
            setNotice(`Saved ${updated.name?.trim() || 'the account'}.`);
          }}
          user={editingUser}
        />
      ) : null}

      {selectedUserIds.size ? (
        <div className="sticky bottom-4 z-30 flex w-full justify-center px-2">
          <Button
            className="w-full max-w-md shadow-xl"
            disabled={pendingAction === 'delete:users' || !authStatusAvailable}
            onClick={() => setDeleteUserIds(Array.from(selectedUserIds))}
            size="lg"
            type="button"
            variant="destructive"
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Delete Selected Users ({selectedUserIds.size})
          </Button>
        </div>
      ) : null}

      <Dialog
        onOpenChange={(open) => {
          if (!open && pendingAction !== 'delete:users') setDeleteUserIds([]);
        }}
        open={deleteUserIds.length > 0}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteUserIds.length} account{deleteUserIds.length === 1 ? '' : 's'}?</DialogTitle>
            <DialogDescription>
              This permanently removes the selected PostgreSQL profiles,
              Supabase Auth accounts, and legacy staff-role records. Accounts
              with assigned courses or financial audit history will be blocked.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={pendingAction === 'delete:users'} variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={pendingAction === 'delete:users'}
              onClick={() => void deleteUsers()}
              variant="destructive"
            >
              {pendingAction === 'delete:users' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {pendingAction === 'delete:users' ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
