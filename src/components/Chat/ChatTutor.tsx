'use client';

import { useChat } from 'ai/react';
import { useEffect, useRef } from 'react';

export default function ChatTutor() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: '/api/chat',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto rounded-3xl bg-black/40 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
          <h2 className="text-sm font-bold text-white tracking-widest uppercase">EduPortal AI Tutor</h2>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <p className="text-sm font-medium text-white mb-2">How can I help you study today?</p>
            <p className="text-xs text-gray-400 max-w-sm">Ask me any question about your courses, homework, or general concepts.</p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-lg backdrop-blur-md ${
                  m.role === 'user'
                    ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/30'
                    : 'bg-white/5 text-gray-200 border border-white/10'
                }`}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-black/50 border-t border-white/10 z-10">
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            className="w-full bg-white/5 border border-white/10 rounded-full pl-6 pr-14 py-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 shadow-inner backdrop-blur-sm transition-all"
            value={input}
            placeholder="Type your question..."
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="absolute right-2 p-2.5 rounded-full bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 disabled:hover:bg-indigo-500 text-white transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)]"
            aria-label="Send message"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
