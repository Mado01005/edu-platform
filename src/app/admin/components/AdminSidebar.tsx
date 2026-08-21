'use client';

import { StorageStats } from '@/types';

import { useAdmin } from '../context/AdminContext';

interface AdminSidebarProps<TabId extends string> {
  activeTab: TabId;
  setActiveTab: (tab: TabId) => void;
  availableTabs: Array<{ id: TabId; icon: string; label: string }>;
  storageStats: StorageStats | null;
}

export default function AdminSidebar<TabId extends string>({
  activeTab, 
  setActiveTab, 
  availableTabs, 
  storageStats
}: AdminSidebarProps<TabId>) {
  const { setIsPending, executeMutation } = useAdmin();

  const handleAuditR2 = async () => {
    if (!confirm('Check file storage for uploads that are no longer linked to a lesson?')) return;
    
    try {
      setIsPending(true);
      // 1. Dry Run
      const res = await fetch('/api/admin/purge-orphans', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        return alert(`Storage check failed: ${data.error || 'Please try again.'}`);
      }

      const { orphanedCount, totalR2Objects, totalDbLinks } = data;
      
      if (orphanedCount === 0) {
        return alert(`All ${totalR2Objects} stored files are linked to platform content.`);
      }

      // Ask before permanently deleting unused objects.
      const wantPurge = confirm(`Found ${orphanedCount} unused files.\n\nStored files checked: ${totalR2Objects}\nFiles linked to content: ${totalDbLinks}\n\nDelete the unused files permanently? This cannot be undone.`);
      
      if (!wantPurge) return;

      const purgeData = await executeMutation<{ purged: number }>(
        '/api/admin/purge-orphans',
        'POST',
        { purge: true }
      );
      
      if (purgeData) {
        alert(`Deleted ${purgeData.purged} unused files.`);
      }
      
    } catch {
      alert('Could not check file storage. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-sm shadow-emerald-950/5">
      <div className="flex min-w-0 items-center gap-3">
         <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-xl">🧭</div>
         <div>
           <h2 className="text-lg font-black tracking-tight">Course content tools</h2>
           <p className="text-xs font-bold text-slate-600">Choose the task you want to open.</p>
         </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-5">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border border-l-4 px-2 py-3 text-center text-xs font-black transition-all duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md ${
              activeTab === tab.id 
                ? 'border-emerald-200/60 border-l-emerald-500 bg-emerald-50 text-[#084B2B] shadow-sm'
                : 'border-emerald-950/10 border-l-transparent bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-[#084B2B]'
            }`}
          >
            <span className="text-lg" aria-hidden="true">{tab.icon}</span>
            <span className="min-w-0 leading-4">{tab.label}</span>
          </button>
        ))}
      </div>

      {storageStats && (
        <details className="rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-4">
          <summary className="cursor-pointer text-xs font-black text-[#084B2B]">File storage details</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
               <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold uppercase tracking-widest text-slate-600">Uploaded files</span>
                  <span className="font-black text-slate-900">{storageStats.r2.estimatedMB}MB</span>
               </div>
               <div className="h-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-orange-500 transition-all duration-300 ease-in-out" style={{ width: `${storageStats.r2.percentUsed}%` }}></div>
               </div>
            </div>
            <div className="space-y-1.5">
               <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold uppercase tracking-widest text-slate-600">Database</span>
                  <span className="font-black text-slate-900">{storageStats.supabase.estimatedMB}MB</span>
               </div>
               <div className="h-1 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-[#084B2B] transition-all duration-300 ease-in-out" style={{ width: `${storageStats.supabase.percentUsed}%` }}></div>
               </div>
            </div>
          </div>
          <button 
            onClick={handleAuditR2}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200/80 bg-amber-50 py-3 text-xs font-bold text-amber-700 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-md"
          >
            <span className="text-sm">🔍</span> Check for unused files
          </button>
        </details>
      )}
    </div>
  );
}
