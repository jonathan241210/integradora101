# Tareas · 006 · qr-scan

- Spec: `apps/mobile/specs/006-qr-scan.md` (Implementada, 2026-11-01; aprobación funcional Aksel, 2026-11-01)
- Plan: `apps/mobile/plan/006-qr-scan.md` (Aprobado, Aksel, 2026-11-01)
- Estado del checklist: Completado, 2026-11-01

## Dependencias y manifest

- [x] **T-01** (RN-03, ADR 0022): Instalar `expo-camera` (~57) y configurar plugin + permiso `CAMERA` en `app.json`.
- [x] **T-02** (CA-02): Crear `src/utils/normalizeQrCode.ts` con tests unitarios.

## Implementación

- [x] **T-03** (CA-04): Crear `src/navigation/presentScanResult.ts`.
- [x] **T-04** (CA-01, CA-02, CA-03, CA-05): Crear `useQrScanViewModel` (permisos, debounce, manual, `submitScan`).
- [x] **T-05** (CA-01–CA-03): Actualizar `QrScannerScreen` con cámara, overlay, manual y estados de carga.
- [x] **T-06** (CA-07): Actualizar `scan.tsx` — guardia de sesión y cableado del ViewModel.
- [x] **T-07** (CA-04): Retirar rutas `qr-result`, `qr-invalid`, `qr-already-discovered` y simulación mock del flujo release; actualizar `AppTabBar` y navegación.

## Pruebas

- [x] **T-08** (CA-01 a CA-07): Suites en `__tests__/qr/`; mock de `expo-camera` y `expo-location` en `jest.setup.js`.
- [x] **T-09**: Actualizar `__tests__/navigation.test.tsx` para el flujo de escaneo unificado.

## Calidad y entrega

- [x] **T-10**: `npm test` en `apps/mobile` (suites qr + navegación relacionada).
- [x] **T-11**: Actualizar roadmap y arquitectura; spec **Implementada** 2026-11-01.
- [x] **T-12** (CA-02 de 005, enmienda 2026-11-01): Tras `discoveries` exitoso, invalidar el progreso compartido y refrescar colección, perfil y aventura al enfocar. Emparejar especies por id.

No hay tareas de API ni DBR.
