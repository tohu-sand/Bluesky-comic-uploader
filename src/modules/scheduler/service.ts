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
          const imageGroups = entry.groups.map((group) =>
            group.images.map((image, index) => {
              const file = new File([image.fileData], image.name, { type: image.type, lastModified: Date.now() });
              return {
                id: `${group.id}-${image.id}-${crypto.randomUUID()}`,
                file,
                name: image.name,
                index,
                size: image.size,
                type: image.type,
                objectUrl: URL.createObjectURL(file),
                altText: image.altText,
                width: image.width,
                height: image.height
              } satisfies ComicImage;
            })
          );
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
