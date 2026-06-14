// AboutScreen.tsx — 「このアプリについて」。非公式表記・出典(MIT)・開発支援(外部リンク/IAP枠)。
import React from 'react';
import { View, Text, Pressable, ScrollView, Modal, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { Theme } from '../ui/theme';
import { APP_VERSION, SMOGON_CALC_URL, PRIVACY_URL } from '../constants';

export interface AboutScreenProps {
  t: Theme;
  visible: boolean;
  onClose: () => void;
  /** 実数値チェック（照合用）を開く。 */
  onOpenStats: () => void;
}

function open(url: string) {
  if (url) Linking.openURL(url).catch(() => {});
}

export default function AboutScreen({ t, visible, onClose, onOpenStats }: AboutScreenProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: '#000a', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable
          style={{ backgroundColor: t.panel, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderWidth: 1, borderColor: t.border, maxHeight: '86%' }}
          onPress={() => {}}>
          {/* ヘッダー */}
          <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="information-circle" size={18} color={t.accent} />
            <Text style={{ fontWeight: '800', fontSize: 14, color: t.hi }}>このアプリについて</Text>
            <Pressable onPress={onClose} style={{ marginLeft: 'auto', backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
              <Ionicons name="close" size={17} color={t.hi} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }} keyboardShouldPersistTaps="handled">
            {/* アプリ名・バージョン */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <View style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="flash" size={24} color={t.bg} />
              </View>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '900', color: t.hi }}>ダブル特化ダメ計</Text>
                <Text style={{ fontSize: 11, color: t.lo }}>v{APP_VERSION}</Text>
              </View>
            </View>

            {/* 非公式表記 */}
            <Section t={t} title="本アプリについて">
              <Body t={t}>
                ダブル対戦向けの非公式ダメージ計算ツールです。{'\n'}
                本アプリはファンメイドであり、任天堂株式会社・株式会社ポケモン等とは一切関係ありません。
                ゲーム内の名称・データは各権利者に帰属します。
              </Body>
            </Section>

            {/* 開発を応援（アプリ内チップ = IAP のみ。外部寄付リンクは規約配慮で置かない） */}
            <Section t={t} title="開発を応援（チップ）">
              <Body t={t}>気に入っていただけたら、チップで開発を応援いただけます。</Body>
              <View style={{ marginTop: 10, backgroundColor: t.panel2, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {['¥120', '¥320', '¥640'].map((label) => (
                    <View key={label} style={{ borderWidth: 1, borderColor: t.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, opacity: 0.5 }}>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: t.mid }}>{label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={{ fontSize: 10, color: t.lo, marginTop: 6 }}>アプリ内チップ（投げ銭）は実機版で有効化します。</Text>
              </View>
            </Section>

            {/* 開発者向け：実数値チェック */}
            <Section t={t} title="照合ツール">
              <Pressable onPress={() => { onClose(); onOpenStats(); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, alignSelf: 'flex-start' }}>
                <Ionicons name="stats-chart" size={16} color={t.accent} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: t.hi }}>実数値チェック（実機照合用）</Text>
              </Pressable>
            </Section>

            {/* クレジット */}
            <Section t={t} title="クレジット・出典">
              <Body t={t}>ダメージ計算エンジンに @smogon/calc（MIT License）を使用しています。</Body>
              <LinkRow t={t} label="smogon/damage-calc を開く" onPress={() => open(SMOGON_CALC_URL)} />
              {!!PRIVACY_URL && <LinkRow t={t} label="プライバシーポリシー" onPress={() => open(PRIVACY_URL)} />}
            </Section>

            <Text style={{ fontSize: 10, color: t.lo, textAlign: 'center', marginTop: 8 }}>
              広告なし・トラッキングなし・個人情報の収集なし。計算は端末内で完結します。
            </Text>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Section({ t, title, children }: { t: Theme; title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontSize: 10.5, color: t.lo, fontWeight: '700', marginBottom: 6 }}>{title}</Text>
      {children}
    </View>
  );
}

function Body({ t, children }: { t: Theme; children: React.ReactNode }) {
  return <Text style={{ fontSize: 12.5, color: t.mid, lineHeight: 19 }}>{children}</Text>;
}

function LinkRow({ t, label, onPress }: { t: Theme; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 }}>
      <Ionicons name="open-outline" size={15} color={t.accent} />
      <Text style={{ fontSize: 12.5, fontWeight: '700', color: t.accent }}>{label}</Text>
    </Pressable>
  );
}
