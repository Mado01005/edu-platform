'use client';

import type {
  PDFDocumentLoadingTask,
  PDFDocumentProxy,
  RenderTask,
} from 'pdfjs-dist';
import { Download, FileText, Loader2, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function safeDocumentUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function PdfPage({
  document,
  pageNumber,
  watermark,
}: {
  document: PDFDocumentProxy;
  pageNumber: number;
  watermark: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let renderTask: RenderTask | null = null;

    void document
      .getPage(pageNumber)
      .then((page) => {
        if (cancelled || !canvasRef.current) return;
        const viewport = page.getViewport({ scale: 1.4 });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d', { alpha: false });
        if (!context) throw new Error('Canvas is unavailable.');
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
        renderTask = page.render({
          canvas,
          canvasContext: context,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
          viewport,
        });
        return renderTask.promise;
      })
      .catch((caught: unknown) => {
        if (
          !cancelled &&
          (!(caught instanceof Error) || caught.name !== 'RenderingCancelledException')
        ) {
          setError(true);
        }
      });

    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  }, [document, pageNumber]);

  if (error) {
    return (
      <div className="flex min-h-48 items-center justify-center rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Page {pageNumber} could not be rendered.
      </div>
    );
  }

  return (
    <figure className="relative mx-auto w-full max-w-4xl overflow-hidden rounded-xl border border-emerald-950/10 bg-white" aria-label={`PDF page ${pageNumber}`}>
      <canvas className="block h-auto w-full" ref={canvasRef} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 grid select-none grid-rows-4 overflow-hidden opacity-[0.12]">
        {Array.from({ length: 4 }, (_, index) => (
          <span className="flex -rotate-[24deg] items-center justify-center whitespace-nowrap text-[clamp(10px,2vw,18px)] font-black tracking-wide text-[#042D1A]" key={index}>
            {watermark}
          </span>
        ))}
      </div>
      <figcaption className="absolute bottom-2 right-2 rounded-full bg-white/85 px-2 py-1 text-[10px] font-bold text-slate-500">
        Page {pageNumber}
      </figcaption>
    </figure>
  );
}

function ProtectedPdfViewer({
  downloadHref,
  title,
  url,
  watermark,
}: {
  downloadHref?: string;
  title: string;
  url: string;
  watermark: string;
}) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let disposed = false;
    let loadingTask: PDFDocumentLoadingTask | null = null;
    void import('pdfjs-dist')
      .then((pdfjs) => {
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url,
        ).toString();
        loadingTask = pdfjs.getDocument({ url });
        return loadingTask.promise;
      })
      .then((pdf) => {
        if (!disposed) setDocument(pdf);
      })
      .catch(() => {
        if (!disposed) setError('This protected PDF could not be loaded.');
      });
    return () => {
      disposed = true;
      void loadingTask?.destroy();
    };
  }, [url]);

  useEffect(() => {
    const blockPrintShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setError('Printing is disabled for protected course documents.');
      }
    };
    window.addEventListener('keydown', blockPrintShortcut, { capture: true });
    return () => window.removeEventListener('keydown', blockPrintShortcut, { capture: true });
  }, []);

  return (
    <section
      className="protected-document overflow-hidden rounded-xl border border-emerald-950/10 bg-[#F8FAF8] shadow-sm print:hidden"
      onContextMenu={(event) => event.preventDefault()}
    >
      <header className="flex min-w-0 items-center gap-3 border-b border-emerald-950/10 bg-white px-3 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#084B2B]"><ShieldCheck className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-slate-900">{title}</span>
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Canvas protected · personalized watermark</span>
        </span>
        {downloadHref ? (
          <a className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl bg-[#084B2B] px-3 text-xs font-black text-white hover:bg-[#0F6E41]" href={downloadHref}>
            <Download className="size-4" /> <span className="hidden sm:inline">Download worksheet</span>
          </a>
        ) : null}
      </header>
      {error ? <p aria-live="polite" className="border-b border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      {!document && !error ? (
        <div className="flex min-h-64 items-center justify-center gap-2 text-sm font-bold text-[#084B2B]"><Loader2 className="size-5 animate-spin" /> Rendering protected document…</div>
      ) : null}
      {document ? (
        <div className="flex max-h-[75dvh] select-none flex-col gap-4 overflow-y-auto p-2 sm:p-4" style={{ WebkitUserSelect: 'none' }}>
          {Array.from({ length: document.numPages }, (_, index) => (
            <PdfPage document={document} key={index + 1} pageNumber={index + 1} watermark={watermark} />
          ))}
        </div>
      ) : null}
      <p className="border-t border-emerald-950/10 bg-white px-3 py-2 text-center text-xs text-slate-500">
        Right-click, text selection, and printing are disabled. Screen capture cannot be fully prevented by a web browser.
      </p>
    </section>
  );
}

export function DocumentViewer({
  downloadHref,
  fileType,
  title,
  url,
  watermark = 'Oqool Academy — Guest Preview',
}: {
  downloadHref?: string;
  fileType: string;
  title: string;
  url: string;
  watermark?: string;
}) {
  const documentUrl = safeDocumentUrl(url);
  if (!documentUrl) {
    return <div className="flex min-h-56 items-center justify-center rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">This document URL is unavailable.</div>;
  }

  const normalizedType = fileType.toUpperCase();
  if (normalizedType === 'PDF') {
    return <ProtectedPdfViewer downloadHref={downloadHref} title={title} url={documentUrl} watermark={watermark} />;
  }

  const viewerUrl = [
    'DOC', 'DOCX', 'PPT', 'PPTX', 'SLIDES', 'WORKSHEET', 'XLS', 'XLSX',
  ].includes(normalizedType)
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(documentUrl)}`
    : null;
  if (!viewerUrl) {
    return <div className="flex min-h-56 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-[#F8FAF8] p-6 text-center text-sm text-slate-600"><FileText className="size-8 text-[#084B2B]" />This file type does not have a protected in-app preview.</div>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-emerald-950/10 bg-white shadow-sm">
      <iframe className="w-full border-0 bg-white" loading="lazy" referrerPolicy="no-referrer" src={viewerUrl} style={{ height: '70dvh', minHeight: '28rem' }} title={`Document viewer: ${title}`} />
      <p className="border-t border-emerald-950/10 bg-[#F8FAF8] px-3 py-2 text-center text-xs text-slate-500">Protected in-app reading view</p>
    </div>
  );
}
