import {
  CapturedFrame,
  ColorGrading,
  ExportQuality,
  ExtraFrameSettings,
  FxStyleMode,
  HookDuration,
  HookFrameTemplate,
  OverlayEffect,
  TransitionStyle,
} from '../types';
import { drawGradedFrameToCanvas, formatTimeShort } from './frameEngine';

export interface RenderConfig {
  frames: CapturedFrame[];
  videoElement: HTMLVideoElement | null;
  hookStartSec: number;
  hookDuration: HookDuration;
  hookSpeed: number;
  borderLight: boolean;
  hookTemplate: HookFrameTemplate;
  channelName: string;
  channelSizePercent: number;
  overlay: OverlayEffect;
  fxStyle: FxStyleMode;
  transitionStyle: TransitionStyle;
  ccEnabled: boolean;
  scriptText: string;
  colorGrading: ColorGrading;
  zoomPercent: number;
  quality: ExportQuality;
  extraFrame: ExtraFrameSettings;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  hue: number;
  depth: number;
  phase: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export function createParticles(count = 110): Particle[] {
  const list: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const depth = 0.3 + Math.random() * 0.7;
    list.push({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.004 * depth,
      vy: (0.006 + Math.random() * 0.016) * depth,
      size: (1.2 + Math.random() * 3.8) * depth,
      alpha: 0.25 + Math.random() * 0.65,
      hue: Math.floor(Math.random() * 360),
      depth,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return list;
}

// Helper to draw an image with pan (panX, panY in -1..1) and zoom + color grading while preserving exact aspect ratio and sharpness
function drawCameraPannedFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  zoomPercent: number,
  panX: number,
  panY: number,
  color: ColorGrading
) {
  const safeSrcW = Math.max(1, sourceWidth);
  const safeSrcH = Math.max(1, sourceHeight);
  const srcAspect = safeSrcW / safeSrcH;
  const dstAspect = targetWidth / targetHeight;

  // Aspect-ratio-preserving base crop so non-16:9 images never stretch or distort
  let baseCropW = safeSrcW;
  let baseCropH = safeSrcH;
  if (Math.abs(srcAspect - dstAspect) > 0.01) {
    if (srcAspect > dstAspect) {
      baseCropW = safeSrcH * dstAspect;
    } else {
      baseCropH = safeSrcW / dstAspect;
    }
  }

  const safeZoom = panX === 0 && panY === 0 ? Math.max(100, zoomPercent) : Math.max(104, zoomPercent);
  const scale = safeZoom / 100;
  const cropW = baseCropW / scale;
  const cropH = baseCropH / scale;
  const maxOffsetX = (safeSrcW - cropW) / 2;
  const maxOffsetY = (safeSrcH - cropH) / 2;

  const sx = maxOffsetX + panX * maxOffsetX * 0.85;
  const sy = maxOffsetY + panY * maxOffsetY * 0.85;

  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const isIdentityColor =
    color.brightness === 100 &&
    color.contrast === 100 &&
    color.saturation === 100 &&
    color.warmth === 0 &&
    color.hueTint === 0;

  if (!isIdentityColor) {
    const sepiaAmount = color.warmth > 0 ? color.warmth * 0.35 : 0;
    const hueAdjust =
      color.hueTint + (color.warmth < 0 ? color.warmth * 0.4 : 0);
    ctx.filter = `brightness(${color.brightness}%) contrast(${color.contrast}%) saturate(${color.saturation}%) sepia(${sepiaAmount}%) hue-rotate(${hueAdjust}deg)`;
  } else {
    ctx.filter = 'none';
  }

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

  if (color.warmth !== 0) {
    ctx.fillStyle =
      color.warmth > 0
        ? `rgba(255, 145, 0, ${(color.warmth / 100) * 0.16})`
        : `rgba(0, 140, 255, ${(Math.abs(color.warmth) / 100) * 0.16})`;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  if (color.vignette > 0) {
    const grad = ctx.createRadialGradient(
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.25,
      targetWidth / 2,
      targetHeight / 2,
      targetWidth * 0.68
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${(color.vignette / 100) * 0.82})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }
  ctx.restore();
}

export function renderCompositeFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSec: number,
  totalMainSec: number,
  config: RenderConfig,
  loadedImages: HTMLImageElement[],
  extraImage: HTMLImageElement | null,
  particles: Particle[],
  audioEnergy = 0.45,
  watermarkImage: HTMLImageElement | null = null
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, width, height);

  const effectiveHookSec =
    config.hookDuration > 0 ? Math.min(config.hookDuration, 15) : 0;
  const isInHook = elapsedSec < effectiveHookSec;
  const isInExtra =
    config.extraFrame.enabled && elapsedSec >= totalMainSec;

  // 1. Base Visual Layer (Hook / Extra Frame / FX Style Slideshow)
  if (isInHook) {
    renderHookLayer(
      ctx,
      width,
      height,
      elapsedSec,
      config,
      loadedImages
    );
  } else if (isInExtra && (extraImage || loadedImages.length > 0)) {
    const targetImg = extraImage || loadedImages[loadedImages.length - 1];
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    drawCameraPannedFrame(
      ctx,
      targetImg,
      targetImg.naturalWidth || 1920,
      targetImg.naturalHeight || 1080,
      width,
      height,
      100,
      0,
      0,
      { brightness: 100, contrast: 100, saturation: 100, warmth: 0, vignette: 0, hueTint: 0 }
    );
    ctx.restore();
    return;
  } else if (config.fxStyle === 'Sonic Spectrum') {
    renderSonicSpectrumLayer(
      ctx,
      width,
      height,
      elapsedSec,
      totalMainSec,
      config,
      loadedImages,
      extraImage,
      audioEnergy
    );
  } else {
    renderProSlideshowLayer(
      ctx,
      width,
      height,
      elapsedSec - effectiveHookSec,
      config,
      loadedImages
    );
  }

  // 2. Pro Particle / Weather Overlay Layer
  if (config.overlay !== 'Clean (Off)') {
    renderProOverlayEffect(
      ctx,
      width,
      height,
      config.overlay,
      particles,
      elapsedSec
    );
  }

  // 3. Global Animated RGB Border Light (if enabled in H-Control)
  if (config.borderLight && !isInHook) {
    renderRgbNeonBorder(ctx, width, height, elapsedSec);
  }

  // 4. Channel Watermark (Top-Right: Image Logo and/or Text)
  if (watermarkImage || config.channelName.trim()) {
    renderChannelWatermark(
      ctx,
      width,
      height,
      config.channelName.trim(),
      config.channelSizePercent,
      watermarkImage
    );
  }

  // 5. Burned-in Pro Subtitles (if CC enabled)
  if (config.ccEnabled && config.scriptText.trim() && !isInHook && !isInExtra) {
    renderSubtitles(
      ctx,
      width,
      height,
      elapsedSec - effectiveHookSec,
      Math.max(5, totalMainSec - effectiveHookSec),
      config.scriptText
    );
  }

  // 6. Subscribe Overlay Pill (Matching Reference Design Image)
  renderSubscribePill(ctx, width, height, elapsedSec, isInHook);

  ctx.restore();
}

function renderRgbNeonBorder(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSec: number
) {
  ctx.save();
  const hue = (elapsedSec * 110) % 360;
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, `hsl(${hue}, 100%, 55%)`);
  grad.addColorStop(0.33, `hsl(${(hue + 90) % 360}, 100%, 55%)`);
  grad.addColorStop(0.66, `hsl(${(hue + 180) % 360}, 100%, 55%)`);
  grad.addColorStop(1, `hsl(${(hue + 270) % 360}, 100%, 55%)`);

  const borderW = Math.max(6, width * 0.008);
  ctx.strokeStyle = grad;
  ctx.lineWidth = borderW;
  ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
  ctx.shadowBlur = 16;
  ctx.strokeRect(borderW / 2, borderW / 2, width - borderW, height - borderW);
  ctx.restore();
}

function renderHookLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSec: number,
  config: RenderConfig,
  loadedImages: HTMLImageElement[]
) {
  const hasFrameWrapper =
    config.hookTemplate !== 'Studio Frame' || config.borderLight;

  if (hasFrameWrapper) {
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, '#0f172a');
    bgGrad.addColorStop(0.5, '#1e293b');
    bgGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = Math.max(2, width * 0.003);
    const offset = (elapsedSec * 40) % (width * 0.08);
    for (let x = -height + offset; x < width + height; x += width * 0.08) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + height * 0.6, height);
      ctx.stroke();
    }
  }

  const padX = hasFrameWrapper ? width * 0.075 : 0;
  const padY = hasFrameWrapper ? height * 0.055 : 0;
  const boxW = width - padX * 2;
  const boxH = hasFrameWrapper ? height * 0.76 : height;

  ctx.save();
  ctx.translate(padX, padY);

  if (
    config.videoElement &&
    config.videoElement.readyState >= 2 &&
    !config.videoElement.paused
  ) {
    drawGradedFrameToCanvas(
      ctx,
      config.videoElement,
      config.videoElement.videoWidth || 1280,
      config.videoElement.videoHeight || 720,
      boxW,
      boxH,
      config.zoomPercent,
      config.colorGrading
    );
  } else if (loadedImages.length > 0) {
    const fastIdx = Math.floor(elapsedSec * 1.6) % loadedImages.length;
    const img = loadedImages[fastIdx];
    const dynZoom = Math.max(108, config.zoomPercent) + ((elapsedSec * 16) % 22);
    drawCameraPannedFrame(
      ctx,
      img,
      img.naturalWidth || 640,
      img.naturalHeight || 360,
      boxW,
      boxH,
      dynZoom,
      Math.sin(elapsedSec * 2) * 0.4,
      Math.cos(elapsedSec * 1.5) * 0.3,
      config.colorGrading
    );
  }

  if (config.borderLight || hasFrameWrapper) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
    ctx.shadowBlur = Math.max(16, width * 0.02);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.max(4, height * 0.008);
    ctx.strokeStyle = 'rgba(27, 135, 63, 0.45)';
    ctx.lineWidth = Math.max(2, width * 0.003);
    ctx.strokeRect(0, 0, boxW, boxH);
    ctx.restore();
  }

  ctx.restore();

  if (hasFrameWrapper) {
    const bannerW = width * 0.64;
    const bannerH = height * 0.11;
    const bannerX = (width - bannerW) / 2;
    const bannerY = height * 0.845;

    ctx.save();
    ctx.fillStyle = 'rgba(23, 56, 35, 0.95)';
    ctx.beginPath();
    ctx.roundRect(bannerX, bannerY, bannerW, bannerH, bannerH / 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(109, 213, 140, 0.55)';
    ctx.lineWidth = Math.max(2, width * 0.002);
    ctx.stroke();

    ctx.fillStyle = '#F1F5F2';
    ctx.font = `600 ${Math.round(height * 0.038)}px "Noto Sans Bengali", "Hind Siliguri", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const bannerText =
      config.hookTemplate === 'IMAX Theater'
        ? 'নাটক রিভিউ | বিশেষ আকর্ষণ'
        : config.hookTemplate === 'Director Cut'
        ? 'আজকের পর্বের বিশেষ আয়োজন'
        : 'পূর্ববর্তী পর্বের সংক্ষিপ্ত ঝলক';
    ctx.fillText(bannerText, width / 2, bannerY + bannerH * 0.52);
    ctx.restore();
  }
}

function getTransitionIndex(
  transitionStyle: TransitionStyle,
  slideIndex: number
): number {
  switch (transitionStyle) {
    case 'Hyper Zoom Flash':
      return 0;
    case 'Velocity Whip Pan':
      return 1;
    case 'Prism Shutter 7X':
      return 2;
    case 'Portal Iris Warp':
      return 3;
    case 'Laser Slash Wipe':
      return 4;
    case 'Auto Mix Pro':
    default:
      return slideIndex % 5;
  }
}

function renderProSlideshowLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  slideTimeSec: number,
  config: RenderConfig,
  loadedImages: HTMLImageElement[]
) {
  if (loadedImages.length === 0) {
    ctx.fillStyle = '#12121e';
    ctx.fillRect(0, 0, width, height);
    return;
  }

  // Apply HDR Cinema Pop boost if selected
  const effectiveColor: ColorGrading =
    config.fxStyle === 'HDR Cinema Pop'
      ? {
          ...config.colorGrading,
          contrast: Math.min(200, config.colorGrading.contrast + 18),
          saturation: Math.min(200, config.colorGrading.saturation + 22),
          vignette: Math.max(35, config.colorGrading.vignette),
        }
      : config.colorGrading;

  const slideDuration = 3.2;
  const slideIndex =
    Math.floor(slideTimeSec / slideDuration) % loadedImages.length;
  const nextIndex = (slideIndex + 1) % loadedImages.length;
  const thirdIndex = (slideIndex + 2) % loadedImages.length;
  const localProgress = (slideTimeSec % slideDuration) / slideDuration;

  const currentImg = loadedImages[slideIndex];
  const nextImg = loadedImages[nextIndex];
  const thirdImg = loadedImages[thirdIndex];

  // Camera pan vectors per slide
  const panDirections = [
    { x1: -0.5, y1: -0.3, x2: 0.5, y2: 0.3 },
    { x1: 0.5, y1: -0.2, x2: -0.5, y2: 0.2 },
    { x1: 0.0, y1: -0.5, x2: 0.0, y2: 0.4 },
    { x1: -0.4, y1: 0.4, x2: 0.4, y2: -0.4 },
  ];
  const dir = panDirections[slideIndex % panDirections.length];
  const nextDir = panDirections[nextIndex % panDirections.length];

  const easedSlide = easeInOutCubic(localProgress);
  const curPanX = dir.x1 + (dir.x2 - dir.x1) * easedSlide;
  const curPanY = dir.y1 + (dir.y2 - dir.y1) * easedSlide;

  const baseZoom = Math.max(108, config.zoomPercent);
  const curZoom =
    slideIndex % 2 === 0
      ? baseZoom + easedSlide * 18
      : baseZoom + (1 - easedSlide) * 18;

  // Transition window in the last 24% of each slide (0.76 -> 1.0)
  const transitionStart = 0.76;
  const isTransitioning =
    loadedImages.length > 1 && localProgress >= transitionStart;
  const rawTrans = isTransitioning
    ? (localProgress - transitionStart) / (1 - transitionStart)
    : 0;
  const trans = easeInOutCubic(rawTrans);

  // Layout mode for Ultra Story FX
  const layoutMode =
    config.fxStyle === 'Ultra Story FX' ? slideIndex % 6 : 0;

  if (layoutMode === 3 && loadedImages.length >= 2) {
    // PRO DIAGONAL SPLIT-SCREEN WITH ANIMATED SWEEPING DIVIDER
    const tilt = width * 0.07 * Math.cos(localProgress * Math.PI);
    const splitX =
      width * 0.5 + Math.sin(localProgress * Math.PI * 2) * (width * 0.04);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(splitX + tilt, 0);
    ctx.lineTo(splitX - tilt, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.clip();
    drawCameraPannedFrame(
      ctx,
      currentImg,
      currentImg.naturalWidth || 640,
      currentImg.naturalHeight || 360,
      width,
      height,
      curZoom + 6,
      curPanX,
      curPanY,
      effectiveColor
    );
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(splitX + tilt, 0);
    ctx.lineTo(width, 0);
    ctx.lineTo(width, height);
    ctx.lineTo(splitX - tilt, height);
    ctx.closePath();
    ctx.clip();
    drawCameraPannedFrame(
      ctx,
      nextImg,
      nextImg.naturalWidth || 640,
      nextImg.naturalHeight || 360,
      width,
      height,
      baseZoom + (1 - easedSlide) * 16,
      -curPanX,
      -curPanY,
      effectiveColor
    );
    ctx.restore();

    // Glowing Diagonal Divider Line
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(4, width * 0.004);
    ctx.shadowColor = '#a855f7';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.moveTo(splitX + tilt, 0);
    ctx.lineTo(splitX - tilt, height);
    ctx.stroke();
    ctx.restore();
  } else if (layoutMode === 4 && loadedImages.length >= 3) {
    // PRO 3-PANEL STORYBOARD COLLAGE WITH ANIMATED ZOOM
    const halfW = width / 2;
    const halfH = height / 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, halfW, halfH);
    ctx.clip();
    drawCameraPannedFrame(
      ctx,
      currentImg,
      currentImg.naturalWidth || 640,
      currentImg.naturalHeight || 360,
      halfW,
      halfH,
      curZoom + 8,
      curPanX,
      curPanY,
      effectiveColor
    );
    ctx.restore();

    ctx.save();
    ctx.translate(0, halfH);
    ctx.beginPath();
    ctx.rect(0, 0, halfW, halfH);
    ctx.clip();
    drawCameraPannedFrame(
      ctx,
      thirdImg,
      thirdImg.naturalWidth || 640,
      thirdImg.naturalHeight || 360,
      halfW,
      halfH,
      baseZoom + 12,
      -curPanX,
      curPanY,
      effectiveColor
    );
    ctx.restore();

    ctx.save();
    ctx.translate(halfW, 0);
    ctx.beginPath();
    ctx.rect(0, 0, halfW, height);
    ctx.clip();
    drawCameraPannedFrame(
      ctx,
      nextImg,
      nextImg.naturalWidth || 640,
      nextImg.naturalHeight || 360,
      halfW,
      height,
      baseZoom + easedSlide * 18,
      nextDir.x1,
      nextDir.y1,
      effectiveColor
    );
    ctx.restore();

    // Clean Panel Grid Dividers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = Math.max(3, width * 0.003);
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, height);
    ctx.moveTo(0, halfH);
    ctx.lineTo(halfW, halfH);
    ctx.stroke();
  } else {
    // Primary Full-Frame Scene with Pro Transitions during the transition window!
    const transitionType = getTransitionIndex(
      config.transitionStyle,
      slideIndex
    );

    if (!isTransitioning) {
      drawCameraPannedFrame(
        ctx,
        currentImg,
        currentImg.naturalWidth || 640,
        currentImg.naturalHeight || 360,
        width,
        height,
        curZoom,
        curPanX,
        curPanY,
        effectiveColor
      );

      if (layoutMode === 2) {
        const slices = 7;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.72)';
        ctx.lineWidth = Math.max(2.5, width * 0.0025);
        for (let s = 1; s < slices; s++) {
          const x = (width / slices) * s;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
          ctx.stroke();
        }
      }
    } else if (transitionType === 0) {
      // Transition 0: Hyper Zoom Flash
      const zoomBurst = curZoom + trans * 45;
      drawCameraPannedFrame(
        ctx,
        currentImg,
        currentImg.naturalWidth || 640,
        currentImg.naturalHeight || 360,
        width,
        height,
        zoomBurst,
        curPanX,
        curPanY,
        effectiveColor
      );

      ctx.save();
      ctx.globalAlpha = trans;
      drawCameraPannedFrame(
        ctx,
        nextImg,
        nextImg.naturalWidth || 640,
        nextImg.naturalHeight || 360,
        width,
        height,
        baseZoom + (1 - trans) * 30,
        nextDir.x1,
        nextDir.y1,
        effectiveColor
      );
      ctx.restore();

      const flashAlpha = Math.sin(trans * Math.PI) * 0.28;
      ctx.fillStyle = `rgba(255, 245, 225, ${flashAlpha})`;
      ctx.fillRect(0, 0, width, height);
    } else if (transitionType === 1) {
      // Transition 1: Velocity Whip Pan
      const offsetX = -trans * width;
      ctx.save();
      ctx.translate(offsetX, 0);
      drawCameraPannedFrame(
        ctx,
        currentImg,
        currentImg.naturalWidth || 640,
        currentImg.naturalHeight || 360,
        width,
        height,
        curZoom,
        curPanX,
        curPanY,
        effectiveColor
      );
      ctx.restore();

      ctx.save();
      ctx.translate(width + offsetX, 0);
      drawCameraPannedFrame(
        ctx,
        nextImg,
        nextImg.naturalWidth || 640,
        nextImg.naturalHeight || 360,
        width,
        height,
        baseZoom,
        nextDir.x1,
        nextDir.y1,
        effectiveColor
      );
      ctx.restore();
    } else if (transitionType === 2) {
      // Transition 2: Prism Shutter 7X
      drawCameraPannedFrame(
        ctx,
        currentImg,
        currentImg.naturalWidth || 640,
        currentImg.naturalHeight || 360,
        width,
        height,
        curZoom,
        curPanX,
        curPanY,
        effectiveColor
      );

      const cols = 7;
      const colW = width / cols;
      ctx.save();
      ctx.beginPath();
      for (let c = 0; c < cols; c++) {
        ctx.rect(c * colW, 0, colW * trans, height);
      }
      ctx.clip();
      drawCameraPannedFrame(
        ctx,
        nextImg,
        nextImg.naturalWidth || 640,
        nextImg.naturalHeight || 360,
        width,
        height,
        baseZoom,
        nextDir.x1,
        nextDir.y1,
        effectiveColor
      );
      ctx.restore();
    } else if (transitionType === 3) {
      // Transition 3: Portal Iris Warp
      drawCameraPannedFrame(
        ctx,
        currentImg,
        currentImg.naturalWidth || 640,
        currentImg.naturalHeight || 360,
        width,
        height,
        curZoom,
        curPanX,
        curPanY,
        effectiveColor
      );

      const maxRadius = Math.hypot(width / 2, height / 2);
      const radius = Math.max(1, trans * maxRadius);
      ctx.save();
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.clip();
      drawCameraPannedFrame(
        ctx,
        nextImg,
        nextImg.naturalWidth || 640,
        nextImg.naturalHeight || 360,
        width,
        height,
        baseZoom,
        nextDir.x1,
        nextDir.y1,
        effectiveColor
      );
      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Transition 4: Laser Slash Wipe
      drawCameraPannedFrame(
        ctx,
        currentImg,
        currentImg.naturalWidth || 640,
        currentImg.naturalHeight || 360,
        width,
        height,
        curZoom,
        curPanX,
        curPanY,
        effectiveColor
      );

      const sweepX = trans * (width * 1.4);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(sweepX, 0);
      ctx.lineTo(sweepX - width * 0.35, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      ctx.clip();
      drawCameraPannedFrame(
        ctx,
        nextImg,
        nextImg.naturalWidth || 640,
        nextImg.naturalHeight || 360,
        width,
        height,
        baseZoom,
        nextDir.x1,
        nextDir.y1,
        effectiveColor
      );
      ctx.restore();
    }
  }

  // Cyber Glitch Pro Chromatic Scanline Effect
  if (config.fxStyle === 'Cyber Glitch Pro') {
    const glitchActive = Math.sin(slideTimeSec * 14) > 0.75;
    if (glitchActive) {
      ctx.save();
      ctx.fillStyle = 'rgba(236, 72, 153, 0.12)';
      ctx.fillRect(0, (slideTimeSec * 220) % height, width, height * 0.14);
      ctx.fillStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.fillRect(0, ((slideTimeSec * 310) + 120) % height, width, height * 0.09);
      ctx.restore();
    }
  }

  // IMAX Scope 4K Letterbox + Anamorphic Flare
  if (config.fxStyle === 'IMAX Scope 4K') {
    const barH = height * 0.095;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, barH);
    ctx.fillRect(0, height - barH, width, barH);

    const streakGrad = ctx.createLinearGradient(0, 0, width, 0);
    streakGrad.addColorStop(0, 'rgba(6, 182, 212, 0)');
    streakGrad.addColorStop(0.5, 'rgba(56, 189, 248, 0.55)');
    streakGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
    ctx.fillStyle = streakGrad;
    ctx.fillRect(0, barH - 1.5, width, 2);
    ctx.fillRect(0, height - barH - 0.5, width, 2);
  }
}

function renderSonicSpectrumLayer(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSec: number,
  totalMainSec: number,
  config: RenderConfig,
  loadedImages: HTMLImageElement[],
  extraImage: HTMLImageElement | null,
  audioEnergy: number
) {
  const portrait = loadedImages[0] || null;

  ctx.fillStyle = '#0a0814';
  ctx.fillRect(0, 0, width, height);

  if (portrait) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    drawCameraPannedFrame(
      ctx,
      portrait,
      portrait.naturalWidth || 640,
      portrait.naturalHeight || 360,
      width,
      height,
      135 + Math.sin(elapsedSec * 0.6) * 10,
      Math.sin(elapsedSec * 0.3) * 0.3,
      0,
      config.colorGrading
    );
    ctx.restore();
  }

  // Studio Vignette Scrim
  const scrim = ctx.createRadialGradient(
    width / 2,
    height * 0.44,
    width * 0.08,
    width / 2,
    height * 0.44,
    width * 0.65
  );
  scrim.addColorStop(0, 'rgba(15, 10, 30, 0.2)');
  scrim.addColorStop(1, 'rgba(5, 4, 12, 0.88)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height * 0.44;
  const baseRadius = Math.min(width, height) * 0.22;
  const pulse = 1 + audioEnergy * 0.14 * Math.sin(elapsedSec * 12);

  // Outer Halo Ring
  ctx.save();
  ctx.strokeStyle = 'rgba(168, 85, 247, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius * 1.52, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // 64-Bar Radial Spectrum Equalizer
  const numBars = 64;
  for (let i = 0; i < numBars; i++) {
    const angle = (i / numBars) * Math.PI * 2 + elapsedSec * 0.25;
    const wave =
      Math.abs(
        Math.sin(elapsedSec * 9 + i * 0.38) *
          Math.cos(elapsedSec * 4 - i * 0.2)
      ) *
      (0.35 + audioEnergy * 0.95);
    const r1 = baseRadius * 1.06 * pulse;
    const r2 = r1 + wave * (baseRadius * 0.46);

    ctx.strokeStyle = `hsl(${(i * 5.6 + elapsedSec * 65) % 360}, 95%, 62%)`;
    ctx.lineWidth = Math.max(2.5, width * 0.0038);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX + Math.cos(angle) * r1, centerY + Math.sin(angle) * r1);
    ctx.lineTo(centerX + Math.cos(angle) * r2, centerY + Math.sin(angle) * r2);
    ctx.stroke();
  }

  // Circular Avatar Disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius * pulse, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();

  if (portrait) {
    ctx.drawImage(
      portrait,
      centerX - baseRadius * pulse,
      centerY - baseRadius * pulse,
      baseRadius * 2 * pulse,
      baseRadius * 2 * pulse
    );
  }
  ctx.restore();

  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = Math.max(3.5, width * 0.005);
  ctx.beginPath();
  ctx.arc(centerX, centerY, baseRadius * pulse, 0, Math.PI * 2);
  ctx.stroke();

  // Bottom Music Timeline Bar
  const barW = width * 0.68;
  const barX = (width - barW) / 2;
  const barY = height * 0.83;
  const prog = Math.min(1, elapsedSec / Math.max(1, totalMainSec));

  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, 6, 3);
  ctx.fill();

  const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  barGrad.addColorStop(0, '#a855f7');
  barGrad.addColorStop(1, '#f43f5e');
  ctx.fillStyle = barGrad;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW * prog, 6, 3);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(barX + barW * prog, barY + 3, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = `600 ${Math.round(height * 0.028)}px "JetBrains Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `${formatTimeShort(elapsedSec)} / ${formatTimeShort(totalMainSec)}`,
    centerX,
    barY + height * 0.055
  );
}

function renderProOverlayEffect(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  effect: OverlayEffect,
  particles: Particle[],
  elapsedSec: number
) {
  ctx.save();

  if (effect === 'Golden Sunbeams') {
    // Volumetric Golden Sunbeams from Top-Left
    const sunGrad = ctx.createLinearGradient(0, 0, width * 0.7, height * 0.7);
    sunGrad.addColorStop(0, 'rgba(253, 224, 71, 0.18)');
    sunGrad.addColorStop(0.5, 'rgba(251, 191, 36, 0.06)');
    sunGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (effect === 'Fire Sparks') {
    // Warm Fire Glow from Bottom
    const fireGrad = ctx.createLinearGradient(0, height, 0, height * 0.65);
    fireGrad.addColorStop(0, 'rgba(234, 88, 12, 0.24)');
    fireGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = fireGrad;
    ctx.fillRect(0, 0, width, height);
  } else if (effect === 'Retro 35mm VHS') {
    // Vintage Film Flicker & Sepia Scrim
    const flicker = 0.04 + Math.abs(Math.sin(elapsedSec * 27)) * 0.06;
    ctx.fillStyle = `rgba(120, 85, 40, ${flicker})`;
    ctx.fillRect(0, 0, width, height);
  }

  for (const p of particles) {
    p.x = (p.x + p.vx + 1) % 1;
    p.y = (p.y + p.vy + 1) % 1;
    const px = p.x * width;
    const py = p.y * height;

    if (effect === 'Monsoon Storm') {
      const len = (14 + p.size * 5) * p.depth;
      ctx.strokeStyle = `rgba(215, 238, 255, ${p.alpha * 0.62})`;
      ctx.lineWidth = Math.max(1, p.depth * 1.8);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px - len * 0.32, py + len);
      ctx.stroke();
    } else if (effect === 'Arctic Frost') {
      const swayX = px + Math.sin(elapsedSec * 2.5 + p.phase) * 14 * p.depth;
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(swayX, py, p.size * 1.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect === 'Fire Sparks') {
      const riseY = height - py;
      const swayX = px + Math.cos(elapsedSec * 3 + p.phase) * 12;
      ctx.fillStyle = `rgba(255, ${110 + (p.hue % 130)}, 20, ${p.alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(swayX, riseY, p.size * 1.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (effect === 'Golden Sunbeams' || effect === 'Neon Bokeh Glow') {
      const floatY = py + Math.sin(elapsedSec * 1.5 + p.phase) * 10;
      ctx.fillStyle =
        effect === 'Neon Bokeh Glow'
          ? `hsla(${(p.hue + elapsedSec * 45) % 360}, 95%, 68%, ${
              p.alpha * 0.42
            })`
          : `rgba(255, 244, 210, ${p.alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(
        px,
        floatY,
        effect === 'Neon Bokeh Glow' ? p.size * 3.4 : p.size * 0.95,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else if (effect === 'Velvet Hearts') {
      const riseY = height - py;
      ctx.fillStyle = `rgba(244, 63, 94, ${p.alpha * 0.7})`;
      ctx.font = `${Math.round(p.size * 5.2)}px sans-serif`;
      ctx.fillText('♥', px, riseY);
    } else if (effect === 'Retro 35mm VHS') {
      if (p.depth > 0.82 && Math.random() < 0.18) {
        ctx.strokeStyle = `rgba(255, 250, 235, ${p.alpha * 0.35})`;
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(px, 0);
        ctx.lineTo(px + (Math.random() - 0.5) * 4, height);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

function renderChannelWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  channelName: string,
  sizePercent: number,
  watermarkImage?: HTMLImageElement | null
) {
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const scale = Math.max(0.6, sizePercent / 35);
  const margin = width * 0.03;

  if (
    watermarkImage &&
    watermarkImage.complete &&
    watermarkImage.naturalWidth > 0
  ) {
    const srcW = watermarkImage.naturalWidth;
    const srcH = watermarkImage.naturalHeight;
    const aspect = srcW / srcH;

    // Small, professional watermark in top-right corner preserving original aspect ratio
    const targetH = Math.round(height * 0.085 * scale);
    const targetW = Math.round(targetH * aspect);
    const x = width - targetW - margin;
    const y = margin;

    // Drop shadow for clear visibility over any video content
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    ctx.drawImage(watermarkImage, x, y, targetW, targetH);

    // If channel text name is also provided, draw text pill next to or below image logo
    if (channelName.trim()) {
      ctx.shadowColor = 'transparent';
      const fontSize = Math.round(height * 0.024 * scale);
      ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", "Hind Siliguri", sans-serif`;
      const textMetrics = ctx.measureText(channelName);
      const padX = fontSize * 0.6;
      const textW = textMetrics.width + padX * 2;
      const textH = fontSize * 1.5;
      const textX = width - textW - margin;
      const textY = y + targetH + 4;

      ctx.fillStyle = 'rgba(12, 12, 24, 0.78)';
      ctx.beginPath();
      ctx.roundRect(textX, textY, textW, textH, 6);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(channelName, textX + textW / 2, textY + textH / 2);
    }

    ctx.restore();
    return;
  }

  if (channelName.trim()) {
    const fontSize = Math.round(height * 0.032 * scale);
    ctx.font = `bold ${fontSize}px "Plus Jakarta Sans", "Hind Siliguri", sans-serif`;
    const textMetrics = ctx.measureText(channelName);
    const padX = fontSize * 0.85;
    const boxW = textMetrics.width + padX * 2;
    const boxH = fontSize * 1.8;
    const x = width - boxW - margin;
    const y = height * 0.04;

    ctx.fillStyle = 'rgba(12, 12, 24, 0.86)';
    ctx.beginPath();
    ctx.roundRect(x, y, boxW, boxH, 10);
    ctx.fill();

    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(channelName, x + boxW / 2, y + boxH / 2);
  }

  ctx.restore();
}

function renderSubtitles(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSec: number,
  totalSec: number,
  scriptText: string
) {
  const chunks = scriptText
    .split(/[।!?\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (chunks.length === 0) return;

  const idx = Math.min(
    chunks.length - 1,
    Math.floor((elapsedSec / Math.max(1, totalSec)) * chunks.length)
  );
  const line = chunks[idx];

  ctx.save();
  const fontSize = Math.round(height * 0.038);
  ctx.font = `bold ${fontSize}px "Hind Siliguri", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textWidth = Math.min(width * 0.88, ctx.measureText(line).width + 36);
  const boxH = fontSize * 1.75;
  const boxX = (width - textWidth) / 2;
  const y = height * 0.81;

  ctx.fillStyle = 'rgba(8, 8, 16, 0.78)';
  ctx.beginPath();
  ctx.roundRect(boxX, y - boxH / 2, textWidth, boxH, 10);
  ctx.fill();

  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeText(line, width / 2, y);

  ctx.fillStyle = '#facc15';
  ctx.fillText(line, width / 2, y);
  ctx.restore();
}

function renderSubscribePill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  elapsedSec: number,
  isInHook: boolean
) {
  ctx.save();

  const entryProgress = Math.min(1, elapsedSec / 0.5);
  const scale = easeOutBack(entryProgress);

  const isSubscribed = elapsedSec > 2.8;

  const pillH = Math.round(height * 0.082);
  const pillW = Math.round(width * 0.42);
  const centerX = width / 2;
  const centerY = isInHook ? height * 0.88 : height * 0.88;

  ctx.translate(centerX, centerY);
  ctx.scale(scale, scale);
  ctx.translate(-centerX, -centerY);

  const pillX = centerX - pillW / 2;
  const pillY = centerY - pillH / 2;
  const pillRadius = pillH / 2;

  // Outer Capsule Dark Container
  ctx.fillStyle = 'rgba(12, 12, 18, 0.95)';
  ctx.beginPath();
  ctx.roundRect(pillX, pillY, pillW, pillH, pillRadius);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = Math.max(1, width * 0.0015);
  ctx.stroke();

  // Internal element layout
  const pad = pillH * 0.15;
  const contentH = pillH - pad * 2;

  // A. Left YouTube Red Badge
  const ytW = contentH * 1.35;
  const ytH = contentH;
  const ytX = pillX + pad * 1.2;
  const ytY = pillY + pad;

  ctx.fillStyle = '#FF0000';
  ctx.beginPath();
  ctx.roundRect(ytX, ytY, ytW, ytH, ytH * 0.32);
  ctx.fill();

  // White Triangle inside YouTube Badge
  const triW = ytW * 0.32;
  const triH = ytH * 0.42;
  const triX = ytX + (ytW - triW) / 2 + 1;
  const triY = ytY + (ytH - triH) / 2;

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(triX, triY);
  ctx.lineTo(triX + triW, triY + triH / 2);
  ctx.lineTo(triX, triY + triH);
  ctx.closePath();
  ctx.fill();

  // C. Right Golden Bell Icon
  const bellRadius = contentH * 0.45;
  const bellX = pillX + pillW - pad * 1.5 - bellRadius;
  const bellY = pillY + pillH / 2;

  ctx.save();
  ctx.fillStyle = '#FFC107';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(contentH * 0.85)}px sans-serif`;
  ctx.fillText('🔔', bellX, bellY + 1);
  ctx.restore();

  // B. Middle Subscribed Button Box
  const btnX = ytX + ytW + pad * 0.8;
  const btnMaxX = bellX - bellRadius - pad * 0.8;
  const btnW = btnMaxX - btnX;
  const btnH = contentH;
  const btnY = pillY + pad;

  ctx.fillStyle = isSubscribed ? '#212121' : '#CC0000';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, btnH * 0.25);
  ctx.fill();

  if (isSubscribed) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${Math.round(btnH * 0.46)}px "Plus Jakarta Sans", "Roboto", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const label = isSubscribed ? '✓ SUBSCRIBED' : 'SUBSCRIBE';
  ctx.fillText(label, btnX + btnW / 2, btnY + btnH / 2 + 1);

  ctx.restore();
}
