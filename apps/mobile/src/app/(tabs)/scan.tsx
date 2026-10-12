import { useRouter } from 'expo-router';
import { QrScannerScreen } from '../../screens/QrScannerScreen';
import { useQrViewModel } from '../../viewmodels/useQrViewModel';

export default function QrScannerRoute() {
  const router = useRouter();
  const { simulateScan } = useQrViewModel();
  const runSimulation = (outcome: 'valid' | 'invalid' | 'already-discovered') => {
    simulateScan(outcome)
      .then((result) => {
        if (result.outcome === 'valid') {
          router.push(`/qr-result?animalId=${result.animalId}`);
        } else if (result.outcome === 'already-discovered') {
          router.push(`/qr-already-discovered?animalId=${result.animalId}`);
        } else {
          router.push('/qr-invalid');
        }
      })
      .catch((error: unknown) => console.error('Error simulating QR scan:', error));
  };
  return (
    <QrScannerScreen
      onValidPress={() => runSimulation('valid')}
      onInvalidPress={() => runSimulation('invalid')}
      onAlreadyDiscoveredPress={() => runSimulation('already-discovered')}
    />
  );
}
