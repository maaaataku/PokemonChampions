// PresetManager.tsx — 構築（盤面プリセット）の保存・読込・削除モーダル（フェーズ2）。
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

import type { Theme } from '../ui/theme';
import { POKEDEX } from '../data';
import type { BoardState } from '../ui/calcModel';
import { presetStore, type SavedPreset } from '../storage';
import { encodeBoard, decodeBoard } from '../storage/share';
import { parseShowdown, importTeamToBoard, boardAlliesToShowdown } from '../data';

export interface PresetManagerProps {
  t: Theme;
  visible: boolean;
  board: BoardState;
  onLoad: (board: BoardState) => void;
  onClose: () => void;
}

/** 盤面の味方/相手をまとめた1行サマリ（一覧表示用）。 */
function summarize(b: BoardState): string {
  const allies = [b.slots.allyA, b.slots.allyB].map((j) => POKEDEX[j]?.jp ?? j).join('・');
  const foes = [b.slots.foeL, b.slots.foeR].map((j) => POKEDEX[j]?.jp ?? j).join('・');
  return `味方 ${allies} / 相手 ${foes}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => `${n}`.padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function PresetManager({ t, visible, board, onLoad, onClose }: PresetManagerProps) {
  const [list, setList] = useState<SavedPreset[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [importText, setImportText] = useState('');
  const [importErr, setImportErr] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareLabel, setShareLabel] = useState('共有コード（コピーして渡す）');
  const [copied, setCopied] = useState(false);
  const [sdText, setSdText] = useState('');
  const [sdMsg, setSdMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const refresh = useCallback(async () => {
    setList(await presetStore.list());
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const onSave = async () => {
    setBusy(true);
    try {
      await presetStore.save(name, board);
      setName('');
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    await presetStore.remove(id);
    await refresh();
  };

  const onImport = () => {
    const b = decodeBoard(importText);
    if (b) {
      onLoad(b);
      setImportText('');
      setImportErr(false);
      onClose();
    } else {
      setImportErr(true);
    }
  };

  const reveal = (b: BoardState) => {
    setShareLabel('共有コード（コピーして渡す）');
    setShareCode(encodeBoard(b));
    setCopied(false);
  };

  const revealShowdown = () => {
    setShareLabel('Showdown / PokePaste（コピーして他ツールへ）');
    setShareCode(boardAlliesToShowdown(board));
    setCopied(false);
  };

  const onImportShowdown = () => {
    const sets = parseShowdown(sdText);
    if (sets.length === 0) {
      setSdMsg({ ok: false, text: 'チームを認識できませんでした。Showdown/PokePaste形式を貼り付けてください。' });
      return;
    }
    const res = importTeamToBoard(board, sets);
    if (res.applied.length === 0) {
      setSdMsg({ ok: false, text: res.warnings[0] ?? '取り込めるポケモンがありませんでした。' });
      return;
    }
    onLoad(res.board);
    const names = res.applied.map((a) => a.name).join('・');
    setSdMsg({ ok: true, text: `${res.applied.length}体を反映: ${names}${res.warnings.length ? `（注意 ${res.warnings.length}件）` : ''}` });
    setSdText('');
    onClose();
  };

  const onCopy = async () => {
    if (!shareCode) return;
    await Clipboard.setStringAsync(shareCode);
    setCopied(true);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          style={{ backgroundColor: t.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: t.border, maxHeight: '86%' }}
          onPress={() => {}}>
          {/* ヘッダー */}
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="albums" size={18} color={t.accent} />
            <Text style={{ fontWeight: '800', fontSize: 14, color: t.hi }}>構築の保存・読込</Text>
            <Pressable onPress={onClose} style={{ marginLeft: 'auto', backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
              <Ionicons name="close" size={17} color={t.hi} />
            </Pressable>
          </View>

          {/* 現在の盤面を保存 */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 10.5, color: t.lo, fontWeight: '700', marginBottom: 6 }}>現在の盤面を保存</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.panel2, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Ionicons name="bookmark" size={15} color={t.mid} />
                <TextInput value={name} onChangeText={setName} placeholder="構築名（例: 自分の対面想定）" placeholderTextColor={t.lo}
                  style={{ flex: 1, color: t.hi, fontSize: 14, padding: 0 }} onSubmitEditing={onSave} />
              </View>
              <Pressable onPress={onSave} disabled={busy} style={{ backgroundColor: t.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, opacity: busy ? 0.5 : 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: t.onAccent }}>保存</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
              <Text style={{ flex: 1, fontSize: 9.5, color: t.lo }} numberOfLines={1}>{summarize(board)}（同名は上書き）</Text>
              <Pressable onPress={() => reveal(board)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: t.border }}>
                <Ionicons name="share-social" size={13} color={t.mid} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: t.mid }}>現在の盤面を共有</Text>
              </Pressable>
            </View>
          </View>

          {/* 共有コードの取込（インポート） */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text style={{ fontSize: 10.5, color: t.lo, fontWeight: '700', marginBottom: 6 }}>共有コードを取込</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.panel2, borderWidth: 1, borderColor: importErr ? t.foe : t.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Ionicons name="enter" size={15} color={t.mid} />
                <TextInput value={importText} onChangeText={(v) => { setImportText(v); setImportErr(false); }} placeholder="PC1.… を貼り付け" placeholderTextColor={t.lo} autoCapitalize="none" autoCorrect={false}
                  style={{ flex: 1, color: t.hi, fontSize: 13, padding: 0 }} onSubmitEditing={onImport} />
              </View>
              <Pressable onPress={onImport} style={{ backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 }}>
                <Text style={{ fontSize: 13, fontWeight: '800', color: t.hi }}>取込</Text>
              </Pressable>
            </View>
            {importErr && <Text style={{ fontSize: 10, color: t.foe, marginTop: 5 }}>無効な共有コードです（形式違い・破損・非対応のポケモンを含む）。</Text>}
          </View>

          {/* Showdown / PokePaste */}
          <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
              <Text style={{ flex: 1, fontSize: 10.5, color: t.lo, fontWeight: '700' }}>Showdown / PokePaste</Text>
              <Pressable onPress={revealShowdown} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: t.border }}>
                <Ionicons name="download" size={13} color={t.mid} />
                <Text style={{ fontSize: 11, fontWeight: '700', color: t.mid }}>味方を書き出し</Text>
              </Pressable>
            </View>
            <View style={{ backgroundColor: t.panel2, borderWidth: 1, borderColor: sdMsg && !sdMsg.ok ? t.foe : t.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }}>
              <TextInput value={sdText} onChangeText={(v) => { setSdText(v); setSdMsg(null); }} placeholder={'Showdown/PokePasteのチームを貼り付け\n（先頭4体を 味方A/B・相手L/R に反映）'} placeholderTextColor={t.lo}
                multiline autoCapitalize="none" autoCorrect={false}
                style={{ color: t.hi, fontSize: 12, padding: 0, minHeight: 60, textAlignVertical: 'top' }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Pressable onPress={onImportShowdown} style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 9 }}>
                <Text style={{ fontSize: 12.5, fontWeight: '800', color: t.onAccent }}>チームを取込</Text>
              </Pressable>
              {sdMsg && <Text style={{ flex: 1, fontSize: 10, color: sdMsg.ok ? t.mid : t.foe }} numberOfLines={2}>{sdMsg.text}</Text>}
            </View>
            <Text style={{ fontSize: 9, color: t.lo, marginTop: 5 }}>※ 能力値はChampionsの能力P制に近似（EV→P換算）。技構成はロスター定義を使用。</Text>
          </View>

          {/* 共有コード表示 */}
          {shareCode && (
            <View style={{ marginHorizontal: 16, marginBottom: 12, backgroundColor: t.panel2, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 12 }}>
              <Text style={{ fontSize: 10.5, color: t.lo, fontWeight: '700', marginBottom: 6 }}>{shareLabel}</Text>
              <Text selectable style={{ fontSize: 11, color: t.hi, fontFamily: 'monospace' }} numberOfLines={3}>{shareCode}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <Pressable onPress={onCopy} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: t.accent, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Ionicons name={copied ? 'checkmark' : 'copy'} size={14} color={t.onAccent} />
                  <Text style={{ fontSize: 12, fontWeight: '800', color: t.onAccent }}>{copied ? 'コピーしました' : 'コピー'}</Text>
                </Pressable>
                <Pressable onPress={() => setShareCode(null)} style={{ backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: t.mid }}>閉じる</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* 保存済み一覧 */}
          <Text style={{ paddingHorizontal: 16, fontSize: 10.5, color: t.lo, fontWeight: '700' }}>保存済み（{list.length}）</Text>
          <ScrollView style={{ marginTop: 4 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
            {list.length === 0 ? (
              <Text style={{ color: t.lo, textAlign: 'center', padding: 24, fontSize: 13 }}>まだ保存された構築はありません。</Text>
            ) : (
              list.map((p) => (
                <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: t.border }}>
                  <Pressable style={{ flex: 1 }} onPress={() => { onLoad(p.board); onClose(); }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: t.hi }}>{p.name}</Text>
                    <Text style={{ fontSize: 10.5, color: t.mid, marginTop: 2 }} numberOfLines={1}>{summarize(p.board)}</Text>
                    <Text style={{ fontSize: 9.5, color: t.lo, marginTop: 1 }}>{formatDate(p.savedAt)}</Text>
                  </Pressable>
                  <Pressable onPress={() => { onLoad(p.board); onClose(); }} style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: t.onAccent }}>読込</Text>
                  </Pressable>
                  <Pressable onPress={() => reveal(p.board)} style={{ backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
                    <Ionicons name="share-social" size={15} color={t.mid} />
                  </Pressable>
                  <Pressable onPress={() => onDelete(p.id)} style={{ backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
                    <Ionicons name="trash" size={15} color={t.foe} />
                  </Pressable>
                </View>
              ))
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
