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
  { icon: ClipboardCheck, label: { en: 'Diagnostic', ar: 'التقييم التشخيصي' }, value: { en: 'Baseline ready', ar: 'تم تحديد خط البداية' }, tone: 'bg-[#FBF6E2] text-[#8A6A16]' },
  { icon: Target, label: { en: 'Learning gap', ar: 'الفجوة التعليمية' }, value: { en: 'Fractions & reasoning', ar: 'الكسور والاستدلال' }, tone: 'bg-rose-50 text-rose-700' },
  { icon: BookOpenCheck, label: { en: 'Personalized plan', ar: 'الخطة المخصصة' }, value: { en: '4 focus milestones', ar: '4 محطات تركيز' }, tone: 'bg-emerald-50 text-[#084B2B]' },
] as const;

export function HeroLearningMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[42rem]" aria-label="Sample progress view">
      <div aria-hidden="true" className="absolute -inset-8 -z-10 rounded-[3rem] bg-[radial-gradient(circle,rgba(212,175,55,0.20),transparent_65%)]" />
      <div className="overflow-hidden rounded-[2rem] border border-emerald-950/10 bg-[#F5F7F2] p-3 shadow-[0_28px_80px_rgba(4,45,26,0.12)] sm:p-5">
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-[#042D1A] px-4 py-3 text-white sm:px-5">
          <div>
            <LandingCopy className="block text-[10px] font-black uppercase tracking-[0.18em] text-[#E7CD78]">{{ en: 'Sample Progress View', ar: 'نموذج توضيحي للتقدم' }}</LandingCopy>
            <LandingCopy className="mt-1 block text-sm font-black sm:text-base">{{ en: 'Your child’s learning journey', ar: 'رحلة تعلم ابنك' }}</LandingCopy>
          </div>
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-[#E7CD78]"><ChartNoAxesColumnIncreasing aria-hidden="true" className="size-5" /></span>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <article className="min-w-0 rounded-2xl border border-emerald-950/8 bg-white p-4" key={card.label.en}>
                <span className={`flex size-9 items-center justify-center rounded-xl ${card.tone}`}><Icon aria-hidden="true" className="size-4" /></span>
                <LandingCopy className="mt-4 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{card.label}</LandingCopy>
                <LandingCopy className="mt-1 block break-words text-sm font-black text-[#1A2E22]">{card.value}</LandingCopy>
              </article>
            );
          })}
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
          <article className="rounded-2xl border border-emerald-950/8 bg-white p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <LandingCopy className="text-xs font-black text-[#084B2B]">{{ en: 'Weekly progress', ar: 'التقدم الأسبوعي' }}</LandingCopy>
              <span className="rounded-full bg-[#FBF6E2] px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-[#8A6A16]">Sample</span>
            </div>
            <div className="mt-6 flex h-28 items-end gap-2" aria-hidden="true">
              {[38, 56, 49, 68, 74, 82].map((height, index) => (
                <span className="flex-1 rounded-t-lg bg-emerald-100 p-0.5" key={height} style={{ height: `${height}%` }}>
                  <span className={`block h-full w-full rounded-t-md ${index === 5 ? 'bg-[#D4AF37]' : 'bg-[#0F6E41]'}`} />
                </span>
              ))}
            </div>
            <LandingCopy className="mt-4 block text-[11px] leading-5 text-slate-500">{{ en: 'Illustrative pattern only — not a real student result.', ar: 'عرض توضيحي فقط — وليس نتيجة لطالب حقيقي.' }}</LandingCopy>
          </article>

          <div className="grid gap-3">
            <article className="rounded-2xl border border-emerald-950/8 bg-white p-4">
              <CalendarClock aria-hidden="true" className="size-5 text-[#0F6E41]" />
              <LandingCopy className="mt-3 block text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{{ en: 'Next live lesson', ar: 'الحصة المباشرة القادمة' }}</LandingCopy>
              <LandingCopy className="mt-1 block text-sm font-black text-[#1A2E22]">{{ en: 'Plan milestone 02', ar: 'المحطة الثانية في الخطة' }}</LandingCopy>
            </article>
            <article className="rounded-2xl bg-[#084B2B] p-4 text-white">
              <MessageSquareText aria-hidden="true" className="size-5 text-[#E7CD78]" />
              <LandingCopy className="mt-3 block text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100/65">{{ en: 'Parent update', ar: 'تحديث ولي الأمر' }}</LandingCopy>
              <LandingCopy className="mt-1 block text-sm font-black">{{ en: 'What improved. What comes next.', ar: 'ما الذي تحسن؟ وما الخطوة التالية؟' }}</LandingCopy>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}

