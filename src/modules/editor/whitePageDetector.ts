export interface WhitePageAnalysis {
  averageLuminance: number;
  whitePixelRatio: number;
  transparentPixelRatio: number;
  isLikelyBlank: boolean;
}

const LUMINANCE_THRESHOLD = 0.92;
const WHITE_RATIO_THRESHOLD = 0.75;
const TRANSPARENT_RATIO_THRESHOLD = 0.6;

export function analyzeWhitePage(imageData: ImageData): WhitePageAnalysis {
  const { data, width, height } = imageData;
  const pixelCount = width * height;
  let luminanceSum = 0;
  let whitePixels = 0;
  let transparentPixels = 0;

  for (let i = 0; i < data.length; i += 4) {
    const r = (data[i] ?? 0) / 255;
    const g = (data[i + 1] ?? 0) / 255;
    const b = (data[i + 2] ?? 0) / 255;
    const alpha = (data[i + 3] ?? 0) / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    luminanceSum += luminance;
    if (luminance > LUMINANCE_THRESHOLD && alpha > 0.85) {
      whitePixels += 1;
    }
    if (alpha < 0.05) {
      transparentPixels += 1;
    }
  }

  const averageLuminance = luminanceSum / pixelCount;
  const whitePixelRatio = whitePixels / pixelCount;
  const transparentPixelRatio = transparentPixels / pixelCount;
  const isLikelyBlank = averageLuminance > LUMINANCE_THRESHOLD && (whitePixelRatio > WHITE_RATIO_THRESHOLD || transparentPixelRatio > TRANSPARENT_RATIO_THRESHOLD);

  return {
    averageLuminance,
    whitePixelRatio,
    transparentPixelRatio,
    isLikelyBlank
  };
}
