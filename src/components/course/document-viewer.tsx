'use client';

import { FileText } from 'lucide-react';

function safeDocumentUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export function DocumentViewer({ fileType, title, url }: { fileType: string; title: string; url: string }) {
  const documentUrl = safeDocumentUrl(url);
  if (!documentUrl) {
    return <div className="flex min-h-56 items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">This document URL is unavailable.</div>;
  }

  const normalizedType = fileType.toUpperCase();
  const viewerUrl = normalizedType === 'PDF'
    ? `${documentUrl}#toolbar=0&navpanes=0&scrollbar=1`
    : [
        'DOC',
        'DOCX',
        'PPT',
        'PPTX',
        'SLIDES',
        'WORKSHEET',
        'XLS',
        'XLSX',
      ].includes(normalizedType)
      ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`
      : null;

  if (!viewerUrl) {
    return <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-[#F8FAF7] p-6 text-center text-sm text-slate-600"><FileText className="size-8 text-[#084B2B]" />This file type does not have a protected in-app preview.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-950/10 bg-white shadow-sm">
      <iframe
        className="w-full border-0 bg-white"
        loading="lazy"
        referrerPolicy="no-referrer"
        src={viewerUrl}
        style={{ height: '70dvh', minHeight: '28rem' }}
        title={`Document viewer: ${title}`}
      />
      <p className="border-t border-emerald-950/10 bg-[#F8FAF7] px-3 py-2 text-center text-xs text-slate-500">Protected in-app reading view · sharing and downloads are disabled in the course interface</p>
    </div>
  );
}
