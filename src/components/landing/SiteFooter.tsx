import Image from 'next/image';
import Link from 'next/link';
import { Mail } from 'lucide-react';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { landingContent } from '@/lib/landing/content';
import { siteConfig } from '@/lib/siteConfig';

export function SiteFooter() {
  return (
    <footer className="bg-[#042D1A] pb-24 text-white md:pb-0" id="site-footer">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.35fr_0.65fr_0.65fr] lg:px-8">
        <div>
          <div className="flex items-center gap-4">
            <Image alt="Oqool Academy official crest" className="size-16 rounded-2xl object-cover" height={64} loading="lazy" sizes="64px" src={siteConfig.brand.logo} width={64} />
            <span>
              <span className="block text-lg font-black">{siteConfig.name}</span>
              <span className="mt-1 block font-arabic text-sm font-bold text-[#E7CD78]" dir="rtl" lang="ar">{siteConfig.arabicName}</span>
            </span>
          </div>
          <LandingCopy as="p" className="mt-5 max-w-md text-sm leading-7 text-emerald-100/70">{landingContent.footer.description}</LandingCopy>
          <a
            className="mt-5 inline-flex min-h-11 max-w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm text-emerald-50 outline-none hover:border-[#D4AF37]/50 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            href={`mailto:${siteConfig.support.email}`}
          >
            <Mail aria-hidden="true" className="size-4 shrink-0 text-[#E7CD78]" />
            <span className="min-w-0">
              <LandingCopy className="block text-[10px] font-black uppercase tracking-[0.14em] text-emerald-100/55">{{ en: 'Support email', ar: 'البريد الإلكتروني للدعم' }}</LandingCopy>
              <span className="block break-all font-bold text-white" dir="ltr">{siteConfig.support.email}</span>
            </span>
          </a>
        </div>

        <nav aria-label="Explore Oqool" className="flex flex-col items-start text-sm text-emerald-100/75">
          <LandingCopy className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#E7CD78]">{landingContent.footer.explore}</LandingCopy>
          {landingContent.navigation.map((item) => <Link className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#D4AF37]" href={`/${item.href}`} key={item.href}><LandingCopy>{item.label}</LandingCopy></Link>)}
        </nav>

        <nav aria-label="Oqool access and legal" className="flex flex-col items-start text-sm text-emerald-100/75">
          <LandingCopy className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#E7CD78]">{landingContent.footer.access}</LandingCopy>
          <Link className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#D4AF37]" href="/#curriculum"><LandingCopy>{{ en: 'Curriculum', ar: 'المناهج' }}</LandingCopy></Link>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            href={siteConfig.routes.support}
          >
            <LandingCopy>{{ en: 'Contact Us', ar: 'تواصل معنا' }}</LandingCopy>
          </Link>
          <a
            className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            href="https://docs.google.com/forms/d/e/1FAIpQLSczTjAyFpqxqcFvq2O7Hqmee8GN_6PvxsbEus61LdCiw7l9CA/viewform"
            rel="noopener noreferrer"
            target="_blank"
          >
            <LandingCopy>{{ en: 'Teach with Oqool', ar: 'انضم إلينا كمعلم' }}</LandingCopy>
          </a>
          <Link className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#D4AF37]" href={siteConfig.routes.privacy}><LandingCopy>{{ en: 'Privacy', ar: 'الخصوصية' }}</LandingCopy></Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#D4AF37]" href={siteConfig.routes.terms}><LandingCopy>{{ en: 'Terms', ar: 'الشروط' }}</LandingCopy></Link>
        </nav>
      </div>
      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-emerald-100/55">
        © {new Date().getFullYear()} {siteConfig.title}. <LandingCopy>{landingContent.footer.rights}</LandingCopy>
      </div>
    </footer>
  );
}
