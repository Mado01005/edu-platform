import type { Role } from '@prisma/client';
import {
  getNavigationItems,
  getNavigationSections,
  getRoleHome,
} from '@/lib/lms/navigation';

function labels(role: Role) {
  return getNavigationItems(role).map((item) => item.label);
}

describe('role-aware universal navigation', () => {
  it.each([
    [
      'STUDENT',
      [
        'My Learning Dashboard',
        'Course Catalog',
        'Live Schedule',
        'My Grades & Progress',
      ],
    ],
    [
      'TEACHER',
      [
        'Teacher Home',
        'My Courses & Studio',
        'Assignment Grading Desk',
        'Zoom Scheduler',
      ],
    ],
    [
      'PARENT',
      [
        'Student Radar & Attendance',
        'Exam Report Cards',
        'Tuition Invoices',
      ],
    ],
    [
      'SUPPORT',
      ['Student Lookup', 'Credential Resets', 'Support Tickets'],
    ],
    [
      'ACCOUNTING',
      ['Payment Approvals', 'Revenue Ledger', 'Invoice Generator'],
    ],
  ] as const)(
    '%s receives only its streamlined navigation set',
    (role, expectedLabels) => {
      expect(labels(role)).toEqual(expectedLabels);
    },
  );

  it.each(['ADMIN', 'SUPER_ADMIN'] as const)(
    '%s receives full platform sections',
    (role) => {
      const adminLabels = labels(role);
      expect(getNavigationSections(role)).toHaveLength(3);
      expect(adminLabels).toEqual(
        expect.arrayContaining([
          'Admin Dashboard',
          'K-12 Curriculum Manager',
          'Teacher Studio',
          'Student Activity Radar',
          'Support Portal',
          'Accounting Ledger',
          'Cloudflare R2 Storage',
          'Platform Settings',
        ]),
      );
    },
  );

  it('maps every role to a reachable home route', () => {
    expect(
      Object.fromEntries(
        (
          [
            'STUDENT',
            'TEACHER',
            'PARENT',
            'SUPPORT',
            'ACCOUNTING',
            'ADMIN',
            'SUPER_ADMIN',
          ] as const
        ).map((role) => [role, getRoleHome(role)]),
      ),
    ).toEqual({
      ACCOUNTING: '/accounting',
      ADMIN: '/admin',
      PARENT: '/mps',
      STUDENT: '/dashboard',
      SUPER_ADMIN: '/admin',
      SUPPORT: '/support',
      TEACHER: '/teacher',
    });
  });
});
