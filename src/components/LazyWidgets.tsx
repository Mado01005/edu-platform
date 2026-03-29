'use client';

import dynamic from 'next/dynamic';

// Lazy-loaded non-critical UI widgets — only fetched after initial page render
export const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), { ssr: false });
export const KeyboardShortcuts = dynamic(() => import('@/components/KeyboardShortcuts'), { ssr: false });
export const StudyTimer = dynamic(() => import('@/components/StudyTimer'), { ssr: false });
export const MobileNav = dynamic(() => import('@/components/MobileNav'), { ssr: false });
export const MusicPlayer = dynamic(() => import('@/components/MusicPlayer'), { ssr: false });
