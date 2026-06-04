// champions.ts — Champions 差分層（要件 §8 / handoff §3）。
// ベース層（@smogon/calc のGen9データをエンジンが解決した値）に対し、Champions 固有の
// 差分（技威力の調整・種族/タイプ差分 等）を重ねる。差分は「表示値」と「計算値(エンジンへ渡す
// overrides)」の両方に反映する（片方だけだと確定数がズレるため）。
//
// 【配信(N-6)】差分は version 付きの ChampionsPatch。setActivePatch() で差し替え可能にし、
//   起動時にローカル同梱パッチ→（将来）リモート差分の順で適用する構成を想定。
// 【精度(N-5)】各エントリは verified（実機照合済みか）を持つ。本体同梱は空＝既定では何も変えない。
//   実値は実機照合で BUILTIN_PATCH に追記する（誤った差分を「正」として出荷しない）。

import type { StatID, State } from '@smogon/calc';
import type { TypeName } from '@smogon/calc/dist/data/interface';
import { TYPE_JP_TO_EN, type TypeJP } from './types';
import type { MoveDef, MoveTarget } from './moves';
import type { SpeciesDef } from './pokedex';

/** 技のChampions差分。未指定の項目はエンジン値（ベース層）をそのまま使う。 */
export interface MoveOverride {
  /** Champions調整後の威力。 */
  basePower?: number;
  type?: TypeJP;
  category?: 'phys' | 'spec';
  target?: MoveTarget;
  /** 実機照合済みか（false/未指定は暫定値）。 */
  verified?: boolean;
  /** 出典・メモ。 */
  note?: string;
}

/** 種族のChampions差分。 */
export interface SpeciesOverride {
  baseStats?: Partial<Record<StatID, number>>;
  types?: TypeJP[];
  verified?: boolean;
  note?: string;
}

/** 配信単位の差分セット。 */
export interface ChampionsPatch {
  version: string;
  updatedAt: string;
  /** key = 日本語技名。 */
  moves: Record<string, MoveOverride>;
  /** key = 日本語種族名。 */
  species: Record<string, SpeciesOverride>;
}

/**
 * 本体同梱パッチ。**既定は空**（ベース層をそのまま使用）。
 * Champions の調整値は実機照合で確定し次第ここに追記する。
 */
export const BUILTIN_PATCH: ChampionsPatch = {
  version: '0.0.0-empty',
  updatedAt: '2026-06-04',
  moves: {},
  species: {},
};

let activePatch: ChampionsPatch = BUILTIN_PATCH;

/** 現在有効な差分セット。 */
export const getActivePatch = (): ChampionsPatch => activePatch;

/**
 * 差分セットを差し替える（配信差分の適用フック）。
 * 差し替え後は data 層の再構築（rebuildMoves/rebuildPokedex）が必要。
 */
export function setActivePatch(patch: ChampionsPatch): void {
  activePatch = patch;
}

export const getMoveOverride = (jp: string): MoveOverride | undefined => activePatch.moves[jp];
export const getSpeciesOverride = (jp: string): SpeciesOverride | undefined => activePatch.species[jp];

/* ------------------------- 適用（表示値 + エンジン値） ------------------------- */

/** 計算時にエンジンの Move へ渡す overrides を差分から生成。 */
export function toEngineMoveOverride(ov: MoveOverride): State.Move['overrides'] {
  const out: Record<string, unknown> = {};
  if (ov.basePower != null) out.basePower = ov.basePower;
  if (ov.type) out.type = TYPE_JP_TO_EN[ov.type];
  if (ov.category) out.category = ov.category === 'phys' ? 'Physical' : 'Special';
  return out as State.Move['overrides'];
}

/** 計算時にエンジンの Pokemon へ渡す overrides を差分から生成。 */
export function toEngineSpeciesOverride(ov: SpeciesOverride): State.Pokemon['overrides'] {
  const out: Record<string, unknown> = {};
  if (ov.baseStats) out.baseStats = ov.baseStats;
  if (ov.types) out.types = ov.types.map((t) => TYPE_JP_TO_EN[t]) as TypeName[];
  return out as State.Pokemon['overrides'];
}

/** 技定義に差分を適用（表示値を上書きし、計算用 engineOverride と champAdjusted を付与）。 */
export function applyMoveOverride(base: MoveDef, ov?: MoveOverride): MoveDef {
  if (!ov) return base;
  return {
    ...base,
    power: ov.basePower ?? base.power,
    type: ov.type ?? base.type,
    cat: ov.category ?? base.cat,
    target: ov.target ?? base.target,
    engineOverride: toEngineMoveOverride(ov),
    champAdjusted: true,
  };
}

/** 種族定義に差分を適用（表示値を上書きし、計算用 overrides と champAdjusted を付与）。 */
export function applySpeciesOverride(base: SpeciesDef, ov?: SpeciesOverride): SpeciesDef {
  if (!ov) return base;
  return {
    ...base,
    base: { ...base.base, ...ov.baseStats },
    types: ov.types ?? base.types,
    overrides: toEngineSpeciesOverride(ov),
    champAdjusted: true,
  };
}

/**
 * 例示用パッチ（テスト/デモ専用。**出荷しない**）。
 * 「差分を入れると表示とダメージの両方が変わる」ことを実証するための仮値。
 */
export const EXAMPLE_PATCH: ChampionsPatch = {
  version: '0.0.0-example',
  updatedAt: '2026-06-04',
  moves: {
    // 例: じしんが Champions では威力120に調整されている、という仮定（未検証）。
    じしん: { basePower: 120, verified: false, note: '例示用の仮値（実機未照合）' },
  },
  species: {
    // 例: カバルドンの防御種族値が Champions で 100 に変更、という仮定（未検証）。
    カバルドン: { baseStats: { def: 100 }, verified: false, note: '例示用の仮値（実機未照合）' },
  },
};
