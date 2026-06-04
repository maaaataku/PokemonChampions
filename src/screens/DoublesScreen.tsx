// DoublesScreen.tsx — ダブル主軸の計算画面（試作 DoublesCalcWireframe を RN 移植・実エンジン接続）。
import React, { useMemo, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, TextInput, Modal, useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { THEMES, type ThemeName } from '../ui/theme';
import {
  TypePill, SegButton, ToggleChip, Stepper, NatureRow, ChoiceRow,
  HPBar, Expander, TeraChip, TeraTypeRow,
} from '../ui/components';
import {
  POKEDEX, MOVES, searchSpecies, TYPE_COLORS,
  ATK_ITEM_LABELS, DEF_ITEM_LABELS, type AtkItemKey, type TypeJP,
} from '../data';
import { KO_COLORS } from '../engine/result';
import { findSurvival, type SurvivalResult } from '../engine/tuning';
import {
  initialBoard, computeResults, computeCombo, targetSlots, allyOther,
  attackParamsFor, speedRows,
  type BoardState, type SlotId, type AllyId, type FoeId, type Mult,
} from '../ui/calcModel';

const TERA_TYPES: TypeJP[] = [
  'じめん', 'ドラゴン', 'ほのお', 'みず', 'くさ', 'フェアリー',
  'はがね', 'ひこう', 'ゴースト', 'あく', 'こおり', 'でんき',
  'かくとう', 'どく', 'エスパー', 'むし', 'いわ', 'ノーマル',
];

export default function DoublesScreen() {
  const scheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(scheme === 'light' ? 'light' : 'dark');
  const t = THEMES[themeName];

  const [s, setS] = useState<BoardState>(initialBoard);
  const [sheet, setSheet] = useState<SlotId | null>(null);
  const [q, setQ] = useState('');
  const [detail, setDetail] = useState<'atk' | 'def' | null>(null);
  const [survival, setSurvival] = useState<{ slot: SlotId; result: SurvivalResult } | null>(null);

  const move = MOVES[s.moveKey];
  const isPhys = move?.cat === 'phys';
  const other = allyOther(s.activeAtk);
  const tslots = targetSlots(s);
  const isSpread = tslots.length > 1;
  const results = useMemo(() => computeResults(s), [s]);
  const combo = useMemo(() => computeCombo(s), [s]);

  const primarySlot: SlotId = tslots.includes(s.focusFoe) ? s.focusFoe : tslots[0];
  const others = tslots.filter((x) => x !== primarySlot);

  // --- state helpers ---
  const patch = (p: Partial<BoardState>) => setS((prev) => ({ ...prev, ...p }));
  const setAtk = <K extends keyof BoardState['atkProfs'][AllyId]>(k: K, v: BoardState['atkProfs'][AllyId][K]) =>
    setS((prev) => ({ ...prev, atkProfs: { ...prev.atkProfs, [prev.activeAtk]: { ...prev.atkProfs[prev.activeAtk], [k]: v } } }));
  const setDef = <K extends keyof BoardState['defProfs'][SlotId]>(slot: SlotId, k: K, v: BoardState['defProfs'][SlotId][K]) =>
    setS((prev) => ({ ...prev, defProfs: { ...prev.defProfs, [slot]: { ...prev.defProfs[slot], [k]: v } } }));
  const setTera = (slot: SlotId, p: Partial<BoardState['tera'][SlotId]>) =>
    setS((prev) => ({ ...prev, tera: { ...prev.tera, [slot]: { ...prev.tera[slot], ...p } } }));
  const setCombo = (ally: AllyId, mv: string) =>
    setS((prev) => ({ ...prev, comboMv: { ...prev.comboMv, [ally]: mv } }));
  const setSpe = <K extends keyof BoardState['speProfs'][SlotId]>(slot: SlotId, k: K, v: BoardState['speProfs'][SlotId][K]) =>
    setS((prev) => ({ ...prev, speProfs: { ...prev.speProfs, [slot]: { ...prev.speProfs[slot], [k]: v } } }));

  const pickMon = (jp: string) => {
    if (!sheet) return;
    setS((prev) => {
      const next = { ...prev, slots: { ...prev.slots, [sheet]: jp } };
      if (sheet === prev.activeAtk) next.moveKey = POKEDEX[jp].moves[0];
      return next;
    });
    setSheet(null);
    setQ('');
  };

  const atkProf = s.atkProfs[s.activeAtk];
  const focusDef = s.defProfs[primarySlot];
  const atkMon = POKEDEX[s.slots[s.activeAtk]];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48, maxWidth: 480, width: '100%', alignSelf: 'center' }}>
        {/* ヘッダー */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="flash" size={16} color={t.bg} />
            </View>
            <Text style={{ fontWeight: '900', fontSize: 15, color: t.hi }}>
              ダメ計 <Text style={{ color: t.lo, fontWeight: '700', fontSize: 11 }}>Champions · ダブル</Text>
            </Text>
          </View>
          <Pressable onPress={() => setThemeName(themeName === 'dark' ? 'light' : 'dark')}
            style={{ backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
            <Ionicons name={themeName === 'dark' ? 'sunny' : 'moon'} size={17} color={t.hi} />
          </Pressable>
        </View>

        {/* 2v2 盤面 */}
        <Panel t={t} style={{ marginTop: 4 }}>
          <Text style={{ fontSize: 10, color: t.foe, fontWeight: '800', letterSpacing: 1, marginBottom: 6 }}>あいて</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['foeL', 'foeR'] as FoeId[]).map((sl) => (
              <FoeSlot key={sl} t={t} mon={POKEDEX[s.slots[sl]]} tera={s.tera[sl]}
                focused={s.focusFoe === sl && move?.target === 'single'}
                inTarget={tslots.includes(sl)} res={results[sl]}
                onMon={() => setSheet(sl)} onFocus={() => patch({ focusFoe: sl })} />
            ))}
          </View>
          <Text style={{ fontSize: 10, color: t.accent, fontWeight: '800', letterSpacing: 1, marginTop: 10, marginBottom: 6 }}>みかた</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {(['allyA', 'allyB'] as AllyId[]).map((sl) => (
              <AllySlot key={sl} t={t} mon={POKEDEX[s.slots[sl]]} tera={s.tera[sl]} active={sl === s.activeAtk}
                hitByAlly={move?.target === 'all' && sl === other} res={sl === other ? results[other] : undefined}
                onMon={() => setSheet(sl)}
                onActivate={() => setS((prev) => ({ ...prev, activeAtk: sl, moveKey: POKEDEX[prev.slots[sl]].moves[0] }))} />
            ))}
          </View>
        </Panel>

        {/* HERO 確定数 */}
        <Panel t={t} style={{ marginTop: 10 }}>
          {(() => {
            const r = results[primarySlot];
            if (!r) return null;
            const kc = KO_COLORS[r.ko.kind];
            return (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                  <View style={{ backgroundColor: TYPE_COLORS[move.type], paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#0a0e16' }}>{move.jp}</Text>
                  </View>
                  {isSpread && <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 10, color: t.lo }}>範囲 ×0.75</Text></View>}
                  <Text style={{ fontSize: 11, color: t.mid, fontWeight: '700' }}>
                    → {POKEDEX[s.slots[primarySlot]].jp}{r.isAlly && <Text style={{ color: t.foe }}>（味方巻き込み）</Text>}
                  </Text>
                </View>
                <Text style={{ fontSize: 50, fontWeight: '800', lineHeight: 54, marginTop: 6, color: kc }}>{r.ko.label}</Text>
                {!!r.ko.sub && <Text style={{ fontSize: 12.5, color: t.mid, fontWeight: '600', marginTop: 2 }}>{r.ko.sub}</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 12 }}>
                  <Text style={{ fontSize: 24, fontWeight: '700', color: t.hi }}>{r.min}–{r.max}</Text>
                  <Text style={{ fontSize: 13, color: t.mid, fontWeight: '600' }}>{r.minPct.toFixed(1)}–{r.maxPct.toFixed(1)}%</Text>
                  <View style={{ marginLeft: 'auto' }}><EffPill eff={r.eff} /></View>
                </View>
                <HPBar t={t} kc={kc} minPct={r.minPct} maxPct={r.maxPct} />
                <Text style={{ fontSize: 10, color: t.lo, marginTop: 5 }}>相手HP {r.maxHP} 基準</Text>

                {others.length > 0 && (
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                    {others.map((sl) => {
                      const o = results[sl];
                      const okc = KO_COLORS[o.ko.kind];
                      return (
                        <View key={sl} style={{ flex: 1, padding: 10, borderRadius: 13, backgroundColor: t.panel2, borderWidth: 1, borderColor: o.isAlly ? t.foe + '66' : t.border }}>
                          <Text style={{ fontSize: 10.5, color: o.isAlly ? t.foe : t.mid, fontWeight: '700' }}>
                            {POKEDEX[s.slots[sl]].jp}{o.isAlly && ' ⚠味方'}</Text>
                          <Text style={{ fontSize: 19, fontWeight: '800', color: okc, marginTop: 2 }}>{o.ko.label}</Text>
                          <Text style={{ fontSize: 11, color: t.mid }}>{o.minPct.toFixed(0)}–{o.maxPct.toFixed(0)}%</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })()}
        </Panel>

        {/* 技チップ + 対象選択 */}
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Text style={{ fontSize: 10.5, color: t.lo, fontWeight: '700', marginBottom: 7 }}>{atkMon.jp} のわざ</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
            {atkMon.moves.map((mk) => {
              const mv = MOVES[mk];
              const on = mk === s.moveKey;
              return (
                <Pressable key={mk} onPress={() => patch({ moveKey: mk })} style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 11, paddingVertical: 8, borderRadius: 11,
                  borderWidth: 1, borderColor: on ? TYPE_COLORS[mv.type] : t.border, backgroundColor: on ? TYPE_COLORS[mv.type] + '26' : 'transparent',
                }}>
                  <Text style={{ fontSize: 12.5, fontWeight: '700', color: on ? TYPE_COLORS[mv.type] : t.mid }}>{mv.jp}</Text>
                  {mv.target !== 'single' && <Text style={{ fontSize: 9, color: on ? TYPE_COLORS[mv.type] : t.mid }}>※範囲</Text>}
                </Pressable>
              );
            })}
          </View>
          {move?.target === 'single' && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 9 }}>
              <Ionicons name="locate" size={13} color={t.mid} />
              <Text style={{ fontSize: 11, color: t.mid, fontWeight: '600' }}>対象:</Text>
              {(['foeL', 'foeR'] as FoeId[]).map((sl) => (
                <SegButton key={sl} t={t} on={s.focusFoe === sl} label={POKEDEX[s.slots[sl]].jp} onPress={() => patch({ focusFoe: sl })} />
              ))}
            </View>
          )}
        </View>

        {/* 合算KO */}
        <Panel t={t} style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 4, flexWrap: 'wrap' }}>
            <Ionicons name="layers" size={15} color={t.accent} />
            <Text style={{ fontWeight: '800', fontSize: 13, color: t.hi }}>合算KO</Text>
            <Text style={{ fontSize: 10.5, color: t.lo }}>この相手を2体で落とす</Text>
            <View style={{ flexDirection: 'row', gap: 5, marginLeft: 'auto' }}>
              {(['foeL', 'foeR'] as FoeId[]).map((sl) => (
                <SegButton key={sl} t={t} on={s.focusFoe === sl} label={POKEDEX[s.slots[sl]].jp} onPress={() => patch({ focusFoe: sl })} />
              ))}
            </View>
          </View>
          {(['allyA', 'allyB'] as AllyId[]).map((ally) => {
            const part = combo.parts.find((p) => p.slot === ally);
            const sel = s.comboMv[ally];
            return (
              <View key={ally} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <View style={{ backgroundColor: t.accent, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: t.onAccent }}>{ally === 'allyA' ? '味方A' : '味方B'}</Text>
                  </View>
                  <Text style={{ fontWeight: '800', fontSize: 13, color: t.hi }}>{POKEDEX[s.slots[ally]].jp}</Text>
                  {part && <Text style={{ marginLeft: 'auto', fontSize: 13, fontWeight: '800', color: KO_COLORS[part.model.ko.kind] }}>
                    {part.model.min}–{part.model.max} <Text style={{ fontSize: 10, color: t.mid }}>({part.model.ko.label})</Text></Text>}
                </View>
                <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                  <MiniChip t={t} on={sel === 'none'} label="打たない" onPress={() => setCombo(ally, 'none')} />
                  {POKEDEX[s.slots[ally]].moves.map((mk) => (
                    <MiniMove key={mk} t={t} mv={MOVES[mk]} on={sel === mk} onPress={() => setCombo(ally, mk)} />
                  ))}
                </View>
              </View>
            );
          })}
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 8, paddingTop: 9, borderTopWidth: 1, borderTopColor: t.border, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 11, color: t.mid, fontWeight: '700' }}>合計 → {POKEDEX[s.slots[s.focusFoe]].jp}</Text>
            <Text style={{ fontSize: 21, fontWeight: '800', color: t.hi }}>{combo.min}–{combo.max}</Text>
            <Text style={{ fontSize: 11, color: t.mid }}>HP {combo.hp}</Text>
            <Text style={{
              fontSize: 16, fontWeight: '800', marginLeft: 'auto',
              color: combo.verdict === 'none' ? t.lo : combo.verdict === 'guaranteed' ? KO_COLORS.ohko : combo.verdict === 'roll' ? KO_COLORS.roll1 : t.mid,
            }}>
              {combo.verdict === 'none' ? '—' : combo.verdict === 'guaranteed' ? '確定で落ちる' : combo.verdict === 'roll' ? '乱数で落ちる' : '落ちない'}
            </Text>
          </View>
        </Panel>

        {/* 攻撃側の補正 / 詳細 */}
        <Panel t={t} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap' }}>
            <ToggleChip t={t} label="てだすけ ×1.5" on={atkProf.hh} onPress={() => setAtk('hh', !atkProf.hh)} />
            <ToggleChip t={t} label="いかく被(-1)" on={atkProf.intim} onPress={() => setAtk('intim', !atkProf.intim)} />
            <TeraChip t={t} on={s.tera[s.activeAtk].on} type={s.tera[s.activeAtk].type} onPress={() => setTera(s.activeAtk, { on: !s.tera[s.activeAtk].on })} />
          </View>
          {s.tera[s.activeAtk].on && <TeraTypeRow t={t} types={TERA_TYPES} sel={s.tera[s.activeAtk].type} onSel={(ty) => setTera(s.activeAtk, { on: true, type: ty })} />}
          <Expander t={t} open={detail === 'atk'} onPress={() => setDetail(detail === 'atk' ? null : 'atk')} label="攻撃側 詳細（能力P・性格・ランク・道具）">
            <Stepper t={t} label={`${isPhys ? 'こうげき' : 'とくこう'} 能力P`} value={atkProf.sp} min={0} max={32} step={4} onChange={(v) => setAtk('sp', v)} />
            <NatureRow t={t} value={atkProf.nature} onChange={(v) => setAtk('nature', v as Mult)} />
            <Stepper t={t} label="ランク補正" value={atkProf.stage} min={-6} max={6} step={1} signed onChange={(v) => setAtk('stage', v)} />
            <ChoiceRow<AtkItemKey> t={t} label="もちもの" value={atkProf.item} opts={ATK_ITEM_LABELS} onChange={(v) => setAtk('item', v)} />
          </Expander>
        </Panel>

        {/* 対象(focus)の耐久 */}
        <Panel t={t} style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 10.5, color: t.foe, fontWeight: '700', marginBottom: 8 }}>対象 {POKEDEX[s.slots[primarySlot]].jp} の耐久</Text>
          <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginBottom: 4 }}>
            <TeraChip t={t} on={s.tera[primarySlot].on} type={s.tera[primarySlot].type} onPress={() => setTera(primarySlot, { on: !s.tera[primarySlot].on })} />
            <ToggleChip t={t} label="フレンドガード ×0.75" on={focusDef.fg} onPress={() => setDef(primarySlot, 'fg', !focusDef.fg)} />
            <ToggleChip t={t} label="壁" on={focusDef.screen} onPress={() => setDef(primarySlot, 'screen', !focusDef.screen)} />
          </View>
          {s.tera[primarySlot].on && <TeraTypeRow t={t} types={TERA_TYPES} sel={s.tera[primarySlot].type} onSel={(ty) => setTera(primarySlot, { on: true, type: ty })} />}
          <Expander t={t} open={detail === 'def'} onPress={() => setDetail(detail === 'def' ? null : 'def')} label="耐久 詳細（HP・防御・性格・チョッキ）">
            <Stepper t={t} label="HP 能力P" value={focusDef.hpSP} min={0} max={32} step={4} onChange={(v) => setDef(primarySlot, 'hpSP', v)} />
            <Stepper t={t} label={`${isPhys ? 'ぼうぎょ' : 'とくぼう'} 能力P`} value={focusDef.defSP} min={0} max={32} step={4} onChange={(v) => setDef(primarySlot, 'defSP', v)} />
            <NatureRow t={t} value={focusDef.nature} onChange={(v) => setDef(primarySlot, 'nature', v as Mult)} />
            <ChoiceRow<'none' | 'vest'> t={t} label="もちもの" value={focusDef.vest ? 'vest' : 'none'} opts={DEF_ITEM_LABELS} onChange={(v) => setDef(primarySlot, 'vest', v === 'vest')} />
          </Expander>

          {/* 確定耐え調整（F-12 / F-14） */}
          <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: t.border }}>
            <Pressable
              onPress={() => setSurvival({ slot: primarySlot, result: findSurvival(attackParamsFor(s, primarySlot)) })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 }}>
              <Ionicons name="shield-checkmark" size={14} color={t.accent} />
              <Text style={{ fontSize: 12, fontWeight: '800', color: t.hi }}>{atkMon.jp}の{move?.jp}を確定耐えする投資</Text>
            </Pressable>
            {survival && survival.slot === primarySlot && (
              <SurvivalPanel t={t}
                result={survival.result}
                isPhys={isPhys}
                onApplyHP={(p) => { setDef(primarySlot, 'hpSP', p); setSurvival(null); }}
                onApplyDef={(p) => { setDef(primarySlot, 'defSP', p); setSurvival(null); }} />
            )}
          </View>
        </Panel>

        {/* フィールド */}
        <Panel t={t} style={{ marginTop: 12 }}>
          <Text style={{ fontSize: 10.5, color: t.lo, fontWeight: '700', marginBottom: 8 }}>フィールド状態</Text>
          <ChoiceRow t={t} label="てんき" value={s.weather ?? 'none'}
            opts={[['none', 'なし'], ['sun', 'ひざしつよい'], ['rain', 'あめ']]}
            onChange={(v) => patch({ weather: v === 'none' ? null : (v as 'sun' | 'rain') })} />
          <ChoiceRow t={t} label="フィールド" value={s.terrain ?? 'none'}
            opts={[['none', 'なし'], ['electric', 'エレキ'], ['grassy', 'グラス'], ['psychic', 'サイコ'], ['misty', 'ミスト']]}
            onChange={(v) => patch({ terrain: v === 'none' ? null : (v as 'electric' | 'grassy' | 'psychic' | 'misty') })} />
        </Panel>

        {/* 素早さ早見（F-13） */}
        <Panel t={t} style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 8, flexWrap: 'wrap' }}>
            <Ionicons name="speedometer" size={15} color={t.accent} />
            <Text style={{ fontWeight: '800', fontSize: 13, color: t.hi }}>素早さ早見</Text>
            <View style={{ flexDirection: 'row', gap: 5, marginLeft: 'auto', flexWrap: 'wrap' }}>
              <ToggleChip t={t} label="味方追い風" on={s.allyTailwind} onPress={() => patch({ allyTailwind: !s.allyTailwind })} />
              <ToggleChip t={t} label="相手追い風" on={s.foeTailwind} onPress={() => patch({ foeTailwind: !s.foeTailwind })} />
              <ToggleChip t={t} label="トリル" on={s.trickRoom} onPress={() => patch({ trickRoom: !s.trickRoom })} />
            </View>
          </View>
          {speedRows(s).map((row) => {
            const prof = s.speProfs[row.slot];
            return (
              <View key={row.slot} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: t.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: t.lo, width: 20 }}>{row.rank}.</Text>
                  <Text style={{ fontSize: 13.5, fontWeight: '800', color: row.isAlly ? t.accent : t.foe }}>{row.name}</Text>
                  <Text style={{ marginLeft: 'auto', fontSize: 20, fontWeight: '800', color: t.hi }}>{row.speed}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    {([[0.9, '↓'], [1.0, '無'], [1.1, '↑']] as [Mult, string][]).map(([v, l]) => (
                      <SegButton key={v} t={t} on={prof.nature === v} label={l} onPress={() => setSpe(row.slot, 'nature', v)} />
                    ))}
                  </View>
                  <ToggleChip t={t} label="スカーフ" on={prof.scarf} onPress={() => setSpe(row.slot, 'scarf', !prof.scarf)} />
                  <ToggleChip t={t} label="まひ" on={prof.para} onPress={() => setSpe(row.slot, 'para', !prof.para)} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                    <Text style={{ fontSize: 11, color: t.mid, fontWeight: '600' }}>素早さP</Text>
                    <Pressable onPress={() => setSpe(row.slot, 'pts', Math.max(0, prof.pts - 4))} style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="remove" size={14} color={t.hi} /></Pressable>
                    <Text style={{ minWidth: 24, textAlign: 'center', fontWeight: '800', fontSize: 14, color: t.hi }}>{prof.pts}</Text>
                    <Pressable onPress={() => setSpe(row.slot, 'pts', Math.min(32, prof.pts + 4))} style={{ width: 26, height: 26, borderRadius: 8, backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="add" size={14} color={t.hi} /></Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </Panel>

        <Text style={{ textAlign: 'center', color: t.lo, fontSize: 10, marginTop: 18, paddingHorizontal: 24 }}>
          実エンジン(@smogon/calc)接続 · Lv50/IV31固定/能力ポイント制 · 範囲・合算KO・ダブル補正適用
        </Text>
      </ScrollView>

      {/* 検索シート */}
      <Modal visible={!!sheet} transparent animationType="slide" onRequestClose={() => { setSheet(null); setQ(''); }}>
        <Pressable style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }} onPress={() => { setSheet(null); setQ(''); }}>
          <Pressable style={{ backgroundColor: t.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: t.border, maxHeight: '82%' }} onPress={() => {}}>
            <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontWeight: '800', fontSize: 14, color: t.hi }}>{sheet?.startsWith('foe') ? 'あいて' : 'みかた'} ポケモン</Text>
              <Pressable onPress={() => { setSheet(null); setQ(''); }} style={{ marginLeft: 'auto', backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
                <Ionicons name="close" size={17} color={t.hi} />
              </Pressable>
            </View>
            <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.panel2, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                <Ionicons name="search" size={16} color={t.mid} />
                <TextInput autoFocus value={q} onChangeText={setQ} placeholder="名前・タイプで検索" placeholderTextColor={t.lo}
                  style={{ flex: 1, color: t.hi, fontSize: 14, padding: 0 }} />
              </View>
            </View>
            <ScrollView style={{ paddingHorizontal: 10 }} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {searchSpecies(q).map((p) => (
                <Pressable key={p.jp} onPress={() => pickMon(p.jp)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12 }}>
                  <Text style={{ fontWeight: '700', fontSize: 14, color: t.hi }}>{p.jp}</Text>
                  <View style={{ flexDirection: 'row', gap: 5, marginLeft: 'auto' }}>
                    {p.types.map((ty) => <TypePill key={ty} ty={ty} />)}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/* --- 局所コンポーネント --- */
function Panel({ t, style, children }: { t: typeof THEMES.dark; style?: object; children: React.ReactNode }) {
  return (
    <View style={[{ marginHorizontal: 16, padding: 12, borderRadius: 18, backgroundColor: t.panel, borderWidth: 1, borderColor: t.border }, style]}>
      {children}
    </View>
  );
}

function SurvivalPanel({ t, result, isPhys, onApplyHP, onApplyDef }: {
  t: typeof THEMES.dark; result: SurvivalResult; isPhys: boolean;
  onApplyHP: (pts: number) => void; onApplyDef: (pts: number) => void;
}) {
  const defLabel = isPhys ? 'ぼうぎょ' : 'とくぼう';
  const Line = ({ label, line, onApply }: { label: string; line: NonNullable<SurvivalResult['byHP']>; onApply: () => void }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <Text style={{ fontSize: 12.5, color: t.hi, fontWeight: '700' }}>{label} <Text style={{ color: t.accent, fontWeight: '800' }}>P{line.pts}</Text></Text>
      <Text style={{ fontSize: 11, color: t.mid }}>残{line.survivePct.toFixed(0)}%（{line.max}/{line.maxHP}）</Text>
      <Pressable onPress={onApply} style={{ marginLeft: 'auto', backgroundColor: t.accent, borderRadius: 9, paddingHorizontal: 12, paddingVertical: 6 }}>
        <Text style={{ fontSize: 11.5, fontWeight: '800', color: t.onAccent }}>反映</Text>
      </Pressable>
    </View>
  );
  return (
    <View style={{ marginTop: 10, backgroundColor: t.panel2, borderRadius: 12, borderWidth: 1, borderColor: t.border, padding: 12 }}>
      {result.currentlySurvives
        ? <Text style={{ fontSize: 11.5, color: t.mid }}>現状の振りで既に確定耐え。最小投資の目安：</Text>
        : <Text style={{ fontSize: 11.5, color: t.foe, fontWeight: '700' }}>現状は確定耐えできていない。必要投資：</Text>}
      {result.byHP ? <Line label="HP" line={result.byHP} onApply={() => onApplyHP(result.byHP!.pts)} />
        : <Text style={{ fontSize: 11.5, color: t.lo, marginTop: 8 }}>HP最大振りでも確定耐え不可</Text>}
      {result.byDef ? <Line label={defLabel} line={result.byDef} onApply={() => onApplyDef(result.byDef!.pts)} />
        : <Text style={{ fontSize: 11.5, color: t.lo, marginTop: 8 }}>{defLabel}最大振りでも確定耐え不可</Text>}
    </View>
  );
}

function EffPill({ eff }: { eff: number }) {
  const c = eff === 0 ? '#5a6678' : eff > 1 ? '#ff5a45' : eff < 1 ? '#5ad1e6' : '#93a0b4';
  return (
    <View style={{ borderWidth: 1, borderColor: c + '55', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 }}>
      <Text style={{ fontSize: 13, fontWeight: '800', color: c }}>×{eff}</Text>
    </View>
  );
}

type FoeSlotProps = {
  t: typeof THEMES.dark; mon: { jp: string; types: TypeJP[] }; tera: { on: boolean; type: TypeJP };
  focused: boolean; inTarget: boolean; res?: { ko: { kind: keyof typeof KO_COLORS; label: string }; minPct: number; maxPct: number };
  onMon: () => void; onFocus: () => void;
};
function FoeSlot({ t, mon, tera, focused, inTarget, res, onMon, onFocus }: FoeSlotProps) {
  const kc = res ? KO_COLORS[res.ko.kind] : t.lo;
  return (
    <Pressable onPress={onFocus} style={{
      flex: 1, borderRadius: 13, padding: 10, backgroundColor: inTarget ? t.panel2 : t.chip,
      borderWidth: 1, borderColor: focused ? t.foe : inTarget ? t.foe + '55' : t.border,
    }}>
      <Pressable onPress={onMon} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        <Text style={{ fontWeight: '800', fontSize: 13.5, color: t.hi }}>{mon.jp}</Text>
        <Ionicons name="chevron-down" size={13} color={t.mid} style={{ marginLeft: 'auto' }} />
      </Pressable>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {(tera.on ? [tera.type] : mon.types).map((ty) => <TypePill key={ty} ty={ty} sm />)}
      </View>
      {res && (
        <Text style={{ fontSize: 13, fontWeight: '800', color: kc, marginTop: 5 }}>
          {res.ko.label}<Text style={{ fontSize: 10, color: t.mid, fontWeight: '600' }}> {res.minPct.toFixed(0)}–{res.maxPct.toFixed(0)}%</Text>
        </Text>
      )}
    </Pressable>
  );
}

type AllySlotProps = {
  t: typeof THEMES.dark; mon: { jp: string; types: TypeJP[] }; tera: { on: boolean; type: TypeJP };
  active: boolean; hitByAlly: boolean; res?: { ko: { kind: keyof typeof KO_COLORS; label: string }; maxPct: number };
  onMon: () => void; onActivate: () => void;
};
function AllySlot({ t, mon, tera, active, hitByAlly, res, onMon, onActivate }: AllySlotProps) {
  return (
    <Pressable onPress={onActivate} style={{
      flex: 1, borderRadius: 13, padding: 10, backgroundColor: active ? t.panel2 : t.chip,
      borderWidth: 1, borderColor: active ? t.accent : hitByAlly ? t.foe + '66' : t.border,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
        {active && <View style={{ backgroundColor: t.accent, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 }}>
          <Text style={{ fontSize: 8.5, fontWeight: '800', color: t.onAccent }}>攻撃</Text></View>}
        <Text style={{ fontWeight: '800', fontSize: 13.5, color: t.hi }}>{mon.jp}</Text>
        <Pressable onPress={onMon} style={{ marginLeft: 'auto' }}><Ionicons name="chevron-down" size={13} color={t.mid} /></Pressable>
      </View>
      <View style={{ flexDirection: 'row', gap: 4, marginTop: 4 }}>
        {(tera.on ? [tera.type] : mon.types).map((ty) => <TypePill key={ty} ty={ty} sm />)}
      </View>
      {hitByAlly && res ? (
        <Text style={{ fontSize: 12, fontWeight: '800', color: t.foe, marginTop: 5 }}>⚠{res.ko.label} <Text style={{ fontSize: 10 }}>{res.maxPct.toFixed(0)}%</Text></Text>
      ) : !active ? (
        <Text style={{ fontSize: 9.5, color: t.lo, marginTop: 5 }}>タップで攻撃役に</Text>
      ) : null}
    </Pressable>
  );
}

function MiniChip({ t, on, label, onPress }: { t: typeof THEMES.dark; on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : 'transparent' }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: on ? t.onAccent : t.mid }}>{label}</Text>
    </Pressable>
  );
}
function MiniMove({ t, mv, on, onPress }: { t: typeof THEMES.dark; mv: { jp: string; type: TypeJP; target: string }; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, borderWidth: 1, borderColor: on ? TYPE_COLORS[mv.type] : t.border, backgroundColor: on ? TYPE_COLORS[mv.type] + '26' : 'transparent' }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: on ? TYPE_COLORS[mv.type] : t.mid }}>{mv.jp}</Text>
      {mv.target !== 'single' && <Text style={{ fontSize: 8, color: on ? TYPE_COLORS[mv.type] : t.mid }}>※範囲</Text>}
    </Pressable>
  );
}
