// StatsScreen.tsx — 実数値チェック（実機照合用）。種族・能力ポイント・性格から6実数値を表示し、
// ゲームのステータス画面と直接見比べられるようにする。計算は championsStat（エンジン一致をテスト済み）。
import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { StatID } from '@smogon/calc';

import type { Theme } from '../ui/theme';
import { Stepper, SegButton, TypePill } from '../ui/components';
import { POKEDEX, searchSpecies, NATURES, type NatureStat } from '../data';
import { championsStat, natureMultFor } from '../engine/stats';

export interface StatsScreenProps {
  t: Theme;
  visible: boolean;
  onClose: () => void;
}

const ALL_STATS: Array<{ key: StatID; label: string }> = [
  { key: 'hp', label: 'HP' },
  { key: 'atk', label: 'こうげき' },
  { key: 'def', label: 'ぼうぎょ' },
  { key: 'spa', label: 'とくこう' },
  { key: 'spd', label: 'とくぼう' },
  { key: 'spe', label: 'すばやさ' },
];
const NATURE_OPTS: Array<{ key: NatureStat | 'none'; label: string }> = [
  { key: 'none', label: 'なし' },
  { key: 'atk', label: '攻' },
  { key: 'def', label: '防' },
  { key: 'spa', label: '特攻' },
  { key: 'spd', label: '特防' },
  { key: 'spe', label: '速' },
];
const zeroPts = (): Record<StatID, number> => ({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });

function natureName(plus: NatureStat | null, minus: NatureStat | null): string {
  if (!plus && !minus) return '無補正';
  const found = NATURES.find((n) => n.plus === plus && n.minus === minus);
  return found ? found.jp : 'カスタム';
}

export default function StatsScreen({ t, visible, onClose }: StatsScreenProps) {
  const [speciesJP, setSpeciesJP] = useState('ガブリアス');
  const [pickOpen, setPickOpen] = useState(false);
  const [q, setQ] = useState('');
  const [plus, setPlus] = useState<NatureStat | null>(null);
  const [minus, setMinus] = useState<NatureStat | null>(null);
  const [pts, setPts] = useState<Record<StatID, number>>(zeroPts);

  const dex = POKEDEX[speciesJP];
  const setP = (k: StatID, v: number) => setPts((p) => ({ ...p, [k]: v }));

  const value = (key: StatID): number => {
    const mult = key === 'hp' ? 1.0 : natureMultFor(key as NatureStat, plus, minus);
    return championsStat(dex.base[key], pts[key], mult, key === 'hp');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable style={{ backgroundColor: t.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: t.border, maxHeight: '90%' }} onPress={() => {}}>
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="stats-chart" size={18} color={t.accent} />
            <Text style={{ fontWeight: '800', fontSize: 14, color: t.hi }}>実数値チェック（照合用）</Text>
            <Pressable onPress={onClose} style={{ marginLeft: 'auto', backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
              <Ionicons name="close" size={17} color={t.hi} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
            {/* 種族選択 */}
            <Pressable onPress={() => setPickOpen((v) => !v)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.panel2, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 15, fontWeight: '800', color: t.hi }}>{dex.jp}</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>{dex.types.map((ty) => <TypePill key={ty} ty={ty} sm />)}</View>
              <Ionicons name={pickOpen ? 'chevron-up' : 'chevron-down'} size={16} color={t.mid} style={{ marginLeft: 'auto' }} />
            </Pressable>
            {pickOpen && (
              <View style={{ marginTop: 6, backgroundColor: t.panel2, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Ionicons name="search" size={15} color={t.mid} />
                  <TextInput value={q} onChangeText={setQ} placeholder="種族を検索" placeholderTextColor={t.lo} style={{ flex: 1, color: t.hi, fontSize: 13, padding: 0 }} />
                </View>
                <View style={{ maxHeight: 160 }}>
                  <ScrollView keyboardShouldPersistTaps="handled">
                    {searchSpecies(q).map((p) => (
                      <Pressable key={p.jp} onPress={() => { setSpeciesJP(p.jp); setPickOpen(false); setQ(''); }}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 4 }}>
                        <Text style={{ fontSize: 13.5, fontWeight: '700', color: t.hi }}>{p.jp}</Text>
                        <View style={{ flexDirection: 'row', gap: 4, marginLeft: 'auto' }}>{p.types.map((ty) => <TypePill key={ty} ty={ty} sm />)}</View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              </View>
            )}

            {/* 性格 */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 10.5, color: t.lo, fontWeight: '700', marginBottom: 6 }}>性格（{natureName(plus, minus)}）</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 11, color: t.mid, fontWeight: '700', width: 30 }}>↑</Text>
                {NATURE_OPTS.map((o) => (
                  <SegButton key={`p${o.key}`} t={t} on={(plus ?? 'none') === o.key} label={o.label} onPress={() => setPlus(o.key === 'none' ? null : o.key)} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={{ fontSize: 11, color: t.mid, fontWeight: '700', width: 30 }}>↓</Text>
                {NATURE_OPTS.map((o) => (
                  <SegButton key={`m${o.key}`} t={t} on={(minus ?? 'none') === o.key} label={o.label} onPress={() => setMinus(o.key === 'none' ? null : o.key)} />
                ))}
              </View>
            </View>

            {/* 能力ポイント */}
            <View style={{ marginTop: 12 }}>
              <Text style={{ fontSize: 10.5, color: t.lo, fontWeight: '700', marginBottom: 2 }}>能力ポイント（各0〜32）</Text>
              {ALL_STATS.map((s) => (
                <Stepper key={s.key} t={t} label={s.label} value={pts[s.key]} min={0} max={32} step={4} onChange={(v) => setP(s.key, v)} />
              ))}
            </View>

            {/* 実数値 */}
            <Text style={{ fontSize: 10.5, color: t.lo, fontWeight: '700', marginTop: 14, marginBottom: 6 }}>実数値（ゲームのステ画面と照合）</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {ALL_STATS.map((s) => (
                <View key={s.key} style={{ width: '31%', backgroundColor: t.panel2, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: t.mid, fontWeight: '700' }}>{s.label}</Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: t.hi }}>{value(s.key)}</Text>
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 9.5, color: t.lo, marginTop: 8 }}>※ Lv50・IV31固定。ゲームの実数値と一致すれば計算エンジンの土台が正しいことを確認できます。</Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
