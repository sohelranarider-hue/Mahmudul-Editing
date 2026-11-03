import React, { useRef } from 'react';
import { CapturedFrame, ExtraFrameSettings } from '../types';

interface ExtraFrameModalProps {
  isOpen: boolean;
  onClose: () => void;
  extraFrame: ExtraFrameSettings;
  onChange: (updated: ExtraFrameSettings) => void;
  galleryFrames: CapturedFrame[];
  onShowToast: (msg: string) => void;
}

const DURATION_PRESETS = [1, 2, 3, 5, 10, 15, 20, 30, 45, 60];

export const ExtraFrameModal: React.FC<ExtraFrameModalProps> = ({
  isOpen,
  onClose,
  extraFrame,
  onChange,
  galleryFrames,
  onShowToast,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const currentImage =
    extraFrame.imageUrl ||
    galleryFrames.find((f) => f.id === extraFrame.frameId)?.dataUrl ||
    galleryFrames[0]?.dataUrl ||
    null;

  const pct = Math.max(2, Math.round((extraFrame.durationMinutes / 60) * 100));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange({
          ...extraFrame,
          enabled: true,
          frameId: null,
          imageUrl: reader.result,
          sceneLabel: `Uploaded Frame (${file.name.slice(0, 14)})`,
        });
        onShowToast('Frame selected from device');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectGalleryFrame = (frame: CapturedFrame) => {
    onChange({
      ...extraFrame,
      enabled: true,
      frameId: frame.id,
      imageUrl: frame.dataUrl,
      sceneLabel:
        frame.replacedCount > 0
          ? `(Replaced #${frame.index}) Scene @ ${frame.formattedTime}`
          : `Scene @ ${frame.formattedTime}`,
    });
  };

  const handleRemove = () => {
    onChange({
      ...extraFrame,
      enabled: false,
      frameId: null,
      imageUrl: null,
      sceneLabel: 'কোনো ফ্রেম নির্বাচন করা হয়নি',
    });
    onShowToast('Frame removed');
  };

  const handleSaveAndDone = () => {
    if (currentImage && !extraFrame.enabled) {
      onChange({
        ...extraFrame,
        enabled: true,
        imageUrl: currentImage,
      });
    }
    if (extraFrame.enabled || currentImage) {
      onShowToast('Frame selected from gallery');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="my-auto w-full max-w-md rounded-3xl border border-[#343D37] bg-[#1A1E1B] p-4 sm:p-5 text-[#F1F5F2] shadow-2xl">
        {/* M3 Dark Dialog Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#2A312D] pb-3.5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[22px]">
                burst_mode
              </span>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#F1F5F2] leading-snug">
                Ending Clips (Frame at the end of the video)
              </h3>
              <p className="text-xs text-[#A6B3AA] mt-0.5 leading-relaxed">
                This will be displayed as a separate scene after the voiceover and main video end.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="m3-btn-text !min-h-0 h-8 w-8 !p-0 shrink-0 rounded-full"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        {/* Step 1: Select Picture */}
        <div className="mt-4 rounded-2xl border border-[#343D37] bg-[#222724] p-3.5">
          <p className="text-xs font-bold text-[#9CE6B0] mb-2.5">
            ১. Select Frame Picture:
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="m3-btn-filled w-full sm:flex-1 px-3.5 py-2"
            >
              <span className="material-symbols-rounded text-[17px]">
                upload_file
              </span>
              <span>Upload from Device / Gallery</span>
            </button>
            <button
              type="button"
              onClick={handleRemove}
              className="m3-btn-tonal-red w-full sm:w-auto px-3.5 py-2"
            >
              <span className="material-symbols-rounded text-[16px]">
                delete
              </span>
              <span>Remove</span>
            </button>
          </div>

          {/* Selected Frame Preview Box */}
          {currentImage && (
            <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#343D37] bg-[#1A1E1B] p-2.5">
              <img
                src={currentImage}
                alt="Extra Frame Preview"
                referrerPolicy="no-referrer"
                className="h-12 w-20 rounded-lg object-cover border border-[#229A4B]/50 shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#F1F5F2] break-words leading-snug">
                  {extraFrame.sceneLabel || 'Selected Scene'}
                </p>
                <p className="text-[11px] text-[#6DD58C] font-semibold mt-0.5">
                  Duration: {extraFrame.durationMinutes} Minute(s) ({extraFrame.durationMinutes * 60}s)
                </p>
              </div>
            </div>
          )}

          {/* Gallery Thumbnails Strip */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-1 text-[11px] text-[#A6B3AA] mb-1.5">
            <span>Or select a frame from your gallery:</span>
            <span className="text-[#9CE6B0] font-mono font-bold tabular-nums">
              {galleryFrames.length} available
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {galleryFrames.map((frame) => {
              const isSelected =
                extraFrame.frameId === frame.id ||
                (!extraFrame.frameId && extraFrame.imageUrl === frame.dataUrl);
              return (
                <button
                  key={frame.id}
                  type="button"
                  onClick={() => handleSelectGalleryFrame(frame)}
                  className={`relative h-12 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#229A4B] scale-[1.03]'
                      : 'border-[#343D37] opacity-75 hover:opacity-100'
                  }`}
                >
                  <img
                    src={frame.dataUrl}
                    alt={`Scene ${frame.index}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Duration Selection */}
        <div className="mt-3 rounded-2xl border border-[#343D37] bg-[#222724] p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#9CE6B0]">
              ২. How many minutes should the frame be added at the end of the video:
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#6DD58C] tabular-nums">
                {extraFrame.durationMinutes} Minute(s)
              </span>
              <span className="rounded-full bg-[#381816] border border-[#5C2623] px-2 py-0.5 text-[10px] font-bold text-[#F6AEA9] tabular-nums">
                {pct}%
              </span>
            </div>
          </div>

          <input
            type="range"
            min={1}
            max={60}
            value={extraFrame.durationMinutes}
            onChange={(e) =>
              onChange({
                ...extraFrame,
                enabled: true,
                imageUrl: currentImage,
                durationMinutes: Number(e.target.value),
              })
            }
            className="studio-slider w-full mt-3"
          />

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10px] text-[#A6B3AA] font-mono">
            <span>1 মিনিট (1m)</span>
            <span>15 মিনিট (25%)</span>
            <span>30 মিনিট (50%)</span>
            <span>60 মিনিট (100%)</span>
          </div>

          {/* Preset Native M3 Buttons (5-Col Grid on Mobile) */}
          <div className="mt-2.5 grid grid-cols-5 gap-1.5">
            {DURATION_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() =>
                  onChange({
                    ...extraFrame,
                    enabled: true,
                    imageUrl: currentImage,
                    durationMinutes: m,
                  })
                }
                className={
                  extraFrame.durationMinutes === m
                    ? 'm3-btn-filled !min-h-0 py-1.5 px-2 tabular-nums'
                    : 'm3-btn-outlined !min-h-0 py-1.5 px-2 tabular-nums'
                }
              >
                <span>{m}m</span>
              </button>
            ))}
          </div>
        </div>

        {/* Output Details Box */}
        <div className="mt-3 rounded-2xl border border-[#255436] bg-[#173823] p-3 text-[11px] leading-relaxed text-[#9CE6B0]">
          <span className="font-bold text-[#6DD58C] inline-flex items-center gap-1 mr-1.5">
            <span className="material-symbols-rounded text-[15px]">bolt</span>
            <span>Output Details:</span>
          </span>
          The provided image will be added as a separate final frame immediately after the main voiceover and generated video. It will be included in the final exported MP4 file at Full HD resolution (1920 × 1080).
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSaveAndDone}
          className="m3-btn-filled mt-4 w-full py-3 px-4 text-sm"
        >
          <span className="material-symbols-rounded text-[18px]">check</span>
          <span>Save & Done</span>
        </button>
      </div>
    </div>
  );
};
