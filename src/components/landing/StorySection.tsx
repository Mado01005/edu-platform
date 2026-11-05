import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';

export function StorySection() {
  const story = landingContent.story;
  return (
    <section className="scroll-mt-28 bg-brand-ivory py-20 text-brand-base md:py-28" id="our-story">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <LandingCopy className="text-xs font-black uppercase tracking-[0.18em] text-brand-gold-bronze">{story.eyebrow}</LandingCopy>
          <LandingCopy as="h2" className="mt-4 text-balance text-3xl font-black tracking-tight sm:text-4xl">{story.title}</LandingCopy>
        </div>
        <div className="mt-10 grid gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="grid gap-5">
            {story.paragraphs.map((paragraph) => (
              <LandingCopy as="p" className="text-base leading-8 text-brand-surface/85" key={paragraph.en}>{paragraph}</LandingCopy>
            ))}
          </div>
          <blockquote className="flex min-w-0 items-center rounded-3xl border border-brand-rim bg-brand-surface p-8 text-brand-white shadow-xl shadow-brand-base/10 sm:p-10">
            <LandingCopy as="p" className="text-balance text-2xl font-black leading-snug text-brand-gold sm:text-3xl">{story.quote}</LandingCopy>
          </blockquote>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {[story.vision, story.mission].map((item) => (
            <div className="landing-card min-w-0 rounded-3xl border border-brand-mint-border bg-white p-6 shadow-sm sm:p-8" key={item.label.en}>
              <LandingCopy as="h3" className="text-sm font-black uppercase tracking-[0.14em] text-brand-gold-bronze">{item.label}</LandingCopy>
              <LandingCopy as="p" className="mt-3 text-base leading-8 text-brand-surface/85">{item.body}</LandingCopy>
            </div>
          ))}
        </div>
        <LandingCopy as="p" className="mt-10 text-center text-lg font-black text-brand-base sm:text-xl">{story.closing}</LandingCopy>
      </div>
    </section>
  );
}
