// presets.ts — 構築（盤面プリセット）の永続化ロジック。
// ストレージは StorageAdapter 抽象に依存させ、AsyncStorage 等の実装は外から注入する
// （中核ロジックを RN 非依存に保ち、ユニットテスト可能にするため）。

import type { BoardState } from '../ui/calcModel';

/** 永続ストレージの最小インターフェース（AsyncStorage/localStorage 互換）。 */
export interface StorageAdapter {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** 保存された構築（盤面スナップショット）。 */
export interface SavedPreset {
  id: string;
  name: string;
  /** ISO 文字列。 */
  savedAt: string;
  board: BoardState;
}

const STORAGE_KEY = 'champions.presets.v1';

const genId = (): string =>
  `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export interface PresetStore {
  list(): Promise<SavedPreset[]>;
  /** 同名があれば上書き、無ければ新規追加。保存した結果を返す。 */
  save(name: string, board: BoardState): Promise<SavedPreset>;
  remove(id: string): Promise<void>;
  rename(id: string, name: string): Promise<void>;
}

/** StorageAdapter を受け取り、プリセットの CRUD を提供する。 */
export function createPresetStore(storage: StorageAdapter): PresetStore {
  async function readAll(): Promise<SavedPreset[]> {
    const raw = await storage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as SavedPreset[]) : [];
    } catch {
      return []; // 壊れたデータは空扱い（クラッシュさせない）
    }
  }

  async function writeAll(list: SavedPreset[]): Promise<void> {
    await storage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  return {
    async list() {
      const all = await readAll();
      // 新しい順。
      return all.sort((a, b) => (a.savedAt < b.savedAt ? 1 : -1));
    },

    async save(name, board) {
      const trimmed = name.trim() || '無題';
      const all = await readAll();
      const now = new Date().toISOString();
      const snapshot: BoardState = JSON.parse(JSON.stringify(board)); // 深いコピーで参照切り離し
      const existing = all.find((p) => p.name === trimmed);
      let saved: SavedPreset;
      if (existing) {
        saved = { ...existing, savedAt: now, board: snapshot };
        await writeAll(all.map((p) => (p.id === existing.id ? saved : p)));
      } else {
        saved = { id: genId(), name: trimmed, savedAt: now, board: snapshot };
        await writeAll([saved, ...all]);
      }
      return saved;
    },

    async remove(id) {
      const all = await readAll();
      await writeAll(all.filter((p) => p.id !== id));
    },

    async rename(id, name) {
      const all = await readAll();
      await writeAll(all.map((p) => (p.id === id ? { ...p, name: name.trim() || p.name } : p)));
    },
  };
}
