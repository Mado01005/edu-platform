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
          receiver_email: 'admin', // The Admin inbox inherently fetches all system messages globally
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
        className="fixed bottom-6 right-6 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white p-4 rounded-full shadow-2xl hover:shadow-indigo-500/50 transition-all duration-300 z-40 group flex items-center justify-center hover:scale-105"
        title="Contact Instructor"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in">
          <div className="bg-[#0A0A0B] border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col scale-in">
            <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                Secure Support Ticket
              </h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full flex items-center justify-center transition"
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
                  <h3 className="text-xl font-bold text-white">Dispatched!</h3>
                  <p className="text-gray-400 text-sm">Your secure message has been routed to the instructor's private inbox. You will see their reply here upon your next login.</p>
                </div>
              ) : (
                <>
                  <p className="text-sm text-gray-400 mb-2">Send a direct message to your instructor. Replies will appear in your notification feed.</p>
                  
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Topic / Subject</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Question about Physics Chapter 3"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      disabled={sending}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Your Message</label>
                    <textarea 
                      required
                      placeholder="Explain what you need help with..."
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      className="w-full bg-[#1A1A1E] border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[120px] resize-y"
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
                    className="w-full bg-white text-black font-semibold py-3 px-6 rounded-xl hover:bg-gray-200 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
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
