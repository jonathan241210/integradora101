import { useCallback, useMemo, useRef, useState } from 'react';
import { useCameraPermissions } from 'expo-camera';
import type { Router } from 'expo-router';
import { presentScanResult } from '../navigation/presentScanResult';
import { submitScan, type ScanPresentation } from '../services/scanQueue';
import { normalizeQrCode } from '../utils/normalizeQrCode';

const DEBOUNCE_MS = 2000;

export type QrScanViewModelDeps = {
  submit: (code: string) => Promise<ScanPresentation>;
  present: (router: Router, presentation: ScanPresentation) => void;
  normalize: (raw: string) => string | null;
};

export function useQrScanViewModel(router: Router, deps?: Partial<QrScanViewModelDeps>) {
  const resolved = useMemo<QrScanViewModelDeps>(
    () => ({
      submit: submitScan,
      present: presentScanResult,
      normalize: normalizeQrCode,
      ...deps,
    }),
    [deps],
  );
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);

  const processRawCode = useCallback(
    async (raw: string) => {
      const code = resolved.normalize(raw);
      if (!code) {
        setValidationError('Ese texto no es un código válido del zoológico. Debe empezar por ARCA-.');
        return;
      }
      const now = Date.now();
      const last = lastScanRef.current;
      if (last && last.code === code && now - last.at < DEBOUNCE_MS) return;
      lastScanRef.current = { code, at: now };
      setValidationError(null);
      setBusy(true);
      try {
        const presentation = await resolved.submit(code);
        resolved.present(router, presentation);
      } finally {
        setBusy(false);
      }
    },
    [resolved, router],
  );

  const onBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (busy) return;
      void processRawCode(data);
    },
    [busy, processRawCode],
  );

  const onManualSubmit = useCallback(
    (codeOverride?: string) => {
      if (busy) return Promise.resolve();
      const typed = typeof codeOverride === 'string' ? codeOverride : manualCode;
      if (typeof codeOverride === 'string') setManualCode(codeOverride);
      return processRawCode(typed.trim());
    },
    [busy, manualCode, processRawCode],
  );

  const onRequestPermission = useCallback(() => {
    void requestPermission();
  }, [requestPermission]);

  const cameraGranted = permission?.granted === true;
  const cameraDenied = permission?.granted === false && permission.canAskAgain === false;
  const needsPermissionPrompt = permission !== null && !permission.granted && permission.canAskAgain;

  return {
    permission,
    cameraGranted,
    cameraDenied,
    needsPermissionPrompt,
    busy,
    validationError,
    manualCode,
    setManualCode,
    onBarcodeScanned,
    onManualSubmit,
    onRequestPermission,
  };
}
