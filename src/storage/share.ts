// share.ts — 構築（盤面）の共有コード化。
// 盤面を「PC1.<base64url>」形式の文字列にエンコード/デコードする。
// JSON → UTF-8(TextEncoder) → Base64URL（自前実装で btoa の多バイト問題を回避・RN/Hermes/node 共通）。
// デコードは検証付きで、壊れ/非互換/未知ポケモンを含むコードは null を返す（クラッシュさせない）。

import type { BoardState, SlotId } from '../ui/calcModel';
import { POKEDEX } from '../data';

const PREFIX = 'PC1.';
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const B64_LOOKUP: Record<string, number> = {};
for (let i = 0; i < B64.length; i++) B64_LOOKUP[B64[i]] = i;

function bytesToB64url(bytes: Uint8Array): string {
  let out = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    out += B64[b0 >> 2];
    out += B64[((b0 & 3) << 4) | (b1 >> 4)];
    if (i + 1 < len) out += B64[((b1 & 15) << 2) | (b2 >> 6)];
    if (i + 2 < len) out += B64[b2 & 63];
  }
  return out;
}

function b64urlToBytes(s: string): Uint8Array {
  const bytes: number[] = [];
  for (let i = 0; i < s.length; i += 4) {
    const c0 = B64_LOOKUP[s[i]];
    const c1 = B64_LOOKUP[s[i + 1]];
    const c2 = s[i + 2] !== undefined ? B64_LOOKUP[s[i + 2]] : undefined;
    const c3 = s[i + 3] !== undefined ? B64_LOOKUP[s[i + 3]] : undefined;
    if (c0 === undefined || c1 === undefined) break;
    bytes.push((c0 << 2) | (c1 >> 4));
    if (c2 !== undefined) bytes.push(((c1 & 15) << 4) | (c2 >> 2));
    if (c2 !== undefined && c3 !== undefined) bytes.push(((c2 & 3) << 6) | c3);
  }
  return Uint8Array.from(bytes);
}

interface Envelope {
  v: 1;
  b: BoardState;
}

/** 盤面 → 共有コード（PC1.〜）。 */
export function encodeBoard(board: BoardState): string {
  const env: Envelope = { v: 1, b: board };
  const json = JSON.stringify(env);
  const bytes = new TextEncoder().encode(json);
  return PREFIX + bytesToB64url(bytes);
}

const SLOTS: SlotId[] = ['foeL', 'foeR', 'allyA', 'allyB'];

function isValidBoard(b: unknown): b is BoardState {
  if (!b || typeof b !== 'object') return false;
  const board = b as Partial<BoardState>;
  if (!board.slots || typeof board.slots !== 'object') return false;
  for (const sl of SLOTS) {
    const sp = (board.slots as Record<string, unknown>)[sl];
    // 4スロットが存在し、現行ロスターに含まれる種族であること（非互換コードを弾く）。
    if (typeof sp !== 'string' || !POKEDEX[sp]) return false;
  }
  // 主要プロフィールの存在を最小確認。
  return !!(board.atkProfs && board.defProfs && board.tera && board.speProfs && board.foeAtk);
}

/**
 * 共有コード → 盤面。形式不正・JSON破損・バージョン不一致・未知ポケモンは null。
 * 前後空白や改行は許容する。
 */
export function decodeBoard(code: string): BoardState | null {
  const trimmed = (code ?? '').trim();
  if (!trimmed.startsWith(PREFIX)) return null;
  const body = trimmed.slice(PREFIX.length).replace(/\s+/g, '');
  try {
    const bytes = b64urlToBytes(body);
    const json = new TextDecoder().decode(bytes);
    const env = JSON.parse(json) as Partial<Envelope>;
    if (env.v !== 1 || !isValidBoard(env.b)) return null;
    return env.b as BoardState;
  } catch {
    return null;
  }
}
