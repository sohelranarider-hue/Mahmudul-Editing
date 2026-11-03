import React, { useRef, useState } from 'react';
import JSZip from 'jszip';
import { CapturedFrame } from '../types';

interface GalleryTabProps {
  frames: CapturedFrame[];
  similarityThreshold: number;
  onThresholdChange: (threshold: number) => void;
  onToggleSelectFrame: (id: string) => void;
  onSelectAll: () => void;
  onAutoSelectDuplicates: () => void;
  onAutoDeleteDuplicates: () => void;
  onDeleteFrame: (id: string) => void;
  onReplaceFrameWithFile: (id: string, file: File) => void;
  onRecaptureFrameFromVideo: (id: string) => void;
  onUploadPhotos: (files: FileList) => void;
  onClearAll: () => void;
  onUseUniqueForVideo: () => void;
  onShowToast: (msg: string) => void;
}

const SIMILARITY_STEPS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export const GalleryTab: React.FC<GalleryTabProps> = ({
  frames,
  similarityThreshold,
  onThresholdChange,
  onToggleSelectFrame,
  onSelectAll,
  onAutoSelectDuplicates,
  onAutoDeleteDuplicates,
  onDeleteFrame,
  onReplaceFrameWithFile,
  onRecaptureFrameFromVideo,
  onUploadPhotos,
  onClearAll,
  onUseUniqueForVideo,
  onShowToast,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'duplicate' | 'unique'>('all');
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);

  const uploadInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const duplicateFrames = frames.filter((f) => f.isDuplicate);
  const uniqueFrames = frames.filter((f) => !f.isDuplicate);

  const visibleFrames =
    filterMode === 'duplicate'
      ? duplicateFrames
      : filterMode === 'unique'
      ? uniqueFrames
      : frames;

  const handleDownloadZip = async () => {
    if (visibleFrames.length === 0 || zipProgress !== null) return;
    try {
      setZipProgress(5);
      const zip = new JSZip();
      const folder = zip.folder('MahmudAutoEdit_Frames');

      visibleFrames.forEach((frame, idx) => {
        const base64Data = frame.dataUrl.split(',')[1];
        if (base64Data && folder) {
          const num = String(idx + 1).padStart(3, '0');
          folder.file(`frame_${num}_${frame.formattedTime.replace(':', '-')}.jpg`, base64Data, {
            base64: true,
          });
        }
      });

      const content = await zip.generateAsync(
        { type: 'blob' },
        (metadata) => {
          setZipProgress(Math.round(metadata.percent));
        }
      );

      const archiveName = `drama_frames_archive_${Date.now()}.zip`;
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = archiveName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);

      setZipProgress(null);
      onShowToast(
        `Saved to Downloads/MahmudAutoEdit: ${archiveName}`
      );
    } catch {
      setZipProgress(null);
      onShowToast('ZIP তৈরিতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="m3-card p-4 sm:p-5 space-y-4">
      {/* Hidden File Inputs */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onUploadPhotos(e.target.files);
            e.target.value = '';
          }
        }}
      />
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && replaceTargetId) {
            onReplaceFrameWithFile(replaceTargetId, file);
            setReplaceTargetId(null);
            e.target.value = '';
          }
        }}
      />

      {/* Gallery M3 Dark Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[20px]">
                photo_library
              </span>
            </span>
            <h2 className="text-base font-bold text-[#F1F5F2]">
              Frame Screenshots
            </h2>
            <span className="rounded-full border border-[#255436] bg-[#173823] px-3 py-0.5 text-xs font-bold text-[#9CE6B0] tabular-nums">
              Total: {frames.length}
            </span>
          </div>
          <p className="text-xs text-[#A6B3AA] mt-1 leading-relaxed">
            ভিডিওর সমস্ত দৃশ্য ও ক্যাপ করা কাস্টমাইজড ফ্রেমের তালিকা
          </p>
        </div>
      </div>

      {/* Top Native Android M3 Action Buttons Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onSelectAll}
          className="m3-btn-outlined px-3.5 py-2"
        >
          <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
            select_all
          </span>
          <span>Select All</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={visibleFrames.length === 0}
          className="m3-btn-filled px-3.5 py-2"
        >
          <span className="material-symbols-rounded text-[17px]">
            folder_zip
          </span>
          <span>
            {zipProgress !== null
              ? `Zipping... ${zipProgress}%`
              : `Download ZIP ${visibleFrames.length > 0 ? `(${visibleFrames.length})` : ''}`}
          </span>
        </button>

        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          className="m3-btn-tonal px-3.5 py-2"
        >
          <span className="material-symbols-rounded text-[17px] text-[#6DD58C]">
            add_photo_alternate
          </span>
          <span>Upload Photos</span>
        </button>

        {frames.length > 0 && (
          <button
            type="button"
            onClick={onClearAll}
            className="m3-btn-tonal-red px-3.5 py-2"
          >
            <span className="material-symbols-rounded text-[16px]">
              delete_sweep
            </span>
            <span>Clear All</span>
          </button>
        )}
      </div>

      {frames.length === 0 ? (
        /* Empty Gallery M3 Expressive Dark State */
        <div className="my-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#36403A] bg-[#222724] py-12 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#173823] border border-[#255436] text-[#6DD58C] mb-3.5">
            <span className="material-symbols-rounded text-[28px]">
              collections
            </span>
          </div>
          <p className="text-sm font-bold text-[#F1F5F2]">
            No frames in the gallery
          </p>
          <p className="text-xs text-[#A6B3AA] mt-1 max-w-xs">
            Capture frames from Video Cropper or upload photos to Gallery
          </p>
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="m3-btn-filled mt-4 px-5 py-2.5"
          >
            <span className="material-symbols-rounded text-[18px]">
              upload
            </span>
            <span>Upload Photos to Gallery</span>
          </button>
        </div>
      ) : (
        <>
          {/* Smart Duplicate Filter & Perceptual Similarity M3 Dark Container */}
          <div className="rounded-2xl border border-[#343D37] bg-[#222724] p-3.5 space-y-3">
            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-[#A6B3AA] mr-1">
                ফিল্টার:
              </span>
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={
                  filterMode === 'all'
                    ? 'm3-btn-filled px-3.5 py-2'
                    : 'm3-btn-outlined px-3.5 py-2'
                }
              >
                <span>সব ছবি ({frames.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('duplicate')}
                className={
                  filterMode === 'duplicate'
                    ? 'm3-btn-filled-red px-3.5 py-2'
                    : 'm3-btn-outlined px-3.5 py-2'
                }
              >
                <span>ডুপ্লিকেট ছবি</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${
                    filterMode === 'duplicate'
                      ? 'bg-white text-[#D93025]'
                      : 'bg-[#D93025] text-white'
                  }`}
                >
                  {duplicateFrames.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setFilterMode('unique')}
                className={
                  filterMode === 'unique'
                    ? 'm3-btn-filled px-3.5 py-2'
                    : 'm3-btn-outlined px-3.5 py-2'
                }
              >
                <span>ইউনিক ছবি ({uniqueFrames.length})</span>
              </button>

              <button
                type="button"
                onClick={onUseUniqueForVideo}
                className="m3-btn-tonal px-3.5 py-2"
              >
                <span className="material-symbols-rounded text-[15px] text-[#6DD58C]">
                  rocket_launch
                </span>
                <span>ইউনিক ছবি দিয়ে Video Generate</span>
              </button>
            </div>

            {/* Similarity Threshold Row (Responsive 5-Col on Mobile / 10-Col on sm+) */}
            <div className="rounded-xl border border-[#343D37] bg-[#1A1E1B] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-[#A6B3AA] flex items-center gap-1.5">
                  <span className="material-symbols-rounded text-[15px] text-[#F28B82]">
                    compare
                  </span>
                  <span>হুবহু মিল (Similarity):</span>
                </span>
                <span className="text-xs font-mono font-bold text-[#F28B82] tabular-nums">
                  {similarityThreshold}%
                </span>
              </div>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
                {SIMILARITY_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onThresholdChange(step)}
                    className={`rounded-full py-1.5 px-1 text-[11px] font-mono font-bold tabular-nums transition-colors cursor-pointer ${
                      similarityThreshold === step
                        ? 'bg-[#1B873F] text-white'
                        : 'bg-[#262C28] text-[#A6B3AA] hover:bg-[#303833] hover:text-[#F1F5F2]'
                    }`}
                  >
                    {step}%
                  </button>
                ))}
              </div>
            </div>

            {/* Duplicate Auto Select & Auto Delete Native Android M3 Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onAutoSelectDuplicates}
                className="m3-btn-tonal px-3.5 py-2"
              >
                <span className="material-symbols-rounded text-[16px] text-[#6DD58C]">
                  done_all
                </span>
                <span>ডুপ্লিকেট অটো সিলেক্ট</span>
              </button>

              <button
                type="button"
                onClick={onAutoDeleteDuplicates}
                disabled={duplicateFrames.length === 0}
                className="m3-btn-filled-red px-3.5 py-2"
              >
                <span className="material-symbols-rounded text-[16px]">
                  auto_delete
                </span>
                <span>ডুপ্লিকেট অটো ডিলিট</span>
                <span className="rounded-full bg-white/25 px-2 py-0.5 text-[10px] text-white tabular-nums">
                  {duplicateFrames.length}
                </span>
              </button>
            </div>
          </div>

          {/* Responsive M3 Expressive Dark Frame Grid (1-Col on extra narrow / 2-Col on mobile+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
            {visibleFrames.map((frame) => (
              <div
                key={frame.id}
                className={`group relative aspect-video overflow-hidden rounded-2xl border-2 bg-[#151916] transition-all ${
                  frame.isDuplicate
                    ? 'border-[#D93025]'
                    : frame.replacedCount > 0
                    ? 'border-[#229A4B]'
                    : frame.selected
                    ? 'border-[#229A4B]'
                    : 'border-[#343D37]'
                }`}
              >
                <img
                  src={frame.dataUrl}
                  alt={`Frame ${frame.index}`}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />

                {/* Top Overlay Bar */}
                <div className="absolute inset-x-0 top-0 flex flex-wrap items-center justify-between gap-1 bg-black/70 p-2">
                  {/* Frame Number Pill */}
                  <span className="rounded-full bg-[#1A1E1B] border border-[#36403A] px-2.5 py-0.5 text-[10px] font-mono font-bold text-[#F1F5F2] tabular-nums">
                    #{String(frame.index).padStart(2, '0')}
                  </span>

                  {/* Duplicate Tag OR Replace + Action Icons */}
                  <div className="flex flex-wrap items-center gap-1">
                    {frame.isDuplicate ? (
                      <span className="rounded-full bg-[#D93025] px-2.5 py-0.5 text-[10px] font-bold text-white">
                        ডুপ্লিকেট (#{frame.duplicateOfIndex} - {frame.similarityPercent}%)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setReplaceTargetId(frame.id);
                          replaceInputRef.current?.click();
                        }}
                        className="rounded-full bg-[#1B873F] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#229A4B] cursor-pointer"
                      >
                        REPLACE
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onRecaptureFrameFromVideo(frame.id)}
                      title="Re-capture from current video position"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A1E1B]/95 text-[#6DD58C] hover:bg-[#173823] cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-[15px]">
                        autorenew
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteFrame(frame.id)}
                      title="Delete frame"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1A1E1B]/95 text-[#F28B82] hover:bg-[#D93025] hover:text-white cursor-pointer"
                    >
                      <span className="material-symbols-rounded text-[15px]">
                        delete
                      </span>
                    </button>
                  </div>
                </div>

                {/* Bottom Right M3 Selection Checkbox */}
                <button
                  type="button"
                  onClick={() => onToggleSelectFrame(frame.id)}
                  className={`absolute bottom-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full border transition-colors cursor-pointer ${
                    frame.selected
                      ? 'border-[#229A4B] bg-[#1B873F] text-white'
                      : 'border-white/75 bg-black/55 text-transparent hover:border-white'
                  }`}
                >
                  <span className="material-symbols-rounded text-[16px]">
                    check
                  </span>
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
