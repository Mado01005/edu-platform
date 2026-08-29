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
    <section className="scroll-mt-28 py-20 sm:py-28" id="curriculum">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-9 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="max-w-xl">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-[#FBF6E2] text-[#8A6A16]"><GraduationCap aria-hidden="true" className="size-5" /></span>
            <LandingCopy className="mt-6 block text-xs font-black uppercase tracking-[0.18em] text-[#0F6E41]">{landingContent.curriculum.eyebrow}</LandingCopy>
            <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight text-[#042D1A] sm:text-5xl">{landingContent.curriculum.title}</LandingCopy>
            <LandingCopy as="p" className="mt-5 text-sm leading-7 text-slate-600 sm:text-base">{landingContent.curriculum.description}</LandingCopy>
          </div>

          <div className="min-w-0 rounded-[2rem] border border-emerald-950/10 bg-white p-4 sm:p-6">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#F1F5EF] p-1.5" role="tablist" aria-label={locale === 'ar' ? 'اختر المنهج' : 'Choose curriculum'}>
              {(Object.keys(curriculumAvailability) as CurriculumId[]).map((id) => (
                <button aria-selected={curriculumId === id} className={`min-h-12 min-w-0 rounded-xl px-3 text-xs font-black outline-none focus-visible:ring-4 focus-visible:ring-emerald-200 sm:text-sm ${curriculumId === id ? 'bg-[#084B2B] text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`} key={id} onClick={() => selectCurriculum(id)} role="tab" type="button">
                  <LandingCopy>{curriculumAvailability[id].label}</LandingCopy>
                </button>
              ))}
            </div>

            <LandingCopy className="mt-7 block text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">{landingContent.curriculum.gradesLabel}</LandingCopy>
            <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]" aria-label={locale === 'ar' ? 'الصفوف الدراسية' : 'Grade levels'}>
              {curriculum.grades.map((grade) => (
                <button aria-pressed={selectedGrade.id === grade.id} className={`min-h-11 shrink-0 rounded-full border px-4 text-xs font-black outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 ${selectedGrade.id === grade.id ? 'border-[#084B2B] bg-[#084B2B] text-white' : 'border-emerald-950/10 bg-white text-slate-600 hover:border-[#D4AF37]'}`} key={grade.id} onClick={() => { setGradeId(grade.id); trackLandingEvent('grade_select', { curriculum: curriculumId, grade: grade.id }); }} type="button">
                  <LandingCopy>{grade.label}</LandingCopy>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-[#F7F8F4] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[#084B2B]"><BookOpen aria-hidden="true" className="size-4" /><LandingCopy className="text-[10px] font-black uppercase tracking-[0.16em]">{landingContent.curriculum.subjectsLabel}</LandingCopy></div>
              <div className="mt-4 flex flex-wrap gap-2">
                {selectedGrade.subjects.map((subject) => (
                  <button className="inline-flex min-h-11 items-center rounded-full border border-emerald-950/10 bg-white px-4 text-xs font-bold text-[#1A2E22] outline-none hover:border-[#D4AF37] hover:text-[#084B2B] focus-visible:ring-4 focus-visible:ring-emerald-100" key={subject.en} onClick={() => trackLandingEvent('subject_select', { curriculum: curriculumId, grade: selectedGrade.id, subject: subject.en })} type="button">
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
