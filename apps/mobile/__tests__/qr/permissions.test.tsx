import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { useCameraPermissions } from 'expo-camera';
import { QrScannerScreen } from '../../src/screens/QrScannerScreen';

jest.mock('expo-camera');

describe('mobile-006 permisos de cámara', () => {
  it('test-ca-01-camera-permission-request: muestra solicitud de permiso antes de la cámara', async () => {
    (useCameraPermissions as jest.Mock).mockReturnValue([
      { granted: false, canAskAgain: true, status: 'undetermined' },
      jest.fn(),
    ]);

    const onRequestPermission = jest.fn();
    const view = await render(
      <QrScannerScreen
        cameraGranted={false}
        needsPermissionPrompt
        cameraDenied={false}
        busy={false}
        validationError={null}
        manualCode=""
        onManualCodeChange={jest.fn()}
        onRequestPermission={onRequestPermission}
        onBarcodeScanned={jest.fn()}
        onManualSubmit={jest.fn()}
      />,
    );

    expect(view.getByText(/acceso a la cámara/i)).toBeTruthy();
    fireEvent.press(view.getByText('Permitir cámara'));
    expect(onRequestPermission).toHaveBeenCalled();
  });
});
