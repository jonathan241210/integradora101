# Plan técnico · 008 · memory-moderation

- Spec: `apps/dashboard/specs/008-memory-moderation.md`
- Estado de spec: Aprobada (2026-11-12, Jonathan, responsable de backend).
- Estado: **Aprobado** (Jonathan, responsable de backend, 2026-11-13). Implementación pendiente de iniciar; coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Aviso vigente: no se marca ninguna tarea de `apps/dashboard/tasks/008-memory-moderation.md` sin evidencia. Las preguntas 1 a 8 del plan quedan resueltas el 2026-11-13 (sección «Preguntas»); la integración depende de `api-010` fase 1 y `api-013` implementadas.
- Responsable técnico: Jonathan (coordina las sesiones de Claude Code), 2026-11-13.
- Fecha del borrador: 2026-11-12.
- Dependencias de contrato (Aprobadas, **sin implementar**): `api-010` fase 1 (revisión: CA-07 a CA-14, CA-16 del seeder, CA-21 de rutas), `api-013` (CA-10 y D-06, ruta autenticada de imagen de revisión). ADR 0026 Aceptado (2026-11-12).
- Dependencia de datos: DBR-012 Aprobada y aplicada en `arca_pruebas` (2026-11-11), «Lista para backend». El dashboard no toca base de datos ni migraciones.
- Coordinación: comparte shell y componentes compartidos con `dashboard-010` (ver «Coordinación con dashboard-010»). Este plan no modifica `plan/010-public-content-management.md` ni `tasks/010-public-content-management.md`.
- Ambiente de trabajo: la UI se desarrolla y se prueba con contratos simulados (`adminApi` con respuestas falsas). No hay peticiones reales hasta que `api-010` fase 1 exista en `arca_pruebas` y haya datos de prueba (pregunta 6). Mobile no envía momentos todavía.

## Diseño de solución

Se añade la sección «Momentos» a la shell del dashboard, visible solo si la API indica `memories.review` en `GET /api/v1/auth/me`. Dentro hay dos vistas de la misma sección:

- **Lista:** peticiones paginadas de 10 en 10, con filtro por estado (Todas, Enviada, En proceso, Aceptada, Rechazada). Filtrar vuelve a pedir a la API; no se filtra en el cliente.
- **Detalle:** opinión como texto, imagen completa y acciones según el estado. «Aceptar» abre un diálogo con el plazo de publicación que devuelve la API. «Rechazar» abre un diálogo con motivo obligatorio (1 a 500 caracteres) y casillas «La foto» y «La opinión» (al menos una).

Al abrir el detalle, la API pasa la petición de Enviada a En proceso (`api-010` CA-08); el dashboard no envía ninguna acción adicional. La imagen se pide como blob con `http.download` a `GET /api/v1/admin/memories/{id}/image`, que es una ruta relativa del mismo origen. El proxy de `/api` de `vite.config.ts` ya la cubre; no hay CORS (`api-013` RN-12). El ViewModel crea la URL `blob:`, la muestra y la revoca al cerrar el detalle, al cambiar de petición y al desmontar la sección (CA-17).

Después de aceptar o rechazar, el ViewModel vuelve a pedir el detalle en lugar de leer el cuerpo de la respuesta, porque `api-010` no fija el cuerpo de `accept` ni de `reject`. Así el estado mostrado siempre es el de la API.

La API decide estados, transiciones, plazos, permisos, visibilidad de la imagen y auditoría (RN-01, RN-03). La UI solo valida lo que la spec pide como presentación (motivo entre 1 y 500, al menos una casilla, contador) y elige textos a partir de flags que entrega la API (`is_published`, `status`).

### Capas (MVVM explícito, `apps/dashboard/AGENTS.md` y `apps/dashboard/docs/arquitectura.md`)

```
View (views/, components/: props, sin lógica ni llamadas)
  ← Section (sections/MemoriesSection.tsx, sections/MemoryDetailSection.tsx: llaman a su hook solo al abrirse)
  ← hook ViewModel (viewmodels/useMemoryReviewList.ts, viewmodels/useMemoryReviewDetail.ts)
      → funciones con cliente y vista previa inyectados (viewmodels/memory-review.ts, viewmodels/memory-review-shared.ts)
      → adminApi.memoryReview de @arca/api-client (services/arca-api.ts, ya existente)
  → API /api/v1/admin/memories* (api-010)
```

Reglas de la capa:

- Ningún archivo de `views/`, `components/` ni `sections/` importa `services/`, `@arca/api-client` ni usa `fetch`/`axios` (CA-14).
- Los hooks ViewModel llaman solo a `adminApi.memoryReview`. El 401 lo atiende el manejador global de sesión («Tu sesión expiró», `dashboard-002` CA-08); los ViewModels no lo duplican.
- Las respuestas tardías se descartan con un contador de generación: al cambiar de filtro, de página o de petición, la respuesta anterior no escribe en el estado.
- Ningún dato se guarda en el navegador: sin `localStorage`, `sessionStorage`, IndexedDB ni cookies (RN-07, CA-17).
- Los tipos de DTO se reexportan desde `viewmodels/admin-types.ts`, como el resto de secciones.

### Límites de cálculo en la UI

| Permitido en el cliente | No permitido en el cliente |
|---|---|
| Etiquetas en español de estados (Enviada, En proceso, Aceptada, Rechazada) y de casillas («La foto», «La opinión») (`viewmodels/memory-review-shared.ts`) | Decidir si una acción está permitida más allá de mostrar las de CA-07 y CA-18 (RN-03) |
| Validación de presentación que la API repite: motivo de 1 a 500 caracteres sin espacios sobrantes, al menos una casilla, contador «n/500» | Calcular plazos, fechas de vencimiento o si una publicación sigue vigente a partir de `published_until` y la hora del navegador (RN-04). Se usa `is_published` (ver riesgo R-3) |
| Recortar la opinión a un fragmento para la lista (presentación, 120 caracteres) | Ordenar, filtrar o paginar en el cliente |
| Qué acciones se muestran según `status` y `is_published` que llegan de la API | Permisos, 2FA o elegibilidad (RN-01) |
| Mensajes de error según el código HTTP y los `errors` de la API | Reglas de la imagen (tamaño, tipo, existencia): las decide la API |

## Pantallas y estados del cliente

No hay React Router (ADR 0002 sin aprobar). La navegación es el estado de `useDashboardShell` (`activeSection`). La lista y el detalle viven en la misma sección: `MemoriesSection` guarda `selectedId` en su estado local y renderiza la lista o el detalle. El detalle se monta con su propio hook, así que `GET /memories/{id}` y la imagen solo se piden al abrir una petición.

| Pantalla | Id de shell | Permiso de navegación | Contenido | CA principales |
|---|---|---|---|---|
| Momentos, lista | `memories` | `memories.review` | Título «Momentos», filtro «Estado», tabla o tarjetas, paginación «Anterior»/«Siguiente» | CA-01 a CA-04, CA-13 |
| Momentos, detalle | `memories` (vista detalle de la misma sección) | `memories.review` | Estado, fecha de envío, reenvíos, opinión, imagen, acciones según estado, diálogos | CA-05 a CA-12, CA-15, CA-17 a CA-19 |

### Lista (`views/MemoriesView.tsx`)

- Encabezado `h1` «Momentos» (la shell lo enfoca al navegar).
- Filtro con `<label>` «Estado» y `<select>`: «Todas» (sin `status`), «Enviada» (`submitted`), «En proceso» (`in_review`), «Aceptada» (`accepted`), «Rechazada» (`rejected`) (CA-03).
- Vista ancha (desde 768 px): tabla. Vista estrecha: tarjetas apiladas (CA-13). Se evalúa reutilizar `components/DataTable.tsx` (ya tiene `caption` y `table-scroll`); si no encaja, bloque propio `memory-review__`.
- Por fila (CA-04): fecha de envío (`formatDateTime`), estado con icono y texto (`MemoryStatusBadge`), fragmento de la opinión («Sin opinión» si es `null`), «Reenviada 1 vez» o «Reenviada {n} veces» si `resubmitted_count` es mayor que 0 (propuesta de texto, pregunta 8), y botón «Revisar» con `aria-label` «Revisar petición enviada el {fecha}».
- Paginación: `components/HasMorePaginationBar.tsx` (nuevo; ver «Coordinación»). Muestra «Página {n}», «Anterior» (deshabilitado en la página 1) y «Siguiente» (deshabilitado si `has_more` es `false`). No muestra total.

Estados de la lista (`loadState`):

| Estado | Texto | Notas |
|---|---|---|
| `loading` | «Cargando peticiones…» (`ListStatusMessage`, `role="status"`) | Sin filas anteriores |
| `ready` | Filas | — |
| `empty` | «No hay peticiones con este estado.» | CA-02 |
| `error` | «No se pudieron cargar las peticiones.» con «Reintentar» (propuesta de texto, pregunta 8) | Sin filas anteriores (CA-11) |
| `denied` (403) | «No tienes permiso para revisar momentos.» | CA-01, CA-11 |

### Detalle (`views/MemoryReviewDetailView.tsx`)

- «Volver a la lista»: cierra el detalle, revoca la URL de la imagen y vuelve a pedir la lista (la fila muestra el estado nuevo, CA-05).
- Encabezado con estado (icono y texto), fecha de envío y reenvíos.
- Opinión como texto (`<p>`), nunca como HTML (CA-06). «Sin opinión» si es `null`.
- Imagen (`components/MemoryImage.tsx`): completa y centrada, sin recorte ni ampliación (criterio de `dashboard-007`), con `alt="Foto enviada por un visitante"` (CA-06).
- Bloque de decisión según estado (CA-07):

| Estado | Acciones | Texto de solo lectura |
|---|---|---|
| `submitted` o `in_review` | «Aceptar» (primario) y «Rechazar» (secundario) | — |
| `rejected` | Ninguna | «Esperando la corrección del visitante.», motivo (`rejection_reason`) y opciones marcadas («La foto», «La opinión») |
| `accepted` | Ninguna | Con `is_published` = `true`: «Publicada en la galería hasta el {fecha}.»; con `false`: «La publicación venció el {fecha}.» (CA-19). Fecha de publicación: pendiente de M-3 |

- «Aceptar» queda deshabilitado con el texto «No se puede aceptar sin la imagen.» cuando la imagen no existe (CA-18). Mientras carga la imagen también queda deshabilitado (decisión de este plan; pregunta 5).
- «Rechazar» sigue disponible con la imagen no encontrada (CA-18).

Estados del detalle (`detailState`):

| Estado | Texto | Notas |
|---|---|---|
| `loading` | «Cargando petición…» | — |
| `ready` | Datos y acciones | — |
| `not-found` (404) | «Petición no encontrada.» con «Volver a la lista» | CA-11 |
| `denied` (403) | «No tienes permiso para revisar momentos.» | CA-11 |
| `error` (red o 5xx) | «No se pudo cargar la petición.» con «Reintentar» (propuesta) | Sin datos anteriores (CA-11) |

Estados de la imagen (`image.state`): `loading` («Cargando la foto…»), `ready` (`<img>` con URL `blob:`), `error` o `not-found` («No se pudo cargar la imagen.», CA-06 y CA-18).

### Diálogo de aceptar (en `views/MemoryReviewDetailView.tsx`, sobre `ConfirmDialog`)

- Título «¿Aceptar esta petición?»; mensaje propuesto: «La foto y la opinión se publicarán en la galería del portal durante {N} días desde la aceptación. Después dejarán de mostrarse.» (con `publication_days` = 1, «1 día»; pregunta 8).
- Botones «Confirmar» (envía) y «Cancelar» (cierra sin llamar a la API, CA-08). Escape cierra sin llamar a la API (CA-12).
- Un 422 con `errors.image` se muestra dentro del diálogo y no lo cierra.

### Diálogo de rechazar (`components/MemoryRejectDialog.tsx`, sobre `ConfirmDialog`)

- Título «Rechazar petición»; mensaje propuesto: «Indica qué falló y por qué. El visitante verá el motivo y podrá corregir lo marcado.» (pregunta 8).
- Campo «Motivo» con `<label>`, `<textarea>` y contador «n/500». Casillas en un `<fieldset>` con `<legend>` «¿Qué falló?»: «La foto» (`image`) y «La opinión» (`content`).
- «Confirmar» deshabilitado mientras `canConfirmRejection(reason, fields)` sea falso (motivo vacío tras quitar espacios, más de 500 caracteres o ninguna casilla). Ninguno de esos casos llama a la API (CA-09).
- Un 422 de `errors.rejection_reason` o `errors.rejected_fields` se muestra junto al campo con `aria-describedby` y `aria-invalid`, sin cerrar el diálogo.

### Mensajes de decisión y avisos

- Éxito de aceptar: aviso `role="status"` «Petición aceptada.» (CA-08; texto propuesto, pregunta 8). El detalle muestra la vigencia (CA-19).
- Éxito de rechazar: el detalle pasa a Rechazada y muestra el motivo (CA-09). Aviso opcional propuesto «Petición rechazada. Esperando la corrección del visitante.».
- Decisión tardía (422 sin campo, CA-10): `role="alert"` con el mensaje de la API («Esta petición ya fue revisada.» o «Esta petición está rechazada y espera la corrección del visitante.») y recarga del detalle. Nada más cambia.

## Coordinación con dashboard-010 (shell y componentes compartidos)

`dashboard-010` añade dos secciones a la misma shell. Este plan no duplica ninguna pieza de 010 y no pisa sus archivos: solo añade sus propias líneas en los puntos de encuentro. Cada cambio compartido está listado aquí para que el responsable de 010 lo vea antes de integrar.

| Archivo | Cambio de 008 | Cambio previsto de 010 (según su plan) | Regla de convivencia |
|---|---|---|---|
| `viewmodels/dashboard-shell.ts` | Añade `"memories"` a `DashboardSection` | Añade `"species-requests"` y `"published-species"` | Solo líneas nuevas en la unión. El reducer no cambia |
| `viewmodels/navigation.ts` | Candidato `memories` (etiqueta «Momentos», icono `camera`, permiso `memories.review`) después de «Usuarios» | Dos candidatos con `species.review` | Orden propuesto: ..., Usuarios, Momentos, Solicitudes de especies, Especies publicadas (pregunta 4) |
| `App.tsx` | Clave `memories` en `sectionTitles` («Momentos») y render de `MemoriesSection` | Claves y render de sus dos secciones | `Record<DashboardSection, string>` exige la clave: quien integre el segundo debe añadir la suya o no compila |
| `components/Icon.tsx` | Añade el nombre `camera` | Puede añadir iconos propios | Nombres distintos. Si ambos necesitan el mismo icono, se reutiliza el existente |
| `components/PaginationBar.tsx` | **No se modifica** | Su plan usa `Paginated` con `total` | Sin cambios en el componente compartido |
| `components/HasMorePaginationBar.tsx` | **Nuevo** (aprobado aquí): paginación con `has_more` sin total | Su CA-02 también pide `meta.has_more` | Lo crea 008, que va primero (pregunta 3 resuelta); 010 lo reutiliza |
| `packages/api-client/admin-types.ts` y `viewmodels/admin-types.ts` | Añade `HasMorePage<T>` y los DTO de memoria | Añade los DTO de especies | `HasMorePage<T>` se define una sola vez. Solo se añaden líneas |
| `packages/api-client/admin.ts` | Namespace `memoryReview` | Namespaces `speciesPublicationRequests` y `publishedSpecies` | Namespaces distintos. `unwrap`, `unwrapList` y `normalizePage` no cambian |
| `packages/api-client/index.ts` y `README.md` | Exports y documentación de `memoryReview` | Lo mismo para sus namespaces | Bloques separados |
| `services/blob-preview.ts` | **Nuevo** (propuesto aquí): crea y revoca URL `blob:` para un `Blob` | Necesita lo mismo para las fotos de especie | Lo crea el primero que se implemente; el otro lo reutiliza. `image-field.ts` e `image-preview.ts` no cambian (su tipo exige `File`) |
| `components/ConfirmDialog.tsx` | Se usa tal cual (`children`, `confirmDisabled`, `error`) | Igual | No se modifica |
| `styles.css` | Bloque propio `memory-review__*` | Bloque propio `dashboard-010` | Sin cambios en selectores existentes |
| `apps/dashboard/docs/arquitectura.md` | Sección «Momentos» y tabla de endpoints | Sección de solicitudes y de publicadas | Cada plan edita solo sus secciones |
| `src/tests/` | Archivos `memory-*.test.tsx`, `memory-coverage.test.tsx` y `memory-fixtures.ts` | `species-*.test.tsx` y sus fixtures | Prefijos distintos. No se edita `admin-fixtures.ts` |
| `apps/dashboard/AGENTS.md` | Solo si cambia el estado de la spec (T-19) | Igual | Sin cambios en este plan |

No se reutiliza nada de 010: `species-publication-shared.ts`, `SpeciesPhoto`, `SpeciesFichaForm`, `SpeciesStatusBadge` y `RejectSpeciesRequestDialog` pertenecen a su plan. Los nombres de 008 no se parecen a los suyos para evitar confusiones. Los CA de ambas specs usan los mismos números (CA-01 a CA-17); por eso los nombres de test llevan prefijo de feature (`CA-02 memory-…` frente a `CA-02 species-…`).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API | Ninguno | Este plan no cambia `apps/api`. Las brechas de contrato se piden a `api-010` (M-1 a M-3) |
| `packages/api-client` | `admin-types.ts` (tipos de revisión y `HasMorePage<T>`), `admin.ts` (namespace `memoryReview`), `index.ts` (exports), `README.md` (métodos) | Métodos y tipos de `api-010` fase 1. Sin lógica de negocio. `http.ts` no cambia: `download` ya devuelve `DownloadedFile` y ya gestiona 401 |
| Dashboard, shell | `viewmodels/dashboard-shell.ts`, `viewmodels/navigation.ts`, `App.tsx`, `components/Icon.tsx` | Navegación, título y render. Ver «Coordinación» |
| Dashboard, ViewModels | `viewmodels/memory-review-shared.ts` (etiquetas, validadores, copys de diálogo, fragmento, mapeo de errores, contador de generación, tipo `BlobPreview`), `viewmodels/memory-review.ts` (reducers y funciones con cliente inyectado), `viewmodels/useMemoryReviewList.ts`, `viewmodels/useMemoryReviewDetail.ts`, `viewmodels/admin-types.ts` (reexport) | Estado, validación de presentación y llamadas vía `adminApi.memoryReview` |
| Dashboard, servicios | `services/blob-preview.ts` (nuevo) | Implementa `BlobPreview` con `URL.createObjectURL` y `URL.revokeObjectURL`, inyectable en pruebas |
| Dashboard, secciones | `sections/MemoriesSection.tsx` (lista y `selectedId`), `sections/MemoryDetailSection.tsx` (llama a `useMemoryReviewDetail`) | Contenedores delgados |
| Dashboard, views | `views/MemoriesView.tsx`, `views/MemoryReviewDetailView.tsx` | Presentación por props |
| Dashboard, components | `components/MemoryStatusBadge.tsx` (icono y texto), `components/MemoryImage.tsx` (estados de la imagen), `components/MemoryRejectDialog.tsx` (sobre `ConfirmDialog`), `components/HasMorePaginationBar.tsx` (nuevo, compartido) | Piezas reutilizables |
| Dashboard, estilos | `styles.css` (bloque `memory-review__*`, con tokens semánticos existentes como `--surface-subtle`, `--border` y `--muted-foreground`) | Tabla desde 768 px, tarjetas por debajo; imagen completa con `object-fit: contain` como en `dashboard-007` (sin reutilizar las clases de miniatura) |
| Dashboard, pruebas | `src/tests/memory-*.test.tsx`, `src/tests/memory-coverage.test.tsx`, `src/tests/memory-fixtures.ts` | Vitest, un test por CA (ver «Mapeo») |
| Documentación | `apps/dashboard/docs/arquitectura.md` (sección «Momentos», endpoints, ViewModels), `packages/api-client/README.md` | Referencia duradera, actualizada en el mismo PR (T-16) |

Sin dependencias nuevas, sin cambios en `package.json`, sin React Router, sin `vite.config.ts` (el proxy de `/api` ya existe).

## Contrato y datos

Todas las rutas son de `/api/v1/admin` (`api-010` CA-21, nombres `admin.memories.index`, `admin.memories.show`, `admin.memories.image`, `admin.memories.accept` y `admin.memories.reject`). Pasan por la cookie Sanctum y el CSRF de `http` (las de escritura). Ningún endpoint se llama desde componentes.

### Endpoints consumidos

| Cliente (`@arca/api-client`) | Método y ruta | Entrada | Respuesta usada | Spec |
|---|---|---|---|---|
| `memoryReview.list({ status?, page? })` | `GET /api/v1/admin/memories?status=&page=` | `status` omitido en «Todas»; `page` (por defecto 1). No se envía `limit` (la API usa 10 por defecto, CA-07) | `HasMorePage<MemoryReviewSummaryDto>` | api-010 CA-07, RN-11 |
| `memoryReview.get(id)` | `GET /api/v1/admin/memories/{id}` | — | `MemoryReviewDetailDto`. Pasa la petición a `in_review` si estaba en `submitted` | api-010 CA-08, CA-09, CA-10 |
| `memoryReview.image(id)` | `GET /api/v1/admin/memories/{id}/image` | — | `DownloadedFile` (blob). Ruta relativa del mismo origen | api-010 CA-08; api-013 CA-10, D-06, RN-12 |
| `memoryReview.accept(id)` | `POST /api/v1/admin/memories/{id}/accept` | Sin cuerpo | Se ignora el cuerpo; el ViewModel recarga el detalle | api-010 CA-11 |
| `memoryReview.reject(id, input)` | `POST /api/v1/admin/memories/{id}/reject` | `{ rejection_reason, rejected_fields }` | Se ignora el cuerpo; el ViewModel recarga el detalle | api-010 CA-12, CA-28 |

### Tipos (en `packages/api-client/admin-types.ts`)

```ts
export type MemoryReviewStatus = "submitted" | "in_review" | "accepted" | "rejected";
/** Valores de `rejected_fields` (api-010 RN-20): la foto y la opinión. */
export type MemoryRejectedField = "image" | "content";

/** Página con `has_more` (api-010 CA-07). No es `Paginated<T>`: ese tipo usa `PageMeta` con total. */
export type HasMorePage<T> = {
  data: T[];
  meta: { page: number; limit: number; has_more: boolean };
};

export type MemoryReviewListQuery = { status?: MemoryReviewStatus; page?: number };

/** Fila de la lista. Campos pendientes de confirmar (M-1). Sin datos del visitante. */
export type MemoryReviewSummaryDto = {
  id: number;
  status: MemoryReviewStatus;
  opinion: string | null;
  created_at: string;
  resubmitted_count: number;
};

/** Detalle de revisión (api-010 CA-08). Sin URL de imagen y sin nombre ni correo del visitante. */
export type MemoryReviewDetailDto = {
  id: number;
  status: MemoryReviewStatus;
  opinion: string | null;
  created_at: string;
  resubmitted_count: number;
  rejection_reason: string | null;
  rejected_fields: MemoryRejectedField[];
  reviewed_at: string | null;
  published_until: string | null;
  is_published: boolean;
  publication_days: number;
  /** M-3 resuelta: `published_at` para la «fecha de publicación» de CA-07 (incorporado en `api-010` el 2026-11-13). */
};

export type MemoryRejectInput = {
  rejection_reason: string;
  rejected_fields: MemoryRejectedField[];
};
```

### Notas sobre el contrato

- `image(id)` devuelve el `DownloadedFile` de `http.download`. El nombre de archivo se ignora. El ViewModel comprueba que `blob.type` empiece por `image/` (api-010 CA-08); si no, trata la imagen como error («No se pudo cargar la imagen.»). Es una decisión de este plan, no una regla de negocio.
- `http.download` ya lanza `ApiError` con `status` y `message` en respuestas no 2xx, y llama al manejador 401. No hace falta cambiar `http.ts`.
- El `message` del `ApiError` lleva el texto de la API para los 422 sin campo (CA-10). Los 422 con `errors` se leen de `ApiError.errors`.
- Con `status` 0 o `TypeError` de red, el mapeo lo trata como «red» (`error` con «Reintentar»).
- `publication_days` llega en el detalle (api-010 CA-08). Si faltara, el diálogo de aceptar no muestra el plazo y «Aceptar» queda deshabilitado (decisión de este plan; pregunta 5).

### Errores del contrato

| Código | Origen | Tratamiento en la UI |
|---|---|---|
| 401 | Cualquiera | Lo atiende el manejador global («Tu sesión expiró»); el ViewModel no añade mensaje |
| 403 | Lista, detalle, imagen, acciones (`admin` o sin 2FA) | «No tienes permiso para revisar momentos.» |
| 404 | Detalle | «Petición no encontrada.» |
| 404 | Imagen | Estado `not-found`: «No se pudo cargar la imagen.» y «Aceptar» deshabilitado (CA-18) |
| 422 `errors.image` | Aceptar sin archivo (api-010 CA-11) | Mensaje de la API junto al diálogo; recarga el detalle |
| 422 `errors.rejection_reason` o `errors.rejected_fields` | Rechazar (api-010 CA-28) | Junto al campo; el diálogo no se cierra |
| 422 sin `errors` | Decisión tardía (api-010 CA-13) | Mensaje de la API y recarga del detalle (CA-10) |
| 5xx o red | Cualquiera | «Reintentar» (CA-11) |

### Brechas y supuestos de contrato a confirmar (M-1 a M-3)

Resueltas el 2026-11-13 (ver cada punto). Bloqueaban T-02 (M-1, M-2) y T-08 (M-3).

- **M-1 (campos de la fila de la lista).** `api-010` CA-07 no enumera los campos de cada fila. CA-04 necesita `id`, `status`, `opinion`, `created_at` y `resubmitted_count`. **Resuelta (2026-11-13, Jonathan): se adopta.** Estos campos son el contrato de la fila. `api-010` los enumera desde el 2026-11-13 (plan y tasks, T-08).
- **M-2 (envoltura y paginación).** La lista usa `{ data, meta: { page, limit, has_more } }` (api-010 CA-07). El detalle usa `{ data }`, como el resto de `/api/v1/admin` (`unwrap` de `admin.ts`). **Resuelta (2026-11-13, Jonathan): se adopta**, con el tamaño por defecto de 10 sin enviar `limit`.
- **M-3 (fecha de publicación).** CA-07 pide «la fecha de publicación» para una petición Aceptada, pero `api-010` CA-08 no incluye `published_at` en el detalle. Sin ese campo, la vista solo muestra `published_until` (CA-19). **Resuelta (2026-11-13, Jonathan): se añade `published_at` al detalle** (pregunta 2). Es una opción propuesta por la sesión de documentación, aceptada por Jonathan; la enmienda de `api-010` CA-08 queda incorporada el 2026-11-13 (plan y tasks).

## Seguridad, offline y operación

- **Permisos.** La navegación oculta «Momentos» sin `memories.review`. Ocultar no protege: la API responde 403 a `admin`, `executive`, `cashier` y `veterinarian`, y 403 a `zoo-admin` sin 2FA confirmado (`api-007` CA-25). El cliente no consulta el estado 2FA (`arquitectura.md`).
- **Datos personales.** No se piden ni se muestran nombre ni correo del visitante (spec, decisión de 2026-11-12). Los tipos de `MemoryReviewSummaryDto` y `MemoryReviewDetailDto` no los incluyen. Un test estático lo comprueba (T-13).
- **Imagen.** Solo blob en memoria. La URL `blob:` se revoca al cerrar, al cambiar de petición y al desmontar (CA-17). No se escribe en almacenamiento, no aparece en la URL del navegador y ningún componente la pide.
- **Acceso a `/media`.** La sección nunca construye ni muestra rutas de `/media` (la carpeta `media/memories/` sí se publica, `api-013` RN-16; limitación de la API, riesgo R-6).
- **Opinión.** Se muestra como texto con React (sin `dangerouslySetInnerHTML`). Un test estático lo comprueba (T-13).
- **Sin almacenamiento local (RN-07).** Ni peticiones, ni imágenes, ni opiniones, ni motivos se guardan en el navegador. Test estático (T-13).
- **Efecto del GET de detalle.** Pasa la petición a En proceso (api-010 CA-08). Es idempotente (CA-09 y CA-10 de `api-010`), así que reintentar tras un error de red es seguro. React StrictMode en desarrollo puede repetir el efecto y disparar dos GET; el contador de generación descarta la respuesta sobrante. Riesgo aceptado (R-9).
- **Sin offline.** Sección en línea. Cada apertura vuelve a pedir datos.
- **Rendimiento.** Una imagen por petición abierta, de máximo 5 MB (`api-010` RN-05). Una imagen grande muestra «Cargando la foto…» (CA-06).
- **Errores.** Ningún error deja datos anteriores visibles como actuales (CA-11): cada cambio de petición o de estado limpia el detalle antes de pedir.
- **Observabilidad.** Sin `console.log` de opiniones ni de motivos.
- **Portabilidad.** La sección no depende de Aiven ni de MySQL. Usa el mismo origen y el mismo `/api` que el resto del panel.
- **Operación (`infra/README.md`).** No hay requisito nuevo de servidor: el dashboard ya consume `/api` del mismo origen para todo el panel de administración. `infra/README.md` no cambia en este plan (T-16 lo confirma).

## Accesibilidad y diseño adaptable

- Diálogos con `ConfirmDialog` (`<dialog>` modal de `@arca/ui`): `role="dialog"` y nombre accesible por título; foco atrapado y Escape. Escape y Cancelar no llaman a la API (CA-12, probado en el ViewModel). La devolución del foco al control que abrió el diálogo no la garantiza la plataforma en todos los navegadores: se verifica a mano (T-17).
- Filtro con `<label>` y `<select>`. Campo «Motivo» con `<label>`. Casillas dentro de `<fieldset>` con `<legend>`. Errores de campo con `aria-describedby` y `aria-invalid`.
- Estado de solicitud con icono y texto, no solo color (CA-15).
- Avisos: `role="status"` para éxito, `role="alert"` para errores de decisión (CA-10).
- Botón «Revisar» con `aria-label` que incluye la fecha de envío, para distinguir filas.
- Diseño adaptable: tabla desde 768 px, tarjetas por debajo. Sin desbordamiento horizontal en 360, 768, 1024 y 1366 px (CA-13). La parte estática (reglas de tabla y tarjetas) se prueba en `memory-list.test.tsx`; la parte visual, a mano (T-17).
- Imagen completa y centrada (`object-fit: contain`), con `alt` descriptivo (CA-06).
- Tokens semánticos existentes del `styles.css`. Sin hex ni `rgb()` en los archivos nuevos (CA-15).

## Mapeo de criterios a pruebas

Todas las pruebas están en `apps/dashboard/src/tests/` con Vitest (`npm test` = `vitest run`). El nombre de cada test empieza con el CA y el prefijo `memory-` (`CA-xx memory-…: …`). Como el proyecto no tiene `@testing-library/react`, las vistas se comprueban con render a marcado estático (`react-dom/server`, como `ticket-print-settings.test.tsx`) y la lógica se prueba llamando a las funciones del ViewModel con un cliente simulado y un `BlobPreview` falso. Las interacciones de foco y Escape en el navegador se verifican a mano (T-17).

| Criterio | Prueba automatizada | Archivo |
|---|---|---|
| CA-01 | `CA-01 memory-navigation: «Momentos» solo con memories.review; admin, executive, cashier y veterinarian no la ven` | `memory-navigation.test.tsx` |
| CA-02 | `CA-02 memory-list: pide page y status solo con filtro; «Anterior» y «Siguiente» según has_more; vacío, cargando y error` | `memory-list.test.tsx` y `memory-api-client.test.tsx` |
| CA-03 | `CA-03 memory-list: cambiar el filtro vuelve a pedir la API; «Todas» omite status; Rechazada con su etiqueta` | `memory-list.test.tsx` |
| CA-04 | `CA-04 memory-list: fila con fecha, estado, fragmento y «Revisar»; «Reenviada n veces»; sin datos del visitante` | `memory-list.test.tsx` |
| CA-05 | `CA-05 memory-detail: abrir pide el detalle; la fila vuelve con el estado nuevo al cerrar` | `memory-detail.test.tsx` y `memory-api-client.test.tsx` |
| CA-06 | `CA-06 memory-detail: imagen completa con alt «Foto enviada por un visitante»; opinión como texto; error de imagen` | `memory-detail.test.tsx` |
| CA-07 | `CA-07 memory-detail: acciones por estado; Rechazada y Aceptada solo lectura` | `memory-detail.test.tsx` |
| CA-08 | `CA-08 memory-decisions: diálogo de aceptar con plazo; solo Confirmar llama a accept; éxito recarga el detalle` | `memory-decisions.test.tsx` |
| CA-09 | `CA-09 memory-decisions: rechazo con motivo de 1 a 500 y al menos una casilla; Confirmar deshabilitado; 422 junto al campo` | `memory-decisions.test.tsx` |
| CA-10 | `CA-10 memory-decisions: 422 sin campo muestra el mensaje de la API y recarga el detalle` | `memory-decisions.test.tsx` |
| CA-11 | `CA-11 memory-errors: 401 sin mensaje propio; 403; 404 «Petición no encontrada.»; 422 junto al campo; 5xx o red con Reintentar` | `memory-errors.test.tsx` |
| CA-12 | `CA-12 memory-a11y: diálogos con role dialog y nombre accesible; Cancelar y Escape no llaman a la API` (foco: T-17) | `memory-a11y.test.tsx` y `memory-decisions.test.tsx` |
| CA-13 | `CA-13 memory-list: tabla desde 768 px y tarjetas por debajo; sin reglas de ancho fijo en la sección` (adaptación visual: T-17) | `memory-list.test.tsx` |
| CA-14 | `CA-14 memory-mvvm: views, components y sections sin fetch, axios, services ni @arca/api-client; hooks solo con adminApi` | `memory-mvvm.test.tsx` |
| CA-15 | `CA-15 memory-mvvm: sin hex ni rgb() en los archivos nuevos; estados con icono y texto` | `memory-mvvm.test.tsx` |
| CA-16 | `CA-16 memory-coverage: cada CA-01 a CA-19 aparece en un test memory-*.test.tsx` | `memory-coverage.test.tsx` |
| CA-17 | `CA-17 memory-image: blob creado por el ViewModel; revocado al cerrar, al cambiar y al desmontar; sin almacenamiento local; ningún componente pide la imagen` | `memory-image.test.tsx` |
| CA-18 | `CA-18 memory-detail: imagen 404 muestra «No se pudo cargar la imagen.»; Aceptar deshabilitado con su texto; Rechazar disponible` | `memory-detail.test.tsx` |
| CA-19 | `CA-19 memory-detail: texto de vigencia según is_published; el estado sigue Aceptada` | `memory-detail.test.tsx` |

Pruebas de contrato del cliente (`memory-api-client.test.tsx`): `fetch` simulado que captura método, URL y cuerpo. Cubren las rutas de la tabla de endpoints, `status` omitido en «Todas», `POST` de aceptar sin cuerpo, `POST` de rechazar con `rejected_fields` como array, y que la imagen se pide como ruta relativa sin URL absoluta (RN-09).

Regresión (sin cambios en el diff): `administration-navigation.test.tsx`, `real-staff-login.test.tsx` (la expectativa exacta de navegación de `zoo-admin` no cambia mientras su fixture no incluya `memories.review`), `ticket-sales-quality.test.tsx` (escaneo de `views/`, `components/` y `sections/`), `content-image-display.test.tsx` y `responsive.test.tsx`.

## Riesgos

- **R-1 (paginación, compartido con 010).** `Paginated<T>` y `PaginationBar` no sirven para `has_more`. Mitigación: `HasMorePage<T>` y `HasMorePaginationBar` nuevos y compartidos (pregunta 3). Si `api-010` devuelve otro formato, T-02 se bloquea.
- **R-2 (campos no confirmados).** Sin M-1 a M-3, la fila de la lista y la fecha de publicación no se pueden mostrar como indica la spec. Mitigación: T-01 registra la respuesta; sin ella, T-02 y T-08 no se marcan como hechas.
- **R-3 (vigencia con la hora del navegador).** CA-19 dice «si `published_until` es posterior a ahora», pero RN-04 y CA-14 prohíben calcular plazos en el cliente. Propuesta: usar `is_published` (que la API calcula, `api-010` CA-08). Resuelta (pregunta 5, 2026-11-13): se usa `is_published`. La spec no se modifica; su CA-19 se lee con esa interpretación.
- **R-4 (pruebas de CA-12 y CA-13 sin navegador).** Sin `@testing-library/react` no se prueban foco ni Escape en el DOM, ni el ancho real. Mitigación: pruebas del ViewModel y de marcado estático, más verificación manual en T-17. No se añade dependencia de pruebas (requeriría ADR).
- **R-5 (datos de prueba).** Mobile no envía momentos todavía. Sin peticiones en `arca_pruebas`, la integración no puede hacerse. Mitigación: contratos simulados; datos creados por el backend (pregunta 6). El dashboard no escribe datos de prueba ni SQL.
- **R-6 (imagen pendiente en `/media`).** `media/memories/` se publica por `/media` y la API no controla ese acceso (`api-013` RN-16). La sección no lo evita; es riesgo aceptado de la spec.
- **R-7 (dos personas revisan a la vez).** CA-10 y `api-010` CA-13 resuelven la decisión tardía sin duplicarla.
- **R-8 (memoria).** Un blob de hasta 5 MB por detalle abierto. Se libera al cerrar.
- **R-9 (GET con efecto y StrictMode).** El detalle pasa a En proceso. Idempotente, pero puede generar dos peticiones en desarrollo. Aceptado.
- **R-10 (conflictos en la shell compartida).** `dashboard-shell.ts`, `navigation.ts`, `App.tsx` y `Icon.tsx` los tocan ambos planes. Mitigación: el orden de integración se fija en «Orden y aprobación»; cada plan añade solo sus líneas; `App.tsx` no compila sin ambas claves si ya se integró la otra.
- **R-11 (expectativa de navegación de zoo-admin).** `real-staff-login.test.tsx` fija la lista exacta de navegación de `zoo-admin`. Si su fixture recibiera `memories.review`, habría que actualizar esa expectativa, y eso requiere autorización explícita.

## Alternativas consideradas

- **React Router con `/memories/:id`.** Descartada: requiere ADR 0002 aprobado. Se usa el estado de la shell.
- **`<img src>` directo a `/api/v1/admin/memories/{id}/image`.** Descartada: CA-17 exige que el ViewModel obtenga la imagen, que la URL sea `blob:` y que se revoque al cerrar. Un `src` directo no permite esas garantías ni probarlas.
- **Cambiar `PaginationBar` para aceptar `has_more`.** Descartada: es un componente compartido con otras listas. Se crea uno nuevo (`HasMorePaginationBar`).
- **Calcular `published_until < ahora` en el cliente.** Descartada: contradice RN-04 y CA-14. Se usa `is_published` (R-3).
- **Guardar el borrador del motivo en `localStorage`.** Descartada: RN-07.
- **Leer el estado del 422 de la respuesta de `accept` o `reject`.** Descartada: `api-010` no fija el cuerpo. Se recarga el detalle.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React 19, TypeScript, Vite 7, Tailwind 4 y `@arca/*` ya existentes. Sin dependencias nuevas, sin React Router, sin `package.json` nuevo, sin servicios propietarios. Sin ADR requerido |
| II. La spec manda | Sí | Spec 008 Aprobada (2026-11-12). Plan y `tasks/008-memory-moderation.md` aprobados el 2026-11-13 (Jonathan, en nombre del equipo), con el mismo NNN-slug. Ninguna tarea se ejecuta antes de sus precondiciones |
| III. Lógica separada de la interfaz | Sí, con dependencias | Permisos, estados, transiciones, plazos, visibilidad de la imagen y auditoría los decide la API. La UI solo valida lo que la spec pide como presentación y elige textos según `is_published`. Depende de M-1 a M-3 para no inferir campos |
| IV. Un test por criterio | Sí, con parte manual | CA-01 a CA-19 con test de Vitest nombrado (mapeo). CA-12 y CA-13 tienen test automatizado parcial (ViewModel y marcado) y verificación manual en T-17 para foco, Escape y ancho real (R-4) |
| V. Una sola fuente de verdad para los datos | Sí | El dashboard no crea tablas ni migraciones y no cambia esquema. DBR-012 se usa solo a través de la API. Ningún dato se persiste en el navegador (RN-07). Las acciones quedan en Activitylog de la API (`api-010` CA-19) |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés (`memoryReview`, `memories`, `memory-review`, `HasMorePage`). Textos de UI en español. Nombres de test en español con el CA en inglés de la spec |

Sin excepciones aprobadas. No requiere ADR. Ninguna dependencia nueva.

## Orden y aprobación

### Dependencias y secuencia

1. **Precondiciones (T-01):** `api-010` fase 1 y `api-013` Aprobadas; M-1 a M-3 respondidas; respuestas a las preguntas 1 a 8; coordinación de la shell con `dashboard-010` acordada.
2. **Cliente de API (T-02).** Tipos y métodos de `memoryReview`. Pruebas de contrato simuladas.
3. **Shell y compartido (T-03, T-04).** Navegación y helpers. Son puntos de conflicto con 010: se integran con el orden de «Coordinación».
4. **Lista (T-05, T-06).**
5. **Detalle (T-07, T-08).**
6. **Decisiones y errores (T-09 a T-12).**
7. **Transversal (T-13 a T-15).** Pruebas de regla y regresión.
8. **Documentación y verificación (T-16 a T-19).**

Bloqueos: T-02 requiere M-1 y M-2 confirmados. T-08 requiere M-3 o la decisión de la pregunta 2. T-17 requiere `api-010` fase 1 implementada en `arca_pruebas` y datos de prueba (pregunta 6).

### Orden de integración con dashboard-010

El primero que se integre crea `HasMorePage<T>` (en `packages/api-client/admin-types.ts`), `components/HasMorePaginationBar.tsx` y `services/blob-preview.ts`. El segundo los reutiliza sin cambiarlos. Este plan propone que 008 vaya primero por tener el contrato más cerrado (pendiente de la decisión de la pregunta 3). Cada integración toca `App.tsx` y `navigation.ts` y debe añadir su clave antes de compilar.

### Aprobaciones requeridas

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec 008 | Aprobada (2026-11-12, Jonathan) |
| Equipo técnico | Este plan, su Constitution Check y las preguntas 1 a 8 | Aprobado: Jonathan, responsable de backend, en nombre del equipo, 2026-11-13 |
| Backend | Contrato de `api-010` fase 1 (M-1 a M-3) y `api-013` CA-10 | Aprobado: Jonathan, responsable de backend, 2026-11-13 (M-1 y M-2 aceptadas; M-3 como `published_at`, incorporada en `api-010`) |
| Frontend del dashboard y responsable de `dashboard-010` | Coordinación de la shell y de componentes compartidos | Aprobado: Jonathan (coordina las sesiones de Claude Code), 2026-11-13 |
| Backend o responsable de datos | Datos de prueba en `arca_pruebas` y asignación de `memories.review` a un `zoo-admin` de prueba | Enfoque aprobado: Jonathan, responsable de backend, 2026-11-13 (datos creados por el backend). La creación sigue pendiente |

## Preguntas (resueltas el 2026-11-13)

Máximo 8 por ronda (`AGENTS.md`).

1. **Contrato de la lista (M-1 y M-2).** ¿`api-010` confirma los campos de cada fila (`id`, `status`, `opinion`, `created_at`, `resubmitted_count`), la envoltura `{ data, meta: { page, limit, has_more } }` y el tamaño por defecto de 10 sin enviar `limit`? **Resuelta (2026-11-13, Jonathan): sí.** Los campos quedan como contrato de la fila; `api-010` los incorpora en su plan y tasks (2026-11-13).
2. **Fecha de publicación (M-3).** CA-07 pide «la fecha de publicación» para una petición Aceptada, pero el detalle de `api-010` CA-08 no incluye `published_at`. ¿Se añade al detalle o la vista solo muestra `published_until`?
   **Resuelta (2026-11-13, Jonathan): se añade `published_at` al detalle de `api-010` CA-08.** Opción propuesta por la sesión de documentación, aceptada por Jonathan: la spec de 008 CA-07 pide la fecha de publicación. Incorporada en `api-010` (plan y tasks, 2026-11-13).
3. **Paginación compartida con 010.** ¿`HasMorePage<T>` y `HasMorePaginationBar` los crea 008 (propuesta, por ser el primero) y 010 los reutiliza? ¿Y 010 cambia su lista de solicitudes de `Paginated` (con total) a `HasMorePage`, ya que su CA-02 también dice `meta.has_more`? **Resuelta (2026-11-13, Jonathan): sí.** 008 crea primero `HasMorePage<T>` y `HasMorePaginationBar`; 010 los reutiliza y cambia sus listas (solicitudes y publicadas) de `Paginated` a `HasMorePage`, porque `api-014` devuelve `meta.has_more` y no total. El orden de integración es 008 primero.
4. **Orden de la navegación.** ¿Se acepta Usuarios → Momentos → Solicitudes de especies → Especies publicadas? Requiere el visto bueno del responsable de `dashboard-010`. **Resuelta (2026-11-13, Jonathan): sí.** Queda confirmar con el responsable de `dashboard-010` si no es la misma persona.
5. **Imagen, plazo y vigencia (CA-18, CA-19).** (a) ¿«Aceptar» queda deshabilitado mientras la imagen carga (propuesta) y también si falla por 5xx o red, además del 404 que fija la spec? (b) ¿El texto de vigencia usa `is_published` (propuesta) en lugar de comparar `published_until` con la hora del navegador, como sugiere CA-19? Si la respuesta a (b) es comparar con la hora, habrá que revisar RN-04 y CA-14. **Resuelta (2026-11-13, Jonathan):** (a) «Aceptar» queda deshabilitado mientras carga la imagen y también si falla por 5xx o red (la extensión a error es opción propuesta por la sesión de documentación, aceptada por Jonathan). (b) Se usa `is_published`; RN-04 y CA-14 se mantienen.
6. **Datos de prueba.** Sin mobile, ¿quién crea peticiones de prueba en `arca_pruebas` (seeder o comando del backend, nunca SQL del dashboard), y quién asigna `memories.review` a un `zoo-admin` de prueba (`api-010` CA-16)? **Resuelta (2026-11-13, Jonathan): el backend.** Las peticiones de prueba las crea el backend con seeder o comando, nunca con SQL del dashboard. `memories.review` lo asigna `RolesAndPermissionsSeeder` a `zoo-admin` (`api-010` T-06).
7. **Acceso por URL (CA-01).** ¿Se acepta que «abrir por otra vía» se verifique con la respuesta 403 de la API (sin ruta propia), igual que la pregunta 2 de `dashboard-010`? **Resuelta (2026-11-13, Jonathan): sí.**
8. **Textos propuestos.** ¿Aprueba el responsable funcional los textos de este plan: el mensaje del diálogo de aceptar («…durante {N} días…» y «1 día»), el del diálogo de rechazar, el aviso «Petición aceptada.», «Reenviada 1 vez» y «Reenviada {n} veces», el fragmento de 120 caracteres y los mensajes de error de lista y detalle? **Resuelta (2026-11-13, Jonathan): se adoptan los textos propuestos** (opción propuesta por la sesión de documentación, aceptada por Jonathan).

Decisiones tomadas en este plan (no preguntas): el ViewModel recarga el detalle tras aceptar o rechazar; `blob.type` debe empezar por `image/`; el GET de detalle se acepta como idempotente en StrictMode; `status` se omite en «Todas»; el icono nuevo es `camera`; no se modifica `PaginationBar`, `ConfirmDialog`, `image-field.ts`, `image-preview.ts` ni `http.ts`.
