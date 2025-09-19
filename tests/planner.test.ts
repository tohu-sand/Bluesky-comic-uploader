import { describe, expect, it } from 'vitest';
import { buildPostPlan } from '@modules/poster/planner';
import type { ComicImage } from '@modules/types';

const createImage = (id: string, index: number) => ({
  id,
  file: {} as File,
  name: `${id}.png`,
  index,
  size: 1,
  type: 'image/png',
  objectUrl: '',
  altText: `Page ${index + 1}`
}) satisfies ComicImage;

describe('buildPostPlan', () => {
  it('chunks images into groups of four', () => {
    const images = Array.from({ length: 9 }, (_, index) => createImage(`img-${index}`, index));
    const plan = buildPostPlan(images, {
      firstPostText: 'Hello',
      template: '({i}/{n})',
      enableTemplate: true,
      fallbackText: ''
    });
    expect(plan.totalPosts).toBe(3);
    expect(plan.entries[0]?.text).toBe('Hello\n(1/3)');
    expect(plan.entries[0]?.images).toHaveLength(4);
    expect(plan.entries[1]?.images).toHaveLength(4);
    expect(plan.entries[2]?.images).toHaveLength(1);
    expect(plan.entries[1]?.text).toBe('(2/3)');
  });

  it('skips removed images', () => {
    const images = [createImage('1', 0), { ...createImage('2', 1), markedForRemoval: true }];
    const plan = buildPostPlan(images, {
      firstPostText: '',
      template: '({i}/{n})',
      enableTemplate: true,
      fallbackText: ''
    });
    expect(plan.totalImages).toBe(1);
    expect(plan.entries[0]?.images).toHaveLength(1);
  });

  it('does not append template to first post when template disabled', () => {
    const images = Array.from({ length: 4 }, (_, index) => createImage(`img-${index}`, index));
    const plan = buildPostPlan(images, {
      firstPostText: 'Hello',
      template: '({i}/{n})',
      enableTemplate: false,
      fallbackText: 'fallback'
    });
    expect(plan.entries[0]?.text).toBe('Hello');
    expect(plan.entries[1]).toBeUndefined();
  });

  it('adds facets for hashtags and URLs', () => {
    const images = [createImage('1', 0)];
    const plan = buildPostPlan(images, {
      firstPostText: 'Check this out #sample https://example.com',
      template: '',
      enableTemplate: false,
      fallbackText: ''
    });
    const features = plan.entries[0]?.facets?.flatMap((facet) => facet.features) ?? [];
    expect(features).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ $type: 'app.bsky.richtext.facet#tag', tag: 'sample' }),
        expect.objectContaining({ $type: 'app.bsky.richtext.facet#link', uri: 'https://example.com' })
      ])
    );
  });

  it('limits the first post to a single image when enabled', () => {
    const images = Array.from({ length: 6 }, (_, index) => createImage(`img-${index}`, index));
    const plan = buildPostPlan(images, {
      firstPostText: 'Intro',
      template: '({i}/{n})',
      enableTemplate: true,
      fallbackText: '',
      firstPostSingleImage: true
    });
    expect(plan.entries[0]?.images).toHaveLength(1);
    expect(plan.entries[1]?.images).toHaveLength(4);
    expect(plan.entries[2]?.images).toHaveLength(1);
    expect(plan.entries[0]?.text).toBe('Intro\n(1/3)');
  });
});
