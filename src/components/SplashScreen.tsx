import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState<number>(8);
  const [isExiting, setIsExiting] = useState<boolean>(false);

  useEffect(() => {
    const startTime = performance.now();
    const durationMs = 2000;
    let rafId: number;

    const updateProgress = (now: number) => {
      const elapsed = now - startTime;
      const ratio = Math.min(1, elapsed / durationMs);
      // Smooth cubic ease-out curve for the progress bar
      const eased = 1 - Math.pow(1 - ratio, 3);
      setProgress(Math.min(100, Math.max(8, Math.round(eased * 100))));

      if (ratio < 1) {
        rafId = requestAnimationFrame(updateProgress);
      } else {
        setIsExiting(true);
      }
    };

    rafId = requestAnimationFrame(updateProgress);

    // Failsafe completion timer so the splash screen can never get stuck
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, durationMs + 50);

    const finishTimer = setTimeout(() => {
      onComplete();
    }, durationMs + 420);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#111412] px-5 py-8 text-[#F1F5F2] select-none transition-all duration-400 ease-out ${
        isExiting ? 'opacity-0 scale-[1.02] pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Subtle Ambient Studio Glow (Dark Charcoal with Deep Green & Red Accents) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-[#1B873F]/12 blur-3xl" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 h-72 w-72 rounded-full bg-[#D93025]/10 blur-3xl" />
      </div>

      {/* Main Centered Material 3 Expressive Splash Card */}
      <div className="splash-enter relative z-10 flex w-full max-w-sm flex-col items-center rounded-[32px] border border-[#2A312D] bg-[#1A1E1B]/95 px-6 py-8 sm:px-8 sm:py-10 text-center shadow-2xl">
        {/* Top Green & Red Accent Pill Indicator */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#255436] bg-[#173823] px-3.5 py-1 text-[11px] font-bold tracking-wider text-[#9CE6B0] uppercase">
          <span className="h-2 w-2 rounded-full bg-[#D93025]" />
          <span>Material 3 Studio</span>
        </div>

        {/* Circular Personal Profile Photo with Clean Professional Border */}
        <div className="relative mb-3.5">
          <div className="splash-avatar-ring relative h-28 w-28 sm:h-32 sm:w-32 rounded-full p-[3px] bg-gradient-to-tr from-[#1B873F] via-[#F1F5F2] to-[#D93025]">
            <div className="h-full w-full overflow-hidden rounded-full border-2 border-[#111412] bg-[#151916]">
              <img
                src="/assets/aistudio/developer_logo_8aab034f.jpg"
                alt="Mahmud Google Play Developer"
                className="h-full w-full rounded-full object-cover object-[center_38%]"
              />
            </div>
          </div>

          {/* Verified Developer Badge on Bottom-Right of Circular Photo */}
          <div className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#1A1E1B] bg-[#1B873F] text-white shadow-md">
            <span className="material-symbols-rounded text-[15px]">
              verified
            </span>
          </div>
        </div>

        {/* Stylish Developer Subtitle Below Photo */}
        <p className="text-xs sm:text-[13px] font-semibold tracking-[0.06em] text-[#A6B3AA]">
          Mahmud Google Play Developer
        </p>

        {/* Subtle Divider */}
        <div className="my-5 flex items-center gap-2">
          <span className="h-[1px] w-10 bg-[#2E3631]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#D93025]" />
          <span className="h-[1px] w-10 bg-[#2E3631]" />
        </div>

        {/* Prominent Centered Application Title */}
        <div className="flex items-center justify-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#173823] border border-[#255436] shadow-sm overflow-hidden p-0.5">
            <img
              src="/assets/aistudio/developer_logo_8aab034f.jpg"
              alt="Mahmud Auto Edit App Logo"
              className="h-full w-full rounded-lg object-cover object-[center_38%]"
            />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#F1F5F2]">
            Mahmud Auto Edit
          </h1>
        </div>

        <p className="mt-1.5 text-xs text-[#A6B3AA]">
          Automated Video Editing & Voiceover Studio
        </p>

        {/* Smooth Material 3 Loading Animation & Progress Bar */}
        <div className="mt-7 w-full space-y-2.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#262C28] p-[1px]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#1B873F] via-[#229A4B] to-[#D93025] transition-all duration-100 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-center justify-between px-1 text-[11px] font-medium text-[#A6B3AA]">
            <span className="inline-flex items-center gap-1.5">
              <span className="material-symbols-rounded text-[14px] text-[#6DD58C] animate-spin">
                progress_activity
              </span>
              <span>
                {progress < 45
                  ? 'Initializing studio engine...'
                  : progress < 85
                  ? 'Loading audio & frame tools...'
                  : 'Ready to launch...'}
              </span>
            </span>
            <span className="font-mono font-bold text-[#F1F5F2] tabular-nums">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
