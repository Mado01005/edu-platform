'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { SubjectMeta, LessonMeta } from '@/types';

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

const UNSUPPORTED_IMAGE_EXTENSIONS = ['.heic', '.heif', '.dng'];
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
  if (m.includes('presentation') || m.includes('powerpoint') || f.endsWith('.pptx')) return 'powerpoint';
  return 'unknown';
}

function sanitizePath(path: string): string {
  return path
    .replace(/[^a-zA-Z0-9.\s/_\-]/g, '_') // replace unsafe chars with _ but keep /
    .replace(/\/+/g, '/')                 // collapse slashes
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

  const convertToWebSafe = useCallback(async (file: File): Promise<File> => {
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
        totalParts
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

    // Step 2-5: Retry loop with exponential backoff
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      // Check if batch was cancelled
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
        // Initiate
        fileState.status = 'initiating';
        setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));

        // ── P3.1: Choose multipart for files > 50MB ──
        const isLargeFile = file.size > MULTIPART_CHUNK_SIZE;
        let publicUrl: string;

        if (isLargeFile) {
          // Multipart upload
          fileState.status = 'uploading';
          fileState.progress = 0;
          setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));

          const result = await uploadMultipartFile(file, fileState.id, sSlug, lSlug, fileState.relativeFilePath);
          publicUrl = result.publicUrl;
        } else {
          // Standard single upload
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
              subfolder: currentPath.trim() || undefined
            }),
            signal: batchAbortRef.current?.signal
          });

          if (!initRes.ok) throw new Error(`Initiate failed (${initRes.status})`);
          const { signedUrl, publicUrl: pu } = await initRes.json();
          publicUrl = pu;

          // Upload to R2
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

        // Store publicUrl for batch complete (do NOT call single complete)
        fileState.publicUrl = publicUrl;
        fileState.status = 'completing';
        fileState.progress = 100;
        setUploadQueue(prev => prev.map(f => f.id === fileState.id ? { ...f, ...fileState } : f));

        return fileState;
      } catch (err) {
        // Check if this was an abort
        if (err instanceof DOMException && err.name === 'AbortError') {
          fileState.status = 'failed';
          fileState.error = 'Cancelled by user';
          return fileState;
        }

        // If we have retries left, try again
        if (attempt < MAX_RETRIES) {
          fileState.error = err instanceof Error ? err.message : 'Upload failed';
          continue;
        }

        // All retries exhausted
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

    // Process in concurrent batches
    for (let i = 0; i < fileStates.length; i += MAX_CONCURRENT_UPLOADS) {
      // Check if cancelled
      if (batchAbortRef.current?.signal.aborted) break;

      const batch = fileStates.slice(i, i + MAX_CONCURRENT_UPLOADS);
      const results = await Promise.allSettled(
        batch.map(fs => processSingleFile(fs, fs.subjectSlug || fallbackSSlug, fs.lessonSlug || fallbackLSlug))
      );

      // Update local accumulator and state
      results.forEach((result, idx) => {
        const fileState = result.status === 'fulfilled' ? result.value : { ...batch[idx], status: 'failed' as UploadStatus, error: 'Asynchronous escape' };
        allResults.push(fileState);
      });

      // Update queue state for UI feedback (batched)
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
  }, [processSingleFile, subjectSlug, localSubjects, selectedSubjectId, selectedLessonId, lessonSlug, activeLessons]);

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
      setStatusMessage('Error: Select a module before initiating transmission (or upload a structured folder).');
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
    setStatusMessage('Preparing transmission...');

    try {
      if (inputType === 'file' && files.length > 0) {
        // File size validation
        const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
        if (oversized.length > 0) {
          setStatusMessage(`Error: ${oversized.length} file(s) exceed the 500MB limit: ${oversized.map(f => f.name).join(', ')}`);
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
        if (!vimeoTitle) throw new Error('Title required for link');
        const res = await fetch('/api/admin/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subjectId: selectedSubjectId,
            lessonId: selectedLessonId,
            parentId: currentPathId || null,
            url: vimeoUrl,
            name: vimeoTitle
          }),
          signal: batchAbortRef.current?.signal
        });
        if (!res.ok) throw new Error('Link embedding failed');
        setStatusMessage('Success: Link embedded!');
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
      case 'pending': return 'text-gray-500';
      case 'converting': return 'text-yellow-400';
      case 'initiating': return 'text-blue-400';
      case 'uploading': return 'text-indigo-400';
      case 'completing': return 'text-purple-400';
      case 'success': return 'text-green-400';
      case 'failed': return 'text-red-400';
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
        className={`flex items-center gap-4 bg-white/5 border p-4 rounded-3xl transition-all duration-300 ${
          isDragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10'
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
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase px-6 py-3 rounded-xl transition-all flex items-center gap-2 shrink-0 shadow-lg shadow-indigo-500/20"
          disabled={uploading}
        >
          {uploading ? '...' : isDragOver ? '📥 Drop Here' : '↑ Upload Assets'}
        </button>

        {files.length > 0 && !uploading && (
          <>
            <button
              onClick={(e) => processUploadOrEmbed(e)}
              className="bg-white text-black text-[10px] font-black uppercase px-6 py-3 rounded-xl hover:bg-gray-200 transition-all shrink-0"
            >
              Start ({files.length})
            </button>
            <button
              onClick={() => setFiles([])}
              className="text-[9px] font-bold text-gray-500 hover:text-white transition-colors shrink-0"
            >
              Clear
            </button>
          </>
        )}

        {uploading && inFlightCount > 0 && (
          <div className="flex-1 flex items-center gap-4 animate-pulse">
            <div className="text-[10px] font-black text-indigo-400 uppercase truncate max-w-[100px]">
              {inFlightCount} active
            </div>
            <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${uploadQueue.length > 0 ? (successCount / uploadQueue.length) * 100 : 0}%` }}
              />
            </div>
            <div className="text-[10px] font-bold text-gray-500">{successCount}/{uploadQueue.length}</div>
          </div>
        )}

        {uploading && (
          <button
            onClick={handleCancelBatch}
            className="bg-red-600/80 hover:bg-red-500 text-white text-[10px] font-black uppercase px-4 py-2 rounded-xl transition-all shrink-0"
          >
            Cancel
          </button>
        )}

        {!uploading && files.length === 0 && !statusMessage && (
          <p className="text-[10px] font-medium text-gray-500 italic">Drop files here or click to upload to {currentPath || 'root'}</p>
        )}

        {statusMessage && !uploading && files.length === 0 && (
          <p className="text-[10px] font-black text-indigo-400 uppercase animate-in fade-in slide-in-from-right-4">{statusMessage}</p>
        )}
      </div>
    );
  }

  // ── Full variant ──
  return (
    <div className="p-10 bg-white/5 border border-white/10 rounded-[3rem] space-y-10">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">02 Storage Core</label>
          <div className="flex gap-3">
            <button type="button" className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-600 text-white border-indigo-500 shadow-lg">Cloudflare R2</button>
          </div>
        </div>
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">03 Link Protocol</label>
          <div className="flex p-1.5 bg-black/40 rounded-2xl border border-white/5">
            <button type="button" onClick={() => setInputType('file')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${inputType === 'file' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>Direct Upload</button>
            <button type="button" onClick={() => setInputType('link')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${inputType === 'link' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>Embed</button>
            <button type="button" onClick={() => setInputType('snippet')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition ${inputType === 'snippet' ? 'bg-white/10 text-white' : 'text-gray-600'}`}>Forge Snippet</button>
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
              ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_40px_rgba(99,102,241,0.2)] scale-[1.02]'
              : 'border-white/10 bg-black/50 hover:border-indigo-500/30 hover:bg-black/60'
              } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
            role="button"
            aria-label="Drop zone for file uploads"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('file-input')?.click(); }}
          >
            {/* Animated background glow on drag */}
            {isDragOver && (
              <div className="absolute inset-0 rounded-[2rem] overflow-hidden pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 animate-pulse" />
              </div>
            )}

            <div className={`relative z-10 flex flex-col items-center transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center text-3xl mb-4 group-hover:bg-indigo-500/10 transition-all">
                {isDragOver ? '📥' : '📄'}
              </div>
              <p className="text-sm font-black text-white mb-1">
                {isDragOver ? 'Drop to Queue' : 'Drag & Drop Files Here'}
              </p>
              <p className="text-[10px] font-bold text-gray-500 tracking-widest uppercase">
                or click to browse · Max 500MB per file
              </p>
            </div>
          </div>

          {/* File / Folder quick select */}
          <div className="grid grid-cols-2 gap-4">
            <button type="button" onClick={() => document.getElementById('file-input')?.click()} disabled={uploading} className="flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-[2rem] border-white/10 hover:border-indigo-500/30 bg-black/50 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl mb-2 group-hover:bg-indigo-500/10 transition-all">📄</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Select Files</p>
            </button>
            <button type="button" onClick={() => document.getElementById('folder-input')?.click()} disabled={uploading} className="flex flex-col items-center justify-center h-28 border-2 border-dashed rounded-[2rem] border-white/10 hover:border-indigo-500/30 bg-black/50 transition-all group">
              <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-xl mb-2 group-hover:bg-indigo-500/10 transition-all">📂</div>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Select Folder</p>
            </button>
          </div>

          {/* Selected files badge */}
          {files.length > 0 && (
            <div className="flex items-center justify-between px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
              <p className="text-[10px] font-black text-indigo-400 uppercase">{files.length} Assets Queued</p>
              {!uploading && (
                <button
                  type="button"
                  onClick={(e) => { setFiles([]); e.stopPropagation(); }}
                  className="text-[9px] font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          )}
        </div>
      ) : inputType === 'link' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="Title" value={vimeoTitle} onChange={e => setVimeoTitle(e.target.value)} className="bg-black border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
          <input type="text" placeholder="URL" value={vimeoUrl} onChange={e => setVimeoUrl(e.target.value)} className="bg-black border border-white/10 rounded-2xl px-6 py-5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
        </div>
      ) : (
        <div className="space-y-4">
          <select value={snippetLanguage} onChange={e => setSnippetLanguage(e.target.value)} className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer">
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="cpp">C++</option>
            <option value="latex">LaTeX / Math</option>
            <option value="json">JSON</option>
            <option value="plaintext">Plain Text</option>
          </select>
          <textarea placeholder="Paste your raw snippet or math formula here..." value={snippetContent} onChange={e => setSnippetContent(e.target.value)} className="w-full h-40 bg-black border border-white/10 rounded-2xl p-6 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none font-mono" />
        </div>
      )}

      {/* ── Upload Queue UI (P2.4: Per-file status) ── */}
      {uploadQueue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">
              Transmission Queue ({uploadQueue.length} assets)
            </h3>
            {uploading && inFlightCount > 0 && (
              <button
                onClick={handleCancelBatch}
                className="bg-red-600/80 hover:bg-red-500 text-white text-[9px] font-black uppercase px-4 py-1.5 rounded-lg transition-all"
              >
                Cancel Batch
              </button>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2 bg-black/30 rounded-2xl p-4 border border-white/5">
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
                    ? 'bg-green-500/5 border-green-500/20'
                    : item.status === 'failed'
                      ? 'bg-red-500/5 border-red-500/20'
                      : item.status === 'uploading' || item.status === 'completing'
                        ? 'bg-indigo-500/5 border-indigo-500/20'
                        : 'bg-white/5 border-white/5'
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
                          item.status === 'success' ? 'bg-green-500/20 text-green-400' :
                          item.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          item.status === 'uploading' ? 'bg-cyan-500/20 text-cyan-400' :
                          'bg-white/10 text-gray-400'
                        }`}>
                          {badgeText}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {item.error && (
                    <div className="mt-1 pl-9">
                      <p className="text-[10px] text-red-400/90 font-medium break-words">Error: {item.error}</p>
                    </div>
                  )}

                  {item.status === 'uploading' && (
                    <div className="mt-1 pl-9">
                      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.6)]"
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
                <span className="text-gray-400">Overall Progress</span>
                <span className="text-indigo-400">{successCount}/{uploadQueue.length} complete</span>
              </div>
              <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-500"
                  style={{ width: `${uploadQueue.length > 0 ? (successCount / uploadQueue.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Clear queue button after completion */}
          {!uploading && uploadQueue.length > 0 && (
            <button
              onClick={() => setUploadQueue([])}
              className="w-full text-[9px] font-bold text-gray-500 hover:text-white py-2 transition-colors uppercase tracking-widest"
            >
              Dismiss Queue
            </button>
          )}
        </div>
      )}

      {statusMessage && uploadQueue.length === 0 && (
        <div className="p-6 rounded-2xl text-[10px] font-black uppercase text-center bg-white/5 border border-white/10">{statusMessage}</div>
      )}

      <button
        onClick={(e) => processUploadOrEmbed(e)}
        disabled={
          uploading || 
          (!selectedLessonId && inputType !== 'snippet' && !(inputType === 'file' && files.some((f: any) => (f.fullPath || f.webkitRelativePath || '').split('/').length >= 3)))
        }
        className="w-full bg-white text-black font-black py-6 rounded-[2rem] hover:bg-gray-200 uppercase tracking-widest text-[10px] shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {uploading ? `Transmitting... (${inFlightCount} active)` : 'Execute Transaction'}
      </button>
    </div>
  );
}
