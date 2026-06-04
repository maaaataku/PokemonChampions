// ErrorBoundary.tsx — 描画時の例外を受け止め、白画面化を防ぐフォールバック表示。
// 実機での信頼性向上（壊れた共有コードや想定外データでもアプリ全体は落とさない）。
import React from 'react';
import { View, Text, Pressable } from 'react-native';

interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    // 開発時はログに残す（本番でも握りつぶさず観測可能に）。
    console.error('[ErrorBoundary]', error);
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#0a0e16', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text style={{ color: '#eef2f8', fontSize: 17, fontWeight: '800', marginBottom: 8 }}>問題が発生しました</Text>
          <Text style={{ color: '#93a0b4', fontSize: 13, textAlign: 'center', marginBottom: 20 }}>
            計算の表示中にエラーが発生しました。再試行しても直らない場合は入力内容を見直してください。
          </Text>
          <Pressable onPress={this.retry} style={{ backgroundColor: '#9af23a', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ color: '#0a0e16', fontSize: 14, fontWeight: '800' }}>再試行</Text>
          </Pressable>
          {__DEV__ && <Text style={{ color: '#5a6678', fontSize: 10, marginTop: 16 }}>{String(this.state.error.message)}</Text>}
        </View>
      );
    }
    return this.props.children;
  }
}
