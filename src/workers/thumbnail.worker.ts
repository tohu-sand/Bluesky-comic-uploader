/// <reference lib="webworker" />
import { analyzeWhitePage } from '@modules/editor/whitePageDetector';

type ThumbnailRequest = {
  id: string;
  file: File;
  maxWidth: number;
  maxHeight: number;
  quality?: number;
};

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

declare const self: DedicatedWorkerGlobalScope;

self.onmessage = async (event: MessageEvent<ThumbnailRequest>) => {
  const { id, file, maxWidth, maxHeight, quality = 0.8 } = event.data;
  const response: ThumbnailResponse = { id, width: 0, height: 0 };

  if (typeof OffscreenCanvas === 'undefined') {
    response.error = 'OffscreenCanvas is not supported in this environment.';
    self.postMessage(response);
    return;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    response.width = width;
    response.height = height;

    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    const targetWidth = Math.max(1, Math.round(width * scale));
    const targetHeight = Math.max(1, Math.round(height * scale));

    const thumbnailCanvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = thumbnailCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not create 2D context for thumbnail');
    }
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
    response.metrics = analyzeWhitePage(imageData);

    const blob = await thumbnailCanvas.convertToBlob({
      type: 'image/webp',
      quality
    });
    response.thumbnail = blob;
    bitmap.close?.();
  } catch (error) {
    response.error = error instanceof Error ? error.message : String(error);
  }

  self.postMessage(response);
};
