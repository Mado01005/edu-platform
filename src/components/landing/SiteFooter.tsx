import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { WhatsAppLink } from '@/components/landing/ConversionLink';
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
        </div>

        <nav aria-label="Explore Oqool" className="flex flex-col items-start text-sm text-emerald-100/75">
          <LandingCopy className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#E7CD78]">{landingContent.footer.explore}</LandingCopy>
          {landingContent.navigation.map((item) => <a className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#D4AF37]" href={item.href} key={item.href}><LandingCopy>{item.label}</LandingCopy></a>)}
        </nav>

        <nav aria-label="Oqool access and legal" className="flex flex-col items-start text-sm text-emerald-100/75">
          <LandingCopy className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-[#E7CD78]">{landingContent.footer.access}</LandingCopy>
          <a className="inline-flex min-h-11 items-center rounded-lg outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#D4AF37]" href="#curriculum"><LandingCopy>{{ en: 'Curriculum', ar: 'المناهج' }}</LandingCopy></a>
          <WhatsAppLink
            before={<MessageCircle aria-hidden="true" className="size-4 shrink-0 text-[#E7CD78]" />}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-[#D4AF37]"
            eventName="contact_whatsapp_click"
            intent="support"
            label="footer_contact"
          >
            {{ en: 'Contact Us', ar: 'تواصل معنا' }}
          </WhatsAppLink>
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
