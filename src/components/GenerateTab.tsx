import React, { useEffect, useRef, useState } from 'react';
import {
  BgmTrack,
  BorderLightStyle,
  CapturedFrame,
  ExportQuality,
  ExtraFrameSettings,
  FxStyleMode,
  HookDuration,
  HookFrameTemplate,
  OverlayEffect,
  TransitionStyle,
  VoiceEngine,
} from '../types';
import { formatTimeShort } from '../utils/frameEngine';

interface GenerateTabProps {
  scriptText: string;
  onScriptChange: (text: string) => void;
  targetDurationMinutes: string;
  onTargetDurationChange: (val: string) => void;
  ccEnabled: boolean;
  onToggleCc: () => void;
  isExpandingScript: boolean;
  onExpandScript: () => void;
  voiceAudioUrl: string | null;
  voiceDurationSec: number;
  bulkVoiceCount: number;
  isGeneratingVoice: boolean;
  previewingVoiceName: string | null;
  onGenerateVoiceNow: () => void;
  onImportVoiceFiles: (files: FileList) => void;
  bgmTracks: BgmTrack[];
  selectedBgmId: string;
  onSelectBgm: (id: string) => void;
  onUploadCustomBgm: (file: File) => void;
  channelName: string;
  onChannelNameChange: (name: string) => void;
  channelSizePercent: number;
  onChannelSizeChange: (size: number) => void;
  channelWatermarkUrl: string | null;
  onUploadChannelWatermark: (file: File) => void;
  onRemoveChannelWatermark: () => void;
  borderLightStyle: BorderLightStyle;
  onBorderLightStyleChange: (style: BorderLightStyle) => void;
  borderLightEnabled: boolean;
  onToggleBorderLight: () => void;
  borderCycleSec: string;
  onBorderCycleSecChange: (val: string) => void;
  hookTemplate: HookFrameTemplate;
  onHookTemplateChange: (tpl: HookFrameTemplate) => void;
  hookDuration: HookDuration;
  onHookDurationChange: (dur: HookDuration) => void;
  hookStartSec: number;
  hookTriggerCount: number;
  onRegenerateHook: () => void;
  onUploadCustomHookVideo: (file: File) => void;
  hookSpeed: number;
  onHookSpeedChange: (speed: number) => void;
  overlayEffect: OverlayEffect;
  onOverlayEffectChange: (ov: OverlayEffect) => void;
  fxStyle: FxStyleMode;
  onFxStyleChange: (fx: FxStyleMode) => void;
  transitionStyle: TransitionStyle;
  onTransitionStyleChange: (tr: TransitionStyle) => void;
  voiceEngine: VoiceEngine;
  onVoiceEngineChange: (eng: VoiceEngine) => void;
  selectedVoice: string;
  onSelectVoice: (voice: string) => void;
  exportQuality: ExportQuality;
  onExportQualityChange: (q: ExportQuality) => void;
  extraFrame: ExtraFrameSettings;
  onOpenExtraFrameModal: () => void;
  onOpenVideoSelector: () => void;
  hasVideoLoaded: boolean;
  videoUrl: string | null;
  galleryFrames: CapturedFrame[];
  zoomPercent: number;
  // Export state
  isExporting: boolean;
  exportStage: 'TTS Voice' | 'Frame Capture' | 'Shuffling' | 'Rendering';
  exportProgress: number;
  exportElapsedSec: number;
  exportTotalSec: number;
  exportCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onStartExport: () => void;
  onStopExport: () => void;
}

const GEMINI_VOICES = ['Kore', 'Aoede', 'Zephyr', 'Fenrir', 'Charon', 'Puck'];

export const VOICE_DISPLAY_NAMES: Record<string, string> = {
  Aoede: 'Aurora',
  Zephyr: 'Nova',
  Fenrir: 'Titan',
  Charon: 'Shadow',
  Puck: 'Spark',
  Kore: '👑 Karo Special',
  Karo: '👑 Karo Special',
};

export function getVoiceDisplayName(voiceId: string): string {
  return VOICE_DISPLAY_NAMES[voiceId] || voiceId;
}
const NEURAL_VOICES = [
  'PradeepNeural BD',
  'NabanitaNeural BD',
  'BashkarNeural IN',
  'TanishaaNeural IN',
];
const BROWSER_VOICES = [
  'PradeepNeural BD',
  'NabanitaNeural BD',
  'BashkarNeural IN',
  'TanishaaNeural IN',
];

const HOOK_DURATIONS: { label: string; value: HookDuration }[] = [
  { label: 'Off (0s)', value: 0 },
  { label: '10 Seconds', value: 10 },
  { label: '30 Seconds', value: 30 },
  { label: '1 Minute', value: 60 },
  { label: '2 Minutes', value: 120 },
  { label: '3 Minutes', value: 180 },
];

const SPEED_OPTIONS = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];

const OVERLAY_OPTIONS: { label: string; value: OverlayEffect; icon: string }[] = [
  { label: 'Clean (Off)', value: 'Clean (Off)', icon: '🔳' },
  { label: 'Monsoon Storm', value: 'Monsoon Storm', icon: '🌧️' },
  { label: 'Arctic Frost', value: 'Arctic Frost', icon: '❄️' },
  { label: 'Fire Sparks', value: 'Fire Sparks', icon: '🔥' },
  { label: 'Golden Sunbeams', value: 'Golden Sunbeams', icon: '☀️' },
  { label: 'Velvet Hearts', value: 'Velvet Hearts', icon: '💖' },
  { label: 'Retro 35mm VHS', value: 'Retro 35mm VHS', icon: '🎞️' },
  { label: 'Neon Bokeh Glow', value: 'Neon Bokeh Glow', icon: '🌟' },
];

const FX_STYLE_OPTIONS: { label: string; value: FxStyleMode; icon: string }[] = [
  { label: 'Ultra Story FX', value: 'Ultra Story FX', icon: '🎭' },
  { label: 'IMAX Scope 4K', value: 'IMAX Scope 4K', icon: '🎬' },
  { label: 'Sonic Spectrum', value: 'Sonic Spectrum', icon: '🎵' },
  { label: 'Cyber Glitch Pro', value: 'Cyber Glitch Pro', icon: '⚡' },
  { label: 'HDR Cinema Pop', value: 'HDR Cinema Pop', icon: '🌈' },
];

const TRANSITION_OPTIONS: {
  label: string;
  value: TransitionStyle;
  icon: string;
}[] = [
  { label: 'Auto Mix Pro', value: 'Auto Mix Pro', icon: '🔄' },
  { label: 'Hyper Zoom Flash', value: 'Hyper Zoom Flash', icon: '💥' },
  { label: 'Velocity Whip Pan', value: 'Velocity Whip Pan', icon: '💨' },
  { label: 'Prism Shutter 7X', value: 'Prism Shutter 7X', icon: '🪟' },
  { label: 'Portal Iris Warp', value: 'Portal Iris Warp', icon: '🌀' },
  { label: 'Laser Slash Wipe', value: 'Laser Slash Wipe', icon: '⚔️' },
];

export const GenerateTab: React.FC<GenerateTabProps> = ({
  scriptText,
  onScriptChange,
  targetDurationMinutes,
  onTargetDurationChange,
  ccEnabled,
  onToggleCc,
  isExpandingScript,
  onExpandScript,
  voiceAudioUrl,
  voiceDurationSec,
  bulkVoiceCount,
  isGeneratingVoice,
  previewingVoiceName,
  onGenerateVoiceNow,
  onImportVoiceFiles,
  bgmTracks,
  selectedBgmId,
  onSelectBgm,
  onUploadCustomBgm,
  channelName,
  onChannelNameChange,
  channelSizePercent,
  onChannelSizeChange,
  channelWatermarkUrl,
  onUploadChannelWatermark,
  onRemoveChannelWatermark,
  borderLightStyle,
  onBorderLightStyleChange,
  borderLightEnabled,
  onToggleBorderLight,
  borderCycleSec,
  onBorderCycleSecChange,
  hookTemplate,
  onHookTemplateChange,
  hookDuration,
  onHookDurationChange,
  hookStartSec,
  hookTriggerCount,
  onRegenerateHook,
  onUploadCustomHookVideo,
  hookSpeed,
  onHookSpeedChange,
  overlayEffect,
  onOverlayEffectChange,
  fxStyle,
  onFxStyleChange,
  transitionStyle,
  onTransitionStyleChange,
  voiceEngine,
  onVoiceEngineChange,
  selectedVoice,
  onSelectVoice,
  exportQuality,
  onExportQualityChange,
  extraFrame,
  onOpenExtraFrameModal,
  onOpenVideoSelector,
  hasVideoLoaded,
  videoUrl,
  galleryFrames,
  zoomPercent,
  isExporting,
  exportStage,
  exportProgress,
  exportElapsedSec,
  exportTotalSec,
  exportCanvasRef,
  onStartExport,
  onStopExport,
}) => {
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voiceCurrentSec, setVoiceCurrentSec] = useState(0);
  const [isPlayingBgm, setIsPlayingBgm] = useState(false);
  const [isHookPlaying, setIsHookPlaying] = useState(false);
  const [hookElapsedSec, setHookElapsedSec] = useState(0);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showLivePreviewDuringExport, setShowLivePreviewDuringExport] =
    useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const res = await fetch('/api/gemini/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceName: selectedVoice,
          engine: voiceEngine,
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setConnectionStatus({
          ok: true,
          message:
            data.message ||
            `Connected (${data.latencyMs}ms) • ${getVoiceDisplayName(selectedVoice)} ready`,
        });
      } else {
        setConnectionStatus({
          ok: false,
          message: data.error || 'Connection test failed',
        });
      }
    } catch (err: unknown) {
      setConnectionStatus({
        ok: false,
        message:
          err instanceof Error ? err.message : 'Network connection error',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const hookVideoRef = useRef<HTMLVideoElement | null>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const hookInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  const wordCount = scriptText.trim()
    ? scriptText.trim().split(/\s+/).length
    : 0;
  const estimatedSeconds =
    voiceDurationSec > 0
      ? Math.round(voiceDurationSec)
      : wordCount > 0
      ? Math.max(5, Math.round(wordCount * 1.15))
      : 0;

  const selectedBgm = bgmTracks.find((t) => t.id === selectedBgmId);

  const hookAdjustedDuration =
    hookDuration > 0 ? Math.max(1, Math.round(hookDuration / hookSpeed)) : 0;

  useEffect(() => {
    const vid = hookVideoRef.current;
    if (!vid || hookDuration === 0) return;
    vid.playbackRate = hookSpeed;
    const maxStart =
      Number.isFinite(vid.duration) && vid.duration > 5 ? vid.duration - 4 : 30;
    vid.currentTime = hookStartSec % Math.max(1, maxStart);
    setHookElapsedSec(0);
    if (hookTriggerCount > 0) {
      vid
        .play()
        .then(() => setIsHookPlaying(true))
        .catch(() => {});
    }
  }, [hookStartSec, hookTriggerCount, hookDuration]);

  useEffect(() => {
    if (hookVideoRef.current) {
      hookVideoRef.current.playbackRate = hookSpeed;
    }
  }, [hookSpeed]);

  const togglePlayHookVideo = () => {
    const vid = hookVideoRef.current;
    if (!vid) {
      onOpenVideoSelector();
      return;
    }
    vid.playbackRate = hookSpeed;
    if (vid.paused) {
      vid.play().catch(() => {});
      setIsHookPlaying(true);
    } else {
      vid.pause();
      setIsHookPlaying(false);
    }
  };

  const togglePlayVoice = () => {
    if (!voiceAudioUrl) {
      if (scriptText.trim()) {
        onGenerateVoiceNow();
      }
      return;
    }
    const audio = voiceAudioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setIsPlayingVoice(true);
    } else {
      audio.pause();
      setIsPlayingVoice(false);
    }
  };

  const togglePlayBgm = () => {
    const audio = bgmAudioRef.current;
    if (!audio || !selectedBgm?.url) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setIsPlayingBgm(true);
    } else {
      audio.pause();
      setIsPlayingBgm(false);
    }
  };

  const activeVoiceList =
    voiceEngine === 'Gemini Studio'
      ? GEMINI_VOICES
      : voiceEngine === 'TanishaaNeural IN'
      ? NEURAL_VOICES
      : BROWSER_VOICES;

  const hookPreviewFrame =
    galleryFrames.length > 0
      ? galleryFrames[Math.floor(hookStartSec) % galleryFrames.length]?.dataUrl
      : null;

  if (isExporting) {
    const activeTags = [
      extraFrame.enabled ? `Ending Clips (${extraFrame.durationMinutes}m)` : null,
      `${exportQuality} HD MP4`,
      channelWatermarkUrl ? 'Watermark Logo' : null,
      selectedBgmId !== 'none' ? 'BGM' : 'BGM (Off)',
      overlayEffect !== 'Clean (Off)' ? overlayEffect : null,
      hookTemplate !== 'Studio Frame' ? hookTemplate : null,
      hookDuration > 0 ? `Hook Video (${hookDuration}s)` : null,
      `Zoom ${zoomPercent - 100}%`,
      fxStyle,
      transitionStyle,
      ccEnabled ? 'CC (On)' : 'CC (Off)',
      `Speed ${hookSpeed.toFixed(1)}x`,
      `Total Video ${exportTotalSec}s`,
    ].filter(Boolean) as string[];

    const STAGE_CONFIG = {
      'TTS Voice': {
        label: 'Preparing Voiceover',
        subtext: `Generating AI Speech (${getVoiceDisplayName(selectedVoice)})`,
        icon: 'record_voice_over',
      },
      'Frame Capture': {
        label: 'Processing Frames',
        subtext: 'Extracting and color grading video frames',
        icon: 'burst_mode',
      },
      'Shuffling': {
        label: 'Applying Effects',
        subtext: 'Compositing FX, overlays and transitions',
        icon: 'auto_fix_high',
      },
      'Rendering': {
        label: 'Finalizing Video',
        subtext: `Encoding ${exportQuality} HD MP4 video stream`,
        icon: 'movie_filter',
      },
    };

    const currentStageInfo =
      STAGE_CONFIG[exportStage] || STAGE_CONFIG['Rendering'];

    return (
      <div className="m3-card p-4 sm:p-6 space-y-4 border border-[#255436] bg-[#121613] shadow-2xl rounded-3xl">
        {/* Top Header & Stage Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#253328] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[22px] animate-spin">
                progress_activity
              </span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[#F1F5F2] tracking-wide flex items-center gap-2">
                <span>Studio Video Rendering</span>
                <span className="inline-flex items-center rounded-full bg-[#173823] border border-[#255436] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#9CE6B0]">
                  {exportQuality}
                </span>
              </h3>
              <p className="text-[11px] text-[#A6B3AA]">
                {currentStageInfo.subtext}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setShowLivePreviewDuringExport(!showLivePreviewDuringExport)
              }
              className="m3-btn-tonal py-1.5 px-3 text-xs flex items-center gap-1.5"
              title="Toggle Live Render Preview"
            >
              <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
                {showLivePreviewDuringExport ? 'visibility_off' : 'visibility'}
              </span>
              <span>
                {showLivePreviewDuringExport ? 'Hide Preview' : 'Show Live Preview'}
              </span>
            </button>
          </div>
        </div>

        {/* Active Assist Chips Strip */}
        <div className="flex flex-wrap items-center gap-1.5">
          {activeTags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full bg-[#172E1E]/80 border border-[#255436] px-2.5 py-0.5 text-[11px] font-semibold text-[#9CE6B0]"
            >
              <span className="material-symbols-rounded text-[13px] text-[#6DD58C]">
                check
              </span>
              <span>{tag}</span>
            </span>
          ))}
        </div>

        {/* 16:9 Modern Viewport Container */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#2A3B2F] bg-[#0A0D0B] shadow-inner group">
          <canvas
            ref={exportCanvasRef}
            width={
              exportQuality === '1080p'
                ? 1920
                : exportQuality === '720p'
                ? 1280
                : 854
            }
            height={
              exportQuality === '1080p'
                ? 1080
                : exportQuality === '720p'
                ? 720
                : 480
            }
            className={`h-full w-full object-contain transition-opacity duration-300 ${
              showLivePreviewDuringExport ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {/* Hidden Preview Modern Animated HUD */}
          {!showLivePreviewDuringExport && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-[#131B15] via-[#0E1510] to-[#090E0B] p-6 text-center">
              {/* Glowing Ring Loader Graphic */}
              <div className="relative flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-[#255436] animate-ping opacity-25" />
                <div className="absolute inset-0 rounded-full border-2 border-[#229A4B]/40 shadow-[0_0_20px_rgba(34,154,75,0.25)]" />
                <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-[#173823] border border-[#255436] shadow-lg">
                  <span className="material-symbols-rounded text-[32px] sm:text-[38px] text-[#6DD58C] animate-pulse">
                    {currentStageInfo.icon}
                  </span>
                </div>
              </div>

              {/* Glowing Percentage Display */}
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight tabular-nums drop-shadow-[0_0_10px_rgba(109,213,140,0.3)]">
                  {exportProgress}
                </span>
                <span className="text-lg font-bold text-[#6DD58C]">%</span>
              </div>

              <p className="text-xs sm:text-sm font-bold text-[#F1F5F2] tracking-wide">
                {currentStageInfo.label}
              </p>
              <p className="text-[11px] sm:text-xs text-[#A6B3AA] mt-1 max-w-xs">
                {currentStageInfo.subtext}
              </p>
            </div>
          )}

          {/* Top Right Live / Timer Overlay */}
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md border border-white/10 px-2.5 py-1 text-[11px] font-mono font-bold text-[#F1F5F2] tabular-nums">
              <span className="material-symbols-rounded text-[13px] text-[#6DD58C]">
                schedule
              </span>
              <span>{formatTimeShort(exportElapsedSec)}</span>
            </span>
          </div>
        </div>

        {/* Main Modern Progress Section with Glow Bar */}
        <div className="space-y-2 rounded-2xl border border-[#253328] bg-[#171F19] p-3.5">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#F1F5F2] flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#229A4B] animate-ping" />
              <span>{currentStageInfo.label}</span>
            </span>
            <span className="font-mono text-[#6DD58C] tabular-nums text-sm">
              {exportProgress}%
            </span>
          </div>

          {/* Glowing Modern Progress Bar */}
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-[#0E1510] border border-[#255436]/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1B873F] via-[#229A4B] to-[#6DD58C] transition-all duration-300 shadow-[0_0_12px_rgba(34,154,75,0.6)]"
              style={{ width: `${exportProgress}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-[#A6B3AA]">
            <span>
              Elapsed:{' '}
              <strong className="text-[#F1F5F2]">
                {formatTimeShort(exportElapsedSec)}
              </strong>
            </span>
            <span>
              Est. Remaining:{' '}
              <strong className="text-[#F28B82]">
                {formatTimeShort(Math.max(0, exportTotalSec - exportElapsedSec))}
              </strong>
            </span>
          </div>
        </div>

        {/* 4-Stage Stepper Pipeline Indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(
            [
              { id: 'TTS Voice', label: '1. Voiceover', icon: 'record_voice_over' },
              { id: 'Frame Capture', label: '2. Frames', icon: 'burst_mode' },
              { id: 'Shuffling', label: '3. Effects', icon: 'auto_fix_high' },
              { id: 'Rendering', label: '4. Finalize', icon: 'movie_filter' },
            ] as const
          ).map((stg) => {
            const isActive = exportStage === stg.id;
            const stageOrder = [
              'TTS Voice',
              'Frame Capture',
              'Shuffling',
              'Rendering',
            ];
            const isPassed =
              stageOrder.indexOf(exportStage) > stageOrder.indexOf(stg.id);

            return (
              <div
                key={stg.id}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 px-2 text-center text-xs font-bold transition-all ${
                  isActive
                    ? 'border-[#229A4B] bg-[#173823] text-[#FFE875] ring-1 ring-[#229A4B]/50 shadow-[0_0_12px_rgba(34,154,75,0.25)]'
                    : isPassed
                    ? 'border-[#255436] bg-[#14261B] text-[#9CE6B0]'
                    : 'border-[#253328] bg-[#151C17] text-[#6A786E]'
                }`}
              >
                <span
                  className={`material-symbols-rounded text-[15px] ${
                    isActive ? 'animate-bounce text-[#6DD58C]' : ''
                  }`}
                >
                  {isPassed ? 'check_circle' : stg.icon}
                </span>
                <span className="truncate">{stg.label}</span>
              </div>
            );
          })}
        </div>

        {/* Stop Export Button */}
        <button
          type="button"
          onClick={onStopExport}
          className="m3-btn-filled-red w-full py-3 text-sm font-bold shadow-md flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-rounded text-[20px]">
            stop_circle
          </span>
          <span>Cancel Export ({exportProgress}%)</span>
        </button>
      </div>
    );
  }

  const voiceProgressPct =
    voiceDurationSec > 0
      ? Math.min(100, (voiceCurrentSec / voiceDurationSec) * 100)
      : 0;

  return (
    <div className="space-y-3.5">
      {/* Hidden Audio Elements & File Inputs */}
      {voiceAudioUrl && (
        <audio
          ref={voiceAudioRef}
          src={voiceAudioUrl}
          onTimeUpdate={(e) => setVoiceCurrentSec(e.currentTarget.currentTime)}
          onEnded={() => {
            setIsPlayingVoice(false);
            setVoiceCurrentSec(0);
          }}
          className="hidden"
        />
      )}
      {selectedBgm?.url && (
        <audio
          ref={bgmAudioRef}
          src={selectedBgm.url}
          loop
          onEnded={() => setIsPlayingBgm(false)}
          className="hidden"
        />
      )}

      <input
        ref={voiceInputRef}
        type="file"
        accept="audio/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onImportVoiceFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={bgmInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onUploadCustomBgm(f);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={hookInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onUploadCustomHookVideo(f);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={watermarkInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            onUploadChannelWatermark(f);
            e.target.value = '';
          }
        }}
      />

      {/* SECTION 1: VOICEOVER NARRATION SCRIPT (M3 Dark Surface Card) */}
      <div className="m3-card p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[18px]">
                record_voice_over
              </span>
            </span>
            <span className="text-xs font-bold tracking-wider text-[#F1F5F2] uppercase leading-snug">
              Voiceover Narration Script
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasVideoLoaded && (
              <button
                type="button"
                onClick={onOpenVideoSelector}
                className="m3-btn-filled px-3.5 py-2"
              >
                <span className="material-symbols-rounded text-[16px]">
                  video_file
                </span>
                <span>Select Video File</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenExtraFrameModal}
              className={
                extraFrame.enabled
                  ? 'm3-btn-filled-red px-3.5 py-2'
                  : 'm3-btn-tonal-red px-3.5 py-2'
              }
            >
              <span className="material-symbols-rounded text-[16px]">
                burst_mode
              </span>
              <span>
                {extraFrame.enabled
                  ? `Ending Clips (${extraFrame.durationMinutes}m)`
                  : 'Ending Clips'}
              </span>
            </button>
          </div>
        </div>

        {/* Expand Script, M3 CC Switch, Duration Input Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onExpandScript}
            disabled={isExpandingScript}
            className="m3-btn-tonal px-3.5 py-2"
          >
            <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
              auto_awesome
            </span>
            <span>{isExpandingScript ? 'Expanding...' : 'Expand Script'}</span>
          </button>

          {/* M3 Expressive CC Subtitle Switch Button */}
          <button
            type="button"
            onClick={onToggleCc}
            className={
              ccEnabled
                ? 'm3-btn-tonal px-3.5 py-2'
                : 'm3-btn-outlined px-3.5 py-2'
            }
          >
            <span className="material-symbols-rounded text-[16px]">
              closed_caption
            </span>
            <span>CC</span>
            <div
              className={`flex h-4.5 w-8 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                ccEnabled
                  ? 'bg-[#229A4B] justify-end'
                  : 'bg-[#3A443E] justify-start'
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform" />
            </div>
          </button>

          {/* Target Duration Input */}
          <div className="flex flex-1 min-w-[135px] min-h-[2.4rem] items-center gap-2 rounded-full border border-[#36403A] bg-[#222724] px-3.5 py-1.5">
            <span className="material-symbols-rounded text-[16px] text-[#A6B3AA]">
              schedule
            </span>
            <input
              type="number"
              min={1}
              max={60}
              placeholder="Duration (min)"
              value={targetDurationMinutes}
              onChange={(e) => onTargetDurationChange(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-[#F1F5F2] placeholder-[#78857C] focus:outline-none tabular-nums"
            />
          </div>

          {estimatedSeconds > 0 && (
            <span className="inline-flex min-h-[2.4rem] items-center rounded-full border border-[#5C2623] bg-[#381816] px-3.5 py-1.5 text-xs font-mono font-bold text-[#F6AEA9] tabular-nums">
              ~{estimatedSeconds}s
              {targetDurationMinutes ? ` / ${targetDurationMinutes}m` : ''}
            </span>
          )}
        </div>

        {/* Script Textarea (M3 Outlined Text Field on Lighter Charcoal Surface) */}
        <div className="relative">
          <textarea
            rows={3}
            value={scriptText}
            onChange={(e) => onScriptChange(e.target.value)}
            placeholder="Enter script here (or import voice to auto-fill)..."
            className="w-full rounded-2xl border border-[#36403A] bg-[#222724] p-3.5 text-xs leading-relaxed text-[#F1F5F2] placeholder-[#78857C] focus:border-[#229A4B] focus:bg-[#1E2420] focus:outline-none resize-none transition-colors"
          />
        </div>

        {/* Voiceover Preview Player Scrubber */}
        <div className="flex items-center gap-3 rounded-full border border-[#36403A] bg-[#222724] px-3 py-1.5">
          <button
            type="button"
            onClick={togglePlayVoice}
            disabled={isGeneratingVoice}
            className="m3-btn-filled !min-h-0 h-8 w-8 !p-0 shrink-0 rounded-full"
          >
            <span className="material-symbols-rounded text-[18px]">
              {isPlayingVoice ? 'pause' : 'play_arrow'}
            </span>
          </button>

          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#323A35]">
            <div
              className="h-full rounded-full bg-[#229A4B] transition-all duration-150"
              style={{
                width: `${voiceAudioUrl ? Math.max(8, voiceProgressPct) : 0}%`,
              }}
            />
          </div>

          <span className="text-xs font-mono font-bold text-[#F28B82] tabular-nums pr-1 shrink-0">
            {voiceDurationSec > 0 ? `${voiceDurationSec.toFixed(1)}s` : '0:00s'}
          </span>
        </div>

        {/* Bottom Import / Play / Voice Ready / Save Row */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => voiceInputRef.current?.click()}
            className="m3-btn-outlined px-3.5 py-2"
          >
            <span className="material-symbols-rounded text-[17px] text-[#6DD58C]">
              audio_file
            </span>
            <span>
              Import {bulkVoiceCount > 1 ? `(${bulkVoiceCount} Bulk)` : ''}
            </span>
          </button>

          <button
            type="button"
            onClick={onGenerateVoiceNow}
            disabled={isGeneratingVoice}
            className="m3-btn-filled px-4 py-2"
          >
            <span
              className={`material-symbols-rounded text-[17px] ${
                isGeneratingVoice ? 'animate-spin' : ''
              }`}
            >
              {isGeneratingVoice ? 'progress_activity' : 'record_voice_over'}
            </span>
            <span>
              {isGeneratingVoice
                ? `Generating Voice (${getVoiceDisplayName(selectedVoice)})...`
                : `Generate Voice (${getVoiceDisplayName(selectedVoice)})`}
            </span>
          </button>

          {voiceAudioUrl && (
            <>
              <button
                type="button"
                onClick={togglePlayVoice}
                className="m3-btn-outlined px-3.5 py-2"
              >
                <span className="material-symbols-rounded text-[17px] text-[#6DD58C]">
                  {isPlayingVoice ? 'pause' : 'play_arrow'}
                </span>
                <span>Play</span>
              </button>

              <div className="flex flex-1 min-w-[125px] min-h-[2.4rem] items-center justify-center gap-1.5 rounded-full border border-[#255436] bg-[#173823] px-3.5 py-1.5 text-xs font-bold text-[#9CE6B0] tabular-nums">
                <span className="material-symbols-rounded text-[17px] text-[#6DD58C]">
                  graphic_eq
                </span>
                <span>Voice ({voiceDurationSec.toFixed(1)}s)</span>
              </div>

              <a
                href={voiceAudioUrl}
                download={`Drama_Voice_${Date.now()}.wav`}
                className="m3-btn-tonal px-4 py-2"
              >
                <span className="material-symbols-rounded text-[17px] text-[#6DD58C]">
                  download
                </span>
                <span>Save</span>
              </a>
            </>
          )}
        </div>
      </div>

      {/* SECTION 2: BACKGROUND MUSIC (M3 Dark Surface Card) */}
      <div className="m3-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#381816] border border-[#5C2623] text-[#F28B82]">
            <span className="material-symbols-rounded text-[18px]">
              music_note
            </span>
          </span>
          <span className="text-xs font-bold tracking-wider text-[#F1F5F2] uppercase">
            Background Music
          </span>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <select
            value={selectedBgmId}
            onChange={(e) => {
              setIsPlayingBgm(false);
              onSelectBgm(e.target.value);
            }}
            className="w-full sm:flex-1 min-w-[160px] min-h-[2.5rem] rounded-full border border-[#36403A] bg-[#222724] px-4 py-2 text-xs font-semibold text-[#F1F5F2] focus:border-[#229A4B] focus:outline-none"
          >
            {bgmTracks.map((track) => (
              <option key={track.id} value={track.id} className="bg-[#1A1E1B] text-[#F1F5F2]">
                {track.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {selectedBgmId !== 'none' && (
              <button
                type="button"
                onClick={togglePlayBgm}
                className="m3-btn-tonal-red flex-1 sm:flex-initial px-4 py-2"
              >
                <span className="material-symbols-rounded text-[17px]">
                  {isPlayingBgm ? 'pause' : 'play_arrow'}
                </span>
                <span>{isPlayingBgm ? 'Pause' : 'Play'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => bgmInputRef.current?.click()}
              className="m3-btn-filled flex-1 sm:flex-initial px-4 py-2"
            >
              <span className="material-symbols-rounded text-[17px]">
                upload_file
              </span>
              <span>Upload</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 3: VIDEO INTRO (HOOK VIDEO & FRAME OVERLAYS) */}
      <div className="m3-card p-4 sm:p-5 space-y-3.5">
        {/* Top Row: Label, Channel Name Input, Input Hook, Regenerate */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 mr-1">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[18px]">
                movie_filter
              </span>
            </span>
            <span className="text-xs font-bold tracking-wider text-[#F1F5F2] uppercase">
              Video Intro
            </span>
          </div>

          {/* Channel Name & Size Pill */}
          <div className="flex flex-1 min-w-[165px] min-h-[2.4rem] items-center rounded-full border border-[#36403A] bg-[#222724] px-3.5 py-1.5">
            <input
              type="text"
              value={channelName}
              onChange={(e) => onChannelNameChange(e.target.value)}
              placeholder="Channel Watermark •"
              className="w-full min-w-0 bg-transparent text-xs font-semibold text-[#F1F5F2] placeholder-[#78857C] focus:outline-none"
            />
            <select
              value={channelSizePercent}
              onChange={(e) => onChannelSizeChange(Number(e.target.value))}
              className="bg-transparent text-xs font-mono font-bold text-[#6DD58C] focus:outline-none ml-1 shrink-0"
            >
              <option value={25} className="bg-[#1A1E1B]">25%</option>
              <option value={35} className="bg-[#1A1E1B]">35%</option>
              <option value={45} className="bg-[#1A1E1B]">45%</option>
              <option value={55} className="bg-[#1A1E1B]">55%</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() => hookInputRef.current?.click()}
            className="m3-btn-filled-red px-3.5 py-2"
          >
            <span className="material-symbols-rounded text-[16px]">
              video_library
            </span>
            <span>Input Hook</span>
          </button>

          <button
            type="button"
            onClick={onRegenerateHook}
            className="m3-btn-tonal px-3.5 py-2"
          >
            <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
              autorenew
            </span>
            <span>Regenerate</span>
          </button>
        </div>

        {/* Channel Watermark Selection Card */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#36403A] bg-[#222724] p-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[18px]">
                branding_watermark
              </span>
            </span>
            <div>
              <span className="block text-xs font-bold text-[#F1F5F2]">
                Channel Watermark
              </span>
              <span className="block text-[11px] text-[#A6B3AA]">
                {channelWatermarkUrl
                  ? 'Logo active in top-right corner of video'
                  : 'Select channel logo from device storage (PNG, JPG)'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {channelWatermarkUrl ? (
              <>
                <div className="flex items-center gap-2 rounded-full border border-[#255436] bg-[#173823] px-3 py-1">
                  <img
                    src={channelWatermarkUrl}
                    alt="Watermark Preview"
                    className="h-5 w-5 object-contain rounded"
                  />
                  <span className="text-[11px] font-bold text-[#9CE6B0]">
                    Watermark Active
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => watermarkInputRef.current?.click()}
                  className="m3-btn-tonal px-3 py-1.5 text-xs font-semibold"
                >
                  <span className="material-symbols-rounded text-[15px]">
                    edit
                  </span>
                  <span>Change Watermark</span>
                </button>
                <button
                  type="button"
                  onClick={onRemoveChannelWatermark}
                  className="m3-btn-tonal-red px-2.5 py-1.5 text-xs font-semibold"
                  title="Remove Channel Watermark"
                >
                  <span className="material-symbols-rounded text-[15px]">
                    delete
                  </span>
                  <span>Remove</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => watermarkInputRef.current?.click()}
                className="m3-btn-filled px-4 py-2 text-xs font-bold"
              >
                <span className="material-symbols-rounded text-[17px]">
                  add_photo_alternate
                </span>
                <span>Channel Watermark</span>
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Shadow Effect Style, Shadow Effect Toggle, Frame Template Dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <select
            value={borderLightStyle}
            onChange={(e) =>
              onBorderLightStyleChange(e.target.value as BorderLightStyle)
            }
            className="min-h-[2.5rem] w-full rounded-full border border-[#36403A] bg-[#222724] px-3.5 py-2 text-xs font-semibold text-[#F1F5F2] focus:border-[#229A4B] focus:outline-none"
          >
            <option value="Cyber Spectrum" className="bg-[#1A1E1B]">
              Elevated Studio Shadow
            </option>
            <option value="Aurora Flow" className="bg-[#1A1E1B]">
              Cinematic Soft Shadow
            </option>
            <option value="Laser Matrix" className="bg-[#1A1E1B]">
              Deep Focus Shadow
            </option>
            <option value="Royal Gold" className="bg-[#1A1E1B]">
              Subtle Ambient Shadow
            </option>
          </select>

          <button
            type="button"
            onClick={onToggleBorderLight}
            className={`flex min-h-[2.5rem] w-full items-center justify-between gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
              borderLightEnabled
                ? 'border-[#255436] bg-[#173823] text-[#9CE6B0]'
                : 'border-[#36403A] bg-[#222724] text-[#A6B3AA] hover:bg-[#2B322E]'
            }`}
          >
            <span className="flex items-center gap-1.5 text-left leading-snug">
              <span
                className={`material-symbols-rounded text-[16px] ${
                  borderLightEnabled ? 'text-[#6DD58C]' : 'text-[#A6B3AA]'
                }`}
              >
                layers
              </span>
              <span>Shadow Effect</span>
            </span>
            <div
              className={`flex h-4.5 w-8 shrink-0 items-center rounded-full p-0.5 transition-colors ${
                borderLightEnabled
                  ? 'bg-[#1B873F] justify-end'
                  : 'bg-[#3A443E] justify-start'
              }`}
            >
              <span className="h-3.5 w-3.5 rounded-full bg-white shadow-sm" />
            </div>
          </button>

          <select
            value={hookTemplate}
            onChange={(e) =>
              onHookTemplateChange(e.target.value as HookFrameTemplate)
            }
            style={{
              fontFamily: "'Noto Sans Bengali', 'Hind Siliguri', sans-serif",
            }}
            className={`min-h-[2.6rem] w-full rounded-full border px-4 py-2 text-[13px] font-semibold leading-relaxed tracking-[0.015em] focus:outline-none transition-colors ${
              hookTemplate !== 'Studio Frame'
                ? 'border-[#255436] bg-[#173823] text-[#9CE6B0]'
                : 'border-[#36403A] bg-[#222724] text-[#F1F5F2]'
            }`}
          >
            <option value="Studio Frame" className="bg-[#1A1E1B] text-[#F1F5F2]">
              Studio Frame (No Text Overlay)
            </option>
            <option value="Flashback Intro" className="bg-[#1A1E1B] text-[#F1F5F2]">
              পূর্ববর্তী পর্বের সংক্ষিপ্ত ঝলক
            </option>
            <option value="IMAX Theater" className="bg-[#1A1E1B] text-[#F1F5F2]">
              নাটক রিভিউ | বিশেষ আকর্ষণ
            </option>
            <option value="Director Cut" className="bg-[#1A1E1B] text-[#F1F5F2]">
              আজকের পর্বের বিশেষ আয়োজন
            </option>
          </select>
        </div>

        {/* Professional Bengali Frame Overlay Selection Options */}
        <div className="rounded-2xl border border-[#2A312D] bg-[#151916] p-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A6B3AA]">
              Frame Text Overlay Selection
            </span>
            {hookTemplate !== 'Studio Frame' && (
              <button
                type="button"
                onClick={() => onHookTemplateChange('Studio Frame')}
                className="text-[11px] font-semibold text-[#A6B3AA] hover:text-[#F1F5F2] transition-colors cursor-pointer"
              >
                Clear Overlay
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-2">
            {(
              [
                {
                  id: 'Flashback Intro' as HookFrameTemplate,
                  tag: 'FLASHBACK INTRO',
                  label: 'পূর্ববর্তী পর্বের সংক্ষিপ্ত ঝলক',
                },
                {
                  id: 'IMAX Theater' as HookFrameTemplate,
                  tag: 'CINEMA SPOTLIGHT',
                  label: 'নাটক রিভিউ | বিশেষ আকর্ষণ',
                },
                {
                  id: 'Director Cut' as HookFrameTemplate,
                  tag: 'SPECIAL EPISODE',
                  label: 'আজকের পর্বের বিশেষ আয়োজন',
                },
              ] as const
            ).map((option) => {
              const isSelected = hookTemplate === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    onHookTemplateChange(
                      isSelected ? 'Studio Frame' : option.id
                    )
                  }
                  className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#229A4B] bg-[#173823]/90 shadow-sm'
                      : 'border-[#2A312D] bg-[#1A1E1B] hover:border-[#36403A] hover:bg-[#222724]'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span
                      className={`block text-[10px] font-bold uppercase tracking-[0.08em] ${
                        isSelected ? 'text-[#6DD58C]' : 'text-[#A6B3AA]'
                      }`}
                    >
                      {option.tag}
                    </span>
                    <span
                      style={{
                        fontFamily:
                          "'Noto Sans Bengali', 'Hind Siliguri', sans-serif",
                      }}
                      className={`mt-0.5 block text-[14px] sm:text-[15px] font-semibold leading-[1.6] tracking-[0.015em] break-words ${
                        isSelected ? 'text-[#F1F5F2]' : 'text-[#E2EAE4]'
                      }`}
                    >
                      {option.label}
                    </span>
                  </div>
                  <span
                    className={`material-symbols-rounded text-[18px] shrink-0 ${
                      isSelected ? 'text-[#6DD58C]' : 'text-[#A6B3AA]/50'
                    }`}
                  >
                    {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conditional Shadow Effect Status Badge when Shadow Effect is enabled */}
        {borderLightEnabled && (
          <div className="flex items-center justify-between rounded-full border border-[#255436] bg-[#173823]/80 px-4 py-1.5 text-xs text-[#9CE6B0]">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="material-symbols-rounded text-[15px] text-[#6DD58C]">
                layers
              </span>
              <span>Shadow Effect Active</span>
            </span>
            <span className="text-[11px] font-mono text-[#6DD58C]">
              {borderLightStyle}
            </span>
          </div>
        )}

        {/* Hook Duration M3 Segmented Button Grid (Responsive 2-Col Mobile / 3-Col Tablet+) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {HOOK_DURATIONS.map((item) => {
            const isSelected = hookDuration === item.value;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onHookDurationChange(item.value)}
                className={
                  isSelected
                    ? 'm3-btn-filled w-full py-2 px-3'
                    : 'm3-btn-outlined w-full py-2 px-3'
                }
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Conditional Live Hook Video Player Box (when Hook > 0s) */}
        {hookDuration > 0 && (
          <div
            className={`relative aspect-video w-full overflow-hidden rounded-2xl p-1 transition-all duration-300 ${
              borderLightEnabled
                ? 'shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_24px_rgba(27,135,63,0.25)] border border-[#255436] bg-[#173823]'
                : hookTemplate === 'IMAX Theater'
                ? 'bg-[#1B873F] p-1.5 shadow-md'
                : 'border border-[#36403A] bg-[#111412] shadow-md'
            }`}
          >
            <div className="relative h-full w-full overflow-hidden rounded-xl bg-[#111412]">
              {videoUrl ? (
                <video
                  ref={hookVideoRef}
                  src={videoUrl}
                  playsInline
                  crossOrigin="anonymous"
                  className="h-full w-full object-cover"
                  onTimeUpdate={(e) => {
                    const maxStart =
                      Number.isFinite(e.currentTarget.duration) &&
                      e.currentTarget.duration > 5
                        ? e.currentTarget.duration - 4
                        : 30;
                    const baseStart = hookStartSec % Math.max(1, maxStart);
                    const elapsed = Math.max(
                      0,
                      (e.currentTarget.currentTime - baseStart) / hookSpeed
                    );
                    setHookElapsedSec(elapsed);
                    if (elapsed >= hookAdjustedDuration) {
                      e.currentTarget.pause();
                      e.currentTarget.currentTime = baseStart;
                      setIsHookPlaying(false);
                      setHookElapsedSec(0);
                    }
                  }}
                  onPlay={() => setIsHookPlaying(true)}
                  onPause={() => setIsHookPlaying(false)}
                />
              ) : hookPreviewFrame ? (
                <img
                  src={hookPreviewFrame}
                  alt="Hook Scene Preview"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-[#A6B3AA]">
                  Select a video file to preview Hook scene
                </div>
              )}

              {/* Top Left Re-Scan Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerateHook();
                }}
                className="m3-btn-tonal absolute top-2.5 left-2.5 z-20 !min-h-0 py-1.5 px-3 shadow-md"
              >
                <span className="material-symbols-rounded text-[15px] text-[#6DD58C]">
                  autorenew
                </span>
                <span>Re-Scan</span>
              </button>

              {/* Top Right Speed + Live Badge */}
              <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
                {channelWatermarkUrl && (
                  <img
                    src={channelWatermarkUrl}
                    alt="Channel Watermark"
                    className="h-6 w-auto object-contain max-w-[80px] drop-shadow-md rounded"
                  />
                )}
                <span className="flex items-center gap-0.5 rounded-full bg-[#1B873F] px-2.5 py-0.5 text-[11px] font-mono font-bold text-white">
                  <span className="material-symbols-rounded text-[14px]">
                    bolt
                  </span>
                  <span>{hookSpeed.toFixed(1)}x</span>
                </span>
                <span className="rounded-full bg-[#D93025] px-2.5 py-0.5 text-[11px] font-bold text-white">
                  Live
                </span>
              </div>

              {/* Center Play Button */}
              <button
                type="button"
                onClick={togglePlayHookVideo}
                className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 hover:bg-black/35 transition-colors cursor-pointer"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1B873F] text-white shadow-xl">
                  <span className="material-symbols-rounded text-[26px]">
                    {isHookPlaying ? 'pause' : 'play_arrow'}
                  </span>
                </div>
              </button>

              {/* Hook Template Banner if selected */}
              {hookTemplate !== 'Studio Frame' && (
                <div
                  style={{
                    fontFamily:
                      "'Noto Sans Bengali', 'Hind Siliguri', sans-serif",
                  }}
                  className="pointer-events-none absolute inset-x-4 bottom-9 z-20 rounded-full border border-[#255436] bg-[#173823]/95 py-2 px-4 text-center text-[13px] sm:text-sm font-semibold leading-[1.55] tracking-[0.02em] text-[#F1F5F2] shadow-lg backdrop-blur-sm"
                >
                  {hookTemplate === 'Flashback Intro'
                    ? 'পূর্ববর্তী পর্বের সংক্ষিপ্ত ঝলক'
                    : hookTemplate === 'IMAX Theater'
                    ? 'নাটক রিভিউ | বিশেষ আকর্ষণ'
                    : 'আজকের পর্বের বিশেষ আয়োজন'}
                </div>
              )}

              {/* Subscribe Overlay Pill matching reference image */}
              <div className="pointer-events-none absolute bottom-3 inset-x-0 z-20 flex justify-center">
                <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-white/10 bg-[#0d0d12]/95 px-2.5 sm:px-3 py-1 shadow-2xl backdrop-blur-md">
                  <div className="flex h-5 w-7 sm:h-6 sm:w-8 items-center justify-center rounded-md bg-[#FF0000]">
                    <div className="h-0 w-0 border-y-[3.5px] border-y-transparent border-l-[6px] border-l-white ml-0.5" />
                  </div>
                  <div className="flex h-5 sm:h-6 items-center justify-center rounded-md bg-[#212121] border border-white/10 px-2 sm:px-2.5">
                    <span className="text-[10px] sm:text-[11px] font-extrabold tracking-wide text-white">
                      ✓ SUBSCRIBED
                    </span>
                  </div>
                  <span className="text-[12px] sm:text-[14px] leading-none text-[#FFC107]">🔔</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Conditional Sonic Spectrum Studio Preview (when FX Style === 'Sonic Spectrum') */}
        {fxStyle === 'Sonic Spectrum' && (
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#343D37] bg-[#222724] p-4 flex flex-col items-center justify-center">
            <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-4 border-[#1B873F] shadow-md overflow-hidden bg-[#151916]">
              {extraFrame.imageUrl || galleryFrames[0]?.dataUrl ? (
                <img
                  src={extraFrame.imageUrl || galleryFrames[0]?.dataUrl}
                  alt="Sonic Spectrum Avatar"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="material-symbols-rounded text-[34px] text-[#6DD58C]">
                  graphic_eq
                </span>
              )}
            </div>
            <p className="mt-2.5 text-xs font-bold text-[#9CE6B0] text-center">
              Sonic Spectrum Live Audio Visualizer
            </p>
            <div className="mt-2 h-1.5 w-3/4 rounded-full bg-[#323A35] overflow-hidden">
              <div className="h-full w-1/3 bg-[#D93025]" />
            </div>
          </div>
        )}
      </div>

      {/* SECTION 4: SPEED | VFX EFFECTS | FX ENGINE | TRANSITION (Responsive Grid with Zero Label Truncation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Speed Card */}
        <div className="m3-card p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider text-[#A6B3AA] flex items-center gap-1.5 uppercase">
              <span className="material-symbols-rounded text-[16px] text-[#F28B82]">
                speed
              </span>
              <span>Speed</span>
            </span>
            <span className="rounded-full bg-[#381816] border border-[#5C2623] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#F6AEA9] tabular-nums">
              {hookSpeed.toFixed(1)}x
            </span>
          </div>
          <select
            value={hookSpeed}
            onChange={(e) => onHookSpeedChange(Number(e.target.value))}
            className="w-full min-h-[2.4rem] rounded-full border border-[#36403A] bg-[#222724] px-3.5 py-1.5 text-xs font-bold text-[#F1F5F2] focus:border-[#229A4B] focus:outline-none"
          >
            {SPEED_OPTIONS.map((sp) => (
              <option key={sp} value={sp} className="bg-[#1A1E1B]">
                {sp.toFixed(1)}x Motion
              </option>
            ))}
          </select>
        </div>

        {/* VFX Effects Card */}
        <div className="m3-card p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider text-[#A6B3AA] flex items-center gap-1.5 uppercase">
              <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
                blur_on
              </span>
              <span>VFX Effects</span>
            </span>
            <span className="rounded-full bg-[#173823] border border-[#255436] px-2.5 py-0.5 text-[10px] font-bold text-[#9CE6B0]">
              {overlayEffect}
            </span>
          </div>
          <select
            value={overlayEffect}
            onChange={(e) =>
              onOverlayEffectChange(e.target.value as OverlayEffect)
            }
            className="w-full min-h-[2.4rem] rounded-full border border-[#36403A] bg-[#222724] px-3.5 py-1.5 text-xs font-bold text-[#F1F5F2] focus:border-[#229A4B] focus:outline-none"
          >
            {OVERLAY_OPTIONS.map((ov) => (
              <option key={ov.value} value={ov.value} className="bg-[#1A1E1B]">
                {ov.icon} {ov.label}
              </option>
            ))}
          </select>
        </div>

        {/* FX Engine Card */}
        <div className="m3-card p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider text-[#A6B3AA] flex items-center gap-1.5 uppercase">
              <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
                auto_fix_high
              </span>
              <span>FX Engine</span>
            </span>
            <span className="rounded-full bg-[#173823] border border-[#255436] px-2.5 py-0.5 text-[10px] font-bold text-[#9CE6B0]">
              {fxStyle}
            </span>
          </div>
          <select
            value={fxStyle}
            onChange={(e) => onFxStyleChange(e.target.value as FxStyleMode)}
            className="w-full min-h-[2.4rem] rounded-full border border-[#36403A] bg-[#222724] px-3.5 py-1.5 text-xs font-bold text-[#F1F5F2] focus:border-[#229A4B] focus:outline-none"
          >
            {FX_STYLE_OPTIONS.map((fx) => (
              <option key={fx.value} value={fx.value} className="bg-[#1A1E1B]">
                {fx.icon} {fx.label}
              </option>
            ))}
          </select>
        </div>

        {/* Scene Transition Card */}
        <div className="m3-card p-3.5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-bold tracking-wider text-[#A6B3AA] flex items-center gap-1.5 uppercase">
              <span className="material-symbols-rounded text-[16px] text-[#F28B82]">
                animation
              </span>
              <span>Transition</span>
            </span>
            <span className="rounded-full bg-[#381816] border border-[#5C2623] px-2.5 py-0.5 text-[10px] font-bold text-[#F6AEA9]">
              {transitionStyle}
            </span>
          </div>
          <select
            value={transitionStyle}
            onChange={(e) =>
              onTransitionStyleChange(e.target.value as TransitionStyle)
            }
            className="w-full min-h-[2.4rem] rounded-full border border-[#36403A] bg-[#222724] px-3.5 py-1.5 text-xs font-bold text-[#F1F5F2] focus:border-[#229A4B] focus:outline-none"
          >
            {TRANSITION_OPTIONS.map((tr) => (
              <option key={tr.value} value={tr.value} className="bg-[#1A1E1B]">
                {tr.icon} {tr.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* SECTION 5: VOICE SETTINGS (M3 Dark Surface Card) */}
      <div className="m3-card p-4 sm:p-5 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[18px]">
                spatial_audio_off
              </span>
            </span>
            <span className="text-xs font-bold tracking-wider text-[#F1F5F2] uppercase">
              Voice Settings
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="m3-btn-tonal py-1.5 px-3 text-xs"
            >
              <span
                className={`material-symbols-rounded text-[15px] text-[#6DD58C] ${
                  isTestingConnection ? 'animate-spin' : ''
                }`}
              >
                {isTestingConnection ? 'progress_activity' : 'network_check'}
              </span>
              <span>
                {isTestingConnection ? 'Testing...' : 'Test Connection'}
              </span>
            </button>

            <select
              value={voiceEngine}
              onChange={(e) => {
                const nextEngine = e.target.value as VoiceEngine;
                onVoiceEngineChange(nextEngine);
                if (nextEngine === 'Gemini Studio') {
                  onSelectVoice('Zephyr');
                } else if (nextEngine === 'TanishaaNeural IN') {
                  onSelectVoice('TanishaaNeural IN');
                } else {
                  onSelectVoice('PradeepNeural BD');
                }
              }}
              className="min-h-[2.4rem] rounded-full border border-[#255436] bg-[#173823] px-3.5 py-1.5 text-xs font-bold text-[#9CE6B0] focus:outline-none"
            >
              <option value="Gemini Studio" className="bg-[#1A1E1B] text-[#F1F5F2]">
                Gemini Studio
              </option>
              <option value="TanishaaNeural IN" className="bg-[#1A1E1B] text-[#F1F5F2]">
                TanishaaNeural IN
              </option>
              <option value="Browser Voice" className="bg-[#1A1E1B] text-[#F1F5F2]">
                Browser Voice
              </option>
            </select>
          </div>
        </div>

        {connectionStatus && (
          <div
            className={`flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-medium ${
              connectionStatus.ok
                ? 'border-[#255436] bg-[#173823] text-[#9CE6B0]'
                : 'border-[#5C2623] bg-[#381816] text-[#F6AEA9]'
            }`}
          >
            <span className="material-symbols-rounded text-[16px]">
              {connectionStatus.ok ? 'verified' : 'error'}
            </span>
            <span>{connectionStatus.message}</span>
          </div>
        )}

        {/* Voice Character Selection Native Android M3 Button Grid (Responsive 2-Col Mobile / 3-Col sm+) */}
        <div
          className={`grid gap-2 ${
            voiceEngine === 'Gemini Studio'
              ? 'grid-cols-2 sm:grid-cols-3'
              : 'grid-cols-1 sm:grid-cols-2'
          }`}
        >
          {activeVoiceList.map((voice) => {
            const isSelected = selectedVoice === voice;
            const isPreviewing = previewingVoiceName === voice;
            const displayName = getVoiceDisplayName(voice);
            const isKaro = voice === 'Kore' || voice === 'Karo';

            if (isKaro) {
              return (
                <button
                  key={voice}
                  type="button"
                  onClick={() => onSelectVoice(voice)}
                  className={`relative flex w-full items-center justify-center gap-1.5 rounded-full border py-2.5 px-3.5 text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#FFD700] bg-gradient-to-r from-[#3E3100] to-[#1C3B23] text-[#FFE875] ring-1 ring-[#FFD700]/50 shadow-[0_0_15px_rgba(255,215,0,0.3)]'
                      : 'border-[#B8860B]/70 bg-[#251E08]/70 text-[#FFDF6D] hover:border-[#FFD700] hover:bg-[#332A0C] shadow-sm'
                  }`}
                >
                  {isPreviewing ? (
                    <span className="material-symbols-rounded text-[16px] text-[#FFD700] animate-pulse">
                      graphic_eq
                    </span>
                  ) : isSelected ? (
                    <span className="material-symbols-rounded text-[16px] text-[#FFD700]">
                      check
                    </span>
                  ) : null}
                  <span className="font-bold tracking-wide">{displayName}</span>
                </button>
              );
            }

            return (
              <button
                key={voice}
                type="button"
                onClick={() => onSelectVoice(voice)}
                className={
                  isSelected
                    ? 'm3-btn-filled w-full py-2.5 px-3.5'
                    : 'm3-btn-outlined w-full py-2.5 px-3.5'
                }
              >
                {isPreviewing ? (
                  <span className="material-symbols-rounded text-[16px] text-white animate-pulse">
                    graphic_eq
                  </span>
                ) : isSelected ? (
                  <span className="material-symbols-rounded text-[16px] text-white">
                    check
                  </span>
                ) : null}
                <span>{displayName}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* OUTPUT DETAILS – FINAL VIDEO FRAME (EXPORT SETTINGS) */}
      <div className="rounded-2xl border border-[#255436] bg-[#173823] p-3.5 text-xs leading-relaxed text-[#9CE6B0]">
        <div className="font-bold text-[#6DD58C] flex items-center gap-1.5 mb-1">
          <span className="material-symbols-rounded text-[16px]">bolt</span>
          <span>Output Details</span>
        </div>
        <p className="text-[#F1F5F2]/90">
          The provided image will be added as a separate final frame immediately after the main voiceover and generated video. It will be included in the final exported MP4 file at Full HD resolution (1920 × 1080).
        </p>
      </div>

      {/* BOTTOM ACTION BAR: NATIVE ANDROID M3 QUALITY SELECTOR + DEEP GREEN PRIMARY VIDEO EXPORT */}
      <div className="relative flex flex-wrap sm:flex-nowrap items-stretch gap-2.5 pt-0.5">
        {/* M3 Dark Bottom-Sheet Style Quality Popup Menu */}
        {showQualityMenu && (
          <div className="absolute bottom-16 left-0 z-40 w-full sm:w-80 rounded-3xl border border-[#343D37] bg-[#1E2420] p-3 shadow-2xl space-y-1.5">
            <div className="px-3 py-1 text-[11px] font-bold tracking-wider text-[#A6B3AA] uppercase">
              Select MP4 Export Quality
            </div>
            {[
              {
                id: '480p' as const,
                badge: 'SD',
                title: '480p MP4',
                sub: '854×480 • 2.5 Mbps Fast Render',
              },
              {
                id: '720p' as const,
                badge: 'HD',
                title: '720p MP4',
                sub: '1280×720 • 4.5 Mbps Balanced HD',
              },
              {
                id: '1080p' as const,
                badge: 'FHD',
                title: '1080p HD MP4',
                sub: '1920×1080 • 8.0 Mbps Studio Quality',
              },
            ].map((q) => {
              const active = exportQuality === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => {
                    onExportQualityChange(q.id);
                    setShowQualityMenu(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2.5 text-left transition-colors cursor-pointer ${
                    active
                      ? 'border border-[#255436] bg-[#173823]'
                      : 'hover:bg-[#262C28]'
                  }`}
                >
                  <span
                    className={`flex h-9 w-11 shrink-0 items-center justify-center rounded-xl text-xs font-extrabold ${
                      active
                        ? 'bg-[#1B873F] text-white'
                        : 'bg-[#282F2B] text-[#A6B3AA]'
                    }`}
                  >
                    {q.badge}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-xs font-bold text-[#F1F5F2]">
                        {q.title}
                      </span>
                      {q.id === '1080p' && (
                        <span className="rounded-md bg-[#D93025] px-1.5 py-0.5 text-[9px] font-extrabold text-white">
                          HIGH
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[#A6B3AA] mt-0.5">{q.sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Quality Selector Native Android M3 Outlined Button */}
        <button
          type="button"
          onClick={() => setShowQualityMenu(!showQualityMenu)}
          className="m3-btn-outlined py-2.5 px-4 shrink-0"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1B873F] text-white">
            <span className="material-symbols-rounded text-[14px]">
              high_quality
            </span>
          </span>
          <div className="text-left leading-tight">
            <p className="text-[9px] font-bold tracking-wider text-[#6DD58C] uppercase">
              {exportQuality === '1080p'
                ? 'MP4 FHD'
                : exportQuality === '720p'
                ? 'MP4 HD'
                : 'MP4 SD'}
            </p>
            <p className="text-xs font-bold text-[#F1F5F2]">
              {exportQuality === '1080p' ? '1080p HD' : exportQuality}
            </p>
          </div>
          <span className="material-symbols-rounded text-[17px] text-[#A6B3AA] ml-0.5">
            expand_less
          </span>
        </button>

        {/* Main Video Export Native Android M3 Filled Deep Green Button */}
        <button
          type="button"
          onClick={onStartExport}
          className="m3-btn-filled flex-1 min-w-[180px] py-3 px-5 text-sm"
        >
          <span className="material-symbols-rounded text-[20px]">
            movie_edit
          </span>
          <span>Video Export (.MP4)</span>
        </button>
      </div>
    </div>
  );
};
