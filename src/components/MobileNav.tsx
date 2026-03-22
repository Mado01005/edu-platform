'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileNavProps {
  isAdmin?: boolean;
}

export default function MobileNav({ isAdmin }: MobileNavProps) {
  const pathname = usePathname();

  const tabs = [
    { href: '/dashboard', label: 'Home', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
    )},
    { href: '/profile', label: 'Progress', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
    )},
    ...(isAdmin ? [{ href: '/admin', label: 'Admin', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    )}] : []),
  ];

  // Don't show on login, banned, or admin pages (admin has its own nav)
  if (pathname === '/login' || pathname === '/banned') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] sm:hidden">
      <div className="bg-[#0A0A0F]/95 backdrop-blur-xl border-t border-white/10 px-2 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          {tabs.map(tab => {
            const isActive = pathname === tab.href || (tab.href !== '/dashboard' && pathname?.startsWith(tab.href));
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'text-indigo-400 scale-110'
                    : 'text-gray-500 hover:text-gray-300 active:scale-95'
                }`}
              >
                <div className={`relative ${isActive ? 'drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]' : ''}`}>
                  {tab.icon}
                  {isActive && (
                    <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]"></span>
                  )}
                </div>
                <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
