'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SubjectMeta, LessonMeta } from '@/types';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// ── Types ──

type UploadStatus = 'pending' | 'converting' | 'initiating' | 'uploading' | 'completing' | 'success' | 'failed';

interface FileUploadState {
  id: string;
  file: File;
  relativeFilePath: string;
  status: UploadStatus;
  progress: number;
  retries: number;
  error?: string;
  publicUrl?: string;
  abortController?: AbortController;
  subjectId?: string;
  lessonId?: string;
  subjectSlug?: string;
  lessonSlug?: string;
}

interface ContentUploaderProps {
  selectedSubjectId: string;
  selectedLessonId?: string;
  currentPathId?: string;
  currentPath?: string;
  onComplete: () => void;
  localSubjects?: SubjectMeta[];
  activeLessons?: LessonMeta[];
  subjectSlug?: string;
  lessonSlug?: string;
  variant?: 'full' | 'compact';
}

// ── Constants ──

const UNSUPPORTED_IMAGE_EXTENSIONS = ['.heic', '.heif'];
const RAW_IMAGE_EXTENSIONS = ['.dng', '.raw'];
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const MAX_CONCURRENT_UPLOADS = 5;
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // exponential backoff
const MULTIPART_CHUNK_SIZE = 50 * 1024 * 1024; // 50MB — files larger than this use multipart
const MULTIPART_PART_SIZE = 10 * 1024 * 1024; // 10MB per part

function isUnsupportedImage(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return UNSUPPORTED_IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function isRawImage(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return RAW_IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

// ── Helpers ──

function generateIdempotencyKey(file: File, relativePath: string): string {
  const raw = `${file.name}|${file.size}|${file.lastModified}|${relativePath}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `ik_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

function getFileType(mime: string, fileName?: string): string {
  const m = mime.toLowerCase();
  const f = (fileName || '').toLowerCase();
  if (m.includes('pdf') || f.endsWith('.pdf')) return 'pdf';
  if (m.includes('image') || f.endsWith('.webp') || f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png') || f.endsWith('.gif')) return 'image';
  if (m.includes('video') || f.endsWith('.mp4') || f.endsWith('.mov')) return 'video';
  if (m.includes('presentationml') || m.includes('powerpoint') || f.endsWith('.pptx') || f.endsWith('.ppt')) return 'powerpoint';
  if (m.includes('wordprocessingml') || m.includes('msword') || f.endsWith('.docx') || f.endsWith('.doc')) return 'powerpoint'; // Unified office doc type for now or add 'document'
  return 'unknown';
}

function sanitizePath(path: string): string {
  // Normalize extension to lowercase for engine compatibility (e.g. PPTX -> pptx)
  const parts = path.split('.');
  if (parts.length > 1) {
    const ext = parts.pop()?.toLowerCase();
    const base = parts.join('.');
    const sanitizedBase = base
      .replace(/[^a-zA-Z0-9./_\-]/g, '_') // replace unsafe chars AND SPACES with _ but keep /
      .replace(/\/+/g, '/')                 // collapse slashes
      .trim();
    return `${sanitizedBase}.${ext}`;
  }

  return path
    .replace(/[^a-zA-Z0-9./_\-]/g, '_')
    .replace(/\/+/g, '/')
    .trim();
}

// ── Component ──

export default function ContentUploader({
  selectedSubjectId,
  selectedLessonId,
  currentPathId,
  currentPath = '',
  onComplete,
  localSubjects = [],
  activeLessons = [],
  subjectSlug,
  lessonSlug,
  variant = 'full'
}: ContentUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [inputType, setInputType] = useState<'file' | 'link' | 'snippet'>('file');

  const [isMegaAdmin, setIsMegaAdmin] = useState(false);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClientComponentClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email === 'abdallahsaad2150@gmail.com') {
        setIsMegaAdmin(true);
      }
      setIsSessionLoading(false);
    };
    checkSession();
  }, []);

  // Dynamic limits
  const currentMaxFileSize = isMegaAdmin ? 5 * 1024 * 1024 * 1024 : MAX_FILE_SIZE; // 5GB for Mega, 500MB normal
  const currentMaxConcurrent = isMegaAdmin ? 50 : MAX_CONCURRENT_UPLOADS;

  const [vimeoUrl, setVimeoUrl] = useState('');
  const [vimeoTitle, setVimeoTitle] = useState('');
  const [snippetContent, setSnippetContent] = useState('');
  const [snippetLanguage, setSnippetLanguage] = useState('javascript');
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [uploadQueue, setUploadQueue] = useState<FileUploadState[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState(false);

  // Abort controller for the entire batch
  const batchAbortRef = useRef<AbortController | null>(null);
  // Ref to track active XHR abort functions
  const xhrAbortersRef = useRef<Map<string, () => void>>(new Map());

  // P4.0: Warn user before closing tab during active uploads (orphan mitigation)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (uploading) {
        e.preventDefault();
        // Chrome requires returnValue to be set
        e.returnValue = 'Upload in progress. Closing now will leave orphaned files in storage.';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [uploading]);

  useEffect(() => {
    const aborters = xhrAbortersRef.current;
    const batchController = batchAbortRef.current;
    return () => {
      // Abort all active XHR requests on unmount
      aborters.forEach(abort => abort());
      aborters.clear();
      // Abort the batch
      batchController?.abort();
    };
  }, []);

  const convertToWebSafe = useCallback(async (file: File): Promise<File> => {
    // If it's a RAW image, we handle it AFTER the R2 upload to avoid CORS issues
    if (isRawImage(file.name)) return file;
    if (!isUnsupportedImage(file.name)) return file;

    const newName = file.name.replace(/\.[^/.]+$/, '') + '.webp';

    try {
      const heic2any = (await import('heic2any')).default;
      const result = await heic2any({ blob: file, toType: 'image/webp', quality: 0.85 });
      const blob = Array.isArray(result) ? result[0] : result;
      return new File([blob], newName, { type: 'image/webp' });
    } catch {
      // fall through to canvas
    }

    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');
      ctx.drawImage(bitmap, 0, 0);
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('Canvas toBlob returned null')),
          'image/webp',
          0.85
        );
      });
      bitmap.close();
      return new File([webpBlob], newName, { type: 'image/webp' });
    } catch {
      throw new Error(
        `Cannot convert ${file.name} to a web-safe format. Please convert it to .jpg or .png manually.`
      );
    }
  }, []);

  const uploadFileToR2 = useCallback((
    file: File,
    signedUrl: string,
    contentType: string,
    fileId: string,
    onProgress: (pct: number, speed: string) => void
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const startTime = Date.now();
      let lastLoaded = 0;
      let lastTime = startTime;

      // Register abort handler
      const abortFn = () => xhr.abort();
      xhrAbortersRef.current.set(fileId, abortFn);

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const pct = (event.loaded / event.total) * 100;
          const now = Date.now();
          const elapsed = (now - lastTime) / 1000;
          let speed = '0 MB/s';
          if (elapsed > 0.5) {
            const bps = (event.loaded - lastLoaded) / elapsed;
            speed = (bps / (1024 * 1024)).toFixed(2) + ' MB/s';
            lastLoaded = event.loaded;
            lastTime = now;
          }
          onProgress(pct, speed);
        }
      };

      xhr.onload = () => {
        xhrAbortersRef.current.delete(fileId);
        if (xhr.status >= 200 && xhr.status < 300) {
          console.log(`[XHR SUCCESS] ${file.name} uploaded successfully.`);
          resolve();
        } else {
          reject(new Error(`R2 Rejection (${xhr.status})${xhr.status === 403 ? ' — Signature mismatch or CORS block.' : ''}`));
        }
      };

      xhr.onerror = () => {
        xhrAbortersRef.current.delete(fileId);
        reject(new Error('Network Error / CORS Block. Ensure R2 CORS rules allow PUT requests from this origin.'));
      };

      xhr.onabort = () => {
        xhrAbortersRef.current.delete(fileId);
        reject(new DOMException('Aborted', 'AbortError'));
      };

      xhr.open('PUT', signedUrl, true);
      xhr.setRequestHeader('Content-Type', contentType || 'application/octet-stream');

      try {
        xhr.send(file);
      } catch (err) {
        xhrAbortersRef.current.delete(fileId);
        reject(new Error(`xhr.send failed: ${err instanceof Error ? err.message : String(err)}`));
      }
    });
  }, []);

  // ── P3.1: Multipart upload for files > 50MB ──
  const uploadMultipartFile = useCallback(async (
    file: File,
    fileId: string,
    sSlug: string,
    lSlug: string,
    relativeFilePath: string
  ): Promise<{ publicUrl: string; fileName: string }> => {
    const totalParts = Math.ceil(file.size / MULTIPART_PART_SIZE);
    const contentType = file.type || 'application/octet-stream';

    // Step 1: Init multipart
    console.log(`Step 2: Requesting presigned URL... (Multipart initialization)`);
    const initRes = await fetch('/api/admin/upload-multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'init',
        fileName: file.name,
        relativeFilePath,
        subjectSlug: sSlug,
        lessonSlug: lSlug,
        contentType,
        subfolder: currentPath.trim() || undefined,
        totalParts,
        size: file.size,
      }),
      signal: batchAbortRef.current?.signal
    });

    if (!initRes.ok) throw new Error(`Multipart init failed (${initRes.status})`);
    const { uploadId, key, partUrls, publicUrl } = await initRes.json();

    // Step 2: Upload parts with sliding window concurrency (3 at a time)
    const parts: { ETag: string; PartNumber: number }[] = new Array(totalParts);
    const PART_CONCURRENCY = 3;

    for (let i = 0; i < totalParts; i += PART_CONCURRENCY) {
      if (batchAbortRef.current?.signal.aborted) {
        await fetch('/api/admin/upload-multipart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'abort', key, uploadId })
        }).catch(() => { });
        throw new DOMException('Aborted', 'AbortError');
      }

      const windowEnd = Math.min(i + PART_CONCURRENCY, totalParts);
      const partPromises = [];

      for (let j = i; j < windowEnd; j++) {
        const partIndex = j;
        const start = partIndex * MULTIPART_PART_SIZE;
        const end = Math.min(start + MULTIPART_PART_SIZE, file.size);
        const chunk = file.slice(start, end);
        const partUrl = partUrls[partIndex]?.url;
        if (!partUrl) throw new Error(`No presigned URL for part ${partIndex + 1}`);

        const partPromise = new Promise<{ ETag: string; PartNumber: number }>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const partId = `${fileId}_part_${partIndex + 1}`;
          const abortFn = () => xhr.abort();
          xhrAbortersRef.current.set(partId, abortFn);

          xhr.upload.onprogress = (event) => {
            const pct = ((start + event.loaded) / file.size) * 100;
            const MathRoundPct = Math.round(pct);
            setUploadProgress(prev => {
              if (prev[fileId] === MathRoundPct) return prev;
              return { ...prev, [fileId]: Math.max(prev[fileId] || 0, MathRoundPct) };
            });
          };

          xhr.onload = () => {
            xhrAbortersRef.current.delete(partId);
            if (xhr.status >= 200 && xhr.status < 300) {
              const etagHeader = xhr.getResponseHeader('ETag') || `""`;
              resolve({ ETag: etagHeader.replace(/"/g, ''), PartNumber: partIndex + 1 });
            } else {
              reject(new Error(`Part ${partIndex + 1} failed (${xhr.status})`));
            }
          };

          xhr.onerror = () => {
            xhrAbortersRef.current.delete(partId);
            reject(new Error(`Part ${partIndex + 1} network error`));
          };

          xhr.onabort = () => {
            xhrAbortersRef.current.delete(partId);
            reject(new DOMException('Aborted', 'AbortError'));
          };

          xhr.open('PUT', partUrl, true);
          xhr.setRequestHeader('Content-Type', contentType);
          xhr.send(chunk);
        });

        partPromises.push(partPromise);
      }

      const windowResults = await Promise.all(partPromises);
      for (const result of windowResults) {
        parts[result.PartNumber - 1] = result;
      }
    }

    // Step 3: Complete multipart
    const completeRes = await fetch('/api/admin/upload-multipart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', key, uploadId, parts }),
      signal: batchAbortRef.current?.signal
    });

    if (!completeRes.ok) {
      // Try to abort on failure
      await fetch('/api/admin/upload-multipart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'abort', key, uploadId })
      }).catch(() => { });
      throw new Error(`Multipart complete failed (${completeRes.status})`);
    }

    return { publicUrl, fileName: relativeFilePath };
  }, [currentPath]);

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const processSingleFile = useCallback(async (
    fileState: FileUploadState,
    sSlug: string,
    lSlug: string
  ): Promise<FileUploadState> => {
    let file = fileState.file;

    // Step 1: Convert
    fileState.status = 'converting';
    setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));

    try {
      file = await convertToWebSafe(file);
    } catch (err) {
      fileState.status = 'failed';
      fileState.error = err instanceof Error ? err.message : 'Conversion failed';
      return fileState;
    }


    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {

      if (batchAbortRef.current?.signal.aborted) {
        fileState.status = 'failed';
        fileState.error = 'Cancelled by user';
        return fileState;
      }

      if (attempt > 0) {
        fileState.status = 'pending';
        fileState.retries = attempt;
        fileState.error = `Retrying... (${attempt}/${MAX_RETRIES})`;
        setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));
        await sleep(RETRY_DELAYS_MS[attempt - 1]);
      }

      try {

        fileState.status = 'initiating';
        setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));


        const isLargeFile = file.size > MULTIPART_CHUNK_SIZE;
        let publicUrl: string;

        if (isLargeFile) {

          fileState.status = 'uploading';
          fileState.progress = 0;
          setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));

          const result = await uploadMultipartFile(file, fileState.id, sSlug, lSlug, fileState.relativeFilePath);
          publicUrl = result.publicUrl;
        } else {

          console.log(`Step 2: Requesting presigned URL...`);
          const initRes = await fetch('/api/admin/upload-initiate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              relativeFilePath: fileState.relativeFilePath,
              subjectSlug: sSlug,
              lessonSlug: lSlug,
              contentType: file.type || 'application/octet-stream',
              subfolder: currentPath.trim() || undefined,
              size: file.size,
            }),
            signal: batchAbortRef.current?.signal
          });

          if (!initRes.ok) throw new Error(`Initiate failed (${initRes.status})`);
          const { signedUrl, publicUrl: pu } = await initRes.json();
          publicUrl = pu;


          fileState.status = 'uploading';
          fileState.progress = 0;
          setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));

          await uploadFileToR2(file, signedUrl, file.type, fileState.id, (pct) => {
            const MathRoundPct = Math.round(pct);
            setUploadProgress(prev => {
              if (prev[fileState.id] === MathRoundPct) return prev;
              return { ...prev, [fileState.id]: MathRoundPct };
            });
          });
        }


        fileState.publicUrl = publicUrl;

        // --- Post-Upload Conversion for RAW Images ---
        if (isRawImage(file.name)) {
          fileState.status = 'converting';
          setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));

          try {
            // 1. Start Job
            const initRes = await fetch('/api/admin/convert-raw', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: publicUrl })
            });
            if (!initRes.ok) throw new Error('Failed to initiate conversion job.');
            const { jobId } = await initRes.json();

            // 2. Poll Status
            let resultUrl = null;
            let attempts = 0;
            while (attempts < 60) {
              await sleep(2000);
              const statusRes = await fetch(`/api/admin/convert-raw/status?jobId=${jobId}`);
              const statusData = await statusRes.json();
              if (statusData.status === 'error') throw new Error(statusData.message || 'CloudConvert job failed.');
              if (statusData.status === 'finished') {
                resultUrl = statusData.url;
                break;
              }
              attempts++;
            }
            if (!resultUrl) throw new Error('Conversion timed out.');

            // 3. Copy the converted file into R2. CloudConvert export URLs expire.
            const convertedResponse = await fetch(resultUrl, {
              signal: AbortSignal.timeout(60_000),
            });
            if (!convertedResponse.ok) {
              throw new Error('Converted file download failed.');
            }
            const convertedBlob = await convertedResponse.blob();
            const convertedName = file.name.replace(/\.(dng|raw)$/i, '.webp');
            const convertedFile = new File([convertedBlob], convertedName, {
              type: 'image/webp',
            });
            const convertedPath = fileState.relativeFilePath.replace(/\.(dng|raw)$/i, '.webp');
            const convertedInit = await fetch('/api/admin/upload-initiate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileName: convertedName,
                relativeFilePath: convertedPath,
                subjectSlug: sSlug,
                lessonSlug: lSlug,
                contentType: 'image/webp',
                subfolder: currentPath.trim() || undefined,
                size: convertedFile.size,
              }),
              signal: batchAbortRef.current?.signal,
            });
            if (!convertedInit.ok) {
              throw new Error('Converted file storage initialization failed.');
            }
            const convertedUpload = await convertedInit.json();
            await uploadFileToR2(
              convertedFile,
              convertedUpload.signedUrl,
              'image/webp',
              fileState.id,
              () => undefined,
            );
            fileState.publicUrl = convertedUpload.publicUrl;
          } catch (convErr: any) {
            console.error('RAW Conversion Failed:', convErr);
            // We don't fail the whole upload, we just keep the DNG URL if conversion fails.
          }
        }

        fileState.status = 'completing';
        fileState.progress = 100;
        setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));

        return fileState;
      } catch (err) {

        if (err instanceof DOMException && err.name === 'AbortError') {
          fileState.status = 'failed';
          fileState.error = 'Cancelled by user';
          return fileState;
        }


        if (attempt < MAX_RETRIES) {
          fileState.error = err instanceof Error ? err.message : 'Upload failed';
          continue;
        }


        fileState.status = 'failed';
        fileState.error = err instanceof Error ? err.message : 'Upload failed';
        return fileState;
      }
    }

    return fileState;
  }, [convertToWebSafe, uploadFileToR2, uploadMultipartFile, currentPath]);

  const runConcurrentUploads = useCallback(async (fileStates: FileUploadState[]): Promise<FileUploadState[]> => {
    const fallbackSSlug = subjectSlug || localSubjects.find(s => s.id === selectedSubjectId)?.slug || 'unknown';
    const fallbackLSlug = lessonSlug || activeLessons.find(l => l.id === selectedLessonId)?.slug || 'unknown';
    const allResults: FileUploadState[] = [];

    const concurrencyLimit = isMegaAdmin ? 50 : MAX_CONCURRENT_UPLOADS;

    for (let i = 0; i < fileStates.length; i += concurrencyLimit) {

      if (batchAbortRef.current?.signal.aborted) break;

      const batch = fileStates.slice(i, i + concurrencyLimit);
      const results = await Promise.allSettled(
        batch.map(fs => processSingleFile(fs, fs.subjectSlug || fallbackSSlug, fs.lessonSlug || fallbackLSlug))
      );


      results.forEach((result, idx) => {
        const fileState = result.status === 'fulfilled' ? result.value : { ...batch[idx], status: 'failed' as UploadStatus, error: 'Asynchronous escape' };
        allResults.push(fileState);
      });


      setUploadQueue(prev => {
        const updated = [...prev];
        results.forEach((result, idx) => {
          const fileState = result.status === 'fulfilled' ? result.value : batch[idx];
          const fileIdx = updated.findIndex(f => f.id === fileState.id);
          if (fileIdx >= 0) updated[fileIdx] = fileState;
        });
        return updated;
      });
    }

    return allResults;
  }, [processSingleFile, subjectSlug, localSubjects, selectedSubjectId, selectedLessonId, lessonSlug, activeLessons, isMegaAdmin]);

  const handleCancelBatch = useCallback(() => {
    // Abort all in-flight XHRs
    xhrAbortersRef.current.forEach(abortFn => abortFn());
    xhrAbortersRef.current.clear();
    // Abort the batch controller
    batchAbortRef.current?.abort();
    batchAbortRef.current = null;
    setStatusMessage('Upload batch cancelled by user.');
  }, []);

  // ── P3.4: Drag-and-drop handlers ──
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    const getFilesFromEntry = async (entry: any, path = ''): Promise<File[]> => {
      if (entry.isFile) {
        return new Promise((resolve) => {
          entry.file((file: File) => {
            // Preservation: Manually attach fullPath for hierarchy mapping
            Object.defineProperty(file, 'fullPath', {
              value: path + file.name,
              writable: false,
              configurable: true
            });
            resolve([file]);
          });
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const allEntries: any[] = [];

        // Helper to read all entries (handles browser pagination/limits)
        const readAllEntries = async (): Promise<any[]> => {
          const entries = await new Promise<any[]>((resolve) => {
            dirReader.readEntries((results: any[]) => resolve(results));
          });
          if (entries.length > 0) {
            allEntries.push(...entries);
            return readAllEntries();
          }
          return allEntries;
        };

        const entries = await readAllEntries();
        const filePromises = entries.map(ent => getFilesFromEntry(ent, path + entry.name + '/'));
        const fileResults = await Promise.all(filePromises);
        return fileResults.flat();
      }
      return [];
    };

    try {
      const entryPromises = Array.from(items)
        .map(item => item.webkitGetAsEntry())
        .filter(entry => entry !== null)
        .map(entry => getFilesFromEntry(entry));

      const results = await Promise.all(entryPromises);
      const extractedFiles = results.flat();

      console.log(`Async parsing complete. Files found: ${extractedFiles.length}`);

      if (extractedFiles.length > 0) {
        setFiles(prev => [...prev, ...extractedFiles]);
      }
    } catch (err) {
      console.error("Directory reading failed:", err);
      setStatusMessage("Error parsing dropped folders. Please try again.");
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  }, []);

  const processUploadOrEmbed = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`Step 1: Button clicked. File count: ${files.length}`);

    // P3.0 Folder Mirror Check
    const isFolderMirror = inputType === 'file' && files.some(f => {
      const rp = (f as any).fullPath || (f as any).webkitRelativePath || '';
      return rp.split('/').length >= 3;
    });

    if (!selectedLessonId && !isFolderMirror && inputType !== 'snippet') {
      console.error('Guard Check Failed: selectedLessonId is missing and not Folder Mirror.');
      setStatusMessage('Select a lesson before uploading, or choose a structured folder.');
      return;
    }

    // Task 3: Guard against raw unparsed folders
    if (files.length === 1 && files[0].size === 0 && !files[0].type) {
      setStatusMessage('Error: Folders must be parsed correctly. Please try again or use the Upload Folder button.');
      return;
    }

    // Initialize abort controller for this batch
    batchAbortRef.current = new AbortController();

    setUploading(true);
    setStatusMessage('Preparing upload...');

    try {
      if (inputType === 'file' && files.length > 0) {
        // File size validation (skipped for Mega Upload optionally, or uses dynamic limit)
        const oversized = files.filter(f => f.size > currentMaxFileSize);
        if (oversized.length > 0) {
          setStatusMessage(`Error: ${oversized.length} file(s) exceed the ${isMegaAdmin ? '5GB' : '500MB'} limit: ${oversized.map(f => f.name).join(', ')}`);
          setUploading(false);
          batchAbortRef.current = null;
          return;
        }

        // Pre-Flight Hierarchy Synchronization
        const hierarchyItems = new Map<string, { subjectName: string, lessonName: string }>();
        const contextSubjectId = selectedSubjectId;
        const contextSubjectName = contextSubjectId
          ? localSubjects.find(s => s.id === contextSubjectId)?.title || 'Current Subject'
          : '';

        files.forEach(file => {
          const relativePath = (file as any).fullPath || (file as any).webkitRelativePath || '';
          const segments = relativePath.split('/');

          if (contextSubjectId && segments.length >= 2) {
            // Context-Aware: First folder is the Lesson name
            const subjectName = contextSubjectName;
            const lessonName = segments[0];
            hierarchyItems.set(`${subjectName}|${lessonName}`, { subjectName, lessonName });
          } else if (!contextSubjectId && segments.length >= 3) {
            // Generic: Subject / Lesson / File
            const subjectName = segments[0];
            const lessonName = segments[1];
            hierarchyItems.set(`${subjectName}|${lessonName}`, { subjectName, lessonName });
          }
        });

        const hierarchyMappings: Record<string, { subjectId: string, lessonId: string }> = {};
        if (hierarchyItems.size > 0) {
          setStatusMessage('Synchronizing folder hierarchy...');
          const syncRes = await fetch('/api/admin/sync-hierarchy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: Array.from(hierarchyItems.values()),
              currentSubjectId: contextSubjectId || undefined
            }),
            signal: batchAbortRef.current?.signal
          });
          if (!syncRes.ok) throw new Error('Hierarchy synchronization failed');
          const syncData = await syncRes.json();
          Object.assign(hierarchyMappings, syncData.mappings || {});
        }

        // Build upload queue with per-file state
        const queue: FileUploadState[] = files.map(file => {
          const relativePath = (file as any).fullPath || (file as any).webkitRelativePath || '';
          const segments = relativePath.split('/');

          let fileSubjectId = selectedSubjectId || undefined;
          let fileLessonId = selectedLessonId || undefined;
          let fileSubjectSlug = undefined;
          let fileLessonSlug = undefined;
          let fileRelativeFilePath = file.name;

          if (contextSubjectId && segments.length >= 2) {
             const subjectName = contextSubjectName;
             const lessonName = segments[0];
             const mapping = hierarchyMappings[`${subjectName}|${lessonName}`];
             if (mapping) {
               fileSubjectId = mapping.subjectId;
               fileLessonId = mapping.lessonId;
               fileSubjectSlug = subjectName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
               fileLessonSlug = lessonName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
             }
             fileRelativeFilePath = segments.slice(1).join('/');
          } else if (!contextSubjectId && segments.length >= 3) {
            const subjectName = segments[0];
            const lessonName = segments[1];
            const mapping = hierarchyMappings[`${subjectName}|${lessonName}`];
            if (mapping) {
              fileSubjectId = mapping.subjectId;
              fileLessonId = mapping.lessonId;
              fileSubjectSlug = subjectName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
              fileLessonSlug = lessonName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
            }
            fileRelativeFilePath = segments.slice(2).join('/');
          } else {
             fileRelativeFilePath = segments.length > 1 ? segments.slice(1).join('/') : file.name;
          }

          return {
            id: `upload_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
            file,
            relativeFilePath: sanitizePath(fileRelativeFilePath),
            status: 'pending' as UploadStatus,
            progress: 0,
            retries: 0,
            subjectId: fileSubjectId,
            lessonId: fileLessonId,
            subjectSlug: fileSubjectSlug,
            lessonSlug: fileLessonSlug
          };
        });

        setUploadQueue(queue);

        // Run concurrent uploads (R2 uploads only)
        // Task 2: Direct Result Accumulation (Bypassing State Latency)
        const finalQueue = await runConcurrentUploads(queue);

        // ── P3.2: Batch complete ──
        const successful = finalQueue.filter(f => (f.status === 'completing' || f.status === 'success') && f.publicUrl);
        const failed = finalQueue.filter(f => f.status === 'failed');

        if (batchAbortRef.current?.signal.aborted) {
          setStatusMessage('Upload batch cancelled.');
        } else if (successful.length > 0) {
          // Task 1: Hardened ID Mapping & Fallbacks
          const batchItems = successful.map(f => {
            const finalLessonId = f.lessonId || selectedLessonId;
            return {
              lessonId: finalLessonId,
              parentId: currentPathId || null,
              fileName: f.relativeFilePath,
              fileType: getFileType(f.file.type, f.file.name),
              contentType: f.file.type || 'application/octet-stream',
              publicUrl: f.publicUrl!,
              itemType: f.file.name.toLowerCase().endsWith('.vimeo') ? 'vimeo' : 'file',
              vimeoId: '',
              idempotencyKey: generateIdempotencyKey(f.file, f.relativeFilePath)
            };
          }).filter(item => {
            if (!item.lessonId) {
              console.warn("Skipping item due to missing Lesson ID:", item.fileName);
              return false;
            }
            return true;
          });

          console.log("FINAL BATCH PAYLOAD:", batchItems);

          if (batchItems.length === 0) {
            setStatusMessage('Error: No valid lesson target found for these assets.');
            setUploading(false);
            return;
          }

          // Await batch complete
          setStatusMessage('Synchronizing with database...');
          try {
            const batchRes = await fetch('/api/admin/upload-complete-batch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ items: batchItems })
            });

            if (!batchRes.ok) {
              const errorData = await batchRes.json();
              throw new Error(errorData.error || 'Database synchronization failed');
            }
          } catch (err: any) {
            console.error('Batch Sync Error:', err);
            setStatusMessage(`Sync Error: ${err.message}. R2 assets are safe, but database entry failed.`);
            setUploading(false);
            return; // Halt logic to allow user to see error or retry
          }

          // Mark all as success
          setUploadQueue(q => q.map(f =>
            f.status === 'completing' && f.publicUrl ? { ...f, status: 'success' as UploadStatus } : f
          ));
        }

        if (failed.length > 0) {
          const failedNames = failed.map(f => f.relativeFilePath).join(', ');
          if (batchAbortRef.current?.signal.aborted) {
            setStatusMessage(`Cancelled. ${successful.length} uploaded, ${failed.length} failed: ${failedNames}`);
          } else {
            setStatusMessage(`Partial: ${successful.length}/${finalQueue.length} uploaded. Failed: ${failedNames}`);
          }
        } else if (!batchAbortRef.current?.signal.aborted) {
          setStatusMessage(`Success: ${successful.length} assets verified!`);

          // Force a server-side data refresh to sync the UI with Supabase
          router.refresh();

          // Only clear files and signal completion on full logical success
          setUploadQueue([]); // Reset the telemetry queue UI
          setFiles([]);      // Reset the dropzone
          onComplete();      // Signal parent to re-fetch if necessary
        }
      } else if (inputType === 'link' && vimeoUrl) {
        if (!vimeoTitle.trim()) throw new Error('Title required for Vimeo link');

        // Client-side pre-validation: check it looks like a Vimeo URL or numeric ID
        const vimeoPattern = /(?:vimeo\.com\/(?:video\/)?|^\d+$)/;
        if (!vimeoPattern.test(vimeoUrl.trim())) {
          throw new Error('Invalid Vimeo URL. Use format: vimeo.com/123456 or a raw video ID');
        }

        const res = await fetch('/api/admin/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId: selectedLessonId,
            parentId: currentPathId || null,
            url: vimeoUrl.trim(),
            name: vimeoTitle.trim()
          }),
          signal: batchAbortRef.current?.signal
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errData.error || `Embed failed with status ${res.status}`);
        }

        setStatusMessage('✅ Vimeo video embedded successfully!');
        setVimeoUrl('');
        setVimeoTitle('');
        router.refresh();
        onComplete();
      } else if (inputType === 'snippet') {
        if (!snippetContent.trim()) throw new Error('Snippet content required');
        const res = await fetch('/api/forge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lesson_id: selectedLessonId,
            language_type: snippetLanguage,
            raw_content: snippetContent
          }),
          signal: batchAbortRef.current?.signal
        });
        if (!res.ok) throw new Error('Snippet broadcast failed');
        setStatusMessage('Success: Snippet broadcasted to The Forge!');
        setSnippetContent('');
        router.refresh();
        onComplete();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatusMessage('Upload batch cancelled.');
      } else {
        setStatusMessage(`Error: ${message}`);
      }
    } finally {
      setUploading(false);
      batchAbortRef.current = null;
    }
  };

  // ── Memoized per-file status colors ──
  const getStatusColor = (status: UploadStatus) => {
    switch (status) {
      case 'pending': return 'text-slate-600';
      case 'converting': return 'text-amber-700';
      case 'initiating': return 'text-[#084B2B]';
      case 'uploading': return 'text-[#084B2B]';
      case 'completing': return 'text-[#084B2B]';
      case 'success': return 'text-emerald-700';
      case 'failed': return 'text-red-700';
    }
  };

  const getStatusIcon = (status: UploadStatus, retries: number) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'converting': return '🔄';
      case 'initiating': return '📡';
      case 'uploading': return '📤';
      case 'completing': return '✅';
      case 'success': return '✓';
      case 'failed': return retries < MAX_RETRIES ? '🔁' : '✗';
    }
  };

  const successCount = useMemo(() => uploadQueue.filter(f => f.status === 'success').length, [uploadQueue]);
  const inFlightCount = useMemo(() => uploadQueue.filter(f => ['uploading', 'initiating', 'converting', 'completing'].includes(f.status)).length, [uploadQueue]);

  // ── Compact variant ──
  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-4 rounded-3xl border bg-white p-4 text-slate-900 shadow-sm shadow-emerald-950/5 transition-all duration-200 ease-in-out ${
          isDragOver ? 'border-[#084B2B] bg-emerald-50' : 'border-emerald-950/10'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          id="compact-file-input"
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            const selected = Array.from(e.target.files || []);
            if (selected.length > 0) setFiles(prev => [...prev, ...selected]);
          }}
          disabled={uploading}
        />
        <button
          type="button"
          onClick={() => document.getElementById('compact-file-input')?.click()}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-[#084B2B] px-6 py-3 text-[10px] font-black uppercase text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063B22] hover:shadow-md"
          disabled={uploading}
        >
          {uploading ? '...' : isDragOver ? '📥 Drop Here' : '↑ Upload Assets'}
        </button>

        {files.length > 0 && !uploading && (
          <>
            <button
              onClick={(e) => processUploadOrEmbed(e)}
              className="shrink-0 rounded-xl border border-emerald-200/60 bg-emerald-50 px-6 py-3 text-[10px] font-black uppercase text-[#084B2B] shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-emerald-100 hover:shadow-md"
            >
              Start ({files.length})
            </button>
            <button
              onClick={() => setFiles([])}
              className="shrink-0 text-[9px] font-bold text-slate-500 transition-colors hover:text-[#084B2B]"
            >
              Clear
            </button>
          </>
        )}

        {uploading && inFlightCount > 0 && (
          <div className="flex-1 flex items-center gap-4 animate-pulse">
            <div className="max-w-[100px] truncate text-[10px] font-black uppercase text-[#084B2B]">
              {inFlightCount} active
            </div>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full border border-emerald-950/10 bg-slate-100">
              <div
                className="h-full bg-[#084B2B] transition-all duration-300"
                style={{ width: `${uploadQueue.length > 0 ? (successCount / uploadQueue.length) * 100 : 0}%` }}
              />
            </div>
            <div className="text-[10px] font-bold text-slate-600">{successCount}/{uploadQueue.length}</div>
          </div>
        )}

        {uploading && (
          <button
            onClick={handleCancelBatch}
            className="shrink-0 rounded-xl bg-red-600 px-4 py-2 text-[10px] font-black uppercase text-white transition hover:bg-red-700"
          >
            Cancel
          </button>
        )}

        {!uploading && files.length === 0 && !statusMessage && (
          <p className="text-[10px] font-medium italic text-slate-600">Drop files here or click to upload to {currentPath || 'root'}</p>
        )}

        {statusMessage && !uploading && files.length === 0 && (
          <p className="animate-in text-[10px] font-black uppercase text-[#084B2B] fade-in slide-in-from-right-4">{statusMessage}</p>
        )}
      </div>
    );
  }

  // ── Full variant ──
  return (
    <div className="space-y-10 rounded-3xl border border-emerald-950/10 bg-white p-5 text-slate-900 shadow-sm shadow-emerald-950/5 sm:p-8 lg:p-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">File Storage</label>
          <div className="flex gap-3">
            <button type="button" className="flex-1 rounded-2xl border border-[#084B2B] bg-[#084B2B] py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">Cloudflare R2</button>
          </div>
        </div>
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Content Source</label>
          <div className="flex rounded-2xl border border-emerald-950/10 bg-slate-100 p-1.5">
            <button type="button" onClick={() => setInputType('file')} className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition ${inputType === 'file' ? 'bg-white text-[#084B2B] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Direct Upload</button>
            <button type="button" onClick={() => setInputType('link')} className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition ${inputType === 'link' ? 'bg-white text-[#084B2B] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Embed</button>
            <button type="button" onClick={() => setInputType('snippet')} className={`flex-1 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition ${inputType === 'snippet' ? 'bg-white text-[#084B2B] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>Text / Code</button>
          </div>
        </div>
      </div>

      {inputType === 'file' ? (
        <div className="space-y-4">
          {/* P3.4: Drag-and-Drop Zone */}
          <input id="file-input" type="file" multiple className="hidden" onChange={handleFileSelect} disabled={uploading} />
          <input id="folder-input" type="file" {...({ webkitdirectory: "", directory: "" } as Record<string, string | boolean>)} className="hidden" onChange={handleFileSelect} disabled={uploading} />

          {/* Drag-and-Drop Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`relative h-56 rounded-[2rem] border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${isDragOver
              ? 'border-[#084B2B] bg-emerald-50'
              : 'border-slate-300 bg-[#F8FAF7] hover:border-emerald-400 hover:bg-emerald-50'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            role="button"
            aria-label="Drop zone for file uploads"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-input')?.click(); }}
          >
            {/* Animated background glow on drag */}
            {isDragOver && (
              <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                <div className="absolute inset-0 animate-pulse bg-emerald-100/70" />
              </div>
            )}

            <div className={`relative z-10 flex flex-col items-center transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
              <div className="mb-4 flex size-16 items-center justify-center rounded-2xl border border-emerald-950/10 bg-white text-3xl transition-all group-hover:bg-emerald-50">
                {isDragOver ? '📥' : '📄'}
              </div>
              <p className="mb-1 text-sm font-black text-slate-900">
                {isDragOver ? 'Drop to Queue' : 'Drag & Drop Files Here'}
              </p>
              <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase text-slate-600">Choose files</span>
              {isMegaAdmin && !isSessionLoading && (
                <span className="rounded-lg bg-[#084B2B] px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">LARGE UPLOAD ENABLED</span>
              )}
            </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                or click to browse · Max 500MB per file
              </p>
            </div>
          </div>

          {/* File / Folder quick select */}
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => document.getElementById('file-input')?.click()} disabled={uploading} className="group flex h-28 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-[#F8FAF7] transition hover:border-emerald-400 hover:bg-emerald-50">
              <div className="mb-2 flex size-10 items-center justify-center rounded-xl border border-emerald-950/10 bg-white text-xl transition group-hover:bg-emerald-50">📄</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Select Files</p>
            </button>
            <button type="button" onClick={() => document.getElementById('folder-input')?.click()} disabled={uploading} className="group flex h-28 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-[#F8FAF7] transition hover:border-emerald-400 hover:bg-emerald-50">
              <div className="mb-2 flex size-10 items-center justify-center rounded-xl border border-emerald-950/10 bg-white text-xl transition group-hover:bg-emerald-50">📂</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">Select Folder</p>
            </button>
          </div>

          {/* Selected files badge */}
          {files.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2">
              <p className="text-[10px] font-black uppercase text-[#084B2B]">{files.length} Files Selected</p>
              {!uploading && (
                <button
                  type="button"
                  onClick={(e) => { setFiles([]); e.stopPropagation(); }}
                  className="text-[9px] font-bold text-slate-600 transition-colors hover:text-[#084B2B]"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>
      ) : inputType === 'link' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Video Title (e.g. Lecture 3 — Thermodynamics)"
              value={vimeoTitle}
              onChange={e => setVimeoTitle(e.target.value)}
              className="rounded-2xl border border-emerald-950/10 bg-white px-6 py-5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100"
            />
            <input
              type="text"
              placeholder="https://vimeo.com/123456789"
              value={vimeoUrl}
              onChange={e => setVimeoUrl(e.target.value)}
              className={`rounded-2xl border bg-white px-6 py-5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-4 ${
                vimeoUrl && !/(?:vimeo\.com\/(?:video\/)?|^\d+$)/.test(vimeoUrl.trim())
                  ? 'border-red-500/50 focus:ring-red-500'
                  : 'border-emerald-950/10 focus:border-[#084B2B] focus:ring-emerald-100'
              }`}
            />
          </div>
          <div className="flex items-center gap-3 px-2">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#084B2B]"></span>
              <p className="font-mono text-[10px] tracking-wide text-slate-600">
                Accepted: vimeo.com/ID · player.vimeo.com/video/ID · raw numeric ID
              </p>
            </div>
            {vimeoUrl && /(?:vimeo\.com\/(?:video\/)?(\d+)|^(\d+)$)/.test(vimeoUrl.trim()) && (
              <span className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                ✓ ID: {vimeoUrl.trim().match(/(\d+)/)?.[1]}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <select value={snippetLanguage} onChange={e => setSnippetLanguage(e.target.value)} className="w-full cursor-pointer appearance-none rounded-2xl border border-emerald-950/10 bg-white px-6 py-4 text-sm text-slate-900 outline-none transition focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100">
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="latex">LaTeX / Math</option>
            <option value="json">JSON</option>
            <option value="plaintext">Plain Text</option>
          </select>
          <textarea placeholder="Paste your raw snippet or math formula here..." value={snippetContent} onChange={e => setSnippetContent(e.target.value)} className="h-40 w-full resize-none rounded-2xl border border-emerald-950/10 bg-white p-6 font-mono text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#084B2B] focus:ring-4 focus:ring-emerald-100" />
        </div>
      )}

      {/* ── Upload Queue UI (P2.4: Per-file status) ── */}
      {uploadQueue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#084B2B]">
              Upload Queue ({uploadQueue.length} files)
            </h3>
            {uploading && inFlightCount > 0 && (
              <button
                onClick={handleCancelBatch}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-[9px] font-black uppercase text-white transition hover:bg-red-700"
              >
                Cancel Batch
              </button>
            )}
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-4">
            {uploadQueue.map((item) => {
              const currentProgress = uploadProgress[item.id] || 0;
              let badgeText = 'Pending';
              if (item.status === 'success') badgeText = 'Complete';
              else if (item.status === 'failed') badgeText = 'Failed';
              else if (item.status === 'uploading') badgeText = `Uploading... ${currentProgress}%`;
              else if (item.status === 'converting') badgeText = 'Converting Format...';
              else if (item.status === 'initiating') badgeText = 'Initiating...';
              else if (item.status === 'completing') badgeText = 'Finalizing...';
              else if (item.retries > 0) badgeText = `Retrying (${item.retries}/${MAX_RETRIES})...`;

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-2 px-4 py-3 rounded-xl border transition-all ${item.status === 'success'
                    ? 'bg-emerald-500/5 border-emerald-500/20'
                    : item.status === 'failed'
                      ? 'bg-red-500/5 border-red-500/20'
                      : item.status === 'uploading' || item.status === 'completing'
                        ? 'border-emerald-200 bg-emerald-50'
                        : 'border-emerald-950/10 bg-white'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-sm w-6 text-center flex-shrink-0`}>
                      {getStatusIcon(item.status, item.retries)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[11px] font-bold truncate ${getStatusColor(item.status)}`}>
                          {item.relativeFilePath}
                        </p>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          item.status === 'success' ? 'bg-emerald-100 text-emerald-700' :
                          item.status === 'failed' ? 'bg-red-100 text-red-700' :
                          item.status === 'uploading' ? 'bg-emerald-100 text-[#084B2B]' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {badgeText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.error && (
                    <div className="mt-1 pl-9">
                      <p className="break-words text-[10px] font-medium text-red-700">Error: {item.error}</p>
                    </div>
                  )}

                  {item.status === 'uploading' && (
                    <div className="mt-1 pl-9">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-[#084B2B] transition-all duration-300"
                          style={{ width: `${currentProgress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Aggregate progress bar */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-slate-600">Overall Progress</span>
                <span className="text-[#084B2B]">{successCount}/{uploadQueue.length} complete</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full border border-emerald-950/10 bg-slate-100">
                <div
                  className="h-full bg-[#084B2B] transition-all duration-300"
                  style={{ width: `${uploadQueue.length > 0 ? (successCount / uploadQueue.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Clear queue button after completion */}
          {!uploading && uploadQueue.length > 0 && (
            <button
              onClick={() => setUploadQueue([])}
              className="w-full py-2 text-[9px] font-bold uppercase tracking-widest text-slate-600 transition-colors hover:text-[#084B2B]"
            >
              Dismiss Queue
            </button>
          )}
        </div>
      )}

      {statusMessage && uploadQueue.length === 0 && (
        <div className="rounded-2xl border border-emerald-950/10 bg-[#F8FAF7] p-6 text-center text-[10px] font-black uppercase text-slate-700">{statusMessage}</div>
      )}

      <button
        onClick={(e) => processUploadOrEmbed(e)}
        disabled={
          uploading ||
          (!selectedLessonId && inputType !== 'snippet' && !(inputType === 'file' && files.some((f: any) => (f.fullPath || f.webkitRelativePath || '').split('/').length >= 3)))
        }
        className="w-full rounded-3xl bg-[#084B2B] py-6 text-[10px] font-black uppercase tracking-widest text-white shadow-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#063B22] hover:shadow-md disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-50"
      >
        {uploading ? `Uploading... (${inFlightCount} active)` : 'Add Content'}
      </button>
    </div>
  );
}
