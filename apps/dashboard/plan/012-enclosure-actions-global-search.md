# Plan técnico · 012 · enclosure-actions-global-search

## Enmienda técnica · Ver animales del recinto

- Estado de la enmienda: **Aprobado** en la conversación, 2026-11-24.
- Dependencia: enmienda de lectura administrativa en `api-019` CA-55 y CA-56. `@arca/api-client` expondrá `admin.enclosures.listAnimals(id)` con un DTO limitado a identificación.
- `EnclosuresView` muestra «Ver animales» en cada tarjeta con `enclosures.manage`. Reutiliza `Dialog` y el patrón de carga y reintento. El título incluye el nombre del recinto. Se muestran el nombre y la especie con «Sin nombre» o «Especie no disponible» cuando corresponda. El foco vuelve al botón al cerrar y el estado de filtros y paginación se conserva.
- El ViewModel abre un detalle de solo lectura, consulta a demanda por identificador y descarta resultados de solicitudes anteriores al cerrar o cambiar de recinto. Una respuesta vacía tiene un mensaje propio. El error permite repetir la consulta del recinto abierto. El detalle no se guarda en persistencia ni funciona offline.

| Criterio | Prueba en `apps/dashboard/src/tests/` |
|---|---|
| CA-49 | Verifica el botón según permiso, el identificador pedido y el listado de nombre y especie para el recinto seleccionado. |
| CA-50 | Verifica carga, vacío, error, reintento, descarte de respuesta obsoleta y conservación de filtros y página. |

| Principio | Evidencia prevista |
|---|---|
| I | `@arca/ui`, React y cliente existentes, sin dependencias nuevas. |
| II | Enmienda funcional aprobada. Plan y checklist antes del código. |
| III | View declarativa y consulta en ViewModel vía `@arca/api-client`. |
| IV | CA-49 y CA-50 mapeados a Vitest. |
| V | API como fuente del detalle, sin persistencia local. |
| VI | Identificadores en inglés, UI y documentación en español. |

Secuencia tras aprobación técnica: checklist, implementación coordinada con `api-019`, pruebas y `verify`.

## Enmienda técnica · Filtros del listado de Recintos

- Spec: enmienda aprobada por la persona solicitante el 2026-11-24.
- Estado de la enmienda del plan: **Aprobado**. La persona solicitante aprobó el plan y autorizó su implementación en la conversación el 2026-11-24.

### Diseño y contrato

- `EnclosuresView.tsx` presenta un campo de nombre, selectores de estado, animales y QR, y el botón «Limpiar filtros». Se reutilizan `Field`, `SelectField`, `Button` y `Pagination` de `@arca/ui`. Los controles se adaptan al ancho de la pantalla y conservan etiquetas visibles y navegación por teclado.
- `enclosures-management.ts` aplica los filtros al catálogo en el orden recibido. Reutiliza `hasActiveQr` y la normalización de texto existente cuando sea compatible con la búsqueda por nombre.
- `useEnclosuresManagement.ts` guarda los filtros de la sección, deriva el total y la página visible de las coincidencias, y reinicia la página al cambiar o limpiar filtros. Ante actualizaciones, conserva una página válida y enfoca un recinto nuevo si coincide. Ante un resultado nuevo de búsqueda global, conserva los filtros si incluyen el recinto y los limpia si lo ocultan. El enfoque global tiene precedencia sobre el ajuste de página de una actualización de lista.
- Se reutilizan `adminApi.enclosures.list()` y las operaciones vigentes. El filtro QR se habilita con la misma condición que permite mostrar la información de QR en la tarjeta. Los estados de carga, error y lista vacía se gestionan con los componentes actuales. La ausencia de coincidencias tiene un mensaje específico con opción de limpieza.
- Los filtros operan en memoria con los campos existentes de la respuesta. La API conserva permisos y reglas de negocio. No se requieren consultas adicionales, DBR, migraciones, sincronización offline, requisitos de servidor ni cambios de portabilidad MySQL. Se conserva el stack y las dependencias actuales.

### Pruebas de aceptación

| Criterio | Prueba prevista en `apps/dashboard/src/tests/` |
|---|---|
| CA-45 | Catálogo mixto de más de nueve recintos. Comprobar «Todos», «Activos» e «Inactivos» y coincidencias fuera de la página original. |
| CA-46 | Combinación de filtros, nombre con tildes y mayúsculas, y disponibilidad del selector de QR según permiso. |
| CA-47 | Reinicio al cambiar o limpiar, conservación del orden, total, nueve coincidencias por página y estado sin resultados. |
| CA-48 | Actualización de coincidencias tras modificar el catálogo, ajuste de página y navegación desde el buscador global con y sin filtros compatibles. |

### Constitution Check

| Principio | Evidencia prevista |
|---|---|
| I | Dependencias existentes de React, TypeScript y `@arca/ui`. |
| II | Enmienda funcional aprobada. La implementación depende de la aprobación de esta enmienda técnica y su checklist. |
| III | View declarativa, estado y filtrado en ViewModel, operaciones de negocio mediante `@arca/api-client`. |
| IV | CA-45 a CA-48 mapeados a pruebas de Vitest. |
| V | Filtrado de los campos ya recibidos de la API, sin persistencia adicional. |
| VI | Identificadores en inglés y etiquetas, mensajes y documentación en español. |

Tras la aprobación técnica se detallarán las tareas, se implementarán ViewModel y View, se añadirán las pruebas y se ejecutará `verify` para el dashboard. La revisión técnica debe confirmar la precedencia del enfoque global y la actualización del total al cambiar un filtro o una tarjeta.

## Plan original

- Spec: `apps/dashboard/specs/012-enclosure-actions-global-search.md` (Aprobada)
- Estado del plan: **Aprobado**. Autoriza la implementación según sus tasks.
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18
- Tasks: `apps/dashboard/tasks/012-enclosure-actions-global-search.md` (Borrador, mismo NNN-slug).
- Responsable técnico: por confirmar (frontend). Aprobador funcional de la spec: responsable funcional.
- Dependencias: `api-019` (spec Aprobada; plan y tasks en Borrador). Bloque A necesita `admin.search` (api-019 bloque A). Bloque B necesita `enclosures.setStatus` y `enclosures.remove` (api-019 bloque B) y DBR-020 «Lista para backend». `dashboard-003` (CA-09 enmendado en esta spec), `dashboard-011` (paginación de eventos y `PaginationBar`).
- Sin dependencias npm nuevas. Sin ADR nuevo.

## Bloques

- **Bloque A (no necesita DBR-020):** buscador universal (CA-12 a CA-27) y cuadrícula de recintos de 9 por página (CA-07, CA-08, CA-10, CA-11). CA-09 queda parcial: el recálculo tras crear sí; tras eliminar, en el bloque B.
- **Bloque B (condicionado a api-019 B; DBR-020 «Lista para backend»):** insignia y botones Activo/Inactivo, Desactivar, Activar y Eliminar con confirmación (CA-01 a CA-06), y el recálculo de página tras eliminar (CA-09).

Las interacciones del buscador se prueban con funciones puras y hooks con cliente simulado. El entorno de pruebas es `node` con `renderToStaticMarkup`, como en el resto del dashboard.

## Diseño de solución

Recintos (MVVM; la View solo presenta):

```text
EnclosuresView (presenta)
  → useEnclosuresManagement (hook, ViewModel)
      → enclosures-management.ts (funciones puras: página, textos de aviso, diálogos)
      → api.admin.enclosures.{list, create, rename, setStatus, remove} (@arca/api-client)
```

Buscador:

```text
App.tsx
  → GlobalSearch (View: combobox)
      → useGlobalSearch (ViewModel: espera 300 ms, petición, estados, teclado)
          → global-search.ts (funciones puras: orden de grupos, índice activo, resaltado)
          → api.admin.search(q)
  → al elegir un resultado: focusTarget { section, id, kind?, query?, nonce }
      → focus-target.ts (decide navegar o solo ubicar)
      → useLocateHit (ViewModel: scrollIntoView, clase .search-hit, aviso aria-live)
```

## Decisiones de este plan

| # | Decisión | Motivo |
|---|---|---|
| D-1 | Sin `fetch` ni `axios` en `components/` ni en `views/`. Todo pasa por hooks y `@arca/api-client`. | RN-04 de la spec y `apps/dashboard/AGENTS.md`. |
| D-2 | Funciones puras en `viewmodels/*.ts` (página, orden de grupos, índice activo, resaltado, decisión de navegación). Sin lógica de negocio. | Testables con `node` y sin DOM. Orden y página son presentación (RN-01 y RN-05). |
| D-3 | La paginación de recintos es en cliente: `enclosurePage(items, page, 9)`. La API no cambia. | RN-05 de la spec. |
| D-4 | Reutilizar `components/PaginationBar.tsx` (usado por `EventsView`). Si no expone `aria-current` ni los textos «Página X de Y», se amplía sin romper sus pruebas de dashboard-011. | CA-07 y `dashboard-011`. |
| D-5 | Confirmación con `components/ConfirmDialog.tsx`. Se verifica que admite variante de peligro (`danger`) y el foco de retorno. | CA-02, CA-03, CA-02 de la spec. |
| D-6 | Textos de aviso con función pura: N = 1 → «Tiene 1 animal asignado.»; N ≥ 2 → «Tiene N animales asignados.»; N = 0 → sin línea. | CA-02 y CA-03 de la spec. |
| D-7 | Búsqueda: `DEBOUNCE_MS = 300`, mínimo 2 caracteres, máximo 100 (límite de la API). Una respuesta antigua no sobrescribe a una más reciente (contador de peticiones en el hook). Sin historial ni persistencia. | CA-13 y RN-06. |
| D-8 | Orden de grupos: primero la sección actual («En esta sección»); después «En <Sección>»; las coincidencias con nombres de sección permitidas van en «Secciones», al final. Las secciones se toman de `getNavigationForProfile`. | CA-15 y CA-25. |
| D-9 | Resaltado con nodos de React (partes de texto y `<mark>`), nunca con `innerHTML`. | CA-17. |
| D-10 | Resultado de TulanPedia: `kind` `published-species` → pestaña «Publicadas»; `species-request` → «Solicitudes». Los ids de tab salen de `viewmodels/tulanpedia-tab.ts`. | CA-18 (decisión técnica pendiente de aprobación del responsable funcional, según la spec). |
| D-11 | Historial de boletos: el resultado se pasa como `focusTarget.query` y la vista de boletos lo usa como folio para la petición (`GET /api/v1/admin/tickets?folio=`), guardado aparte del formulario. Los filtros del formulario no cambian. | CA-21. Decisión aceptada. |
| D-12 | Ubicación visual: `scrollIntoView({block: "center", behavior: "smooth"})`; clase `.search-hit` durante 4 s o hasta el siguiente clic; con `prefers-reduced-motion` el contorno queda fijo sin pulso. Etiqueta flotante con ✕ (`aria-label` «Quitar resaltado»). | CA-22. |
| D-13 | Aviso `aria-live="polite"` «Mostrando «X» en <Sección>». | CA-23. |
| D-14 | Estilos solo con tokens semánticos, en `styles.css`. Sin colores fijos. | CA-27 y RN-08. |
| D-15 | Sin persistencia ni historial en el navegador. | Spec, «Datos, privacidad y auditoría». |

## Divergencias y correcciones frente a la spec o el diseño de referencia

- **Diseño de referencia:** `GET /api/admin/search`. La spec y api-019 usan `/api/v1/admin/search`; se sigue la spec.
- **Diseño de referencia:** el grupo de la sección actual aparece primero. La spec (CA-15) añade el grupo «Secciones» al final. Se sigue la spec.
- **Diseño de referencia:** `focusTarget {section, id, nonce}`. Se amplía con `kind` y `query` para TulanPedia (D-10) y boletos (D-11).

## Cambios por área

| Área | Archivos previstos | Propósito | Bloque |
|---|---|---|---|
| Encabezado | `src/App.tsx` | Sustituir el campo demostrativo (líneas ~287-296) por `GlobalSearch`; añadir `focusTarget` junto a `setSection` y al deep link (líneas ~65-75) | A |
| Buscador (View) | `src/components/GlobalSearch.tsx` (nuevo) | Combobox accesible; clase `.search-box`; etiqueta «Buscar en el panel» | A |
| Buscador (ViewModel) | `src/viewmodels/useGlobalSearch.ts` (nuevo) | Espera, petición, estados y teclado | A |
| Buscador (funciones) | `src/viewmodels/global-search.ts` (nuevo) | Orden de grupos, índice activo, resaltado, texto de ayuda | A |
| Navegación | `src/viewmodels/focus-target.ts` (nuevo) | Decisión «navegar» o «solo ubicar»; tipo `FocusTarget` | A |
| Ubicación | `src/viewmodels/useLocateHit.ts` (nuevo), `src/components/SearchHitBanner.tsx` (nuevo) | `scrollIntoView`, `.search-hit`, aviso, etiqueta con ✕ | A |
| Recintos (ViewModel) | `src/viewmodels/enclosures-management.ts`, `src/viewmodels/useEnclosuresManagement.ts` | Página, textos de aviso, diálogos de estado y de eliminación; `setEnclosureStatus`, `deleteEnclosure` con `runOperation` | A (página), B (acciones) |
| Recintos (View) | `src/views/EnclosuresView.tsx` | Cuadrícula de tarjetas, insignia, botones con nombre accesible, `PaginationBar` | A (cuadrícula), B (botones) |
| Paginación compartida | `src/components/PaginationBar.tsx` | Verificar `aria-current` y textos; ampliar sin romper dashboard-011 | A |
| Confirmación | `src/components/ConfirmDialog.tsx` | Verificar variante `danger` y foco de retorno | B |
| Historial de boletos | Vista y ViewModel de historial de boletos (nombres a confirmar en T-01) | Recibir `focusTarget.query` sin tocar los filtros | A |
| TulanPedia | `src/viewmodels/tulanpedia-tab.ts`, `src/viewmodels/useTulanpediaTab.ts` | Abrir la pestaña según `kind` | A |
| Paquete | `packages/api-client/admin.ts`, `packages/api-client/admin-types.ts` | `search` (A); `enclosures.setStatus` y `enclosures.remove`, `is_active` (B). Sin lógica | A y B |
| Estilos | `src/styles.css` | Cuadrícula 3/2/1 columnas, `.search-hit` con `prefers-reduced-motion`, `.search-box` al 100 % en ≤ 640 px | A |
| Pruebas | `src/tests/enclosure-actions-global-search.test.tsx` (nuevo), `src/tests/global-search-navigation.test.tsx` (nuevo), `src/tests/administration-coverage.test.tsx` (registrar spec 012) | Un `describe("CA-xx enclosure-actions-global-search")` por CA | A y B |

## Contrato consumido

- `api.admin.search(q)` → `{ groups: [{ section, label, items: [{ id, title, subtitle, kind? }] }] }`. Sin permisos en la UI: los grupos llegan ya filtrados (CA-25).
- `api.admin.enclosures.list()` (ya existe) → incluye `is_active` y `animals_count` (B).
- `api.admin.enclosures.setStatus(id, isActive)` → `PATCH .../status` (B).
- `api.admin.enclosures.remove(id)` → `DELETE` (B).
- Errores: 404 y 403 se muestran con el mensaje de la respuesta (CA-06). El panel no decide permisos (RN-01).

## Estados y flujo

- **Buscador:** `idle` (menos de 2 caracteres, con la ayuda «Escribe al menos 2 caracteres.») → `loading` (con «Buscando…» en `role="status"`) → `ready` | `empty` («No encontramos «texto» en el panel.») | `error` («No pudimos buscar. Inténtalo de nuevo.»).
- **Elegir resultado:** `resolveFocusAction(currentSection, target)`:
  - Otra sección → `navigate`: cambia de sección sin recargar, carga la lista y ubica.
  - Misma sección → `locate-only`: no vuelve a pedir la lista; ubica y marca.
  - Recintos o Eventos en otra página → salta a la página que contiene el id y después ubica.
  - Elemento que ya no existe → vuelve a cargar la lista; si no aparece, «Ese elemento ya no está disponible.» (CA-24).
- **Recintos:** la página se mantiene al desactivar o activar. Tras eliminar el último de la página, se muestra la anterior. Tras crear, la página se recalcula para mostrar el recinto nuevo.

## Seguridad y operación

- Sin datos nuevos. El buscador solo muestra lo que la API devuelve.
- Ocultar un botón no reemplaza la autorización del servidor: la API comprueba `enclosures.manage`.
- Sin persistencia en el navegador. Sin historial.
- Sin cambios de navegación ni de permisos del perfil.

## Pruebas (Vitest; entorno `node`, `renderToStaticMarkup`)

| CA | Prueba | Archivo |
|---|---|---|
| CA-01 | Insignia, botones y nombre accesible con `enclosures.manage`; ausentes sin el permiso | `enclosure-actions-global-search.test.tsx` |
| CA-02 | Texto del diálogo de desactivar; línea de aviso con N = 0, 1 y 3; sin llamada hasta confirmar | idem |
| CA-03 | Texto del diálogo de eliminar con variante `danger`; sin llamada al cancelar | idem |
| CA-04 | Activar reutiliza el diálogo de cambio de estado; confirmar llama a `setStatus(id, true)` y emite «Recinto activado.» | idem |
| CA-05 | El ViewModel llama a `setStatus` y `remove` del cliente simulado; sin `fetch` en `components/` ni `views/` (lectura estática) | idem |
| CA-06 | Errores 404 y 403 con su texto; la lista se recarga | idem |
| CA-07 | `enclosurePage` con 10 elementos: 9 y 1; «Página X de Y»; extremos deshabilitados; `aria-current` | idem |
| CA-08 | Reglas CSS de 3, 2 y 1 columnas en 1024 y 640 px (lectura de `styles.css`); revisión manual en 360, 768 y 1366 px | idem |
| CA-09 | Página anterior tras eliminar el último; recálculo tras crear; sin cambio de página al desactivar | idem |
| CA-10 | Estado vacío se conserva; error de carga con reintento | idem |
| CA-11 | Crear y renombrar: nombre repetido muestra el error de la API | idem |
| CA-12 | Campo demostrativo sustituido; `.search-box`; `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant` | `global-search-navigation.test.tsx` |
| CA-13 | Menos de 2 caracteres: sin llamada y con ayuda; espera de 300 ms; respuesta antigua descartada | idem |
| CA-14 | «Buscando…» con `role="status"`; vacío; error | idem |
| CA-15 | `orderSearchGroups`: sección actual primero; «Secciones» al final; sin grupo vacío | idem |
| CA-16 | `nextActiveIndex` con ↑, ↓, límites; nombre accesible con la sección | idem |
| CA-17 | Resaltado con nodos de React; sin `innerHTML` (lectura estática) | idem |
| CA-18 | `resolveFocusAction` → `navigate`; `kind` → pestaña correcta | idem |
| CA-19 | Misma sección → `locate-only` y sin nueva petición de lista | idem |
| CA-20 | Recinto o evento en otra página → página correcta | idem |
| CA-21 | Historial de boletos: filtros antes y después sin cambios | idem |
| CA-22 | `.search-hit`; duración; `prefers-reduced-motion`; etiqueta con ✕ | idem |
| CA-23 | Aviso `aria-live="polite"` con el texto exacto | idem |
| CA-24 | Elemento inexistente → recarga y «Ese elemento ya no está disponible.» | idem |
| CA-25 | Se pintan los grupos recibidos; coincidencias de sección solo para secciones de `getNavigationForProfile` | idem |
| CA-26 | Pruebas existentes de Usuarios, Historial de boletos y Momentos siguen en verde | suite existente |
| CA-27 | `.search-box` al 100 % en ≤ 640 px; sin colores fijos (lectura de `styles.css`) | idem |
| CA-28 | Un `describe("CA-xx enclosure-actions-global-search")` por CA-01 a CA-27; registro en `administration-coverage.test.tsx` | `administration-coverage.test.tsx` |

`administration-quality.test.tsx:247` ya comprueba `.search-box` a 100 % en ≤ 640 px. Se conserva.

## Constitution Check

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | React 19, TypeScript, Vite y Tailwind existentes. Sin paquete nuevo |
| II. La spec manda | Sí, con condición | Spec 012 Aprobada. Plan y tasks en Borrador. Bloque B sin código hasta api-019 B |
| III. Lógica separada de la interfaz | Sí | La View solo presenta. Los ViewModels llaman al cliente. Las reglas de visibilidad, permisos y datos están en la API |
| IV. Un test por criterio | Sí, al implementar | Tabla de pruebas CA-01 a CA-27, con `describe` por criterio |
| V. Una sola fuente de verdad para los datos | Sí | El panel no guarda datos. Sin historial |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés; textos de UI en español |

## Riesgos y decisiones

- **Carrera entre búsqueda y lista:** CA-24 lo cubre.
- **Navegación del perfil:** si una sección no está en la navegación, su coincidencia no se muestra (CA-25).
- **PaginationBar:** si se amplía, dashboard-011 debe seguir en verde.
- **Historial de boletos:** el valor del folio se guarda aparte del formulario (D-11), según la decisión aceptada.
- **Accesibilidad del combobox:** la parte más delicada. Se prueba con funciones puras y con revisión manual con teclado.
- **Revisión manual pendiente:** CA-08 (360, 768 y 1366 px) y CA-16 (teclado) no son automatizables aquí; quedan como evidencia manual en la tarea de calidad.

## Decisiones aceptadas

8. **Historial de boletos por folio:** aceptado. La vista de historial recibe el folio del resultado (`focusTarget.query`) y lo pide con el filtro `folio` que ya existe en `GET /api/v1/admin/tickets`, sin cambiar los valores del formulario. Sin endpoint nuevo.

## Orden y aprobación

1. Aprobación técnica de este plan y de sus tasks. Decisión 8 aceptada.
2. Bloque A: depende de api-019 bloque A (`admin.search`). Puede empezar en paralelo a api-019 B.
3. Bloque B: condicionado a api-019 B. DBR-020 ya está «Lista para backend».
4. Aprobación de TulanPedia (CA-18): decisión técnica de la sesión principal, pendiente del responsable funcional (según la spec).

## Enmienda (b), aprobada

- Spec: «Enmienda (b)» en `apps/dashboard/specs/012-enclosure-actions-global-search.md` (CA-13, CA-15, CA-17, CA-28 modificados; CA-29 a CA-41; RN-06, RN-07 modificados; RN-11 a RN-14).
- Dependencias: `api-019` enmienda (b) (`match` en la respuesta, tolerancia en servidor, límite 429). Los bloques de cliente que no dependen de la API (tolerancia, catálogo, pareado, foco) pueden avanzar en paralelo.
- Estado del plan de la enmienda: aprobado con la spec. Implementadas T-27 a T-37 y T-39; pendientes T-38 y T-40.

### Diseño de solución (enmienda)

```text
GlobalSearch (View: combobox, línea match, «Ir a: …»)
  → useGlobalSearch (ViewModel)
      → search-query.ts    splitSearchQuery(q) → { actionMatches, rest }          (CA-35)
      → adminApi.search(rest || q), solo si hay ≥ 2 caracteres                    (CA-13, CA-39)
      → search-tolerance.ts  regla de api-019 CA-36 a CA-40 (resaltado, Secciones) (CA-30, CA-31, CA-41)
      → search-actions.ts    catálogo, permisos del perfil, sinónimos, pareado     (CA-32 a CA-35)
      → global-search.ts     orderSearchGroups: actual, otras, Acciones, Secciones (CA-34)
  → al elegir: focus-target.ts (action?, tab?) → App.tsx
      → navigate / locate (useLocateHit) / abrir diálogo si la vista lo soporta   (CA-36 a CA-38)
```

### Cambios por área

| Área | Archivos previstos | Propósito |
|---|---|---|
| Funciones puras (nuevo) | `src/viewmodels/search-tolerance.ts` | Regla de tolerancia y resaltado tokenizado (CA-30, CA-31, CA-41) |
| Funciones puras (nuevo) | `src/viewmodels/search-actions.ts` | Catálogo, sinónimos, filtro por permisos y pareado con elementos (CA-32, CA-33, CA-35) |
| Funciones puras (nuevo) | `src/viewmodels/search-query.ts` | Divide la consulta en palabras de acción y resto (CA-35) |
| Funciones puras | `src/viewmodels/global-search.ts` | `highlightSegments` con la regla tolerante; `orderSearchGroups` añade «Acciones» y tolera «Secciones» (CA-30, CA-34) |
| ViewModel | `src/viewmodels/useGlobalSearch.ts` | Llamada con el resto (CA-35); mensaje 429 (CA-39) |
| Foco | `src/viewmodels/focus-target.ts` | `action?` (`status`, `reset-password`, `reset-two-factor`, `delete`, `cancel`) y `tab?` en `FocusTarget`; `resolveFocusAction` sin cambio (CA-36, CA-37) |
| View | `src/components/GlobalSearch.tsx` | Línea `match` con `<mark>` y «Ir a: …» (CA-29, CA-35) |
| Encabezado | `src/App.tsx` | Pasa `action` a Usuarios, Recintos e Historial; pasa `tab` a TulanPedia (CA-36, CA-38) |
| Usuarios | `src/sections/UsersSection.tsx`, `src/views/UsersView.tsx` | Acepta `focus` con `action`; `data-search-id="users:<id>"`; abre el diálogo existente con `actions.openAction` (CA-38) |
| Recintos | `src/sections/EnclosuresSection.tsx`, `src/views/EnclosuresView.tsx`, `src/viewmodels/useEnclosuresManagement.ts` | Abre el `ConfirmDialog` de estado o eliminación desde el foco; no ejecuta (CA-37, CA-38) |
| Historial de boletos | `src/views/TicketHistoryView.tsx`, `src/viewmodels/useTicketHistory.ts` | Abre `openCancel(row)` cuando la fila localizada coincide; si no, solo ubica (CA-38) |
| Paquete | `packages/api-client/admin-types.ts` | `GlobalSearchItem.match?` (api-019 T-45). Sin lógica |
| Estilos | `src/styles.css` | `.global-search__match` y `.global-search__action` solo con tokens (CA-29, CA-35) |
| Pruebas (nuevas) | `src/tests/global-search-tolerance.test.tsx`, `src/tests/global-search-actions.test.tsx`, `src/tests/global-search-focus-actions.test.tsx`, `src/tests/global-search-limits.test.tsx` | Un `describe("CA-xx enclosure-actions-global-search")` por CA |
| Pruebas (actualizar) | `src/tests/global-search-navigation.test.tsx` (CA-13, CA-15, CA-17), `src/tests/administration-coverage.test.tsx` (CA-01 a CA-41) | Ajustar expectativas que cambian |

### Decisiones de la enmienda (b)

| # | Decisión | Motivo |
|---|---|---|
| D-16 | Una palabra es «de acción» si coincide con la etiqueta o un sinónimo por exacta o prefijo; con error de escritura solo si tiene 7 o más letras (distancia ≤ 2). | Evita falsos positivos («clara» con «clave»). CA-41. Propuesta. |
| D-17 | La API recibe el resto de la consulta. Si todas las palabras son de acción, recibe la consulta completa. Si el resto tiene menos de 2 caracteres, no hay llamada. | Una sola petición por consulta, con el límite de 30 por minuto del servidor (CA-35, CA-47). Propuesta. |
| D-18 | Pareado: un elemento de la sección S recibe «Ir a: <acción>» si una palabra de acción coincide con una acción de S visible para el perfil. Gana la primera del catálogo. | CA-35. |
| D-19 | `FocusTarget` gana `action?` y `tab?`. Las vistas que no soportan `action` lo ignoran; `App.tsx` pasa la acción solo a la sección del resultado. | CA-36 a CA-38. |
| D-20 | Usuarios recibe foco como Recintos: `UsersSection` acepta `focus` y `UsersView` usa `actions.openAction({type, id})`. Si la cuenta no está en la página cargada, aplica CA-24. | CA-38. Usuarios está paginado en el servidor. |
| D-21 | Recintos reutiliza `setEnclosureStatus` y `deleteEnclosure` con sus diálogos `{kind: "status"}` y `{kind: "delete"}`. El foco solo los abre. | CA-37. Sin cambios de API. |
| D-22 | Historial: `action: "cancel"` llama a `openCancel(row)` cuando la fila localizada tiene el folio. La acción solo aparece con `tickets.cancel`. | CA-38. |
| D-23 | La tolerancia del cliente es una función pura sin dependencias. La API es PHP, así que la paridad se prueba con una tabla de casos copiada en el test. | CA-31; RN-11. |
| D-24 | El cliente conserva el mensaje de la respuesta 429 para mostrarlo. Hay que verificar cómo `packages/api-client` expone el estado HTTP de un error antes de implementar T-34. | CA-39. |
| D-25 | Sin almacenamiento del término: ni `localStorage`, ni `sessionStorage`, ni URL. | CA-40; RN-14. |

#### Decisiones técnicas de la sesión principal sobre las preguntas de la enmienda

| # | Decisión | Motivo |
|---|---|---|
| D-26 | Solo Usuarios, Recintos e Historial de boletos abren el diálogo de la acción desde un resultado; el resto navega a la sección y marca el elemento (pregunta 2). | Las demás vistas requieren cambios que no están en esta enmienda. |
| D-27 | Las acciones de imagen, edición, aceptar/rechazar, publicar y exportar solo llevan a la sección (pregunta 1). | Mismo motivo; el usuario completa el paso. |
| D-28 | «QR» y «código QR» son sinónimos de «Nueva venta» (donde se imprime el QR del boleto) y solo para quien tiene `tickets.create`; sin ese permiso no hay acción (pregunta 3). No existe una acción «QR». | La spec proponía «sin acción»; la sesión principal eligió apuntar a la venta. |

#### Detalles de implementación

- Las palabras de acción exigen 3 o más letras (exacta o prefijo) para evitar ruido con palabras de 1 o 2 letras; con error solo desde 7 letras (D-16).
- `resolveSelection` (en `focus-target.ts`) concentra la decisión de elegir un resultado: `ignore`, `section` (acción sola, con pestaña de TulanPedia) o `focus` (con `action` solo si la vista la soporta). `App.tsx` solo aplica el plan.
- La acción «Desactivar» del buscador solo abre el diálogo para un recinto activo. «Cancelar boleto» solo abre el diálogo si la fila localizada es cancelable.
- `FocusTarget` gana `action?`; no gana `tab?`: la pestaña de una acción sin elemento viaja en un estado aparte de `App.tsx` (`tabRequest`) porque no hay id.
- Si todas las palabras son de acción, los elementos no reciben «Ir a» (coinciden por la propia palabra).

### Pruebas (Vitest; entorno `node`, `renderToStaticMarkup` y funciones puras)

| CA | Prueba | Archivo |
|---|---|---|
| CA-29 | Línea `match.field` + `snippet` con `<mark>`; sin `match`, sin línea | `global-search-tolerance.test.tsx` |
| CA-30 | `highlightSegments` tolerante: acentos, prefijos, errores por longitud; en título, fragmento y Secciones | idem |
| CA-31 | Tabla de casos de api-019 CA-36 a CA-40: el cliente da el mismo sí/no | idem |
| CA-32 | Cada entrada del catálogo tiene etiqueta que aparece en el código de su vista (lectura estática) | `global-search-actions.test.tsx` |
| CA-33 | Solo acciones con permiso del perfil (`getNavigationForProfile` y `profile.permissions`) | idem |
| CA-34 | Grupo «Acciones» entre la API y «Secciones»; sin grupo vacío | idem |
| CA-35 | `splitSearchQuery("contraseña juan")` → resto «juan»; resultado con «Ir a: Restablecer contraseña»; resto de 1 carácter sin llamada | `global-search-actions.test.tsx` |
| CA-36 | Acción sola: navega a la sección (y pestaña TulanPedia); sin llamada de cambio | `global-search-focus-actions.test.tsx` |
| CA-37 | Elegir con elemento: navega, ubica y abre el diálogo; `setStatus`, `remove` y restablecimientos no se llaman | idem |
| CA-38 | Usuarios, Recintos e Historial reciben `action`; el resto lo ignora; `data-search-id="users:<id>"` | idem |
| CA-39 | 429 → mensaje de la API; sin reintento automático | `global-search-limits.test.tsx` |
| CA-40 | Lectura estática: sin `localStorage`, `sessionStorage` ni `history` con el término | idem |
| CA-41 | Secciones con regla de CA-30; acciones: 4 a 6 letras sin error («clara» no activa «clave»), 7 o más con error de 2 | `global-search-tolerance.test.tsx` |
| CA-28 | `describe` por CA-01 a CA-41 y registro en `administration-coverage.test.tsx` | `administration-coverage.test.tsx` |

### Constitution Check (enmienda)

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas. |
| II. La spec manda | Sí | Enmienda aprobada. |
| III. Lógica separada de la interfaz | Sí, con matiz | La autorización y los resultados vienen de la API. El cliente tolera y ordena solo presentación (RN-01, RN-11). El catálogo filtra por permisos solo para mostrar (CA-33). |
| IV. Un test por criterio | Sí, al implementar | Tabla de pruebas CA-29 a CA-41. |
| V. Una sola fuente de verdad | Sí | No guarda datos ni términos (CA-40). |
| VI. Código en inglés, personas en español | Sí | Etiquetas de UI en español. |

### Riesgos (enmienda)

- **Duplicación de la regla de tolerancia** entre PHP y TypeScript (RN-11): tabla de casos compartida en ambos tests.
- **Acciones que solo llevan a la sección** (imagen, edición, aceptar, rechazar, publicar, exportar): el usuario debe completar el paso. Pregunta 1.
- **Paginación del servidor**: una cuenta o un boleto fuera de la página cargada no se localizan; aplica CA-24.
- **Pareado con palabras comunes** («cuenta», «estado»): mitigado por CA-35 y D-16.
- **Revisión manual pendiente** de teclado y resaltado con `prefers-reduced-motion` (T-38).

### Orden

1. Aprobación de la enmienda; confirmación de las preguntas 1 a 3 de la spec.
2. Bloque C1 (sin API): T-27, T-29, T-30, T-31 y T-32 (con datos simulados).
3. Bloque C2 (con `match` real): T-28 y T-33 tras api-019 T-35 y T-45.
4. Bloque C3: T-34, T-35 (con api-019 T-40, límite 429).
5. T-36 a T-40 al cierre.

- **Ajuste (CA-24):** `locateElement` no cuenta intentos mientras la sección muestra su mensaje de carga (`ListStatusMessage` con `data-list-loading="true"`), con tope de 30 s; así un elemento de una lista lenta (API en Aiven) no se reporta como «no disponible» antes de cargar. Las acciones y secciones no esperan. Tests: `global-search-navigation.test.tsx`, describe CA-24 (2 casos nuevos).

## Enmienda (d), aprobada

- Spec: «Enmienda (d)» (CA-15, CA-25, CA-28 y la regla de tolerancia de CA-30, CA-31, CA-41 y RN-11 modificados; CA-42 a CA-44 nuevos). Depende de `api-019` enmienda (d).
- Cambios: `search-tolerance.ts` añade `requiredWordCount` (ceil(n/2); todas con 1 o 2), `relevanceOf` y `compareRelevance` (frase literal > frase en título > frase en otro campo > palabras > nivel medio); `matchLevel` y `matchesTerm` usan la coincidencia parcial. `search-actions.ts` añade `actionRelevance` y `rankActions`. `global-search.ts` (`orderSearchGroups`) ordena los demás grupos por `best_score` (leído de forma opcional, sin tipar el campo hasta que exista en `@arca/api-client`) y rankea «Acciones» y «Secciones». El resaltado ya marca cada palabra coincidente (CA-44, cubierto por test).
- Decisión D-29: sin `best_score`, el grupo queda al final de su empate y rige el orden de navegación. D-30: «Acciones» no aplica ceil(n/2): basta reconocer una palabra de la etiqueta o los sinónimos y se ordenan por relevancia (más palabras primero); «borrar usuario» sigue mostrando «Eliminar cuenta» (CA-43).
- Pruebas: `src/tests/global-search-tolerance.test.tsx` → `describe("CA-42 …")`, `describe("CA-43 …")`, `describe("CA-44 …")`; `administration-coverage.test.tsx` (CA-01 a CA-44).

## Enmienda (e), aprobada

Pedida por el responsable funcional: «busco una noticia y salen primero eventos; solo toma algunas palabras».

- **Palabras vacías** (a, al, con, de, del, el, en, es, la, las, lo, los, o, para, por, que, se, su, sus, un, una, unas, unos, y): no se exigen ni cuentan como coincidencia; sí forman parte de la frase literal (CA-50 a CA-52). Si la consulta solo tiene palabras vacías, se usan todas. Implementado en `ItemMatcher` (API) y `search-tolerance.ts` (cliente, paridad).
- **Coincidencia parcial más estricta** (modifica CA-37 y la regla de ceil(n/2) de la enmienda d): con 1 a 3 palabras con contenido se exigen todas; con 4 o más, al menos 3 y al menos el 75 % (redondeado hacia arriba).
- **Sección nombrada en la consulta** (dashboard, `viewmodels/search-intent.ts`): si la consulta incluye una palabra de sección (noticia/s, nota/s; evento/s, actividad/es; recinto/s; usuario/s, cuenta/s, empleado/s, personal; momento/s, recuerdo/s; especie/s, tulanpedia; boleto/s, folio/s), esa palabra no se envía a la API (si queda texto suficiente) y el grupo de esa sección se muestra primero, antes que el de la sección actual.
- **Palabras de sección y vacías no son acciones** (dashboard, `splitSearchQuery`): antes una palabra como «noticia» se reconocía como parte de una acción («Publicar noticia») y se quitaba de la consulta enviada a la API, por lo que la búsqueda usaba una sola palabra. Ahora esas palabras siempre llegan a la búsqueda.
- **Grupo «Acciones» solo con palabras sin resultados** (`orderSearchGroups`): las acciones se buscan solo con las palabras de la consulta que no aparecen en ningún resultado de la API (título, subtítulo o fragmento), sin palabras vacías ni de sección; si no queda ninguna, no se muestran acciones. Evita acciones ajenas por sinónimos («nuevo» → «Crear…») cuando la palabra es parte del contenido buscado. «contraseña juan» sigue mostrando «Restablecer contraseña». **Excepción, verbo explícito:** si la consulta incluye de forma exacta el verbo inicial de una acción (Crear, Renombrar, Eliminar, Desactivar, Activar, Cancelar, Restablecer, Aceptar, Rechazar, Publicar/Despublicar/Republicar, Editar, Exportar) o un sinónimo en infinitivo («borrar», «cambiar»…), esa palabra siempre se usa para «Acciones», aunque aparezca en los resultados.
- **Resaltado:** usa la consulta completa sin palabras vacías, para marcar todas las palabras que coinciden.
- **Tests:** expectativas de CA-37, CA-41 y CA-43 del dashboard actualizadas a la regla vigente. Evidencia: `npm test` = 61 archivos y 586 pruebas aprobadas; `npm run types` sin errores; `npm run build` correcto. La cobertura de API CA-50 a CA-54 se verifica en su propia suite.
