import React, { useState } from 'react';
import { ExportedVideo } from '../types';

interface ExportedVideosModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportsList: ExportedVideo[];
}

export const ExportedVideosModal: React.FC<ExportedVideosModalProps> = ({
  isOpen,
  onClose,
  exportsList,
}) => {
  const [activeVideo, setActiveVideo] = useState<ExportedVideo | null>(
    exportsList[0] || null
  );

  if (!isOpen) return null;

  const current = activeVideo || exportsList[0] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="my-auto w-full max-w-lg rounded-3xl border border-[#343D37] bg-[#1A1E1B] p-4 sm:p-5 text-[#F1F5F2] shadow-2xl space-y-4">
        {/* M3 Dark Dialog Header */}
        <div className="flex items-start justify-between gap-3 border-b border-[#2A312D] pb-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#173823] border border-[#255436] text-[#6DD58C]">
              <span className="material-symbols-rounded text-[22px]">
                folder_special
              </span>
            </span>
            <div>
              <h3 className="text-sm font-bold text-[#F1F5F2] leading-snug">
                Downloads / MahmudAutoEdit
              </h3>
              <p className="text-xs text-[#A6B3AA] mt-0.5 leading-relaxed">
                Exported drama review MP4 videos and voiceover files
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="m3-btn-text !min-h-0 h-9 w-9 !p-0 shrink-0 rounded-full"
          >
            <span className="material-symbols-rounded text-[20px]">close</span>
          </button>
        </div>

        {current ? (
          <>
            {/* Active Video Player */}
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-[#343D37] bg-black">
              <video
                key={current.videoUrl}
                src={current.videoUrl}
                controls
                autoPlay
                className="h-full w-full object-contain"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#343D37] bg-[#222724] p-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#F1F5F2] break-words leading-snug">
                  {current.filename}
                </p>
                <p className="text-[11px] text-[#6DD58C] font-mono font-bold tabular-nums mt-0.5">
                  {current.quality} HD MP4 • Duration: {current.formattedDuration}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                {current.audioUrl && (
                  <a
                    href={current.audioUrl}
                    download={current.audioFilename}
                    className="m3-btn-tonal-red flex-1 sm:flex-initial px-3.5 py-2"
                  >
                    <span className="material-symbols-rounded text-[16px]">
                      music_note
                    </span>
                    <span>WAV Audio</span>
                  </a>
                )}
                <a
                  href={current.videoUrl}
                  download={current.filename}
                  className="m3-btn-filled flex-1 sm:flex-initial px-4 py-2"
                >
                  <span className="material-symbols-rounded text-[17px]">
                    download
                  </span>
                  <span>Download MP4</span>
                </a>
              </div>
            </div>

            {/* Thumbnail Grid of Exported Files (1-Col on Mobile / 2-Col on sm+) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pt-1">
              {exportsList.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveVideo(item)}
                  className={`flex items-center gap-2.5 rounded-2xl border p-2.5 text-left transition-all cursor-pointer ${
                    current.id === item.id
                      ? 'border-[#255436] bg-[#173823]'
                      : 'border-[#343D37] bg-[#222724] hover:bg-[#2B322E]'
                  }`}
                >
                  <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-xl bg-black">
                    <img
                      src={item.thumbnailUrl}
                      alt={item.filename}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute top-1 left-1 rounded-md bg-[#D93025] px-1.5 text-[8px] font-extrabold text-white">
                      MP4
                    </span>
                    <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 text-[9px] font-mono text-white">
                      {item.formattedDuration}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#F1F5F2] break-words leading-snug">
                      {item.filename}
                    </p>
                    <p className="text-[10px] text-[#6DD58C] font-semibold flex items-center gap-1 mt-0.5">
                      <span className="material-symbols-rounded text-[13px]">
                        play_circle
                      </span>
                      <span>Click to Play</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-[#A6B3AA]">
            <span className="material-symbols-rounded text-[40px] text-[#6DD58C] opacity-50 mb-2">
              movie
            </span>
            <p className="text-xs font-medium">No videos have been exported yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
