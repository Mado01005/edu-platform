import { curriculumAvailability } from '@/lib/landing/content';

describe('landing curriculum availability', () => {
  test.each(
    Object.values(curriculumAvailability).flatMap((curriculum) =>
      curriculum.grades.map((grade) => ({
        curriculum: curriculum.id,
        grade,
      })),
    ),
  )('$curriculum $grade.id includes Arabic', ({ grade }) => {
    expect(grade.subjects).toContainEqual({
      en: 'Arabic',
      ar: 'اللغة العربية',
    });
  });
});
