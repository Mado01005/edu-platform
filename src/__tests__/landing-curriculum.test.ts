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
      en: 'National Curriculum',
      ar: 'المنهج الوطني',
    });
    expect(curriculumAvailability.american.label).toEqual({
      en: 'International Curriculum',
      ar: 'المنهج الدولي',
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
});
