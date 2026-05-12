import { SafeAreaProvider } from 'react-native-safe-area-context';
import App from '../src/App';

export default function Index() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}
