import Image from 'next/image';
import Link from 'next/link';
import { LanguageToggle } from '@/components/i18n/language-provider';
import { siteConfig } from '@/config/site';

const navigation = [
  { href: '#curriculum', label: 'Curriculum', labelArabic: 'المناهج' },
  { href: '#faculty', label: 'Faculty', labelArabic: 'هيئة التدريس' },
  {
    href: '#live-schedule',
    label: 'Live Schedule',
    labelArabic: 'المحاضرات المباشرة',
  },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-950/10 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex min-h-20 w-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link
          aria-label="Oqool Academy home"
          className="flex min-w-0 items-center gap-3 rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
          href="/"
        >
          <Image
            alt="Oqool Academy crest"
            className="size-12 shrink-0 rounded-xl object-cover"
            height={48}
            priority
            src="/brand/oqool-logo.png"
            width={48}
          />
          <span className="hidden min-w-0 sm:block">
            <span className="block truncate text-sm font-black tracking-tight text-[#042D1A]">
              {siteConfig.name}
            </span>
            <span
              className="mt-0.5 block truncate font-arabic text-[11px] font-bold text-[#8C6B1B]"
              dir="rtl"
              lang="ar"
            >
              {siteConfig.nameArabic}
            </span>
          </span>
        </Link>

        <nav aria-label="Primary navigation" className="hidden items-center gap-7 lg:flex">
          {navigation.map((item) => (
            <a
              className="rounded-lg text-sm font-bold text-slate-600 outline-none hover:text-[#084B2B] focus-visible:ring-4 focus-visible:ring-emerald-100"
              href={item.href}
              key={item.href}
            >
              {item.label}{' '}
              <span className="font-arabic text-xs text-[#0F6E41]">
                {item.labelArabic}
              </span>
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle className="px-2 sm:px-3" />
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#D4AF37]/70 bg-[#084B2B] px-3 text-xs font-extrabold text-white outline-none hover:bg-[#0F6E41] focus-visible:ring-4 focus-visible:ring-emerald-200 sm:px-5 sm:text-sm"
            href="/lms/login"
          >
            Sign In <span className="mx-1 text-[#F3D878]">/</span> دخول المنصة
          </Link>
        </div>
      </div>

      <nav
        aria-label="Mobile primary navigation"
        className="mx-auto flex min-h-11 w-full max-w-full items-center gap-1 overflow-x-auto border-t border-emerald-950/10 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:hidden"
      >
        {navigation.map((item) => (
          <a
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg px-3 text-xs font-extrabold text-slate-600 hover:bg-[#FBF6E2] hover:text-[#084B2B]"
            href={item.href}
            key={item.href}
          >
            {item.label} · {item.labelArabic}
          </a>
        ))}
      </nav>
    </header>
  );
}
