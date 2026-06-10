# ダブル特化ダメ計 — ダブル主軸の実戦コンパニオン（ダメージ計算）

## Goals
- [g1] MVP（実戦コンパニオン） (done)
- [g2] Champions 差分の実機照合 (active)
- [g3] ストア配布（EAS） (active)

## Tasks
- [x] ダブル計算（範囲技・味方巻き込み・合算KO） @g1
- [x] ダブル補正（壁/てだすけ/いかく/天候/フィールド） @g1
- [x] 全技ダメ計・両方向計算（F-7） @g1
- [x] 耐久調整＝確定耐え逆算＋ワンタップ反映（F-12/14） @g1
- [x] 素早さ早見（F-13） @g1
- [x] タイプ相性・対策（F-15〜17） @g1
- [x] 構築管理（保存/読込/削除・共有コード PC1.<base64url>） @g1
- [x] Showdown/PokePaste 取込・書き出し @g1
- [x] 差分配信の取得層（N-6・サーバレス） @g2
- [x] EAS ストア配布の準備一式 @g3
- [x] 「このアプリについて」画面（非公式表記・出典） @g3
- [ ] Champions 差分（技威力/種族）を実機照合し verified 化 @g2 !high
- [ ] BUILTIN_PATCH に確定差分を追記（誤値を出荷しない） @g2 !high
- [ ] PATCH_URL に静的JSONを設定し差分配信を有効化 @g2 !mid
- [ ] eas.json の submit プレースホルダを実値に差し替え @g3 !high
- [ ] store-listing（掲載文・スクショ）を用意 @g3 !mid
- [ ] privacy-policy を URL 公開 @g3 !mid
- [ ] npx expo-doctor で健全性チェック @g3 !low
