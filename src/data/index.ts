// data/index.ts — データ層のバレル＆JP入力→エンジン入力の橋渡し。

import type { ChampMon, StatPts } from '../engine/championsAdapter';
import { POKEDEX } from './pokedex';
import { MOVES, type MoveDef } from './moves';
import { NATURE_JP_TO_EN, NEUTRAL_NATURE } from './natures';
import { TYPE_JP_TO_EN, type TypeJP } from './types';
import type { StatID } from '@smogon/calc';

export * from './types';
export * from './natures';
export * from './moves';
export * from './pokedex';

/** UI が保持する1体ぶんの入力（すべて日本語キー）。 */
export interface MonInput {
  /** 日本語種族名（POKEDEX のキー）。 */
  speciesJP: string;
  /** 能力ポイント（各 0..32）。 */
  pts?: StatPts;
  /** 日本語性格名。未指定なら無補正。 */
  natureJP?: string;
  item?: string;
  ability?: string;
  /** 日本語テラスタイプ。on のときのみ反映する想定。 */
  teraJP?: TypeJP | null;
  /** ランク補正。 */
  boosts?: Partial<Record<StatID, number>>;
}

/** 日本語技名 → MoveDef。 */
export const moveByJP = (jp: string): MoveDef | undefined => MOVES[jp];

/** 日本語種族名 → 英語名。未知なら入力をそのまま返す（差分層フォールバック）。 */
export const speciesEN = (jp: string): string => POKEDEX[jp]?.en ?? jp;

/** 日本語技名 → 英語名。未知なら入力をそのまま返す。 */
export const moveEN = (jp: string): string => MOVES[jp]?.en ?? jp;

/** JP入力 → アダプタの ChampMon へ変換。種族 overrides も引き継ぐ。 */
export function toChampMon(input: MonInput): ChampMon {
  const dex = POKEDEX[input.speciesJP];
  return {
    species: dex?.en ?? input.speciesJP,
    nature: input.natureJP ? NATURE_JP_TO_EN[input.natureJP] ?? NEUTRAL_NATURE : NEUTRAL_NATURE,
    pts: input.pts,
    item: input.item,
    ability: input.ability,
    teraType: input.teraJP ? TYPE_JP_TO_EN[input.teraJP] : undefined,
    boosts: input.boosts,
    overrides: dex?.overrides,
  };
}
export * from './items';
export * from './typechart';
