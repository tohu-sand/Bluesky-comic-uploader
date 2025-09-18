import { RichText } from '@atproto/api';
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
    const templatedText = derivePostText({
      index,
      totalPosts,
      template: options.template,
      enableTemplate: options.enableTemplate,
      fallbackText: options.fallbackText,
      from: group[0]?.index ?? 0,
      to: group[group.length - 1]?.index ?? 0
    });

    let text: string;
    if (index === 0) {
      const base = options.firstPostText ?? '';
      if (options.enableTemplate && templatedText) {
        text = base ? `${base.replace(/\s*$/, '')}\n${templatedText}` : templatedText;
      } else {
        text = base;
      }
    } else {
      text = templatedText;
    }
    const { text: normalizedText, facets } = analyzeText(text);
    return {
      id: `${index + 1}`,
      text: normalizedText,
      images: group,
      ...(facets ? { facets } : {})
    };
  });

  return {
    entries,
    totalPosts,
    totalImages: usable.length
  };
}

function analyzeText(text: string) {
  if (!text) {
    return { text: '', facets: undefined };
  }
  const richText = new RichText({ text });
  richText.detectFacetsWithoutResolution();
  return {
    text: richText.text,
    facets: richText.facets?.length ? richText.facets : undefined
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
