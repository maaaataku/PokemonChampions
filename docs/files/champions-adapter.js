// champions-adapter.js
// -----------------------------------------------------------------------------
// Pokémon Champions の能力システムを @smogon/calc に橋渡しするアダプタ。
//
// 【検証済みの根拠】(このリポジトリの probe スクリプトで実測)
//   Champions 実数値 = floor((種族値*2 + 31 + 能力P*2) * 50/100 (+5/*nature or +60)) は、
//   本編Gen9式 (Lv50, IV31, EV) において EV = min(252, 能力P*8) を与えると【全域で厳密一致】。
//   ・能力P=32 → EV=256→252にクランプされるが、式中のfloorが差を吸収し一致する。
//   ・合計66能力P(=520EV相当)でもエンジンは各能力を独立計算し、510上限でクランプしない。
//   よって構築後のミューテーションは不要で、ダメージ乱数・確定数・%・ダブル範囲・
//   テラスタルが全てエンジン標準経路で正しく算出される。
//
// 【データ基盤の注意】
//   エンジンの内蔵データは本編Gen9。Champions固有の差分（技威力の調整、内定ロスター、
//   メガ可否、特性/道具の挙動、ゼンブイリング 等）は別のデータレイヤで上書きする前提。
//   下の overrides 引数で species/move 単位の上書きをフックできるようにしてある。
// -----------------------------------------------------------------------------

const { Pokemon, Move, Field, calculate, Generations } = require('@smogon/calc');
const gen = Generations.get(9);

const MAX_EV = 252;
const ptsToEV = (p) => Math.min(MAX_EV, Math.max(0, (p | 0)) * 8);

/**
 * Champions のポケモン定義から @smogon/calc の Pokemon を生成する。
 * @param {object} c
 *   c.species  英語種族名（例 'Garchomp'）※JP↔EN名はデータレイヤで解決
 *   c.nature   本編式の性格名（例 'Adamant'）。補正の数値は Champions と同一。
 *   c.pts      { hp,atk,def,spa,spd,spe } 能力ポイント(各0..32)
 *   c.item / c.ability / c.teraType / c.boosts などは @smogon/calc にそのまま渡す
 *   c.overrides 種族データの上書き（Champions差分。例 {baseStats:{...}, types:[...]}）
 */
function champPokemon(c) {
  const evs = {};
  for (const [k, v] of Object.entries(c.pts || {})) evs[k] = ptsToEV(v);
  return new Pokemon(gen, c.species, {
    level: 50,
    nature: c.nature,
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    evs,
    item: c.item,
    ability: c.ability,
    teraType: c.teraType,
    boosts: c.boosts,
    overrides: c.overrides, // Champions固有の種族/特性差分をここで注入
  });
}

/**
 * Champions のダメージ計算。
 * @param {object} attacker champPokemon の入力
 * @param {object} defender champPokemon の入力
 * @param {string} moveName 英語技名（例 'Earthquake'）
 * @param {object} opts { doubles:boolean, field:object, moveOpts:object }
 *   範囲技は opts.doubles=true のときエンジンが自動で 0.75 を適用する。
 */
function champCalc(attacker, defender, moveName, opts = {}) {
  const field = new Field({ gameType: opts.doubles ? 'Doubles' : 'Singles', ...(opts.field || {}) });
  const result = calculate(
    gen,
    champPokemon(attacker),
    champPokemon(defender),
    new Move(gen, moveName, opts.moveOpts),
    field
  );
  // result.damage: 16段階の乱数配列 / result.desc(): 説明 / result.kochance(): KO確率
  return result;
}

module.exports = { gen, ptsToEV, champPokemon, champCalc };

// --- 簡易自己テスト: node champions-adapter.js ---
if (require.main === module) {
  const r = champCalc(
    { species: 'Garchomp', nature: 'Adamant', pts: { atk: 32 } },
    { species: 'Hippowdon', nature: 'Impish', pts: { hp: 32, def: 32 } },
    'Earthquake'
  );
  console.log('rolls:', r.damage.join(','));
  console.log('desc :', r.desc());
}
