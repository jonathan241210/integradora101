# Tareas · 016 · PoC ARCore/ARKit con anclaje AR

- Spec: `apps/mobile/specs/016-arcore-arkit-anchor-poc.md` (Aprobada)
- Plan: `apps/mobile/plan/016-arcore-arkit-anchor-poc.md` (Aprobado)
- ADR: `docs/adr/0032-viroreact-arcore-arkit-poc.md` (Aceptado)

## SDD / decisión

- [x] **T-01** (CA-01, RN-04): ADR 0032 aprobado por Victor Adrian (2026-11-21).
- [x] **T-02** (CA-01): Spec/plan/tasks 016 aprobados por Victor Adrian (2026-11-21).

## Configuración build

- [~] **T-03** (CA-02): Agregado `@reactvision/react-viro@3.1.1` en `package.json` y plugin en `app.json`. Pendiente `npm install`/lockfile y verificación en dev build.
- [~] **T-04** (CA-02): Agregado perfil `development` en `eas.json`. Pendiente documentar comandos y validar build.
- [ ] **T-05** (CA-02): Generar dev build y confirmar que Expo Go no es el medio de prueba para la PoC.

## Implementación PoC

- [~] **T-06** (CA-03): Scaffold de `ViroArAnchorScene.tsx` creado (fallback si Viro no disponible). Pendiente validar en dev build ARCore.
- [~] **T-07** (CA-04, RN-05): `arGeoAnchor.ts` creado y MapScreen pasa anchors GPS cercanos. Pendiente validar precisión/anclaje en dispositivo.
- [~] **T-08** (CA-05): Botón "AR nativa PoC" en overlay y fallback si módulo no disponible. Pendiente prueba en dispositivo.

## Verificación y cierre

- [ ] **T-09** (CA-06): Documentar setup, comandos, compatibilidad, limitaciones y resultado en dispositivo real.
- [ ] **T-10** (CA-06): Agregar tests/evidencia automatizada donde sea viable y checklist manual para AR nativa.