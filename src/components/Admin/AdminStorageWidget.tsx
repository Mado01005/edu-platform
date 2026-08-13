import Link from 'next/link';
import { ArrowRight, Database, Files } from 'lucide-react';

interface AdminStorageWidgetProps {
  fileCount: number;
  quotaBytes: number;
  totalBytes: number;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export function AdminStorageWidget({
  fileCount,
  quotaBytes,
  totalBytes,
}: AdminStorageWidgetProps) {
  const percent = (totalBytes / quotaBytes) * 100;
  const barTone =
    percent >= 90
      ? 'bg-red-400'
      : percent >= 70
        ? 'bg-amber-300'
        : 'bg-emerald-400';
  const statusTone =
    percent >= 90
      ? 'text-red-700'
      : percent >= 70
        ? 'text-amber-700'
        : 'text-emerald-700';

  return (
    <Link
      className="group flex min-w-0 flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 text-slate-900 shadow-sm shadow-slate-200/50 transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50 hover:shadow-md"
      href="/admin/storage"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
          <Database className="size-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-black uppercase tracking-[0.18em] text-sky-700">
            R2 storage
          </span>
          <span className="mt-1 block truncate text-lg font-black">
            {formatBytes(totalBytes)} used
          </span>
        </span>
        <ArrowRight className="size-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-sky-700" />
      </div>
      <div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full ${barTone}`}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <span
          className={`mt-2 flex items-center gap-2 text-xs font-bold ${statusTone}`}
        >
          <Files className="size-3.5" aria-hidden="true" />
          {fileCount.toLocaleString()} objects · {percent.toFixed(2)}% of{' '}
          {formatBytes(quotaBytes)}
        </span>
      </div>
    </Link>
  );
}
