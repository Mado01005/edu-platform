'use client';

import { useState } from 'react';

interface SnippetToolProps {
  sourceTitle: string;
}

export default function SnippetTool({ sourceTitle }: SnippetToolProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = async () => {
    if (!content.trim()) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/user/snippets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          source_title: sourceTitle,
          page_number: null // Optional enhancement later
        })
      });
      if (res.ok) {
        setMessage('Snippet saved to Notebook!');
        setTimeout(() => {
          setIsOpen(false);
          setContent('');
          setMessage('');
        }, 1500);
      } else {
        setMessage('Failed to save');
      }
    } catch (err) {
      setMessage('Error saving snippet');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 translate-y-0 animate-in slide-in-from-bottom-10 duration-500">
      {isOpen && (
        <div className="w-[300px] md:w-[400px] bg-[#0A0A0F] border border-white/10 rounded-[2rem] p-6 shadow-3xl backdrop-blur-xl animate-in fade-in scale-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Pro Snippet Capture</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">✕</button>
          </div>
          
          <div className="mb-4">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mb-2">Context: {sourceTitle}</p>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste text selection or type a quick insight..."
              className="w-full bg-black border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none min-h-[150px] font-medium"
            />
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={handleSave}
              disabled={isSaving || !content.trim()}
              className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95"
            >
              {isSaving ? 'Capturing...' : 'Save to Notebook'}
            </button>
          </div>

          {message && (
            <p className="mt-3 text-center text-[10px] font-bold text-indigo-400 animate-pulse">{message}</p>
          )}
        </div>
      )}
      
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all duration-500 shadow-2xl ${isOpen ? 'bg-white text-black scale-90' : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-110 shadow-indigo-600/30'}`}
      >
        {isOpen ? '✕' : '✨'}
        {!isOpen && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 border border-white/20"></span>
          </span>
        )}
      </button>
    </div>
  );
}
