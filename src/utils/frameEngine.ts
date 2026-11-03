import { CapturedFrame, ColorGrading } from '../types';

export function formatTimeShort(seconds: number): string {
  const safe = Math.max(0, seconds || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export function formatTimePrecise(seconds: number): string {
  const safe = Math.max(0, seconds || 0);
  const mins = Math.floor(safe / 60);
  const secs = Math.floor(safe % 60);
  const tenths = Math.floor((safe % 1) * 10);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${tenths}`;
}

export function computeSignatureFromCanvas(sourceCanvas: HTMLCanvasElement): number[] {
  const sampleSize = 12;
  const off = document.createElement('canvas');
  off.width = sampleSize;
  off.height = sampleSize;
  const ctx = off.getContext('2d');
  if (!ctx) return new Array(sampleSize * sampleSize * 3).fill(0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, sampleSize, sampleSize);
  const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  const signature: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    signature.push(data[i], data[i + 1], data[i + 2]);
  }
  return signature;
}

export function computeSignatureFromImage(img: HTMLImageElement): number[] {
  const sampleSize = 12;
  const off = document.createElement('canvas');
  off.width = sampleSize;
  off.height = sampleSize;
  const ctx = off.getContext('2d');
  if (!ctx) return new Array(sampleSize * sampleSize * 3).fill(0);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, sampleSize, sampleSize);
  const data = ctx.getImageData(0, 0, sampleSize, sampleSize).data;
  const signature: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    signature.push(data[i], data[i + 1], data[i + 2]);
  }
  return signature;
}

export function calculateSimilarityPercent(sigA: number[], sigB: number[]): number {
  if (!sigA.length || sigA.length !== sigB.length) return 0;
  let totalDiff = 0;
  for (let i = 0; i < sigA.length; i++) {
    totalDiff += Math.abs(sigA[i] - sigB[i]);
  }
  const maxDiff = sigA.length * 255;
  const similarity = (1 - totalDiff / maxDiff) * 100;
  return Math.round(Math.max(0, Math.min(100, similarity)));
}

export function recalculateDuplicates(
  frames: CapturedFrame[],
  thresholdPercent: number
): CapturedFrame[] {
  const uniqueAnchors: { index: number; signature: number[] }[] = [];

  return frames.map((frame, idx) => {
    const displayIndex = idx + 1;
    let bestMatchIndex: number | undefined;
    let bestSimilarity = 0;

    for (const anchor of uniqueAnchors) {
      const sim = calculateSimilarityPercent(frame.signature, anchor.signature);
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatchIndex = anchor.index;
      }
    }

    const isDup =
      thresholdPercent < 100
        ? bestSimilarity >= thresholdPercent
        : bestSimilarity >= 99;

    if (!isDup) {
      uniqueAnchors.push({
        index: displayIndex,
        signature: frame.signature,
      });
    }

    return {
      ...frame,
      index: displayIndex,
      isDuplicate: isDup,
      duplicateOfIndex: isDup ? bestMatchIndex : undefined,
      similarityPercent: isDup ? bestSimilarity : undefined,
    };
  });
}

export function getCssFilterString(color: ColorGrading): string {
  const sepiaAmount = color.warmth > 0 ? color.warmth * 0.35 : 0;
  const hueAdjust =
    color.hueTint + (color.warmth < 0 ? color.warmth * 0.4 : 0);
  return `brightness(${color.brightness}%) contrast(${color.contrast}%) saturate(${color.saturation}%) sepia(${sepiaAmount}%) hue-rotate(${hueAdjust}deg)`;
}

export function drawGradedFrameToCanvas(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  zoomPercent: number,
  color: ColorGrading
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, targetWidth, targetHeight);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  const isIdentityColor =
    color.brightness === 100 &&
    color.contrast === 100 &&
    color.saturation === 100 &&
    color.warmth === 0 &&
    color.hueTint === 0;

  ctx.filter = isIdentityColor ? 'none' : getCssFilterString(color);

  const safeSrcW = Math.max(1, sourceWidth);
  const safeSrcH = Math.max(1, sourceHeight);
  const srcAspect = safeSrcW / safeSrcH;
  const dstAspect = targetWidth / targetHeight;

  // Aspect-ratio-preserving base crop before zoom
  let baseCropW = safeSrcW;
  let baseCropH = safeSrcH;
  if (Math.abs(srcAspect - dstAspect) > 0.01) {
    if (srcAspect > dstAspect) {
      baseCropW = safeSrcH * dstAspect;
    } else {
      baseCropH = safeSrcW / dstAspect;
    }
  }

  const scale = Math.max(1, zoomPercent / 100);
  const cropW = baseCropW / scale;
  const cropH = baseCropH / scale;
  const sx = (safeSrcW - cropW) / 2;
  const sy = (safeSrcH - cropH) / 2;

  ctx.drawImage(
    source,
    sx,
    sy,
    cropW,
    cropH,
    0,
    0,
    targetWidth,
    targetHeight
  );

  ctx.filter = 'none';

  // Warmth / Cool tint overlay
  if (color.warmth !== 0) {
    ctx.fillStyle =
      color.warmth > 0
        ? `rgba(255, 145, 0, ${(color.warmth / 100) * 0.18})`
        : `rgba(0, 140, 255, ${(Math.abs(color.warmth) / 100) * 0.18})`;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  // Vignette overlay
  if (color.vignette > 0) {
    const grad = ctx.createRadialGradient(
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.22,
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.65
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${(color.vignette / 100) * 0.85})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  ctx.restore();
}

export function createStudioBackdropDataUrl(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
  grad.addColorStop(0, '#131324');
  grad.addColorStop(0.5, '#1e1b38');
  grad.addColorStop(1, '#0d0d18');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1920, 1080);

  const glow = ctx.createRadialGradient(960, 540, 60, 960, 540, 780);
  glow.addColorStop(0, 'rgba(168, 85, 247, 0.22)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1920, 1080);

  return canvas.toDataURL('image/png');
}
