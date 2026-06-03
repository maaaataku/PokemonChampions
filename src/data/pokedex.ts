// pokedex.ts — ロスター（種族）の日本語↔英語マッピングと表示用メタ。
// 種族値・タイプの本体値はエンジン内蔵データを正とする。ここの base/types は
// UI即時表示と整合チェック用のミラー。Champions 差分は overrides で別途上書きする。

import type { StatID, State } from '@smogon/calc';
import type { TypeJP } from './types';

export interface SpeciesDef {
  jp: string;
  /** 英語種族名（@smogon/calc 用。フォルム差に注意）。 */
  en: string;
  types: TypeJP[];
  /** 種族値ミラー（表示・整合チェック用）。 */
  base: Record<StatID, number>;
  /** 試作の技構成（UIプリセット。差分層で精緻化予定）。 */
  moves: string[];
  /** Champions 固有の種族データ上書き（必要時のみ）。 */
  overrides?: State.Pokemon['overrides'];
}

/** キーは日本語種族名（UI表示キー）。 */
export const POKEDEX: Record<string, SpeciesDef> = {
  ガブリアス: {
    jp: 'ガブリアス', en: 'Garchomp', types: ['じめん', 'ドラゴン'],
    base: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
    moves: ['じしん', 'いわなだれ', 'げきりん', 'アイアンヘッド'],
  },
  カイリュー: {
    jp: 'カイリュー', en: 'Dragonite', types: ['ドラゴン', 'ひこう'],
    base: { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80 },
    moves: ['げきりん', 'じしん', 'いわなだれ', 'インファイト'],
  },
  ハバタクカミ: {
    jp: 'ハバタクカミ', en: 'Flutter Mane', types: ['ゴースト', 'フェアリー'],
    base: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 },
    moves: ['ムーンフォース', 'シャドーボール', 'かえんほうしゃ', 'フリーズドライ'],
  },
  ウーラオス: {
    // すいりゅうれんだ＝れんげきのかた（みず/かくとう）
    jp: 'ウーラオス', en: 'Urshifu-Rapid-Strike', types: ['かくとう', 'みず'],
    base: { hp: 100, atk: 130, def: 100, spa: 63, spd: 60, spe: 97 },
    moves: ['すいりゅうれんだ', 'インファイト', 'とんぼがえり', 'いわなだれ'],
  },
  イーユイ: {
    jp: 'イーユイ', en: 'Chi-Yu', types: ['あく', 'ほのお'],
    base: { hp: 55, atk: 80, def: 80, spa: 135, spd: 120, spe: 100 },
    moves: ['ねっぷう', 'かえんほうしゃ', 'シャドーボール', 'だいちのちから'],
  },
  ディンルー: {
    jp: 'ディンルー', en: 'Ting-Lu', types: ['あく', 'じめん'],
    base: { hp: 155, atk: 110, def: 125, spa: 55, spd: 80, spe: 45 },
    moves: ['じしん', 'いわなだれ', 'あんこくきょうだ', 'とんぼがえり'],
  },
  ランドロス: {
    // 霊獣フォルム（じめん/ひこう・A145）
    jp: 'ランドロス', en: 'Landorus-Therian', types: ['じめん', 'ひこう'],
    base: { hp: 89, atk: 145, def: 90, spa: 105, spd: 80, spe: 91 },
    moves: ['じしん', 'いわなだれ', 'とんぼがえり', 'インファイト'],
  },
  カバルドン: {
    jp: 'カバルドン', en: 'Hippowdon', types: ['じめん'],
    base: { hp: 108, atk: 112, def: 118, spa: 68, spd: 72, spe: 47 },
    moves: ['じしん', 'ストーンエッジ', 'アイアンヘッド'],
  },
  テツノツツミ: {
    jp: 'テツノツツミ', en: 'Iron Bundle', types: ['こおり', 'みず'],
    base: { hp: 56, atk: 80, def: 114, spa: 124, spd: 60, spe: 136 },
    moves: ['フリーズドライ', 'ハイドロポンプ', 'だいちのちから', 'シャドーボール'],
  },
  モロバレル: {
    jp: 'モロバレル', en: 'Amoonguss', types: ['くさ', 'どく'],
    base: { hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30 },
    moves: ['だいちのちから', 'シャドーボール'],
  },
};

/** UIの検索用：名前またはタイプ（日本語）で部分一致。 */
export function searchSpecies(query: string): SpeciesDef[] {
  const list = Object.values(POKEDEX);
  if (!query) return list;
  return list.filter(
    (p) => p.jp.includes(query) || p.types.some((ty) => ty.includes(query)),
  );
}
