'use client';

import { useState } from 'react';

export default function SupportTicketModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !body) return;
    
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          subject, 
          body 
        })
      });

      if (!res.ok) throw new Error('Failed to dispatch support ticket.');
      
      setStatus('success');
      setTimeout(() => {
        setIsOpen(false);
        setSubject('');
        setBody('');
        setStatus('idle');
      }, 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="group fixed bottom-6 right-6 z-40 flex items-center justify-center rounded-full bg-sky-600 p-4 text-white shadow-md transition hover:bg-sky-700"
        title="Contact Instructor"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 fade-in">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl scale-in">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-5">
              <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-900">
                <svg className="h-5 w-5 text-sky-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Secure Support Ticket
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {status === 'success' ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">Dispatched!</h3>
                  <p className="text-sm text-slate-600">Your secure message has been routed to the instructor&apos;s private inbox.</p>
                </div>
              ) : (
                <>
                  <p className="mb-2 text-sm text-slate-600">Send a direct message to your instructor. Replies will appear in your notification feed.</p>
                  
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">Topic / Subject</label>
                    <input 
                      type="text" 
                      required
                      maxLength={200}
                      placeholder="e.g. Question about Physics Chapter 3"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      disabled={sending}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-600">Your Message</label>
                    <textarea 
                      required
                      maxLength={5000}
                      placeholder="Explain what you need help with..."
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      className="min-h-[120px] w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
                      disabled={sending}
                    />
                  </div>

                  {status === 'error' && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
                      Connection failed. Please try again.
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={sending || !subject || !body}
                    className="mt-2 w-full rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {sending ? 'Encrypting & Dispatching...' : 'Send Secure Message'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
