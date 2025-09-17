import type { ComicImage, PostPlan } from '@modules/types';
import { chunkArray } from '@utils/chunk';

export interface PlanOptions {
  firstPostText: string;
  template?: string;
  enableTemplate: boolean;
  fallbackText?: string;
}

export function buildPostPlan(images: ComicImage[], options: PlanOptions): PostPlan {
  const usable = images.filter((image) => !image.markedForRemoval);
  const chunks = chunkArray(usable, 4);
  const totalPosts = chunks.length;
  const entries = chunks.map((group, index) => {
    const text = index === 0
      ? options.firstPostText
      : derivePostText({
          index,
          totalPosts,
          template: options.template,
          enableTemplate: options.enableTemplate,
          fallbackText: options.fallbackText,
          from: group[0]?.index ?? 0,
          to: group[group.length - 1]?.index ?? 0
        });
    return {
      id: `${index + 1}`,
      text,
      images: group
    };
  });

  return {
    entries,
    totalPosts,
    totalImages: usable.length
  };
}

function derivePostText({
  index,
  totalPosts,
  template,
  enableTemplate,
  fallbackText,
  from,
  to
}: {
  index: number;
  totalPosts: number;
  template?: string;
  enableTemplate: boolean;
  fallbackText?: string;
  from: number;
  to: number;
}) {
  if (!enableTemplate || !template) {
    return fallbackText ?? '';
  }
  const current = index + 1;
  const startPage = from + 1;
  const endPage = to + 1;
  return template
    .replaceAll('{i}', String(current))
    .replaceAll('{n}', String(totalPosts))
    .replaceAll('{from}', String(startPage))
    .replaceAll('{to}', String(endPage));
}
