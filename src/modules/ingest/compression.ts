export const DEFAULT_MAX_BYTES = Math.round(0.95 * 1024 * 1024);

export type CompressionMode = 'balanced' | 'near-lossless';

export interface CompressionOptions {
  maxBytes?: number;
  mode?: CompressionMode;
}

export async function compressImageIfNeeded(
  file: File,
  options?: number | CompressionOptions
): Promise<File> {
  let maxBytes = DEFAULT_MAX_BYTES;
  let mode: CompressionMode = 'balanced';

  if (typeof options === 'number') {
    maxBytes = options;
  } else if (options) {
    maxBytes = options.maxBytes ?? maxBytes;
    mode = options.mode ?? mode;
  }

  if (file.size <= maxBytes) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  let working = createCanvas(bitmap.width, bitmap.height);
  working.context.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  const targetType = mode === 'near-lossless'
    ? 'image/jpeg'
    : file.type === 'image/png'
      ? 'image/png'
      : 'image/webp';

  let blob: Blob;
  let quality: number;

  if (mode === 'near-lossless') {
    quality = 1;
    blob = await blobFromCanvas(working.canvas, targetType, quality);
    const minQuality = 0.7;
    const qualityStep = 0.005;
    let attempts = 0;

    while (blob.size > maxBytes && quality > minQuality && attempts < 1000) {
      attempts += 1;
      const nextQuality = Math.max(minQuality, roundToStep(quality - qualityStep, 1000));
      if (nextQuality === quality) {
        break;
      }
      quality = nextQuality;
      blob = await blobFromCanvas(working.canvas, targetType, quality);
    }
  } else {
    quality = 0.92;
    blob = await blobFromCanvas(working.canvas, targetType, quality);

    while (blob.size > maxBytes && quality > 0.5) {
      const nextQuality = Math.max(0.5, roundToStep(quality - 0.05, 100));
      if (nextQuality === quality) {
        break;
      }
      quality = nextQuality;
      blob = await blobFromCanvas(working.canvas, targetType, quality);
    }
  }

  while (blob.size > maxBytes && Math.min(working.canvas.width, working.canvas.height) > 512) {
    const nextWidth = Math.floor(working.canvas.width * 0.9);
    const nextHeight = Math.floor(working.canvas.height * 0.9);
    const scaled = createCanvas(nextWidth, nextHeight);
    scaled.context.drawImage(working.canvas as CanvasImageSource, 0, 0, nextWidth, nextHeight);
    working = scaled;
    blob = await blobFromCanvas(working.canvas, targetType, quality);
  }

  if (blob.size >= file.size) {
    return file;
  }

  return new File([blob], file.name.replace(/\.[^.]+$/, getExtensionForType(blob.type)), {
    type: blob.type,
    lastModified: Date.now()
  });
}

function createCanvas(width: number, height: number) {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to create canvas context');
    }
    context.imageSmoothingQuality = 'high';
    return { canvas, context };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Failed to create canvas context');
  }
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}

async function blobFromCanvas(canvas: OffscreenCanvas | HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  if ('convertToBlob' in canvas) {
    return (canvas as OffscreenCanvas).convertToBlob({ type, quality });
  }
  return new Promise<Blob>((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

function roundToStep(value: number, scale: number) {
  return Math.round(value * scale) / scale;
}

function getExtensionForType(type: string) {
  if (type === 'image/png') return '.png';
  if (type === 'image/webp') return '.webp';
  if (type === 'image/jpeg') return '.jpg';
  return '.img';
}
