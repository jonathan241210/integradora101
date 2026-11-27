# Tareas · 015 · mobile-responsive-experience

- Spec: `apps/pwa/specs/015-mobile-responsive-experience.md`
- Plan: `apps/pwa/plan/015-mobile-responsive-experience.md`

## Base de datos (responsable de BD)

- No aplica: cambio exclusivamente de presentación en `apps/pwa`, sin cambios de esquema ni DBR.

## Implementación

- [x] **T-01** (CA-01, CA-02, CA-07): Agregar `viewport-fit=cover` en `apps/pwa/index.html`, mover «Cerrar sesión» móvil al encabezado `.topbar` en `apps/pwa/src/views/AppShell.tsx`, adaptar `.navigation-mobile` a una sola fila con desplazamiento horizontal para 6–7 ítems y reubicar `.sync-notices` arriba en móvil (`<= 760px`) en `apps/pwa/src/styles.css`.
- [x] **T-02** (CA-03): Adaptar `apps/pwa/src/views/AnimalProfileView.tsx` y `apps/pwa/src/styles.css` para presentar historial clínico y contención química como tarjetas apiladas en móvil (`data-label`, evaluación expandida al 100 % del ancho), reemplazar `.form-actions` en hero y celdas por clases propias y ajustar `.profile-toolbar`.
- [x] **T-03** (CA-04): Adaptar `apps/pwa/src/views/SyncStatusView.tsx` y `apps/pwa/src/styles.css` con cabecera `.sync-toolbar` y vista de tarjetas apiladas en móvil (`data-label`) para la cola de sincronización.
- [x] **T-04** (CA-05): Adaptar `DiagnosisIntenseView.tsx` (tabla editable de contención química con `data-label` y vista de bloques móviles sin duplicar inputs), `DiagnosisQuickView.tsx` (firma responsiva sin desbordamiento), `ReviewFormView.tsx` (`.review-actions`) y controles táctiles/acciones en `styles.css` (`.form-actions` apilables en `<= 520px`, `.check-group`, `.table-input`, `.clear-image-btn`).
- [x] **T-05** (CA-06): Adaptar en `apps/pwa/src/styles.css` el listado de animales (`.animal-row-button`, `.animals-results-toolbar`, `.animals-sort`, `.animals-card .pagination-bar`), el control segmentado (`.segmented`) y chips de `SpeciesRequestView`, y el layout móvil de `.arca-dialog`.
- [x] **T-06** (CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08): Crear y mantener `apps/pwa/src/tests/mobile-responsive-experience.test.tsx` con pruebas automatizadas que nombren y verifiquen cada criterio `CA-01` a `CA-08`.
- [x] **T-09** (CA-08): Rediseñar los iconos `animals`/`paw` (huella animal clara) y agregar `species` (catálogo abierto) en `apps/pwa/src/components/Icon.tsx`, conectándolo a `species-request` en `AppShell.tsx` y `HomeView.tsx`.

## Calidad y entrega

- [x] **T-07**: Ejecutar verificaciones de `apps/pwa` (`npm run build` OK con `tsc -b` + Vite; `npm test`: 22/23 archivos y 182/184 tests en verde, incluidos 7/7 de `mobile-responsive-experience.test.tsx`, `responsive.test.tsx` y `screens.test.tsx`; 2 fallos preexistentes y ajenos en `login-lockout-countdown.test.tsx` derivados de cambios locales previos en `useStaffSession.ts`).
- [ ] **T-08**: Resolver fallos preexistentes de `003-staff-login`, enlazar PR y pasar `specs/015-mobile-responsive-experience.md` a `Implementada`.
