import Image from 'next/image';
import Link from 'next/link';
import { MessageCircle } from 'lucide-react';
import { siteConfig } from '@/config/site';

export function Footer() {
  return (
    <footer className="bg-[#042D1A] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.35fr_0.65fr_0.7fr_0.8fr] lg:px-8">
        <div>
          <div className="flex items-center gap-4">
            <Image
              alt="Oqool Academy official logo"
              className="size-16 rounded-2xl object-cover"
              height={64}
              src="/brand/oqool-logo.png"
              width={64}
            />
            <span>
              <span className="block text-lg font-black">{siteConfig.name}</span>
              <span className="mt-1 block font-arabic text-sm font-bold text-[#F3D878]" dir="rtl" lang="ar">
                {siteConfig.nameArabic}
              </span>
            </span>
          </div>
          <p className="mt-5 max-w-md text-sm leading-7 text-emerald-100/70">
            Structured learning, expert teaching, and real progress for every
            student and family.
          </p>
        </div>

        <nav aria-label="Explore Oqool" className="flex flex-col items-start gap-1 text-sm text-emerald-100/75">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F3D878]">Explore</p>
          <a className="inline-flex min-h-11 items-center hover:text-white" href="#why-oqool">Why Oqool</a>
          <a className="inline-flex min-h-11 items-center hover:text-white" href="#how-it-works">How it works</a>
          <a className="inline-flex min-h-11 items-center hover:text-white" href="#curriculum">Curriculum</a>
        </nav>

        <nav aria-label="Oqool access and legal" className="flex flex-col items-start gap-1 text-sm text-emerald-100/75">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#F3D878]">Access</p>
          <Link className="inline-flex min-h-11 items-center hover:text-white" href="/catalog">Course catalog</Link>
          <Link className="inline-flex min-h-11 items-center hover:text-white" href="/lms/login">Student sign in</Link>
          <Link className="inline-flex min-h-11 items-center hover:text-white" href="/privacy">Privacy · الخصوصية</Link>
          <Link className="inline-flex min-h-11 items-center hover:text-white" href="/terms">Terms · الشروط</Link>
        </nav>

        <div>
          <p className="mb-4 text-[10px] font-black uppercase tracking-[0.18em] text-[#F3D878]">Support</p>
          <a
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D4AF37]/45 px-4 text-sm font-extrabold text-[#F3D878] hover:bg-white/5"
            href={siteConfig.support.whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <MessageCircle aria-hidden="true" className="size-4" /> WhatsApp support
          </a>
          <a className="mt-3 inline-flex min-h-11 items-center text-sm text-emerald-100/70 hover:text-white" href={`mailto:${siteConfig.support.email}`}>
            {siteConfig.support.email}
          </a>
        </div>
      </div>
      <div className="border-t border-[#D4AF37]/20 px-4 py-5 text-center text-xs text-emerald-100/55">
        © {new Date().getFullYear()} {siteConfig.title}. All rights reserved.
      </div>
    </footer>
  );
}
