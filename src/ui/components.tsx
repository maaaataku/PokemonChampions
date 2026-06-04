// components.tsx — 試作の小コンポーネント群を React Native へ移植。
import React from 'react';
import { View, Text, Pressable, type ViewStyle, type TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Theme } from './theme';
import { TYPE_COLORS, type TypeJP } from '../data/types';

export function TypePill({ ty, sm }: { ty: TypeJP; sm?: boolean }) {
  return (
    <View style={{ backgroundColor: TYPE_COLORS[ty], paddingHorizontal: sm ? 5 : 7, paddingVertical: sm ? 2 : 3, borderRadius: 6 }}>
      <Text style={{ fontSize: sm ? 9 : 10, fontWeight: '800', color: '#0a0e16' }}>{ty}</Text>
    </View>
  );
}

export function SegButton({ t, on, label, onPress }: { t: Theme; on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9,
      borderWidth: 1, borderColor: on ? t.accent : t.border,
      backgroundColor: on ? t.accent : 'transparent',
    }}>
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: on ? t.onAccent : t.mid }}>{label}</Text>
    </Pressable>
  );
}

export function ToggleChip({ t, label, on, onPress }: { t: Theme; label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{
      paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
      borderWidth: 1, borderColor: on ? t.accent : t.border,
      backgroundColor: on ? t.accent : 'transparent',
    }}>
      <Text style={{ fontSize: 11.5, fontWeight: '700', color: on ? t.onAccent : t.mid }}>{label}</Text>
    </Pressable>
  );
}

export function Stepper({ t, label, value, min, max, step, onChange, signed }: {
  t: Theme; label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; signed?: boolean;
}) {
  const disp = signed && value > 0 ? `+${value}` : `${value}`;
  const stepBtn: ViewStyle = {
    width: 30, height: 30, borderRadius: 9, backgroundColor: t.chip,
    borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center',
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2 }}>
      <Text style={{ fontSize: 12.5, color: t.mid, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
        <Pressable onPress={() => onChange(Math.max(min, value - step))} style={stepBtn}>
          <Ionicons name="remove" size={16} color={t.hi} />
        </Pressable>
        <Text style={{ minWidth: 34, textAlign: 'center', fontWeight: '800', fontSize: 15, color: t.hi }}>{disp}</Text>
        <Pressable onPress={() => onChange(Math.min(max, value + step))} style={stepBtn}>
          <Ionicons name="add" size={16} color={t.hi} />
        </Pressable>
      </View>
    </View>
  );
}

export function NatureRow({ t, value, onChange }: { t: Theme; value: 0.9 | 1.0 | 1.1; onChange: (v: 0.9 | 1.0 | 1.1) => void }) {
  const opts: Array<[0.9 | 1.0 | 1.1, string]> = [[0.9, '↓ 0.9'], [1.0, '無 1.0'], [1.1, '↑ 1.1']];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2 }}>
      <Text style={{ fontSize: 12.5, color: t.mid, fontWeight: '600' }}>性格補正</Text>
      <View style={{ flexDirection: 'row', gap: 5, marginLeft: 'auto' }}>
        {opts.map(([v, l]) => <SegButton key={v} t={t} on={value === v} label={l} onPress={() => onChange(v)} />)}
      </View>
    </View>
  );
}

export function ChoiceRow<V extends string>({ t, label, value, opts, onChange }: {
  t: Theme; label: string; value: V; opts: Array<[V, string]>; onChange: (v: V) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 2, flexWrap: 'wrap' }}>
      <Text style={{ fontSize: 12.5, color: t.mid, fontWeight: '600' }}>{label}</Text>
      <View style={{ flexDirection: 'row', gap: 5, marginLeft: 'auto', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {opts.map(([v, l]) => <SegButton key={v} t={t} on={value === v} label={l} onPress={() => onChange(v)} />)}
      </View>
    </View>
  );
}

export function HPBar({ t, kc, minPct, maxPct }: { t: Theme; kc: string; minPct: number; maxPct: number }) {
  return (
    <View style={{ marginTop: 9, height: 11, borderRadius: 6, backgroundColor: t.panel2, borderWidth: 1, borderColor: t.border, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6, width: `${Math.min(100, maxPct)}%`, backgroundColor: kc + '55' }} />
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 6, width: `${Math.min(100, minPct)}%`, backgroundColor: kc }} />
    </View>
  );
}

export function Expander({ t, open, onPress, label, children }: {
  t: Theme; open: boolean; onPress: () => void; label: string; children: React.ReactNode;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
        <Text style={{ color: t.mid, fontSize: 11.5, fontWeight: '700' }}>{label}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={t.mid} />
      </Pressable>
      {open && <View style={{ gap: 9, marginTop: 8 }}>{children}</View>}
    </View>
  );
}

export function TeraChip({ t, on, type, onPress }: { t: Theme; on: boolean; type: TypeJP; onPress: () => void }) {
  const col = on ? TYPE_COLORS[type] : t.mid;
  return (
    <Pressable onPress={onPress} style={{
      flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10,
      borderWidth: 1, borderColor: on ? TYPE_COLORS[type] : t.border, backgroundColor: on ? TYPE_COLORS[type] + '22' : 'transparent',
    }}>
      <View style={{ width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }], backgroundColor: on ? TYPE_COLORS[type] : t.lo }} />
      <Text style={{ fontSize: 11.5, fontWeight: '800', color: col }}>テラス {on ? 'ON' : 'OFF'}</Text>
    </Pressable>
  );
}

export function TeraTypeRow({ t, types, sel, onSel }: { t: Theme; types: TypeJP[]; sel: TypeJP; onSel: (ty: TypeJP) => void }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5, marginTop: 8, flexWrap: 'wrap' }}>
      {types.map((ty) => {
        const on = sel === ty;
        return (
          <Pressable key={ty} onPress={() => onSel(ty)} style={{
            paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9,
            borderWidth: 1, borderColor: on ? TYPE_COLORS[ty] : t.border, backgroundColor: on ? TYPE_COLORS[ty] : 'transparent',
          }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: on ? '#0a0e16' : t.mid }}>{ty}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export const labelStyle = (t: Theme): TextStyle => ({ fontSize: 11, color: t.lo, fontWeight: '700' });
