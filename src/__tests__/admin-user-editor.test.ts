jest.mock('server-only', () => ({}));

import {
  readAdminCourseAccessUpdate,
  readAdminProfileUpdate,
} from '@/lib/lms/admin-users';

describe('admin student editor input validation', () => {
  it('normalizes profile fields without accepting arbitrary grades', () => {
    expect(
      readAdminProfileUpdate({
        gradeLevel: 'GRADE_8',
        name: '  Amira Hassan  ',
        phoneNumber: '010 2527 2693',
        targetId: 'student_1',
      }),
    ).toEqual({
      gradeLevel: 'GRADE_8',
      name: 'Amira Hassan',
      phoneNumber: '+201025272693',
      targetId: 'student_1',
    });

    expect(() =>
      readAdminProfileUpdate({
        gradeLevel: 'COLLEGE',
        name: 'Amira Hassan',
        phoneNumber: '',
        targetId: 'student_1',
      }),
    ).toThrow('Choose a valid grade level.');
  });

  it('accepts only unique, known course-access and payment values', () => {
    expect(
      readAdminCourseAccessUpdate({
        courses: [
          {
            courseId: 'course_1',
            hasAccess: true,
            paymentStatus: 'APPROVED',
          },
        ],
        targetId: 'student_1',
      }),
    ).toEqual({
      courses: [
        {
          courseId: 'course_1',
          hasAccess: true,
          paymentStatus: 'APPROVED',
        },
      ],
      targetId: 'student_1',
    });

    expect(() =>
      readAdminCourseAccessUpdate({
        courses: [
          { courseId: 'course_1', hasAccess: true, paymentStatus: 'PAID' },
        ],
        targetId: 'student_1',
      }),
    ).toThrow('Choose valid course access and payment values.');
  });
});
