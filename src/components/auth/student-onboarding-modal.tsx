'use client';

import type { GradeLevel } from '@prisma/client';
import { GraduationCap, Loader2, MapPin, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { PhoneInput } from '@/components/UI/phone-input';

const grades = Array.from({ length: 12 }, (_, index) => `GRADE_${index + 1}` as GradeLevel);

export type StudentOnboardingProfile = {
  city: string | null;
  governorate: string | null;
  gradeLevel: GradeLevel | null;
  name: string | null;
  onboardingCompletedAt: Date | string | null;
  parentPhone: string | null;
};

export function StudentOnboardingModal({ profile }: { profile: StudentOnboardingProfile }) {
  const router = useRouter();
  const [name, setName] = useState(profile.name === 'New Student' ? '' : profile.name ?? '');
  const [gradeLevel, setGradeLevel] = useState<GradeLevel | ''>(profile.gradeLevel ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [governorate, setGovernorate] = useState(profile.governorate ?? '');
  const [parentPhone, setParentPhone] = useState(profile.parentPhone ?? '');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  if (profile.onboardingCompletedAt) return null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError('');
    try {
      const response = await fetch('/api/lms/onboarding', {
        body: JSON.stringify({ city, governorate, gradeLevel, name, parentPhone }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to save the student profile.');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save the student profile.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div aria-labelledby="student-onboarding-title" aria-modal="true" className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-[#042D1A]/70 p-3 backdrop-blur-sm sm:items-center" role="dialog">
      <form className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg min-w-0 flex-col overflow-y-auto rounded-2xl border border-[#D4AF37]/55 bg-white p-5 text-[#1A2E22] sm:p-6" onSubmit={save}>
        <span className="flex size-12 items-center justify-center rounded-2xl bg-[#084B2B] text-white"><GraduationCap aria-hidden="true" className="size-6" /></span>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-[#0F6E41]">Required student onboarding · إعداد حساب الطالب</p>
        <h2 className="mt-2 text-2xl font-black" id="student-onboarding-title">Tell us where your learning starts.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">These details personalize the curriculum and connect read-only family progress. You only complete this once.</p>

        <div className="mt-5 grid min-w-0 gap-4">
          <label className="text-sm font-bold">Full legal student name
            <input autoComplete="name" className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-emerald-950/15 bg-white px-4 outline-none focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" maxLength={160} onChange={(event) => setName(event.target.value)} required value={name} />
          </label>
          <label className="text-sm font-bold">Academic grade level
            <select className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-emerald-950/15 bg-white px-4 outline-none focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" onChange={(event) => setGradeLevel(event.target.value as GradeLevel)} required value={gradeLevel}>
              <option value="">Choose grade</option>
              {grades.map((grade, index) => <option key={grade} value={grade}>Grade {index + 1}{index >= 9 ? ` · ${index === 9 ? '1st' : index === 10 ? '2nd' : '3rd'} Secondary` : ''}</option>)}
            </select>
          </label>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">City
              <span className="mt-2 flex min-w-0 items-center gap-2 rounded-xl border border-emerald-950/15 px-3 focus-within:border-[#084B2B] focus-within:ring-4 focus-within:ring-emerald-100"><MapPin aria-hidden="true" className="size-4 shrink-0 text-slate-400" /><input className="min-h-12 min-w-0 flex-1 outline-none" maxLength={100} onChange={(event) => setCity(event.target.value)} required value={city} /></span>
            </label>
            <label className="text-sm font-bold">Governorate / Region
              <input className="mt-2 min-h-12 w-full min-w-0 rounded-xl border border-emerald-950/15 px-4 outline-none focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" maxLength={100} onChange={(event) => setGovernorate(event.target.value)} required value={governorate} />
            </label>
          </div>
          <label className="text-sm font-bold">Parent mobile number
            <span className="mt-2 block"><PhoneInput id="student-parent-phone" onChange={setParentPhone} required value={parentPhone} /></span>
          </label>
        </div>

        {error ? <p aria-live="polite" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
        <button className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#084B2B] px-4 text-sm font-extrabold text-white hover:bg-[#0F6E41] disabled:cursor-not-allowed disabled:opacity-60" disabled={pending} type="submit">
          {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <ShieldCheck aria-hidden="true" className="size-4" />}
          {pending ? 'Saving profile…' : 'Save profile and continue'}
        </button>
      </form>
    </div>
  );
}
