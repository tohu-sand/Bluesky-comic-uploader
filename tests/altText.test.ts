import { describe, expect, it } from 'vitest';
import { updateAltTexts } from '@modules/editor/altText';
import type { ComicImage } from '@modules/types';

const createImage = (idx: number, overrides: Partial<ComicImage> = {}): ComicImage => ({
  id: `image-${idx}`,
  file: {} as File,
  name: `image-${idx}.png`,
  index: idx,
  size: 1,
  type: 'image/png',
  objectUrl: '',
  altText: `original-${idx + 1}`,
  ...overrides
});

describe('updateAltTexts', () => {
  it('ignores removed images when assigning indexes and totals', () => {
    const images = [
      createImage(0),
      createImage(1, { markedForRemoval: true }),
      createImage(2)
    ];

    updateAltTexts(images, 'Page {i} of {n}');

    expect(images[0].altText).toBe('Page 1 of 2');
    expect(images[1].altText).toBe('original-2');
    expect(images[2].altText).toBe('Page 2 of 2');
  });
});
