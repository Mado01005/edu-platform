import {
  BookOpenCheck,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  MessageSquareText,
  Target,
} from 'lucide-react';
import { LandingCopy } from '@/components/landing/LandingCopy';

const cards = [
  { icon: ClipboardCheck, label: { en: 'Diagnostic', ar: 'التقييم التشخيصي' }, value: { en: 'Baseline Ready', ar: 'تم تحديد خط البداية' }, tone: 'bg-brand-gold text-brand-base' },
  { icon: Target, label: { en: 'Learning Gap', ar: 'الفجوة التعليمية' }, value: { en: 'Fractions & Reasoning', ar: 'الكسور والاستدلال' }, tone: 'bg-brand-base text-brand-gold' },
  { icon: BookOpenCheck, label: { en: 'Personalized Plan', ar: 'الخطة المخصصة' }, value: { en: '4 Focus Milestones', ar: '4 محطات تركيز' }, tone: 'bg-brand-border text-brand-white' },
] as const;

export function HeroLearningMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[42rem]" aria-label="Sample progress view">
      <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle,rgba(23,88,63,0.52),rgba(212,163,69,0.16)_38%,transparent_68%)] blur-2xl" />
      <div className="overflow-hidden rounded-3xl border border-brand-rim bg-brand-surface p-3 shadow-2xl shadow-black/30 backdrop-blur-md sm:p-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border bg-brand-base px-4 py-3 text-brand-white shadow-lg shadow-black/20 backdrop-blur-md sm:px-5">
          <div>
            <LandingCopy className="block text-[10px] font-black uppercase tracking-[0.18em] text-brand-gold">{{ en: 'Sample Progress View', ar: 'نموذج توضيحي للتقدم' }}</LandingCopy>
            <LandingCopy className="mt-1 block text-sm font-black sm:text-base">{{ en: 'Your child’s learning journey', ar: 'رحلة تعلم ابنك' }}</LandingCopy>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-surface text-brand-gold"><ChartNoAxesColumnIncreasing aria-hidden="true" className="size-5" /></span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="landing-card flex min-w-0 flex-col items-start rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-xl shadow-black/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/45" key={card.label.en}>
                <span className={`flex size-9 items-center justify-center rounded-xl ${card.tone}`}><Icon aria-hidden="true" className="size-4" /></span>
                <div className="mt-4 flex w-full min-w-0 flex-col gap-1.5">
                  <LandingCopy className="block w-full break-normal text-xs font-extrabold uppercase leading-4 tracking-[0.12em] text-brand-muted/65">{card.label}</LandingCopy>
                  <LandingCopy className="block w-full break-normal text-pretty text-sm font-black leading-5 text-brand-white sm:text-base">{card.value}</LandingCopy>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <article className="landing-card rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-xl shadow-black/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/45 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <LandingCopy className="text-xs font-black text-brand-white">{{ en: 'Weekly progress', ar: 'التقدم الأسبوعي' }}</LandingCopy>
              <span className="rounded-full bg-brand-gold px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-brand-base">Sample</span>
            </div>
            <div className="mt-6 flex h-28 items-end gap-2" aria-hidden="true">
              {[38, 56, 49, 68, 74, 82].map((height, index) => (
                <span className="flex-1 rounded-t-lg bg-brand-base p-0.5" key={height} style={{ height: `${height}%` }}>
                  <span className={`block h-full w-full rounded-t-md ${index === 5 ? 'bg-brand-gold' : 'bg-brand-border'}`} />
                </span>
              ))}
            </div>
          </article>

          <div className="grid gap-3">
            <article className="landing-card rounded-2xl border border-brand-border bg-brand-surface p-4 shadow-xl shadow-black/20 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/45">
              <CalendarClock aria-hidden="true" className="size-5 text-brand-gold" />
              <div className="mt-3 flex items-center gap-2">
                <span aria-hidden="true" className="relative flex size-2.5 shrink-0">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-gold-hover opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-brand-gold shadow-[0_0_12px_rgba(229,184,92,0.9)]" />
                </span>
                <LandingCopy className="block text-[10px] font-black uppercase tracking-[0.12em] text-brand-muted/65">{{ en: 'Next live lesson', ar: 'الحصة المباشرة القادمة' }}</LandingCopy>
              </div>
              <LandingCopy className="mt-1 block text-sm font-black text-brand-white">{{ en: 'Plan milestone 02', ar: 'المحطة الثانية في الخطة' }}</LandingCopy>
            </article>
            <article className="landing-card rounded-2xl border border-brand-rim bg-brand-base p-4 text-brand-white shadow-2xl shadow-black/30 backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-brand-gold/45">
              <MessageSquareText aria-hidden="true" className="size-5 text-brand-gold" />
              <LandingCopy className="mt-3 block text-[10px] font-black uppercase tracking-[0.12em] text-brand-muted/65">{{ en: 'Parent update', ar: 'تحديث ولي الأمر' }}</LandingCopy>
              <LandingCopy className="mt-1 block text-sm font-black">{{ en: 'What improved. What comes next.', ar: 'ما الذي تحسن؟ وما الخطوة التالية؟' }}</LandingCopy>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
