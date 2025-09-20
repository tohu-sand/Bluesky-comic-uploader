import type { ComicImage, SchedulerEntry } from '@modules/types';
import { deleteSchedulerEntry, listSchedulerEntries } from './storage';

export type SchedulerHandler = (entry: SchedulerEntry, images: ComicImage[][]) => Promise<void>;

export class SchedulerService {
  private timerId: number | null = null;
  private processing = false;

  constructor(private handler: SchedulerHandler) {}

  start(intervalMs = 30_000) {
    if (this.timerId !== null) return;
    this.timerId = window.setInterval(() => this.tick(), intervalMs);
    void this.tick();
  }

  stop() {
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  private async tick() {
    if (this.processing) return;
    this.processing = true;
    try {
      const entries = await listSchedulerEntries();
      const now = Date.now();
      for (const entry of entries) {
        if (entry.scheduledAt <= now) {
          const imageGroups: ComicImage[][] = [];
          for (const group of entry.groups) {
            const images: ComicImage[] = [];
            for (const [index, image] of group.images.entries()) {
              const file = new File([image.fileData], image.name, { type: image.type, lastModified: Date.now() });
              const objectUrl = URL.createObjectURL(file);
              let width = image.width;
              let height = image.height;
              if (!width || !height) {
                try {
                  const dimensions = await readImageDimensions(file);
                  if (dimensions) {
                    width = dimensions.width;
                    height = dimensions.height;
                  }
                } catch (dimensionError) {
                  console.warn('Failed to determine image dimensions for scheduled post', dimensionError);
                }
              }
              images.push({
                id: `${group.id}-${image.id}-${crypto.randomUUID()}`,
                file,
                name: image.name,
                index,
                size: image.size,
                type: image.type,
                objectUrl,
                altText: image.altText,
                width,
                height
              });
            }
            imageGroups.push(images);
          }
          await this.handler(entry, imageGroups);
          await deleteSchedulerEntry(entry.id);
        }
      }
    } catch (error) {
      console.error('Scheduler tick failed', error);
    } finally {
      this.processing = false;
    }
  }
}

async function readImageDimensions(file: Blob): Promise<{ width: number; height: number } | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      const dimensions = { width: bitmap.width, height: bitmap.height };
      bitmap.close?.();
      return dimensions;
    } catch (error) {
      console.warn('createImageBitmap failed while reading image dimensions', error);
    }
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();

    const cleanup = () => {
      URL.revokeObjectURL(url);
      image.onload = null;
      image.onerror = null;
    };

    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      cleanup();
    };

    image.onerror = () => {
      cleanup();
      resolve(null);
    };

    image.src = url;
  });
}
