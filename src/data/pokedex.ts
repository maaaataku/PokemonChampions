// pokedex.ts — ロスター（種族）。JP↔EN と技構成(roster.ts)を入力に、
// 種族値・タイプはエンジン(Gen9)から自動解決して構築する。
// Champions 固有の種族差分は overrides で別途上書きする想定（今は未設定）。

import { Pokemon, type StatID, type State } from '@smogon/calc';
import { gen } from '../engine/championsAdapter';
import { TYPE_EN_TO_JP, type TypeJP } from './types';
import { SPECIES_ROWS } from './roster';
import { applySpeciesOverride, getSpeciesOverride } from './champions';

export interface SpeciesDef {
  jp: string;
  /** 英語種族名（@smogon/calc 用。フォルム差に注意）。 */
  en: string;
  types: TypeJP[];
  /** 種族値（エンジン値）。 */
  base: Record<StatID, number>;
  /** 技構成（UIプリセット）。 */
  moves: string[];
  /** Champions 固有の種族データ上書き（計算へ流すエンジン用。差分が無ければ undefined）。 */
  overrides?: State.Pokemon['overrides'];
  /** Champions差分が適用されているか（UIバッジ用）。 */
  champAdjusted?: boolean;
  /** その差分が実機照合済みか（false=暫定値。UIバッジの色分け用）。 */
  champVerified?: boolean;
}

function buildSpecies(jp: string, en: string, moves: string[]): SpeciesDef {
  const p = new Pokemon(gen, en, { level: 50 });
  const sp = p.species;
  if (!sp || !sp.baseStats) {
    throw new Error(`未解決の種族: ${jp} (${en})`);
  }
  const bs = sp.baseStats;
  return {
    jp,
    en,
    types: sp.types.map((t) => TYPE_EN_TO_JP[t]),
    base: { hp: bs.hp, atk: bs.atk, def: bs.def, spa: bs.spa, spd: bs.spd, spe: bs.spe },
    moves,
  };
}

/** ロスターを構築（ベース層＝エンジン解決値 ＋ Champions差分）。 */
export function buildPokedex(): Record<string, SpeciesDef> {
  return Object.fromEntries(
    SPECIES_ROWS.map((r) => {
      const base = buildSpecies(r.jp, r.en, r.moves);
      return [r.jp, applySpeciesOverride(base, getSpeciesOverride(r.jp))];
    }),
  );
}

/** キーは日本語種族名（UI表示キー）。 */
export let POKEDEX: Record<string, SpeciesDef> = buildPokedex();

/** 差分セット差し替え後にロスターを再構築する（配信差分の反映）。 */
export function rebuildPokedex(): Record<string, SpeciesDef> {
  POKEDEX = buildPokedex();
  return POKEDEX;
}

/** UIの検索用：名前またはタイプ（日本語）で部分一致。 */
export function searchSpecies(query: string): SpeciesDef[] {
  const list = Object.values(POKEDEX);
  if (!query) return list;
  return list.filter(
    (p) => p.jp.includes(query) || p.types.some((ty) => ty.includes(query)),
  );
}
