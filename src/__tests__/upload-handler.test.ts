import { uploadWithProgress } from '@/lib/upload-handler';

type Listener = (event: { lengthComputable: boolean; loaded: number; total: number }) => void;

class FakeXmlHttpRequest {
  static latest: FakeXmlHttpRequest;
  listeners = new Map<string, () => void>();
  uploadListeners = new Map<string, Listener>();
  upload = {
    addEventListener: (name: string, listener: Listener) => this.uploadListeners.set(name, listener),
  };
  status = 200;
  abort = jest.fn(() => this.listeners.get('abort')?.());
  open = jest.fn();
  send = jest.fn();
  setRequestHeader = jest.fn();

  constructor() {
    FakeXmlHttpRequest.latest = this;
  }

  addEventListener(name: string, listener: () => void) {
    this.listeners.set(name, listener);
  }
}

describe('uploadWithProgress', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'XMLHttpRequest', {
      configurable: true,
      value: FakeXmlHttpRequest,
    });
  });

  it('reports measured progress and completes successful R2 uploads', async () => {
    const onProgress = jest.fn();
    const promise = uploadWithProgress({
      file: new Blob(['material']) as File,
      headers: { 'Content-Type': 'application/pdf' },
      onProgress,
      url: 'https://r2.example.test/material.pdf',
    });
    const request = FakeXmlHttpRequest.latest;
    request.uploadListeners.get('progress')?.({ lengthComputable: true, loaded: 5, total: 10 });
    request.listeners.get('load')?.();

    await expect(promise).resolves.toBeUndefined();
    expect(onProgress).toHaveBeenNthCalledWith(1, 50);
    expect(onProgress).toHaveBeenLastCalledWith(100);
    expect(request.setRequestHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
  });

  it('aborts network traffic when the caller cancels', async () => {
    const controller = new AbortController();
    const promise = uploadWithProgress({
      file: new Blob(['material']) as File,
      signal: controller.signal,
      url: 'https://r2.example.test/material.pdf',
    });
    const request = FakeXmlHttpRequest.latest;
    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(request.abort).toHaveBeenCalledTimes(1);
  });
});
