'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'abdallahsaad813@gmail.com';

interface Message {
  id: string;
  sender_email: string;
  receiver_email: string;
  subject: string;
  body: string;
  created_at: string;
}

export default function SupportChat({ userEmail }: { userEmail: string | null | undefined }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userEmail || !isOpen) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_email.eq.${userEmail},receiver_email.eq.${ADMIN_EMAIL}),and(sender_email.eq.${ADMIN_EMAIL},receiver_email.eq.${userEmail})`)
        .order('created_at', { ascending: true });

      if (data) setMessages(data);
      if (error) console.error('Error fetching messages:', error);
    };

    fetchMessages();

    const channel = supabase
      .channel(`support_${userEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_email=eq.${userEmail}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userEmail, isOpen]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userEmail) return;

    setLoading(true);
    const msgData = {
      sender_email: userEmail,
      receiver_email: ADMIN_EMAIL,
      subject: 'Support Inquiry',
      body: newMessage.trim(),
    };

    const { data, error } = await supabase.from('messages').insert(msgData).select().single();

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setMessages((prev) => [...prev, data]);
      setNewMessage('');
    }
    setLoading(false);
  };

  if (!userEmail) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[99999] transition-all duration-500 ease-out flex flex-col items-end">
      
      {/* CHAT WINDOW */}
      {isOpen && (
        <div className="mb-6 flex h-[580px] w-[340px] flex-col overflow-hidden rounded-[2.5rem] border border-white/10 bg-[#05050A]/95 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] backdrop-blur-3xl animate-in fade-in zoom-in-95 slide-in-from-bottom-10 sm:w-[400px]">
          
          {/* HEADER */}
          <div className="relative flex items-center justify-between border-b border-white/5 bg-gradient-to-b from-indigo-500/10 to-transparent p-6">
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-indigo-500 blur-lg opacity-40 animate-pulse"></div>
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0F0F15] border border-white/10 text-2xl shadow-inner">👨‍🏫</div>
                <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-[#05050A] bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]"></div>
              </div>
              <div>
                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">EduPortal Direct</h3>
                <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-0.5">Instant Support Link</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="group rounded-xl p-2 text-gray-500 hover:bg-white/5 hover:text-white transition-all duration-300"
            >
              <svg className="h-5 w-5 rotate-0 group-hover:rotate-90 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* MESSAGES AREA */}
          <div 
            ref={scrollRef} 
            className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat opacity-95"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 animate-in fade-in duration-700">
                <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center text-3xl shadow-inner">👋</div>
                <div className="space-y-2">
                  <p className="text-sm font-bold text-white uppercase tracking-tighter">Welcome back!</p>
                  <p className="text-[11px] text-gray-500 leading-relaxed font-medium uppercase tracking-widest">A dedicated instructor is standing by.<br/>How can we assist your studies today?</p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_email === userEmail ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                  <div className={`relative max-w-[85%] rounded-2xl px-5 py-3.5 text-xs font-semibold leading-relaxed shadow-2xl transition-all hover:scale-[1.02] ${
                    msg.sender_email === userEmail 
                      ? 'bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/20' 
                      : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                  }`}>
                    {msg.body}
                    <div className="mt-2 text-[9px] opacity-40 font-black uppercase tracking-widest flex items-center gap-2">
                      <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* INPUT FORM */}
          <div className="p-6 pt-2 bg-gradient-to-t from-black/50 to-transparent">
             <form onSubmit={handleSendMessage} className="relative group">
               <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 group-focus-within:opacity-40 transition duration-1000"></div>
               <div className="relative flex items-center gap-3 bg-[#0A0A0F] border border-white/10 rounded-2xl p-2.5 pl-5">
                 <input
                   type="text"
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   placeholder="Transmit message..."
                   disabled={loading}
                   className="flex-1 bg-transparent text-xs font-bold text-white placeholder-gray-700 focus:outline-none transition-all"
                 />
                 <button
                   type="submit"
                   disabled={loading || !newMessage.trim()}
                   className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-xl hover:scale-110 active:scale-90 transition-all duration-300 disabled:opacity-30 disabled:grayscale disabled:hover:scale-100"
                 >
                   <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                   </svg>
                 </button>
               </div>
             </form>
             <div className="mt-4 flex items-center justify-center gap-1.5 opacity-20">
                <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white">Encrypted Uplink Active</span>
                <div className="h-1 w-1 rounded-full bg-indigo-500 animate-pulse"></div>
             </div>
          </div>
        </div>
      )}

      {/* FLOATING BUBBLE */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-indigo-600 shadow-[0_20px_40px_-10px_rgba(99,102,241,0.5)] transition-all duration-500 hover:scale-110 hover:-translate-y-2 active:scale-95"
        >
          <div className="absolute inset-0 rounded-[1.5rem] bg-indigo-600 blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative">
            <svg className="h-8 w-8 text-white transition-transform duration-500 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="absolute -top-3 -right-3 flex h-5 w-5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 border-2 border-indigo-600 shadow-lg"></span>
            </span>
          </div>

          {/* HOVER TOOLTIP */}
          <div className="absolute right-20 bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 transition-all duration-500 whitespace-nowrap pointer-events-none shadow-2xl">
             Direct Support Line
             <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[6px] border-l-white"></div>
          </div>
        </button>
      )}
    </div>
  );
}
