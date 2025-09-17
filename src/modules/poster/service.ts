import type { ComicImage, PostPlan, ThreadResult } from '@modules/types';
import { compressImageIfNeeded } from '@modules/ingest/compression';
import { createFeedPost, uploadImageBlob } from './api';
import { createSemaphore } from '@utils/promise';
import type { AuthContext } from '@modules/auth/context';

export interface PosterOptions {
  concurrency?: number;
  maxUploadBytes?: number;
  signal?: AbortSignal;
  onUploadProgress?: (payload: {
    imageId: string;
    status: 'uploading' | 'success' | 'error';
    attempt: number;
    error?: string;
  }) => void;
  onPostProgress?: (payload: {
    postId: string;
    status: 'posting' | 'success' | 'error';
    uri?: string;
    error?: string;
  }) => void;
}

interface UploadedImageRef {
  image: ComicImage;
  blobRef: {
    $type: 'blob';
    ref: { $link: string };
    mimeType: string;
    size: number;
  };
}

export class PosterService {
  constructor(private authContext: AuthContext) {}

  async postPlan(plan: PostPlan, options: PosterOptions = {}): Promise<ThreadResult> {
    const allImages = plan.entries.flatMap((entry) => entry.images);
    const uploaded = await this.uploadAllImages(allImages, options);

    const threadUris: string[] = [];
    let root: { uri: string; cid: string } | null = null;
    let previous: { uri: string; cid: string } | null = null;
    const repoDid = this.resolveDid();

    for (const entry of plan.entries) {
      options.onPostProgress?.({ postId: entry.id, status: 'posting' });
      try {
        const embeds = entry.images.map((image) => {
          const upload = uploaded.get(image.id);
          if (!upload) {
            throw new Error(`Missing uploaded blob for image ${image.id}`);
          }
          return {
            alt: image.altText,
            image: upload.blobRef
          };
        });

        const record = {
          repo: repoDid,
          collection: 'app.bsky.feed.post',
          record: {
            $type: 'app.bsky.feed.post',
            text: entry.text ?? '',
            createdAt: new Date().toISOString(),
            embed: {
              $type: 'app.bsky.embed.images',
              images: embeds
            },
            ...(previous && root
              ? {
                  reply: {
                    root,
                    parent: previous
                  }
                }
              : {})
          }
        };

        const response = await createFeedPost(this.authContext, record, options.signal);
        const result = { uri: response.uri, cid: response.cid };
        if (!root) {
          root = result;
        }
        previous = result;
        threadUris.push(response.uri);
        options.onPostProgress?.({ postId: entry.id, status: 'success', uri: response.uri });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        options.onPostProgress?.({ postId: entry.id, status: 'error', error: message });
        throw error;
      }
    }

    if (!root) {
      throw new Error('Thread creation did not produce a root post');
    }

    return {
      rootUri: root.uri,
      uris: threadUris
    };
  }

  private resolveDid() {
    if (this.authContext.type === 'oauth') {
      return this.authContext.session.activeDid;
    }
    return this.authContext.did;
  }

  private async uploadAllImages(images: ComicImage[], options: PosterOptions) {
    const concurrency = options.concurrency ?? 3;
    const maxBytes = options.maxUploadBytes ?? 900_000;
    const semaphore = createSemaphore(concurrency);
    const uploaded = new Map<string, UploadedImageRef>();

    await Promise.all(
      images.map((image) =>
        semaphore(async () => {
          let attempt = 0;
          while (true) {
            attempt += 1;
            options.onUploadProgress?.({ imageId: image.id, status: 'uploading', attempt });
            try {
              const compressedFile = await compressImageIfNeeded(image.file, maxBytes);
              const uploadTarget: ComicImage = compressedFile === image.file
                ? image
                : {
                    ...image,
                    file: compressedFile,
                    size: compressedFile.size,
                    type: compressedFile.type
                  };
              const response = await uploadImageBlob(uploadTarget, this.authContext, options.signal);
              uploaded.set(image.id, { image: uploadTarget, blobRef: response.blob });
              options.onUploadProgress?.({ imageId: image.id, status: 'success', attempt });
              break;
            } catch (error) {
              const message = error instanceof Error ? error.message : String(error);
              options.onUploadProgress?.({ imageId: image.id, status: 'error', attempt, error: message });
              if (attempt >= 4) {
                throw error;
              }
              await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
            }
          }
        })
      )
    );

    return uploaded;
  }
}
