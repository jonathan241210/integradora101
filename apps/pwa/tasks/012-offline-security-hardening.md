# Tareas · 012 · offline-security-hardening

- Solicitada: 2026-11-23
- Aprobada: 2026-11-23
- Spec: `apps/pwa/specs/012-offline-security-hardening.md`
- Plan: `apps/pwa/plan/012-offline-security-hardening.md`
- Aprobación del checklist: aprobada por el equipo junto con la spec y el plan.

## Implementación y pruebas

- [x] **T-01 (CA-01, CA-02)**. Pasar `createAnimalWithPhoto` y `uploadAnimalPhoto` por el cliente compartido, conservando los mensajes en español.
- [x] **T-02 (CA-01, CA-02)**. Pruebas Vitest de `X-XSRF-TOKEN`, `FormData` y mensajes de error.
- [x] **T-03 (CA-08)**. Crear `useAnimalActions` y migrar `AnimalFormView`, `AnimalProfileView`, `DiagnosisIntenseView` y `DiagnosisQuickView`.
- [x] **T-04 (CA-08)**. Prueba Vitest que revisa que las vistas no importan `@/services/apiClient`.
- [x] **T-05 (CA-03, RN-01)**. Crear `session-cleanup` y borrar los datos del `userScope` al cerrar sesión, con aviso si el borrado falla.
- [x] **T-06 (CA-04, RN-02)**. Avisar el conteo de pendientes y exigir confirmación (`LogoutConfirmDialog`).
- [x] **T-07 (CA-03, CA-04)**. Pruebas Vitest de borrado por usuario, fallo de borrado, conteo y confirmación.
- [x] **T-08 (CA-05, CA-06)**. Excluir `/storage`, `/api` y `/sanctum` y cachear solo respuestas `ok` en `public/sw.js`.
- [x] **T-09 (CA-07)**. Nombre de caché versionado y borrado de cachés anteriores en `activate`.
- [x] **T-10 (CA-05, CA-06, CA-07)**. Pruebas Vitest que cargan `sw.js` en un contexto aislado.
- [x] **T-11 (api-028)**. Tratar el estado `retry` como pendiente en `sync-manager.ts` y probarlo.

- [x] **T-14 (CA-09)**. `src/offline/sync-manager.ts` envía la cola en lotes de `SYNC_BATCH_SIZE` (100) en orden; prueba `src/tests/sync-batching.test.ts`.

## Calidad y entrega

- [x] **T-12 (CA-01 a CA-09)**. Ejecutar `/verify`: `npm test` (175 pruebas en verde) y `npm run build` (incluye TypeScript).
- [ ] **T-13**. Enlazar spec, plan y tareas en el PR de entrega (lo hace el equipo al publicar).
