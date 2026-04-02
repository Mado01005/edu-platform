'use client';

import { useState } from 'react';
import { UserRole } from '@/types';

interface ManageUserModalProps {
  user: UserRole;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ManageUserModal({ user, onClose, onUpdate }: ManageUserModalProps) {
  const [streak, setStreak] = useState(user.streak_count.toString());
  const [notes, setNotes] = useState(user.internal_notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleAction = async (action: string, value?: string) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/users/manage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetEmail: user.email, action, value }),
      });
      if (res.ok) {
        setMessage('Action successfully executed');
        onUpdate();
        if (action !== 'UPDATE_NOTES' && action !== 'UPDATE_STREAK') {
           setTimeout(onClose, 1000);
        }
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage('Network error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0A0A0F] border border-white/10 w-full max-w-xl rounded-[3rem] overflow-hidden shadow-3xl relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
        
        <div className="px-10 py-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">Identity Config — {user.email.split('@')[0]}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
        </div>

        <div className="p-10 space-y-8">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Streak Override</label>
            <div className="flex gap-4">
              <input type="number" value={streak} onChange={e => setStreak(e.target.value)} className="flex-1 bg-black border border-white/10 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-indigo-500 text-white font-bold" />
              <button onClick={() => handleAction('UPDATE_STREAK', streak)} disabled={isSaving} className="px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-indigo-500 transition-all disabled:opacity-50">Sync</button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Internal Deployment Notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Personnel background, behavior logs, or admin context..." className="w-full bg-black border border-white/10 rounded-3xl px-6 py-6 outline-none focus:ring-2 focus:ring-indigo-500 text-white text-sm min-h-[120px] resize-none" />
            <button onClick={() => handleAction('UPDATE_NOTES', notes)} disabled={isSaving} className="w-full py-4 bg-white/5 border border-white/10 text-gray-400 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:text-white hover:bg-white/10 transition-all disabled:opacity-50">Commit Notes</button>
          </div>

          <div className="pt-4 space-y-3">
             <p className="text-[10px] font-black uppercase tracking-widest text-red-500/60 mb-4">Critical Commands</p>
             <button disabled={isSaving} className="w-full py-4 bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500/20 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all">Emergency Security Reset (Password)</button>
             <p className="text-[9px] text-gray-600 text-center italic mt-2">Password reset requires SMTP configuration to be active on Supabase.</p>
          </div>

          {message && <p className="text-center text-xs font-bold text-indigo-400 animate-pulse">{message}</p>}
        </div>
      </div>
    </div>
  );
}
