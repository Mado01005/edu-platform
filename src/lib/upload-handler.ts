export type UploadProgressOptions = {
  file: File;
  headers?: Record<string, string>;
  onProgress?: (percentage: number) => void;
  signal?: AbortSignal;
  url: string;
};

export function uploadWithProgress({
  file,
  headers = {},
  onProgress,
  signal,
  url,
}: UploadProgressOptions) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abort = () => request.abort();

    request.open('PUT', url);
    Object.entries(headers).forEach(([name, value]) =>
      request.setRequestHeader(name, value),
    );
    request.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        onProgress?.(Math.round((event.loaded / event.total) * 100));
      }
    });
    request.addEventListener('load', () => {
      signal?.removeEventListener('abort', abort);
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(
          new Error(
            'R2 rejected the upload. Check the bucket CORS configuration.',
          ),
        );
      }
    });
    request.addEventListener('error', () =>
      reject(new Error('The upload connection failed.')),
    );
    request.addEventListener('abort', () =>
      reject(new DOMException('Upload cancelled.', 'AbortError')),
    );

    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled.', 'AbortError'));
      return;
    }
    signal?.addEventListener('abort', abort, { once: true });
    request.send(file);
  });
}
