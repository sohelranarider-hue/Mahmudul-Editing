import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveTab,
  BgmTrack,
  BorderLightStyle,
  CapturedFrame,
  ColorGrading,
  ExportedVideo,
  ExportQuality,
  ExtraFrameSettings,
  FxStyleMode,
  HookDuration,
  HookFrameTemplate,
  OverlayEffect,
  TransitionStyle,
  VoiceEngine,
} from './types';
import { getDefaultBgmTracks } from './utils/audioSynth';
import {
  computeSignatureFromCanvas,
  computeSignatureFromImage,
  createStudioBackdropDataUrl,
  drawGradedFrameToCanvas,
  formatTimeShort,
  recalculateDuplicates,
} from './utils/frameEngine';
import {
  createParticles,
  renderCompositeFrame,
} from './utils/videoRenderer';
import { CropTab } from './components/CropTab';
import { GalleryTab } from './components/GalleryTab';
import { GenerateTab, getVoiceDisplayName } from './components/GenerateTab';
import { ExtraFrameModal } from './components/ExtraFrameModal';
import { ExportedVideosModal } from './components/ExportedVideosModal';
import { SplashScreen } from './components/SplashScreen';

const DEFAULT_COLOR_GRADING: ColorGrading = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  warmth: 0,
  vignette: 0,
  hueTint: 0,
};

export default function App() {
  // Startup Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Navigation Tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('generate');

  // Video & Crop State (clean initial state)
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoTitle, setVideoTitle] = useState<string>('');
  const [hasVideoLoaded, setHasVideoLoaded] = useState<boolean>(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);
  const [colorGrading, setColorGrading] = useState<ColorGrading>(
    DEFAULT_COLOR_GRADING
  );
  const [zoomPercent, setZoomPercent] = useState<number>(100);
  const [captureIntervalSec, setCaptureIntervalSec] = useState<number>(3);
  const [isAutoCapturing, setIsAutoCapturing] = useState<boolean>(false);
  const [autoCaptureProgress, setAutoCaptureProgress] = useState<number>(0);

  // Gallery & Duplicate Detection State
  const [galleryFrames, setGalleryFrames] = useState<CapturedFrame[]>([]);
  const [similarityThreshold, setSimilarityThreshold] = useState<number>(90);

  // Generate Tab State
  const [scriptText, setScriptText] = useState<string>('');
  const [targetDurationMinutes, setTargetDurationMinutes] =
    useState<string>('');
  const [ccEnabled, setCcEnabled] = useState<boolean>(false);
  const [isExpandingScript, setIsExpandingScript] = useState<boolean>(false);

  // Voiceover Audio State
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [voiceDurationSec, setVoiceDurationSec] = useState<number>(0);
  const [bulkVoiceCount, setBulkVoiceCount] = useState<number>(0);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState<boolean>(false);
  const [previewingVoiceName, setPreviewingVoiceName] = useState<string | null>(
    null
  );

  // Background Music State
  const [bgmTracks, setBgmTracks] = useState<BgmTrack[]>(() =>
    getDefaultBgmTracks()
  );
  const [selectedBgmId, setSelectedBgmId] = useState<string>('none');

  // H-Control (Hook & Channel) State
  const [channelName, setChannelName] = useState<string>('');
  const [channelWatermarkUrl, setChannelWatermarkUrl] = useState<string | null>(
    null
  );
  const [channelSizePercent, setChannelSizePercent] = useState<number>(35);
  const [borderLightStyle, setBorderLightStyle] =
    useState<BorderLightStyle>('Cyber Spectrum');
  const [borderLightEnabled, setBorderLightEnabled] = useState<boolean>(false);
  const [borderCycleSec, setBorderCycleSec] = useState<string>('4s');
  const [hookTemplate, setHookTemplate] =
    useState<HookFrameTemplate>('Studio Frame');
  const [hookDuration, setHookDuration] = useState<HookDuration>(0);
  const [hookStartSec, setHookStartSec] = useState<number>(0);
  const [hookTriggerCount, setHookTriggerCount] = useState<number>(0);
  const [hookSpeed, setHookSpeed] = useState<number>(1.2);
  const [overlayEffect, setOverlayEffect] =
    useState<OverlayEffect>('Clean (Off)');
  const [fxStyle, setFxStyle] = useState<FxStyleMode>('Ultra Story FX');
  const [transitionStyle, setTransitionStyle] =
    useState<TransitionStyle>('Auto Mix Pro');

  // Voice Settings State
  const [voiceEngine, setVoiceEngine] =
    useState<VoiceEngine>('Gemini Studio');
  const [selectedVoice, setSelectedVoice] = useState<string>('Zephyr');
  const [exportQuality, setExportQuality] = useState<ExportQuality>('1080p');

  // Extra Frame State
  const [extraFrame, setExtraFrame] = useState<ExtraFrameSettings>({
    enabled: false,
    frameId: null,
    imageUrl: null,
    sceneLabel: 'No scene frame selected',
    durationMinutes: 1,
  });

  // Modals State
  const [isExtraModalOpen, setIsExtraModalOpen] = useState<boolean>(false);
  const [isExportsModalOpen, setIsExportsModalOpen] = useState<boolean>(false);

  // Export Pipeline State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStage, setExportStage] = useState<
    'TTS Voice' | 'Frame Capture' | 'Shuffling' | 'Rendering'
  >('TTS Voice');
  const [exportProgress, setExportProgress] = useState<number>(0);
  const [exportElapsedSec, setExportElapsedSec] = useState<number>(0);
  const [exportTotalSec, setExportTotalSec] = useState<number>(25);
  const [exportsList, setExportsList] = useState<ExportedVideo[]>([]);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hiddenVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoFileInputRef = useRef<HTMLInputElement | null>(null);
  const topPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopExportFlagRef = useRef<boolean>(false);
  const seekCursorRef = useRef<number>(0);
  const voicePreviewCacheRef = useRef<Map<string, string>>(new Map());
  const activePreviewAudioRef = useRef<HTMLAudioElement | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3200);
    return () => clearTimeout(t);
  }, [toastMessage]);

  const triggerDeviceVideoPicker = () => {
    videoFileInputRef.current?.click();
  };

  // Seek helper that updates both visible CropTab video and hidden background video
  const handleSeekAllVideos = (timeSec: number) => {
    setCurrentTime(timeSec);
    seekCursorRef.current = timeSec;
    if (videoRef.current) {
      videoRef.current.currentTime = timeSec;
    }
    if (hiddenVideoRef.current) {
      hiddenVideoRef.current.currentTime = timeSec;
    }
  };

  // Reliable Async Auto-Interval Capture Loop (waits for HTML5 video 'seeked' event!)
  useEffect(() => {
    if (!isAutoCapturing) return;

    const vid = hiddenVideoRef.current || videoRef.current;
    if (!vid || !videoUrl) {
      setIsAutoCapturing(false);
      showToast('Please select a video file before starting auto-capture');
      return;
    }

    let cancelled = false;

    const captureNextStep = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 750));
        if (cancelled) break;

        const maxDur =
          trimEnd > trimStart
            ? trimEnd
            : Number.isFinite(vid.duration) && vid.duration > 0
            ? vid.duration
            : 60;
        const safeSpan = Math.max(1, maxDur - trimStart);

        const nextTime = seekCursorRef.current + captureIntervalSec;
        if (nextTime > maxDur) {
          setAutoCaptureProgress(100);
          setIsAutoCapturing(false);
          showToast('Auto screenshot capture completed!');
          break;
        }

        seekCursorRef.current = nextTime;
        setCurrentTime(nextTime);

        const pct = Math.max(
          1,
          Math.min(99, Math.round(((nextTime - trimStart) / safeSpan) * 100))
        );
        setAutoCaptureProgress(pct);

        // Wait for actual video seek completion before drawing frame
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 600);
          const onSeeked = () => {
            clearTimeout(timeout);
            resolve();
          };
          vid.addEventListener('seeked', onSeeked, { once: true });
          vid.currentTime = nextTime;
        });

        if (cancelled) break;

        if (videoRef.current && videoRef.current !== vid) {
          videoRef.current.currentTime = vid.currentTime;
        }

        const nativeW = vid.videoWidth || 1920;
        const nativeH = vid.videoHeight || 1080;
        const canvas = document.createElement('canvas');
        canvas.width = nativeW;
        canvas.height = nativeH;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        drawGradedFrameToCanvas(
          ctx,
          vid,
          nativeW,
          nativeH,
          nativeW,
          nativeH,
          zoomPercent,
          colorGrading
        );

        const sig = computeSignatureFromCanvas(canvas);
        const dataUrl = canvas.toDataURL('image/png');
        const formatted = formatTimeShort(nextTime);

        setGalleryFrames((prev) => {
          const nextList: CapturedFrame[] = [
            ...prev,
            {
              id: `cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              index: prev.length + 1,
              dataUrl,
              timestamp: nextTime,
              formattedTime: formatted,
              signature: sig,
              isDuplicate: false,
              selected: false,
              replacedCount: 0,
            },
          ];
          return recalculateDuplicates(nextList, similarityThreshold);
        });

        showToast(`Frame successfully saved @ ${formatted}`);
      }
    };

    captureNextStep();

    return () => {
      cancelled = true;
    };
  }, [
    isAutoCapturing,
    captureIntervalSec,
    trimStart,
    trimEnd,
    videoUrl,
    zoomPercent,
    colorGrading,
    similarityThreshold,
  ]);

  // Capture a single frame manually
  const handleCaptureSingleFrame = async () => {
    const vid = videoRef.current || hiddenVideoRef.current;
    if (!vid || !videoUrl || vid.readyState < 2) {
      triggerDeviceVideoPicker();
      return;
    }

    const nativeW = vid.videoWidth || 1920;
    const nativeH = vid.videoHeight || 1080;
    const canvas = document.createElement('canvas');
    canvas.width = nativeW;
    canvas.height = nativeH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    drawGradedFrameToCanvas(
      ctx,
      vid,
      nativeW,
      nativeH,
      nativeW,
      nativeH,
      zoomPercent,
      colorGrading
    );

    const sig = computeSignatureFromCanvas(canvas);
    const dataUrl = canvas.toDataURL('image/png');
    const formatted = formatTimeShort(currentTime);

    setGalleryFrames((prev) => {
      const updated = [
        ...prev,
        {
          id: `manual-${Date.now()}`,
          index: prev.length + 1,
          dataUrl,
          timestamp: currentTime,
          formattedTime: formatted,
          signature: sig,
          isDuplicate: false,
          selected: false,
          replacedCount: 0,
        },
      ];
      return recalculateDuplicates(updated, similarityThreshold);
    });

    showToast(`Frame successfully saved @ ${formatted}`);
  };

  // Upload Video from Device
  const handleUploadDeviceVideo = (file: File) => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ''));
    setHasVideoLoaded(true);
    setCurrentTime(0);
    setTrimStart(0);
    seekCursorRef.current = 0;
    showToast(`Video upload complete: ${file.name}`);
  };

  // Upload Multiple Photos to Gallery
  const handleUploadPhotos = (files: FileList) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    fileArray.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const img = new Image();
          img.onload = () => {
            const sig = computeSignatureFromImage(img);
            setGalleryFrames((prev) => {
              const updated: CapturedFrame[] = [
                ...prev,
                {
                  id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                  index: prev.length + 1,
                  dataUrl: reader.result as string,
                  timestamp: prev.length * 5,
                  formattedTime: formatTimeShort(prev.length * 5),
                  signature: sig,
                  isDuplicate: false,
                  selected: false,
                  replacedCount: 0,
                },
              ];
              return recalculateDuplicates(updated, similarityThreshold);
            });
          };
          img.src = reader.result;
        }
      };
      reader.readAsDataURL(file);
    });

    showToast(`${fileArray.length} photos added to gallery`);
  };

  // Duplicate Threshold Change
  const handleThresholdChange = (newThreshold: number) => {
    setSimilarityThreshold(newThreshold);
    setGalleryFrames((prev) => recalculateDuplicates(prev, newThreshold));
  };

  // Auto Delete Duplicates
  const handleAutoDeleteDuplicates = () => {
    const dupCount = galleryFrames.filter((f) => f.isDuplicate).length;
    if (dupCount === 0) return;
    setGalleryFrames((prev) => {
      const kept = prev.filter((f) => !f.isDuplicate);
      return recalculateDuplicates(kept, similarityThreshold);
    });
    showToast(
      `🎉 ${dupCount} duplicate and similar photos successfully deleted!`
    );
  };

  // Expand Script via Server-Side Gemini API
  const handleExpandScript = async () => {
    setIsExpandingScript(true);
    try {
      const mins = Number(targetDurationMinutes) || 5;
      const response = await fetch('/api/gemini/expand-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          script: scriptText,
          durationMinutes: mins,
          dramaTitle: videoTitle || 'নাটক রিভিউ',
          fxStyle,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to expand script');
      }
      setScriptText(data.script);
      showToast(`Script successfully expanded for ${mins} minutes!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error expanding script';
      showToast(`Script expansion error: ${msg}`);
    } finally {
      setIsExpandingScript(false);
    }
  };

  // Bulk or Single Voiceover Import + Auto-Transcribe if script is empty
  const handleImportVoiceFiles = async (files: FileList) => {
    const list = Array.from(files);
    if (list.length === 0) return;

    setBulkVoiceCount(list.length);
    const firstFile = list[0];
    const url = URL.createObjectURL(firstFile);
    setVoiceAudioUrl(url);

    const temp = new Audio(url);
    temp.onloadedmetadata = () => {
      setVoiceDurationSec(
        Number.isFinite(temp.duration) && temp.duration > 0
          ? temp.duration
          : 25
      );
    };

    showToast(
      list.length > 1
        ? `${list.length} voiceover files imported for bulk edit`
        : `Voiceover file imported: ${firstFile.name}`
    );

    if (!scriptText.trim() && firstFile.size < 12 * 1024 * 1024) {
      const reader = new FileReader();
      reader.onload = async () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result.split(',')[1];
          if (!base64) return;
          try {
            const res = await fetch('/api/gemini/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                audioBase64: base64,
                mimeType: firstFile.type || 'audio/mp3',
              }),
            });
            const data = await res.json();
            if (res.ok && data.text) {
              setScriptText(data.text);
              showToast('Script automatically generated from voice!');
            }
          } catch {
            // ignore transcription error
          }
        }
      };
      reader.readAsDataURL(firstFile);
    }
  };

  // Generate TTS Voiceover via Server-Side Multi-Engine TTS Pipeline
  const generateTtsVoiceover = async (
    textToSpeak: string,
    voiceName: string
  ): Promise<{ url: string; duration: number } | null> => {
    setIsGeneratingVoice(true);
    try {
      const response = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textToSpeak,
          voiceName,
          engine: voiceEngine,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.audioBase64) {
        throw new Error(data.error || 'Voice generation failed');
      }

      const byteCharacters = atob(data.audioBase64);
      if (byteCharacters.length < 512) {
        throw new Error('Generated audio stream is empty or invalid.');
      }

      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: data.mimeType || 'audio/wav',
      });
      const url = URL.createObjectURL(blob);

      const serverDur =
        typeof data.durationSec === 'number' && data.durationSec > 0
          ? data.durationSec
          : 0;

      const dur = await new Promise<number>((resolve) => {
        const tempAudio = new Audio(url);
        tempAudio.onloadedmetadata = () => {
          resolve(
            Number.isFinite(tempAudio.duration) && tempAudio.duration > 0
              ? tempAudio.duration
              : serverDur || 12
          );
        };
        tempAudio.onerror = () => resolve(serverDur || 12);
      });

      setVoiceAudioUrl(url);
      setVoiceDurationSec(dur);
      showToast(
        `Voiceover successfully created (${getVoiceDisplayName(voiceName)} • ${dur.toFixed(1)}s)`
      );
      return { url, duration: dur };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'TTS error';
      showToast(`Voice generation error: ${msg}`);
      return null;
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  // Real Bengali Voice Preview on clicking any Voice Character button
  const handleSelectVoice = async (voice: string) => {
    setSelectedVoice(voice);

    if (activePreviewAudioRef.current) {
      activePreviewAudioRef.current.pause();
      activePreviewAudioRef.current = null;
    }

    const previewGreeting = 'হ্যালো, মাহমুদ অটো এডিট-এ স্বাগতম।';

    const cacheKey = `${voiceEngine}:${voice}`;
    const cachedUrl = voicePreviewCacheRef.current.get(cacheKey);
    if (cachedUrl) {
      setPreviewingVoiceName(voice);
      const audio = new Audio(cachedUrl);
      activePreviewAudioRef.current = audio;
      audio.onended = () => setPreviewingVoiceName(null);
      audio.play().catch(() => setPreviewingVoiceName(null));
      return;
    }

    setPreviewingVoiceName(voice);
    try {
      const response = await fetch('/api/gemini/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewGreeting,
          voiceName: voice,
          engine: voiceEngine,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.audioBase64) {
        throw new Error(data.error || 'Voice preview failed');
      }

      const byteCharacters = atob(data.audioBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const blob = new Blob([new Uint8Array(byteNumbers)], {
        type: data.mimeType || 'audio/wav',
      });
      const url = URL.createObjectURL(blob);
      voicePreviewCacheRef.current.set(cacheKey, url);

      const audio = new Audio(url);
      activePreviewAudioRef.current = audio;
      audio.onended = () => setPreviewingVoiceName(null);
      audio.onerror = () => setPreviewingVoiceName(null);
      await audio.play();
    } catch (err: unknown) {
      setPreviewingVoiceName(null);
      const msg = err instanceof Error ? err.message : 'Preview error';
      showToast(`Voice preview error: ${msg}`);
    }
  };

  // Reset Everything
  const handleResetAll = () => {
    setIsAutoCapturing(false);
    setIsExporting(false);
    stopExportFlagRef.current = true;
    if (activePreviewAudioRef.current) {
      activePreviewAudioRef.current.pause();
    }
    setScriptText('');
    setTargetDurationMinutes('');
    setCcEnabled(false);
    setVoiceAudioUrl(null);
    setVoiceDurationSec(0);
    setBulkVoiceCount(0);
    setSelectedBgmId('none');
    setChannelName('');
    setBorderLightEnabled(false);
    setHookTemplate('Studio Frame');
    setHookDuration(0);
    setHookSpeed(1.2);
    setOverlayEffect('Clean (Off)');
    setFxStyle('Ultra Story FX');
    setTransitionStyle('Auto Mix Pro');
    setColorGrading(DEFAULT_COLOR_GRADING);
    setZoomPercent(100);
    setGalleryFrames([]);
    setHasVideoLoaded(false);
    setVideoUrl(null);
    setVideoTitle('');
    setVideoDuration(0);
    setCurrentTime(0);
    setTrimStart(0);
    setTrimEnd(0);
    setExtraFrame({
      enabled: false,
      frameId: null,
      imageUrl: null,
      sceneLabel: 'No scene frame selected',
      durationMinutes: 1,
    });
    setChannelWatermarkUrl(null);
    setActiveTab('generate');
    showToast('All options have been reset');
  };

  const handleUploadChannelWatermark = (file: File) => {
    const url = URL.createObjectURL(file);
    setChannelWatermarkUrl(url);
    showToast('Channel watermark logo uploaded successfully');
  };

  const handleRemoveChannelWatermark = () => {
    setChannelWatermarkUrl(null);
    showToast('Channel watermark logo removed');
  };

  // REAL VIDEO EXPORT ENGINE
  const handleStartExport = async () => {
    if (isExporting) return;

    if (
      galleryFrames.length === 0 &&
      !videoUrl &&
      !extraFrame.imageUrl &&
      !scriptText.trim() &&
      !voiceAudioUrl
    ) {
      showToast(
        'Please add a video, gallery photo, or voice script to export'
      );
      return;
    }

    stopExportFlagRef.current = false;
    setIsExporting(true);
    setExportStage('TTS Voice');
    setExportProgress(2);
    setExportElapsedSec(0);

    // 1. Generate TTS Voiceover if script is provided and no voiceover exists yet
    let currentVoiceUrl = voiceAudioUrl;
    let currentVoiceDur = voiceDurationSec;
    const effectiveScript = scriptText.trim();

    if (!currentVoiceUrl && effectiveScript) {
      const ttsResult = await generateTtsVoiceover(
        effectiveScript,
        selectedVoice
      );
      if (stopExportFlagRef.current) {
        setIsExporting(false);
        return;
      }
      if (ttsResult) {
        currentVoiceUrl = ttsResult.url;
        currentVoiceDur = ttsResult.duration;
      } else {
        currentVoiceDur = 14;
      }
    }

    // Stage 2: Frame Capture (auto-extract frames from uploaded video if Gallery is empty)
    setExportStage('Frame Capture');
    setExportProgress(12);

    let activeFrames = galleryFrames.filter((f) => !f.isDuplicate);
    const vid = hiddenVideoRef.current || videoRef.current;

    if (activeFrames.length === 0 && vid && videoUrl && vid.readyState >= 1) {
      const extracted: CapturedFrame[] = [];
      const dur =
        trimEnd > trimStart
          ? trimEnd
          : Number.isFinite(vid.duration) && vid.duration > 0
          ? vid.duration
          : 20;
      const step = Math.max(2, (dur - trimStart) / 8);

      for (let t = trimStart; t < dur && extracted.length < 8; t += step) {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 400);
          vid.addEventListener(
            'seeked',
            () => {
              clearTimeout(timeout);
              resolve();
            },
            { once: true }
          );
          vid.currentTime = t;
        });

        const nativeW = vid.videoWidth || 1920;
        const nativeH = vid.videoHeight || 1080;
        const c = document.createElement('canvas');
        c.width = nativeW;
        c.height = nativeH;
        const cCtx = c.getContext('2d');
        if (cCtx) {
          drawGradedFrameToCanvas(
            cCtx,
            vid,
            nativeW,
            nativeH,
            nativeW,
            nativeH,
            zoomPercent,
            colorGrading
          );
          extracted.push({
            id: `auto-${Date.now()}-${extracted.length}`,
            index: extracted.length + 1,
            dataUrl: c.toDataURL('image/png'),
            timestamp: t,
            formattedTime: formatTimeShort(t),
            signature: computeSignatureFromCanvas(c),
            isDuplicate: false,
            selected: false,
            replacedCount: 0,
          });
        }
      }

      if (extracted.length > 0) {
        const deduped = recalculateDuplicates(extracted, similarityThreshold);
        setGalleryFrames(deduped);
        activeFrames = deduped.filter((f) => !f.isDuplicate);
      }
    }

    if (activeFrames.length === 0) {
      const fallbackUrl = createStudioBackdropDataUrl();
      activeFrames = [
        {
          id: `studio-backdrop-${Date.now()}`,
          index: 1,
          dataUrl: fallbackUrl,
          timestamp: 0,
          formattedTime: '00:00',
          signature: [],
          isDuplicate: false,
          selected: false,
          replacedCount: 0,
        },
      ];
    }

    // Stage 3: Shuffling
    setExportStage('Shuffling');
    setExportProgress(18);
    await new Promise((r) => setTimeout(r, 300));

    if (stopExportFlagRef.current) {
      setIsExporting(false);
      return;
    }

    // Preload images for smooth 30fps canvas rendering
    const loadedImages: HTMLImageElement[] = await Promise.all(
      activeFrames.map(
        (f) =>
          new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = () => resolve(img);
            img.src = f.dataUrl;
          })
      )
    );

    let loadedExtraImg: HTMLImageElement | null = null;
    if (extraFrame.enabled && extraFrame.imageUrl) {
      loadedExtraImg = await new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = extraFrame.imageUrl!;
      });
    }

    let loadedWatermarkImg: HTMLImageElement | null = null;
    if (channelWatermarkUrl) {
      loadedWatermarkImg = await new Promise<HTMLImageElement>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(img);
        img.src = channelWatermarkUrl;
      });
    }

    // Stage 4: Real-Time Canvas + Audio Mixing & Recording
    setExportStage('Rendering');

    const hookSec =
      hookDuration > 0
        ? Math.min(8, Math.round(hookDuration / hookSpeed))
        : 0;
    const mainNarrationSec =
      currentVoiceDur > 0
        ? Math.max(4, Math.ceil(currentVoiceDur))
        : 12;
    const extraTailSec = extraFrame.enabled ? 3 : 0;
    const totalRenderSec = hookSec + mainNarrationSec + extraTailSec;
    setExportTotalSec(totalRenderSec);

    const canvas = exportCanvasRef.current;
    if (!canvas) {
      setIsExporting(false);
      return;
    }
    const ctx = canvas.getContext('2d')!;

    // Configure export resolution & Studio Master bitrate based on selected ExportQuality
    const resolutionMap: Record<ExportQuality, { w: number; h: number; bps: number }> = {
      '1080p': { w: 1920, h: 1080, bps: 16_000_000 },
      '720p': { w: 1280, h: 720, bps: 8_000_000 },
      '480p': { w: 854, h: 480, bps: 4_000_000 },
    };
    const targetSpec = resolutionMap[exportQuality] || resolutionMap['1080p'];
    canvas.width = targetSpec.w;
    canvas.height = targetSpec.h;

    // Set up Web Audio Graph to mix Voiceover + Background Music + Live Spectrum Analyser
    const audioCtx = new AudioContext();
    const destNode = audioCtx.createMediaStreamDestination();
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    const freqData = new Uint8Array(analyser.frequencyBinCount);

    const voiceAudioEl = currentVoiceUrl ? new Audio(currentVoiceUrl) : null;
    if (voiceAudioEl) {
      voiceAudioEl.crossOrigin = 'anonymous';
      const voiceSource = audioCtx.createMediaElementSource(voiceAudioEl);
      const voiceGain = audioCtx.createGain();
      voiceGain.gain.value = 1.0;
      voiceSource.connect(voiceGain);
      voiceGain.connect(destNode);
      voiceGain.connect(analyser);
      voiceGain.connect(audioCtx.destination);
    }

    const activeBgmTrack = bgmTracks.find((b) => b.id === selectedBgmId);
    const bgmAudioEl =
      activeBgmTrack && activeBgmTrack.url
        ? new Audio(activeBgmTrack.url)
        : null;
    if (bgmAudioEl) {
      bgmAudioEl.crossOrigin = 'anonymous';
      bgmAudioEl.loop = true;
      const bgmSource = audioCtx.createMediaElementSource(bgmAudioEl);
      const bgmGain = audioCtx.createGain();
      bgmGain.gain.value = 0.28;
      bgmSource.connect(bgmGain);
      bgmGain.connect(destNode);
      bgmGain.connect(analyser);
      bgmGain.connect(audioCtx.destination);
      bgmAudioEl.play().catch(() => {});
    }

    const canvasStream = canvas.captureStream(30);
    const combinedStream = new MediaStream([
      ...canvasStream.getVideoTracks(),
      ...destNode.stream.getAudioTracks(),
    ]);

    // Prioritize MP4 / H.264 codecs for direct .mp4 compatibility
    const preferredMimeTypes = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=avc1,opus',
      'video/mp4',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9,opus',
      'video/webm',
    ];
    const supportedMime =
      preferredMimeTypes.find((t) => MediaRecorder.isTypeSupported(t)) || '';

    const recorderOptions: MediaRecorderOptions = {
      videoBitsPerSecond: targetSpec.bps,
    };
    if (supportedMime) {
      recorderOptions.mimeType = supportedMime;
    }

    const recorder = new MediaRecorder(combinedStream, recorderOptions);

    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    const particles = createParticles(95);
    const startTimeMs = performance.now();
    let voiceStarted = false;

    const bgVid = hiddenVideoRef.current || videoRef.current;
    if (bgVid && videoUrl && hookSec > 0) {
      bgVid.playbackRate = hookSpeed;
      bgVid.currentTime = hookStartSec % Math.max(1, bgVid.duration || 30);
      bgVid.play().catch(() => {});
    }

    try {
      await new Promise<void>((resolve, reject) => {
        recorder.onstop = () => resolve();
        recorder.onerror = (e) => reject(e);
        recorder.start(200);

        const tick = () => {
          if (stopExportFlagRef.current) {
            if (recorder.state !== 'inactive') recorder.stop();
            return;
          }

          const elapsed = (performance.now() - startTimeMs) / 1000;
          setExportElapsedSec(elapsed);

          const pct = Math.min(
            99,
            18 + Math.round((elapsed / totalRenderSec) * 81)
          );
          setExportProgress(pct);

          if (!voiceStarted && elapsed >= hookSec && voiceAudioEl) {
            voiceStarted = true;
            bgVid?.pause();
            voiceAudioEl.play().catch(() => {});
          }

          // Measure live audio energy for reactive FX / spectrum analyzer
          analyser.getByteFrequencyData(freqData);
          let sum = 0;
          for (let i = 0; i < freqData.length; i++) {
            sum += freqData[i];
          }
          const liveAudioEnergy =
            freqData.length > 0 ? sum / (freqData.length * 255) : 0;
          const audioEnergy = Math.max(
            liveAudioEnergy,
            0.35 + 0.25 * Math.sin(elapsed * 6.5)
          );

          try {
            renderCompositeFrame(
              ctx,
              canvas.width,
              canvas.height,
              elapsed,
              hookSec + mainNarrationSec,
              {
                frames: activeFrames,
                videoElement: bgVid,
                hookStartSec,
                hookDuration,
                hookSpeed,
                borderLight: borderLightEnabled,
                hookTemplate,
                channelName,
                channelSizePercent,
                overlay: overlayEffect,
                fxStyle,
                transitionStyle,
                ccEnabled,
                scriptText: effectiveScript,
                colorGrading,
                zoomPercent,
                quality: exportQuality,
                extraFrame,
              },
              loadedImages,
              loadedExtraImg,
              particles,
              audioEnergy,
              loadedWatermarkImg
            );
          } catch (e) {
            console.error('Frame rendering error:', e);
            if (recorder.state !== 'inactive') recorder.stop();
            return;
          }

          if (elapsed < totalRenderSec) {
            requestAnimationFrame(tick);
          } else {
            if (recorder.state !== 'inactive') {
              recorder.stop();
            }
          }
        };

        requestAnimationFrame(tick);
      });
    } catch (e) {
      console.error('Export rendering pipeline error:', e);
      showToast('Rendering error: ' + (e instanceof Error ? e.message : 'Unknown error'));
      setIsExporting(false);
      return;
    }

    bgVid?.pause();
    voiceAudioEl?.pause();
    bgmAudioEl?.pause();
    audioCtx.close().catch(() => {});

    if (stopExportFlagRef.current) {
      setIsExporting(false);
      showToast('Video export cancelled');
      return;
    }

    const videoBlob = new Blob(chunks, {
      type: 'video/mp4',
    });
    const renderedVideoUrl = URL.createObjectURL(videoBlob);
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const filename = `Drama_${randomId}_${exportQuality}HD.mp4`;

    const a = document.createElement('a');
    a.href = renderedVideoUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    const newExportItem: ExportedVideo = {
      id: `exp-${Date.now()}`,
      filename,
      audioFilename: `Drama_${randomId}.wav`,
      videoUrl: renderedVideoUrl,
      audioUrl: currentVoiceUrl || '',
      durationSeconds: totalRenderSec,
      formattedDuration: formatTimeShort(totalRenderSec),
      quality: exportQuality,
      createdAt: new Date().toLocaleTimeString(),
      thumbnailUrl:
        activeFrames[0]?.dataUrl || createStudioBackdropDataUrl(),
    };

    setExportsList((prev) => [newExportItem, ...prev]);
    setIsExporting(false);
    setExportProgress(100);
    showToast(`Saved to Downloads/MahmudAutoEdit: ${filename}`);
    setIsExportsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#111412] text-[#F1F5F2] pb-14">
      {/* Startup Splash Screen */}
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}

      {/* Hidden Video Element for background frame extraction across all tabs */}
      {videoUrl && (
        <video
          ref={hiddenVideoRef}
          src={videoUrl}
          className="hidden"
          onLoadedMetadata={(e) => {
            const dur = e.currentTarget.duration;
            if (Number.isFinite(dur) && dur > 0) {
              setVideoDuration(dur);
              setTrimEnd(dur);
            }
          }}
          crossOrigin="anonymous"
          playsInline
          muted
        />
      )}

      {/* Hidden Native Video File Picker */}
      <input
        ref={videoFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleUploadDeviceVideo(file);
            e.target.value = '';
          }
        }}
      />

      {/* Hidden Multi-Photo Input for Top Bar Upload Photos button */}
      <input
        ref={topPhotoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleUploadPhotos(e.target.files);
            setActiveTab('gallery');
            e.target.value = '';
          }
        }}
      />

      {/* Main Google Pixel M3 Expressive Dark Studio Container */}
      <div className="mx-auto max-w-xl px-3 sm:px-3.5 pt-3.5 sm:pt-5">
        {/* TOP GOOGLE PIXEL M3 APP BAR (Responsive, Zero Text Clipping) */}
        <header className="m3-card flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#173823] border border-[#255436] shadow-sm overflow-hidden p-0.5">
              <img
                src="/assets/aistudio/developer_logo_8aab034f.jpg"
                alt="Mahmud Auto Edit Logo"
                className="h-full w-full rounded-xl object-cover object-[center_38%]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold tracking-tight text-[#F1F5F2] leading-snug">
                  Mahmud Auto Edit
                </span>
              </div>
              <p className="text-[11px] font-medium tracking-[0.04em] text-[#A6B3AA] leading-snug">
                © Mahmud Google Play Developer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsExportsModalOpen(true)}
            className="m3-btn-tonal shrink-0"
          >
            <span className="material-symbols-rounded text-[17px] text-[#6DD58C]">
              folder_special
            </span>
            <span>
              Saved Files {exportsList.length > 0 ? `(${exportsList.length})` : ''}
            </span>
          </button>
        </header>

        {/* M3 EXPRESSIVE NAVIGATION & QUICK ACTIONS DOCK (Responsive 2-Col Mobile / 4-Col Tablet+ with Full Button Labels) */}
        <div className="mt-3 m3-card p-3 space-y-2.5">
          {/* Row 1: Primary Native Android M3 Segmented Navigation + Upload Video */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('crop')}
              className={
                activeTab === 'crop'
                  ? 'm3-btn-filled w-full px-3 py-2'
                  : 'm3-btn-outlined w-full px-3 py-2'
              }
            >
              <span className="material-symbols-rounded text-[17px]">
                content_cut
              </span>
              <span>Auto Shots</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('generate')}
              className={
                activeTab === 'generate'
                  ? 'm3-btn-filled w-full px-3 py-2'
                  : 'm3-btn-outlined w-full px-3 py-2'
              }
            >
              <span className="material-symbols-rounded text-[17px]">
                auto_awesome
              </span>
              <span>Auto Create</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={
                activeTab === 'gallery'
                  ? 'm3-btn-filled w-full px-3 py-2'
                  : 'm3-btn-outlined w-full px-3 py-2'
              }
            >
              <span className="material-symbols-rounded text-[17px]">
                photo_library
              </span>
              <span>
                Screenshots{galleryFrames.length > 0 ? ` (${galleryFrames.length})` : ''}
              </span>
            </button>

            <button
              type="button"
              onClick={triggerDeviceVideoPicker}
              className="m3-btn-tonal w-full px-3 py-2"
            >
              <span className="material-symbols-rounded text-[17px] text-[#6DD58C]">
                video_file
              </span>
              <span>
                {hasVideoLoaded ? 'Change Video' : 'Upload Video'}
              </span>
            </button>
          </div>

          {/* Row 2: M3 Tonal & Outlined Assist Buttons (Upload Photos | Extra Frame | Reset | Exports) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              onClick={() => topPhotoInputRef.current?.click()}
              className="m3-btn-outlined w-full px-3 py-2 text-xs"
            >
              <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
                add_photo_alternate
              </span>
              <span>Upload Photos</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExtraModalOpen(true)}
              className={
                extraFrame.enabled
                  ? 'm3-btn-filled-red w-full px-3 py-2 text-xs'
                  : 'm3-btn-outlined w-full px-3 py-2 text-xs'
              }
            >
              <span
                className={`material-symbols-rounded text-[16px] ${
                  extraFrame.enabled ? 'text-white' : 'text-[#F28B82]'
                }`}
              >
                burst_mode
              </span>
              <span>
                {extraFrame.enabled
                  ? `Ending Clips (${extraFrame.durationMinutes}m)`
                  : 'Ending Clips'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleResetAll}
              className="m3-btn-tonal-red w-full px-3 py-2 text-xs"
            >
              <span className="material-symbols-rounded text-[16px] text-[#F28B82]">
                restart_alt
              </span>
              <span>Reset</span>
            </button>

            <button
              type="button"
              onClick={() => setIsExportsModalOpen(true)}
              className="m3-btn-outlined w-full px-3 py-2 text-xs"
            >
              <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
                download_done
              </span>
              <span>Exports</span>
            </button>
          </div>
        </div>

        {/* ACTIVE TAB VIEWPORT */}
        <main className="mt-3.5">
          {activeTab === 'crop' && (
            <CropTab
              videoUrl={videoUrl}
              videoRef={videoRef}
              videoDuration={videoDuration}
              currentTime={currentTime}
              trimStart={trimStart}
              trimEnd={trimEnd}
              onSeek={handleSeekAllVideos}
              onTimeUpdateOnly={(t) => {
                setCurrentTime(t);
                seekCursorRef.current = t;
              }}
              onDurationLoaded={(dur) => {
                setVideoDuration(dur);
                setTrimEnd(dur);
              }}
              onTrimChange={(s, e) => {
                setTrimStart(s);
                setTrimEnd(e);
              }}
              colorGrading={colorGrading}
              onColorChange={setColorGrading}
              onResetColor={() => setColorGrading(DEFAULT_COLOR_GRADING)}
              zoomPercent={zoomPercent}
              onZoomChange={setZoomPercent}
              captureIntervalSec={captureIntervalSec}
              onCaptureIntervalChange={setCaptureIntervalSec}
              isAutoCapturing={isAutoCapturing}
              autoCaptureProgress={autoCaptureProgress}
              onToggleAutoCapture={() => {
                if (!isAutoCapturing) {
                  if (
                    seekCursorRef.current < trimStart ||
                    (trimEnd > 0 && seekCursorRef.current >= trimEnd)
                  ) {
                    seekCursorRef.current = trimStart;
                  }
                  setAutoCaptureProgress(1);
                  setIsAutoCapturing(true);
                } else {
                  setIsAutoCapturing(false);
                }
              }}
              onCaptureSingleFrame={handleCaptureSingleFrame}
              onOpenVideoSelector={triggerDeviceVideoPicker}
              channelWatermarkUrl={channelWatermarkUrl}
            />
          )}

          {activeTab === 'generate' && (
            <GenerateTab
              scriptText={scriptText}
              onScriptChange={setScriptText}
              targetDurationMinutes={targetDurationMinutes}
              onTargetDurationChange={setTargetDurationMinutes}
              ccEnabled={ccEnabled}
              onToggleCc={() => setCcEnabled(!ccEnabled)}
              isExpandingScript={isExpandingScript}
              onExpandScript={handleExpandScript}
              voiceAudioUrl={voiceAudioUrl}
              voiceDurationSec={voiceDurationSec}
              bulkVoiceCount={bulkVoiceCount}
              isGeneratingVoice={isGeneratingVoice}
              previewingVoiceName={previewingVoiceName}
              onGenerateVoiceNow={() => {
                const effective =
                  scriptText.trim() ||
                  'আসসালামু আলাইকুম বন্ধুরা! আশা করি আপনারা সবাই অনেক ভালো আছেন। আজকে আপনারা দেখবেন আমাদের নতুন বাংলা নাটকের বিশেষ কিছু চমক এবং আকর্ষণীয় কিছু টুইস্ট। ভালো লাগলে অবশ্যই আমাদের চ্যানেলটি সাবস্ক্রাইব করে সাথেই থাকুন।';
                if (!scriptText.trim()) {
                  setScriptText(effective);
                }
                generateTtsVoiceover(effective, selectedVoice);
              }}
              onImportVoiceFiles={handleImportVoiceFiles}
              bgmTracks={bgmTracks}
              selectedBgmId={selectedBgmId}
              onSelectBgm={setSelectedBgmId}
              onUploadCustomBgm={(file) => {
                const url = URL.createObjectURL(file);
                const newTrack: BgmTrack = {
                  id: `custom-${Date.now()}`,
                  name: file.name,
                  url,
                  isCustom: true,
                };
                setBgmTracks((prev) => [...prev, newTrack]);
                setSelectedBgmId(newTrack.id);
                showToast(`ব্যাকগ্রাউন্ড মিউজিক যোগ হয়েছে: ${file.name}`);
              }}
              channelName={channelName}
              onChannelNameChange={setChannelName}
              channelSizePercent={channelSizePercent}
              onChannelSizeChange={setChannelSizePercent}
              channelWatermarkUrl={channelWatermarkUrl}
              onUploadChannelWatermark={handleUploadChannelWatermark}
              onRemoveChannelWatermark={handleRemoveChannelWatermark}
              borderLightStyle={borderLightStyle}
              onBorderLightStyleChange={setBorderLightStyle}
              borderLightEnabled={borderLightEnabled}
              onToggleBorderLight={() =>
                setBorderLightEnabled(!borderLightEnabled)
              }
              borderCycleSec={borderCycleSec}
              onBorderCycleSecChange={setBorderCycleSec}
              hookTemplate={hookTemplate}
              onHookTemplateChange={setHookTemplate}
              hookDuration={hookDuration}
              onHookDurationChange={(dur) => {
                setHookDuration(dur);
                if (dur > 0) {
                  setHookTriggerCount((c) => c + 1);
                }
              }}
              hookStartSec={hookStartSec}
              hookTriggerCount={hookTriggerCount}
              onRegenerateHook={() => {
                if (hookDuration === 0) {
                  setHookDuration(10);
                }
                const span = Math.max(10, (trimEnd || videoDuration || 60) - trimStart);
                const nextRandom = trimStart + Math.floor(Math.random() * span);
                setHookStartSec(nextRandom);
                setHookTriggerCount((c) => c + 1);
                showToast('নতুন হুক দৃশ্য সিলেক্ট করা হয়েছে');
              }}
              onUploadCustomHookVideo={(file) => {
                handleUploadDeviceVideo(file);
                if (hookDuration === 0) setHookDuration(10);
                setHookTriggerCount((c) => c + 1);
              }}
              hookSpeed={hookSpeed}
              onHookSpeedChange={setHookSpeed}
              overlayEffect={overlayEffect}
              onOverlayEffectChange={setOverlayEffect}
              fxStyle={fxStyle}
              onFxStyleChange={setFxStyle}
              transitionStyle={transitionStyle}
              onTransitionStyleChange={setTransitionStyle}
              voiceEngine={voiceEngine}
              onVoiceEngineChange={setVoiceEngine}
              selectedVoice={selectedVoice}
              onSelectVoice={handleSelectVoice}
              exportQuality={exportQuality}
              onExportQualityChange={setExportQuality}
              extraFrame={extraFrame}
              onOpenExtraFrameModal={() => setIsExtraModalOpen(true)}
              onOpenVideoSelector={triggerDeviceVideoPicker}
              hasVideoLoaded={hasVideoLoaded}
              videoUrl={videoUrl}
              galleryFrames={galleryFrames}
              zoomPercent={zoomPercent}
              isExporting={isExporting}
              exportStage={exportStage}
              exportProgress={exportProgress}
              exportElapsedSec={exportElapsedSec}
              exportTotalSec={exportTotalSec}
              exportCanvasRef={exportCanvasRef}
              onStartExport={handleStartExport}
              onStopExport={() => {
                stopExportFlagRef.current = true;
                setIsExporting(false);
              }}
            />
          )}

          {activeTab === 'gallery' && (
            <GalleryTab
              frames={galleryFrames}
              similarityThreshold={similarityThreshold}
              onThresholdChange={handleThresholdChange}
              onToggleSelectFrame={(id) => {
                setGalleryFrames((prev) =>
                  prev.map((f) =>
                    f.id === id ? { ...f, selected: !f.selected } : f
                  )
                );
              }}
              onSelectAll={() => {
                const allSelected = galleryFrames.every((f) => f.selected);
                setGalleryFrames((prev) =>
                  prev.map((f) => ({ ...f, selected: !allSelected }))
                );
              }}
              onAutoSelectDuplicates={() => {
                setGalleryFrames((prev) =>
                  prev.map((f) => ({ ...f, selected: f.isDuplicate }))
                );
                showToast('সব ডুপ্লিকেট ছবি সিলেক্ট করা হয়েছে');
              }}
              onAutoDeleteDuplicates={handleAutoDeleteDuplicates}
              onDeleteFrame={(id) => {
                setGalleryFrames((prev) => {
                  const filtered = prev.filter((f) => f.id !== id);
                  return recalculateDuplicates(filtered, similarityThreshold);
                });
              }}
              onReplaceFrameWithFile={(id, file) => {
                const reader = new FileReader();
                reader.onload = () => {
                  if (typeof reader.result === 'string') {
                    const img = new Image();
                    img.onload = () => {
                      const sig = computeSignatureFromImage(img);
                      setGalleryFrames((prev) => {
                        const updated = prev.map((f) =>
                          f.id === id
                            ? {
                                ...f,
                                dataUrl: reader.result as string,
                                signature: sig,
                                replacedCount: f.replacedCount + 1,
                              }
                            : f
                        );
                        return recalculateDuplicates(
                          updated,
                          similarityThreshold
                        );
                      });
                      showToast('ফ্রেমটি সফলভাবে রিপ্লেস করা হয়েছে');
                    };
                    img.src = reader.result;
                  }
                };
                reader.readAsDataURL(file);
              }}
              onRecaptureFrameFromVideo={(id) => {
                const vid = videoRef.current || hiddenVideoRef.current;
                if (!vid || !videoUrl || vid.readyState < 2) {
                  showToast('ফ্রেম রিপ্লেস করতে অনুগ্রহ করে আগে ভিডিও লোড করুন');
                  return;
                }
                const c = document.createElement('canvas');
                c.width = 640;
                c.height = 360;
                const cCtx = c.getContext('2d');
                if (!cCtx) return;
                drawGradedFrameToCanvas(
                  cCtx,
                  vid,
                  vid.videoWidth || 640,
                  vid.videoHeight || 360,
                  640,
                  360,
                  zoomPercent,
                  colorGrading
                );
                const sig = computeSignatureFromCanvas(c);
                const dataUrl = c.toDataURL('image/jpeg', 0.88);
                setGalleryFrames((prev) => {
                  const updated = prev.map((f) =>
                    f.id === id
                      ? {
                          ...f,
                          dataUrl,
                          signature: sig,
                          replacedCount: f.replacedCount + 1,
                        }
                      : f
                  );
                  return recalculateDuplicates(updated, similarityThreshold);
                });
                showToast('ভিডিওর বর্তমান দৃশ্য দিয়ে ফ্রেমটি রিপ্লেস করা হয়েছে');
              }}
              onUploadPhotos={handleUploadPhotos}
              onClearAll={() => {
                const count = galleryFrames.length;
                setGalleryFrames([]);
                showToast(`সব ফ্রেম (${count}টি) মুছে ফেলা হয়েছে`);
              }}
              onUseUniqueForVideo={() => {
                handleAutoDeleteDuplicates();
                setActiveTab('generate');
              }}
              onShowToast={showToast}
            />
          )}
        </main>
      </div>

      {/* Extra Frame Modal */}
      <ExtraFrameModal
        isOpen={isExtraModalOpen}
        onClose={() => setIsExtraModalOpen(false)}
        extraFrame={extraFrame}
        onChange={setExtraFrame}
        galleryFrames={galleryFrames}
        onShowToast={showToast}
      />

      {/* Exported Videos Folder & Player Modal */}
      <ExportedVideosModal
        isOpen={isExportsModalOpen}
        onClose={() => setIsExportsModalOpen(false)}
        exportsList={exportsList}
      />

      {/* Bottom Floating Google Pixel M3 Dark Snackbar Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 inset-x-4 z-50 mx-auto max-w-md pointer-events-none flex justify-center">
          <div className="flex items-center gap-2.5 rounded-2xl border border-[#255436] bg-[#1E2420] px-4 py-3 text-xs font-semibold text-[#F1F5F2] shadow-2xl">
            <span className="material-symbols-rounded text-[18px] text-[#6DD58C] shrink-0">
              check_circle
            </span>
            <span className="leading-snug break-words">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
