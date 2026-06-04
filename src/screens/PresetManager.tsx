// PresetManager.tsx — 構築（盤面プリセット）の保存・読込・削除モーダル（フェーズ2）。
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Theme } from '../ui/theme';
import { POKEDEX } from '../data';
import type { BoardState } from '../ui/calcModel';
import { presetStore, type SavedPreset } from '../storage';

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
            <Text style={{ fontSize: 9.5, color: t.lo, marginTop: 5 }}>{summarize(board)}（同名は上書き）</Text>
          </View>

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
