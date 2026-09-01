'use client';

import { BookOpen, GraduationCap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { useLanguage } from '@/components/i18n/language-provider';
import { trackLandingEvent } from '@/lib/landing/analytics';
import { curriculumAvailability, landingContent } from '@/lib/landing/content';
import type { CurriculumId } from '@/lib/landing/types';

export function CurriculumExplorer() {
  const { locale } = useLanguage();
  const [curriculumId, setCurriculumId] = useState<CurriculumId>('saudi');
  const curriculum = curriculumAvailability[curriculumId];
  const [gradeId, setGradeId] = useState<string>(curriculum.grades[3].id);
  const selectedGrade = useMemo(
    () => curriculum.grades.find((grade) => grade.id === gradeId) ?? curriculum.grades[0],
    [curriculum, gradeId],
  );

  const selectCurriculum = (nextId: CurriculumId) => {
    const nextCurriculum = curriculumAvailability[nextId];
    setCurriculumId(nextId);
    setGradeId(nextCurriculum.grades[3].id);
    trackLandingEvent('curriculum_tab_change', { curriculum: nextId });
  };

  return (
    <section className="scroll-mt-28 bg-brand-base py-20 text-brand-white md:py-28" id="curriculum">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-9 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="max-w-xl">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-gold text-brand-base"><GraduationCap aria-hidden="true" className="size-5" /></span>
            <LandingCopy className="mt-6 block text-xs font-black uppercase tracking-[0.18em] text-brand-gold">{landingContent.curriculum.eyebrow}</LandingCopy>
            <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-brand-white sm:text-5xl">{landingContent.curriculum.title}</LandingCopy>
            <LandingCopy as="p" className="mt-5 text-sm leading-7 text-brand-muted/80 sm:text-base">{landingContent.curriculum.description}</LandingCopy>
          </div>

          <div className="min-w-0 rounded-3xl border border-brand-rim bg-brand-surface p-4 text-brand-white shadow-2xl shadow-black/30 backdrop-blur-md sm:p-6">
            <LandingCopy className="block text-[10px] font-black uppercase tracking-[0.16em] text-brand-muted/65">{landingContent.curriculum.tracksLabel}</LandingCopy>
            <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-brand-border bg-brand-base p-1.5 backdrop-blur-md" role="tablist" aria-label={locale === 'ar' ? 'اختر المنهج' : 'Choose curriculum'}>
              {(Object.keys(curriculumAvailability) as CurriculumId[]).map((id) => (
                <button aria-selected={curriculumId === id} className={`landing-card min-h-12 min-w-0 rounded-xl px-3 py-2 text-xs font-black leading-5 outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-brand-gold/30 sm:text-sm ${curriculumId === id ? 'bg-brand-gold text-brand-base shadow-lg shadow-black/20' : 'text-brand-muted/75 hover:-translate-y-1 hover:bg-brand-surface hover:text-brand-gold-hover'}`} key={id} onClick={() => selectCurriculum(id)} role="tab" type="button">
                  <LandingCopy>{curriculumAvailability[id].label}</LandingCopy>
                </button>
              ))}
            </div>

            <LandingCopy className="mt-7 block text-[10px] font-black uppercase tracking-[0.16em] text-brand-muted/65">{landingContent.curriculum.gradesLabel}</LandingCopy>
            <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]" aria-label={locale === 'ar' ? 'الصفوف الدراسية' : 'Grade levels'}>
              {curriculum.grades.map((grade) => (
                <button aria-pressed={selectedGrade.id === grade.id} className={`landing-card min-h-11 shrink-0 rounded-full border px-4 text-xs font-black outline-none transition-all duration-300 focus-visible:ring-4 focus-visible:ring-brand-gold/30 ${selectedGrade.id === grade.id ? 'border-brand-gold bg-brand-gold text-brand-base shadow-lg shadow-black/20' : 'border-brand-border bg-brand-base text-brand-muted hover:-translate-y-1 hover:border-brand-gold/70 hover:text-brand-gold-hover'}`} key={grade.id} onClick={() => { setGradeId(grade.id); trackLandingEvent('grade_select', { curriculum: curriculumId, grade: grade.id }); }} type="button">
                  <LandingCopy>{grade.label}</LandingCopy>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-brand-border bg-brand-base p-4 backdrop-blur-md sm:p-5">
              <div className="flex items-center gap-2 text-brand-gold"><BookOpen aria-hidden="true" className="size-4" /><LandingCopy className="text-[10px] font-black uppercase tracking-[0.16em]">{landingContent.curriculum.subjectsLabel}</LandingCopy></div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedGrade.subjects.map((subject) => (
                  <button className="landing-card inline-flex min-h-11 items-center rounded-full border border-brand-border bg-brand-surface px-4 text-xs font-bold text-brand-white outline-none backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold hover:text-brand-gold-hover focus-visible:ring-4 focus-visible:ring-brand-gold/30" key={subject.en} onClick={() => trackLandingEvent('subject_select', { curriculum: curriculumId, grade: selectedGrade.id, subject: subject.en })} type="button">
                    <LandingCopy>{subject}</LandingCopy>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
