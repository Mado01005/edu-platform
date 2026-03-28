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
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="space-y-4 px-2">
         <h2 className="text-5xl font-black text-white tracking-tighter uppercase leading-none">Live Telemetry</h2>
         <p className="text-sm text-gray-500 font-medium">Real-time scan of global session activity and platform load.</p>
      </div>
      <div className="bg-white/[0.02] border border-white/5 rounded-[3.5rem] p-4 shadow-3xl">
         <LiveActivityFeed 
            initialLogs={initialLogs} 
            initialSessions={initialSessions} 
            initialUsers={allRoles.filter(r => r.role === 'student')} 
         />
      </div>
    </div>
  );
}
