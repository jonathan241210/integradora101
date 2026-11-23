# Tareas · 018 · pending-review-badges

- Spec: `apps/dashboard/specs/018-pending-review-badges.md` (Aprobada, 2026-11-20)
- Plan: `apps/dashboard/plan/018-pending-review-badges.md` (Aprobado — aprobación técnica: Jonathan, 2026-11-20)
- Contrato: `apps/api/plan/024-pending-review-counts.md` y `apps/api/tasks/024-pending-review-counts.md` (`GET /api/v1/admin/pending-counts`).
- DBR: ninguna.

Plan aprobado 2026-11-20. Implementación 2026-11-20: T-01 a T-10 hechas con Vitest completo (739 pruebas) y `tsc` verdes. T-11 a T-13 siguen abiertas (verificación final, PR e integración real con `api-024`).

## Cliente y lógica de presentación

- [x] **T-01** (CA-13): `packages/api-client/admin.ts` añade `pendingCounts()` que hace `http.get` a `${base}/pending-counts` y devuelve el cuerpo sin `unwrap`. `packages/api-client/admin-types.ts` añade `PendingReviewCountsDto = { species_requests?: number; memories?: number }`. Actualizar `packages/api-client/README.md`. Sin lógica de negocio.
- [x] **T-02** (CA-03, CA-05, CA-09, CA-11): crear `apps/dashboard/src/viewmodels/pending-review.ts` con funciones puras: claves a consultar según `permissions` (ninguna sin `species.review` ni `memories.review`), mapa `memories` → `memories` y `tulanpedia` → `species_requests`, puntito si el conteo es mayor que 0, nombre accesible («TulanPedia, con solicitudes pendientes» / «Momentos, con momentos pendientes de revisión»), y textos de aviso en singular y plural exactamente como CA-01 y CA-03.

## Hook y estado

- [x] **T-03** (CA-13, CA-16): crear `apps/dashboard/src/viewmodels/usePendingReviewCounts.ts`. Usa `adminApi` de `services/arca-api.ts`. Intervalo mínimo de 15 s entre consultas que tienen éxito (RN-07); sin `setInterval`; ignora respuestas de un perfil anterior; errores sin mensaje ni reintento en bucle. Decisión 2026-11-20 (pregunta 4): un fallo no cuenta para el intervalo.

## Avisos

- [x] **T-04** (CA-15): `viewmodels/dashboard-notifications.ts` añade el tono `"info"` y pasa a cola FIFO (decisión 2026-11-20, pregunta 1; RN-14). `components/DashboardNotifications.tsx` añade el tono `info` (icono y etiqueta «Aviso», decisión 2026-11-20, pregunta 2; RN-12) y exporta `usePublishNotice()`. `styles.css`: `.dashboard-notification[data-tone="info"]` con tokens semánticos; modo claro.
- [x] **T-05** (CA-01, CA-02, CA-03, CA-04, CA-12): crear `apps/dashboard/src/components/PendingReviewNotices.tsx` (hijo de `DashboardNotifications`) que publica un aviso por cada tipo con pendientes, una vez por inicio de sesión, con `role="status"` y solo los textos de CA-01 y CA-03. Sin datos de personas ni de especies.

## Menú y cambio de pantalla

- [x] **T-06** (CA-01, CA-05, CA-09): `apps/dashboard/src/App.tsx`: en cada botón de `sidebar-nav` con puntito, `aria-label` calculado por `pending-review.ts` y `<span className="sidebar-link__dot" aria-hidden="true" />`. `styles.css`: `.sidebar-link__dot` visible con menú contraído y en móvil (RN-09), con token semántico.
- [x] **T-07** (CA-04, CA-05, CA-06, CA-07, CA-08, CA-10, CA-11, CA-15, CA-16): conectar el hook en `App.tsx` con `shell.state.activeSection` y el perfil autenticado; no consultar sin permisos; no consultar sin cambio de pantalla. Tests de comportamiento en `apps/dashboard/src/tests/pending-review-badges.test.tsx` con los nombres `CA-xx pending-review-badges: ...` (aviso no se repite, puntito por sección, baja a cero, consulta al cambiar de sección incluida búsqueda global y enlace interno, sin sondeo, fallo no bloquea, sin permisos no consulta, espera a otro aviso, intervalo de 15 s, y clic en la sección ya abierta sin consulta, RN-13).

## Pruebas y calidad

- [x] **T-08** (CA-09, CA-15): ajustar los tests de navegación y avisos existentes que dependan del nombre accesible antiguo o de la ranura única de avisos (`administration-navigation.test.tsx`, `species-navigation.test.tsx`, `memory-navigation.test.tsx`, `global-search-navigation.test.tsx`), sin cambiar lo que comprueban. Registrar qué se ajustó y por qué.
- [x] **T-09** (CA-14): `apps/dashboard/src/tests/pending-review-badges-coverage.test.tsx` comprueba que cada `CA-01` a `CA-16` aparece en el nombre de un test de esta feature. Además, `pending-review-api-client.test.tsx` (CA-13): el método del cliente llama a `/api/v1/admin/pending-counts` con mock y no hay `fetch` ni `axios` en `components/` ni en `views/`.
- [x] **T-10** (documentación): `packages/api-client/README.md` (ya en T-01) y `apps/dashboard/docs/` solo si existe una referencia de menú o avisos que cambie. Sin cambios en `infra/README.md`.
- [ ] **T-11** (`/verify`): Vitest de los archivos tocados y de la regresión de avisos y navegación (`published-species-*`, `memory-*`, `*-navigation`), `tsc` y lint del dashboard. Registrar salida real aportada por la sesión principal. Sin evidencia no se marca.

## Entrega

- [ ] **T-12** (entrega): PR enlaza `apps/dashboard/specs/018-pending-review-badges.md`, `apps/dashboard/plan/018-pending-review-badges.md`, `apps/dashboard/tasks/018-pending-review-badges.md` y las tareas de `api-024`. El commit cita `dashboard-018`. Los commits los hace Jonathan con el comando que indique él. El cambio de estado de la spec solo con aprobación humana y enlace al PR.
- [ ] **T-13** (integración): ejecutar con la ruta `GET /api/v1/admin/pending-counts` real (`api-024` mergeada) en `arca_pruebas`, con `zoo-admin` y, cuando `api-023` esté mergeada, con «Comunicación». Registrar el resultado. Sin esta tarea el PR no se mergea.

Cobertura: CA-01 a CA-16 tienen al menos una tarea de código y un test (T-02 a T-07 con tests en `pending-review-badges.test.tsx`; CA-13 en T-01 y T-09; CA-14 en T-09). Sin tareas de BD: no hay DBR.
