// roster.ts — ロスター/技の「JP↔EN対応＋技構成」だけを手で定義する入力データ。
// 種族値・タイプ・威力・分類・対象・ヒット数はエンジン(Gen9)から自動解決する（pokedex/moves で構築）。
//
// 注意: Champions の「内定ロスター」の正確性は実機照合・差分層で最終確定する（要件 N-5/§8）。
// ここは VGC 実績のある主要ポケモンを中心に幅広く揃えた実用セット。フォルム差(EN名)に注意。

export interface MoveRow {
  jp: string;
  en: string;
  /** 常時急所（エンジンが威力等は解決、急所フラグだけ手指定）。 */
  crit?: boolean;
  /** フリーズドライ等、対みず常時ばつぐんの特例（eff表示用）。 */
  freezeDry?: boolean;
}

/** 技プール。type/cat/power/target/hits はエンジンから解決するため、ここには持たない。 */
export const MOVE_ROWS: MoveRow[] = [
  // --- 物理 ---
  { jp: 'じしん', en: 'Earthquake' },
  { jp: 'いわなだれ', en: 'Rock Slide' },
  { jp: 'げきりん', en: 'Outrage' },
  { jp: 'ストーンエッジ', en: 'Stone Edge' },
  { jp: 'アイアンヘッド', en: 'Iron Head' },
  { jp: 'インファイト', en: 'Close Combat' },
  { jp: 'とんぼがえり', en: 'U-turn' },
  { jp: 'あんこくきょうだ', en: 'Wicked Blow', crit: true },
  { jp: 'すいりゅうれんだ', en: 'Surging Strikes', crit: true },
  { jp: 'スケイルショット', en: 'Scale Shot' },
  { jp: 'しんそく', en: 'Extreme Speed' },
  { jp: 'アクアジェット', en: 'Aqua Jet' },
  { jp: 'フレアドライブ', en: 'Flare Blitz' },
  { jp: 'じゃれつく', en: 'Play Rough' },
  { jp: 'ヘビーボンバー', en: 'Heavy Slam' },
  { jp: 'ボディプレス', en: 'Body Press' },
  { jp: 'はたきおとす', en: 'Knock Off' },
  { jp: 'かみくだく', en: 'Crunch' },
  { jp: 'ふいうち', en: 'Sucker Punch' },
  { jp: 'ラストリスペクト', en: 'Last Respects' },
  { jp: 'こおりのつぶて', en: 'Ice Shard' },
  { jp: 'つららおとし', en: 'Icicle Crash' },
  { jp: 'かみなりパンチ', en: 'Thunder Punch' },
  { jp: 'ドレインパンチ', en: 'Drain Punch' },
  { jp: 'ワイルドボルト', en: 'Wild Charge' },
  { jp: 'ばかぢから', en: 'Superpower' },
  { jp: 'ブレイブバード', en: 'Brave Bird' },
  { jp: 'ねこだまし', en: 'Fake Out' },
  { jp: 'ウェーブタックル', en: 'Wave Crash' },
  { jp: 'レイジフィスト', en: 'Rage Fist' },
  { jp: 'きょじゅうざん', en: 'Behemoth Blade' },
  { jp: 'きょじゅうだん', en: 'Glacial Lance' },
  { jp: 'アクセルブレイク', en: 'Collision Course' },
  // --- 特殊 ---
  { jp: 'ねっぷう', en: 'Heat Wave' },
  { jp: 'かえんほうしゃ', en: 'Flamethrower' },
  { jp: 'だいもんじ', en: 'Fire Blast' },
  { jp: 'ハイドロポンプ', en: 'Hydro Pump' },
  { jp: 'なみのり', en: 'Surf' },
  { jp: 'だくりゅう', en: 'Muddy Water' },
  { jp: '10まんボルト', en: 'Thunderbolt' },
  { jp: 'かみなり', en: 'Thunder' },
  { jp: 'ボルトチェンジ', en: 'Volt Switch' },
  { jp: 'れいとうビーム', en: 'Ice Beam' },
  { jp: 'ふぶき', en: 'Blizzard' },
  { jp: 'フリーズドライ', en: 'Freeze-Dry', freezeDry: true },
  { jp: 'ムーンフォース', en: 'Moonblast' },
  { jp: 'マジカルシャイン', en: 'Dazzling Gleam' },
  { jp: 'ハイパーボイス', en: 'Hyper Voice' },
  { jp: 'シャドーボール', en: 'Shadow Ball' },
  { jp: 'あくのはどう', en: 'Dark Pulse' },
  { jp: 'アストラルビット', en: 'Astral Barrage' },
  { jp: 'サイコキネシス', en: 'Psychic' },
  { jp: 'サイコショック', en: 'Psyshock' },
  { jp: 'きあいだま', en: 'Focus Blast' },
  { jp: 'だいちのちから', en: 'Earth Power' },
  { jp: 'パワージェム', en: 'Power Gem' },
  { jp: 'ラスターカノン', en: 'Flash Cannon' },
  { jp: 'りゅうせいぐん', en: 'Draco Meteor' },
  { jp: 'りゅうのはどう', en: 'Dragon Pulse' },
  { jp: 'エナジーボール', en: 'Energy Ball' },
  { jp: 'ヘドロばくだん', en: 'Sludge Bomb' },
  { jp: 'ぼうふう', en: 'Hurricane' },
  { jp: 'メイクイットレイン', en: 'Make It Rain' },
  { jp: 'イナズマドライブ', en: 'Electro Drift' },
];

export interface SpeciesRow {
  jp: string;
  /** 英語種族名（フォルム差に注意。例 Urshifu-Rapid-Strike）。 */
  en: string;
  /** 技構成（MOVE_ROWS の jp キー）。 */
  moves: string[];
}

export const SPECIES_ROWS: SpeciesRow[] = [
  { jp: 'ガブリアス', en: 'Garchomp', moves: ['じしん', 'ストーンエッジ', 'げきりん', 'スケイルショット'] },
  { jp: 'カイリュー', en: 'Dragonite', moves: ['しんそく', 'げきりん', 'じしん', 'アイアンヘッド'] },
  { jp: 'ハバタクカミ', en: 'Flutter Mane', moves: ['ムーンフォース', 'シャドーボール', 'マジカルシャイン', 'フリーズドライ'] },
  { jp: 'ウーラオス', en: 'Urshifu-Rapid-Strike', moves: ['すいりゅうれんだ', 'インファイト', 'アクアジェット', 'とんぼがえり'] },
  { jp: 'イーユイ', en: 'Chi-Yu', moves: ['ねっぷう', 'かえんほうしゃ', 'シャドーボール', 'だいちのちから'] },
  { jp: 'ディンルー', en: 'Ting-Lu', moves: ['じしん', 'いわなだれ', 'はたきおとす', 'ヘビーボンバー'] },
  { jp: 'ランドロス', en: 'Landorus-Therian', moves: ['じしん', 'いわなだれ', 'とんぼがえり', 'インファイト'] },
  { jp: 'カバルドン', en: 'Hippowdon', moves: ['じしん', 'ストーンエッジ', 'アイアンヘッド', 'ボディプレス'] },
  { jp: 'テツノツツミ', en: 'Iron Bundle', moves: ['フリーズドライ', 'ハイドロポンプ', 'れいとうビーム', 'だいちのちから'] },
  { jp: 'モロバレル', en: 'Amoonguss', moves: ['だいちのちから', 'シャドーボール', 'エナジーボール', 'ヘドロばくだん'] },
  { jp: 'ガオガエン', en: 'Incineroar', moves: ['フレアドライブ', 'インファイト', 'はたきおとす', 'とんぼがえり'] },
  { jp: 'テツノカイナ', en: 'Iron Hands', moves: ['ドレインパンチ', 'ワイルドボルト', 'じしん', 'ねこだまし'] },
  { jp: 'パオジアン', en: 'Chien-Pao', moves: ['つららおとし', 'インファイト', 'はたきおとす', 'こおりのつぶて'] },
  { jp: 'サーフゴー', en: 'Gholdengo', moves: ['メイクイットレイン', 'シャドーボール', 'だいちのちから', 'パワージェム'] },
  { jp: 'リザードン', en: 'Charizard', moves: ['ねっぷう', 'だいもんじ', 'ぼうふう', 'だいちのちから'] },
  { jp: 'セグレイブ', en: 'Baxcalibur', moves: ['げきりん', 'つららおとし', 'じしん', 'アイアンヘッド'] },
  { jp: 'トルネロス', en: 'Tornadus', moves: ['ぼうふう', 'ねっぷう', 'とんぼがえり', 'きあいだま'] },
  { jp: 'カイオーガ', en: 'Kyogre', moves: ['なみのり', 'ハイドロポンプ', 'れいとうビーム', 'かみなり'] },
  { jp: 'グラードン', en: 'Groudon', moves: ['じしん', 'だいちのちから', 'ストーンエッジ', 'フレアドライブ'] },
  { jp: 'ザシアン', en: 'Zacian-Crowned', moves: ['きょじゅうざん', 'じゃれつく', 'インファイト', 'ワイルドボルト'] },
  { jp: 'バドレックス(こくば)', en: 'Calyrex-Shadow', moves: ['アストラルビット', 'シャドーボール', 'サイコショック', 'きあいだま'] },
  { jp: 'バドレックス(はくば)', en: 'Calyrex-Ice', moves: ['きょじゅうだん', 'じしん', 'インファイト', 'ボディプレス'] },
  { jp: 'コライドン', en: 'Koraidon', moves: ['アクセルブレイク', 'インファイト', 'げきりん', 'フレアドライブ'] },
  { jp: 'ミライドン', en: 'Miraidon', moves: ['イナズマドライブ', 'りゅうせいぐん', '10まんボルト', 'ボルトチェンジ'] },
  { jp: 'トドロクツキ', en: 'Roaring Moon', moves: ['あくのはどう', 'げきりん', 'じしん', 'とんぼがえり'] },
  { jp: 'テツノブジン', en: 'Iron Valiant', moves: ['ムーンフォース', 'インファイト', 'サイコキネシス', 'シャドーボール'] },
  { jp: 'イダイナキバ', en: 'Great Tusk', moves: ['じしん', 'インファイト', 'いわなだれ', 'とんぼがえり'] },
  { jp: 'ドドゲザン', en: 'Kingambit', moves: ['アイアンヘッド', 'はたきおとす', 'インファイト', 'ふいうち'] },
  { jp: 'マリルリ', en: 'Azumarill', moves: ['アクアジェット', 'じゃれつく', 'ばかぢから', 'ハイドロポンプ'] },
  { jp: 'ニンフィア', en: 'Sylveon', moves: ['ハイパーボイス', 'ムーンフォース', 'マジカルシャイン', 'シャドーボール'] },
  { jp: 'ロトム(ヒート)', en: 'Rotom-Heat', moves: ['かえんほうしゃ', '10まんボルト', 'ボルトチェンジ', 'シャドーボール'] },
  { jp: 'ヒードラン', en: 'Heatran', moves: ['だいもんじ', 'だいちのちから', 'ラスターカノン', 'ねっぷう'] },
  { jp: 'バンギラス', en: 'Tyranitar', moves: ['いわなだれ', 'かみくだく', 'じしん', 'ストーンエッジ'] },
  { jp: 'ウインディ', en: 'Arcanine', moves: ['フレアドライブ', 'インファイト', 'しんそく', 'ワイルドボルト'] },
  { jp: 'コノヨザル', en: 'Annihilape', moves: ['レイジフィスト', 'インファイト', 'シャドーボール', 'とんぼがえり'] },
  { jp: 'ヘイラッシャ', en: 'Dondozo', moves: ['ウェーブタックル', 'じしん', 'ヘビーボンバー', 'アイアンヘッド'] },
  { jp: 'シャリタツ', en: 'Tatsugiri', moves: ['ハイドロポンプ', 'りゅうせいぐん', 'だくりゅう', 'エナジーボール'] },
  { jp: 'オーロンゲ', en: 'Grimmsnarl', moves: ['はたきおとす', 'じゃれつく', 'ばかぢから', 'ふいうち'] },
  { jp: 'エルフーン', en: 'Whimsicott', moves: ['ムーンフォース', 'エナジーボール', 'シャドーボール'] },
  { jp: 'トリトドン', en: 'Gastrodon', moves: ['だいちのちから', 'ハイドロポンプ', 'れいとうビーム', 'ヘドロばくだん'] },

  // --- 現環境上位（Pikalytics / Reg M-A, 2026-06）。メガは @smogon/calc のChampionsデータで解決。 ---
  { jp: 'イダイトウ', en: 'Basculegion', moves: ['ウェーブタックル', 'ラストリスペクト', 'アクアジェット', 'とんぼがえり'] },
  { jp: 'オオニューラ', en: 'Sneasler', moves: ['インファイト', 'はたきおとす', 'ふいうち', 'とんぼがえり'] },
  { jp: 'ヤバソチャ', en: 'Sinistcha', moves: ['シャドーボール', 'エナジーボール', 'だいちのちから'] },
  { jp: 'ブリジュラス', en: 'Archaludon', moves: ['ラスターカノン', 'りゅうのはどう', 'だいちのちから', 'ボディプレス'] },
  { jp: 'リキキリン', en: 'Farigiraf', moves: ['サイコキネシス', 'ハイパーボイス', 'シャドーボール', 'だいちのちから'] },
  { jp: 'ペリッパー', en: 'Pelipper', moves: ['ハイドロポンプ', 'ぼうふう', 'なみのり', 'れいとうビーム'] },
  { jp: 'ヤミラミ', en: 'Sableye', moves: ['あくのはどう', 'シャドーボール', 'はたきおとす', 'ふいうち'] },
  { jp: 'イッカネズミ', en: 'Maushold', moves: ['ねこだまし', 'とんぼがえり', 'はたきおとす'] },
  { jp: 'ギルガルド', en: 'Aegislash-Shield', moves: ['シャドーボール', 'ラスターカノン', 'きあいだま'] },
  { jp: 'ロトム(ウォッシュ)', en: 'Rotom-Wash', moves: ['ハイドロポンプ', '10まんボルト', 'ボルトチェンジ', 'シャドーボール'] },
  { jp: 'サダイジャ', en: 'Glimmora', moves: ['パワージェム', 'だいちのちから', 'ヘドロばくだん', 'エナジーボール'] },
  { jp: 'プテラ', en: 'Aerodactyl', moves: ['いわなだれ', 'ストーンエッジ', 'じしん', 'とんぼがえり'] },
  { jp: 'ファイアロー', en: 'Talonflame', moves: ['ブレイブバード', 'フレアドライブ', 'とんぼがえり', 'ねっぷう'] },
  // メガシンカ（Champions）
  { jp: 'リザードン(メガY)', en: 'Charizard-Mega-Y', moves: ['ねっぷう', 'だいもんじ', 'ぼうふう', 'だいちのちから'] },
  { jp: 'カイリュー(メガ)', en: 'Dragonite-Mega', moves: ['しんそく', 'げきりん', 'じしん', 'アイアンヘッド'] },
  { jp: 'プテラ(メガ)', en: 'Aerodactyl-Mega', moves: ['いわなだれ', 'ストーンエッジ', 'じしん', 'とんぼがえり'] },
  { jp: 'カメックス(メガ)', en: 'Blastoise-Mega', moves: ['ハイドロポンプ', 'なみのり', 'れいとうビーム', 'だいちのちから'] },
  { jp: 'フラエッテ(メガ)', en: 'Floette-Mega', moves: ['ムーンフォース', 'マジカルシャイン', 'サイコキネシス', 'エナジーボール'] },
  { jp: 'ユキメノコ(メガ)', en: 'Froslass-Mega', moves: ['ふぶき', 'シャドーボール', 'れいとうビーム', 'だいちのちから'] },
  { jp: 'スコヴィラン(メガ)', en: 'Scovillain-Mega', moves: ['エナジーボール', 'だいもんじ', 'かえんほうしゃ', 'ねっぷう'] },
];
