'use client';

import { useState } from 'react';
import {
  BadgeCheck,
  ClipboardCheck,
  FileCheck2,
  NotebookPen,
  Video,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoadmapStep {
  titleAr: string;
  titleEn: string;
  summary: string;
  detailAr: string;
  icon: LucideIcon;
}

const ROADMAP_STEPS: readonly RoadmapStep[] = [
  {
    titleAr: 'التقييم والتأسيس',
    titleEn: 'Diagnostic & Foundation',
    summary: 'Pinpointing the student baseline and reinforcing core concepts.',
    detailAr: 'نحدد المستوى الحالي بدقة، ثم نبني خطة تأسيس تناسب احتياجات الطالب ونقاط قوته.',
    icon: ClipboardCheck,
  },
  {
    titleAr: 'الشرح المباشر',
    titleEn: 'Live Masterclasses',
    summary: 'Weekly interactive Zoom sessions with expert faculty.',
    detailAr: 'حصص أسبوعية مباشرة تتيح السؤال والمناقشة وفهم الأفكار الصعبة مع مدرس متخصص.',
    icon: Video,
  },
  {
    titleAr: 'التطبيق والواجبات',
    titleEn: 'In-App Practice & Homework',
    summary: 'Worksheets, direct teacher grading, and actionable feedback.',
    detailAr: 'تطبيق منظم داخل المنصة مع تصحيح مباشر وملاحظات واضحة تقود إلى التحسن.',
    icon: NotebookPen,
  },
  {
    titleAr: 'المراجعات ونماذج الامتحانات',
    titleEn: 'Mock Exams & Revisions',
    summary: 'Comprehensive exam training and problem-solving drills.',
    detailAr: 'مراجعات مركزة ونماذج امتحانات وتدريب مكثف على استراتيجيات الحل وإدارة الوقت.',
    icon: FileCheck2,
  },
  {
    titleAr: 'التفوق والشهادة المعتمدة',
    titleEn: 'Honors & Certificate',
    summary: 'Full subject mastery with an official digital verification record.',
    detailAr: 'إتقان شامل للمادة، وتوثيق الإنجاز بشهادة رقمية قابلة للتحقق والمشاركة.',
    icon: BadgeCheck,
  },
];

export function CurriculumRoadmap() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = ROADMAP_STEPS[activeStepIndex];

  return (
    <section aria-labelledby="roadmap-heading" id="roadmap">
      <div className="mx-auto max-w-3xl text-center">
        <h2
          className="font-serif text-3xl font-semibold leading-tight tracking-tight text-[#042917] md:text-5xl"
          id="roadmap-heading"
        >
          <span className="block font-sans text-[0.88em] font-extrabold" dir="rtl" lang="ar">
            منهجية التفوق الأكاديمي
          </span>
          <span className="mt-2 block">Structured Academic Roadmap</span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
          Five connected milestones turn academic preparation into a clear,
          measurable journey from the first diagnostic to verified mastery.
        </p>
      </div>

      <div className="relative mt-12">
        <div
          aria-hidden="true"
          className="absolute left-[10%] right-[10%] top-8 hidden h-0.5 bg-[#D4AF37] lg:block"
        />

        <div className="relative grid gap-4 lg:grid-cols-5">
          {ROADMAP_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === activeStepIndex;

            return (
              <button
                aria-describedby="roadmap-active-detail"
                aria-pressed={isActive}
                className={cn(
                  'group relative flex min-h-56 w-full min-w-0 flex-col items-start rounded-2xl border p-5 text-left outline-none transition duration-200 focus-visible:ring-4 focus-visible:ring-[#D4AF37]/30 lg:items-center lg:text-center',
                  isActive
                    ? 'border-[#D4AF37] bg-[#084B2B] text-white shadow-[0_18px_45px_rgba(4,41,23,0.2)]'
                    : 'border-emerald-950/10 bg-white text-[#042917] shadow-sm hover:-translate-y-1 hover:border-[#D4AF37]/70 hover:shadow-lg',
                )}
                key={step.titleEn}
                onClick={() => setActiveStepIndex(index)}
                onFocus={() => setActiveStepIndex(index)}
                onPointerEnter={() => setActiveStepIndex(index)}
                type="button"
              >
                <span
                  className={cn(
                    'absolute -top-3 flex size-7 items-center justify-center rounded-full border text-xs font-black shadow-sm lg:left-1/2 lg:-translate-x-1/2',
                    isActive
                      ? 'border-[#D4AF37] bg-[#D4AF37] text-[#042917]'
                      : 'border-[#D4AF37] bg-[#FDF8E8] text-[#8C6B1B]',
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    'mt-3 flex size-12 items-center justify-center rounded-xl border',
                    isActive
                      ? 'border-[#D4AF37]/50 bg-[#063B22] text-[#D4AF37]'
                      : 'border-emerald-200/80 bg-emerald-50 text-[#084B2B]',
                  )}
                >
                  <Icon aria-hidden="true" className="size-6" strokeWidth={1.8} />
                </span>
                <span
                  className="mt-5 text-base font-extrabold leading-7"
                  dir="rtl"
                  lang="ar"
                >
                  {step.titleAr}
                </span>
                <span
                  className={cn(
                    'mt-1 text-xs font-bold uppercase leading-5 tracking-[0.08em]',
                    isActive ? 'text-[#FDF8E8]' : 'text-[#084B2B]',
                  )}
                >
                  {step.titleEn}
                </span>
                <span
                  className={cn(
                    'mt-3 text-xs leading-5',
                    isActive ? 'text-emerald-100/80' : 'text-slate-500',
                  )}
                >
                  {step.summary}
                </span>
              </button>
            );
          })}
        </div>

        <div
          aria-live="polite"
          className="relative mt-5 overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[#042917] px-6 py-5 text-white shadow-lg md:px-8"
          id="roadmap-active-detail"
        >
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1 bg-[#D4AF37]"
          />
          <div className="grid gap-3 md:grid-cols-[0.8fr_1.2fr] md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#D4AF37]">
                Step {activeStepIndex + 1} of {ROADMAP_STEPS.length}
              </p>
              <p className="mt-2 text-lg font-bold">{activeStep.titleEn}</p>
            </div>
            <p
              className="text-sm font-semibold leading-7 text-emerald-50/90 md:text-right"
              dir="rtl"
              lang="ar"
            >
              {activeStep.detailAr}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
