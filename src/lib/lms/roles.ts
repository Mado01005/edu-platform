import type { Role } from '@prisma/client';

export const LMS_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'TEACHER',
  'STUDENT',
  'PARENT',
  'SUPPORT',
  'ACCOUNTING',
] as const satisfies readonly Role[];

export const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
] as const satisfies readonly Role[];

export const TEACHING_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'TEACHER',
] as const satisfies readonly Role[];

export const SUPPORT_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'SUPPORT',
] as const satisfies readonly Role[];

export const ACCOUNTING_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'ACCOUNTING',
] as const satisfies readonly Role[];

export function isLmsRole(value: unknown): value is Role {
  return (
    typeof value === 'string' &&
    LMS_ROLES.includes(value as Role)
  );
}

export function hasLmsRole(
  role: Role,
  allowed: readonly Role[],
) {
  return allowed.includes(role);
}

export function isAdminRole(role: Role) {
  return hasLmsRole(role, ADMIN_ROLES);
}

export function isTeachingRole(role: Role) {
  return hasLmsRole(role, TEACHING_ROLES);
}
