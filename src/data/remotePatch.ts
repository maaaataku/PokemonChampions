// remotePatch.ts — Champions差分パッチの配信取得層（N-6）。サーバレス（静的JSON配信）前提。
// 起動時に「キャッシュ→リモート」の順で適用し、失敗時は同梱パッチにフォールバックする。
// リモートは untrusted なので、取り込み前に必ず検証＆サニタイズする（不正データを注入しない）。
//
// 依存（StorageAdapter / fetch / apply）は注入式にして純粋・テスト可能に保つ。

import type { StorageAdapter } from '../storage/presets';
import { BUILTIN_PATCH, type ChampionsPatch, type MoveOverride, type SpeciesOverride } from './champions';
import { TYPE_JP_TO_EN, type TypeJP } from './types';

const CACHE_KEY = 'champions.patch.v1';

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const;
const isTypeJP = (v: unknown): v is TypeJP => typeof v === 'string' && v in TYPE_JP_TO_EN;
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function sanitizeMove(v: unknown): MoveOverride | null {
  if (!isObj(v)) return null;
  const out: MoveOverride = {};
  if (isNum(v.basePower)) out.basePower = v.basePower;
  if (isTypeJP(v.type)) out.type = v.type;
  if (v.category === 'phys' || v.category === 'spec') out.category = v.category;
  if (v.target === 'single' || v.target === 'foes' || v.target === 'all') out.target = v.target;
  if (typeof v.verified === 'boolean') out.verified = v.verified;
  if (typeof v.note === 'string') out.note = v.note;
  // 中身が空（実効差分なし）のエントリは捨てる。
  return out.basePower != null || out.type || out.category || out.target ? out : null;
}

function sanitizeSpecies(v: unknown): SpeciesOverride | null {
  if (!isObj(v)) return null;
  const out: SpeciesOverride = {};
  if (isObj(v.baseStats)) {
    const bs: Partial<Record<(typeof STAT_KEYS)[number], number>> = {};
    for (const k of STAT_KEYS) if (isNum(v.baseStats[k])) bs[k] = v.baseStats[k] as number;
    if (Object.keys(bs).length) out.baseStats = bs;
  }
  if (Array.isArray(v.types)) {
    const types = v.types.filter(isTypeJP);
    if (types.length) out.types = types;
  }
  if (typeof v.verified === 'boolean') out.verified = v.verified;
  if (typeof v.note === 'string') out.note = v.note;
  return out.baseStats || out.types ? out : null;
}

/** untrusted な入力 → 妥当な ChampionsPatch（不正エントリは除外）。全滅なら null。 */
export function validatePatch(input: unknown): ChampionsPatch | null {
  if (!isObj(input)) return null;
  const moves: Record<string, MoveOverride> = {};
  const species: Record<string, SpeciesOverride> = {};
  if (isObj(input.moves)) {
    for (const [k, v] of Object.entries(input.moves)) {
      const m = sanitizeMove(v);
      if (m) moves[k] = m;
    }
  }
  if (isObj(input.species)) {
    for (const [k, v] of Object.entries(input.species)) {
      const s = sanitizeSpecies(v);
      if (s) species[k] = s;
    }
  }
  const version = typeof input.version === 'string' ? input.version : '0.0.0-remote';
  const updatedAt = typeof input.updatedAt === 'string' ? input.updatedAt : new Date().toISOString();
  // version 等のメタだけで中身ゼロのパッチは「適用するが空」として有効扱い（明示的な空配信もありうる）。
  return { version, updatedAt, moves, species };
}

/* ----------------------------- 取得 ----------------------------- */

/** fetch の最小形（テストで差し替え可能）。 */
export type FetchLike = (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;

export async function readCachedPatch(storage: StorageAdapter): Promise<ChampionsPatch | null> {
  const raw = await storage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    return validatePatch(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeCachedPatch(storage: StorageAdapter, patch: ChampionsPatch): Promise<void> {
  await storage.setItem(CACHE_KEY, JSON.stringify(patch));
}

/** リモート静的JSONを取得＆検証。ネットワーク/形式エラーは null（フォールバックさせる）。 */
export async function fetchRemotePatch(url: string, fetchFn: FetchLike): Promise<ChampionsPatch | null> {
  try {
    const res = await fetchFn(url);
    if (!res.ok) return null;
    return validatePatch(await res.json());
  } catch {
    return null;
  }
}

export interface SyncDeps {
  storage: StorageAdapter;
  url: string;
  fetchFn: FetchLike;
  /** パッチ適用（既定では setActivePatch + rebuild。テストでは spy を注入）。 */
  apply: (patch: ChampionsPatch) => void;
}

export interface SyncResult {
  /** 最終的に適用された出所。 */
  applied: 'remote' | 'cached' | 'builtin';
  version: string;
}

/**
 * 差分同期: キャッシュを即適用（高速・オフライン）→ リモートが取れれば上書き適用＆キャッシュ更新。
 * どちらも無ければ同梱（BUILTIN）のまま。
 */
export async function syncPatch(deps: SyncDeps): Promise<SyncResult> {
  let applied: SyncResult['applied'] = 'builtin';
  let version = BUILTIN_PATCH.version;

  const cached = await readCachedPatch(deps.storage);
  if (cached) {
    deps.apply(cached);
    applied = 'cached';
    version = cached.version;
  }

  const remote = await fetchRemotePatch(deps.url, deps.fetchFn);
  if (remote) {
    await writeCachedPatch(deps.storage, remote);
    deps.apply(remote);
    applied = 'remote';
    version = remote.version;
  }

  return { applied, version };
}
