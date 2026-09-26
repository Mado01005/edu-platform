import Link from 'next/link';
import Image from 'next/image';
import { Mail } from 'lucide-react';
import { LandingCopy } from '@/components/landing/LandingCopy';
import { SocialLinks } from '@/components/social/SocialLinks';
import { landingContent } from '@/lib/landing/content';
import { siteConfig } from '@/lib/siteConfig';

export function SiteFooter() {
  return (
    <footer className="bg-brand-base pb-24 text-brand-white md:pb-0" id="site-footer">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.35fr_0.65fr_0.65fr] lg:px-8">
        <div>
          <Link className="group inline-flex min-h-12 max-w-full items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-brand-gold" href={siteConfig.routes.home}>
            <Image
              alt=""
              className="h-12 w-12 shrink-0 object-contain transition-transform duration-300 group-hover:scale-105"
              height={48}
              src={siteConfig.brand.logo}
              width={48}
            />
            <span className="flex min-w-0 flex-col">
              <span className="text-xl font-bold tracking-tight text-brand-white transition-colors group-hover:text-brand-gold">
                {siteConfig.name}
              </span>
              <span className="font-arabic text-xs font-medium text-brand-sage" dir="rtl">
                {siteConfig.arabicName}
              </span>
            </span>
          </Link>
          <LandingCopy as="p" className="mt-5 max-w-md text-sm leading-7 text-brand-muted/70">{landingContent.footer.description}</LandingCopy>
          <SocialLinks className="mt-5" />
          <a
            className="mt-5 inline-flex min-h-11 max-w-full items-center gap-3 rounded-xl border border-brand-border bg-brand-surface px-3.5 py-2 text-sm text-brand-muted outline-none hover:border-brand-gold hover:text-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold"
            href={`mailto:${siteConfig.support.email}`}
          >
            <Mail aria-hidden="true" className="size-4 shrink-0 text-brand-gold" />
            <span className="min-w-0">
              <LandingCopy className="block text-[10px] font-black uppercase tracking-[0.14em] text-brand-muted/55">{{ en: 'Support email', ar: 'البريد الإلكتروني للدعم' }}</LandingCopy>
              <span className="block break-all font-bold text-brand-white" dir="ltr">{siteConfig.support.email}</span>
            </span>
          </a>
        </div>

        <nav aria-label="Explore Nodrek" className="flex flex-col items-start text-sm text-brand-muted/75">
          <LandingCopy className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-brand-gold">{landingContent.footer.explore}</LandingCopy>
          {landingContent.navigation.map((item) => <Link className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold" href={`/${item.href}`} key={item.href}><LandingCopy>{item.label}</LandingCopy></Link>)}
        </nav>

        <nav aria-label="Nodrek access and legal" className="flex flex-col items-start text-sm text-brand-muted/75">
          <LandingCopy className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-brand-gold">{landingContent.footer.access}</LandingCopy>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold"
            href={siteConfig.routes.support}
          >
            <LandingCopy>{{ en: 'Contact Us', ar: 'تواصل معنا' }}</LandingCopy>
          </Link>
          <a
            className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold"
            href="https://docs.google.com/forms/d/e/1FAIpQLSczTjAyFpqxqcFvq2O7Hqmee8GN_6PvxsbEus61LdCiw7l9CA/viewform"
            rel="noopener noreferrer"
            target="_blank"
          >
            <LandingCopy>{{ en: 'Teach with Nodrek', ar: 'انضم إلينا كمعلم' }}</LandingCopy>
          </a>
          <Link className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold" href={siteConfig.routes.privacy}><LandingCopy>{{ en: 'Privacy', ar: 'الخصوصية' }}</LandingCopy></Link>
          <Link className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-brand-gold focus-visible:ring-2 focus-visible:ring-brand-gold" href={siteConfig.routes.terms}><LandingCopy>{{ en: 'Terms', ar: 'الشروط' }}</LandingCopy></Link>
        </nav>
      </div>
      <div className="border-t border-brand-border px-4 py-5 text-center text-xs text-brand-muted/55">
        {siteConfig.copyright}
      </div>
    </footer>
  );
}
