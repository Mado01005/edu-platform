'use client';

import { useState } from 'react';
import { UserRole } from '@/types';
import { ADMIN_EMAILS } from '@/lib/constants';

interface TeamTabProps {
  allRoles: UserRole[];
  activeLogins: string[];
  updateRole: (email: string, role: string) => void;
}

export default function TeamTab({
  allRoles,
  activeLogins,
  updateRole
}: TeamTabProps) {
  const [newTeacherEmail, setNewTeacherEmail] = useState('');

  return (
    <div className="space-y-16 animate-in fade-in duration-700">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
         <div className="bg-[#101015] border border-white/10 p-12 rounded-[4rem] space-y-10 shadow-3xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none"></div>
           <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-none">Security Override</h2>
           <p className="text-sm text-gray-500 font-medium leading-relaxed">Elevate any student to Faculty (Teacher) or God Mode (Superadmin) clearance.</p>
           <div className="space-y-6">
             <input value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="Verified google identity email..." className="w-full bg-black border border-white/10 rounded-3xl px-8 py-7 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white text-md font-black placeholder:text-gray-800 shadow-inner" />
             <div className="flex gap-4">
                <button onClick={() => { if (!newTeacherEmail) return; updateRole(newTeacherEmail, 'teacher'); setNewTeacherEmail(''); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white border border-white/10 py-6 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-xl">Grant Teacher</button>
                <button onClick={() => { if (!newTeacherEmail) return; updateRole(newTeacherEmail, 'superadmin'); setNewTeacherEmail(''); }} className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-[1.5rem] font-black uppercase tracking-widest text-[10px] transition-all active:scale-95 shadow-2xl shadow-indigo-600/30">Grant God Mode</button>
             </div>
           </div>
         </div>
         
         <div className="bg-indigo-500/5 border border-indigo-500/10 p-12 rounded-[4rem] space-y-10 relative overflow-hidden backdrop-blur-md">
            <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 flex items-center justify-center text-4xl border border-indigo-500/20 shadow-inner">👤</div>
            <div className="space-y-4">
               <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Authority Log</h3>
               <p className="text-xs text-indigo-300 font-bold uppercase tracking-widest leading-loose opacity-60">
                  — TEACHER: Content Upload privileges only.<br/>
                  — SUPERADMIN: Full telemetric God Mode override.<br/>
                  — BANNED: Complete identity sector lockout.
               </p>
            </div>
            <div className="h-1 bg-white/5 w-full rounded-full overflow-hidden">
               <div className="h-full bg-indigo-500/40 w-1/3"></div>
            </div>
         </div>
      </div>

      <div className="bg-[#05050A] border border-white/10 rounded-[4rem] overflow-hidden shadow-3xl min-h-[500px]">
         <div className="px-14 py-10 border-b border-white/5 bg-white/[0.02] flex justify-between items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] pointer-events-none"></div>
            <h3 className="font-black text-[11px] uppercase tracking-[0.4em] text-gray-500">Classified Personnel DB</h3>
            <span className="text-[11px] font-black text-indigo-400 bg-indigo-500/10 px-6 py-2 rounded-2xl border border-indigo-500/10 shadow-inner">{allRoles.length} Identified Identities</span>
         </div>
         
         <div className="divide-y divide-white/5">
           <div className="bg-indigo-500/[0.02]">
              {allRoles.filter(r => r.role === 'teacher' || r.role === 'superadmin').map(r => (
                <div key={r.email} className="px-14 py-10 flex items-center justify-between hover:bg-white/[0.03] transition-all duration-700 group border-l-4 border-transparent hover:border-indigo-500">
                   <div className="flex items-center gap-8">
                      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl border transition-all duration-500 ${r.role === 'superadmin' ? 'bg-indigo-600 border-indigo-400 text-white shadow-2xl shadow-indigo-600/40' : 'bg-white/5 border-white/10 text-gray-500'}`}>
                        {r.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-white text-xl tracking-tighter group-hover:text-indigo-400 transition-colors">{r.email}</p>
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-3 ${r.role === 'superadmin' ? 'text-indigo-400' : 'text-gray-600'}`}>
                          <span className={`w-2 h-2 rounded-full ${r.role === 'superadmin' ? 'bg-indigo-400' : 'bg-gray-800'}`}></span>
                          {r.role.toUpperCase()} CLEARANCE
                        </p>
                      </div>
                   </div>
                   <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-10 group-hover:translate-x-0 min-w-[200px]">
                       {r.role !== 'superadmin' && (
                         <button onClick={() => updateRole(r.email, 'superadmin')} className="w-full px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-2xl hover:bg-indigo-500 transition-all">Grant God Mode</button>
                       )}
                       {!ADMIN_EMAILS.some(e => r.email.toLowerCase().trim() === e.toLowerCase().trim()) && (
                         <button onClick={() => updateRole(r.email, 'student')} className="w-full px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-red-500/40 hover:text-red-500 border border-white/10 hover:bg-red-500/10 transition-all">Demote to Student</button>
                       )}
                    </div>
                </div>
              ))}
           </div>

           <div className="p-14 space-y-12">
              <div className="flex items-center gap-6 opacity-20 hover:opacity-100 transition-all duration-1000">
                 <div className="h-px flex-1 bg-white/10"></div>
                 <span className="text-[11px] font-black uppercase tracking-[0.6em] text-center">Global Student Frequency Scan</span>
                 <div className="h-px flex-1 bg-white/10"></div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                 {allRoles.filter(r => r.role === 'student' || r.role === 'banned').map(r => (
                   <div key={r.email} className={`bg-[#0A0A0F] border rounded-[3rem] overflow-hidden transition-all duration-700 group/student p-8 flex flex-col md:flex-row items-center justify-between gap-8 ${r.role === 'banned' ? 'border-red-500/20 grayscale' : 'border-white/5 hover:border-indigo-500/30'}`}>
                      <div className="flex items-center gap-8 w-full md:w-auto">
                         <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-xl font-black transition-all duration-500 ${r.role === 'banned' ? 'bg-red-500/10 text-red-500' : 'bg-indigo-500/10 text-indigo-400 group-hover/student:bg-indigo-500 group-hover/student:text-white'}`}>{r.email.charAt(0).toUpperCase()}</div>
                         <div>
                            <div className="flex items-center gap-3">
                              <p className="text-xl font-black text-gray-100 tracking-tight">{r.email}</p>
                              {activeLogins.includes(r.email) && <span className="px-3 py-1 bg-green-500/10 text-green-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-green-500/20 animate-pulse">Online</span>}
                            </div>
                            <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-2 ${r.role === 'banned' ? 'text-red-600' : 'text-gray-700'}`}>{r.role === 'banned' ? '✘ Identity Sector Revoked' : '✓ Verified connection'}</p>
                         </div>
                      </div>
                      <div className="flex flex-col gap-2 min-w-[200px] items-end justify-center w-full md:w-auto">
                         {r.role !== 'banned' ? (
                           <>
                             <button onClick={() => updateRole(r.email, 'teacher')} className="w-full px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 border border-white/5 shadow-xl transition-all">Promote: Teacher</button>
                             <button onClick={() => updateRole(r.email, 'superadmin')} className="w-full px-8 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest bg-indigo-600 text-white shadow-2xl shadow-indigo-600/20 hover:scale-105 active:scale-95 transition-all">Grant: God Mode</button>
                             <button onClick={() => updateRole(r.email, 'banned')} className="w-full mt-1 px-4 py-3 hover:bg-red-500/20 rounded-xl text-red-500 bg-white/5 border border-white/5 transition-all opacity-40 hover:opacity-100">🚫 Revoke Access</button>
                           </>
                         ) : (
                           <button onClick={() => updateRole(r.email, 'student')} className="px-10 py-4 bg-green-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">Authorize Re-Entry</button>
                         )}
                      </div>
                   </div>
                 ))}
              </div>
           </div>
         </div>
      </div>
    </div>
  );
}
