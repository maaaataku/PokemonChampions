// stats.ts — Champions 実数値（Lv50・IV31固定・能力ポイント制）の計算。
// エンジンの rawStats と全域で一致することをユニットテストで保証する（耐久/素早さ調整で使用）。

import type { StatID } from '@smogon/calc';
import type { NatureStat } from '../data/natures';

const floor = Math.floor;

/** 性格補正値。↑=1.1 / ↓=0.9 / 無=1.0。 */
export type NatureMult = 0.9 | 1.0 | 1.1;

/**
 * Champions 実数値。
 * inner = floor((種族値*2 + 31 + 能力P*2) * 50 / 100)
 * HP   = inner + 60
 * その他 = floor((inner + 5) * 性格補正)
 */
export function championsStat(
  base: number,
  pts: number,
  natureMult: NatureMult,
  isHP: boolean,
): number {
  const inner = floor((base * 2 + 31 + pts * 2) * 50 / 100);
  if (isHP) return inner + 60;
  return floor((inner + 5) * natureMult);
}

/** ある能力に対する性格補正（plus=1.1 / minus=0.9 / それ以外=1.0）。 */
export function natureMultFor(
  stat: NatureStat,
  plus: NatureStat | null,
  minus: NatureStat | null,
): NatureMult {
  if (stat === plus) return 1.1;
  if (stat === minus) return 0.9;
  return 1.0;
}

/** ランク補正倍率（+nは(2+n)/2、-nは2/(2-n)）。素早さ早見など自前計算で使用。 */
export function stageMult(stage: number): number {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

/** 1能力分の能力ポイント上限（合計上限は66、本実装では各能力で別管理）。 */
export const MAX_PTS_PER_STAT = 32;
export const MAX_PTS_TOTAL = 66;
