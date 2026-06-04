// service.ts — UI（日本語入力）→ エンジン計算 → 確定数モデル の一気通貫サービス。
// ダブル補正（壁・てだすけ・フレンドガード・天候・フィールド・いかく）は手動倍率では
// なくエンジンの Field/Side/boosts へマップし、エンジンに正しく計算させる。

import type { State } from '@smogon/calc';
import { champCalc } from './championsAdapter';
import { analyze, type DamageModel } from './result';
import {
  type MonInput,
  toChampMon,
  moveByJP,
  moveEN,
  POKEDEX,
} from '../data';
import { typeEff } from '../data/typechart';
import type { TypeJP } from '../data/types';

export type WeatherKey = 'sun' | 'rain' | null;
export type TerrainKey = 'electric' | 'grassy' | 'psychic' | 'misty' | null;

const WEATHER_EN: Record<'sun' | 'rain', State.Field['weather']> = {
  sun: 'Sun',
  rain: 'Rain',
};
const TERRAIN_EN: Record<'electric' | 'grassy' | 'psychic' | 'misty', State.Field['terrain']> = {
  electric: 'Electric',
  grassy: 'Grassy',
  psychic: 'Psychic',
  misty: 'Misty',
};

export interface CalcParams {
  attacker: MonInput;
  defender: MonInput;
  /** 日本語技名。 */
  moveJP: string;
  doubles?: boolean;
  weather?: WeatherKey;
  terrain?: TerrainKey;
  /** てだすけ（攻撃側 ×1.5）。 */
  helpingHand?: boolean;
  /** いかく被弾（攻撃側 こうげき -1）。物理にのみ影響。 */
  intimidate?: boolean;
  /** フレンドガード（防御側 ×0.75）。 */
  friendGuard?: boolean;
  /** 壁（物理=リフレクター / 特殊=ひかりのかべ）。 */
  screen?: boolean;
}

/** 防御側の有効タイプ（テラスON ならテラスタイプ単一）。 */
function defenderTypes(def: MonInput): TypeJP[] {
  if (def.teraJP) return [def.teraJP];
  return POKEDEX[def.speciesJP]?.types ?? [];
}

/**
 * 1対象ぶんの計算。UI のスロット1つに対応。
 * いかくは攻撃側 boosts.atk に -1 を合成して渡す（エンジンが急所時の下降無視も処理）。
 */
export function calcDamage(p: CalcParams): DamageModel {
  const move = moveByJP(p.moveJP);
  const isPhys = move?.cat === 'phys';

  // いかくは攻撃側こうげきの -1 として合成（物理時のみ意味を持つ）。
  let attacker = p.attacker;
  if (p.intimidate && isPhys) {
    const boosts = { ...(attacker.boosts ?? {}) };
    boosts.atk = (boosts.atk ?? 0) - 1;
    attacker = { ...attacker, boosts };
  }

  const field: Partial<State.Field> = {
    weather: p.weather ? WEATHER_EN[p.weather] : undefined,
    terrain: p.terrain ? TERRAIN_EN[p.terrain] : undefined,
    attackerSide: { isHelpingHand: !!p.helpingHand },
    defenderSide: {
      isFriendGuard: !!p.friendGuard,
      // 物理技ならリフレクター、特殊技ならひかりのかべ。
      isReflect: !!p.screen && isPhys,
      isLightScreen: !!p.screen && !isPhys,
    },
  };

  const result = champCalc(toChampMon(attacker), toChampMon(p.defender), moveEN(p.moveJP), {
    doubles: p.doubles,
    field,
    moveOpts: move?.crit ? { isCrit: true } : undefined,
  });

  const eff = move
    ? typeEff(move.type, defenderTypes(p.defender), move.freezeDry)
    : 1;

  return analyze(result, eff);
}
