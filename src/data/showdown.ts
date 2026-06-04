// showdown.ts — Pokémon Showdown / PokePaste テキストの取込・書き出し。
// Champions エコシステムの事実上の交換形式（PikaChampions/PokeStats 等が採用）に対応し、
// 「手入力削減」という核心の差別化を、外部依存ゼロ・自己完結で実現する。
//
// 制約: 我々の盤面モデルは「攻撃役の1攻撃stat・防御の1stat」を持つ簡略形のため、
// Showdownの6stat完全形との変換はベストエフォート（役割=attacker/defender で曖昧さを解消）。

import { ptsToEV } from '../engine/championsAdapter';
import { POKEDEX } from './pokedex';
import { MOVES } from './moves';
import { NATURES } from './natures';
import { TYPE_EN_TO_JP, TYPE_JP_TO_EN, type TypeJP } from './types';
import type {
  BoardState, AtkProfile, DefProfile, SpeProfile, TeraState, Mult, SlotId,
} from '../ui/calcModel';
import { initialBoard } from '../ui/calcModel';

export type StatKey = 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe';

/** EV → 能力ポイント（ptsToEV の逆。0→0 / 4→1 / 252→32）。 */
export const evToPts = (ev: number): number => Math.min(32, Math.max(0, Math.ceil(ev / 8)));

/* ----------------------------- 逆引き（EN→JP） ----------------------------- */

const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');

const SPECIES_BY_EN: Record<string, string> = {};
for (const v of Object.values(POKEDEX)) SPECIES_BY_EN[norm(v.en)] = v.jp;
const MOVE_BY_EN: Record<string, string> = {};
for (const v of Object.values(MOVES)) MOVE_BY_EN[norm(v.en)] = v.jp;
const NATURE_BY_EN = Object.fromEntries(NATURES.map((n) => [norm(n.en), n]));

export const speciesJPFromEN = (en: string): string | undefined => SPECIES_BY_EN[norm(en)];
export const moveJPFromEN = (en: string): string | undefined => MOVE_BY_EN[norm(en)];

/* ----------------------------- パース ----------------------------- */

export interface ParsedSet {
  nickname?: string;
  speciesEN: string;
  itemEN?: string;
  abilityEN?: string;
  level?: number;
  teraEN?: string;
  natureEN?: string;
  evs: Partial<Record<StatKey, number>>;
  ivs: Partial<Record<StatKey, number>>;
  moves: string[];
}

const STAT_LABEL: Record<string, StatKey> = {
  hp: 'hp', atk: 'atk', def: 'def', spa: 'spa', spd: 'spd', spe: 'spe',
};

function parseStatLine(line: string): Partial<Record<StatKey, number>> {
  const out: Partial<Record<StatKey, number>> = {};
  for (const part of line.split('/')) {
    const m = part.trim().match(/^(\d+)\s+([A-Za-z]+)$/);
    if (m) {
      const key = STAT_LABEL[m[2].toLowerCase()];
      if (key) out[key] = parseInt(m[1], 10);
    }
  }
  return out;
}

function parseBlock(block: string): ParsedSet | null {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const set: ParsedSet = { speciesEN: '', evs: {}, ivs: {}, moves: [] };

  // 1行目: [Nickname (]Species[)] [@ Item]
  let head = lines[0];
  let itemEN: string | undefined;
  const at = head.lastIndexOf(' @ ');
  if (at >= 0) {
    itemEN = head.slice(at + 3).trim();
    head = head.slice(0, at).trim();
  }
  const paren = head.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (paren) {
    const inner = paren[2].trim();
    if (inner === 'M' || inner === 'F') {
      set.speciesEN = paren[1].trim(); // 性別マーカー
    } else {
      set.nickname = paren[1].trim();
      set.speciesEN = inner;
    }
  } else {
    set.speciesEN = head;
  }
  set.itemEN = itemEN;

  for (const line of lines.slice(1)) {
    if (line.startsWith('- ') || line.startsWith('~ ')) {
      const mv = line.slice(2).trim().split(/\s*\[/)[0].trim(); // Hidden Power 等の [] を除去
      if (mv) set.moves.push(mv);
    } else if (/^Ability:/i.test(line)) set.abilityEN = line.replace(/^Ability:/i, '').trim();
    else if (/^Level:/i.test(line)) set.level = parseInt(line.replace(/^Level:/i, '').trim(), 10) || undefined;
    else if (/^Tera Type:/i.test(line)) set.teraEN = line.replace(/^Tera Type:/i, '').trim();
    else if (/^EVs:/i.test(line)) set.evs = parseStatLine(line.replace(/^EVs:/i, ''));
    else if (/^IVs:/i.test(line)) set.ivs = parseStatLine(line.replace(/^IVs:/i, ''));
    else if (/\bNature$/i.test(line)) set.natureEN = line.replace(/\s*Nature$/i, '').trim();
  }
  return set.speciesEN ? set : null;
}

/** Showdown/PokePaste テキスト → セット配列（空行区切り）。 */
export function parseShowdown(text: string): ParsedSet[] {
  return (text ?? '')
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map(parseBlock)
    .filter((s): s is ParsedSet => !!s);
}

/* ----------------------------- セット → 盤面プロフィール ----------------------------- */

export interface ResolvedSlot {
  speciesJP: string;
  atk: AtkProfile;
  def: DefProfile;
  spe: SpeProfile;
  tera: TeraState;
  warnings: string[];
}

function natureMult(stat: 'atk' | 'def' | 'spa' | 'spd' | 'spe', natureEN?: string): Mult {
  if (!natureEN) return 1.0;
  const n = NATURE_BY_EN[norm(natureEN)];
  if (!n) return 1.0;
  if (n.plus === stat) return 1.1;
  if (n.minus === stat) return 0.9;
  return 1.0;
}

function offenseItem(itemEN?: string): AtkProfile['item'] {
  if (!itemEN) return 'none';
  const n = norm(itemEN);
  if (n === 'choiceband' || n === 'choicespecs') return 'band';
  if (n === 'lifeorb') return 'tama';
  return 'none';
}

/** 1セットを盤面プロフィール片に解決（攻撃stat/防御statは EV の大きい方を採用）。 */
export function resolveSlot(set: ParsedSet): ResolvedSlot | null {
  const speciesJP = speciesJPFromEN(set.speciesEN);
  if (!speciesJP) return null; // ロスター外は呼び出し側で warning
  const warnings: string[] = [];
  const ev = set.evs;
  const base = POKEDEX[speciesJP].base;

  // 攻撃stat: EVが大きい方、無ければ種族値が高い方。
  const atkIsPhys = (ev.atk ?? 0) !== (ev.spa ?? 0)
    ? (ev.atk ?? 0) > (ev.spa ?? 0)
    : base.atk >= base.spa;
  const atkStat = atkIsPhys ? 'atk' : 'spa';
  // 防御stat: 同様。
  const defIsPhysSide = (ev.def ?? 0) !== (ev.spd ?? 0)
    ? (ev.def ?? 0) > (ev.spd ?? 0)
    : base.def >= base.spd;
  const defStat = defIsPhysSide ? 'def' : 'spd';

  const scarf = norm(set.itemEN ?? '') === 'choicescarf';
  const vest = norm(set.itemEN ?? '') === 'assaultvest';

  const atk: AtkProfile = {
    sp: evToPts(ev[atkStat] ?? 0),
    nature: natureMult(atkStat, set.natureEN),
    stage: 0,
    item: offenseItem(set.itemEN),
    hh: false,
    intim: false,
  };
  const def: DefProfile = {
    hpSP: evToPts(ev.hp ?? 0),
    defSP: evToPts(ev[defStat] ?? 0),
    nature: natureMult(defStat, set.natureEN),
    vest,
    fg: false,
    screen: false,
    stage: 0,
  };
  const spe: SpeProfile = {
    pts: evToPts(ev.spe ?? 0),
    nature: natureMult('spe', set.natureEN),
    stage: 0,
    scarf,
    para: false,
  };
  let tera: TeraState = { on: false, type: 'はがね' };
  if (set.teraEN) {
    const tjp = TYPE_EN_TO_JP[set.teraEN as keyof typeof TYPE_EN_TO_JP] ?? undefined;
    if (tjp) tera = { on: true, type: tjp as TypeJP };
    else warnings.push(`未知のテラスタイプ: ${set.teraEN}`);
  }
  // 技構成は盤面のロスター定義を使うため、取り込んだ技は警告に留める。
  const unknownMoves = set.moves.filter((m) => !moveJPFromEN(m));
  if (unknownMoves.length) warnings.push(`未対応の技（無視）: ${unknownMoves.join(', ')}`);

  return { speciesJP, atk, def, spe, tera, warnings };
}

export interface ImportResult {
  board: BoardState;
  /** 反映できたスロットと種族名。 */
  applied: Array<{ slot: SlotId; name: string }>;
  warnings: string[];
}

const IMPORT_SLOTS: SlotId[] = ['allyA', 'allyB', 'foeL', 'foeR'];

/**
 * Showdownチーム → 盤面（ベストエフォート）。先頭4体を 味方A/B・相手L/R に割り当てる。
 * 能力P制への近似（EV→pts、攻撃/防御statはEV大の方）を行う。
 */
export function importTeamToBoard(prev: BoardState, sets: ParsedSet[]): ImportResult {
  const board: BoardState = JSON.parse(JSON.stringify(prev));
  const applied: ImportResult['applied'] = [];
  const warnings: string[] = [];

  sets.slice(0, 4).forEach((set, i) => {
    const slot = IMPORT_SLOTS[i];
    const r = resolveSlot(set);
    if (!r) {
      warnings.push(`ロスター外のため取込不可: ${set.speciesEN}`);
      return;
    }
    warnings.push(...r.warnings.map((w) => `${r.speciesJP}: ${w}`));
    board.slots[slot] = r.speciesJP;
    board.tera[slot] = r.tera;
    board.speProfs[slot] = r.spe;
    if (slot === 'allyA' || slot === 'allyB') board.atkProfs[slot] = r.atk;
    board.defProfs[slot] = r.def;
    applied.push({ slot, name: r.speciesJP });
  });

  // アクティブ攻撃役と技をリセット（取り込んだ味方Aの先頭技）。
  board.activeAtk = 'allyA';
  board.moveKey = POKEDEX[board.slots.allyA].moves[0];
  board.comboMv = {
    allyA: POKEDEX[board.slots.allyA].moves[0],
    allyB: POKEDEX[board.slots.allyB].moves[0],
  };
  if (sets.length > 4) warnings.push(`5体目以降は盤面に載らないため省略（${sets.length}体中4体を反映）。`);

  return { board, applied, warnings };
}

/* ----------------------------- 盤面 → Showdown（書き出し） ----------------------------- */

const EV_LABEL: Record<StatKey, string> = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

/** 対象statを mult(1.1/0.9) にする性格の英名。1.0 は null（中立=Hardy）。 */
function natureENForStat(stat: 'atk' | 'spa', mult: Mult): string | null {
  if (mult === 1.0) return null;
  const found = mult === 1.1
    ? NATURES.find((n) => n.plus === stat && n.minus !== stat)
    : NATURES.find((n) => n.minus === stat && n.plus !== stat);
  return found ? found.en : null;
}

/** 1味方スロット → Showdown セット文字列。 */
function allyToSet(board: BoardState, slot: 'allyA' | 'allyB'): string {
  const dex = POKEDEX[board.slots[slot]];
  const atkP = board.atkProfs[slot];
  const defP = board.defProfs[slot];
  const speP = board.speProfs[slot];
  const tera = board.tera[slot];
  const isPhys = dex.base.atk >= dex.base.spa;
  const atkStat: StatKey = isPhys ? 'atk' : 'spa';

  const item = speP.scarf
    ? 'Choice Scarf'
    : atkP.item === 'band'
      ? (isPhys ? 'Choice Band' : 'Choice Specs')
      : atkP.item === 'tama'
        ? 'Life Orb'
        : defP.vest
          ? 'Assault Vest'
          : '';

  const evs: Partial<Record<StatKey, number>> = {};
  const add = (k: StatKey, pts: number) => { if (pts > 0) evs[k] = ptsToEV(pts); };
  add(atkStat, atkP.sp);
  add('hp', defP.hpSP);
  add('def', defP.defSP); // モデル制約: 防御Pは def として書き出す（近似）
  add('spe', speP.pts);

  const nature = natureENForStat(atkStat as 'atk' | 'spa', atkP.nature) ?? 'Hardy';

  const lines: string[] = [];
  lines.push(item ? `${dex.en} @ ${item}` : dex.en);
  lines.push('Level: 50');
  if (tera.on) lines.push(`Tera Type: ${TYPE_JP_TO_EN[tera.type]}`);
  const evStr = (Object.keys(evs) as StatKey[]).map((k) => `${evs[k]} ${EV_LABEL[k]}`).join(' / ');
  if (evStr) lines.push(`EVs: ${evStr}`);
  lines.push(`${nature} Nature`);
  for (const mvJP of dex.moves) lines.push(`- ${MOVES[mvJP].en}`);
  return lines.join('\n');
}

/** 盤面の味方2体 → Showdown/PokePaste テキスト（能力P→EV換算、出力は近似を含む）。 */
export function boardAlliesToShowdown(board: BoardState): string {
  return [allyToSet(board, 'allyA'), allyToSet(board, 'allyB')].join('\n\n');
}

/** デモ/テスト用の既定盤面からの書き出し（初期盤面）。 */
export const exampleShowdown = (): string => boardAlliesToShowdown(initialBoard());
