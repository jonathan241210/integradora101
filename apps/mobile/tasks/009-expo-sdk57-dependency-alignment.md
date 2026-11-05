# Tareas · 009 · expo-sdk57-dependency-alignment

- Spec: `apps/mobile/specs/009-expo-sdk57-dependency-alignment.md`
- Plan: `apps/mobile/plan/009-expo-sdk57-dependency-alignment.md`
- Estado: Aprobado; implementación en progreso

## Implementación

- [x] **T-01** (CA-01, RN-01): declarar `react-native-reanimated@4.5.1` y `react-native-worklets@0.10.1` en el `package.json` raíz junto a las dependencias Expo compartidas.
- [x] **T-02** (CA-01, CA-02, RN-02): regenerar `package-lock.json` desde la raíz y comprobar que fija el par correcto tanto en el contexto raíz como en el workspace Mobile, sin `overrides` ni flags que omitan peer dependencies.

## Calidad y entrega

- Evidencia T-01/T-02: manifiesto raíz y lockfile fijan Reanimated 4.5.1 y Worklets 0.10.1.

- [x] **T-03** (CA-02): verificar `npm ci` desde la raíz en una instalación limpia, manteniendo la resolución estricta de peers.
- [ ] **T-04** (CA-03): ejecutar `npm run test --workspace=apps/mobile -- --runInBand` y `npm run build --workspace=@arca/dashboard`; registrar resultados.
- [x] **T-05** (CA-04): revisar el diff para confirmar que no cambia código fuente, configuración nativa, Babel, Metro ni pantallas de Mobile.
- [x] **T-06** (CA-01..CA-04): ejecutar `/verify`, `git diff --check` y documentar cualquier limitación de ejecución remota.

- Evidencia T-03/T-04/T-05/T-06: `npm ci` terminó correctamente y `npm ls expo-camera --workspace=apps/mobile` confirma `expo-camera@57.0.6`; el manifiesto y lockfile ya lo declaraban, por lo que no se requirieron cambios rastreados. Las pruebas Mobile finalizaron con 43 suites y 186 tests aprobados; `expo export --platform android` también terminó correctamente. `tsc --noEmit` reporta errores en `presentScanResult.ts` y `useQrScanViewModel.ts` (tipo `Router` no exportado por `expo-router`) y `AccountSettingsScreen.tsx` (`StyleSheet.absoluteFillObject`); no se modificaron. El build de Dashboard de T-04 queda pendiente. `git diff --check` no reportó errores. La verificación directa usó los scripts disponibles en `apps/mobile/package.json`, porque la app no tiene un `src/package.json`.

## Aprobación

- Spec funcional aprobada por el usuario solicitante el 2026-10-27.
- Plan técnico aprobado por el usuario solicitante el 2026-10-27.
- Checklist y revisión técnica aprobados por el usuario solicitante el 2026-10-27.
