# Pokémon Champions ダメージ計算アプリ

ダブル主軸の「実戦コンパニオン」。Expo (React Native) + TypeScript。計算は `@smogon/calc`
（Gen9データ）に Champions アダプタを被せて行う。要件・試作・引き継ぎは `docs/` 参照。

## アーキテクチャ（層）

```
src/
  engine/                 計算コア（純粋ロジック・RN非依存・テスト対象）
    championsAdapter.ts    @smogon/calc ラッパ。ptsToEV / champPokemon / champCalc
    stats.ts               Champions実数値（rawStatsと厳密一致をテストで保証）
    result.ts              Result → 確定数モデル(analyze)。range()/kochance()を使用
    service.ts             日本語入力→計算→DamageModel。ダブル補正をField/Sideへマップ
  data/                   データ層（JP↔EN・差分override枠）
    roster.ts              ★入力データ: 種族/技の JP↔EN ＋ 技構成 だけを手で定義
    pokedex.ts moves.ts    roster + エンジンから種族値/タイプ/威力/分類/対象/hits を自動構築
    types/natures/items/typechart  + index(バレル & toChampMon)
  ui/
    theme.ts components.tsx calcModel.ts   盤面状態モデル＆状態→計算
  screens/
    DoublesScreen.tsx                       計算タブ（試作の移植・実エンジン接続）
    MatchupScreen.tsx                       相性タブ（防御相性・有効打・補完・テラス F-15〜17）
App.tsx                                     盤面状態とテーマを保持し、計算/相性タブを切替（状態共有）
```

## 設計の鉄則（崩すと精度が壊れる）

- **能力ポイント制は `EV = min(252, P×8)` の1行変換**でエンジンに載る（IV31/Lv50固定）。
  `championsStat()` がエンジン `rawStats` と全域一致することをテストで保証している。
- **構築後のミューテーション禁止。** `pokemon.stats` を書き換えると `maxHP()` がズレる。
  必ず `champPokemon()` のコンストラクタ経路で与える。
- **ダブル補正は手動倍率にしない。** 範囲×0.75・壁・てだすけ・フレンドガード・天候/フィールド・
  いかくは `service.ts` で Field/Side/boosts に渡し、エンジンに計算させる（自作より正確）。
- エンジンは**英語名**。UIは日本語。JP↔EN変換は `data/` で解決する。
- **ロスター/技の追加は `roster.ts` に1行足すだけ**（JP↔EN＋技構成）。種族値・タイプ・威力・
  分類・対象・ヒット数はエンジンが解決し、`pokedex.ts`/`moves.ts` がモジュール読込時に構築する。
  無効なEN名は構築時に例外を投げる（`roster.test.ts` が全件の解決と実計算を検証）。
- Champions固有差分（技威力調整・内定ロスター・メガ・ゼンブイリング等）は
  `overrides`（種族）/ `moveOpts.overrides`（技）の枠で上書きする想定（差分層は今後整備）。

## コマンド

- `npm test` — jest（engine/data/ui の純粋ロジック。`tsconfig.test.json` 使用）
- `npm run typecheck` — `tsc --noEmit`（テストは除外、ts-jest側で型検査）
- `npm run web` / `ios` / `android` — Expo 起動
- バンドル検証: `npx expo export --platform ios`（@smogon/calc が Hermes で通ることを確認済み）

## 状態

実装済み: ダブル計算・範囲複数対象・味方巻き込み・合算KO・ダブル補正（M1/M3）、
**耐久調整＝確定耐え逆算＋反映（F-12/F-14）**、**素早さ早見（F-13, engine/tuning.ts）**、
**タイプ相性・対策＝防御相性/弱点/有効打/パーティ補完/テラス相性（F-15〜17, data/typechart.ts）**、
ロスター40体（roster.ts・エンジン自動解決）。MVP の機能要件は一通り実装済み。
未着手: Champions差分層の本整備（技威力調整・メガ/ゼンブイリング・内定確定）、実機確認、構築保存等のフェーズ2。
