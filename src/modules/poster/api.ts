import { buildAuthHeaders, getServiceBaseUrl, type AuthContext } from '@modules/auth/context';
import type { ComicImage } from '@modules/types';
import { retryWithBackoff } from '@utils/promise';

export interface UploadedBlobRef {
  $type: 'blob';
  ref: { $link: string };
  mimeType: string;
  size: number;
}

export interface UploadResponse {
  blob: UploadedBlobRef;
}

export interface CreateRecordResponse {
  uri: string;
  cid: string;
}

function endpointUrl(context: AuthContext, path: string) {
  return new URL(`/xrpc/${path}`, getServiceBaseUrl(context)).toString();
}

export async function uploadImageBlob(
  image: ComicImage,
  context: AuthContext,
  signal?: AbortSignal
): Promise<UploadResponse> {
  const endpoint = endpointUrl(context, 'com.atproto.repo.uploadBlob');
  const headers = await buildAuthHeaders(context, endpoint, 'POST');

  return retryWithBackoff(async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': image.type
      },
      body: image.file,
      signal
    });

    if (!response.ok) {
      if (response.status >= 500 || response.status === 429) {
        throw new Error(`Retryable upload error: ${response.status}`);
      }
      const text = await response.text();
      throw new Error(`Upload failed: ${response.status} ${text}`);
    }
    const json = await response.json() as UploadResponse;
    return json;
  });
}

export async function createFeedPost(
  context: AuthContext,
  record: unknown,
  signal?: AbortSignal
): Promise<CreateRecordResponse> {
  const endpoint = endpointUrl(context, 'com.atproto.repo.createRecord');
  const headers = await buildAuthHeaders(context, endpoint, 'POST');

  return retryWithBackoff(async () => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(record),
      signal
    });

    if (!response.ok) {
      if (response.status >= 500 || response.status === 429) {
        throw new Error(`Retryable createRecord error: ${response.status}`);
      }
      const text = await response.text();
      throw new Error(`createRecord failed: ${response.status} ${text}`);
    }
    return await response.json() as CreateRecordResponse;
  });
}
