'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CommandSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Toggle with Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults([]);
    }
  }, [isOpen]);

  // Search logic
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setResults(data.results);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      setSelectedIndex(prev => (prev + 1) % (results.length || 1));
    } else if (e.key === 'ArrowUp') {
      setSelectedIndex(prev => (prev - 1 + results.length) % (results.length || 1));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleSelect(results[selectedIndex].href);
    }
  };

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all group lg:w-64"
      >
        <svg className="w-4 h-4 text-gray-500 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-300 hidden sm:block">Search Intelligence</span>
        <kbd className="ml-auto hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded border border-white/10 bg-black/40 text-[9px] font-bold text-gray-500 font-mono tracking-tighter">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[2rem] shadow-[0_0_80px_rgba(0,0,0,0.8)] overflow-hidden"
            >
              {/* Search Box */}
              <div className="flex items-center gap-4 px-6 py-5 border-b border-white/5 bg-black/20">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${loading ? 'animate-pulse bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-gray-400'}`}>
                  {loading ? '...' : '🔍'}
                </div>
                <input 
                  ref={inputRef}
                  placeholder="Subject, Module, or Asset..."
                  className="flex-1 bg-transparent border-none outline-none text-white text-lg font-bold placeholder:text-gray-700"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={onKeyDown}
                />
                <button onClick={() => setIsOpen(false)} className="text-gray-600 hover:text-white transition-colors">Esc</button>
              </div>

              {/* Results */}
              <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                {results.length > 0 ? (
                  <div className="space-y-1">
                    {results.map((result, idx) => (
                      <button
                        key={result.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => handleSelect(result.href)}
                        className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl border transition-all text-left ${
                          idx === selectedIndex 
                            ? 'bg-indigo-600 border-indigo-500 shadow-[0_10px_20px_-5px_rgba(99,102,241,0.4)]' 
                            : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${
                          idx === selectedIndex ? 'bg-white/20' : result.color ? `bg-gradient-to-br ${result.color}` : 'bg-white/5 border border-white/5'
                        }`}>
                          {result.type === 'subject' ? '📚' : result.type === 'lesson' ? '🧩' : '📄'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-50">{result.badge}</span>
                             {idx === selectedIndex && (
                               <motion.span layoutId="active-indicator" className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                             )}
                          </div>
                          <h4 className={`font-bold truncate ${idx === selectedIndex ? 'text-white' : 'text-gray-300'}`}>{result.title}</h4>
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-widest ${idx === selectedIndex ? 'text-white/60' : 'text-gray-600'}`}>Enter ↵</div>
                      </button>
                    ))}
                  </div>
                ) : query.length >= 2 ? (
                  <div className="py-20 text-center animate-in fade-in zoom-in-95">
                    <div className="text-4xl mb-4">🛸</div>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Neural Search yielded no matches</p>
                    <p className="text-sm text-gray-600 mt-2">Try a different coordinate or keyword.</p>
                  </div>
                ) : (
                  <div className="py-12 px-6">
                    <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest mb-6">Quick Filters</p>
                    <div className="grid grid-cols-2 gap-3">
                      {['Calculus', 'Physics', 'Biology', 'Chemistry'].map(t => (
                        <button key={t} onClick={() => setQuery(t)} className="px-4 py-3 bg-white/5 border border-white/5 rounded-xl text-left text-sm font-bold text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-black/40 border-t border-white/5 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-gray-600">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[8px]">↑↓</kbd> Navigate</span>
                  <span className="flex items-center gap-1.5"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 text-[8px]">↵</kbd> Select</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                  GLOBAL_SEARCH_REACTIVE
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
