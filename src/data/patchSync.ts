// patchSync.ts — 差分配信の実配線（実 fetch / AsyncStorage / rebuild）。
// remotePatch.ts（純粋）を、本物の依存に結線する隔離点。

import { setActivePatch } from './champions';
import { rebuildMoves } from './moves';
import { rebuildPokedex } from './pokedex';
import { syncPatch, type FetchLike, type SyncResult } from './remotePatch';
import { asyncStorageAdapter } from '../storage';

/**
 * 配信元の静的JSONのURL（CDN/GitHub Pages 等）。
 * 空文字の間はリモート取得を行わず、キャッシュ／同梱パッチのみで動作する。
 * 例: 'https://<your-cdn>/champions/patch.json'
 */
export const PATCH_URL = '';

/** 同梱差分を有効活用するための適用処理（差し替え後に data 層を再構築）。 */
function applyPatch(patch: Parameters<typeof setActivePatch>[0]): void {
  setActivePatch(patch);
  rebuildMoves();
  rebuildPokedex();
}

/** リモート無効時のダミー fetch（常に失敗扱い＝フォールバック）。 */
const disabledFetch: FetchLike = async () => ({ ok: false, json: async () => null });

/**
 * 起動時に呼ぶ差分同期。キャッシュ→リモートの順で適用し、失敗時は同梱にフォールバック。
 * PATCH_URL が空ならリモート取得はスキップ（キャッシュ／同梱のみ）。
 */
export async function syncChampionsPatch(): Promise<SyncResult> {
  const remoteEnabled = !!PATCH_URL;
  return syncPatch({
    storage: asyncStorageAdapter,
    url: PATCH_URL || 'about:blank',
    fetchFn: remoteEnabled ? ((url) => fetch(url) as unknown as ReturnType<FetchLike>) : disabledFetch,
    apply: applyPatch,
  });
}
