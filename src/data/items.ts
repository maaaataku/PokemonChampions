// items.ts — もちものの UI キー ↔ エンジン英語名。
// こだわり系は物理/特殊で Band/Specs を出し分け、補正はエンジンが適用する。

export type AtkItemKey = 'none' | 'band' | 'tama';
export type DefItemKey = 'none' | 'vest';

export const ATK_ITEM_LABELS: Array<[AtkItemKey, string]> = [
  ['none', 'なし'],
  ['band', 'こだわり ×1.5'],
  ['tama', 'いのちのたま ×1.3'],
];
export const DEF_ITEM_LABELS: Array<[DefItemKey, string]> = [
  ['none', 'なし'],
  ['vest', 'とつげきチョッキ'],
];

/** 攻撃側もちもの → 英語名。こだわりは物理=Band / 特殊=Specs。 */
export function atkItemEN(key: AtkItemKey, isPhys: boolean): string | undefined {
  switch (key) {
    case 'band':
      return isPhys ? 'Choice Band' : 'Choice Specs';
    case 'tama':
      return 'Life Orb';
    default:
      return undefined;
  }
}

/** 防御側もちもの → 英語名。 */
export function defItemEN(key: DefItemKey): string | undefined {
  return key === 'vest' ? 'Assault Vest' : undefined;
}
