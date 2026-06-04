// presets.test.ts — プリセット永続化ロジックを in-memory アダプタで検証（RN非依存）。
import { createPresetStore, type StorageAdapter } from '../presets';
import { initialBoard, type BoardState } from '../../ui/calcModel';

function memAdapter(): StorageAdapter & { dump: Record<string, string> } {
  const dump: Record<string, string> = {};
  return {
    dump,
    getItem: async (k) => (k in dump ? dump[k] : null),
    setItem: async (k, v) => { dump[k] = v; },
  };
}

const boardNamed = (foeL: string): BoardState => ({ ...initialBoard(), slots: { ...initialBoard().slots, foeL } });

describe('PresetStore', () => {
  it('初期状態は空', async () => {
    const store = createPresetStore(memAdapter());
    expect(await store.list()).toEqual([]);
  });

  it('保存して一覧で取得できる（盤面が復元できる）', async () => {
    const store = createPresetStore(memAdapter());
    const saved = await store.save('わたしの構築', boardNamed('バンギラス'));
    expect(saved.id).toBeTruthy();
    expect(saved.name).toBe('わたしの構築');
    const list = await store.list();
    expect(list.length).toBe(1);
    expect(list[0].board.slots.foeL).toBe('バンギラス');
  });

  it('同名は上書き（IDを維持して内容更新）', async () => {
    const store = createPresetStore(memAdapter());
    const first = await store.save('A', boardNamed('バンギラス'));
    const second = await store.save('A', boardNamed('ヒードラン'));
    expect(second.id).toBe(first.id);
    const list = await store.list();
    expect(list.length).toBe(1);
    expect(list[0].board.slots.foeL).toBe('ヒードラン');
  });

  it('別名は別エントリとして追加', async () => {
    const store = createPresetStore(memAdapter());
    await store.save('A', initialBoard());
    await store.save('B', initialBoard());
    expect((await store.list()).length).toBe(2);
  });

  it('削除できる', async () => {
    const store = createPresetStore(memAdapter());
    const p = await store.save('A', initialBoard());
    await store.remove(p.id);
    expect(await store.list()).toEqual([]);
  });

  it('リネームできる', async () => {
    const store = createPresetStore(memAdapter());
    const p = await store.save('旧', initialBoard());
    await store.rename(p.id, '新');
    expect((await store.list())[0].name).toBe('新');
  });

  it('保存はスナップショット（元stateの後続変更に影響されない）', async () => {
    const adapter = memAdapter();
    const store = createPresetStore(adapter);
    const board = boardNamed('バンギラス');
    await store.save('A', board);
    board.slots.foeL = 'ヒードラン'; // 保存後に元を書き換え
    expect((await store.list())[0].board.slots.foeL).toBe('バンギラス');
  });

  it('壊れたデータは空扱い（クラッシュしない）', async () => {
    const adapter = memAdapter();
    adapter.dump['champions.presets.v1'] = '{ broken json';
    const store = createPresetStore(adapter);
    expect(await store.list()).toEqual([]);
  });
});
