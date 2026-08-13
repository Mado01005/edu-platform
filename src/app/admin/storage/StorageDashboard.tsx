'use client';

import { useMemo, useState } from 'react';
import {
  Database,
  FileText,
  Files,
  Film,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
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
import { Input } from '@/components/UI/input';

type AssetCategory = 'VIDEO' | 'PDF' | 'IMAGE' | 'OTHER';

interface StorageAsset {
  category: AssetCategory;
  contentType: string;
  key: string;
  lastModified: string | null;
  name: string;
  publicUrl: string;
  size: number;
}

export interface StorageDashboardSnapshot {
  documentBytes: number;
  fileCount: number;
  imageBytes: number;
  otherBytes: number;
  quotaBytes: number;
  recentAssets: StorageAsset[];
  totalBytes: number;
  usagePercent: number;
  videoBytes: number;
}

interface StorageDashboardProps {
  initialSnapshot: StorageDashboardSnapshot;
}

const FILTERS = [
  { label: 'All', value: 'ALL' },
  { label: 'Videos', value: 'VIDEO' },
  { label: 'PDFs', value: 'PDF' },
  { label: 'Images', value: 'IMAGE' },
  { label: 'Other', value: 'OTHER' },
] as const;

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

function categoryTone(category: AssetCategory) {
  if (category === 'VIDEO') return 'bg-violet-50 text-violet-700';
  if (category === 'PDF') return 'bg-amber-50 text-amber-700';
  if (category === 'IMAGE') return 'bg-sky-50 text-sky-700';
  return 'bg-slate-100 text-slate-600';
}

function categoryIcon(category: AssetCategory) {
  if (category === 'VIDEO') return Film;
  if (category === 'PDF') return FileText;
  if (category === 'IMAGE') return ImageIcon;
  return MoreHorizontal;
}

function storageHealth(percent: number) {
  if (percent >= 90) {
    return {
      bar: 'bg-red-400',
      label: 'Critical — free-tier limit nearly reached',
      text: 'text-red-700',
    };
  }
  if (percent >= 70) {
    return {
      bar: 'bg-amber-300',
      label: 'Warning — review large assets',
      text: 'text-amber-700',
    };
  }
  return {
    bar: 'bg-emerald-400',
    label: 'Healthy free-tier usage',
    text: 'text-emerald-700',
  };
}

export function StorageDashboard({
  initialSnapshot,
}: StorageDashboardProps) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['value']>(
    'ALL',
  );
  const [query, setQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<StorageAsset | null>(null);
  const [pendingKey, setPendingKey] = useState('');
  const [notice, setNotice] = useState<{
    message: string;
    type: 'error' | 'success';
  } | null>(null);

  const visibleAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return snapshot.recentAssets.filter(
      (asset) =>
        (filter === 'ALL' || asset.category === filter) &&
        (!normalizedQuery ||
          asset.name.toLowerCase().includes(normalizedQuery) ||
          asset.key.toLowerCase().includes(normalizedQuery)),
    );
  }, [filter, query, snapshot.recentAssets]);

  async function deleteAsset() {
    if (!deleteTarget) return;
    setPendingKey(deleteTarget.key);
    setNotice(null);

    try {
      const response = await fetch('/api/admin/storage', {
        body: JSON.stringify({ key: deleteTarget.key }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
      });
      const result = (await response.json()) as {
        error?: string;
        removedReferences?: number;
      };

      if (!response.ok) {
        throw new Error(result.error ?? 'Unable to delete this asset.');
      }

      setSnapshot((current) => {
        const size = deleteTarget.size;
        const next = {
          ...current,
          fileCount: Math.max(0, current.fileCount - 1),
          recentAssets: current.recentAssets.filter(
            (asset) => asset.key !== deleteTarget.key,
          ),
          totalBytes: Math.max(0, current.totalBytes - size),
        };

        if (deleteTarget.category === 'VIDEO') {
          next.videoBytes = Math.max(0, current.videoBytes - size);
        } else if (deleteTarget.category === 'PDF') {
          next.documentBytes = Math.max(0, current.documentBytes - size);
        } else if (deleteTarget.category === 'IMAGE') {
          next.imageBytes = Math.max(0, current.imageBytes - size);
        } else {
          next.otherBytes = Math.max(0, current.otherBytes - size);
        }
        next.usagePercent = (next.totalBytes / next.quotaBytes) * 100;
        return next;
      });
      setNotice({
        message: `Deleted ${deleteTarget.name} and removed ${result.removedReferences ?? 0} database reference(s).`,
        type: 'success',
      });
      setDeleteTarget(null);
    } catch (error) {
      setNotice({
        message:
          error instanceof Error
            ? error.message
            : 'Unable to delete this asset.',
        type: 'error',
      });
    } finally {
      setPendingKey('');
    }
  }

  const metrics = [
    {
      icon: Database,
      label: 'Bucket usage',
      tone: 'bg-emerald-50 text-emerald-700',
      value: `${formatBytes(snapshot.totalBytes)} / ${formatBytes(
        snapshot.quotaBytes,
      )}`,
    },
    {
      icon: Files,
      label: 'Total uploads',
      tone: 'bg-slate-100 text-slate-700',
      value: snapshot.fileCount.toLocaleString(),
    },
    {
      icon: Film,
      label: 'Video storage',
      tone: 'bg-violet-50 text-violet-700',
      value: formatBytes(snapshot.videoBytes),
    },
    {
      icon: FileText,
      label: 'Document storage',
      tone: 'bg-amber-50 text-amber-700',
      value: formatBytes(snapshot.documentBytes),
    },
  ] as const;
  const health = storageHealth(snapshot.usagePercent);

  return (
    <>
      <section
        aria-label="R2 storage metrics"
        className="grid min-w-0 grid-cols-2 gap-3"
      >
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <article
              className="card-hover min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50"
              key={metric.label}
            >
              <span
                className={`flex size-9 items-center justify-center rounded-xl ${metric.tone}`}
              >
                <Icon className="size-4" aria-hidden="true" />
              </span>
              <p className="mt-4 break-words text-xl font-black">
                {metric.value}
              </p>
              <p className="mt-1 text-xs font-bold text-slate-500">
                {metric.label}
              </p>
            </article>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm shadow-slate-200/50">
        <div className="flex min-w-0 items-end justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-sm font-black">Storage threshold</span>
            <span className="mt-1 block text-xs text-slate-500">
              {formatBytes(snapshot.totalBytes)} of{' '}
              {formatBytes(snapshot.quotaBytes)}
            </span>
          </span>
          <span
            className={`shrink-0 font-mono text-lg font-black ${health.text}`}
          >
            {snapshot.usagePercent.toFixed(2)}%
          </span>
        </div>
        <div
          aria-label={`${snapshot.usagePercent.toFixed(2)} percent of configured storage quota used`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.min(snapshot.usagePercent, 100)}
          className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
        >
          <div
            className={`h-full rounded-full transition-all ${health.bar}`}
            style={{ width: `${Math.min(snapshot.usagePercent, 100)}%` }}
          />
        </div>
        <p className={`mt-3 text-xs font-black ${health.text}`}>
          {health.label}
        </p>
        <p className="mt-1 text-[11px] leading-5 text-slate-500">
          Compared with Cloudflare R2 Standard&apos;s 10 GB-month free-tier
          allowance. This gauge shows current object bytes, not monthly billing
          averages.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <span className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-slate-600">
            Images <b className="block text-slate-900">{formatBytes(snapshot.imageBytes)}</b>
          </span>
          <span className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 text-slate-600">
            Other <b className="block text-slate-900">{formatBytes(snapshot.otherBytes)}</b>
          </span>
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-3 rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50">
        <div>
          <h2 className="text-lg font-black">Recent assets</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Inspect up to 100 of the latest bucket objects. Deletion also
            clears matching PostgreSQL references.
          </p>
        </div>

        {notice ? (
          <div
            className={`rounded-xl border p-3 text-xs font-bold leading-5 ${
              notice.type === 'success'
                ? 'border-emerald-200/80 bg-emerald-50 text-emerald-800'
                : 'border-red-200/80 bg-red-50 text-red-700'
            }`}
            role={notice.type === 'success' ? 'status' : 'alert'}
          >
            {notice.message}
          </div>
        ) : null}

        <label className="text-xs font-black text-slate-600">
          Search object name or key
          <Input
            className="mt-2"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recent assets"
            type="search"
            value={query}
          />
        </label>

        <div className="grid grid-cols-3 gap-2">
          {FILTERS.map((option) => (
            <Button
              className="px-2 text-xs"
              key={option.value}
              onClick={() => setFilter(option.value)}
              size="sm"
              variant={filter === option.value ? 'default' : 'outline'}
            >
              {option.label}
            </Button>
          ))}
        </div>

        <div aria-label="R2 uploads inspection table" role="table">
          <div className="sr-only" role="row">
            <span role="columnheader">Asset</span>
            <span role="columnheader">Type</span>
            <span role="columnheader">Size</span>
            <span role="columnheader">Uploaded</span>
            <span role="columnheader">Actions</span>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {visibleAssets.length ? (
              visibleAssets.map((asset) => {
                const Icon = categoryIcon(asset.category);
                return (
                  <article
                    className="card-hover min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-200/50"
                    key={asset.key}
                    role="row"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${categoryTone(asset.category)}`}
                      >
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1" role="cell">
                        <a
                          className="block truncate text-sm font-black text-slate-900 hover:text-sky-700 hover:underline"
                          href={asset.publicUrl}
                          rel="noopener noreferrer"
                          target="_blank"
                        >
                          {asset.name}
                        </a>
                        <span className="mt-1 block break-all font-mono text-[10px] leading-4 text-slate-500">
                          {asset.key}
                        </span>
                      </span>
                      <Button
                        aria-label={`Delete ${asset.name}`}
                        disabled={pendingKey === asset.key}
                        onClick={() => setDeleteTarget(asset)}
                        size="icon"
                        variant="ghost"
                      >
                        {pendingKey === asset.key ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                      <span
                        className="rounded-xl border border-slate-200/80 bg-slate-50 p-3"
                        role="cell"
                      >
                        <span className="block text-slate-500">Type</span>
                        <span className="mt-1 block truncate font-bold text-slate-700">
                          {asset.contentType}
                        </span>
                      </span>
                      <span
                        className="rounded-xl border border-slate-200/80 bg-slate-50 p-3"
                        role="cell"
                      >
                        <span className="block text-slate-500">Size</span>
                        <span className="mt-1 block font-bold text-slate-700">
                          {formatBytes(asset.size)}
                        </span>
                      </span>
                      <span
                        className="col-span-2 rounded-xl border border-slate-200/80 bg-slate-50 p-3"
                        role="cell"
                      >
                        <span className="block text-slate-500">Uploaded</span>
                        <span className="mt-1 block font-bold text-slate-700">
                          {asset.lastModified
                            ? new Intl.DateTimeFormat('en', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(asset.lastModified))
                            : 'Unknown'}
                        </span>
                      </span>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
                No recent assets match this filter.
              </p>
            )}
          </div>
        </div>
      </section>

      <Dialog
        onOpenChange={(open) => {
          if (!open && !pendingKey) setDeleteTarget(null);
        }}
        open={Boolean(deleteTarget)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this R2 asset?</DialogTitle>
            <DialogDescription>
              {deleteTarget
                ? `${deleteTarget.name} will be permanently removed from Cloudflare R2. Matching LMS lesson, course, profile, and legacy content references will be cleared from PostgreSQL.`
                : 'This asset will be permanently removed.'}
            </DialogDescription>
          </DialogHeader>
          <p className="break-all rounded-xl border border-slate-200/80 bg-slate-50 p-3 font-mono text-[11px] leading-5 text-slate-600">
            {deleteTarget?.key}
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={Boolean(pendingKey)} variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button
              disabled={Boolean(pendingKey)}
              onClick={() => void deleteAsset()}
              variant="destructive"
            >
              {pendingKey ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
              {pendingKey ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
