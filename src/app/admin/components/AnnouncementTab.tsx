'use client';

interface AnnouncementTabProps {
  // No specific props needed for now as it handles its own local input
}

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
      if (res.ok) alert('All global announcements have been archived. 🗑️');
    } catch {
      alert('Network Error');
    }
  };

  return (
    <div className="h-[600px] flex items-center justify-center animate-in fade-in duration-700">
       <div className="w-full max-w-2xl bg-white/5 border border-white/10 p-16 rounded-[4rem] text-center space-y-12 relative overflow-hidden shadow-3xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
          <div className="w-24 h-24 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto text-5xl shadow-inner border border-indigo-500/20">📢</div>
          <div className="space-y-4">
            <h2 className="text-4xl font-black text-white uppercase tracking-tighter">Global Announcement</h2>
            <p className="text-gray-500 text-sm font-medium">Broadcast a real-time notification directly to all active student dashboards.</p>
          </div>
          <input id="announcement-msg" type="text" placeholder="Draft your global post..." className="w-full bg-black border border-white/10 rounded-[2rem] px-8 py-6 text-sm text-center font-bold text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-gray-800" />
          <div className="flex gap-4">
            <button onClick={handlePostAnnouncement} className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-indigo-600/20 transition-all active:scale-95">Post Announcement</button>
            <button onClick={clearAnnouncement} className="flex-1 bg-white/5 hover:bg-white/10 py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] text-gray-400 border border-white/5 transition-all">Clear Banner</button>
          </div>
       </div>
    </div>
  );
}
