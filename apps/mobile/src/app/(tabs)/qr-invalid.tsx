import { useRouter } from 'expo-router';
import { QrInvalidScreen } from '../../screens/QrInvalidScreen';

export default function QrInvalidRoute() {
  const router = useRouter();
  return <QrInvalidScreen onRetryPress={() => router.replace('/scan')} onHomePress={() => router.replace('/')} />;
}
