// storage/index.ts — AsyncStorage 実装の隔離点。アプリはここから presetStore を使う。
// （AsyncStorage の import をこのファイルに閉じ込め、presets.ts は RN 非依存に保つ）

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPresetStore, type StorageAdapter } from './presets';

/** AsyncStorage を StorageAdapter に適合させた実装（差分キャッシュ等でも共用）。 */
export const asyncStorageAdapter: StorageAdapter = {
  getItem: (key) => AsyncStorage.getItem(key),
  setItem: (key, value) => AsyncStorage.setItem(key, value),
};

/** アプリ全体で使う構築プリセットストア。 */
export const presetStore = createPresetStore(asyncStorageAdapter);

export type { SavedPreset, PresetStore, StorageAdapter } from './presets';
