'use client';

import React, { useEffect, useState } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Snippet {
  id: string;
  lesson_id: string;
  user_id: string;
  language_type: string;
  raw_content: string;
  created_at: string;
  users?: {
    full_name?: string;
    email?: string;
  };
}

interface ForgeSnippetsProps {
  lessonId: string;
}

export default function ForgeSnippets({ lessonId }: ForgeSnippetsProps) {
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const supabase = createClientComponentClient();

  useEffect(() => {
    // 1. Fetch initial snippets for this lesson
    const fetchSnippets = async () => {
      const { data, error } = await supabase
        .from('snippets')
        .select('*, users:user_id(email, full_name)')
        .eq('lesson_id', lessonId)
        .order('created_at', { ascending: false });

      if (data && !error) {
        // Safe mapping since auth.users might not always have full_name via foreign key depending on mapping
        setSnippets(data);
      }
    };
    
    fetchSnippets();

    // 2. Subscribe to realtime updates for THIS lesson_id
    const channel = supabase.channel(`forge-${lessonId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'snippets',
          filter: `lesson_id=eq.${lessonId}`
        },
        async (payload) => {
          const newSnippetRaw = payload.new as Snippet;
          
          // Optionally fetch the user data if needed here, but NextAuth users might be tricky.
          // Let's just append it.
          const { data: userLink } = await supabase
            .from('snippets')
            .select('*, users:user_id(email, full_name)')
            .eq('id', newSnippetRaw.id)
            .single();

          if (userLink) {
             setSnippets(prev => [userLink as Snippet, ...prev]);
          } else {
             setSnippets(prev => [newSnippetRaw, ...prev]);
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [lessonId, supabase]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  if (snippets.length === 0) return null;

  return (
    <div className="mt-12 space-y-6">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <h3 className="text-xl font-black text-white uppercase tracking-widest"><span className="text-indigo-500">⚡</span> The Forge Transmissions</h3>
        <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase rounded-full tracking-widest border border-indigo-500/30">Live</span>
      </div>

      <div className="space-y-8">
        {snippets.map((snippet) => (
          <div key={snippet.id} className="group bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm transition-all hover:border-indigo-500/50 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center px-4 py-3 border-b border-white/5 bg-white-[0.02]">
               <div className="flex items-center gap-3">
                 <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded">
                   {snippet.language_type}
                 </span>
                 <span className="text-[10px] text-gray-500 font-medium">
                   {new Date(snippet.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                 </span>
               </div>
               <button 
                 onClick={() => copyToClipboard(snippet.raw_content)}
                 className="text-gray-500 hover:text-white transition-colors group-hover:opacity-100 opacity-50"
                 title="Copy to clipboard"
               >
                 <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
               </button>
            </div>
            <div className="text-sm">
               <SyntaxHighlighter
                 language={snippet.language_type === 'latex' ? 'markdown' : snippet.language_type}
                 style={vscDarkPlus}
                 customStyle={{ margin: 0, padding: '1.5rem', background: 'transparent', fontSize: '13px' }}
                 wrapLines={true}
               >
                 {snippet.raw_content}
               </SyntaxHighlighter>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
