// theme.ts — 試作の配色をそのまま移植（ダーク/ライト）。

export interface Theme {
  bg: string;
  panel: string;
  panel2: string;
  border: string;
  hi: string;
  mid: string;
  lo: string;
  chip: string;
  accent: string;
  foe: string;
  /** accent 上に乗せる文字色（ダーク背景色）。 */
  onAccent: string;
}

export const THEMES: Record<'dark' | 'light', Theme> = {
  dark: {
    bg: '#0a0e16', panel: '#121826', panel2: '#192131', border: '#28303f',
    hi: '#eef2f8', mid: '#93a0b4', lo: '#5a6678', chip: '#1c2533',
    accent: '#9af23a', foe: '#ff6b3d', onAccent: '#0a0e16',
  },
  light: {
    bg: '#efe9dc', panel: '#ffffff', panel2: '#f5f1e8', border: '#ddd5c4',
    hi: '#1a1d24', mid: '#5d6678', lo: '#9099a1', chip: '#f1ece0',
    accent: '#3a8a12', foe: '#d2502a', onAccent: '#ffffff',
  },
};

export type ThemeName = keyof typeof THEMES;
