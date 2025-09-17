import type { ComicImage } from '../types';

type ThumbnailResponse = {
  id: string;
  width: number;
  height: number;
  thumbnail?: Blob;
  error?: string;
  metrics?: {
    averageLuminance: number;
    whitePixelRatio: number;
    transparentPixelRatio: number;
    isLikelyBlank: boolean;
  };
};

const workerUrl = new URL('../../workers/thumbnail.worker.ts', import.meta.url);

export class ThumbnailService {
  private worker?: Worker;
  private pending = new Map<string, (value: ThumbnailResponse) => void>();
  private rejecting = new Map<string, (reason?: unknown) => void>();

  private ensureWorker() {
    if (!this.worker) {
      this.worker = new Worker(workerUrl, { type: 'module' });
      this.worker.onmessage = (event: MessageEvent<ThumbnailResponse>) => {
        const response = event.data;
        const resolve = this.pending.get(response.id);
        if (resolve) {
          resolve(response);
          this.pending.delete(response.id);
        }
        this.rejecting.delete(response.id);
      };
      this.worker.onerror = (error) => {
        for (const reject of this.rejecting.values()) {
          reject(error);
        }
        this.pending.clear();
        this.rejecting.clear();
        this.worker?.terminate();
        this.worker = undefined;
      };
    }
  }

  async generate(
    image: ComicImage,
    options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
  ) {
    const { maxWidth = 480, maxHeight = 480, quality = 0.8 } = options;
    this.ensureWorker();
    const requestId = `${image.id}-${crypto.randomUUID()}`;
    if (!this.worker) {
      throw new Error('Failed to initialize thumbnail worker');
    }

    const response = await new Promise<ThumbnailResponse>((resolve, reject) => {
      this.pending.set(requestId, resolve);
      this.rejecting.set(requestId, reject);
      this.worker?.postMessage({
        id: requestId,
        file: image.file,
        maxWidth,
        maxHeight,
        quality
      });
    });

    if (response.error) {
      throw new Error(response.error);
    }
    return response;
  }

  dispose() {
    this.worker?.terminate();
    this.worker = undefined;
    this.pending.clear();
    this.rejecting.clear();
  }
}
