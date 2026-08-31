import Image from 'next/image';
import { Award, CheckCircle2, Download, Share2, ShieldCheck } from 'lucide-react';

interface VerifiedCertificateProps {
  studentName?: string;
  subject?: string;
  gradeLevel?: string;
  honorGrade?: string;
  certificateId?: string;
  instructorName?: string;
}

function KnowledgeTreeMark() {
  return (
    <svg
      aria-label="Oqool Academy tree of knowledge"
      className="h-20 w-24"
      fill="none"
      role="img"
      viewBox="0 0 120 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M60 68V30M60 46 42 33M60 50l18-17M60 38 50 24M60 38l10-14" stroke="#FFFFFF" strokeLinecap="round" strokeWidth="4" />
      <circle cx="38" cy="30" fill="#D4A345" r="7" />
      <circle cx="49" cy="20" fill="#FFFFFF" r="7" />
      <circle cx="60" cy="16" fill="#D4A345" r="8" />
      <circle cx="72" cy="21" fill="#FFFFFF" r="7" />
      <circle cx="82" cy="31" fill="#D4A345" r="7" />
      <path d="M19 69c16 0 29 4 41 13 12-9 25-13 41-13v17c-16 0-29 3-41 10-12-7-25-10-41-10V69Z" fill="#E2E8F0" stroke="#FFFFFF" strokeLinejoin="round" strokeWidth="3" />
      <path d="M60 82v14" stroke="#D4A345" strokeWidth="3" />
    </svg>
  );
}

export function VerifiedCertificate({
  studentName = 'Student Name',
  subject = 'Mathematics',
  gradeLevel = 'Grade 12',
  honorGrade = 'Honor Grade',
  certificateId = 'OQ-2026-0001',
  instructorName = 'Authorized Instructor',
}: VerifiedCertificateProps) {
  return (
    <article className="relative overflow-hidden border-2 border-brand-gold bg-brand-surface p-2 text-brand-white shadow-[0_24px_65px_rgba(0,0,0,0.28)] sm:p-3">
      <div className="relative border border-brand-gold/80 px-5 py-7 text-center sm:px-8 sm:py-9">
        <span aria-hidden="true" className="absolute left-2 top-2 size-7 border-l-2 border-t-2 border-brand-gold" />
        <span aria-hidden="true" className="absolute right-2 top-2 size-7 border-r-2 border-t-2 border-brand-gold" />
        <span aria-hidden="true" className="absolute bottom-2 left-2 size-7 border-b-2 border-l-2 border-brand-gold" />
        <span aria-hidden="true" className="absolute bottom-2 right-2 size-7 border-b-2 border-r-2 border-brand-gold" />

        <div className="flex justify-center">
          <KnowledgeTreeMark />
        </div>
        <p className="mt-1 text-xs font-black uppercase tracking-[0.24em] text-brand-gold">
          Oqool Academy
        </p>
        <h3 className="mx-auto mt-5 max-w-2xl font-serif text-2xl font-semibold leading-tight text-brand-white md:text-3xl">
          <span className="block font-sans text-xl font-extrabold" dir="rtl" lang="ar">
            شهادة إتمام وتفوق أكاديمي
          </span>
          <span className="mt-1 block">Certificate of Academic Excellence</span>
        </h3>
        <div className="mx-auto mt-5 flex max-w-xs items-center gap-3">
          <span className="h-px flex-1 bg-brand-gold/60" />
          <span className="size-2 rotate-45 bg-brand-gold" />
          <span className="h-px flex-1 bg-brand-gold/60" />
        </div>

        <p className="mt-6 text-xs uppercase tracking-[0.18em] text-brand-muted/70">
          This certificate is proudly awarded to
        </p>
        <p className="mx-auto mt-2 max-w-md border-b border-brand-gold/50 pb-2 font-serif text-3xl font-semibold text-brand-gold-hover">
          {studentName}
        </p>

        <div className="mx-auto mt-6 grid max-w-xl gap-4 text-left sm:grid-cols-2">
          <div className="border-b border-brand-border pb-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-muted/55">Subject & grade level</p>
            <p className="mt-1 text-sm font-bold text-brand-white">{subject} — {gradeLevel}</p>
          </div>
          <div className="border-b border-brand-border pb-2 sm:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand-muted/55">Academic distinction</p>
            <p className="mt-1 text-sm font-bold text-brand-white">{honorGrade}</p>
          </div>
        </div>

        <div className="mt-7 grid items-end gap-5 sm:grid-cols-[1fr_auto_1fr]">
          <div className="text-left">
            <span className="block border-b border-brand-muted/50 pb-1 font-serif text-lg italic text-brand-white">{instructorName}</span>
            <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-brand-muted/70">Instructor signature</span>
          </div>
          <div className="mx-auto flex size-20 flex-col items-center justify-center rounded-full border-4 border-double border-brand-gold-hover bg-brand-gold text-brand-base shadow-md">
            <Award aria-hidden="true" className="size-7" strokeWidth={1.8} />
            <span className="mt-0.5 text-[8px] font-black uppercase tracking-wider">Official seal</span>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand-muted/70">Certificate ID</p>
            <p className="mt-1 font-mono text-sm font-bold text-brand-white">{certificateId}</p>
          </div>
        </div>

        <div className="mx-auto mt-7 flex w-fit max-w-full items-center gap-3 rounded-xl border border-brand-gold/50 bg-brand-base p-2 pr-4 text-left">
          <Image
            alt={`QR verification for certificate ${certificateId}`}
            className="size-14 rounded-md border border-brand-gold/35 bg-brand-white p-1"
            height={56}
            src="/images/landing/certificate-verification.svg"
            unoptimized
            width={56}
          />
          <div className="min-w-0">
            <p className="text-xs font-extrabold text-brand-gold" dir="rtl" lang="ar">
              معتمد رقمياً · Verified Certificate
            </p>
            <p className="mt-0.5 truncate font-mono text-[9px] text-brand-gold-hover">{certificateId}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

const CERTIFICATE_BENEFITS = [
  {
    title: 'Shareable with parents',
    description: 'A clear record of academic progress that families can keep and share.',
    icon: Share2,
  },
  {
    title: 'Verifiable certificate ID',
    description: 'Each completion record carries a distinct digital verification reference.',
    icon: ShieldCheck,
  },
  {
    title: 'Downloadable on completion',
    description: 'Students receive their certificate after successfully completing the course.',
    icon: Download,
  },
] as const;

export function CertificateShowcase() {
  return (
    <section aria-labelledby="certificate-heading" id="certificate">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-center">
        <VerifiedCertificate />
        <div>
          <h2 className="font-serif text-3xl font-semibold leading-tight text-brand-white md:text-5xl" id="certificate-heading">
            Achievement that remains verifiable.
          </h2>
          <p className="mt-4 text-lg font-extrabold leading-8 text-brand-gold" dir="rtl" lang="ar">
            شهادة موثوقة توثّق رحلة التفوق وتحتفظ بقيمتها.
          </p>
          <p className="mt-5 text-sm leading-7 text-brand-muted/80 md:text-base">
            Every completion certificate turns subject mastery into a polished,
            portable record for students and their families.
          </p>

          <div className="mt-8 space-y-4">
            {CERTIFICATE_BENEFITS.map((benefit) => {
              const Icon = benefit.icon;

              return (
                <article className="flex gap-4 border-t border-brand-border pt-4" key={benefit.title}>
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-surface text-brand-gold">
                    <Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
                  </span>
                  <div>
                    <h3 className="font-bold text-brand-white">{benefit.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-brand-muted/75">{benefit.description}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-gold">
            <CheckCircle2 aria-hidden="true" className="size-4" />
            Awarded after verified course completion
          </p>
        </div>
      </div>
    </section>
  );
}
