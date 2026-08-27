import {
  Atom,
  BadgeCheck,
  Calculator,
  CircleCheck,
  Laptop,
  MessageCircle,
  Play,
  RefreshCw,
  Sigma,
  Smartphone,
  TrendingUp,
} from 'lucide-react';

const tutors = [
  { initials: 'AS', name: 'Ahmed Samir', subject: 'Physics' },
  { initials: 'RN', name: 'Reem Nasser', subject: 'Pure Math' },
  { initials: 'MK', name: 'Maha Khaled', subject: 'Chemistry' },
] as const;

export function PillarsGrid() {
  return (
    <section className="py-20 md:py-28">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0F6E41]">
            One connected learning system
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-[#1A2E22] sm:text-5xl">
            Everything a student needs, arranged around progress.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Lessons, practice, family visibility, and expert support work together—without the usual tutoring clutter.
          </p>
        </div>

        <div className="mt-12 grid min-w-0 gap-4 lg:grid-cols-3 lg:grid-rows-2">
          <article className="landing-card group relative min-h-[23rem] overflow-hidden rounded-3xl border border-emerald-950/5 bg-[#084B2B] p-6 text-white hover:-translate-y-1 hover:shadow-lg lg:col-span-2 sm:p-8">
            <div aria-hidden="true" className="absolute -right-16 -top-16 size-56 rounded-full border border-white/10" />
            <div className="relative grid h-full min-w-0 gap-7 md:grid-cols-[0.72fr_1.28fr] md:items-center">
              <div>
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/10 text-[#F3D878]"><Play aria-hidden="true" className="size-5 fill-current" /></span>
                <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-100/65">Learn · solve · master</p>
                <h3 className="mt-2 text-2xl font-black sm:text-3xl">Smart Interactive LMS</h3>
                <p className="mt-3 max-w-sm text-sm leading-6 text-emerald-100/75">Move from an expert video explanation into guided KaTeX steps without losing context.</p>
              </div>

              <div className="min-w-0 rounded-3xl border border-white/10 bg-white/[0.08] p-3 backdrop-blur-sm">
                <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#042D1A] p-4">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(212,175,55,0.18),transparent_38%)]" />
                  <div className="relative flex h-full flex-col justify-between">
                    <div className="flex items-center justify-between"><span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-black">NEWTON’S LAWS</span><span className="text-[9px] font-bold text-emerald-100/60">12:48 / 24:00</span></div>
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-white text-[#084B2B] shadow-lg"><Play aria-hidden="true" className="ml-0.5 size-5 fill-current" /></span>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[62%] rounded-full bg-[#D4AF37]" /></div>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white p-3 text-[#1A2E22]"><p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wide text-[#0F6E41]"><Sigma className="size-3" /> Step-by-step solver</p><p className="mt-2 font-mono text-sm font-black">F = m × a</p></div>
                  <div className="rounded-2xl bg-[#FBF6E2] p-3 text-[#1A2E22]"><p className="text-[9px] font-black uppercase tracking-wide text-[#A68020]">Mastery check</p><p className="mt-2 flex items-center gap-2 text-sm font-black"><CircleCheck className="size-4 text-[#0F6E41]" /> 8 / 10 correct</p></div>
                </div>
              </div>
            </div>
            </article>

          <article className="landing-card group relative min-h-[30rem] overflow-hidden rounded-3xl border border-emerald-950/5 bg-white p-6 hover:-translate-y-1 hover:shadow-lg lg:row-span-2 sm:p-7">
            <div className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#084B2B]"><MessageCircle aria-hidden="true" className="size-5" /></span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black text-emerald-700">LIVE</span></div>
            <p className="mt-7 text-[10px] font-black uppercase tracking-[0.2em] text-[#0F6E41]">Family visibility</p>
            <h3 className="mt-2 text-2xl font-black text-[#1A2E22]">Parent Tracking</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">Clear signals replace end-of-term surprises.</p>

            <div className="mt-7 rounded-3xl bg-[#F7F8F4] p-4">
              <div className="rounded-2xl bg-[#DCF7E6] p-4 shadow-sm">
                <p className="flex items-center gap-2 text-[10px] font-black text-emerald-800"><MessageCircle className="size-3.5" /> WhatsApp · Oqool Academy</p>
                <p className="mt-3 text-xs font-bold leading-5 text-[#1A2E22]">Mariam completed Physics Module 4 with a 92% quiz score.</p>
                <p className="mt-2 text-right text-[9px] text-slate-500">7:42 PM ✓✓</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-emerald-950/5 bg-white p-3 shadow-sm"><TrendingUp className="size-4 text-[#0F6E41]" /><p className="mt-4 text-xl font-black text-[#1A2E22]">+18%</p><p className="text-[10px] font-bold text-slate-500">Weekly progress</p></div>
              <div className="rounded-2xl border border-emerald-950/5 bg-white p-3 shadow-sm"><CircleCheck className="size-4 text-[#D4AF37]" /><p className="mt-4 text-xl font-black text-[#1A2E22]">94%</p><p className="text-[10px] font-bold text-slate-500">Live attendance</p></div>
            </div>
          </article>

          <div className="grid min-w-0 gap-4 lg:col-span-2 sm:grid-cols-[0.82fr_1.18fr]">
            <article className="landing-card group rounded-3xl border border-emerald-950/5 bg-[#FBF6E2] p-6 hover:-translate-y-1 hover:shadow-lg">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#A68020] shadow-sm"><RefreshCw aria-hidden="true" className="size-5" /></span>
              <h3 className="mt-6 text-xl font-black text-[#1A2E22]">2-Device Instant Sync</h3>
              <p className="mt-2 text-xs leading-5 text-slate-600">Start on your laptop. Continue on mobile. Your oldest third-device session retires automatically.</p>
              <div className="mt-7 flex items-center justify-center gap-3 text-[#084B2B]"><Laptop aria-hidden="true" className="size-12" /><span className="h-px w-8 border-t border-dashed border-[#D4AF37]" /><Smartphone aria-hidden="true" className="size-9" /></div>
            </article>

            <article className="landing-card group rounded-3xl border border-emerald-950/5 bg-white p-6 hover:-translate-y-1 hover:shadow-lg">
              <div className="flex items-center justify-between gap-3"><span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-[#084B2B]"><Atom aria-hidden="true" className="size-5" /></span><span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0F6E41]">Egypt · KSA</span></div>
              <h3 className="mt-5 text-xl font-black text-[#1A2E22]">Expert Egyptian &amp; KSA Tutors</h3>
              <div className="mt-5 space-y-2">
                {tutors.map((tutor, index) => (
                  <div className="flex min-w-0 items-center gap-3 rounded-2xl bg-[#F7F8F4] p-2.5" key={tutor.name}>
                    <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[9px] font-black ${index === 1 ? 'bg-[#FBF6E2] text-[#A68020]' : 'bg-[#084B2B] text-white'}`}>{tutor.initials}</span>
                    <span className="min-w-0 flex-1"><span className="flex items-center gap-1 truncate text-xs font-black text-[#1A2E22]">{tutor.name}<BadgeCheck className="size-3.5 shrink-0 text-[#0F6E41]" /></span><span className="block text-[9px] font-bold text-slate-500">{tutor.subject}</span></span>
                    {index === 0 ? <Calculator aria-hidden="true" className="size-4 text-[#D4AF37]" /> : null}
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
