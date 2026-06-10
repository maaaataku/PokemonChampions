// constants.ts — アプリ全体の定数（公開URL・バージョン等）。公開前に実値へ差し替える。

/** 表示バージョン（app.json の version と手動同期）。 */
export const APP_VERSION = '1.0.0';

/**
 * 開発支援（GitHub Sponsors）。**アプリ内には置かない**（課金規約配慮）。
 * ストア説明文・ウェブ/GitHub 側の導線でのみ使用する。未開設の間はプレースホルダ。
 */
export const SPONSORS_URL = 'https://github.com/sponsors/maaaataku';

/** 計算エンジンの出典（MIT）。 */
export const SMOGON_CALC_URL = 'https://github.com/smogon/damage-calc';

/** プライバシーポリシー公開URL（GitHub Pages 等で公開後に設定。空なら非表示）。 */
export const PRIVACY_URL = '';
