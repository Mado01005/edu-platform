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
    if (!confirm('Run a full recursive audit of the Cloudflare R2 bucket to identify orphaned files?')) return;
    
    try {
      setIsPending(true);
      // 1. Dry Run
      const res = await fetch('/api/admin/purge-orphans', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        return alert(`Audit Failed: ${data.error || 'Network Error'}`);
      }

      const { orphanedCount, totalR2Objects, totalDbLinks } = data;
      
      if (orphanedCount === 0) {
        return alert(`✅ Clean! Checked ${totalR2Objects} bucket items against ${totalDbLinks} database links. No orphaned files detected.`);
      }

      // 2. Execute Purge Prompt
      const wantPurge = confirm(`⚠️ Found ${orphanedCount} orphaned files occupying bucket space.\n\nTotal R2 Objects: ${totalR2Objects}\nRegistered DB Links: ${totalDbLinks}\n\nExecute permanent deletion? This cannot be undone.`);
      
      if (!wantPurge) return;

      const purgeData = await executeMutation<{ purged: number }>(
        '/api/admin/purge-orphans',
        'POST',
        { purge: true }
      );
      
      if (purgeData) {
        alert(`🗑️ Purged ${purgeData.purged} stray files successfully.`);
      }
      
    } catch {
      alert('Network Error during R2 Audit'); 
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 rounded-2xl border border-white/5 bg-[#0A0A0F] p-4">
      <div className="flex min-w-0 items-center gap-3">
         <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-xl">🧭</div>
         <div>
           <h2 className="text-lg font-black tracking-tight">Course content tools</h2>
           <p className="text-xs font-bold text-zinc-500">Choose the task you want to open.</p>
         </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-2 lg:grid-cols-5">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl border px-2 py-3 text-center text-xs font-black transition ${
              activeTab === tab.id 
                ? 'border-white bg-white text-black shadow-xl'
                : 'text-gray-500 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-lg" aria-hidden="true">{tab.icon}</span>
            <span className="min-w-0 leading-4">{tab.label}</span>
          </button>
        ))}
      </div>

      {storageStats && (
        <details className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 shadow-inner">
          <summary className="cursor-pointer text-xs font-black text-indigo-300">File storage details</summary>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
               <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold uppercase tracking-widest text-gray-500">Uploaded files</span>
                  <span className="text-white font-black">{storageStats.r2.estimatedMB}MB</span>
               </div>
               <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${storageStats.r2.percentUsed}%` }}></div>
               </div>
            </div>
            <div className="space-y-1.5">
               <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold uppercase tracking-widest text-gray-500">Database</span>
                  <span className="text-white font-black">{storageStats.supabase.estimatedMB}MB</span>
               </div>
               <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${storageStats.supabase.percentUsed}%` }}></div>
               </div>
            </div>
          </div>
          <button 
            onClick={handleAuditR2}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 py-3 text-xs font-bold text-orange-300 transition-colors hover:bg-orange-500/20"
          >
            <span className="text-sm">🔍</span> Check for unused files
          </button>
        </details>
      )}
    </div>
  );
}
