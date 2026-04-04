'use client';

import { StorageStats } from '@/types';

import { useAdmin } from '../context/AdminContext';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: any) => void;
  availableTabs: Array<{ id: string; icon: string; label: string }>;
  currentUserRole: string;
  storageStats: StorageStats | null;
}

export default function AdminSidebar({ 
  activeTab, 
  setActiveTab, 
  availableTabs, 
  currentUserRole, 
  storageStats
}: AdminSidebarProps) {
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
      
    } catch(e) { 
      alert('Network Error during R2 Audit'); 
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="w-full md:w-[320px] bg-[#0A0A0F] border-r border-white/5 flex flex-col pt-8 p-6 space-y-8 h-screen sticky top-0 md:overflow-y-auto">
      <div className="flex items-center gap-4 px-2 mb-4">
         <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-2xl border border-indigo-500/20">⚡</div>
         <div>
           <h1 className="text-lg font-black tracking-tighter uppercase">Command</h1>
           <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-[0.2em] opacity-80">{currentUserRole.toUpperCase()} LEVEL</p>
         </div>
      </div>

      <div className="flex-1 space-y-2">
        {availableTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 border ${
              activeTab === tab.id 
                ? 'bg-white text-black border-white shadow-xl' 
                : 'text-gray-500 border-transparent hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-lg opacity-80">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {storageStats && (
        <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl space-y-5 shadow-inner">
          <h4 className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-400 opacity-60">System Resources</h4>
          <div className="space-y-4">
            <div className="space-y-1.5">
               <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 font-bold uppercase tracking-widest">R2 Sector</span>
                  <span className="text-white font-black">{storageStats.r2.estimatedMB}MB</span>
               </div>
               <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 transition-all duration-1000" style={{ width: `${storageStats.r2.percentUsed}%` }}></div>
               </div>
            </div>
            <div className="space-y-1.5">
               <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 font-bold uppercase tracking-widest">SB Core</span>
                  <span className="text-white font-black">{storageStats.supabase.estimatedMB}MB</span>
               </div>
               <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${storageStats.supabase.percentUsed}%` }}></div>
               </div>
            </div>
          </div>
          <button 
            onClick={handleAuditR2}
            className="w-full mt-4 py-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 font-bold uppercase tracking-widest text-[10px] transition-colors border border-orange-500/30 flex items-center justify-center gap-2"
          >
            <span className="text-sm">🔍</span> Audit Orphaned Files
          </button>
        </div>
      )}
    </div>
  );
}
