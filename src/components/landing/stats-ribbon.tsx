import {
  Award,
  GraduationCap,
  ShieldCheck,
  Video,
  type LucideIcon,
} from 'lucide-react';

interface AcademicMetric {
  value: string;
  label: string;
  arabicLabel: string;
  icon: LucideIcon;
}

const ACADEMIC_METRICS: readonly AcademicMetric[] = [
  {
    value: '5,000+',
    label: 'Students Enrolled across Academic Grades',
    arabicLabel: 'طلاب متفوقون',
    icon: GraduationCap,
  },
  {
    value: '98%',
    label: 'Exam Pass & Honors Rate',
    arabicLabel: 'نسبة النجاح والتفوق',
    icon: Award,
  },
  {
    value: '1,200+',
    label: 'Interactive Live Zoom Hours',
    arabicLabel: 'ساعات شرح تفاعلي مباشر',
    icon: Video,
  },
  {
    value: '100%',
    label: 'Protected Curriculum Materials',
    arabicLabel: 'مناهج ومذكرات مؤمنة بالكامل',
    icon: ShieldCheck,
  },
];

export function StatsRibbon() {
  return (
    <section
      aria-label="Oqool Academy academic impact"
      className="relative overflow-hidden rounded-2xl border-y border-brand-gold/30 bg-brand-base px-6 py-10 text-brand-white shadow-xl"
      style={{
        backgroundImage:
          'radial-gradient(circle at 50% 0%, rgba(14, 70, 50, 0.86), transparent 58%)',
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/70 to-transparent"
      />
      <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
        {ACADEMIC_METRICS.map((metric, index) => {
          const Icon = metric.icon;

          return (
            <article
              className="group relative flex min-w-0 items-start gap-4 lg:justify-center lg:px-7"
              key={metric.label}
            >
              {index > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute inset-y-1 left-0 hidden w-px bg-brand-gold/25 lg:block"
                />
              ) : null}
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-brand-gold/35 bg-brand-surface text-brand-gold shadow-inner">
                <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-3xl font-extrabold tracking-tight text-brand-gold md:text-4xl">
                  {metric.value}
                </p>
                <p
                  className="mt-2 text-sm font-bold leading-6 text-brand-white"
                  dir="rtl"
                  lang="ar"
                >
                  {metric.arabicLabel}
                </p>
                <p className="mt-0.5 max-w-44 text-xs leading-5 text-brand-muted/75">
                  {metric.label}
                </p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
