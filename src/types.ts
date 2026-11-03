export type ActiveTab = 'crop' | 'generate' | 'gallery';

export interface CapturedFrame {
  id: string;
  index: number;
  dataUrl: string;
  timestamp: number;
  formattedTime: string;
  signature: number[];
  isDuplicate: boolean;
  duplicateOfIndex?: number;
  similarityPercent?: number;
  selected: boolean;
  replacedCount: number;
}

export interface ColorGrading {
  brightness: number; // 0 to 200, default 100
  contrast: number;   // 0 to 200, default 100
  saturation: number; // 0 to 200, default 100
  warmth: number;     // -100 to 100, default 0
  vignette: number;   // 0 to 100, default 0
  hueTint: number;    // -180 to 180, default 0
}

export type HookDuration = 0 | 10 | 30 | 60 | 120 | 180;

export type HookFrameTemplate =
  | 'Studio Frame'
  | 'Flashback Intro'
  | 'IMAX Theater'
  | 'Director Cut';

export type BorderLightStyle =
  | 'Cyber Spectrum'
  | 'Aurora Flow'
  | 'Laser Matrix'
  | 'Royal Gold';

export type OverlayEffect =
  | 'Clean (Off)'
  | 'Monsoon Storm'
  | 'Arctic Frost'
  | 'Fire Sparks'
  | 'Golden Sunbeams'
  | 'Velvet Hearts'
  | 'Retro 35mm VHS'
  | 'Neon Bokeh Glow';

export type FxStyleMode =
  | 'Ultra Story FX'
  | 'IMAX Scope 4K'
  | 'Sonic Spectrum'
  | 'Cyber Glitch Pro'
  | 'HDR Cinema Pop';

export type TransitionStyle =
  | 'Auto Mix Pro'
  | 'Hyper Zoom Flash'
  | 'Velocity Whip Pan'
  | 'Prism Shutter 7X'
  | 'Portal Iris Warp'
  | 'Laser Slash Wipe';

export type VoiceEngine = 'Gemini Studio' | 'TanishaaNeural IN' | 'Browser Voice';

export type ExportQuality = '480p' | '720p' | '1080p';

export interface ExtraFrameSettings {
  enabled: boolean;
  frameId: string | null;
  imageUrl: string | null;
  sceneLabel: string;
  durationMinutes: number; // 1 to 60
}

export interface BgmTrack {
  id: string;
  name: string;
  url: string;
  isCustom?: boolean;
}

export interface ExportedVideo {
  id: string;
  filename: string;
  audioFilename: string;
  videoUrl: string;
  audioUrl: string;
  durationSeconds: number;
  formattedDuration: string;
  quality: ExportQuality;
  createdAt: string;
  thumbnailUrl: string;
}
