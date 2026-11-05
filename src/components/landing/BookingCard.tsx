'use client';

import { useState } from 'react';
import { ConversionLink } from '@/components/landing/ConversionLink';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { useLanguage } from '@/components/i18n/language-provider';
import { landingContent } from '@/lib/landing/content';
import type { LocalizedText } from '@/lib/landing/types';
import { siteConfig } from '@/lib/siteConfig';

const booking = landingContent.booking;
const grades: readonly LocalizedText[] = Array.from({ length: 12 }, (_, index) => ({
  en: `Grade ${index + 1}`,
  ar: `الصف ${index + 1}`,
}));

const selectClass =
  'min-h-12 w-full rounded-xl border border-brand-mint-border bg-brand-ivory-alt px-3 text-sm font-bold text-brand-base outline-none focus-visible:ring-4 focus-visible:ring-brand-gold/30';

type FieldProps = {
  id: string;
  label: LocalizedText;
  onChange: (value: number) => void;
  options: readonly LocalizedText[];
  value: number;
};

function Field({ id, label, onChange, options, value }: FieldProps) {
  const { locale } = useLanguage();
  return (
    <div className="grid min-w-0 gap-1.5">
      <label className="text-xs font-black text-brand-base" htmlFor={id}>
        <LandingCopy>{label}</LandingCopy>
      </label>
      <select className={selectClass} id={id} onChange={(event) => onChange(Number(event.target.value))} value={value}>
        {options.map((option, index) => (
          <option key={option.en} value={index}>{option[locale]}</option>
        ))}
      </select>
    </div>
  );
}

export function BookingCard() {
  const { locale } = useLanguage();
  const [selection, setSelection] = useState({ grade: 0, curriculum: 0, subject: 0, goal: 0, time: 0 });
  const update = (key: keyof typeof selection) => (value: number) => setSelection((current) => ({ ...current, [key]: value }));

  const lines = locale === 'ar'
    ? [
        booking.message.ar,
        `الصف: ${grades[selection.grade].ar}`,
        `المنهج: ${booking.curricula[selection.curriculum].ar}`,
        `المادة: ${booking.subjects[selection.subject].ar}`,
        `الهدف: ${booking.goals[selection.goal].ar}`,
        `المواعيد: ${booking.timeOptions[selection.time].ar}`,
      ]
    : [
        booking.message.en,
        `Grade: ${grades[selection.grade].en}`,
        `Curriculum: ${booking.curricula[selection.curriculum].en}`,
        `Subject: ${booking.subjects[selection.subject].en}`,
        `Goal: ${booking.goals[selection.goal].en}`,
        `Times: ${booking.timeOptions[selection.time].en}`,
      ];
  const href = `https://wa.me/${siteConfig.whatsapp.number}?text=${encodeURIComponent(lines.join('\n'))}`;

  return (
    <form className="min-w-0 rounded-3xl border border-brand-mint-border bg-white p-5 text-start shadow-xl shadow-brand-base/10 sm:p-7" onSubmit={(event) => event.preventDefault()}>
      <LandingCopy as="h2" className="text-xl font-black text-brand-base sm:text-2xl">{booking.title}</LandingCopy>
      <LandingCopy as="p" className="mt-1 text-sm text-brand-surface/75">{booking.description}</LandingCopy>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Field id="booking-grade" label={booking.grade} onChange={update('grade')} options={grades} value={selection.grade} />
        <Field id="booking-curriculum" label={booking.curriculum} onChange={update('curriculum')} options={booking.curricula} value={selection.curriculum} />
        <Field id="booking-subject" label={booking.subject} onChange={update('subject')} options={booking.subjects} value={selection.subject} />
        <Field id="booking-goal" label={booking.goal} onChange={update('goal')} options={booking.goals} value={selection.goal} />
      </div>
      <div className="mt-3">
        <Field id="booking-times" label={booking.times} onChange={update('time')} options={booking.timeOptions} value={selection.time} />
      </div>
      <ConversionLink
        className="landing-cta mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-brand-gold px-6 text-sm font-black text-brand-base shadow-md shadow-brand-gold/20 outline-none transition-all duration-300 hover:-translate-y-1 hover:bg-brand-gold-hover focus-visible:ring-4 focus-visible:ring-brand-gold-hover/35"
        eventName="hero_free_lesson_click"
        href={href}
        label="hero_booking_form"
        newTab
        whatsapp
      >
        <LandingCopy>{booking.submit}</LandingCopy>
      </ConversionLink>
      <LandingCopy as="p" className="mt-3 text-center text-xs text-brand-surface/70">{booking.note}</LandingCopy>
    </form>
  );
}
