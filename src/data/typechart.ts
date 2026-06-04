// typechart.ts — タイプ相性（攻撃タイプ→防御タイプの倍率）。日本語タイプキー。
// eff の即時表示と、相性/対策機能(F-15〜F-17)で共用する。フリーズドライの対みず特例も扱う。

import { ALL_TYPES, type TypeJP } from './types';

/** 攻撃タイプ → { x2: ばつぐん, h: いまひとつ, z: こうかなし }。 */
export const CHART: Record<TypeJP, { x2: TypeJP[]; h: TypeJP[]; z: TypeJP[] }> = {
  ノーマル: { x2: [], h: ['いわ', 'はがね'], z: ['ゴースト'] },
  ほのお: { x2: ['くさ', 'こおり', 'むし', 'はがね'], h: ['ほのお', 'みず', 'いわ', 'ドラゴン'], z: [] },
  みず: { x2: ['ほのお', 'じめん', 'いわ'], h: ['みず', 'くさ', 'ドラゴン'], z: [] },
  でんき: { x2: ['みず', 'ひこう'], h: ['でんき', 'くさ', 'ドラゴン'], z: ['じめん'] },
  くさ: { x2: ['みず', 'じめん', 'いわ'], h: ['ほのお', 'くさ', 'どく', 'ひこう', 'むし', 'ドラゴン', 'はがね'], z: [] },
  こおり: { x2: ['くさ', 'じめん', 'ひこう', 'ドラゴン'], h: ['ほのお', 'みず', 'こおり', 'はがね'], z: [] },
  かくとう: { x2: ['ノーマル', 'こおり', 'いわ', 'あく', 'はがね'], h: ['どく', 'ひこう', 'エスパー', 'むし', 'フェアリー'], z: ['ゴースト'] },
  どく: { x2: ['くさ', 'フェアリー'], h: ['どく', 'じめん', 'いわ', 'ゴースト'], z: ['はがね'] },
  じめん: { x2: ['ほのお', 'でんき', 'どく', 'いわ', 'はがね'], h: ['くさ', 'むし'], z: ['ひこう'] },
  ひこう: { x2: ['くさ', 'かくとう', 'むし'], h: ['でんき', 'いわ', 'はがね'], z: [] },
  エスパー: { x2: ['かくとう', 'どく'], h: ['エスパー', 'はがね'], z: ['あく'] },
  むし: { x2: ['くさ', 'エスパー', 'あく'], h: ['ほのお', 'かくとう', 'どく', 'ひこう', 'ゴースト', 'はがね', 'フェアリー'], z: [] },
  いわ: { x2: ['ほのお', 'こおり', 'ひこう', 'むし'], h: ['かくとう', 'じめん', 'はがね'], z: [] },
  ゴースト: { x2: ['エスパー', 'ゴースト'], h: ['あく'], z: ['ノーマル'] },
  ドラゴン: { x2: ['ドラゴン'], h: ['はがね'], z: ['フェアリー'] },
  あく: { x2: ['エスパー', 'ゴースト'], h: ['かくとう', 'あく', 'フェアリー'], z: [] },
  はがね: { x2: ['こおり', 'いわ', 'フェアリー'], h: ['ほのお', 'みず', 'でんき', 'はがね'], z: [] },
  フェアリー: { x2: ['かくとう', 'ドラゴン', 'あく'], h: ['ほのお', 'どく', 'はがね'], z: [] },
};

/**
 * 攻撃タイプ vs 防御タイプ群の効果倍率。
 * @param freezeDry フリーズドライは対みずに常に×2（くさ・ドラゴン等との複合でも上書き加算）。
 */
export function typeEff(moveType: TypeJP, defTypes: TypeJP[], freezeDry?: boolean): number {
  let m = 1;
  const c = CHART[moveType];
  for (const dt of defTypes) {
    if (freezeDry && dt === 'みず') {
      m *= 2;
      continue;
    }
    if (c.z.includes(dt)) m *= 0;
    else if (c.x2.includes(dt)) m *= 2;
    else if (c.h.includes(dt)) m *= 0.5;
  }
  return m;
}

/* ------------------------- 相性・対策（F-15〜F-17） ------------------------- */

/** 防御相性表：各攻撃タイプ → この防御タイプ群への倍率。 */
export function defensiveMatchup(defTypes: TypeJP[]): Record<TypeJP, number> {
  const out = {} as Record<TypeJP, number>;
  for (const atk of ALL_TYPES) out[atk] = typeEff(atk, defTypes);
  return out;
}

export interface MatchupGroups {
  /** 倍率>1（×2, ×4）。倍率降順。 */
  weak: Array<{ type: TypeJP; mult: number }>;
  /** 0<倍率<1（×0.5, ×0.25）。倍率昇順。 */
  resist: Array<{ type: TypeJP; mult: number }>;
  /** 倍率0（無効）。 */
  immune: TypeJP[];
}

/** 防御相性を 弱点 / 半減 / 無効 に分類（テラス反映後の defTypes を渡す）。 */
export function summarizeDefense(defTypes: TypeJP[]): MatchupGroups {
  const chart = defensiveMatchup(defTypes);
  const weak: MatchupGroups['weak'] = [];
  const resist: MatchupGroups['resist'] = [];
  const immune: TypeJP[] = [];
  for (const ty of ALL_TYPES) {
    const m = chart[ty];
    if (m === 0) immune.push(ty);
    else if (m > 1) weak.push({ type: ty, mult: m });
    else if (m < 1) resist.push({ type: ty, mult: m });
  }
  weak.sort((a, b) => b.mult - a.mult);
  resist.sort((a, b) => a.mult - b.mult);
  return { weak, resist, immune };
}

/** 攻撃タイプ群が防御タイプ群へ通る最大倍率（有効打判定 F-16）。freezeDry 等は無視の素相性。 */
export function bestOffense(atkTypes: TypeJP[], defTypes: TypeJP[]): number {
  return Math.max(0, ...atkTypes.map((at) => typeEff(at, defTypes)));
}

/** 味方2体が共通で弱点とするタイプ（同時に崩されうる穴。パーティ補完 F-15）。 */
export function sharedWeaknesses(typesA: TypeJP[], typesB: TypeJP[]): TypeJP[] {
  const a = defensiveMatchup(typesA);
  const b = defensiveMatchup(typesB);
  return ALL_TYPES.filter((ty) => a[ty] > 1 && b[ty] > 1);
}
