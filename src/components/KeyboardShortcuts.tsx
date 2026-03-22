'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Global Keyboard Shortcuts:
 *  M  — Mark current lesson as complete (clicks the CompleteButton)
 *  S  — Focus the search bar (if one exists)
 *  ?  — Show shortcut help overlay
 */
export default function KeyboardShortcuts() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore when typing in inputs, textareas, or contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable) return;

      const key = e.key.toLowerCase();

      // M → Click the complete button
      if (key === 'm' && !e.metaKey && !e.ctrlKey) {
        const completeBtn = document.getElementById('complete-lesson-btn');
        if (completeBtn) {
          completeBtn.click();
          // Visual feedback
          completeBtn.classList.add('scale-110');
          setTimeout(() => completeBtn.classList.remove('scale-110'), 300);
        }
      }

      // S → Focus search bar
      if (key === 's' && !e.metaKey && !e.ctrlKey) {
        const searchInput = document.getElementById('global-search');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }

      // ArrowLeft → Go back (browser history)
      if (key === 'arrowleft' && e.altKey) {
        router.back();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, pathname]);

  return null; // Headless component
}
