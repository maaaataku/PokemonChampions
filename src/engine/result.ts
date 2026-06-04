// result.ts — エンジンの Result を UI 用の確定数モデルへ変換する。
// 数値は range()（多段技も合算済み）、1発KO確率は kochance() を用いる。
// 表現は試作 DoublesCalcWireframe.jsx の確定数分類に合わせる。

import type { Result } from '@smogon/calc';

export type KoKind = 'ohko' | 'roll1' | 'nhko' | 'rolln' | 'none';

export interface KoModel {
  label: string;
  sub: string;
  kind: KoKind;
}

export interface DamageModel {
  min: number;
  max: number;
  maxHP: number;
  minPct: number;
  maxPct: number;
  /** タイプ相性倍率（表示用。呼び出し側が typeEff で算出して渡す）。 */
  eff: number;
  ko: KoModel;
}

/** UI配色キーに対応する確定数色。 */
export const KO_COLORS: Record<KoKind, string> = {
  ohko: '#ff5a45',
  roll1: '#ff8a3d',
  nhko: '#ffc24a',
  rolln: '#ffd66b',
  none: '#5a6678',
};

/**
 * Result + 効果倍率 から確定数モデルを生成。
 * @param result @smogon/calc の計算結果
 * @param eff タイプ相性倍率（0 ならこうかなし表示。Result から別途算出して渡す）
 */
export function analyze(result: Result, eff: number): DamageModel {
  const [min, max] = result.range();
  const maxHP = result.defender.maxHP();
  const minPct = (min / maxHP) * 100;
  const maxPct = (max / maxHP) * 100;

  let ko: KoModel;
  if (eff === 0 || max <= 0) {
    ko = { label: 'こうかなし', sub: '', kind: 'none' };
  } else {
    const best = Math.ceil(maxHP / max); // 最速（最大乱数）で落とせる発数
    const worst = min > 0 ? Math.ceil(maxHP / min) : Infinity; // 確定（最小乱数）発数
    if (best === 1) {
      if (min >= maxHP) {
        ko = { label: '確定1発', sub: '乱数なし', kind: 'ohko' };
      } else {
        const chance = result.kochance().chance;
        const pct = chance != null ? Math.round(chance * 100) : Math.round((countKO(result, maxHP) / 16) * 100);
        ko = { label: '乱数1発', sub: `${pct}%`, kind: 'roll1' };
      }
    } else if (worst === best) {
      ko = { label: `確定${best}発`, sub: '乱数なし', kind: 'nhko' };
    } else {
      ko = { label: `乱数${best}発`, sub: `確定${worst}発`, kind: 'rolln' };
    }
  }

  return { min, max, maxHP, minPct, maxPct, eff, ko };
}

/** kochance が chance を返さない場合のフォールバック（16乱数のうちKO到達数）。 */
function countKO(result: Result, maxHP: number): number {
  const dmg = result.damage;
  const rolls = Array.isArray(dmg) ? (dmg as number[]).flat() : [dmg as number];
  return rolls.filter((d) => d >= maxHP).length;
}
