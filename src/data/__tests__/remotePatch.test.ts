// remotePatch.test.ts — 差分配信の検証/サニタイズと同期フローを検証（依存注入で純粋）。
import {
  validatePatch, syncPatch, type FetchLike,
} from '../remotePatch';
import type { StorageAdapter } from '../../storage/presets';
import type { ChampionsPatch } from '../champions';

function memAdapter(): StorageAdapter & { dump: Record<string, string> } {
  const dump: Record<string, string> = {};
  return { dump, getItem: async (k) => (k in dump ? dump[k] : null), setItem: async (k, v) => { dump[k] = v; } };
}
const okFetch = (body: unknown): FetchLike => async () => ({ ok: true, json: async () => body });
const failFetch: FetchLike = async () => ({ ok: false, json: async () => null });
const throwFetch: FetchLike = async () => { throw new Error('offline'); };

describe('validatePatch（検証・サニタイズ）', () => {
  it('妥当な差分を受理', () => {
    const p = validatePatch({
      version: '1.2.3', updatedAt: '2026-06-05',
      moves: { じしん: { basePower: 120, verified: true } },
      species: { カバルドン: { baseStats: { def: 100 }, types: ['はがね'] } },
    })!;
    expect(p.version).toBe('1.2.3');
    expect(p.moves['じしん'].basePower).toBe(120);
    expect(p.species['カバルドン'].baseStats).toEqual({ def: 100 });
    expect(p.species['カバルドン'].types).toEqual(['はがね']);
  });
  it('不正な型・実効ゼロのエントリは除外', () => {
    const p = validatePatch({
      moves: {
        じしん: { basePower: 'x' },       // 不正型 → 中身空 → 除外
        いわなだれ: { type: 'ニセ' },      // 不正タイプ → 除外
        ねっぷう: { basePower: 95 },        // 有効
      },
      species: { カバルドン: { baseStats: { def: 'y' } } }, // 不正 → 除外
    })!;
    expect(p.moves['じしん']).toBeUndefined();
    expect(p.moves['いわなだれ']).toBeUndefined();
    expect(p.moves['ねっぷう'].basePower).toBe(95);
    expect(p.species['カバルドン']).toBeUndefined();
  });
  it('オブジェクトでなければ null', () => {
    expect(validatePatch('nope')).toBeNull();
    expect(validatePatch(null)).toBeNull();
  });
  it('version 等が無くてもメタ補完して受理（空配信も有効）', () => {
    const p = validatePatch({ moves: {}, species: {} })!;
    expect(typeof p.version).toBe('string');
  });
});

describe('syncPatch（同期フロー）', () => {
  const remotePatch = { version: 'r1', updatedAt: '2026-06-05', moves: { じしん: { basePower: 120 } }, species: {} };

  it('リモートが取れれば適用＆キャッシュ更新', async () => {
    const storage = memAdapter();
    const applied: ChampionsPatch[] = [];
    const res = await syncPatch({ storage, url: 'x', fetchFn: okFetch(remotePatch), apply: (p) => applied.push(p) });
    expect(res.applied).toBe('remote');
    expect(res.version).toBe('r1');
    expect(applied[applied.length - 1].moves['じしん'].basePower).toBe(120);
    expect(storage.dump['champions.patch.v1']).toContain('r1'); // キャッシュされた
  });

  it('オフライン(throw)ならキャッシュを適用', async () => {
    const storage = memAdapter();
    storage.dump['champions.patch.v1'] = JSON.stringify({ version: 'c1', updatedAt: 'x', moves: {}, species: {} });
    const applied: ChampionsPatch[] = [];
    const res = await syncPatch({ storage, url: 'x', fetchFn: throwFetch, apply: (p) => applied.push(p) });
    expect(res.applied).toBe('cached');
    expect(res.version).toBe('c1');
  });

  it('キャッシュもリモートも無ければ builtin（applyは呼ばれない）', async () => {
    const storage = memAdapter();
    const applied: ChampionsPatch[] = [];
    const res = await syncPatch({ storage, url: 'x', fetchFn: failFetch, apply: (p) => applied.push(p) });
    expect(res.applied).toBe('builtin');
    expect(applied.length).toBe(0);
  });

  it('キャッシュ即適用→リモートで上書き（applyが2回呼ばれ最後がリモート）', async () => {
    const storage = memAdapter();
    storage.dump['champions.patch.v1'] = JSON.stringify({ version: 'c1', updatedAt: 'x', moves: {}, species: {} });
    const applied: ChampionsPatch[] = [];
    const res = await syncPatch({ storage, url: 'x', fetchFn: okFetch(remotePatch), apply: (p) => applied.push(p) });
    expect(applied.map((p) => p.version)).toEqual(['c1', 'r1']);
    expect(res.applied).toBe('remote');
  });
});
