'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { UserRole } from '@/types';
import { ADMIN_EMAILS } from '@/lib/constants';
import { Button } from '@/components/UI/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/UI/dialog';
import ManageUserModal from './ManageUserModal';
import { useAdmin } from '../context/AdminContext';

function accountLabel(email: string) {
  return email.split('@')[0]?.trim() || 'User account';
}

interface TeamTabProps {
  allRoles: UserRole[];
  activeLogins: string[];
  refreshPageData?: () => void;
}

export default function TeamTab({
  allRoles,
  activeLogins,
  refreshPageData
}: TeamTabProps) {
  const [newTeacherEmail, setNewTeacherEmail] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserRole | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserRole | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [deleteNotice, setDeleteNotice] = useState('');
  const [deleteError, setDeleteError] = useState('');
  
  const { executeMutation } = useAdmin();

  const updateRole = async (email: string, role: string) => {
    await executeMutation(
      '/api/admin/roles',
      'POST',
      { email, overrideRole: role },
      refreshPageData,
      `${accountLabel(email)} updated to ${role}`
    );
  };

  const handleUpdate = () => {
    if (refreshPageData) {
      refreshPageData();
    } else {
      // Fallback: reload the page to refresh data
      window.location.reload();
    }
  };

  const deleteAccount = async () => {
    if (!deleteTarget) return;
    setPendingDelete(true);
    setDeleteError('');
    setDeleteNotice('');
    try {
      const response = await fetch('/api/admin/users', {
        body: JSON.stringify({ emails: [deleteTarget.email] }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? 'Unable to delete this account.');
      setDeleteNotice(`${accountLabel(deleteTarget.email)} was permanently deleted.`);
      setDeleteTarget(null);
      handleUpdate();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Unable to delete this account.');
    } finally {
      setPendingDelete(false);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {selectedUser && (
        <ManageUserModal 
          user={selectedUser} 
          onClose={() => setSelectedUser(null)} 
          onUpdate={handleUpdate} 
        />
      )}
      {deleteNotice ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800" role="status">
          {deleteNotice}
        </p>
      ) : null}
      {deleteError ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">
          {deleteError}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
         <div className="relative space-y-8 overflow-hidden rounded-[3rem] border border-emerald-950/10 bg-white p-6 shadow-sm shadow-emerald-950/5 sm:p-10">
           <h2 className="text-3xl font-black uppercase leading-none tracking-tighter text-slate-900 sm:text-4xl">Manage Team &amp; Staff Roles</h2>
           <p className="text-sm font-medium leading-relaxed text-slate-600">Assign teacher or administrator access using a verified account email.</p>
           <div className="space-y-6">
             <input value={newTeacherEmail} onChange={e => setNewTeacherEmail(e.target.value)} placeholder="Account email address" className="w-full rounded-3xl border border-emerald-950/10 bg-white px-8 py-6 text-md font-black text-slate-900 shadow-sm outline-none transition-all duration-200 ease-in-out placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" />
             <div className="flex flex-col gap-3 sm:flex-row">
                <button onClick={() => { if (!newTeacherEmail) return; updateRole(newTeacherEmail, 'teacher'); setNewTeacherEmail(''); }} className="flex-1 rounded-[1.5rem] border border-emerald-950/10 bg-white py-5 text-[10px] font-black uppercase tracking-widest text-slate-700 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-100 hover:shadow-md active:translate-y-0">Make Teacher</button>
                <button onClick={() => { if (!newTeacherEmail) return; updateRole(newTeacherEmail, 'superadmin'); setNewTeacherEmail(''); }} className="flex-1 rounded-[1.5rem] bg-[#084B2B] py-5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063B22] hover:shadow-md active:translate-y-0">Make Administrator</button>
             </div>
           </div>
         </div>
         
         <div className="relative space-y-8 overflow-hidden rounded-[3rem] border border-emerald-950/10 bg-white p-6 shadow-sm shadow-emerald-950/5 sm:p-10">
            <div className="flex size-20 items-center justify-center rounded-3xl border border-emerald-200/60 bg-emerald-50 text-4xl shadow-sm">👤</div>
            <div className="space-y-4">
               <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Role Guide</h3>
               <p className="text-xs font-bold uppercase leading-loose tracking-widest text-slate-600">
                  — Teacher: Creates and manages learning content.<br/>
                  — Administrator: Manages content, users, and settings.<br/>
                  — Disabled: Cannot sign in to the platform.
               </p>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-slate-100">
               <div className="h-full w-1/3 bg-[#084B2B]"></div>
            </div>
         </div>
      </div>

      <div className="min-h-[500px] overflow-hidden rounded-[3rem] border border-emerald-950/10 bg-white shadow-sm shadow-emerald-950/5">
         <div className="relative flex items-center justify-between overflow-hidden border-b border-emerald-950/10 bg-[#F8FAF7] px-6 py-8 sm:px-10">
            <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-600">Team &amp; User Accounts</h3>
            <span className="rounded-2xl border border-emerald-200/60 bg-emerald-50 px-4 py-2 text-[11px] font-black text-[#084B2B]">{allRoles.length} Accounts</span>
         </div>
         
         <div className="divide-y divide-emerald-950/10">
           <div>
              {allRoles.filter(r => r.role === 'teacher' || r.role === 'superadmin').map(r => (
                <div key={r.email} className="group flex flex-col gap-6 border-l-4 border-transparent px-6 py-8 transition-all duration-200 ease-in-out hover:border-[#084B2B] hover:bg-emerald-50 sm:px-10 md:flex-row md:items-center md:justify-between">
                   <div className="flex min-w-0 items-center gap-4 sm:gap-8">
                      <div className={`flex size-16 items-center justify-center rounded-2xl border text-xl font-black shadow-sm transition-all duration-200 ${r.role === 'superadmin' ? 'border-[#084B2B] bg-[#084B2B] text-white' : 'border-emerald-950/10 bg-slate-100 text-slate-600'}`}>
                        {accountLabel(r.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="break-all text-xl font-black tracking-tighter text-slate-900 transition-colors group-hover:text-[#084B2B]">{accountLabel(r.email)}</p>
                        <p className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${r.role === 'superadmin' ? 'border-[#D4AF37]/40 bg-[#FDF8E8] text-[#8C6B1B]' : 'border-emerald-200 bg-emerald-50 text-[#084B2B]'}`}>
                          <span className={`size-2 rounded-full ${r.role === 'superadmin' ? 'bg-[#D4AF37]' : 'bg-[#084B2B]'}`}></span>
                          {r.role === 'superadmin' ? 'ADMINISTRATOR' : 'TEACHER'}
                        </p>
                      </div>
                   </div>
                   <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:items-center">
                     <button onClick={() => setSelectedUser(r)} className="rounded-2xl border border-emerald-950/10 bg-white p-4 text-slate-500 opacity-0 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:text-[#084B2B] hover:shadow-md group-hover:opacity-100">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                     </button>
                     <div className="flex w-full flex-col gap-2 md:min-w-[200px]">
                         {r.role !== 'superadmin' && (
                           <button onClick={() => updateRole(r.email, 'superadmin')} className="w-full rounded-xl bg-[#084B2B] px-6 py-3 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063B22] hover:shadow-md">Make Administrator</button>
                         )}
                         {!ADMIN_EMAILS.some(e => r.email.toLowerCase().trim() === e.toLowerCase().trim()) && (
                           <>
                             <button onClick={() => updateRole(r.email, 'student')} className="w-full rounded-xl border border-red-200/80 bg-white px-6 py-3 text-[9px] font-black uppercase tracking-widest text-red-600 transition-all hover:bg-red-50">Change to Student</button>
                             <button onClick={() => setDeleteTarget(r)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-red-700">
                               <Trash2 className="size-4" aria-hidden="true" /> Delete Account
                             </button>
                           </>
                         )}
                      </div>
                   </div>
                </div>
              ))}
           </div>

           <div className="space-y-8 p-6 sm:p-10">
              <div className="flex items-center gap-6 opacity-60 transition-all duration-200 ease-in-out hover:opacity-100">
                 <div className="h-px flex-1 bg-slate-200"></div>
                 <span className="text-[11px] font-black uppercase tracking-[0.6em] text-center">Student Accounts</span>
                 <div className="h-px flex-1 bg-slate-200"></div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                 {allRoles.filter(r => r.role === 'student' || r.role === 'banned').map(r => (
                   <div key={r.email} className={`card-hover group/student flex flex-col items-center justify-between gap-8 overflow-hidden rounded-[2rem] border bg-white p-6 shadow-sm shadow-emerald-950/5 md:flex-row ${r.role === 'banned' ? 'border-red-200/80 grayscale' : 'border-emerald-950/10'}`}>
                      <div className="flex w-full min-w-0 items-center gap-4 sm:gap-8 md:w-auto">
                         <div className={`flex size-16 items-center justify-center rounded-[1.5rem] text-xl font-black transition-all duration-200 ${r.role === 'banned' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-[#084B2B] group-hover/student:bg-[#084B2B] group-hover/student:text-white'}`}>{accountLabel(r.email).charAt(0).toUpperCase()}</div>
                         <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <p className="break-all text-xl font-black tracking-tight text-slate-900">{accountLabel(r.email)}</p>
                              {activeLogins.includes(r.email) && <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-emerald-500/20 animate-pulse">Online</span>}
                            </div>
                            <p className={`mt-2 inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] ${r.role === 'banned' ? 'border-red-200 bg-red-50 text-red-600' : 'border-emerald-200 bg-emerald-50 text-[#084B2B]'}`}>{r.role === 'banned' ? '✘ Access disabled' : 'STUDENT · Active account'}</p>
                         </div>
                      </div>
                      <div className="flex w-full flex-col gap-3 sm:flex-row md:w-auto md:items-center">
                        <button onClick={() => setSelectedUser(r)} className="rounded-2xl border border-emerald-950/10 bg-white p-4 text-slate-500 opacity-0 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-emerald-300 hover:text-[#084B2B] hover:shadow-md group-hover/student:opacity-100">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </button>
                        <div className="flex w-full flex-col gap-2 md:min-w-[200px] md:w-auto">
                           {r.role !== 'banned' ? (
                             <>
                               <button onClick={() => updateRole(r.email, 'teacher')} className="w-full rounded-xl border border-emerald-950/10 bg-white px-8 py-3 text-[9px] font-black uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:bg-slate-100">Make Teacher</button>
                               <button onClick={() => updateRole(r.email, 'superadmin')} className="w-full rounded-xl bg-[#084B2B] px-8 py-3 text-[9px] font-black uppercase tracking-widest text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063B22] hover:shadow-md active:translate-y-0">Make Administrator</button>
                               <button onClick={() => updateRole(r.email, 'banned')} className="mt-1 w-full rounded-xl border border-red-200/80 bg-white px-4 py-3 text-red-600 opacity-70 transition-all hover:bg-red-50 hover:opacity-100">🚫 Revoke Access</button>
                             </>
                           ) : (
                             <button onClick={() => updateRole(r.email, 'student')} className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[9px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all">Restore Access</button>
                           )}
                           {!ADMIN_EMAILS.some(e => r.email.toLowerCase().trim() === e.toLowerCase().trim()) && (
                             <button onClick={() => setDeleteTarget(r)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-red-700">
                               <Trash2 className="size-4" aria-hidden="true" /> Delete Account
                             </button>
                           )}
                        </div>
                      </div>
                   </div>
                 ))}
              </div>
           </div>
         </div>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open && !pendingDelete) setDeleteTarget(null);
        }}
        open={Boolean(deleteTarget)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this staff account?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `${accountLabel(deleteTarget.email)} will be permanently removed from PostgreSQL, Supabase Auth, and legacy staff roles.`
                : 'This staff account will be permanently removed.'}
            </DialogDescription>
          </DialogHeader>
          <p className="break-all rounded-xl border border-emerald-950/10 bg-[#F8FAF7] p-3 text-sm text-slate-700">
            {deleteTarget?.email}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={pendingDelete} variant="outline">Cancel</Button>
            </DialogClose>
            <Button disabled={pendingDelete} onClick={() => void deleteAccount()} variant="destructive">
              {pendingDelete ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              {pendingDelete ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
