// moves.ts — 技データ。JP↔EN と特殊フラグ(roster.ts)を入力に、
// type/cat/power/target/hits はエンジン(Gen9)から自動解決して構築する。

import { Move } from '@smogon/calc';
import { gen } from '../engine/championsAdapter';
import { TYPE_EN_TO_JP, type TypeJP } from './types';
import { MOVE_ROWS } from './roster';

/** わざの対象種別。
 *  single = 単体（対象選択） / foes = 相手全体(範囲) / all = 自分以外全体(味方巻き込み,範囲) */
export type MoveTarget = 'single' | 'foes' | 'all';

export interface MoveDef {
  jp: string;
  /** 英語技名（@smogon/calc 用）。 */
  en: string;
  type: TypeJP;
  cat: 'phys' | 'spec';
  target: MoveTarget;
  /** 威力（エンジン値）。 */
  power: number;
  /** 常時急所（あんこくきょうだ・すいりゅうれんだ等）。 */
  crit?: boolean;
  /** 連続技のヒット数。 */
  hits?: number;
  /** フリーズドライ等、対みず常時ばつぐんの特例（eff表示用。ダメージはエンジンが処理）。 */
  freezeDry?: boolean;
}

/** エンジンの target → 本アプリの対象種別。 */
function mapTarget(target: string | undefined): MoveTarget {
  if (target === 'allAdjacent') return 'all'; // 自分以外全体（味方巻き込み）
  if (target === 'allAdjacentFoes') return 'foes'; // 相手全体
  return 'single';
}

function buildMove(jp: string, en: string, crit?: boolean, freezeDry?: boolean): MoveDef {
  const mv = new Move(gen, en);
  if (!mv.bp && mv.bp !== 0) {
    throw new Error(`未解決の技: ${jp} (${en})`);
  }
  return {
    jp,
    en,
    type: TYPE_EN_TO_JP[mv.type],
    cat: mv.category === 'Physical' ? 'phys' : 'spec',
    target: mapTarget(mv.target),
    power: mv.bp,
    crit,
    hits: mv.hits && mv.hits > 1 ? mv.hits : undefined,
    freezeDry,
  };
}

/** キーは日本語技名（UI表示キー）。エンジンから解決して構築。 */
export const MOVES: Record<string, MoveDef> = Object.fromEntries(
  MOVE_ROWS.map((r) => [r.jp, buildMove(r.jp, r.en, r.crit, r.freezeDry)]),
);

/** 範囲技か（対象が複数=エンジンの Doubles で ×0.75 が掛かる）。 */
export const isSpreadMove = (m: MoveDef): boolean => m.target !== 'single';
