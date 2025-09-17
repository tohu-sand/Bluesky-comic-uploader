import type { ComicImage } from '../types';
import { sortFilesBySequence } from '@utils/filename';

export function filterImageFiles(files: FileList | File[]): File[] {
  const iterable = Array.isArray(files) ? files : Array.from(files);
  return iterable.filter((file) => /image\/(png|jpeg|jpg|webp)/i.test(file.type) || /\.(png|jpe?g|webp)$/i.test(file.name));
}

export function toComicImages(files: File[]): ComicImage[] {
  const sorted = sortFilesBySequence(files);
  return sorted.map((file, index) => {
    const id = crypto.randomUUID();
    const objectUrl = URL.createObjectURL(file);
    return {
      id,
      file,
      name: file.name,
      index,
      size: file.size,
      type: file.type || inferMimeType(file.name),
      objectUrl,
      altText: `Page ${index + 1}`
    } satisfies ComicImage;
  });
}

export function releaseComicImages(images: ComicImage[]) {
  for (const image of images) {
    URL.revokeObjectURL(image.objectUrl);
    if (image.thumbnailUrl) {
      URL.revokeObjectURL(image.thumbnailUrl);
    }
  }
}

function inferMimeType(name: string): string {
  if (/\.png$/i.test(name)) return 'image/png';
  if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
  if (/\.webp$/i.test(name)) return 'image/webp';
  return 'application/octet-stream';
}
