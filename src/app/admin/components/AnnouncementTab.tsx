'use client';

export default function AnnouncementTab() {
  const handlePostAnnouncement = async () => {
    const msgInput = document.getElementById('announcement-msg') as HTMLInputElement;
    const msg = msgInput?.value;
    if (!msg) return;
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, is_active: true })
      });
      if (res.ok) {
        alert('Announcement Posted Successfully ✅');
        msgInput.value = '';
      } else {
        alert('Failed to update announcement. Check your connection.');
      }
    } catch {
      alert('Network Error: Unable to reach the notification core.');
    }
  };

  const clearAnnouncement = async () => {
    try {
      const res = await fetch('/api/admin/announcement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: '', is_active: false })
      });
      if (res.ok) alert('All announcements have been archived. 🗑️');
    } catch {
      alert('Network Error');
    }
  };

  return (
    <div className="flex min-h-[600px] items-center justify-center animate-in fade-in duration-300">
       <div className="relative w-full max-w-2xl space-y-12 overflow-hidden rounded-[4rem] border border-emerald-950/10 bg-white p-16 text-center shadow-sm shadow-emerald-950/5">
          <div className="mx-auto flex size-24 items-center justify-center rounded-full border border-emerald-200/60 bg-emerald-50 text-5xl shadow-sm">📢</div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black uppercase tracking-tighter text-slate-900">Global Announcement</h2>
            <p className="text-sm font-medium text-slate-600">Broadcast a real-time notification directly to all active student dashboards.</p>
          </div>
          <input id="announcement-msg" type="text" placeholder="Draft your global post..." className="w-full rounded-[2rem] border border-emerald-950/10 bg-white px-8 py-6 text-center text-sm font-bold text-slate-900 shadow-sm outline-none transition-all duration-200 ease-in-out placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" />
          <div className="flex gap-4">
            <button onClick={handlePostAnnouncement} className="flex-1 rounded-3xl bg-[#084B2B] py-6 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063B22] hover:shadow-md active:translate-y-0">Post Announcement</button>
            <button onClick={clearAnnouncement} className="flex-1 rounded-3xl border border-emerald-950/10 bg-white py-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-900 hover:shadow-md">Clear Banner</button>
          </div>
       </div>
    </div>
  );
}
