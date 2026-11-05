import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QrScannerScreen } from '../../src/screens/QrScannerScreen';

describe('mobile-006 entrada manual', () => {
  it('test-ca-03-manual-entry-when-denied: permite registrar código sin cámara', async () => {
    const onManualSubmit = jest.fn();
    const onManualCodeChange = jest.fn();
    const view = await render(
      <QrScannerScreen
        cameraGranted={false}
        needsPermissionPrompt={false}
        cameraDenied
        busy={false}
        validationError={null}
        manualCode="ARCA-MANUAL1"
        onManualCodeChange={onManualCodeChange}
        onRequestPermission={jest.fn()}
        onBarcodeScanned={jest.fn()}
        onManualSubmit={onManualSubmit}
      />,
    );

    expect(view.getByLabelText('Entrada manual de código')).toBeTruthy();
    fireEvent.press(view.getByText('Registrar código'));
    expect(onManualSubmit).toHaveBeenCalled();
  });
});
