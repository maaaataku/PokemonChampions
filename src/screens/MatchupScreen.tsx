// MatchupScreen.tsx — タイプ相性・対策（F-15〜F-17）。盤面状態を共有し、テラス切替で相性が変わる。
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Theme } from '../ui/theme';
import { TypePill, TeraChip, TeraTypeRow, ChampBadge } from '../ui/components';
import {
  POKEDEX, ALL_TYPES, TYPE_COLORS,
  summarizeDefense, bestOffense, sharedWeaknesses,
  type TypeJP,
} from '../data';
import type { BoardState, SlotId, AllyId, FoeId } from '../ui/calcModel';

export interface MatchupScreenProps {
  t: Theme;
  s: BoardState;
  setS: React.Dispatch<React.SetStateAction<BoardState>>;
}

const FOES: FoeId[] = ['foeL', 'foeR'];
const ALLIES: AllyId[] = ['allyA', 'allyB'];

/** テラス反映後の防御タイプ。 */
function defTypesOf(s: BoardState, slot: SlotId): TypeJP[] {
  const tera = s.tera[slot];
  return tera.on ? [tera.type] : POKEDEX[s.slots[slot]].types;
}

export default function MatchupScreen({ t, s, setS }: MatchupScreenProps) {
  const setTera = (slot: SlotId, p: Partial<BoardState['tera'][SlotId]>) =>
    setS((prev) => ({ ...prev, tera: { ...prev.tera, [slot]: { ...prev.tera[slot], ...p } } }));

  const allyShared = sharedWeaknesses(defTypesOf(s, 'allyA'), defTypesOf(s, 'allyB'));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
      {/* 防御相性（テラス反映 F-17） */}
      <View style={{ paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 }}>
        <Text style={{ fontSize: 11, color: t.foe, fontWeight: '800', letterSpacing: 1 }}>あいて の防御相性</Text>
      </View>
      {FOES.map((sl) => <DefenseCard key={sl} t={t} s={s} slot={sl} accent={t.foe} setTera={setTera} />)}

      <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2 }}>
        <Text style={{ fontSize: 11, color: t.accent, fontWeight: '800', letterSpacing: 1 }}>みかた の防御相性</Text>
      </View>
      {ALLIES.map((sl) => <DefenseCard key={sl} t={t} s={s} slot={sl} accent={t.accent} setTera={setTera} />)}

      {/* 有効打（F-16） */}
      <Card t={t}>
        <Header t={t} icon="flash" title="有効打" sub="味方タイプ → 相手への最大倍率" />
        {ALLIES.map((ally) => {
          const atkTypes = defTypesOf(s, ally); // テラス時はテラスタイプが打点
          return (
            <View key={ally} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Text style={{ fontWeight: '800', fontSize: 13, color: t.accent }}>{POKEDEX[s.slots[ally]].jp}</Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>{atkTypes.map((ty) => <TypePill key={ty} ty={ty} sm />)}</View>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {FOES.map((foe) => {
                  const mult = bestOffense(atkTypes, defTypesOf(s, foe));
                  return (
                    <View key={foe} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.panel2, borderRadius: 10, borderWidth: 1, borderColor: t.border, paddingHorizontal: 10, paddingVertical: 7 }}>
                      <Text style={{ fontSize: 11.5, color: t.mid, fontWeight: '700' }} numberOfLines={1}>{POKEDEX[s.slots[foe]].jp}</Text>
                      <Text style={{ marginLeft: 'auto', fontSize: 14, fontWeight: '800', color: multColor(mult) }}>×{mult}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}
      </Card>

      {/* パーティ補完（F-15） */}
      <Card t={t}>
        <Header t={t} icon="people" title="パーティ補完" sub="味方2体が同時に弱点とするタイプ" />
        {allyShared.length === 0 ? (
          <Text style={{ fontSize: 12, color: t.mid, marginTop: 6 }}>共通の弱点なし。タイプ補完は良好です。</Text>
        ) : (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 11.5, color: t.foe, fontWeight: '700', marginBottom: 6 }}>
              ⚠ {POKEDEX[s.slots.allyA].jp}・{POKEDEX[s.slots.allyB].jp} が共倒れしやすい打点：
            </Text>
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {allyShared.map((ty) => <TypePill key={ty} ty={ty} />)}
            </View>
          </View>
        )}
      </Card>

      <Text style={{ textAlign: 'center', color: t.lo, fontSize: 10, marginTop: 16, paddingHorizontal: 24 }}>
        テラスタル切替で防御タイプが変化し、相性が再計算されます（盤面と共有）。
      </Text>
    </ScrollView>
  );
}

/* --- 局所コンポーネント --- */
function Card({ t, children }: { t: Theme; children: React.ReactNode }) {
  return (
    <View style={{ marginHorizontal: 16, marginTop: 10, padding: 12, borderRadius: 16, backgroundColor: t.panel, borderWidth: 1, borderColor: t.border }}>
      {children}
    </View>
  );
}

function Header({ t, icon, title, sub }: { t: Theme; icon: keyof typeof Ionicons.glyphMap; title: string; sub: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
      <Ionicons name={icon} size={15} color={t.accent} />
      <Text style={{ fontWeight: '800', fontSize: 13, color: t.hi }}>{title}</Text>
      <Text style={{ fontSize: 10.5, color: t.lo }}>{sub}</Text>
    </View>
  );
}

function DefenseCard({ t, s, slot, accent, setTera }: {
  t: Theme; s: BoardState; slot: SlotId; accent: string;
  setTera: (slot: SlotId, p: Partial<BoardState['tera'][SlotId]>) => void;
}) {
  const tera = s.tera[slot];
  const defTypes = defTypesOf(s, slot);
  const g = summarizeDefense(defTypes);
  return (
    <View style={{ marginHorizontal: 16, marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: t.panel, borderWidth: 1, borderColor: t.border }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 4, height: 28, borderRadius: 3, backgroundColor: accent }} />
        <Text style={{ fontSize: 15, fontWeight: '800', color: t.hi }}>{POKEDEX[s.slots[slot]].jp}</Text>
        {POKEDEX[s.slots[slot]].champAdjusted && <ChampBadge verified={POKEDEX[s.slots[slot]].champVerified} />}
        <View style={{ flexDirection: 'row', gap: 4, marginLeft: 4 }}>{defTypes.map((ty) => <TypePill key={ty} ty={ty} sm />)}</View>
      </View>

      <View style={{ marginTop: 9 }}>
        <TeraChip t={t} on={tera.on} type={tera.type} onPress={() => setTera(slot, { on: !tera.on })} />
        {tera.on && <TeraTypeRow t={t} types={ALL_TYPES} sel={tera.type} onSel={(ty) => setTera(slot, { on: true, type: ty })} />}
      </View>

      <MultiRow t={t} label="弱点" color={t.foe} items={g.weak.map((w) => ({ ty: w.type, mult: w.mult }))} />
      <MultiRow t={t} label="半減" color="#5ad1e6" items={g.resist.map((r) => ({ ty: r.type, mult: r.mult }))} />
      {g.immune.length > 0 && <MultiRow t={t} label="無効" color={t.lo} items={g.immune.map((ty) => ({ ty }))} />}
    </View>
  );
}

function MultiRow({ t, label, color, items }: { t: Theme; label: string; color: string; items: Array<{ ty: TypeJP; mult?: number }> }) {
  if (items.length === 0) return null;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color, width: 28, marginTop: 3 }}>{label}</Text>
      <View style={{ flex: 1, flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
        {items.map(({ ty, mult }) => (
          <View key={ty} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: TYPE_COLORS[ty] + '22', borderRadius: 7, paddingHorizontal: 6, paddingVertical: 3 }}>
            <View style={{ width: 7, height: 7, borderRadius: 2, backgroundColor: TYPE_COLORS[ty] }} />
            <Text style={{ fontSize: 11, fontWeight: '700', color: t.hi }}>{ty}</Text>
            {mult != null && <Text style={{ fontSize: 10.5, fontWeight: '800', color }}>×{mult}</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

function multColor(mult: number): string {
  return mult === 0 ? '#5a6678' : mult > 1 ? '#ff5a45' : mult < 1 ? '#5ad1e6' : '#93a0b4';
}
