import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { QrScannerScreen } from '../../screens/QrScannerScreen';
import { useAccountSession } from '../../viewmodels/useAccountSession';
import { useQrScanViewModel } from '../../viewmodels/useQrScanViewModel';

export default function QrScannerRoute() {
  const router = useRouter();
  const { status } = useAccountSession();
  const vm = useQrScanViewModel(router);

  useEffect(() => {
    if (status === 'guest') {
      router.replace('/login');
    }
  }, [router, status]);

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <QrScannerScreen
      cameraGranted={vm.cameraGranted}
      needsPermissionPrompt={vm.needsPermissionPrompt}
      cameraDenied={vm.cameraDenied}
      busy={vm.busy}
      validationError={vm.validationError}
      manualCode={vm.manualCode}
      onManualCodeChange={vm.setManualCode}
      onRequestPermission={vm.onRequestPermission}
      onBarcodeScanned={vm.onBarcodeScanned}
      onManualSubmit={vm.onManualSubmit}
    />
  );
}
