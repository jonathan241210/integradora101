# Tareas · 012 · enclosure-actions-global-search

- Spec: `apps/dashboard/specs/012-enclosure-actions-global-search.md` (Aprobada, Jonathan, 2026-11-18)
- Plan: `apps/dashboard/plan/012-enclosure-actions-global-search.md` (Borrador, 2026-11-18)
- Dependencias: `apps/api/tasks/019-enclosure-status-and-global-search.md` (Borrador; bloque A = `admin.search`; bloque B = `setStatus`, `remove`, `is_active`), DBR-020 («Lista para backend», aplicada en `arca_pruebas` el 2026-11-18).
- Estado del checklist: **Aprobado** (Jonathan, 2026-11-18). En implementación; cada T-xx se marca solo con evidencia.

Reglas: sin `fetch` ni `axios` en `components/` ni en `views/`. Las pruebas son Vitest con entorno `node` y `renderToStaticMarkup`; las interacciones se prueban con funciones puras y hooks con cliente simulado. Cada `describe` cita `CA-NN enclosure-actions-global-search`.

## Bloque A. Buscador universal y cuadrícula (depende de api-019 bloque A para la búsqueda)

- [x] **T-01** (CA-26; precondición): línea base y verificación de componentes existentes.
  - Evidencia (2026-11-18): verificado: ConfirmDialog admite `danger` y usa Dialog nativo (foco de retorno al botón); ids de pestañas en tulanpedia-tab.ts ("requests"/"published"); historial de boletos = TicketHistoryView + useTicketHistory + ticket-history.ts; PaginationBar ampliada. Línea base previa 54/465.
  - Depende de: nada.
  - Pasos: ejecutar la suite del dashboard y registrar el número de pruebas y fallos. Verificar `components/PaginationBar.tsx` (`aria-current`, textos «Página X de Y», Anterior/Siguiente), `components/ConfirmDialog.tsx` (variante `danger`, foco de retorno), `viewmodels/tulanpedia-tab.ts` y `useTulanpediaTab.ts` (ids de las pestañas), y los nombres de la vista y del ViewModel del historial de boletos.
  - Test que lo cubre: ninguno (precondición). Cubre CA-26 porque fija la línea base de las pruebas existentes.
  - Hecho cuando: la salida queda registrada en el PR y los nombres confirmados aparecen en el plan.

- [x] **T-02** (CA-07; RN-05): función pura de paginación.
  - Evidencia (2026-11-18): `enclosurePage`, `enclosurePageCount`, `clampPage`, `pageOfEnclosure` en enclosures-management.ts; describe CA-07 pasa. apps/dashboard: npm test 55 archivos / 471 pruebas pasan (línea base previa: 54 / 465); npm run types sin errores. 
  - Depende de: T-01.
  - Archivos: `src/viewmodels/enclosures-management.ts` (añadir `enclosurePage(items, page, size = 9)`, `enclosurePageCount`, `clampPage`, `pageOfEnclosure(items, id)`).
  - Test: `src/tests/enclosure-actions-global-search.test.tsx` → `describe("CA-07 enclosure-actions-global-search")`: 10 recintos dan 9 y 1; «Página X de Y»; extremos deshabilitados.
  - Hecho cuando: el test pasa.

- [x] **T-03** (CA-07, CA-10): cuadrícula y paginación en la vista.
  - Evidencia (2026-11-18): useEnclosuresManagement (page, goToPage), EnclosuresView con PaginationBar; PaginationBar ampliada con `showPageNumbers` opcional (aria-current); describe CA-07 y CA-10 pasan y dashboard-011 sigue en verde. apps/dashboard: npm test 55 archivos / 471 pruebas pasan (línea base previa: 54 / 465); npm run types sin errores. 
  - Depende de: T-02.
  - Archivos: `src/viewmodels/useEnclosuresManagement.ts` (estado `page`, `goToPage`), `src/views/EnclosuresView.tsx` (cuadrícula de tarjetas, `PaginationBar`), `src/components/PaginationBar.tsx` (solo si T-01 lo exige; sin romper dashboard-011).
  - Test: `enclosure-actions-global-search.test.tsx` → `describe("CA-07")` (páginas con `aria-current`) y `describe("CA-10")` (lista vacía conserva el estado; error de carga con botón de reintento).
  - Hecho cuando: ambos `describe` pasan y la suite de dashboard-011 sigue en verde.

- [x] **T-04** (CA-08): diseño adaptable.
  - Evidencia (2026-11-18): reglas 3/2/1 columnas (>1024, ≤1024, ≤640) al final de styles.css; describe CA-08 pasa. Revisión manual pendiente en T-24.
  - Depende de: T-03.
  - Archivos: `src/styles.css` (cuadrícula de 3 columnas en > 1024 px, 2 en ≤ 1024 px, 1 en ≤ 640 px; solo tokens).
  - Test: `enclosure-actions-global-search.test.tsx` → `describe("CA-08")` lee `styles.css` y comprueba las reglas por ancho.
  - Hecho cuando: el test pasa. La revisión manual en 360, 768 y 1366 px queda en T-24.

- [x] **T-05** (CA-09, parte de crear): recálculo de página.
  - Evidencia (2026-11-18): `pageAfterCreate`/`pageAfterDelete`; describe CA-09 cubre crear, eliminar y que desactivar no cambia la página. apps/dashboard: npm test 56 archivos / 498 pruebas pasan; npm run types sin errores; npm run build correcto. 
  - Depende de: T-03.
  - Archivos: `src/viewmodels/enclosures-management.ts` (`pageAfterCreate`), `useEnclosuresManagement.ts`.
  - Test: `describe("CA-09")` en `enclosure-actions-global-search.test.tsx`: crear muestra la página del recinto nuevo; desactivar o activar no cambia la página.
  - Hecho cuando: el test pasa. La parte de eliminar queda en T-15.

- [x] **T-06** (CA-11): crear y renombrar sin cambios de comportamiento.
  - Evidencia (2026-11-18): describe CA-11 pasa. apps/dashboard: npm test 55 archivos / 471 pruebas pasan (línea base previa: 54 / 465); npm run types sin errores. 
  - Depende de: T-03.
  - Test: `describe("CA-11")`: nombre repetido muestra el mensaje de la API.
  - Hecho cuando: el test pasa y el comportamiento de dashboard-003 se mantiene.

- [x] **T-07** (CA-12; RN-04): sustitución del campo del encabezado.
  - Evidencia (2026-11-18): GlobalSearch.tsx (combobox) en App.tsx sin «(demostración)»; describe CA-12 en global-search-navigation.test.tsx. apps/dashboard: npm test 56 archivos / 498 pruebas pasan; npm run types sin errores; npm run build correcto. 
  - Depende de: nada del bloque B.
  - Archivos: `src/components/GlobalSearch.tsx` (nuevo; `.search-box`; etiqueta «Buscar en el panel»; `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`), `src/App.tsx` (sustituye el campo de las líneas ~287-296).
  - Test: `src/tests/global-search-navigation.test.tsx` → `describe("CA-12 enclosure-actions-global-search")`: sin «(demostración)»; atributos del combobox; `.search-box` presente. `administration-quality.test.tsx` sigue en verde.
  - Hecho cuando: el test pasa.

- [x] **T-08** (CA-13, CA-14; RN-06): espera, mínimo, estados y respuesta antigua.
  - Evidencia (2026-11-18): global-search.ts (controlador con 300 ms, mínimo 2, respuesta vieja descartada) y useGlobalSearch.ts; describe CA-13 y CA-14. apps/dashboard: npm test 56 archivos / 498 pruebas pasan; npm run types sin errores; npm run build correcto. 
  - Depende de: T-07. Requiere `admin.search` de api-019 (bloque A, T-03 de api-019).
  - Archivos: `src/viewmodels/global-search.ts` (`GLOBAL_SEARCH_MIN = 2`, `DEBOUNCE_MS = 300`, `searchHint`), `src/viewmodels/useGlobalSearch.ts` (estados `idle`, `loading`, `ready`, `empty`, `error`; contador de peticiones; llamada única a `api.admin.search(q)`).
  - Test: `global-search-navigation.test.tsx` → `describe("CA-13")` (menos de 2 caracteres sin llamada; 300 ms; una sola llamada; respuesta antigua descartada) y `describe("CA-14")` (textos de «Buscando…», vacío y error).
  - Hecho cuando: los dos `describe` pasan con cliente simulado.

- [x] **T-09** (CA-15, CA-25; RN-01): orden de grupos y permisos de la navegación.
  - Evidencia (2026-11-18): `orderSearchGroups`; describe CA-15 y CA-25.
  - Depende de: T-08.
  - Archivos: `src/viewmodels/global-search.ts` (`orderSearchGroups(groups, currentSection, allowedSections)`).
  - Test: `global-search-navigation.test.tsx` → `describe("CA-15")` (sección actual primero con «En esta sección»; «En <Sección>»; «Secciones» al final; sin grupo vacío) y `describe("CA-25")` (se pintan los grupos recibidos; coincidencias de sección solo para `getNavigationForProfile`).
  - Hecho cuando: los dos `describe` pasan.

- [x] **T-10** (CA-16, CA-17; RN-10): teclado y resaltado.
  - Evidencia (2026-11-18): `nextActiveIndex`, `highlightSegments`; describe CA-16 y CA-17.
  - Depende de: T-09.
  - Archivos: `src/viewmodels/global-search.ts` (`nextActiveIndex(current, key, count)`, `highlightSegments(text, term)`), `GlobalSearch.tsx` (nombre accesible con la sección; `<mark>` con nodos de React).
  - Test: `global-search-navigation.test.tsx` → `describe("CA-16")` (↑, ↓, límites, Enter, Esc, Tab) y `describe("CA-17")` (sin `innerHTML`; `<mark>` por nodos).
  - Hecho cuando: los dos `describe` pasan.

- [x] **T-11** (CA-18, CA-19; RN-07): decisión de navegación.
  - Evidencia (2026-11-18): focus-target.ts (`resolveFocusAction`, `tabForKind`); App.tsx con focusTarget; describe CA-18 y CA-19.
  - Depende de: T-09.
  - Archivos: `src/viewmodels/focus-target.ts` (nuevo: tipo `FocusTarget` con `section`, `id`, `kind?`, `query?`, `nonce`; `resolveFocusAction(currentSection, target)` → `navigate` | `locate-only`; mapa de `kind` a pestaña), `src/App.tsx` (extiende `setSection` y el deep link de las líneas ~65-75 con `focusTarget`).
  - Test: `global-search-navigation.test.tsx` → `describe("CA-18")` (otra sección → `navigate`; `published-species` → «Publicadas»; `species-request` → «Solicitudes») y `describe("CA-19")` (misma sección → `locate-only`, sin nueva petición de lista).
  - Hecho cuando: los dos `describe` pasan.

- [x] **T-12** (CA-20, CA-24): página correcta y elemento que ya no existe.
  - Evidencia (2026-11-18): `pageOfEnclosure`, `pageOfEvent` y `locateElement` (recarga una vez y avisa); describe CA-20 y CA-24. Limitación: en listas paginadas por el servidor (Usuarios, Momentos, TulanPedia, Historial) solo se ubica lo que está en la página cargada; si no, aparece «Ese elemento ya no está disponible.».
  - Depende de: T-11, T-02.
  - Archivos: `src/viewmodels/focus-target.ts` (página del id con `pageOfEnclosure` y equivalente de eventos de dashboard-011), `src/viewmodels/useGlobalSearch.ts` o `useLocateHit.ts` (recarga y mensaje cuando no existe).
  - Test: `global-search-navigation.test.tsx` → `describe("CA-20")` (recinto o evento en otra página → página correcta antes de ubicar) y `describe("CA-24")` (elemento ausente → recarga y «Ese elemento ya no está disponible.»; nada más cambia).
  - Hecho cuando: los dos `describe` pasan.

- [x] **T-13** (CA-21; RN-07): historial de boletos por folio.
  - Evidencia (2026-11-18): `effectiveHistoryQuery` + useTicketHistory(focus); el formulario no cambia; describe CA-21; ticket-history.test.tsx en verde.
  - Depende de: T-11, T-01 (nombres de vista y ViewModel del historial).
  - Archivos: vista y ViewModel del historial de boletos (solo para recibir `focusTarget.query`; los filtros del formulario no cambian).
  - Test: `global-search-navigation.test.tsx` → `describe("CA-21")`: los valores y el estado de los filtros son los mismos antes y después de cargar el folio.
  - Hecho cuando: el test pasa y `ticket-history.test.tsx` sigue en verde.

- [x] **T-14** (CA-22, CA-23; RN-10): ubicación visual y aviso.
  - Evidencia (2026-11-18): useLocateHit.ts, SearchHitBanner.tsx, `.search-hit` con prefers-reduced-motion; describe CA-22 y CA-23.
  - Depende de: T-12.
  - Archivos: `src/viewmodels/useLocateHit.ts` (nuevo; `scrollIntoView({block: "center", behavior: "smooth"})`; clase `.search-hit` durante 4 s o hasta el siguiente clic; aviso `aria-live="polite"` «Mostrando «X» en <Sección>»), `src/components/SearchHitBanner.tsx` (nuevo; etiqueta «Resultado de tu búsqueda: «texto»» con botón ✕, `aria-label` «Quitar resaltado»), `src/styles.css` (`.search-hit` con token de acento; `prefers-reduced-motion` sin pulso).
  - Test: `global-search-navigation.test.tsx` → `describe("CA-22")` (clase, duración, etiqueta, reglas de movimiento reducido en CSS) y `describe("CA-23")` (texto exacto del aviso).
  - Hecho cuando: los dos `describe` pasan.

- [x] **T-15** (CA-27): estilo del buscador. *(El borrado de la parte de eliminar de CA-09 queda en T-21.)*
  - Evidencia (2026-11-18): bloque CSS de dashboard-012 con tokens; describe CA-27; administration-quality.test.tsx en verde.
  - Depende de: T-07.
  - Archivos: `src/styles.css` (`.search-box` al 100 % en ≤ 640 px; solo tokens).
  - Test: `global-search-navigation.test.tsx` → `describe("CA-27")` (lee `styles.css`; sin colores fijos) y `administration-quality.test.tsx:247` (ya existente).
  - Hecho cuando: los tests pasan.

## Bloque B. Acciones de recintos (condicionado a api-019 B; DBR-020 ya está «Lista para backend» desde 2026-11-18)

- [x] **T-16** (CA-05): cliente y ViewModel de estado y eliminación.
  - Evidencia (2026-11-18): `setEnclosureStatus`/`deleteEnclosure` con runOperation y cliente simulado; describe CA-05.
  - Depende de: api-019 T-25 (cliente de recintos). DBR-020 «Lista para backend» cumplida (2026-11-18).
  - Archivos: `packages/api-client/admin.ts` y `admin-types.ts` (si api-019 T-25 no lo hizo), `src/viewmodels/enclosures-management.ts` (diálogos `{kind: "status"}` y `{kind: "delete"}`; `runOperation`), `src/viewmodels/useEnclosuresManagement.ts` (`toggleStatus`, `remove`).
  - Test: `enclosure-actions-global-search.test.tsx` → `describe("CA-05")` con cliente simulado: `setStatus` y `remove` solo al confirmar; lectura estática de que no hay `fetch` ni `axios` en `components/` ni `views/`.
  - Hecho cuando: el test pasa.

- [x] **T-17** (CA-01): insignia y botones.
  - Evidencia (2026-11-18): EnclosuresView con insignia, Desactivar/Activar y Eliminar con aria-label y `canManage`; describe CA-01.
  - Depende de: T-16.
  - Archivos: `src/views/EnclosuresView.tsx` (insignia «Activo»/«Inactivo» como texto; «Desactivar»/«Activar»; «Eliminar»; `aria-label` con el nombre del recinto; sin botones sin `enclosures.manage`).
  - Test: `describe("CA-01")` en `enclosure-actions-global-search.test.tsx`.
  - Hecho cuando: el test pasa.

- [x] **T-18** (CA-02; RN-02, RN-03): confirmar desactivar.
  - Evidencia (2026-11-18): `getEnclosureConfirmation`/`enclosureAnimalsWarning`; describe CA-02.
  - Depende de: T-17.
  - Archivos: `src/viewmodels/enclosures-management.ts` (texto con la función de D-6), `src/views/EnclosuresView.tsx` (`ConfirmDialog`).
  - Test: `describe("CA-02")`: texto exacto; línea de aviso con N = 0, 1 y 3; cancelar no cambia nada y devuelve el foco al botón.
  - Hecho cuando: el test pasa.

- [x] **T-19** (CA-03; RN-02): confirmar eliminar.
  - Evidencia (2026-11-18): describe CA-03.
  - Depende de: T-18.
  - Test: `describe("CA-03")`: variante `danger`; texto exacto; misma línea de aviso; cancelar no llama a la API.
  - Hecho cuando: el test pasa.

- [x] **T-20** (CA-04; RN-03): activar sin confirmación.
  - Evidencia (2026-11-18): describe CA-04.
  - Depende de: T-16.
  - Test: `describe("CA-04")`: activar llama a `setStatus(id, true)` sin diálogo y muestra «Recinto activado.».
  - Hecho cuando: el test pasa.

- [x] **T-21** (CA-06, CA-09 parte de eliminar): errores y ajuste de página.
  - Evidencia (2026-11-18): describe CA-06 (404 y 403 con recarga) y CA-09 (eliminar).
  - Depende de: T-16, T-05.
  - Archivos: `src/viewmodels/useEnclosuresManagement.ts` (mensaje de la API; recarga de la lista), `enclosures-management.ts` (`pageAfterDelete`: si la página queda vacía, retrocede una).
  - Test: `describe("CA-06")` (404 «Recinto no encontrado.»; 403 «No tienes permiso para realizar esta acción.»; la lista se recarga y conserva el estado real) y `describe("CA-09")` (eliminar el último de la página muestra la anterior).
  - Hecho cuando: los `describe` pasan.

- [x] **T-22** (CA-28): cobertura.
  - Evidencia (2026-11-18): administration-coverage.test.tsx: describe CA-28 verifica CA-01 a CA-27.
  - Depende de: T-02 a T-21.
  - Archivos: `src/tests/administration-coverage.test.tsx` (registrar la spec 012).
  - Test: `administration-coverage.test.tsx` comprueba que hay al menos un `describe("CA-xx enclosure-actions-global-search")` por CA-01 a CA-27.
  - Hecho cuando: el test de cobertura pasa.

## Calidad y entrega

- [x] **T-23** (CA-01 a CA-27): verificación de la app.
  - Evidencia (2026-11-18): apps/dashboard: npm test 56 archivos / 498 pruebas pasan; npm run types sin errores; npm run build correcto. dashboard-003, dashboard-011 y ticket-history siguen en verde.
  - Depende de: T-22.
  - Pasos: `npm run types`, `npm test` y `npm run build` en `apps/dashboard`. Confirmar que los tests de dashboard-003, dashboard-011 y ticket-history siguen en verde.
  - Hecho cuando: la salida queda registrada en el PR.

- [ ] **T-24** (CA-08, CA-16, CA-22): revisión manual.
  - Depende de: T-23 y api-019 B (para probar acciones) o un servidor de pruebas con datos simulados.
  - Pasos: anchos de 360, 768 y 1366 px sin desbordamiento horizontal; teclado en el combobox (↑, ↓, Enter, Esc, Tab); resaltado con y sin `prefers-reduced-motion`. Sin datos reales ni modificaciones en producción.
  - Test que lo cubre: revisión manual (no automatizable aquí). CA-08, CA-16 y CA-22 quedan con evidencia manual.
  - Hecho cuando: cada punto tiene resultado registrado (aprobado, fallido o no aplicable) en el PR.

- [ ] **T-25**: documentación y enlaces.
  - Depende de: T-23.
  - Archivos: manual del dashboard en `apps/dashboard/docs/` si existe (actualizar la sección de Recintos y del buscador). El PR enlaza spec, plan y tasks.
  - Test: ninguno (documental). Enlaza CA-28 (cobertura).
  - Hecho cuando: el PR tiene los tres artefactos enlazados y la evidencia de T-23 y T-24.

- [ ] **T-26**: commit local.
  - Depende de: T-25.
  - Pasos: commit local que cite `dashboard-012`. Jonathan hace el commit final y el push.
  - Hecho cuando: el commit local existe con el identificador.

## Orden de ejecución

1. Aprobación del plan y de las tasks. Decisión 8 del plan aceptada (2026-11-18).
2. Bloque A (T-01 a T-15), con api-019 bloque A disponible para T-08.
3. Bloque B (T-16 a T-22), cuando api-019 B esté implementado (DBR-020 ya está «Lista para backend»).
4. T-23 a T-26.

## Enmienda 2026-11-18 (b), aprobada por Jonathan · Bloque C. Buscador tolerante y acciones

Reglas: T-27 a T-37 y T-39 hechas con evidencia; T-38 (revisión manual) y T-40 (PR y commit) quedan pendientes; se marcan solo con evidencia (salida de `npm run types`, `npm test` y `npm run build` en `apps/dashboard`). Sin `fetch` ni `axios` en `components/` ni en `views/`. Cada `describe` cita `CA-NN enclosure-actions-global-search`. Las tareas que llaman a la API necesitan `api-019` enmienda (b) (T-35, T-40, T-45).

- [x] **T-27** (CA-30, CA-31, CA-41): regla de tolerancia y resaltado.
  - Evidencia (2026-11-18): `search-tolerance.ts` (regla de api-019 CA-36 a CA-40, resaltado tokenizado) y `highlightSegments` delega en ella; `global-search-tolerance.test.tsx`: describe CA-30, CA-31 (tabla de la API) y CA-41.
  - Depende de: aprobación de la enmienda.
  - Archivos: `src/viewmodels/search-tolerance.ts` (nuevo: normalización, niveles y umbrales de api-019 CA-36 a CA-40), `src/viewmodels/global-search.ts` (`highlightSegments` usa la regla tolerante).
  - Test: `src/tests/global-search-tolerance.test.tsx` → `describe("CA-30 ...")`, `describe("CA-31 ...")` (tabla de casos de la API) y `describe("CA-41 ...")`.
  - Hecho cuando: los tres `describe` pasan.

- [x] **T-28** (CA-29): línea `match` en el resultado.
  - Evidencia (2026-11-18): Línea `match` con `<mark>` por nodos en `GlobalSearch.tsx`, `.global-search__match` en `styles.css`; tipo `match` ya presente en api-client; describe CA-29.
  - Depende de: T-27; api-019 T-35 y T-45 para datos reales (con datos simulados se puede avanzar).
  - Archivos: `src/components/GlobalSearch.tsx` (línea «<match.field>: <snippet>» con `<mark>` por nodos de React), `src/styles.css` (`.global-search__match` con tokens).
  - Test: `global-search-tolerance.test.tsx` → `describe("CA-29 ...")`.
  - Hecho cuando: el test pasa y no hay `innerHTML`.

- [x] **T-29** (CA-32, CA-33): catálogo de acciones.
  - Evidencia (2026-11-18): `search-actions.ts` con 28 entradas (más evidencia de vista por entrada) y `visibleSearchActions`; `global-search-actions.test.tsx` describe CA-32 y CA-33. Sin entrada «QR»; «qr»/«código qr» son sinónimos de «Nueva venta» (decisión de la sesión principal, ver plan D-28).
  - Depende de: nada del bloque B.
  - Archivos: `src/viewmodels/search-actions.ts` (nuevo: entradas de la tabla de la spec, sinónimos, `permission`, `opens`, `tab`; filtro por `profile.permissions`).
  - Test: `src/tests/global-search-actions.test.tsx` → `describe("CA-32 ...")` (lectura estática: cada etiqueta aparece en la vista indicada) y `describe("CA-33 ...")`.
  - Hecho cuando: el test pasa; ninguna entrada corresponde a «QR».

- [x] **T-30** (CA-34): grupo «Acciones».
  - Evidencia (2026-11-18): `orderSearchGroups` con opciones `{actions, pairing}` y `ACTIONS_HEADING`; describe CA-34; CA-15 sin cambios de expectativa (sigue en verde).
  - Depende de: T-29.
  - Archivos: `src/viewmodels/global-search.ts` (`orderSearchGroups` añade «Acciones» entre la API y «Secciones»).
  - Test: `global-search-actions.test.tsx` → `describe("CA-34 ...")`; actualizar `global-search-navigation.test.tsx` → `describe("CA-15 ...")` si cambia la expectativa de orden.
  - Hecho cuando: los dos `describe` pasan.

- [x] **T-31** (CA-35): consulta combinada.
  - Evidencia (2026-11-18): `splitSearchQuery`/`pairedAction`; el controlador acepta `resolveQuery` (consulta enviada o `null`); `useGlobalSearch` pasa las acciones visibles y `highlightTerm`; `GlobalSearch` muestra «Ir a: <acción>»; describe CA-35; CA-13 sin cambios de expectativa.
  - Depende de: T-29, T-30.
  - Archivos: `src/viewmodels/search-query.ts` (nuevo: `splitSearchQuery`; reglas de D-16 y D-17), `src/viewmodels/useGlobalSearch.ts` (llamada con el resto o con la consulta completa; sin llamada con menos de 2 caracteres), `src/components/GlobalSearch.tsx` («Ir a: <acción>»).
  - Test: `global-search-actions.test.tsx` → `describe("CA-35 ...")`; actualizar `global-search-navigation.test.tsx` → `describe("CA-13 ...")` si la llamada cambia.
  - Hecho cuando: «contraseña juan» llama a la API con «juan» y el elemento muestra «Ir a: Restablecer contraseña».

- [x] **T-32** (CA-36, CA-37): decisión de foco con acción.
  - Evidencia (2026-11-18): `FocusDialogAction`, `FocusTarget.action` y `resolveSelection` en `focus-target.ts`; `App.tsx` lo usa (acción sola: sección y pestaña vía `tabRequest`); `global-search-focus-actions.test.tsx` describe CA-36 y CA-37.
  - Depende de: T-31.
  - Archivos: `src/viewmodels/focus-target.ts` (`action?`, `tab?`), `src/App.tsx` (pasa la acción solo a la sección del resultado; `tab` a TulanPedia).
  - Test: `src/tests/global-search-focus-actions.test.tsx` → `describe("CA-36 ...")` y `describe("CA-37 ...")` (con cliente simulado: ninguna llamada de cambio al elegir).
  - Hecho cuando: los dos `describe` pasan.

- [x] **T-33** (CA-38): vistas que abren la acción.
  - Evidencia (2026-11-18): `pendingActionForFocus` + `useStaffAccounts(focus)`, `enclosureDialogForFocus` + `useEnclosuresManagement`, `cancelTargetForFocus` + `useTicketHistory`; `UsersSection` acepta `focus`; `data-search-id="users:<id>"` (ya existía en `DataTable`); describe CA-38. Los efectos solo despachan la apertura del diálogo.
  - Depende de: T-32.
  - Archivos: `src/sections/UsersSection.tsx`, `src/views/UsersView.tsx` (`focus` con `action`; `data-search-id="users:<id>"`; `actions.openAction`), `src/sections/EnclosuresSection.tsx`, `src/views/EnclosuresView.tsx`, `src/viewmodels/useEnclosuresManagement.ts` (abre `status` o `delete` sin ejecutar), `src/views/TicketHistoryView.tsx`, `src/viewmodels/useTicketHistory.ts` (abre `openCancel` para la fila localizada).
  - Test: `global-search-focus-actions.test.tsx` → `describe("CA-38 ...")`; `dashboard-003` y `ticket-history.test.tsx` deben seguir en verde.
  - Hecho cuando: el test pasa y las pruebas existentes de Usuarios, Recintos e Historial siguen en verde.

- [x] **T-34** (CA-39): límite de peticiones en la interfaz.
  - Evidencia (2026-11-18): `GlobalSearchSnapshot.errorMessage` y `rateLimitMessage` (usa `ApiError.status === 429` y su mensaje; sin cambios en api-client); sin reintento; describe CA-39 en `global-search-limits.test.tsx`.
  - Depende de: T-31; api-019 T-40 (límite 429) y pregunta 5 de la API confirmada. Verificar antes cómo `packages/api-client` expone el estado HTTP (D-24).
  - Archivos: `src/viewmodels/useGlobalSearch.ts` (mensaje de la API para 429), `packages/api-client` (solo si hace falta exponer el estado; sin lógica).
  - Test: `src/tests/global-search-limits.test.tsx` → `describe("CA-39 ...")`.
  - Hecho cuando: el test pasa con cliente simulado que responde 429.

- [x] **T-35** (CA-40): sin persistencia de términos.
  - Evidencia (2026-11-18): Lectura estática de los archivos del buscador; describe CA-40.
  - Depende de: T-31.
  - Test: `global-search-limits.test.tsx` → `describe("CA-40 ...")` (lectura estática: sin `localStorage`, `sessionStorage` ni `history` con el término).
  - Hecho cuando: el test pasa.

- [x] **T-36** (CA-28): cobertura.
  - Evidencia (2026-11-18): `administration-coverage.test.tsx`: describe CA-28 comprueba CA-01 a CA-41.
  - Depende de: T-27 a T-35.
  - Archivos: `src/tests/administration-coverage.test.tsx` (CA-01 a CA-41).
  - Hecho cuando: el test de cobertura pasa.

- [x] **T-37** (CA-01 a CA-41): verificación de la app.
  - Evidencia (2026-11-18): apps/dashboard (2026-11-18): npm test 60 archivos / 543 pruebas pasan; npm run types sin errores; npm run build correcto.
  - Depende de: T-36.
  - Pasos: `npm run types`, `npm test` y `npm run build` en `apps/dashboard`. Confirmar que `dashboard-003`, `dashboard-011` y `ticket-history` siguen en verde.
  - Hecho cuando: la salida queda registrada en el PR.

- [ ] **T-38** (CA-29, CA-30, CA-35, CA-36 a CA-38): revisión manual.
  - Depende de: T-37 y api-019 T-46 (datos reales) o servidor de pruebas con datos simulados.
  - Pasos: teclado en el combobox con resultados de API y acciones; resaltado con tolerancia; línea `match`; acción con diálogo sin ejecución; sin desbordamiento. Sin datos reales ni producción.
  - Hecho cuando: cada punto tiene resultado registrado (aprobado, fallido o no aplicable) en el PR.

- [x] **T-39**: documentación local.
  - Evidencia (2026-11-18): `apps/dashboard/docs/manual-demo.md` y `apps/dashboard/docs/arquitectura.md` actualizados (buscador real, acciones, «QR» → Nueva venta).
  - Depende de: T-37.
  - Archivos: `apps/dashboard/docs/` (solo si existe; actualizar la sección del buscador y el catálogo de acciones).
  - Hecho cuando: la referencia coincide con el catálogo de la spec.

- [ ] **T-40**: enlaces del PR y commit.
  - Depende de: T-37, T-38.
  - Pasos: el PR enlaza spec, plan y tasks, y cita la enmienda (b) de `api-019`. Jonathan hace el commit final y el push.
  - Hecho cuando: el PR tiene los tres artefactos enlazados y la evidencia de T-37 y T-38.

## Enmienda 2026-11-18 (d), aprobada por Jonathan · Bloque D. Relevancia y orden

- [x] **T-41** (CA-42): orden de grupos por `best_score`.
  - Evidencia (2026-11-18): `orderSearchGroups` en `global-search.ts`; describe CA-42.
  - Archivos: `src/viewmodels/global-search.ts`, `src/tests/global-search-tolerance.test.tsx`.
  - Hecho cuando: sección actual, grupos por `best_score` (empate: navegación), «Acciones», «Secciones».
- [x] **T-42** (CA-43): paridad de relevancia y coincidencia parcial ceil(n/2).
  - Evidencia (2026-11-18): `search-tolerance.ts` (`relevanceOf`, `compareRelevance`, `requiredWordCount`), `search-actions.ts` (`rankActions`); describe CA-43.
  - Archivos: `src/viewmodels/search-tolerance.ts`, `src/viewmodels/search-actions.ts`, `src/viewmodels/global-search.ts`, `src/tests/global-search-tolerance.test.tsx`.
  - Hecho cuando: «Acciones» (basta una palabra; «borrar usuario» muestra «Eliminar cuenta») y «Secciones» se ordenan por relevancia y la tabla de CA-31 sigue igual.
- [x] **T-43** (CA-44, CA-28): resaltado de todas las palabras y cobertura.
  - Evidencia (2026-11-18): describe CA-44; `administration-coverage.test.tsx` comprueba CA-01 a CA-44. apps/dashboard: npm test 60 archivos / 554 pruebas; npm run types y npm run build correctos.
  - Archivos: `src/tests/global-search-tolerance.test.tsx`, `src/tests/administration-coverage.test.tsx`.
  - Hecho cuando: los tres comandos pasan.
