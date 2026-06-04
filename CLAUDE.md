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
    types/natures/moves/pokedex/items/typechart  + index(バレル & toChampMon)
  ui/
    theme.ts components.tsx calcModel.ts   盤面状態モデル＆状態→計算
  screens/DoublesScreen.tsx                 ダブル計算画面（試作の移植・実エンジン接続）
```

## 設計の鉄則（崩すと精度が壊れる）

- **能力ポイント制は `EV = min(252, P×8)` の1行変換**でエンジンに載る（IV31/Lv50固定）。
  `championsStat()` がエンジン `rawStats` と全域一致することをテストで保証している。
- **構築後のミューテーション禁止。** `pokemon.stats` を書き換えると `maxHP()` がズレる。
  必ず `champPokemon()` のコンストラクタ経路で与える。
- **ダブル補正は手動倍率にしない。** 範囲×0.75・壁・てだすけ・フレンドガード・天候/フィールド・
  いかくは `service.ts` で Field/Side/boosts に渡し、エンジンに計算させる（自作より正確）。
- エンジンは**英語名**。UIは日本語。JP↔EN変換は `data/` で解決する。
- Champions固有差分（技威力調整・内定ロスター・メガ・ゼンブイリング等）は
  `overrides`（種族）/ `moveOpts.overrides`（技）の枠で上書きする想定（差分層は今後整備）。

## コマンド

- `npm test` — jest（engine/data/ui の純粋ロジック。`tsconfig.test.json` 使用）
- `npm run typecheck` — `tsc --noEmit`（テストは除外、ts-jest側で型検査）
- `npm run web` / `ios` / `android` — Expo 起動
- バンドル検証: `npx expo export --platform ios`（@smogon/calc が Hermes で通ることを確認済み）

## 状態

MVP の中核（ダブル計算・範囲複数対象・味方巻き込み・合算KO・ダブル補正）まで実装・接続済み。
未着手: 耐久/素早さ調整(F-12〜14)、タイプ相性/対策(F-15〜17)、ロスター拡充、差分層の本整備。
