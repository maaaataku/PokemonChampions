// championsAdapter.ts
// -----------------------------------------------------------------------------
// Pokémon Champions の能力システムを @smogon/calc に橋渡しするアダプタ（TS版）。
//
// 【検証済みの根拠】(docs/files/champions-adapter.js の probe / 本リポジトリのテストで実測)
//   Champions 実数値 = floor((種族値*2 + 31 + 能力P*2) * 50/100 (+5/*nature or +60)) は、
//   本編Gen9式 (Lv50, IV31, EV) において EV = min(252, 能力P*8) を与えると【全域で厳密一致】。
//   ・能力P=32 → EV=256→252にクランプされるが、式中のfloorが差を吸収し一致する。
//   ・合計66能力P(=520EV相当)でもエンジンは各能力を独立計算し、510上限でクランプしない。
//   よって構築後のミューテーションは不要で、ダメージ乱数・確定数・%・ダブル範囲・
//   テラスタルが全てエンジン標準経路で正しく算出される。
//
// 【重要・ミューテーション禁止】
//   pokemon.stats を直接書き換えると calculate() のクローン・再計算で maxHP()
//   (= rawStats.hp 駆動) に反映されず確定数がズレる。必ずコンストラクタ経路で与える。
//
// 【データ基盤の注意】
//   エンジンの内蔵データは本編Gen9。Champions固有の差分（技威力の調整、内定ロスター、
//   メガ可否、特性/道具の挙動、ゼンブイリング 等）は overrides で species/move 単位に上書きする。
// -----------------------------------------------------------------------------

import {
  Pokemon,
  Move,
  Field,
  Result,
  calculate,
  Generations,
} from '@smogon/calc';
import type { StatID, State } from '@smogon/calc';

/** 計算に用いる世代（Champions は本編Gen9データを基盤に使用）。 */
export const gen = Generations.get(9);

/** 1能力あたりの努力値上限（本編準拠）。 */
export const MAX_EV = 252;

/** 能力ポイント表（hp/atk/def/spa/spd/spe、各 0..32）。 */
export type StatPts = Partial<Record<StatID, number>>;

/**
 * 能力ポイント → 努力値変換。
 * `EV = min(252, max(0, pts) * 8)`。この1行変換で Champions 実数値が本編式と厳密一致する。
 */
export const ptsToEV = (p: number): number => Math.min(MAX_EV, Math.max(0, p | 0) * 8);

/** Champions のポケモン定義。species/nature は英語名（JP↔EN はデータ層で解決）。 */
export interface ChampMon {
  /** 英語種族名（例 'Garchomp'）。 */
  species: string;
  /** 本編式の性格名（例 'Adamant'）。補正値は Champions と同一。 */
  nature?: string;
  /** 能力ポイント（各 0..32）。 */
  pts?: StatPts;
  item?: string;
  ability?: string;
  /** テラスタイプ（英語タイプ名、例 'Ground'）。 */
  teraType?: State.Pokemon['teraType'];
  /** ランク補正（例 { atk: 1, def: -1 }）。 */
  boosts?: Partial<Record<StatID, number>>;
  /** Champions 固有の種族データ上書き（baseStats・types・ability 等）。 */
  overrides?: State.Pokemon['overrides'];
  /** 既定 Lv50。実質固定だが将来用に露出。 */
  level?: number;
}

/** champCalc のオプション。 */
export interface ChampCalcOpts {
  /** true で Field を Doubles にし、範囲技へ自動で ×0.75 を適用させる。 */
  doubles?: boolean;
  /** 天候・フィールド・壁などの追加状態。gameType は doubles から自動設定。 */
  field?: Partial<State.Field>;
  /** Move のオプション（急所・ヒット数・威力上書きなど）。 */
  moveOpts?: ConstructorParameters<typeof Move>[2];
}

/**
 * Champions のポケモン定義から @smogon/calc の Pokemon を生成する。
 * IV31・Lv50 固定。能力ポイントは EV へ変換して必ずコンストラクタ経路で与える。
 */
export function champPokemon(c: ChampMon): Pokemon {
  const evs: Partial<Record<StatID, number>> = {};
  for (const [k, v] of Object.entries(c.pts ?? {})) {
    evs[k as StatID] = ptsToEV(v ?? 0);
  }
  return new Pokemon(gen, c.species, {
    level: c.level ?? 50,
    nature: c.nature,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs,
    item: c.item,
    ability: c.ability,
    teraType: c.teraType,
    boosts: c.boosts,
    overrides: c.overrides, // Champions固有の種族/特性差分を注入
  });
}

/**
 * Champions のダメージ計算を実行する。
 * @param attacker 攻撃側 ChampMon
 * @param defender 防御側 ChampMon
 * @param moveName 英語技名（例 'Earthquake'）
 * @param opts ダブル・フィールド・技オプション
 * @returns @smogon/calc の Result（damage=16乱数 / desc() / kochance()）
 */
export function champCalc(
  attacker: ChampMon,
  defender: ChampMon,
  moveName: string,
  opts: ChampCalcOpts = {},
): Result {
  const field = new Field({
    gameType: opts.doubles ? 'Doubles' : 'Singles',
    ...(opts.field ?? {}),
  });
  return calculate(
    gen,
    champPokemon(attacker),
    champPokemon(defender),
    new Move(gen, moveName, opts.moveOpts),
    field,
  );
}
