# Tareas · 009 · expo-sdk57-dependency-alignment

- Spec: `apps/mobile/specs/009-expo-sdk57-dependency-alignment.md`
- Plan: `apps/mobile/plan/009-expo-sdk57-dependency-alignment.md`
- Estado: Aprobado; implementación en progreso

## Implementación

- [x] **T-01** (CA-01, RN-01): declarar `react-native-reanimated@4.5.1` y `react-native-worklets@0.10.1` en el `package.json` raíz junto a las dependencias Expo compartidas.
- [x] **T-02** (CA-01, CA-02, RN-02): regenerar `package-lock.json` desde la raíz y comprobar que fija el par correcto tanto en el contexto raíz como en el workspace Mobile, sin `overrides` ni flags que omitan peer dependencies.

## Calidad y entrega

- Evidencia T-01/T-02: manifiesto raíz y lockfile fijan Reanimated 4.5.1 y Worklets 0.10.1. La instalación limpia no terminó porque el entorno no pudo resolver registry.npmjs.org (EAI_AGAIN); no se observó ERESOLVE antes del fallo de red.

- [ ] **T-03** (CA-02): verificar `npm ci` desde la raíz en una instalación limpia, manteniendo la resolución estricta de peers.
- [ ] **T-04** (CA-03): ejecutar `npm run test --workspace=apps/mobile -- --runInBand` y `npm run build --workspace=@arca/dashboard`; registrar resultados.
- [ ] **T-05** (CA-04): revisar el diff para confirmar que no cambia código fuente, configuración nativa, Babel, Metro ni pantallas de Mobile.
- [ ] **T-06** (CA-01..CA-04): ejecutar `/verify`, `git diff --check` y documentar cualquier limitación de ejecución remota.

## Aprobación

- Spec funcional aprobada por el usuario solicitante el 2026-10-27.
- Plan técnico aprobado por el usuario solicitante el 2026-10-27.
- Checklist y revisión técnica aprobados por el usuario solicitante el 2026-10-27.
