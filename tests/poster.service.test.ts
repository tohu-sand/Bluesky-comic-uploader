import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@modules/poster/api', () => ({
  uploadImageBlob: vi.fn(async () => ({
    blob: {
      $type: 'blob',
      ref: { $link: `link-${Math.random()}` },
      mimeType: 'image/png',
      size: 100
    }
  })),
  createFeedPost: vi.fn(async (_context, record: unknown) => ({
    uri: `at://did:example/${Math.random().toString(36).slice(2, 8)}`,
    cid: `cid-${Math.random().toString(36).slice(2, 8)}`,
    record
  }))
}));

vi.mock('@modules/ingest/compression', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@modules/ingest/compression')>();
  return {
    ...actual,
    compressImageIfNeeded: vi.fn(async (file: File) => file)
  };
});

import { uploadImageBlob, createFeedPost, type CreateRecordResponse } from '@modules/poster/api';
import { PosterService } from '@modules/poster/service';
import type { ComicImage, PostPlan } from '@modules/types';
import type { AuthContext } from '@modules/auth/context';

const authContext: AuthContext = {
  type: 'app-password',
  service: 'https://pds.example',
  did: 'did:example:123',
  accessJwt: 'token'
};

const createImage = (id: string, index: number): ComicImage => ({
  id,
  file: {} as File,
  name: `img-${id}.png`,
  index,
  size: 100,
  type: 'image/png',
  objectUrl: '',
  altText: `Page ${index + 1}`
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PosterService', () => {
  it('threads posts with reply references after the first post', async () => {
    const service = new PosterService(authContext);
    const plan: PostPlan = {
      entries: [
        {
          id: '1',
          text: 'First post',
          images: [createImage('1', 0), createImage('2', 1)]
        },
        {
          id: '2',
          text: 'Second post',
          images: [createImage('3', 2)]
        }
      ],
      totalPosts: 2,
      totalImages: 3
    };

    await service.postPlan(plan);

    expect(uploadImageBlob).toHaveBeenCalledTimes(3);
    expect(createFeedPost).toHaveBeenCalledTimes(2);
    const calls = vi.mocked(createFeedPost).mock.calls;
    const callArgs = calls.map((call) => call?.[1]);
    const firstCall = callArgs[0];
    const secondCall = callArgs[1];

    expect(firstCall).toBeDefined();
    expect(secondCall).toBeDefined();

    expect(firstCall?.record.reply).toBeUndefined();
    expect(secondCall?.record.reply).toBeDefined();
    expect(secondCall?.record.reply.parent.uri).toBeTruthy();
  });

  it('retries uploads on transient errors', async () => {
    const service = new PosterService(authContext);
    vi.mocked(uploadImageBlob)
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValue({
        blob: {
          $type: 'blob',
          ref: { $link: 'retry-link' },
          mimeType: 'image/png',
          size: 100
        }
      });
    const mockResponse: CreateRecordResponse = { uri: 'at://did/test', cid: 'cid' };
    vi.mocked(createFeedPost).mockResolvedValue(mockResponse);

    const plan: PostPlan = {
      entries: [
        { id: '1', text: 'Test', images: [createImage('1', 0)] }
      ],
      totalPosts: 1,
      totalImages: 1
    };

    await service.postPlan(plan);

    expect(uploadImageBlob).toHaveBeenCalledTimes(2);
  });

  it('includes aspect ratio when width and height are provided', async () => {
    const service = new PosterService(authContext);
    const imageWithDimensions: ComicImage = {
      ...createImage('1', 0),
      width: 2048,
      height: 1536
    };
    const plan: PostPlan = {
      entries: [{ id: '1', text: 'with dimensions', images: [imageWithDimensions] }],
      totalPosts: 1,
      totalImages: 1
    };

    await service.postPlan(plan);

    const [firstCall] = vi.mocked(createFeedPost).mock.calls;
    expect(firstCall).toBeDefined();
    const record = firstCall?.[1] as {
      record: {
        embed: { images: Array<{ aspectRatio?: { width: number; height: number } }> };
      };
    } | undefined;
    expect(record?.record.embed.images[0].aspectRatio).toEqual({ width: 4, height: 3 });
  });
});
