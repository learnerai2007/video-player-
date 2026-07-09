export interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'audio';
  duration?: number;
  size?: string;
  isSample?: boolean;
}

export interface SubtitleItem {
  id: string;
  name: string;
  url: string;
  delay: number; // in seconds
}

export interface Bookmark {
  id: string;
  time: number; // in seconds
  note: string;
}

export interface VideoFilters {
  brightness: number;  // 50 - 150 (percentage)
  contrast: number;    // 50 - 150 (percentage)
  saturate: number;    // 0 - 200 (percentage)
  hueRotate: number;   // 0 - 360 (degrees)
  blur: number;        // 0 - 10 (px)
  invert: number;      // 0 - 100 (percentage)
  sepia: number;       // 0 - 100 (percentage)
}

export interface EqPreset {
  name: string;
  gains: number[]; // 10 bands: 31Hz, 62Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz
}

export type AspectRatioType = 'fit' | 'fill' | 'stretch' | '16:9' | '4:3';

export interface PlaybackSettings {
  speed: number;
  aspectRatio: AspectRatioType;
  subtitleSize: 'small' | 'medium' | 'large' | 'xlarge';
  subtitleColor: string;
  subtitleBg: string;
  subtitleDelay: number;
  audioDelay: number;
  loop: 'none' | 'one' | 'all';
  shuffle: boolean;
}

export const EQ_BANDS = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: EqPreset[] = [
  { name: 'Flat', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  { name: 'Classical', gains: [5, 3, 2, 2, -2, -2, -1, 0, 3, 4] },
  { name: 'Club', gains: [0, 0, 2, 4, 4, 3, 2, 0, 0, 0] },
  { name: 'Dance', gains: [4, 6, 5, 0, 0, -2, -4, -4, 0, 0] },
  { name: 'Full Bass', gains: [6, 5, 4, 2, 0, -2, -4, -5, -6, -6] },
  { name: 'Full Treble', gains: [-6, -5, -4, -2, 0, 2, 4, 5, 6, 6] },
  { name: 'Laptop Speakers', gains: [-3, -1, 1, 3, -1, -2, 2, 4, 5, 3] },
  { name: 'Large Hall', gains: [5, 5, 3, 3, 0, -2, -2, -2, 0, 0] },
  { name: 'Live', gains: [-2, 0, 2, 3, 3, 3, 2, 1, 1, 1] },
  { name: 'Party', gains: [3, 3, 0, 0, 0, 0, 0, 0, 3, 3] },
  { name: 'Pop', gains: [-2, -1, 1, 3, 4, 3, 0, -1, -2, -2] },
  { name: 'Reggae', gains: [0, 0, -2, -2, 0, 3, 3, 0, 0, 0] },
  { name: 'Rock', gains: [4, 3, -3, -5, -2, 2, 4, 5, 5, 5] },
  { name: 'Ska', gains: [-2, -1, 2, 3, 3, 4, 4, 5, 4, 3] },
  { name: 'Soft', gains: [2, 1, 0, -1, -1, 1, 2, 3, 4, 4] },
  { name: 'Soft Rock', gains: [2, 2, 1, -1, -2, -2, -1, 0, 2, 5] },
  { name: 'Techno', gains: [4, 3, 0, -3, -2, 0, 4, 4, 4, 3] },
  { name: 'Vocal', gains: [-4, -4, -3, 1, 4, 4, 3, 1, -2, -4] },
];
