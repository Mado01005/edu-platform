import Link from 'next/link';
import { OqoolEmblem } from '@/components/branding/OqoolBrand';
import { LanguageToggle } from '@/components/i18n/language-provider';

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
    <header className="sticky top-4 z-50 mx-auto mt-4 w-[calc(100%_-_1.5rem)] max-w-5xl">
      <div className="relative flex min-h-16 w-full items-center justify-between gap-2 rounded-full border border-emerald-900/10 bg-white/85 px-3 py-2 shadow-sm shadow-emerald-950/5 backdrop-blur-md sm:px-4 sm:py-3 lg:px-6">
        <Link
          aria-label="Oqool Academy home"
          className="flex size-11 shrink-0 items-center justify-center rounded-full outline-none transition-transform hover:scale-105 focus-visible:ring-4 focus-visible:ring-emerald-200"
          href="/"
        >
          <OqoolEmblem className="size-11" decorative />
        </Link>

        <nav
          aria-label="Primary navigation"
          className="absolute left-1/2 hidden -translate-x-1/2 items-center rounded-full bg-[#F4F6F2] p-1 md:flex"
        >
          {navigation.map((item) => (
            <a
              className="rounded-full px-3 py-2 text-xs font-extrabold text-slate-600 outline-none transition-colors hover:bg-white hover:text-[#084B2B] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-emerald-200 lg:px-4"
              href={item.href}
              key={item.href}
            >
              <span data-language-copy="en">{item.label}</span>
              <span className="font-arabic" data-language-copy="ar">{item.labelArabic}</span>
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageToggle className="min-h-11 rounded-full px-2 sm:px-3" />
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#084B2B] px-4 text-xs font-extrabold text-white outline-none transition-all duration-300 hover:bg-[#0F6E41] hover:shadow-md hover:shadow-emerald-900/15 focus-visible:ring-4 focus-visible:ring-emerald-200 sm:px-5 sm:text-sm"
            href="/lms/login"
          >
            <span data-language-copy="en">Sign In</span>
            <span className="font-arabic" data-language-copy="ar">دخول المنصة</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
