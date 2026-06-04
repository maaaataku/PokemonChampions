# Pokémon Champions ダメージ計算アプリ

ダブル主軸の「実戦コンパニオン」。ゲーム内ランク対戦（ダブル中心）の高ストレス状況で、
最短タップで確定数と調整がわかるスマホ特化ツール。

**スタック:** Expo (React Native) + TypeScript / 計算エンジンは [`@smogon/calc`](https://github.com/smogon/damage-calc)（Gen9データ）＋ Champions アダプタ。

> 要件・試作・引き継ぎは [`docs/`](docs/) を参照。設計の鉄則は [`CLAUDE.md`](CLAUDE.md)。

---

## セットアップ

```bash
npm install
npm run web      # ブラウザで起動（react-native-web）
npm run ios      # iOS（要 Xcode / シミュレータ）
npm run android  # Android（要 Android Studio / エミュレータ）
```

## 開発コマンド

| コマンド | 内容 |
|---|---|
| `npm test` | jest（engine/data/ui/storage の純粋ロジック。`tsconfig.test.json` 使用） |
| `npm run typecheck` | `tsc --noEmit`（テストは除外、ts-jest 側で型検査） |
| `npm run web` / `ios` / `android` | Expo 起動 |
| `npx expo export --platform ios` | バンドル検証（@smogon/calc が Hermes で通ることを確認済み） |

## 実装済み機能

- **ダブル計算**（2v2盤面・範囲技の複数対象同時表示・味方巻き込み警告・合算KO）
- **ダブル補正**（範囲×0.75・壁・てだすけ・いかく・フレンドガード・急所・天候/フィールド）
- **全技ダメ計／両方向計算**（与ダメ＝攻撃役の全技を相手へ降順、被ダメ＝相手→攻撃役）
- **耐久/素早さ調整**（確定耐えの最小投資逆算＋ワンタップ反映、素早さ早見＝スカーフ/追い風/まひ/トリル）
- **タイプ相性・対策**（防御相性・弱点/有効打・パーティ補完・テラスで変わる相性）
- **構築管理**（盤面プリセットの保存/読込/削除、共有コードでのエクスポート/インポート）
- ロスター40体（主要VGCポケモン）

## アーキテクチャ

```
src/
  engine/    計算コア（純粋ロジック・RN非依存・テスト対象）
    championsAdapter.ts  @smogon/calc ラッパ。ptsToEV / champPokemon / champCalc
    stats.ts             Champions実数値（rawStatsと厳密一致をテストで保証）
    result.ts            Result → 確定数モデル（range()/kochance()）
    service.ts           日本語入力→計算→DamageModel（ダブル補正をField/Side/boostsへ）
    tuning.ts            耐久逆算・素早さ実数値
  data/      データ層（二層構成）
    roster.ts            ★入力: 種族/技の JP↔EN ＋ 技構成 だけを手で定義
    champions.ts         ★Champions差分層（パッチ型/空のBUILTIN_PATCH/差し替え/適用）
    pokedex.ts moves.ts  roster + エンジン値 ＋ 差分 を重ねて構築
    types/natures/items/typechart  + index（バレル & toChampMon）
  ui/        theme / components / calcModel（盤面状態モデル）/ ErrorBoundary
  storage/   presets（CRUD）/ share（共有コード）/ index（AsyncStorage隔離）
  screens/   DoublesScreen / MatchupScreen / PresetManager
App.tsx      盤面状態とテーマを保持し、計算/相性タブを切替＋構築管理
```

### 設計の鉄則（崩すと精度が壊れる）

- **能力ポイント制は `EV = min(252, P×8)` の1行変換**でエンジンに載る（IV31/Lv50固定）。
- **構築後のミューテーション禁止。** 必ず `champPokemon()` のコンストラクタ経路で与える
  （`pokemon.stats` を書き換えると `maxHP()` がズレる）。
- **ダブル補正は手動倍率にしない。** Field/Side/boosts に渡してエンジンに計算させる。
- エンジンは**英語名**、UIは**日本語**。JP↔EN は `data/` で解決。

## Champions 差分層の運用（N-6）

本編Gen9データ（ベース層）に対し、Champions 固有の差分（技威力調整・種族/タイプ差分）を
`data/champions.ts` の `ChampionsPatch` で重ねる。差分は**表示値と計算値の両方**に反映される。

- 本体同梱 `BUILTIN_PATCH` は**空**（既定では何も変えない）。実値は**実機照合**で確定し次第追記する
  （誤った差分を「正」として出荷しない）。各エントリは `verified`（実機照合済みか）を持つ。
- 配信差し替え: `setActivePatch(patch)` → `rebuildMoves()` / `rebuildPokedex()`。
- UIでは差分が当たった技/種族に `Ch`（照合済み・緑）/ `Ch?`（暫定・橙）バッジが付く。

### 差分配信（サーバレス, N-6）

`src/data/remotePatch.ts`（純粋・検証/サニタイズ）＋ `patchSync.ts`（実 fetch/AsyncStorage/rebuild の配線）。
起動時に **キャッシュ→リモート** の順で適用し、失敗時は同梱パッチにフォールバックする。

- 有効化: `patchSync.ts` の `PATCH_URL` に**静的JSONのURL**（CDN / GitHub Pages / Cloudflare Pages 等）を設定するだけ。サーバDBは不要。
- 配信ファイルの形式は [`docs/patch.example.json`](docs/patch.example.json) を参照（`ChampionsPatch` と同型）。
- リモートは untrusted 前提で **`validatePatch` が検証＆サニタイズ**（不正な型・タイプ名・実効ゼロのエントリは除外）。
- `PATCH_URL` が空の間はリモート取得をスキップし、キャッシュ／同梱のみで動作（既定）。

## 共有コードの仕様

盤面を `PC1.<base64url>` 形式の文字列でエクスポート/インポートできる（`storage/share.ts`）。

- `JSON({v:1, b:BoardState})` → UTF-8(TextEncoder) → 自前 Base64URL（btoaの多バイト問題回避）。
- デコードは検証付き。形式違い・破損・バージョン不一致・現行ロスターに無いポケモンを含むコードは
  `null` を返し、UI はエラー表示（クラッシュさせない）。

## テスト方針

`src/**/__tests__/*.test.ts` に純粋ロジックのユニットテストを置く（RNコンポーネントは対象外）。
代表値（`handoff §6` のガブ じしん vs カバルドン 61–73 等）と、能力ポイント制のエンジン厳密一致、
差分適用、共有コード往復、プリセットCRUD などを assert。

## ライセンス / 注意

計算データの一部は `@smogon/calc`（Gen9）に由来。Champions 固有値は実機照合で担保する運用。
ベース層の利用規約・出典を尊重し、自己責任利用とする。
