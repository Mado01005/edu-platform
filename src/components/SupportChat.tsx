'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAIL = 'abdallahsaad2150@gmail.com';

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
    <div className="fixed bottom-24 right-6 z-[100] flex flex-col items-end sm:bottom-6">
      {isOpen && (
        <div className="mb-4 flex h-[500px] w-[320px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0A0A0F]/95 shadow-2xl backdrop-blur-xl sm:w-[380px]">
          <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 p-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)] absolute -top-0.5 -right-0.5 animate-pulse"></div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20 text-xl border border-indigo-500/30">👨‍🏫</div>
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Admin Support</h3>
                <p className="text-[10px] text-gray-400 font-mono">Real-time Dashboard</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="rounded-lg p-1 text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-2 opacity-50">
                <span className="text-3xl">👋</span>
                <p className="text-sm text-gray-400">Need help? Send a message to the admin!</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender_email === userEmail ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-lg ${
                    msg.sender_email === userEmail 
                      ? 'bg-indigo-600 text-white rounded-tr-none' 
                      : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-none'
                  }`}>
                    {msg.body}
                    <div className="mt-1 text-[9px] opacity-50 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handleSendMessage} className="border-t border-white/10 p-4 bg-white/5">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={loading}
                className="flex-1 rounded-xl border border-white/10 bg-black/40 px-4 py-2 text-sm text-white placeholder-gray-500 focus:border-indigo-500/50 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
              <button
                type="submit"
                disabled={loading || !newMessage.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
              >
                <svg className="h-5 w-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                </svg>
              </button>
            </div>
          </form>
        </div>
      )}

      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 transition-all hover:scale-110 active:scale-95"
        >
          <div className="absolute inset-0 rounded-2xl bg-indigo-600 blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
          <svg className="relative h-7 w-7 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 border-2 border-[#05050A]"></span>
          </span>
        </button>
      )}
    </div>
  );
}
