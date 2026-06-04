// pokedex.ts — ロスター（種族）。JP↔EN と技構成(roster.ts)を入力に、
// 種族値・タイプはエンジン(Gen9)から自動解決して構築する。
// Champions 固有の種族差分は overrides で別途上書きする想定（今は未設定）。

import { Pokemon, type StatID, type State } from '@smogon/calc';
import { gen } from '../engine/championsAdapter';
import { TYPE_EN_TO_JP, type TypeJP } from './types';
import { SPECIES_ROWS } from './roster';

export interface SpeciesDef {
  jp: string;
  /** 英語種族名（@smogon/calc 用。フォルム差に注意）。 */
  en: string;
  types: TypeJP[];
  /** 種族値（エンジン値）。 */
  base: Record<StatID, number>;
  /** 技構成（UIプリセット）。 */
  moves: string[];
  /** Champions 固有の種族データ上書き（必要時のみ）。 */
  overrides?: State.Pokemon['overrides'];
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

/** キーは日本語種族名（UI表示キー）。エンジンから解決して構築。 */
export const POKEDEX: Record<string, SpeciesDef> = Object.fromEntries(
  SPECIES_ROWS.map((r) => [r.jp, buildSpecies(r.jp, r.en, r.moves)]),
);

/** UIの検索用：名前またはタイプ（日本語）で部分一致。 */
export function searchSpecies(query: string): SpeciesDef[] {
  const list = Object.values(POKEDEX);
  if (!query) return list;
  return list.filter(
    (p) => p.jp.includes(query) || p.types.some((ty) => ty.includes(query)),
  );
}
