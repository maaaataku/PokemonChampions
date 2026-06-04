// calcModel.ts — ダブル盤面の状態モデルと、状態→計算（サービス層呼び出し）。
// 画面はこのモデルの結果を描画するだけにして、計算配線を分離・テスト可能にする。

import {
  MOVES,
  POKEDEX,
  natureJPForStat,
  atkItemEN,
  defItemEN,
  type AtkItemKey,
  type MonInput,
  type TypeJP,
} from '../data';
import { calcDamage, type CalcParams, type WeatherKey, type TerrainKey } from '../engine/service';
import type { DamageModel } from '../engine/result';

export type SlotId = 'foeL' | 'foeR' | 'allyA' | 'allyB';
export type AllyId = 'allyA' | 'allyB';
export type FoeId = 'foeL' | 'foeR';
export type Mult = 0.9 | 1.0 | 1.1;

export interface AtkProfile {
  sp: number;
  nature: Mult;
  stage: number;
  item: AtkItemKey;
  hh: boolean;
  intim: boolean;
}
export interface DefProfile {
  hpSP: number;
  defSP: number;
  nature: Mult;
  vest: boolean;
  fg: boolean;
  screen: boolean;
  stage: number;
}
export interface TeraState {
  on: boolean;
  type: TypeJP;
}

export interface BoardState {
  slots: Record<SlotId, string>;
  activeAtk: AllyId;
  moveKey: string;
  focusFoe: FoeId;
  atkProfs: Record<AllyId, AtkProfile>;
  defProfs: Record<SlotId, DefProfile>;
  tera: Record<SlotId, TeraState>;
  weather: WeatherKey;
  terrain: TerrainKey;
  comboMv: Record<AllyId, string>; // 日本語技名 or 'none'
}

export const allyOther = (a: AllyId): AllyId => (a === 'allyA' ? 'allyB' : 'allyA');

/** 試作 DoublesCalcWireframe の初期盤面を移植した既定状態。 */
export function initialBoard(): BoardState {
  const atk = (): AtkProfile => ({ sp: 32, nature: 1.1, stage: 0, item: 'none', hh: false, intim: false });
  const def = (hpSP: number, defSP: number): DefProfile => ({
    hpSP, defSP, nature: 1.0, vest: false, fg: false, screen: false, stage: 0,
  });
  const tera = (type: TypeJP): TeraState => ({ on: false, type });
  return {
    slots: { foeL: 'カバルドン', foeR: 'モロバレル', allyA: 'ガブリアス', allyB: 'イーユイ' },
    activeAtk: 'allyA',
    moveKey: 'じしん',
    focusFoe: 'foeL',
    atkProfs: { allyA: atk(), allyB: atk() },
    defProfs: { foeL: def(32, 16), foeR: def(32, 0), allyA: def(0, 0), allyB: def(0, 0) },
    tera: { foeL: tera('はがね'), foeR: tera('みず'), allyA: tera('はがね'), allyB: tera('みず') },
    weather: null,
    terrain: null,
    comboMv: { allyA: 'じしん', allyB: 'ねっぷう' },
  };
}

/** 選択技の対象スロット。single=focus / foes=相手2体 / all=自分以外全体(味方巻き込み)。 */
export function targetSlots(s: BoardState): SlotId[] {
  const move = MOVES[s.moveKey];
  if (!move || move.target === 'single') return [s.focusFoe];
  if (move.target === 'foes') return ['foeL', 'foeR'];
  return ['foeL', 'foeR', allyOther(s.activeAtk)];
}

/** 攻撃側スロット＋技 → MonInput。攻撃能力は技分類で atk/spa を切替。 */
export function atkInput(s: BoardState, ally: AllyId, moveJP: string): MonInput {
  const prof = s.atkProfs[ally];
  const move = MOVES[moveJP];
  const isPhys = move?.cat === 'phys';
  const stat = isPhys ? 'atk' : 'spa';
  const tera = s.tera[ally];
  return {
    speciesJP: s.slots[ally],
    pts: { [stat]: prof.sp },
    natureJP: natureJPForStat(stat, prof.nature),
    item: atkItemEN(prof.item, isPhys),
    teraJP: tera.on ? tera.type : null,
    boosts: prof.stage ? { [stat]: prof.stage } : undefined,
  };
}

/** 防御側スロット → MonInput。防御能力は技分類で def/spd を切替。 */
export function defInput(s: BoardState, slot: SlotId, isPhys: boolean): MonInput {
  const prof = s.defProfs[slot];
  const stat = isPhys ? 'def' : 'spd';
  const tera = s.tera[slot];
  return {
    speciesJP: s.slots[slot],
    pts: { hp: prof.hpSP, [stat]: prof.defSP },
    natureJP: natureJPForStat(stat, prof.nature),
    item: defItemEN(prof.vest ? 'vest' : 'none'),
    teraJP: tera.on ? tera.type : null,
    boosts: prof.stage ? { [stat]: prof.stage } : undefined,
  };
}

function paramsFor(s: BoardState, ally: AllyId, moveJP: string, slot: SlotId): CalcParams {
  const move = MOVES[moveJP];
  const isPhys = move?.cat === 'phys';
  const atkP = s.atkProfs[ally];
  const defP = s.defProfs[slot];
  return {
    attacker: atkInput(s, ally, moveJP),
    defender: defInput(s, slot, isPhys),
    moveJP,
    doubles: true,
    weather: s.weather,
    terrain: s.terrain,
    helpingHand: atkP.hh,
    intimidate: atkP.intim,
    friendGuard: defP.fg,
    screen: defP.screen,
  };
}

export interface SlotResult extends DamageModel {
  slot: SlotId;
  isAlly: boolean;
}

/** 選択技を全対象に対して計算（味方巻き込みフラグ付き）。 */
export function computeResults(s: BoardState): Record<string, SlotResult> {
  const out: Record<string, SlotResult> = {};
  const other = allyOther(s.activeAtk);
  for (const slot of targetSlots(s)) {
    const dm = calcDamage(paramsFor(s, s.activeAtk, s.moveKey, slot));
    out[slot] = { ...dm, slot, isAlly: slot === other };
  }
  return out;
}

export interface ComboPart {
  slot: AllyId;
  name: string;
  moveJP: string;
  model: DamageModel;
}

export interface ComboResult {
  parts: ComboPart[];
  min: number;
  max: number;
  hp: number;
  verdict: 'none' | 'guaranteed' | 'roll' | 'survive';
}

/** 合算KO：味方A/Bの選択技を focus 中の相手へ合算。'none' は打たない。 */
export function computeCombo(s: BoardState): ComboResult {
  const parts: ComboPart[] = [];
  for (const ally of ['allyA', 'allyB'] as AllyId[]) {
    let mvKey = s.comboMv[ally];
    if (mvKey === 'none') continue;
    // その味方が覚えない技なら先頭技にフォールバック。
    const dexMoves = POKEDEX[s.slots[ally]]?.moves ?? [];
    if (!dexMoves.includes(mvKey)) mvKey = dexMoves[0];
    if (!mvKey) continue;
    const model = calcDamage(paramsFor(s, ally, mvKey, s.focusFoe));
    parts.push({ slot: ally, name: POKEDEX[s.slots[ally]]?.jp ?? s.slots[ally], moveJP: mvKey, model });
  }
  const min = parts.reduce((a, c) => a + c.model.min, 0);
  const max = parts.reduce((a, c) => a + c.model.max, 0);
  const hp = parts[0]?.model.maxHP ?? defenderHP(s);
  let verdict: ComboResult['verdict'] = 'survive';
  if (parts.length === 0) verdict = 'none';
  else if (min >= hp) verdict = 'guaranteed';
  else if (max >= hp) verdict = 'roll';
  return { parts, min, max, hp, verdict };
}

/** focus 相手の最大HP（合算の分母。parts が空でも算出）。 */
function defenderHP(s: BoardState): number {
  const dm = calcDamage(paramsFor(s, s.activeAtk, s.moveKey, s.focusFoe));
  return dm.maxHP;
}
