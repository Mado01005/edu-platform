import { curriculumAvailability, landingContent } from '@/lib/landing/content';

const combinedCurriculumLabel = {
  en: 'National & International Curricula',
  ar: 'المناهج الوطنية والدولية',
};

describe('landing curriculum availability', () => {
  test('uses the unified curriculum label across storefront summary sections', () => {
    expect(landingContent.hero.qualifier.en).toContain(combinedCurriculumLabel.en);
    expect(landingContent.hero.qualifier.ar).toContain(combinedCurriculumLabel.ar);
    expect(landingContent.ticker).toContainEqual(combinedCurriculumLabel);
    expect(landingContent.trust.items).toContainEqual(combinedCurriculumLabel);
    expect(landingContent.curriculum.tracksLabel).toEqual(combinedCurriculumLabel);
  });

  test('presents national and international tabs while preserving curriculum data branches', () => {
    expect(curriculumAvailability.saudi.label).toEqual({
      en: 'Egyptian National Curriculum',
      ar: 'المنهج المصري الوطني',
    });
    expect(curriculumAvailability.american.label).toEqual({
      en: 'American / British Curricula',
      ar: 'المنهجان الأمريكي والبريطاني',
    });
  });

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

  test.each([
    ['saudi', ['saudi-4-6', 'saudi-7-9']],
    ['american', ['american-1-3', 'american-4-6', 'american-7-9']],
  ] as const)('shows Social Studies at the requested grades for %s', (curriculum, gradeIds) => {
    for (const grade of curriculumAvailability[curriculum].grades) {
      expect(grade.subjects.some((subject) => subject.en === 'Social Studies' && subject.ar === 'الدراسات الاجتماعية'))
        .toBe(new Set<string>(gradeIds).has(grade.id));
    }
  });
});
