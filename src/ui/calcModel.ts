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
import { championsSpeed, orderBySpeed } from '../engine/tuning';

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

/** 素早さ早見用の各スロットのプロフィール。 */
export interface SpeProfile {
  pts: number;
  nature: Mult;
  stage: number;
  scarf: boolean;
  para: boolean;
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
  speProfs: Record<SlotId, SpeProfile>;
  allyTailwind: boolean;
  foeTailwind: boolean;
  trickRoom: boolean;
  /** 相手の攻撃プロフィール（両方向計算の「被ダメ」用。F-7）。 */
  foeAtk: Record<FoeId, AtkProfile>;
}

export const allyOther = (a: AllyId): AllyId => (a === 'allyA' ? 'allyB' : 'allyA');

/** 試作 DoublesCalcWireframe の初期盤面を移植した既定状態。 */
export function initialBoard(): BoardState {
  const atk = (): AtkProfile => ({ sp: 32, nature: 1.1, stage: 0, item: 'none', hh: false, intim: false });
  const def = (hpSP: number, defSP: number): DefProfile => ({
    hpSP, defSP, nature: 1.0, vest: false, fg: false, screen: false, stage: 0,
  });
  const tera = (type: TypeJP): TeraState => ({ on: false, type });
  const spe = (): SpeProfile => ({ pts: 0, nature: 1.0, stage: 0, scarf: false, para: false });
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
    speProfs: { foeL: spe(), foeR: spe(), allyA: spe(), allyB: spe() },
    allyTailwind: false,
    foeTailwind: false,
    trickRoom: false,
    foeAtk: { foeL: atk(), foeR: atk() },
  };
}

/** 選択技の対象スロット。single=focus / foes=相手2体 / all=自分以外全体(味方巻き込み)。 */
export function targetSlots(s: BoardState): SlotId[] {
  const move = MOVES[s.moveKey];
  if (!move || move.target === 'single') return [s.focusFoe];
  if (move.target === 'foes') return ['foeL', 'foeR'];
  return ['foeL', 'foeR', allyOther(s.activeAtk)];
}

/** 種族・攻撃プロフィール・テラス・技 → MonInput（攻撃側。どのスロットにも使える汎用）。 */
function buildAtkInput(speciesJP: string, prof: AtkProfile, tera: TeraState, moveJP: string): MonInput {
  const move = MOVES[moveJP];
  const isPhys = move?.cat === 'phys';
  const stat = isPhys ? 'atk' : 'spa';
  return {
    speciesJP,
    pts: { [stat]: prof.sp },
    natureJP: natureJPForStat(stat, prof.nature),
    item: atkItemEN(prof.item, isPhys),
    teraJP: tera.on ? tera.type : null,
    boosts: prof.stage ? { [stat]: prof.stage } : undefined,
  };
}

/** 味方スロット＋技 → MonInput。 */
export function atkInput(s: BoardState, ally: AllyId, moveJP: string): MonInput {
  return buildAtkInput(s.slots[ally], s.atkProfs[ally], s.tera[ally], moveJP);
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

/** アクティブ攻撃役が指定スロットを攻撃する CalcParams（耐久逆算 F-12 の入力に使う）。 */
export function attackParamsFor(s: BoardState, slot: SlotId): CalcParams {
  return paramsFor(s, s.activeAtk, s.moveKey, slot);
}

/** 任意の攻撃スロット(味方/相手)→防御スロットの CalcParams。両方向計算で相手→味方も組める。 */
function paramsForAtk(s: BoardState, atkSlot: SlotId, atkProf: AtkProfile, moveJP: string, defSlot: SlotId): CalcParams {
  const move = MOVES[moveJP];
  const isPhys = move?.cat === 'phys';
  const defP = s.defProfs[defSlot];
  return {
    attacker: buildAtkInput(s.slots[atkSlot], atkProf, s.tera[atkSlot], moveJP),
    defender: defInput(s, defSlot, isPhys),
    moveJP,
    doubles: true,
    weather: s.weather,
    terrain: s.terrain,
    helpingHand: atkProf.hh,
    intimidate: atkProf.intim,
    friendGuard: defP.fg,
    screen: defP.screen,
  };
}

function paramsFor(s: BoardState, ally: AllyId, moveJP: string, slot: SlotId): CalcParams {
  return paramsForAtk(s, ally, s.atkProfs[ally], moveJP, slot);
}

export interface MoveDamage {
  moveJP: string;
  model: DamageModel;
}

/**
 * 全技ダメ計（F-7）：指定の攻撃役が覚える全技を target へ計算し、最大ダメージ降順で返す。
 * 範囲技はダブルの ×0.75 が乗った実値（現盤面の条件で比較できる）。
 */
export function allMovesDamage(s: BoardState, ally: AllyId, target: SlotId): MoveDamage[] {
  const moves = POKEDEX[s.slots[ally]]?.moves ?? [];
  const rows = moves.map((mv) => ({ moveJP: mv, model: calcDamage(paramsFor(s, ally, mv, target)) }));
  rows.sort((a, b) => b.model.max - a.model.max || b.model.min - a.model.min);
  return rows;
}

/**
 * 両方向計算の「被ダメ」（F-7）：focus 中の相手が攻撃役（味方）へ放つ全技を計算し降順で返す。
 * 相手の攻撃投資は foeAtk プロフィール、味方の耐久は defProfs[activeAtk] を用いる（左右対称・実値）。
 */
export function incomingMovesDamage(s: BoardState): MoveDamage[] {
  const foe = s.focusFoe;
  const ally = s.activeAtk;
  const moves = POKEDEX[s.slots[foe]]?.moves ?? [];
  const rows = moves.map((mv) => ({
    moveJP: mv,
    model: calcDamage(paramsForAtk(s, foe, s.foeAtk[foe], mv, ally)),
  }));
  rows.sort((a, b) => b.model.max - a.model.max || b.model.min - a.model.min);
  return rows;
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

/* ----------------------------- 素早さ早見（F-13） ----------------------------- */

export interface SpeedRow {
  slot: SlotId;
  name: string;
  isAlly: boolean;
  speed: number;
  /** 行動順（1始まり。トリル考慮）。同速は同順位。 */
  rank: number;
}

const SLOT_ORDER: SlotId[] = ['foeL', 'foeR', 'allyA', 'allyB'];

/** 全スロットの素早さ実数値（補正込み）と行動順を算出。 */
export function speedRows(s: BoardState): SpeedRow[] {
  const base = SLOT_ORDER.map((slot) => {
    const prof = s.speProfs[slot];
    const isAlly = slot === 'allyA' || slot === 'allyB';
    const speBase = POKEDEX[s.slots[slot]]?.base.spe ?? 0;
    const speed = championsSpeed(speBase, prof.pts, prof.nature, prof.stage, {
      scarf: prof.scarf,
      paralysis: prof.para,
      tailwind: isAlly ? s.allyTailwind : s.foeTailwind,
    });
    return { slot, name: POKEDEX[s.slots[slot]]?.jp ?? s.slots[slot], isAlly, speed };
  });

  const ordered = orderBySpeed(base.map((b) => ({ id: b.slot, speed: b.speed })), s.trickRoom);
  // 同速は同順位（標準的な順位付け）。
  const rankOf = new Map<SlotId, number>();
  ordered.forEach((e, i) => {
    const prev = i > 0 ? ordered[i - 1] : null;
    const rank = prev && prev.speed === e.speed ? rankOf.get(prev.id)! : i + 1;
    rankOf.set(e.id, rank);
  });

  return base
    .map((b) => ({ ...b, rank: rankOf.get(b.slot)! }))
    .sort((a, b) => a.rank - b.rank);
}
