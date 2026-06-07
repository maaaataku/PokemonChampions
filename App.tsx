import { useEffect, useState } from 'react';
import { View, Text, Pressable, useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { THEMES, type ThemeName } from './src/ui/theme';
import { initialBoard, type BoardState } from './src/ui/calcModel';
import DoublesScreen from './src/screens/DoublesScreen';
import MatchupScreen from './src/screens/MatchupScreen';
import PresetManager from './src/screens/PresetManager';
import AboutScreen from './src/screens/AboutScreen';
import ErrorBoundary from './src/ui/ErrorBoundary';
import { syncChampionsPatch } from './src/data/patchSync';

type Tab = 'calc' | 'matchup';

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}

function AppInner() {
  const scheme = useColorScheme();
  const [themeName, setThemeName] = useState<ThemeName>(scheme === 'light' ? 'light' : 'dark');
  const t = THEMES[themeName];

  const [board, setBoard] = useState<BoardState>(initialBoard);
  const [tab, setTab] = useState<Tab>('calc');
  const [manageOpen, setManageOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  // 差分配信(N-6): 起動時にキャッシュ→リモートの順で適用し、適用後に再描画を促す。
  const [, setPatchVersion] = useState(0);
  useEffect(() => {
    let alive = true;
    syncChampionsPatch()
      .then((res) => { if (alive && res.applied !== 'builtin') setPatchVersion((v) => v + 1); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style={themeName === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center' }}>
       {/* モバイルは全幅、広い画面では中央480幅に制限（実戦コンパニオンの読みやすさ） */}
       <View style={{ flex: 1, width: '100%', maxWidth: 480 }}>
        {/* ヘッダー（タブ共有） */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 8, paddingBottom: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="flash" size={16} color={t.bg} />
            </View>
            <Text style={{ fontWeight: '900', fontSize: 15, color: t.hi }}>
              ダブル特化ダメ計
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable onPress={() => setAboutOpen(true)}
              style={{ backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
              <Ionicons name="information-circle-outline" size={17} color={t.hi} />
            </Pressable>
            <Pressable onPress={() => setManageOpen(true)}
              style={{ backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
              <Ionicons name="albums" size={17} color={t.hi} />
            </Pressable>
            <Pressable onPress={() => setThemeName(themeName === 'dark' ? 'light' : 'dark')}
              style={{ backgroundColor: t.chip, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 8 }}>
              <Ionicons name={themeName === 'dark' ? 'sunny' : 'moon'} size={17} color={t.hi} />
            </Pressable>
          </View>
        </View>

        {/* タブ切替 */}
        <View style={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          {([['calc', 'ダメージ計算', 'calculator'], ['matchup', 'タイプ相性', 'shield-half']] as [Tab, string, keyof typeof Ionicons.glyphMap][]).map(([key, label, icon]) => {
            const on = tab === key;
            return (
              <Pressable key={key} onPress={() => setTab(key)} style={{
                flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
                paddingVertical: 9, borderRadius: 12, borderWidth: 1,
                borderColor: on ? t.accent : t.border, backgroundColor: on ? t.accent : 'transparent',
              }}>
                <Ionicons name={icon} size={15} color={on ? t.onAccent : t.mid} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: on ? t.onAccent : t.mid }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>

        {tab === 'calc'
          ? <DoublesScreen t={t} s={board} setS={setBoard} />
          : <MatchupScreen t={t} s={board} setS={setBoard} />}
       </View>

        <PresetManager t={t} visible={manageOpen} board={board}
          onLoad={(b) => setBoard(b)} onClose={() => setManageOpen(false)} />
        <AboutScreen t={t} visible={aboutOpen} onClose={() => setAboutOpen(false)} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
