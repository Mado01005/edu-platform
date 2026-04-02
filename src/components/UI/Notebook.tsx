'use client';

import { useState, useEffect } from 'react';

interface Snippet {
  id: string;
  content: string;
  source_title: string;
  created_at: string;
}

export default function Notebook() {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSnippets = async () => {
    try {
      const res = await fetch('/api/user/snippets');
      if (res.ok) {
        const data = await res.json();
        setSnippets(data);
      }
    } catch (err) {
      console.error('Failed to fetch snippets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSnippets();
  }, []);

  const deleteSnippet = async (id: string) => {
    if (!confirm('Permanent deletion of this insight?')) return;
    try {
      const res = await fetch('/api/user/snippets', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setSnippets(prev => prev.filter(s => s.id !== id));
      }
    } catch (err) {
      alert('Failed to delete');
    }
  };

  if (loading) return <div className="space-y-4 animate-pulse">
    {[1, 2, 3].map(i => <div key={i} className="h-32 bg-white/5 rounded-3xl border border-white/5"></div>)}
  </div>;

  return (
    <div className="space-y-6">
      {snippets.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-[3rem]">
          <div className="text-4xl mb-4 opacity-20">📓</div>
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Your Notebook is empty</p>
          <p className="text-[10px] text-gray-700 mt-2 uppercase tracking-tight">Capture snippets while browsing lessons to build your knowledge base.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {snippets.map((snippet) => (
            <div key={snippet.id} className="group relative bg-[#0A0A0F] border border-white/10 rounded-[2.5rem] p-8 hover:border-indigo-500/30 transition-all duration-700">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] pointer-events-none group-hover:bg-indigo-500/10 transition"></div>
               
               <div className="flex justify-between items-start mb-6">
                 <div>
                   <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">{snippet.source_title}</p>
                   <p className="text-[8px] text-gray-700 font-bold uppercase tracking-tight">{new Date(snippet.created_at).toLocaleDateString()}</p>
                 </div>
                 <button onClick={() => deleteSnippet(snippet.id)} className="p-3 bg-red-500/5 hover:bg-red-500/20 text-red-500/40 hover:text-red-500 border border-white/5 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
               </div>

               <p className="text-gray-300 text-sm leading-relaxed font-medium italic border-l-2 border-indigo-500/20 pl-4">
                 “{snippet.content}”
               </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
