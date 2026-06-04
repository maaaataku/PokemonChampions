// tuning.ts — 耐久/素早さ調整（F-12〜F-14）の純粋ロジック。
// 耐久は calcDamage を内部で回して「確定耐え」最小投資を逆算。素早さは championsStat ベース。

import { calcDamage, type CalcParams } from './service';
import { championsStat, stageMult, type NatureMult } from './stats';
import { MOVES } from '../data';

const floor = Math.floor;

/** 確定耐え = 最大乱数ダメージ < 最大HP（その1撃では絶対に瀕死にならない）。 */
function survives(d: { max: number; maxHP: number }): boolean {
  return d.max < d.maxHP;
}

export interface SurvivalLine {
  /** 必要な能力ポイント（HP振り案なら hpSP、防御振り案なら defSP）。 */
  pts: number;
  min: number;
  max: number;
  maxHP: number;
  /** 残HP割合（確定耐え時の最悪ケース）。 */
  survivePct: number;
}

export interface SurvivalResult {
  /** 攻撃側の表示用ラベル（例「ガブリアスのじしん」）。 */
  isPhys: boolean;
  /** HPに振って確定耐えする最小案（防御は現状維持）。届かなければ null。 */
  byHP: SurvivalLine | null;
  /** 防御/特防に振って確定耐えする最小案（HPは現状維持）。届かなければ null。 */
  byDef: SurvivalLine | null;
  /** 現状（base.defender のまま）で確定耐えできているか。 */
  currentlySurvives: boolean;
}

const MAX_PTS = 32;

/**
 * base の攻撃設定はそのままに、防御側の投資だけを動かして確定耐えの最小投資を逆算する。
 * HP振り案・防御振り案をそれぞれ提示（要件 F-12）。
 */
export function findSurvival(base: CalcParams): SurvivalResult {
  const move = MOVES[base.moveJP];
  const isPhys = move?.cat === 'phys';
  const defStat = isPhys ? 'def' : 'spd';
  const cur = base.defender.pts ?? {};
  const curHp = cur.hp ?? 0;
  const curDef = cur[defStat] ?? 0;

  const withPts = (hp: number, def: number) =>
    calcDamage({ ...base, defender: { ...base.defender, pts: { ...cur, hp, [defStat]: def } } });

  const currentlySurvives = survives(withPts(curHp, curDef));

  // HP振り案：防御は現状固定、HP を 0..32 で最小化。
  let byHP: SurvivalLine | null = null;
  for (let hp = 0; hp <= MAX_PTS; hp++) {
    const d = withPts(hp, curDef);
    if (survives(d)) {
      byHP = { pts: hp, min: d.min, max: d.max, maxHP: d.maxHP, survivePct: ((d.maxHP - d.max) / d.maxHP) * 100 };
      break;
    }
  }

  // 防御振り案：HP は現状固定、防御を 0..32 で最小化。
  let byDef: SurvivalLine | null = null;
  for (let def = 0; def <= MAX_PTS; def++) {
    const d = withPts(curHp, def);
    if (survives(d)) {
      byDef = { pts: def, min: d.min, max: d.max, maxHP: d.maxHP, survivePct: ((d.maxHP - d.max) / d.maxHP) * 100 };
      break;
    }
  }

  return { isPhys, byHP, byDef, currentlySurvives };
}

/* ----------------------------- 素早さ ----------------------------- */

export interface SpeedMods {
  /** こだわりスカーフ ×1.5。 */
  scarf?: boolean;
  /** おいかぜ ×2。 */
  tailwind?: boolean;
  /** まひ ×0.5（Gen7+）。 */
  paralysis?: boolean;
}

/**
 * Champions 素早さ実数値（補正込み）。
 * 実数値 → ランク補正(floor) → 倍率(スカーフ/追い風, floor) → まひ(×0.5, floor) の順。
 * トリックルームは数値ではなく行動順の反転なので、本関数では扱わず比較側で処理する。
 */
export function championsSpeed(
  base: number,
  pts: number,
  natureMult: NatureMult,
  stage: number,
  mods: SpeedMods = {},
): number {
  let s = championsStat(base, pts, natureMult, false);
  s = floor(s * stageMult(stage));
  let m = 1;
  if (mods.scarf) m *= 1.5;
  if (mods.tailwind) m *= 2;
  s = floor(s * m);
  if (mods.paralysis) s = floor(s * 0.5);
  return s;
}

export interface SpeedEntry<T = string> {
  id: T;
  speed: number;
}

/**
 * 素早さの行動順を判定して並べる（要件 F-13）。
 * trickRoom=true で遅い順が先。同速はタイ（入力順を保持）。
 */
export function orderBySpeed<T>(entries: SpeedEntry<T>[], trickRoom = false): SpeedEntry<T>[] {
  const sorted = [...entries].sort((a, b) => b.speed - a.speed);
  return trickRoom ? sorted.reverse() : sorted;
}
