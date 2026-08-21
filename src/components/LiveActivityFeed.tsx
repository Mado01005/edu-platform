'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CircleUserRound,
  Download,
  MonitorCheck,
  Search,
  Users,
  X,
} from 'lucide-react';

type ActivityEntry = {
  action: string;
  created_at: string;
  details?: Record<string, unknown> | null;
  geo_city?: string | null;
  geo_country?: string | null;
  id?: string;
  url?: string | null;
  user_email: string;
  user_name?: string | null;
};

type SessionEntry = {
  current_page?: string | null;
  geo_city?: string | null;
  geo_country?: string | null;
  id?: string;
  is_idle?: boolean;
  last_active_at: string;
  user_agent?: string | null;
  user_email: string;
};

type RosterEntry = {
  created_at?: string | null;
  email: string;
  name?: string | null;
  role?: string | null;
};

type StudentSummary = {
  actionCount: number;
  city: string;
  completions: number;
  country: string;
  displayName: string;
  key: string;
  lastAction: string;
  lastSeen: string;
  logins: number;
  pdfReads: number;
  videoWatches: number;
};

type ActivityTab = 'feed' | 'sessions' | 'grid' | 'audit';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function activityEntries(values: unknown[]): ActivityEntry[] {
  return values.filter((value): value is ActivityEntry =>
    isRecord(value) &&
    typeof value.action === 'string' &&
    typeof value.created_at === 'string' &&
    typeof value.user_email === 'string',
  );
}

function sessionEntries(values: unknown[]): SessionEntry[] {
  return values.filter((value): value is SessionEntry =>
    isRecord(value) &&
    typeof value.last_active_at === 'string' &&
    typeof value.user_email === 'string',
  );
}

function rosterEntries(values: unknown[]): RosterEntry[] {
  return values.filter((value): value is RosterEntry =>
    isRecord(value) && typeof value.email === 'string',
  );
}

function username(email: string) {
  const local = email.split('@')[0]?.trim();
  return local || 'Student';
}

function displayName(name: unknown, email: string) {
  return typeof name === 'string' && name.trim() ? name.trim() : username(email);
}

function timeAgo(value: string) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)}s ago`;
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

function actionClass(action: string) {
  if (action.includes('LOGIN')) return 'border-emerald-200 bg-emerald-50 text-[#084B2B]';
  if (action.includes('Completed')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (action.includes('PDF')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (action.includes('VIDEO')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return 'border-emerald-950/10 bg-slate-100 text-slate-700';
}

function actionLabel(action: string) {
  return action.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function LiveActivityFeed({
  initialLogs,
  initialSessions,
  initialUsers,
}: {
  initialLogs: unknown[];
  initialSessions: unknown[];
  initialUsers: unknown[];
}) {
  const [logs, setLogs] = useState(() => activityEntries(initialLogs));
  const [sessions, setSessions] = useState(() => sessionEntries(initialSessions));
  const [tab, setTab] = useState<ActivityTab>('feed');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [auditSearch, setAuditSearch] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [showStream, setShowStream] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const response = await fetch('/api/admin/telemetry', {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Telemetry HTTP ${response.status}`);
        const payload = (await response.json()) as { logs?: unknown[]; sessions?: unknown[] };
        setLogs(activityEntries(payload.logs ?? []));
        setSessions(sessionEntries(payload.sessions ?? []));
        setConnectionStatus('connected');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setConnectionStatus('error');
        }
      }
    };
    void refresh();
    const poll = window.setInterval(() => void refresh(), 5_000);
    return () => {
      controller.abort();
      window.clearInterval(poll);
    };
  }, []);

  const students = useMemo(() => {
    const map = new Map<string, StudentSummary>();
    for (const user of rosterEntries(initialUsers)) {
      map.set(user.email, {
        actionCount: 0,
        city: 'Unknown',
        completions: 0,
        country: 'Unknown',
        displayName: displayName(user.name, user.email),
        key: user.email,
        lastAction: 'Registered',
        lastSeen: user.created_at || new Date(0).toISOString(),
        logins: 0,
        pdfReads: 0,
        videoWatches: 0,
      });
    }
    for (const log of [...logs].reverse()) {
      const current = map.get(log.user_email) ?? {
        actionCount: 0,
        city: 'Unknown',
        completions: 0,
        country: 'Unknown',
        displayName: displayName(log.user_name, log.user_email),
        key: log.user_email,
        lastAction: log.action,
        lastSeen: log.created_at,
        logins: 0,
        pdfReads: 0,
        videoWatches: 0,
      };
      current.actionCount += 1;
      if (new Date(log.created_at).getTime() >= new Date(current.lastSeen).getTime()) {
        current.lastSeen = log.created_at;
        current.lastAction = log.action;
        current.city = log.geo_city || current.city;
        current.country = log.geo_country || current.country;
        current.displayName = displayName(log.user_name, log.user_email);
      }
      if (log.action === 'Completed Lesson') current.completions += 1;
      if (log.action === 'USER_LOGIN') current.logins += 1;
      if (log.action === 'Open PDF' || log.action === 'READ_PDF') current.pdfReads += 1;
      if (log.action === 'Watched Video' || log.action === 'WATCH_VIDEO') current.videoWatches += 1;
      map.set(log.user_email, current);
    }
    for (const session of sessions) {
      const current = map.get(session.user_email);
      if (current && new Date(session.last_active_at) > new Date(current.lastSeen)) {
        current.lastSeen = session.last_active_at;
        current.lastAction = session.is_idle ? 'IDLE' : 'ACTIVE_BROWSING';
      }
    }
    return [...map.values()].sort(
      (first, second) => new Date(second.lastSeen).getTime() - new Date(first.lastSeen).getTime(),
    );
  }, [initialUsers, logs, sessions]);

  const namesByKey = useMemo(
    () => new Map(students.map((student) => [student.key, student.displayName])),
    [students],
  );
  const activeCount = sessions.filter(
    (session) => new Date(session.last_active_at).getTime() > Date.now() - 5 * 60 * 1000,
  ).length;
  const selected = students.find((student) => student.key === selectedStudent) ?? null;
  const actions = [...new Set(logs.map((log) => log.action))];
  const filteredLogs = logs.filter((log) => {
    const query = auditSearch.trim().toLowerCase();
    const name = displayName(log.user_name, log.user_email).toLowerCase();
    return (!query || name.includes(query) || log.action.toLowerCase().includes(query)) &&
      (!auditAction || log.action === auditAction);
  });

  function exportCsv() {
    const header = 'Timestamp,Student,Action,Summary,Page\n';
    const rows = filteredLogs.map((log) =>
      [
        new Date(log.created_at).toISOString(),
        displayName(log.user_name, log.user_email),
        actionLabel(log.action),
        JSON.stringify(log.details ?? {}),
        log.url ?? '',
      ].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','),
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin_activity_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-w-0 space-y-5 text-slate-900">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="flex flex-wrap items-center gap-2 text-xl font-black text-slate-900">
            <Activity className="size-5 text-[#084B2B]" aria-hidden="true" />
            Admin activity
          </h2>
          <button
            className={`mt-2 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${connectionStatus === 'connected' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : connectionStatus === 'connecting' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-red-200 bg-red-50 text-red-700'}`}
            onClick={() => setShowStream((current) => !current)}
            type="button"
          >
            {connectionStatus === 'connected' ? 'Live sync active' : connectionStatus === 'connecting' ? 'Connecting' : 'Sync unavailable'}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1 rounded-xl bg-slate-100 p-1">
          {([
            ['feed', 'Feed'],
            ['sessions', 'Sessions'],
            ['grid', 'Grid'],
            ['audit', 'Audit'],
          ] as const).map(([value, label]) => (
            <button
              className={`rounded-lg px-3 py-2 text-xs font-bold transition ${tab === value ? 'bg-[#084B2B] text-white shadow-sm' : 'text-slate-700 hover:bg-white'}`}
              key={value}
              onClick={() => setTab(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showStream ? (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-emerald-950/10 bg-[#F8FAF7] p-4 text-xs text-slate-700">
          <p className="mb-2 font-black uppercase tracking-wider text-slate-500">Recent event stream</p>
          {logs.slice(0, 5).map((log, index) => (
            <p className="border-t border-emerald-950/10 py-2" key={log.id ?? index}>
              {displayName(log.user_name, log.user_email)} · {actionLabel(log.action)} · {new Date(log.created_at).toLocaleTimeString()}
            </p>
          ))}
        </div>
      ) : null}

      <section className="grid grid-cols-3 gap-2" aria-label="Activity metrics">
        {[
          { icon: MonitorCheck, label: 'Active now', value: activeCount },
          { icon: Users, label: 'Total students', value: students.length },
          { icon: Activity, label: 'Interactions', value: logs.length },
        ].map(({ icon: Icon, label, value }) => (
          <article className="min-w-0 rounded-xl border border-emerald-950/10 bg-white p-3 shadow-sm sm:p-4" key={label}>
            <Icon className="size-4 text-[#084B2B]" aria-hidden="true" />
            <p className="mt-2 text-xl font-black text-slate-900 sm:text-2xl">{value}</p>
            <p className="truncate text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs">{label}</p>
          </article>
        ))}
      </section>

      {tab === 'feed' ? (
        <div className="space-y-2">
          {logs.slice(0, 50).map((log, index) => (
            <button
              className="flex w-full min-w-0 items-start gap-3 rounded-xl border border-emerald-950/10 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              key={log.id ?? index}
              onClick={() => setSelectedStudent(log.user_email)}
              type="button"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 font-black text-[#084B2B]">
                {displayName(log.user_name, log.user_email).charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-bold text-slate-900">{displayName(log.user_name, log.user_email)}</span>
                <span className="mt-1 block truncate text-xs text-slate-600">{actionLabel(log.action)}</span>
              </span>
              <span className="shrink-0 text-[10px] text-slate-500">{timeAgo(log.created_at)}</span>
            </button>
          ))}
          {!logs.length ? <EmptyState label="No recent activity yet." /> : null}
        </div>
      ) : null}

      {tab === 'sessions' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {sessions.map((session, index) => (
            <article className="rounded-xl border border-emerald-950/10 bg-white p-4 shadow-sm" key={session.id ?? index}>
              <div className="flex items-center justify-between gap-3">
                <p className="min-w-0 truncate font-bold text-slate-900">{namesByKey.get(session.user_email) ?? username(session.user_email)}</p>
                <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${session.is_idle ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>{session.is_idle ? 'Idle' : 'Active'}</span>
              </div>
              <p className="mt-2 truncate text-xs text-slate-600">{session.current_page || '/dashboard'}</p>
              <p className="mt-1 text-[10px] text-slate-500">Last seen {timeAgo(session.last_active_at)}</p>
            </article>
          ))}
          {!sessions.length ? <EmptyState label="No active sessions." /> : null}
        </div>
      ) : null}

      {tab === 'grid' ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((student) => (
            <button
              className="rounded-xl border border-emerald-950/10 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md"
              key={student.key}
              onClick={() => setSelectedStudent(student.key)}
              type="button"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 font-black text-[#084B2B]">{student.displayName.charAt(0).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-900">{student.displayName}</span>
                  <span className="block text-xs text-slate-500">{timeAgo(student.lastSeen)}</span>
                </span>
              </div>
              <span className={`mt-3 inline-flex rounded-full border px-2 py-1 text-[10px] font-bold ${actionClass(student.lastAction)}`}>{actionLabel(student.lastAction)}</span>
              <span className="mt-3 grid grid-cols-3 gap-2 text-center text-xs text-slate-600">
                <span>{student.completions} lessons</span>
                <span>{student.pdfReads} PDFs</span>
                <span>{student.videoWatches} videos</span>
              </span>
            </button>
          ))}
          {!students.length ? <EmptyState label="No students in the activity grid." /> : null}
        </div>
      ) : null}

      {tab === 'audit' ? (
        <div className="space-y-3">
          <div className="flex flex-col gap-2 rounded-xl border border-emerald-950/10 bg-white p-3 shadow-sm sm:flex-row">
            <label className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input className="h-11 w-full rounded-xl border border-emerald-950/10 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" onChange={(event) => setAuditSearch(event.target.value)} placeholder="Search student or action" value={auditSearch} />
            </label>
            <select className="h-11 rounded-xl border border-emerald-950/10 bg-white px-3 text-sm font-semibold text-slate-900" onChange={(event) => setAuditAction(event.target.value)} value={auditAction}>
              <option value="">All actions</option>
              {actions.map((action) => <option key={action} value={action}>{actionLabel(action)}</option>)}
            </select>
            <button className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-[#084B2B] hover:bg-emerald-100" onClick={exportCsv} type="button"><Download className="size-4" /> Export</button>
          </div>
          <div className="overflow-hidden rounded-xl border border-emerald-950/10 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-xs text-slate-700">
                <thead className="bg-[#F8FAF7] text-[10px] uppercase tracking-wider text-slate-500"><tr><th className="p-3">Time</th><th className="p-3">Student name</th><th className="p-3">Action summary</th><th className="p-3">Page</th></tr></thead>
                <tbody className="divide-y divide-emerald-950/10">
                  {filteredLogs.slice(0, 100).map((log, index) => (
                    <tr className="hover:bg-[#F8FAF7]" key={log.id ?? index}>
                      <td className="whitespace-nowrap p-3 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="p-3 font-bold text-slate-900">{displayName(log.user_name, log.user_email)}</td>
                      <td className="p-3">{actionLabel(log.action)}</td>
                      <td className="max-w-40 truncate p-3 text-slate-500">{log.url || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[200] flex justify-end bg-slate-950/30" onClick={() => setSelectedStudent(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-emerald-950/10 bg-white p-5 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-900"><CircleUserRound className="size-5 text-[#084B2B]" /> Student activity</h3>
              <button aria-label="Close student activity" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" onClick={() => setSelectedStudent(null)} type="button"><X className="size-5" /></button>
            </div>
            <div className="mt-6 rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-4 text-center">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-black text-[#084B2B]">{selected.displayName.charAt(0).toUpperCase()}</span>
              <h4 className="mt-3 font-black text-slate-900">{selected.displayName}</h4>
              <p className="mt-1 text-xs text-slate-600">{selected.city}, {selected.country}</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {[['Completions', selected.completions], ['Logins', selected.logins], ['PDFs read', selected.pdfReads], ['Videos', selected.videoWatches]].map(([label, value]) => (
                <div className="rounded-xl border border-emerald-950/10 bg-white p-3 text-center shadow-sm" key={label}><p className="text-xl font-black text-slate-900">{value}</p><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p></div>
              ))}
            </div>
            <h5 className="mt-6 text-xs font-black uppercase tracking-wider text-slate-500">Recent actions</h5>
            <div className="mt-2 space-y-2">
              {logs.filter((log) => log.user_email === selected.key).slice(0, 20).map((log, index) => (
                <div className="rounded-xl border border-emerald-950/10 bg-white p-3" key={log.id ?? index}><p className="font-bold text-slate-900">{actionLabel(log.action)}</p><p className="mt-1 text-xs text-slate-500">{timeAgo(log.created_at)}</p></div>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="col-span-full rounded-xl border border-dashed border-slate-300 bg-[#F8FAF7] p-8 text-center text-sm text-slate-600">
      {label}
    </div>
  );
}
