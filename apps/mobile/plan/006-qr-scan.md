# Plan técnico · 006 · qr-scan

- Spec: `apps/mobile/specs/006-qr-scan.md`
- Estado de spec: Implementada (2026-11-01; aprobación funcional Aksel, 2026-11-01)
- Estado del plan: Aprobado e implementado (Aksel, 2026-11-01)
- Responsable técnico: Aksel
- ADR: `docs/adr/0022-expo-camera-qr-scan.md` (Aceptado, 2026-11-01; renumerado 0022 el 2026-11-04)

## Diseño de solución

La pestaña `scan` comprueba sesión visitante, gestiona permiso de cámara y muestra `CameraView` de `expo-camera`. Al leer un barcode, normaliza el payload y llama `submitScan` (`mobile-005`). La respuesta se presenta con `presentScanResult` → ruta `scan-result`. Si no hay permiso, la misma pantalla ofrece entrada manual.

No hay cambios en Laravel ni en `@arca/api-client`.

## Cambios por área

| Área | Archivos | Propósito |
|---|---|---|
| Utilidades | `src/utils/normalizeQrCode.ts` | CA-02 normalización |
| Navegación | `src/navigation/presentScanResult.ts` | CA-04 params a `scan-result` |
| ViewModel | `src/viewmodels/useQrScanViewModel.ts` | Permisos, debounce, envío |
| UI | `src/screens/QrScannerScreen.tsx` | Cámara + manual + loading |
| Ruta | `src/app/(tabs)/scan.tsx` | Sesión + ViewModel |
| Manifest | `app.json`, `package.json` | `expo-camera`, permiso CAMERA |
| Limpieza | Eliminar rutas `qr-*`, `useQrViewModel`, `QrRepository` de flujo productivo | CA-04 unificado |
| Pruebas | `__tests__/qr/` | CA-01–CA-07 |
| Docs | `docs/003-008-roadmap-y-asignacion.md`, `docs/arquitectura.md` | Estado 006 |

## Contrato y datos

- Entrada: string leído de QR o tecleado.
- Salida: `ScanPresentation` vía `submitScan` → `POST /api/v1/visitor/discoveries` (sin cambios).

## Seguridad, offline y operación

Sin almacenamiento de imagen. HTTPS en APK. QA con `php artisan arca:generate-qr-codes {enclosure}` e impresión local del string `code`.

## Mapeo de criterios a pruebas

| Criterio | Prueba | Ubicación |
|---|---|---|
| CA-01 | `test-ca-01-camera-permission-request` | `__tests__/qr/permissions.test.tsx` |
| CA-02 | `test-ca-02-normalize-qr-payload` | `__tests__/qr/normalizeQrCode.test.ts` |
| CA-03 | `test-ca-03-manual-entry-when-denied` | `__tests__/qr/manual-entry.test.tsx` |
| CA-04 | `test-ca-04-submit-scan-navigation` | `__tests__/qr/submit-flow.test.tsx` |
| CA-05 | `test-ca-05-qr-scan-mvvm` | `__tests__/qr/submit-flow.test.tsx` |
| CA-06 | `test-ca-06-suite-documents-simulator-limits` | comentario en `__tests__/qr/README` o cabecera de suite |
| CA-07 | `test-ca-07-guest-redirects-to-login` | `__tests__/qr/session-guard.test.tsx` |

## Constitution Check

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo | Sí | `expo-camera` vía ADR 0022; sin API nueva |
| II. La spec manda | Sí | Solo alcance 006 |
| III. MVVM | Sí | Screen → useQrScanViewModel → submitScan |
| IV. Un test por CA | Sí | Tabla anterior |
| V. Una fuente de verdad | Sí | Validación en api-005 |
| VI. Español UI | Sí | Copy en pantalla y permiso |

## Orden y aprobación

1. Spec y ADR aprobados 2026-11-01.
2. Este plan aprobado 2026-11-01.
3. Implementación según `tasks/006-qr-scan.md`.

Aprobador funcional: Aksel. Fecha: 2026-11-01.
