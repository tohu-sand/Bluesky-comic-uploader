import type { ComicImage } from '@modules/types';

export function updateAltTexts(images: ComicImage[], template: string) {
  const activeImages = images.filter((image) => !image.markedForRemoval);
  const total = activeImages.length;
  activeImages.forEach((image, idx) => {
    image.altText = template
      .replaceAll('{i}', String(idx + 1))
      .replaceAll('{n}', String(total))
      .replaceAll('{name}', image.name.replace(/\.[^.]+$/, ''));
  });
}
