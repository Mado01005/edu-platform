import type { Role } from '@prisma/client';

export type NavigationItemKey =
  | 'accounting-approvals'
  | 'accounting-invoices'
  | 'accounting-ledger'
  | 'admin-curriculum'
  | 'admin-radar'
  | 'admin-storage'
  | 'admin-users'
  | 'catalog'
  | 'dashboard'
  | 'live'
  | 'parent-attendance'
  | 'parent-invoices'
  | 'parent-reports'
  | 'profile'
  | 'settings'
  | 'support-lookup'
  | 'support-resets'
  | 'support-tickets'
  | 'teacher-courses'
  | 'teacher-grading'
  | 'teacher-home'
  | 'teacher-zoom';

export type NavigationItem = {
  activeRoutes?: readonly string[];
  description: string;
  href: string;
  key: NavigationItemKey;
  keywords: readonly string[];
  label: string;
  roles: readonly Role[];
};

export type NavigationSection = {
  items: readonly NavigationItem[];
  label: string;
};

const STUDENT: readonly Role[] = ['STUDENT'];
const TEACHER: readonly Role[] = ['TEACHER'];
const PARENT: readonly Role[] = ['PARENT'];
const SUPPORT: readonly Role[] = ['SUPPORT'];
const ACCOUNTING: readonly Role[] = ['ACCOUNTING'];
const ADMIN: readonly Role[] = ['ADMIN', 'SUPER_ADMIN'];

const sections: readonly NavigationSection[] = [
  {
    label: 'My learning',
    items: [
      {
        description: 'Resume courses and see your next learning step.',
        href: '/dashboard',
        key: 'dashboard',
        keywords: ['home', 'learning', 'resume'],
        label: 'My Learning Dashboard',
        roles: STUDENT,
      },
      {
        description: 'Browse every available course.',
        href: '/catalog',
        key: 'catalog',
        keywords: ['courses', 'browse', 'subjects'],
        label: 'Course Catalog',
        roles: STUDENT,
      },
      {
        activeRoutes: ['/live', '/live-classes'],
        description: 'See upcoming online classes in your local time.',
        href: '/live-classes',
        key: 'live',
        keywords: ['zoom', 'schedule', 'classes'],
        label: 'Live Schedule',
        roles: STUDENT,
      },
      {
        description: 'Review grades, activity, and course progress.',
        href: '/lms/profile',
        key: 'profile',
        keywords: ['grades', 'progress', 'results'],
        label: 'My Grades & Progress',
        roles: STUDENT,
      },
    ],
  },
  {
    label: 'Teaching workspace',
    items: [
      {
        description: 'Open your teaching overview and next actions.',
        href: '/teacher',
        key: 'teacher-home',
        keywords: ['home', 'studio', 'teaching'],
        label: 'Teacher Home',
        roles: TEACHER,
      },
      {
        description: 'Create courses, lessons, assignments, and resources.',
        href: '/teacher/courses',
        key: 'teacher-courses',
        keywords: ['studio', 'lessons', 'curriculum'],
        label: 'My Courses & Studio',
        roles: TEACHER,
      },
      {
        description: 'Review submitted homework and send feedback.',
        href: '/teacher/grading',
        key: 'teacher-grading',
        keywords: ['homework', 'submissions', 'grades'],
        label: 'Assignment Grading Desk',
        roles: TEACHER,
      },
      {
        description: 'Choose a course and schedule its next Zoom class.',
        href: '/teacher/courses?focus=zoom#course-list',
        key: 'teacher-zoom',
        keywords: ['live', 'meeting', 'schedule'],
        label: 'Zoom Scheduler',
        roles: TEACHER,
      },
    ],
  },
  {
    label: 'Parent portal',
    items: [
      {
        description: 'Review student activity and digital attendance.',
        href: '/mps#attendance',
        key: 'parent-attendance',
        keywords: ['student', 'radar', 'classes'],
        label: 'Student Radar & Attendance',
        roles: PARENT,
      },
      {
        description: 'See quiz grades, averages, and teacher feedback.',
        href: '/mps#report-cards',
        key: 'parent-reports',
        keywords: ['grades', 'exams', 'results'],
        label: 'Exam Report Cards',
        roles: PARENT,
      },
      {
        description: 'Review paid receipts and active subscriptions.',
        href: '/mps#invoices',
        key: 'parent-invoices',
        keywords: ['payments', 'receipts', 'subscriptions'],
        label: 'Tuition Invoices',
        roles: PARENT,
      },
    ],
  },
  {
    label: 'Support workspace',
    items: [
      {
        description: 'Find a student by phone number or email address.',
        href: '/support#student-lookup',
        key: 'support-lookup',
        keywords: ['search', 'phone', 'email'],
        label: 'Student Lookup',
        roles: SUPPORT,
      },
      {
        description: 'Open the verified temporary-password workflow.',
        href: '/support#credential-resets',
        key: 'support-resets',
        keywords: ['password', 'credentials', 'account'],
        label: 'Credential Resets',
        roles: SUPPORT,
      },
      {
        description: 'Review and resend student support notices.',
        href: '/support#support-tickets',
        key: 'support-tickets',
        keywords: ['help', 'notices', 'requests'],
        label: 'Support Tickets',
        roles: SUPPORT,
      },
    ],
  },
  {
    label: 'Accounting workspace',
    items: [
      {
        description: 'Review pending receipts and subscriptions.',
        href: '/accounting#payment-approvals',
        key: 'accounting-approvals',
        keywords: ['payments', 'subscriptions', 'pending'],
        label: 'Payment Approvals',
        roles: ACCOUNTING,
      },
      {
        description: 'Review recent USD and EGP payment records.',
        href: '/accounting#revenue-ledger',
        key: 'accounting-ledger',
        keywords: ['revenue', 'payments', 'records'],
        label: 'Revenue Ledger',
        roles: ACCOUNTING,
      },
      {
        description: 'Record a payment and issue its digital receipt.',
        href: '/accounting#invoice-generator',
        key: 'accounting-invoices',
        keywords: ['invoice', 'receipt', 'manual payment'],
        label: 'Invoice Generator',
        roles: ACCOUNTING,
      },
    ],
  },
  {
    label: 'Academic management',
    items: [
      {
        description: 'Open the platform overview.',
        href: '/admin',
        key: 'dashboard',
        keywords: ['home', 'overview', 'admin'],
        label: 'Admin Dashboard',
        roles: ADMIN,
      },
      {
        description: 'Browse the public course catalog.',
        href: '/catalog',
        key: 'catalog',
        keywords: ['courses', 'browse'],
        label: 'Course Catalog',
        roles: ADMIN,
      },
      {
        activeRoutes: ['/live', '/live-classes'],
        description: 'Review all upcoming live classes.',
        href: '/live-classes',
        key: 'live',
        keywords: ['zoom', 'schedule'],
        label: 'Live Classes',
        roles: ADMIN,
      },
      {
        description: 'Manage grade levels, subjects, and teacher mapping.',
        href: '/admin/curriculum',
        key: 'admin-curriculum',
        keywords: ['k12', 'subjects', 'grades'],
        label: 'K-12 Curriculum Manager',
        roles: ADMIN,
      },
      {
        description: 'Manage courses and teaching content.',
        href: '/teacher/courses',
        key: 'teacher-courses',
        keywords: ['studio', 'lessons', 'teacher'],
        label: 'Teacher Studio',
        roles: ADMIN,
      },
      {
        description: 'Review student homework submissions.',
        href: '/teacher/grading',
        key: 'teacher-grading',
        keywords: ['assignments', 'homework'],
        label: 'Assignment Grading Desk',
        roles: ADMIN,
      },
    ],
  },
  {
    label: 'Students & operations',
    items: [
      {
        description: 'Monitor student health and at-risk status.',
        href: '/admin/radar',
        key: 'admin-radar',
        keywords: ['activity', 'health', 'risk'],
        label: 'Student Activity Radar',
        roles: ADMIN,
      },
      {
        description: 'Manage user access, status, and roles.',
        href: '/admin/users',
        key: 'admin-users',
        keywords: ['students', 'teachers', 'roles'],
        label: 'Manage Users',
        roles: ADMIN,
      },
      {
        description: 'Search student accounts and resolve access issues.',
        href: '/support',
        key: 'support-lookup',
        keywords: ['support', 'password', 'lookup'],
        label: 'Support Portal',
        roles: ADMIN,
      },
    ],
  },
  {
    label: 'Finance & platform',
    items: [
      {
        description: 'Approve payments and issue receipts.',
        href: '/accounting',
        key: 'accounting-approvals',
        keywords: ['finance', 'payments', 'invoices'],
        label: 'Accounting Ledger',
        roles: ADMIN,
      },
      {
        description: 'Review files stored in Cloudflare R2.',
        href: '/admin/storage',
        key: 'admin-storage',
        keywords: ['files', 'uploads', 'cloudflare'],
        label: 'Cloudflare R2 Storage',
        roles: ADMIN,
      },
      {
        description: 'Change profile, notifications, and platform settings.',
        href: '/settings',
        key: 'settings',
        keywords: ['account', 'preferences', 'profile'],
        label: 'Platform Settings',
        roles: ADMIN,
      },
    ],
  },
] as const;

export function getNavigationSections(role: Role) {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}

export function getNavigationItems(role: Role) {
  return getNavigationSections(role).flatMap((section) => section.items);
}

export function getRoleHome(role: Role) {
  switch (role) {
    case 'TEACHER':
      return '/teacher';
    case 'PARENT':
      return '/mps';
    case 'SUPPORT':
      return '/support';
    case 'ACCOUNTING':
      return '/accounting';
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin';
    default:
      return '/dashboard';
  }
}
