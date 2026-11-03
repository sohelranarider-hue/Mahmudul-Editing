import React, { useRef, useState } from 'react';
import { ColorGrading } from '../types';
import {
  formatTimePrecise,
  getCssFilterString,
} from '../utils/frameEngine';

interface CropTabProps {
  videoUrl: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  videoDuration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onSeek: (time: number) => void;
  onTimeUpdateOnly: (time: number) => void;
  onDurationLoaded: (duration: number) => void;
  onTrimChange: (start: number, end: number) => void;
  colorGrading: ColorGrading;
  onColorChange: (updated: ColorGrading) => void;
  onResetColor: () => void;
  zoomPercent: number;
  onZoomChange: (zoom: number) => void;
  captureIntervalSec: number;
  onCaptureIntervalChange: (sec: number) => void;
  isAutoCapturing: boolean;
  autoCaptureProgress: number;
  onToggleAutoCapture: () => void;
  onCaptureSingleFrame: () => void;
  onOpenVideoSelector: () => void;
  channelWatermarkUrl?: string | null;
}

const INTERVAL_PRESETS = [
  { label: '1s', value: 1 },
  { label: '2s', value: 2 },
  { label: '3s', value: 3 },
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
  { label: '1m', value: 60 },
];

export const CropTab: React.FC<CropTabProps> = ({
  videoUrl,
  videoRef,
  videoDuration,
  currentTime,
  trimStart,
  trimEnd,
  onSeek,
  onTimeUpdateOnly,
  onDurationLoaded,
  onTrimChange,
  colorGrading,
  onColorChange,
  onResetColor,
  zoomPercent,
  onZoomChange,
  captureIntervalSec,
  onCaptureIntervalChange,
  isAutoCapturing,
  autoCaptureProgress,
  onToggleAutoCapture,
  onCaptureSingleFrame,
  onOpenVideoSelector,
  channelWatermarkUrl,
}) => {
  const [showColorPanel, setShowColorPanel] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragMode, setDragMode] = useState<'none' | 'start' | 'end' | 'playhead'>('none');

  const isCustomColor =
    colorGrading.brightness !== 100 ||
    colorGrading.contrast !== 100 ||
    colorGrading.saturation !== 100 ||
    colorGrading.warmth !== 0 ||
    colorGrading.vignette !== 0 ||
    colorGrading.hueTint !== 0;

  const effectiveDuration = Math.max(videoDuration, 0);

  const togglePlay = () => {
    const vid = videoRef.current;
    if (!vid || !videoUrl) {
      onOpenVideoSelector();
      return;
    }
    if (vid.paused) {
      if (vid.currentTime < trimStart || (trimEnd > 0 && vid.currentTime >= trimEnd)) {
        vid.currentTime = trimStart;
      }
      vid.play().catch(() => {});
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const getTimeFromClientX = (clientX: number): number => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || effectiveDuration <= 0) return 0;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return ratio * effectiveDuration;
  };

  const handlePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    mode: 'start' | 'end' | 'playhead'
  ) => {
    if (effectiveDuration <= 0) return;
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragMode(mode);
    if (mode === 'playhead') {
      const t = getTimeFromClientX(e.clientX);
      const clamped = Math.max(trimStart, Math.min(trimEnd || effectiveDuration, t));
      onSeek(clamped);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode === 'none' || effectiveDuration <= 0) return;
    const t = getTimeFromClientX(e.clientX);
    const minGap = Math.max(0.5, effectiveDuration * 0.01);

    if (dragMode === 'start') {
      const nextStart = Math.max(0, Math.min(t, trimEnd - minGap));
      onTrimChange(nextStart, trimEnd);
      onSeek(nextStart);
    } else if (dragMode === 'end') {
      const nextEnd = Math.min(effectiveDuration, Math.max(t, trimStart + minGap));
      onTrimChange(trimStart, nextEnd);
      onSeek(nextEnd);
    } else if (dragMode === 'playhead') {
      const clamped = Math.max(trimStart, Math.min(trimEnd, t));
      onSeek(clamped);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragMode !== 'none') {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      setDragMode('none');
    }
  };

  const startPct =
    effectiveDuration > 0
      ? Math.max(0, Math.min(100, (trimStart / effectiveDuration) * 100))
      : 0;
  const endPct =
    effectiveDuration > 0
      ? Math.max(0, Math.min(100, (trimEnd / effectiveDuration) * 100))
      : 100;

  return (
    <div className="space-y-3.5">
      {/* 16:9 M3 Expressive Dark Charcoal Video Viewport Card */}
      <div className="m3-card p-3 sm:p-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-[#151916] border border-[#343D37]">
          {/* Deep Green Corner Crop Guides */}
          <div className="pointer-events-none absolute top-3 left-3 z-20 h-5 w-5 border-t-2 border-l-2 border-[#229A4B] rounded-tl-md" />
          <div className="pointer-events-none absolute top-3 right-3 z-20 h-5 w-5 border-t-2 border-r-2 border-[#229A4B] rounded-tr-md" />
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 h-5 w-5 border-b-2 border-l-2 border-[#229A4B] rounded-bl-md" />
          <div className="pointer-events-none absolute bottom-3 right-3 z-20 h-5 w-5 border-b-2 border-r-2 border-[#229A4B] rounded-br-md" />

          {/* Top Left M3 Resolution Chip */}
          <div className="absolute top-3 left-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-[#1A1E1B]/95 border border-[#343D37] px-3 py-1 text-xs font-mono font-bold text-[#F1F5F2] shadow-sm tabular-nums">
            <span className="material-symbols-rounded text-[15px] text-[#6DD58C]">
              aspect_ratio
            </span>
            <span>1920 × 1080</span>
          </div>

          {/* Top Right Manual Frame Capture Native M3 Tonal Icon Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCaptureSingleFrame();
            }}
            title="Capture current 16:9 frame to Gallery"
            className="m3-btn-tonal absolute top-3 right-3 z-20 !min-h-0 h-9 w-9 !p-0 rounded-full shadow-md"
          >
            <span className="material-symbols-rounded text-[19px]">
              add_a_photo
            </span>
          </button>

          {/* Video Stream or Dark Studio Placeholder */}
          {videoUrl ? (
            <div className="relative h-full w-full overflow-hidden flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                src={videoUrl}
                className="h-full w-full object-cover"
                style={{
                  transform: `scale(${zoomPercent / 100})`,
                  filter: getCssFilterString(colorGrading),
                }}
                onLoadedMetadata={(e) => {
                  const d = e.currentTarget.duration;
                  if (Number.isFinite(d) && d > 0) {
                    onDurationLoaded(d);
                  }
                }}
                onTimeUpdate={(e) => {
                  const t = e.currentTarget.currentTime;
                  onTimeUpdateOnly(t);
                  if (trimEnd > 0 && t >= trimEnd) {
                    e.currentTarget.pause();
                    e.currentTarget.currentTime = trimStart;
                    setIsPlaying(false);
                  }
                }}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                playsInline
                crossOrigin="anonymous"
              />
              {colorGrading.warmth !== 0 && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundColor:
                      colorGrading.warmth > 0
                        ? `rgba(255, 145, 0, ${(colorGrading.warmth / 100) * 0.18})`
                        : `rgba(0, 140, 255, ${(Math.abs(colorGrading.warmth) / 100) * 0.18})`,
                  }}
                />
              )}
              {colorGrading.vignette > 0 && (
                <div
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background: `radial-gradient(circle, transparent 35%, rgba(0,0,0,${
                      (colorGrading.vignette / 100) * 0.85
                    }) 100%)`,
                  }}
                />
              )}
              {channelWatermarkUrl && (
                <div className="pointer-events-none absolute top-3 right-14 z-30 max-w-[25%] max-h-[22%] drop-shadow-md">
                  <img
                    src={channelWatermarkUrl}
                    alt="Channel Watermark"
                    className="h-full w-full object-contain max-h-10 sm:max-h-12"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="relative h-full w-full flex flex-col items-center justify-center bg-[#151916] text-center p-4">
              <p className="text-xs font-semibold text-[#A6B3AA] mt-16">
                Tap play to select a video from your device
              </p>
            </div>
          )}

          {/* Center M3 Deep Green Play / Pause Button Overlay */}
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/15 hover:bg-black/25 transition-colors group cursor-pointer"
          >
            <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-[#1B873F] text-white shadow-lg group-hover:bg-[#229A4B] group-active:scale-95 transition-all">
              <span className="material-symbols-rounded text-[28px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Interactive M3 Expressive Timeline & Dual-Handle Trimmer */}
      <div className="m3-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#381816] border border-[#5C2623] text-[#F28B82]">
              <span className="material-symbols-rounded text-[16px]">
                content_cut
              </span>
            </span>
            <span className="text-xs font-bold tracking-wider text-[#F1F5F2] uppercase">
              Timeline Trimmer
            </span>
          </div>
          <div className="rounded-full bg-[#222724] border border-[#36403A] px-3 py-1 text-xs font-mono font-bold text-[#F1F5F2] tabular-nums">
            {formatTimePrecise(currentTime)} / {formatTimePrecise(effectiveDuration)}
          </div>
        </div>

        {/* Directly Draggable M3 Dark Trim Bar */}
        <div
          ref={trackRef}
          onPointerDown={(e) => handlePointerDown(e, 'playhead')}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative flex h-11 w-full cursor-pointer items-center rounded-2xl border border-[#36403A] bg-[#222724] select-none touch-none overflow-hidden"
        >
          {/* Left Trimmed-Out Red Region */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 left-0 bg-[#381816]/85"
            style={{ width: `${startPct}%` }}
          />

          {/* Right Trimmed-Out Red Region */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 right-0 bg-[#381816]/85"
            style={{ width: `${100 - endPct}%` }}
          />

          {/* Active Selected Middle Deep Green Region */}
          <div
            className="pointer-events-none absolute top-0 bottom-0 bg-[#173823]"
            style={{
              left: `${startPct}%`,
              width: `${Math.max(0, endPct - startPct)}%`,
            }}
          />

          {/* Left Green M3 Pill Drag Handle */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'start')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ left: `calc(${startPct}% - 4px)` }}
            className="absolute top-0 bottom-0 z-30 flex w-4 cursor-ew-resize items-center justify-center rounded-full bg-[#1B873F] shadow-md hover:bg-[#229A4B] transition-colors"
            title="Drag to trim start"
          >
            <div className="h-4.5 w-1 rounded-full bg-white" />
          </div>

          {/* Right Red M3 Pill Drag Handle */}
          <div
            onPointerDown={(e) => handlePointerDown(e, 'end')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            style={{ left: `calc(${endPct}% - 12px)` }}
            className="absolute top-0 bottom-0 z-30 flex w-4 cursor-ew-resize items-center justify-center rounded-full bg-[#D93025] shadow-md hover:bg-[#E33E33] transition-colors"
            title="Drag to trim end"
          >
            <div className="h-4.5 w-1 rounded-full bg-white" />
          </div>

          {/* Readouts Overlay Inside Bar */}
          <div className="pointer-events-none relative z-20 flex w-full items-center justify-between px-3 sm:px-4 text-[11px] sm:text-xs font-mono font-bold tabular-nums">
            <span className="text-[#9CE6B0]">
              {formatTimePrecise(trimStart)}
            </span>
            <span className="rounded-full border border-[#36403A] bg-[#1A1E1B] px-2.5 py-0.5 text-[#F1F5F2] shadow-sm">
              {formatTimePrecise(currentTime)}
            </span>
            <span className="text-[#F6AEA9]">
              {formatTimePrecise(trimEnd)}
            </span>
          </div>
        </div>
      </div>

      {/* Adjust Color M3 Card */}
      <div className="m3-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setShowColorPanel(!showColorPanel)}
            className="m3-btn-tonal px-3.5 py-2"
          >
            <span className="material-symbols-rounded text-[17px] text-[#6DD58C]">
              tune
            </span>
            <span>Adjust Color</span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-[2.2rem] items-center rounded-full border border-[#36403A] bg-[#222724] px-3 py-1 text-xs font-semibold text-[#A6B3AA]">
              {isCustomColor ? 'Custom Colour' : 'Original Colour'}
            </span>
            {showColorPanel && (
              <button
                type="button"
                onClick={onResetColor}
                className="m3-btn-tonal-red px-3 py-1.5"
              >
                <span className="material-symbols-rounded text-[15px]">
                  restart_alt
                </span>
                <span>Reset All</span>
              </button>
            )}
          </div>
        </div>

        {showColorPanel && (
          <div className="mt-4 space-y-3 border-t border-[#2A312D] pt-3.5">
            {[
              {
                key: 'brightness' as const,
                icon: 'light_mode',
                label: 'Brightness',
                min: 40,
                max: 180,
                defaultVal: 100,
                unit: '%',
              },
              {
                key: 'contrast' as const,
                icon: 'contrast',
                label: 'Contrast',
                min: 40,
                max: 180,
                defaultVal: 100,
                unit: '%',
              },
              {
                key: 'saturation' as const,
                icon: 'water_drop',
                label: 'Saturation',
                min: 0,
                max: 200,
                defaultVal: 100,
                unit: '%',
              },
              {
                key: 'warmth' as const,
                icon: 'thermostat',
                label: 'Warmth',
                min: -100,
                max: 100,
                defaultVal: 0,
                unit: '',
              },
              {
                key: 'vignette' as const,
                icon: 'vignette',
                label: 'Vignette',
                min: 0,
                max: 100,
                defaultVal: 0,
                unit: '%',
              },
              {
                key: 'hueTint' as const,
                icon: 'palette',
                label: 'Hue Tint',
                min: -180,
                max: 180,
                defaultVal: 0,
                unit: '°',
              },
            ].map((item) => (
              <div key={item.key} className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3">
                <span className="w-26 shrink-0 flex items-center gap-1.5 text-xs font-semibold text-[#A6B3AA]">
                  <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </span>
                <input
                  type="range"
                  min={item.min}
                  max={item.max}
                  value={colorGrading[item.key]}
                  onChange={(e) =>
                    onColorChange({
                      ...colorGrading,
                      [item.key]: Number(e.target.value),
                    })
                  }
                  className="studio-slider cyan-slider flex-1 min-w-[110px]"
                />
                <span className="min-w-[3.25rem] shrink-0 rounded-full bg-[#173823] border border-[#255436] px-2 py-0.5 text-center text-xs font-mono font-bold text-[#9CE6B0] tabular-nums">
                  {colorGrading[item.key]}
                  {item.unit}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onColorChange({
                      ...colorGrading,
                      [item.key]: item.defaultVal,
                    })
                  }
                  className="m3-btn-text !min-h-0 h-7 w-7 !p-0 rounded-full hover:!text-[#F28B82]"
                  title="Reset parameter"
                >
                  <span className="material-symbols-rounded text-[16px]">
                    restart_alt
                  </span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Zoom Control M3 Card */}
      <div className="m3-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span className="text-xs font-bold tracking-wider text-[#F1F5F2] uppercase flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[16px]">
                zoom_in
              </span>
            </span>
            <span>Camera Zoom</span>
          </span>
          <button
            type="button"
            onClick={() => onZoomChange(100)}
            className="m3-btn-tonal-red px-3 py-1.5"
          >
            <span className="material-symbols-rounded text-[15px]">
              restart_alt
            </span>
            <span>Reset</span>
          </button>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={() => onZoomChange(Math.max(100, zoomPercent - 5))}
            className="m3-btn-outlined !min-h-0 h-8 w-8 !p-0 shrink-0 rounded-full"
          >
            <span className="material-symbols-rounded text-[18px]">remove</span>
          </button>
          <span className="text-xs font-mono text-[#A6B3AA] shrink-0">
            100%
          </span>
          <input
            type="range"
            min={100}
            max={200}
            value={zoomPercent}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            className="studio-slider flex-1 min-w-[90px]"
          />
          <span className="text-xs font-mono text-[#A6B3AA] shrink-0">
            200%
          </span>
          <button
            type="button"
            onClick={() => onZoomChange(Math.min(200, zoomPercent + 5))}
            className="m3-btn-outlined !min-h-0 h-8 w-8 !p-0 shrink-0 rounded-full"
          >
            <span className="material-symbols-rounded text-[18px]">add</span>
          </button>
          <span className="min-w-[3.75rem] shrink-0 rounded-full border border-[#255436] bg-[#173823] px-2.5 py-1 text-center text-xs font-mono font-bold text-[#9CE6B0] tabular-nums">
            {zoomPercent}%
          </span>
        </div>
      </div>

      {/* Auto Interval Capture M3 Card */}
      <div className="m3-card p-4 sm:p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold tracking-wider text-[#F1F5F2] uppercase flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[16px]">
                burst_mode
              </span>
            </span>
            <span>Auto Interval Capture</span>
          </span>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              onCaptureIntervalChange(Math.max(1, captureIntervalSec - 1))
            }
            className="m3-btn-outlined !min-h-0 h-8 w-8 !p-0 shrink-0 rounded-full"
          >
            <span className="material-symbols-rounded text-[18px]">remove</span>
          </button>
          <span className="text-xs font-mono text-[#A6B3AA] shrink-0">
            1s
          </span>
          <input
            type="range"
            min={1}
            max={60}
            value={captureIntervalSec}
            onChange={(e) => onCaptureIntervalChange(Number(e.target.value))}
            className="studio-slider flex-1 min-w-[90px]"
          />
          <span className="text-xs font-mono text-[#A6B3AA] shrink-0">
            1m
          </span>
          <button
            type="button"
            onClick={() =>
              onCaptureIntervalChange(Math.min(60, captureIntervalSec + 1))
            }
            className="m3-btn-outlined !min-h-0 h-8 w-8 !p-0 shrink-0 rounded-full"
          >
            <span className="material-symbols-rounded text-[18px]">add</span>
          </button>
          <span className="min-w-[3.25rem] shrink-0 rounded-full border border-[#255436] bg-[#173823] px-2.5 py-1 text-center text-xs font-mono font-bold text-[#9CE6B0] tabular-nums">
            {captureIntervalSec === 60 ? '1m' : `${captureIntervalSec}s`}
          </span>
        </div>

        {/* Interval Preset Native Android M3 Buttons (4-Col on Mobile / 8-Col on sm+) */}
        <div className="mt-3 grid grid-cols-4 sm:grid-cols-8 gap-1.5">
          {INTERVAL_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => onCaptureIntervalChange(preset.value)}
              className={
                captureIntervalSec === preset.value
                  ? 'm3-btn-filled w-full py-1.5 px-2 tabular-nums'
                  : 'm3-btn-outlined w-full py-1.5 px-2 tabular-nums'
              }
            >
              <span>{preset.label}</span>
            </button>
          ))}
        </div>

        {/* Start / Stop Auto Capture Native Android M3 Filled Green / Red Button */}
        <button
          type="button"
          onClick={onToggleAutoCapture}
          className={`mt-3.5 w-full py-3 px-4 text-sm ${
            isAutoCapturing ? 'm3-btn-filled-red' : 'm3-btn-filled'
          }`}
        >
          {isAutoCapturing ? (
            <>
              <span className="material-symbols-rounded text-[20px]">
                stop_circle
              </span>
              <span>Stop Capture ({autoCaptureProgress}%)</span>
            </>
          ) : (
            <>
              <span className="material-symbols-rounded text-[20px]">
                photo_camera
              </span>
              <span>Start 16:9 Auto Capture</span>
            </>
          )}
        </button>

        {isAutoCapturing && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-full border border-[#255436] bg-[#173823] px-3 py-2 text-xs font-semibold text-[#9CE6B0] text-center">
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#D93025] animate-ping" />
            <span>
              Capturing 16:9 screenshots every {captureIntervalSec} seconds
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
