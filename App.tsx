import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import DoublesScreen from './src/screens/DoublesScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <DoublesScreen />
    </SafeAreaProvider>
  );
}
