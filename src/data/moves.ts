// moves.ts — 技の日本語↔英語マッピングと、UI/計算に必要なメタ情報。
// 威力・タイプなどの本体値はエンジン内蔵データを正とする。Champions 調整値は
// championsPower に持たせ、差分層が必要時に moveOpts.overrides へ注入する。

import type { TypeJP } from './types';

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
  /** 表示・概算用の威力（エンジン値の参照ミラー）。 */
  power: number;
  /** Champions 固有の威力調整（未設定ならエンジン値を使用）。 */
  championsPower?: number;
  /** 常時急所（あんこくきょうだ・すいりゅうれんだ等）。 */
  crit?: boolean;
  /** 連続技のヒット数。 */
  hits?: number;
  /** フリーズドライ等、対みず常時ばつぐんの特例（eff表示用。ダメージはエンジンが処理）。 */
  freezeDry?: boolean;
}

/** 試作ロスターの技。キーは日本語名（UI表示キー）。 */
export const MOVES: Record<string, MoveDef> = {
  じしん: { jp: 'じしん', en: 'Earthquake', type: 'じめん', cat: 'phys', power: 100, target: 'all' },
  いわなだれ: { jp: 'いわなだれ', en: 'Rock Slide', type: 'いわ', cat: 'phys', power: 75, target: 'foes' },
  ねっぷう: { jp: 'ねっぷう', en: 'Heat Wave', type: 'ほのお', cat: 'spec', power: 95, target: 'foes' },
  げきりん: { jp: 'げきりん', en: 'Outrage', type: 'ドラゴン', cat: 'phys', power: 120, target: 'single' },
  ストーンエッジ: { jp: 'ストーンエッジ', en: 'Stone Edge', type: 'いわ', cat: 'phys', power: 100, target: 'single' },
  アイアンヘッド: { jp: 'アイアンヘッド', en: 'Iron Head', type: 'はがね', cat: 'phys', power: 80, target: 'single' },
  インファイト: { jp: 'インファイト', en: 'Close Combat', type: 'かくとう', cat: 'phys', power: 120, target: 'single' },
  とんぼがえり: { jp: 'とんぼがえり', en: 'U-turn', type: 'むし', cat: 'phys', power: 70, target: 'single' },
  あんこくきょうだ: { jp: 'あんこくきょうだ', en: 'Wicked Blow', type: 'あく', cat: 'phys', power: 75, target: 'single', crit: true },
  すいりゅうれんだ: { jp: 'すいりゅうれんだ', en: 'Surging Strikes', type: 'みず', cat: 'phys', power: 25, target: 'single', crit: true, hits: 3 },
  ムーンフォース: { jp: 'ムーンフォース', en: 'Moonblast', type: 'フェアリー', cat: 'spec', power: 95, target: 'single' },
  シャドーボール: { jp: 'シャドーボール', en: 'Shadow Ball', type: 'ゴースト', cat: 'spec', power: 80, target: 'single' },
  かえんほうしゃ: { jp: 'かえんほうしゃ', en: 'Flamethrower', type: 'ほのお', cat: 'spec', power: 90, target: 'single' },
  だいちのちから: { jp: 'だいちのちから', en: 'Earth Power', type: 'じめん', cat: 'spec', power: 90, target: 'single' },
  ハイドロポンプ: { jp: 'ハイドロポンプ', en: 'Hydro Pump', type: 'みず', cat: 'spec', power: 110, target: 'single' },
  フリーズドライ: { jp: 'フリーズドライ', en: 'Freeze-Dry', type: 'こおり', cat: 'spec', power: 70, target: 'single', freezeDry: true },
};

/** 範囲技か（対象が複数=エンジンの Doubles で ×0.75 が掛かる）。 */
export const isSpreadMove = (m: MoveDef): boolean => m.target !== 'single';
