// natures.ts — 性格の日本語↔英語マッピングと、↑↓スタットからの逆引き。
// Champions の性格補正(0.9/1.0/1.1)は本編式と同一。エンジンは英語性格名を要求するため、
// 「どの能力を上げ / 下げるか」から具体的な性格名を引けるようにしておく。

import type { StatID } from '@smogon/calc';

/** 性格が上げ下げする能力（hp は対象外。無補正性格は null）。 */
export type NatureStat = Exclude<StatID, 'hp'>;

export interface NatureDef {
  en: string;
  jp: string;
  /** 1.1倍される能力（無補正なら null）。 */
  plus: NatureStat | null;
  /** 0.9倍される能力（無補正なら null）。 */
  minus: NatureStat | null;
}

export const NATURES: NatureDef[] = [
  // 無補正
  { en: 'Hardy', jp: 'がんばりや', plus: null, minus: null },
  { en: 'Docile', jp: 'すなお', plus: null, minus: null },
  { en: 'Serious', jp: 'まじめ', plus: null, minus: null },
  { en: 'Bashful', jp: 'てれや', plus: null, minus: null },
  { en: 'Quirky', jp: 'きまぐれ', plus: null, minus: null },
  // こうげき↑
  { en: 'Lonely', jp: 'さみしがり', plus: 'atk', minus: 'def' },
  { en: 'Brave', jp: 'ゆうかん', plus: 'atk', minus: 'spe' },
  { en: 'Adamant', jp: 'いじっぱり', plus: 'atk', minus: 'spa' },
  { en: 'Naughty', jp: 'やんちゃ', plus: 'atk', minus: 'spd' },
  // ぼうぎょ↑
  { en: 'Bold', jp: 'ずぶとい', plus: 'def', minus: 'atk' },
  { en: 'Relaxed', jp: 'のんき', plus: 'def', minus: 'spe' },
  { en: 'Impish', jp: 'わんぱく', plus: 'def', minus: 'spa' },
  { en: 'Lax', jp: 'のうてんき', plus: 'def', minus: 'spd' },
  // とくこう↑
  { en: 'Modest', jp: 'ひかえめ', plus: 'spa', minus: 'atk' },
  { en: 'Mild', jp: 'おっとり', plus: 'spa', minus: 'def' },
  { en: 'Quiet', jp: 'れいせい', plus: 'spa', minus: 'spe' },
  { en: 'Rash', jp: 'うっかりや', plus: 'spa', minus: 'spd' },
  // とくぼう↑
  { en: 'Calm', jp: 'おだやか', plus: 'spd', minus: 'atk' },
  { en: 'Gentle', jp: 'おとなしい', plus: 'spd', minus: 'def' },
  { en: 'Sassy', jp: 'なまいき', plus: 'spd', minus: 'spe' },
  { en: 'Careful', jp: 'しんちょう', plus: 'spd', minus: 'spa' },
  // すばやさ↑
  { en: 'Timid', jp: 'おくびょう', plus: 'spe', minus: 'atk' },
  { en: 'Hasty', jp: 'せっかち', plus: 'spe', minus: 'def' },
  { en: 'Jolly', jp: 'ようき', plus: 'spe', minus: 'spa' },
  { en: 'Naive', jp: 'むじゃき', plus: 'spe', minus: 'spd' },
];

export const NATURE_JP_TO_EN = Object.fromEntries(
  NATURES.map((n) => [n.jp, n.en]),
) as Record<string, string>;

export const NATURE_EN_TO_JP = Object.fromEntries(
  NATURES.map((n) => [n.en, n.jp]),
) as Record<string, string>;

/** 既定の無補正性格名。 */
export const NEUTRAL_NATURE = 'Hardy';

/**
 * 「この能力を上げ、この能力を下げる」性格名を引く。
 * plus/minus が同一・無指定・組合せ不在のときは無補正(Hardy)を返す。
 */
export function natureFor(plus: NatureStat | null, minus: NatureStat | null): string {
  if (!plus || !minus || plus === minus) return NEUTRAL_NATURE;
  const found = NATURES.find((n) => n.plus === plus && n.minus === minus);
  return found ? found.en : NEUTRAL_NATURE;
}

const NEUTRAL_JP = NATURES.find((n) => n.en === NEUTRAL_NATURE)!.jp;

/**
 * 試作の「対象能力に対する補正値(0.9/1.0/1.1)」から日本語性格名を引く。
 * ダメージ計算上は対象能力の倍率だけが効くため、もう一方の上下stは任意でよい。
 */
export function natureJPForStat(stat: NatureStat, mult: 0.9 | 1.0 | 1.1): string {
  if (mult === 1.0) return NEUTRAL_JP;
  const found =
    mult === 1.1
      ? NATURES.find((n) => n.plus === stat && n.minus !== stat)
      : NATURES.find((n) => n.minus === stat && n.plus !== stat);
  return found ? found.jp : NEUTRAL_JP;
}
