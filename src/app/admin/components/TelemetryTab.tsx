'use client';

import LiveActivityFeed from '@/components/LiveActivityFeed';
import { ActivityLog, UserRole } from '@/types';

interface TelemetryTabProps {
  initialLogs: ActivityLog[];
  initialSessions: unknown[];
  allRoles: UserRole[];
}

export default function TelemetryTab({
  initialLogs,
  initialSessions,
  allRoles
}: TelemetryTabProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="space-y-4 px-2">
         <h2 className="text-3xl font-black text-slate-900 tracking-tight sm:text-4xl">Recent Admin Activity</h2>
         <p className="text-sm text-slate-600 font-medium">Review recent sign-ins, page activity, and active sessions.</p>
      </div>
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50 sm:p-6">
         <LiveActivityFeed 
            initialLogs={initialLogs} 
            initialSessions={initialSessions} 
            initialUsers={allRoles.filter(r => r.role === 'student')} 
         />
      </div>
    </div>
  );
}
