# 調査メモ: パーティのインポート と 使用率データ

**調査日:** 2026-06-05
**目的:** 要件 §11 / handoff §5(マイルストーン6) の「ゲーム内パーティのインポート（チームコード等）」と
「使用率データの取得可否・手段」を実装方針に落とす。

---

## 1. ゲーム内「リプリカチーム（Replica Teams）」の実態

Pokémon Champions の公式チーム共有機能は **Replica Teams**。

- **コードは 10桁の英数字（例: `QGYAG5WE3C` / `HH3MF048VV`）。**
- 各チームに **Team ID** が割り当てられ、コードは**サーバ上のチームデータを指す参照**。
  入力すると、サーバから6体（種族・もちもの・特性・性格・技構成）をコピーして取り込む。
- 取り込みには**そのポケモンと道具を自分が所持していること**が条件（レンタルではなく「ショートカット」）。
- 共有は `Train → Replica Teams → Share your Battle Teams` で Team ID が発行される。

### 結論（重要）

- **リプリカコードは不透明なサーバID。自己完結したチーム情報を含まない** → ローカルでの復号は原理的に不可能。
- 技術仕様・**第三者向け公開APIは存在しない**（公式バックエンド前提）。
- よって「**コードを貼れば盤面に取り込む**」は、公式APIが公開されない限り**実装不可**。
  誤って「対応」と謳うと信頼を損なうため、**やらない**判断が正しい。

> 参考: 我々の自前「共有コード（`PC1.<base64url>`）」は、これとは別物（アプリ間でのみ有効な自己完結フォーマット）。役割が違うので併存させる。

---

## 2. 現実的な差別化ポイント: PokePaste / Showdown テキストの取り込み

Champions のサードパーティ・エコシステム（PikaChampions / PokeStats / PokemonBuilder /
Champions Lab / Pikalytics）は、**揃って PokePaste・Pokémon Showdown 形式のテキスト**を
インポート/エクスポートの共通言語にしている。これが**現実に実装でき、かつ実戦で使われている**交換手段。

### Showdown セット形式（1体あたり）

```
Garchomp @ Choice Scarf
Ability: Rough Skin
Level: 50
Tera Type: Steel
EVs: 252 Atk / 4 Def / 252 Spe
IVs: 0 Atk          (任意)
Adamant Nature
- Earthquake
- Stone Edge
- Scale Shot
- Protect
```
6体を空行区切りで連結したものがチーム。PokePaste（pokepast.es）はこれをホストするだけなので、
URL から本文テキストを取得できれば同じパーサで扱える。

### 我々のアプリへの取り込み設計（提案）

新モジュール `src/data/showdown.ts`（純粋・RN非依存・テスト対象）:

- `parseShowdown(text): ParsedSet[]` — 1〜6体のセットを構造化。
  - 1行目: `Nickname (Species) @ Item` / `Species @ Item` / `Species`。括弧のニックネーム対応。
  - `Ability:` / `Level:` / `Tera Type:` / `EVs:` / `IVs:` / `<Nature> Nature` / `- Move`。
- `toMonInput(set): MonInput | { error }` — 英語→日本語へ解決して既存の `MonInput` に落とす。
  - **EN→JP マッピングが必要**（現状は JP→EN のみ。`POKEDEX`/`MOVES` から逆引きを生成）。
  - **EV → 能力ポイント変換**: 既存 `ptsToEV(p)=min(252,p*8)` の逆。`pts = min(32, ceil(EV/8))`
    （0→0 / 4→1 / 252→32）。Champions は能力P制なので近似だが、実用上の投資再現に十分。
  - 性格名（英→日）は `NATURES` で解決済み（`NATURE_EN_TO_JP`）。Tera は `TYPE_EN_TO_JP`。
  - **ロスター外・技プール外は per-slot で「未対応」を返し、取り込めた分だけ反映**（部分的成功）。
- 逆方向 `toShowdown(board): string` — 自分の構築を Showdown 形式で**エクスポート**。
  これにより、我々のアプリ→他ツール/Showdown→大会pastesへ**外に出られる**ことが差別化になる。
- UI: 既存 `PresetManager` の「共有コードを取込」と並べて
  「**Showdown/PokePaste を取込**」テキスト欄＋「Showdownで書き出し」ボタンを追加。
  味方2体は盤面の allyA/allyB に、残り4体は控えとしてプリセット名に残す等の運用を検討。

### 見積り

- パーサ＋EN→JP逆引き＋EV→pts変換＋テスト: **中規模・自己完結**。外部依存なし。
- 既存の `toChampMon` / `MonInput` にそのまま載るので計算経路の変更は不要。
- 注意点: Showdownは6体・シングル文脈の慣習。ダブル盤面(味方2)へのマッピング方針をUXで決める。

---

## 3. 使用率データ

### 現状

- **Pikalytics** が Champions VGC 2026（Regulation Set M-A）の使用率・技/道具/特性・EVスプレッドを提供。
  ランク対戦の集計、**月次更新**、Web/アプリは無料。
- ただし **公開API・データライセンスの明記は見当たらない**。
  プログラム取得（スクレイピング）は **ToS リスク・破損リスクが高く非推奨**。
- PokéAPI はベースデータのみで、Champions の使用率は持たない。

### 提案

1. **ライブAPI連携は当面見送り**（公開API/許諾が無いため）。
2. UX 上の価値（デフォルト配分・脅威提示）は、**手動キュレーションのスナップショットをローカル同梱**で代替。
   - 月次で主要ポケモンの定番スプレッド/技/道具を `data/champions.ts` の差分配信(N-6)と同じ
     チャネルで配る（`defaultSets` 的な軽量データ）。出典明記・自己責任利用。
   - これは「正確な使用率%」ではなく「実用的な既定値」。精度の看板は計算側で担保しているので両立する。
3. 本格的な使用率連携が必要になったら、**Pikalytics 等にデータ提供/提携を打診**（公式手段）。

---

## 4. 推奨ロードマップ

| 優先 | 項目 | 理由 |
|---|---|---|
| ★ | **Showdown/PokePaste の取込・書き出し**（`showdown.ts`） | エコシステム標準・自己完結で実装可・外部流通で差別化 |
| ▲ | デフォルトセットのローカル同梱（差分配信で更新） | 入力削減のUX。ライセンス安全 |
| × | リプリカコードのローカル復号 | 不可能（サーバID・公開APIなし）。公式API公開待ち |
| × | 使用率のライブAPI連携 | 公開API/許諾なし。ToSリスク |

**次の実装ステップ:** `showdown.ts`（parse/serialize＋EN→JP逆引き＋EV↔pts）とそのテスト、
`PresetManager` への取込/書き出しUI。これで「手入力削減」という競合との最大差を、合法・自己完結で実現する。

---

## 出典

- [Team Sharing Board | Game8](https://game8.co/games/Pokemon-Champions/archives/Team-Share)
- [Complete Guide To Replica Teams | TheGamer](https://www.thegamer.com/pokemon-champions-replica-rental-teams-guide/)
- [Replica Teams | Serebii](https://www.serebii.net/pokemonchampions/replicateams.shtml)
- [Best Replica Team Codes | Destructoid](https://www.destructoid.com/best-replica-team-codes-in-pokemon-champions-and-how-to-use-them/)
- [PikaChampions Team Builder（PokePaste import/export・Replica Code）](https://pikachampions.com/)
- [PokeStats Team Builder（Showdown / PokePaste import-export）](https://pokestats.gg/team-builder)
- [PokemonBuilder（PokePaste import, Champions形式で検証）](https://pokemonbuilder.com/pokemon-vgc-builder)
- [Pikalytics — Champions VGC 2026 使用率](https://www.pikalytics.com/)
