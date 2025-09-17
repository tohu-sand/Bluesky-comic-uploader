export interface ComicImage {
  id: string;
  file: File;
  name: string;
  index: number;
  size: number;
  type: string;
  objectUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  averageLuminance?: number;
  transparentPixelRatio?: number;
  markedForRemoval?: boolean;
  blankCandidate?: boolean;
  altText: string;
}

export interface ComicImageGroup {
  id: string;
  images: ComicImage[];
  text: string;
  scheduledAt?: number;
}

export interface PostPlanEntry {
  id: string;
  text: string;
  images: ComicImage[];
}

export interface PostPlan {
  entries: PostPlanEntry[];
  totalPosts: number;
  totalImages: number;
}

export interface OAuthSession {
  accessToken: string;
  refreshToken?: string;
  activeDid: string;
  expiresAt: number;
  pdsUrl: string;
}

export interface UploadSlotProgress {
  imageId: string;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error?: string;
  attempt: number;
}

export interface PostProgress {
  postId: string;
  images: string[];
  status: 'pending' | 'posting' | 'success' | 'error';
  error?: string;
  uri?: string;
  cid?: string;
}

export interface ThreadResult {
  rootUri: string;
  uris: string[];
}

export interface ScheduledImage {
  id: string;
  name: string;
  type: string;
  size: number;
  altText: string;
  fileData: Blob;
}

export interface ScheduledGroup {
  id: string;
  text: string;
  images: ScheduledImage[];
}

export interface SchedulerEntry {
  id: string;
  title: string;
  createdAt: number;
  scheduledAt: number;
  groups: ScheduledGroup[];
  textTemplate?: string;
}

export type RetryableResult<T> =
  | {
      ok: true;
      value: T;
    }
  | {
      ok: false;
      error: Error;
      retryAfter?: number;
    };
