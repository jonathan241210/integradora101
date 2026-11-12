# Plan técnico · 010 · public-content-management

- Spec: `apps/dashboard/specs/010-public-content-management.md`
- Estado de spec: Aprobada (2026-11-12, Jonathan, responsable de backend).
- Estado de este plan: **Borrador, pendiente de aprobación técnica.** No aprobado. No se ejecuta ninguna tarea de `apps/dashboard/tasks/010-public-content-management.md` hasta que el equipo lo apruebe.
- Responsable técnico: por identificar (frontend del dashboard).
- Fecha del borrador: 2026-11-12.
- Dependencias de contrato (aprobadas, **sin implementar**): `api-014` (solicitudes y publicación de especie), `api-015` (lectura pública de especies publicadas). `api-013` no se usa directamente desde el dashboard.
- Dependencia de datos: DBR-013 aprobada por BD y backend el 2026-11-12; migración `2026_11_12_000013_species_publication_requests_schema` **aplicada en `arca_pruebas`** (lote 5), verificada el 2026-11-12; DBR-013 en «Lista para backend». Pendiente de BD: EXPLAIN y registro de fecha y responsable. La prueba de integración contra la API real depende de que `api-014` y `api-015` estén implementadas.

## Diseño de solución

Se añaden dos secciones a la shell del dashboard, ambas con permiso de navegación `species.review`:

- **Solicitudes de especies** (`species-requests`): bandeja de solicitudes de publicación enviadas por el veterinario, con lista por estado, detalle con comparación «Datos actuales» frente a «Datos propuestos», edición previa a la decisión, aceptar (con o sin publicar cuando la especie está despublicada) y rechazar con motivo.
- **Especies publicadas** (`published-species`): gestión de la publicación de especies existentes: lista de publicadas y despublicadas, despublicar, republicar, editar la ficha de una especie despublicada y eliminar la publicación.

La API es la única autoridad de permisos, estados, transiciones, elegibilidad, publicación y auditoría (RN-01). La UI presenta lo que la API devuelve y solo calcula lo que la spec define como estado de formulario o validación de presentación (ver «Límites de cálculo en la UI»).

### Capas (MVVM explícito, `apps/dashboard/AGENTS.md` y `apps/dashboard/docs/arquitectura.md`)

```
View (components/, views/: props, sin lógica)
  ← Section (sections/: llama a su hook y pasa el resultado a la View)
  ← hook ViewModel (viewmodels/useSpeciesRequests.ts, viewmodels/usePublishedSpecies.ts)
      → reducer y funciones puras con cliente inyectado (viewmodels/species-requests.ts, viewmodels/published-species.ts)
      → adminApi de @arca/api-client (services/arca-api.ts)
  → API /api/v1/admin (api-014, api-015 no se consumen aquí)
```

Reglas de la capa:

- Ningún archivo de `views/`, `components/` ni `sections/` importa `services/`, `@arca/api-client` ni usa `fetch`/`axios`. Los tipos de DTO se reexportan desde `viewmodels/admin-types.ts`.
- Los hooks ViewModel llaman solo a `adminApi`. El 401 lo atiende el manejador global de sesión (`dashboard-002` CA-08); los ViewModels no lo duplican.
- Las respuestas tardías se descartan con un contador de generación (mismo patrón que `useTicketPrices`): al cambiar de filtro, de solicitud o de especie, la respuesta anterior no escribe en el estado.
- Ningún dato se guarda en el navegador: sin `localStorage`, `sessionStorage` ni caché (RN-10).

### Límites de cálculo en la UI

| Permitido en el cliente | No permitido en el cliente |
|---|---|
| Etiquetas en español para estados, tipo de solicitud y tipo de animal (`viewmodels/species-publication-shared.ts`) | Decidir estados, transiciones, elegibilidad o permisos (RN-01) |
| Validación de presentación que la API repite: texto obligatorio o máximo (1-500 motivo, 150 correcciones, espacios sobrantes), tipo y tamaño de foto (JPG/PNG, 5 MB), contador «245/500» | Calcular `publication_status`, `has_pending_request`, `next_request_type` a partir de otros campos |
| Estado de formulario: si hay cambios sin guardar (`dirty`), que deshabilita «Aceptar…» y «Republicar» (CA-10, decisión de la spec) | Precios, totales o cualquier regla de negocio |
| Qué casillas y botones se muestran a partir de flags que entrega la API (`publication_status`, `is_published`, `has_pending_request`) | Inferir «Especie despublicada» a partir de `published_at` (ver G-1 y G-3) |

## Pantallas y estados del cliente

No hay React Router (ADR 0002 sin aprobar). La navegación es el estado de `useDashboardShell` (`activeSection`). La lista y el detalle viven en la misma sección y se controlan con `view: "list" | "detail"` y `selectedId` en el ViewModel.

| Pantalla | Id de shell | Permiso de navegación | Contenido | CA principales |
|---|---|---|---|---|
| Solicitudes de especies, lista | `species-requests` | `species.review` | Filtro de estado (Todas, Pendiente, Publicada, Rechazada), tabla o tarjetas, paginación «Anterior»/«Siguiente» | CA-01 a CA-04 |
| Solicitudes de especies, detalle | `species-requests` (vista detalle) | `species.review` | Comparación actual/propuesto, foto, acciones según estado, edición, diálogos | CA-05 a CA-16, CA-61, CA-62 |
| Especies publicadas, lista | `published-species` | `species.review` | Filtros de estado (Todas, Publicadas, Despublicadas) y tipo, miniatura, paginación | CA-50 a CA-52 |
| Especies publicadas, detalle | `published-species` (vista detalle) | `species.review` | Ficha, acciones (despublicar, republicar, editar), bloque «Eliminar publicación», diálogos | CA-53 a CA-59 |

Estados de carga, error y vacío (por lista y por detalle):

| Estado | Lista | Detalle |
|---|---|---|
| `loading` | «Cargando solicitudes…» / «Cargando especies…» (`ListStatusMessage`) | «Cargando solicitud…» con la foto en espera |
| `ready` | Filas | Datos y acciones |
| `empty` | «No hay solicitudes con este estado.» / «No hay especies con este estado.» | No aplica |
| `error` | Aviso con «Reintentar»; no se muestran filas anteriores (CA-04) | Aviso con «Reintentar»; no se muestran datos anteriores (CA-17, CA-58) |
| `not-found` (404) | No aplica | «Solicitud no encontrada.» o «Especie no encontrada.» con «Volver a la lista» |

La foto tiene sus propios estados: `loading` (placeholder), `ready` (blob), `error` («No se pudo cargar la foto.», CA-06) y `none` («Sin foto»).

### Estado del ViewModel (solicitudes)

- Lista: `status` (`""`, `submitted`, `accepted`, `rejected`), `page`, `items`, `hasMore`, `loadState`.
- Detalle: `detail` (DTO de la API), `photo` (URL `blob:` y su estado), `mode` (`read` | `edit`), `draft`, `dirty`, `fieldErrors`, `pendingAction` (`null` | `accept-publish` | `accept-unpublished` | `reject`), `busy`, `notice`.
- Al cerrar el detalle o cambiar de solicitud: se revoca la URL `blob:` de la foto (CA-06, CA-49) y se descartan `draft` y foto elegida.

### Acciones según estado (decididas por flags de la API)

| Estado de la solicitud | Acciones visibles |
|---|---|
| `submitted` | «Editar», «Aceptar y publicar» (primaria, deshabilitada con `dirty`), «Aceptar sin publicar» (solo si `current.publication_status` es `unpublished`), «Rechazar» |
| `accepted` | Solo lectura, «Publicada en el catálogo» |
| `rejected` | Solo lectura, motivo visible |

En la lista: `submitted` y `accepted` muestran «Revisar»; `rejected` muestra «Ver» (CA-15).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API | Ninguno | Este plan no cambia `apps/api`. Ver «Contrato y datos» para las enmiendas que se piden a `api-014` (G-1 a G-3). |
| `packages/api-client` | `admin-types.ts` (DTO y entradas), `admin.ts` (namespaces `speciesPublicationRequests` y `publishedSpecies`), `index.ts` (exports), `README.md` (documentación de métodos) | Métodos y tipos de los endpoints de `api-014`. Sin lógica de negocio. `http.ts` no cambia: la subida se hace con `FormData` y `_method=PATCH`; la foto se descarga con `http.download`. |
| Dashboard, shell | `viewmodels/dashboard-shell.ts` (`DashboardSection` + `species-requests`, `published-species`), `viewmodels/navigation.ts` (dos candidatos con `species.review`), `App.tsx` (títulos y render) | Navegación y composición. |
| Dashboard, icono | `components/Icon.tsx` (solo si falta un icono) | Icono de navegación y de estado (sin dependencia nueva). |
| Dashboard, ViewModels | `viewmodels/species-publication-shared.ts` (etiquetas, validadores de foto y texto, mapeo de errores por sección, contador de generación), `viewmodels/species-requests.ts` (reducer y funciones), `viewmodels/useSpeciesRequests.ts`, `viewmodels/published-species.ts`, `viewmodels/usePublishedSpecies.ts`, `viewmodels/admin-types.ts` (reexport de los DTO nuevos) | Estado, validación de presentación y llamadas vía `adminApi`. |
| Dashboard, secciones | `sections/SpeciesRequestsSection.tsx`, `sections/PublishedSpeciesSection.tsx` | Contenedores delgados: llaman a su hook solo al abrir la sección. |
| Dashboard, views | `views/SpeciesRequestsView.tsx`, `views/SpeciesRequestDetailView.tsx`, `views/PublishedSpeciesView.tsx`, `views/PublishedSpeciesDetailView.tsx` | Presentación por props. |
| Dashboard, components | `components/SpeciesPhoto.tsx` (caja de foto con estados y `alt`), `components/SpeciesFichaForm.tsx` (formulario compartido por la edición de solicitud y la de especie despublicada), `components/SpeciesStatusBadge.tsx` (icono y texto), `components/RejectSpeciesRequestDialog.tsx` (sobre `ConfirmDialog`, con contador) | Piezas reutilizables. Los diálogos de confirmación usan `ConfirmDialog` existente. |
| Dashboard, estilos | `styles.css` (bloque nuevo `dashboard-010`, con tokens semánticos y sin hex de marca) | Diseño adaptable: lista en tabla desde 768 px y en tarjetas por debajo; detalle en dos columnas desde 768 px. Se revisan los breakpoints existentes para reutilizarlos. |
| Dashboard, pruebas | `src/tests/species-*.test.tsx` (ver «Mapeo de criterios a pruebas») | Vitest, un test por CA. |
| Documentación | `apps/dashboard/docs/arquitectura.md` (secciones, endpoints y ViewModels nuevos), `packages/api-client/README.md` | Referencia duradera, actualizada en el mismo PR. |

## Contrato y datos

Todas las rutas son de `/api/v1/admin` (`api-007`, `api-014`) y pasan por la cookie Sanctum y el CSRF de `http`. Ningún endpoint se llama desde componentes.

### Endpoints consumidos

| Cliente (`@arca/api-client`) | Método y ruta | Entrada | Respuesta usada | Spec |
|---|---|---|---|---|
| `speciesPublicationRequests.list({ status?, page? })` | `GET /species-publication-requests?status=&page=` | Filtro `status` (omitido en «Todas») y `page` | `Paginated<SpeciesRequestSummaryDto>` | api-014 CA-05 |
| `speciesPublicationRequests.get(id)` | `GET /species-publication-requests/{id}` | — | `SpeciesRequestDetailDto` | api-014 CA-06 |
| `speciesPublicationRequests.update(id, input)` | `PATCH /species-publication-requests/{id}` (sin archivo); `POST` con `_method=PATCH` (con archivo) | Solo campos cambiados y `image` opcional | `SpeciesRequestDetailDto` | api-014 CA-14 a CA-17, CA-21 a CA-23, CA-25; G1 |
| `speciesPublicationRequests.accept(id, { publish })` | `POST /species-publication-requests/{id}/accept` | `{ publish: boolean }` | `SpeciesPublicationDetailDto` (**no** la solicitud) | api-014 CA-08 |
| `speciesPublicationRequests.reject(id, { rejection_reason })` | `POST /species-publication-requests/{id}/reject` | `{ rejection_reason: string }` | Se ignora el cuerpo; el ViewModel recarga el detalle | api-014 CA-10 |
| `speciesPublicationRequests.image(id)` | `GET /species-publication-requests/{id}/image` | — | `DownloadedFile` (blob) | api-014 CA-06, RN-08 |
| `publishedSpecies.list({ status?, category?, page? })` | `GET /published-species?status=&category=&page=` | Filtros opcionales | `Paginated<PublishedSpeciesRowDto>` | api-014 CA-40 |
| `publishedSpecies.get(id)` | `GET /species/{id}/publication` | — | `SpeciesPublicationDetailDto` | api-014 CA-37 |
| `publishedSpecies.update(id, input)` | `PATCH /species/{id}/publication` (sin archivo); `POST` con `_method=PATCH` (con archivo) | Campos cambiados y `image` opcional | `SpeciesPublicationDetailDto` | api-014 CA-37 |
| `publishedSpecies.unpublish(id)` | `POST /species/{id}/unpublish` | — | `SpeciesPublicationDetailDto` | api-014 CA-35 |
| `publishedSpecies.republish(id)` | `POST /species/{id}/republish` | — | `SpeciesPublicationDetailDto` | api-014 CA-36 |
| `publishedSpecies.removePublication(id)` | `DELETE /species/{id}/publication` | — | `SpeciesPublicationDetailDto` | api-014 CA-38 |
| `publishedSpecies.image(id)` | `GET /species/{id}/image` | — | `DownloadedFile` (blob) | api-014 CA-40 |

Las rutas Laravel nombradas (`admin.species-publication-requests.*`, `admin.species.publication.*`, `admin.species.unpublish`, `admin.species.republish`, `admin.species.image`, `api-014` pregunta 19) son la referencia del servidor; el cliente llama por ruta literal, como el resto de `admin.ts`.

### Tipos (en `packages/api-client/admin-types.ts`)

```ts
export type SpeciesCategory = "mammal" | "bird" | "reptile" | "amphibian" | "fish" | "invertebrate";
export type SpeciesRequestStatus = "submitted" | "accepted" | "rejected";
export type SpeciesRequestType = "publish" | "update";
export type SpeciesPublicationStatus = "not_published" | "pending" | "published" | "unpublished";
/** Claves de la ficha pública que el dashboard ofrece en v1 (api-014 pregunta 3: sin campos extra). */
export type SpeciesFichaField = "scientific_name" | "origin" | "habitat";

export type SpeciesRequestSummaryDto = {
  id: number;
  species_id: number;
  common_name: string;
  scientific_name: string | null;
  category: SpeciesCategory | null;
  request_type: SpeciesRequestType;
  status: SpeciesRequestStatus;
  created_at: string;
  veterinarian_name: string | null;
  /** Pendiente de api-014 (G-1). */
  publication_status: SpeciesPublicationStatus;
};

export type SpeciesRequestDetailDto = {
  id: number;
  /** Pendiente de api-014 (G-2): hoy solo viene en la fila de la lista. */
  species_id: number;
  status: SpeciesRequestStatus;
  request_type: SpeciesRequestType;
  created_at: string;
  veterinarian_name: string | null;
  rejection_reason: string | null;
  published_fields: string[];
  current: {
    common_name: string;
    scientific_name: string | null;
    habitat: string | null;
    origin: string | null;
    category: SpeciesCategory | null;
    is_published: boolean;
    published_at: string | null;
    has_image: boolean;
    /** Pendiente de api-014 (G-3). */
    publication_status: SpeciesPublicationStatus;
  };
  proposed: {
    scientific_name: string | null;
    habitat: string | null;
    origin: string | null;
    category: SpeciesCategory | null;
    published_fields: string[];
    has_new_photo: boolean;
  };
};

/** Campos cambiados al editar una solicitud pendiente (api-014 CA-15). Vacío = sin corrección (CA-30). */
export type SpeciesRequestUpdateInput = {
  scientific_name?: string;
  habitat?: string;
  origin?: string;
  category?: SpeciesCategory;
  published_fields?: SpeciesFichaField[];
  image?: File | null;
};

export type PublishedSpeciesRowDto = {
  id: number;
  common_name: string;
  scientific_name: string | null;
  category: SpeciesCategory | null;
  status: "published" | "unpublished";
  published_at: string | null;
  unpublished_at: string | null;
  has_image: boolean;
  has_pending_request: boolean;
};

export type SpeciesPublicationDetailDto = {
  id: number;
  common_name: string;
  scientific_name: string | null;
  habitat: string | null;
  origin: string | null;
  category: SpeciesCategory | null;
  publication_status: SpeciesPublicationStatus;
  is_published: boolean;
  published_at: string | null;
  unpublished_at: string | null;
  published_fields: string[];
  has_image: boolean;
  has_pending_request: boolean;
};

export type SpeciesPublicationUpdateInput = SpeciesRequestUpdateInput;
```

Notas sobre el contrato:

- `published_fields` se envía como **cadena JSON** de un array de claves (`api-014` CA-21, texto literal), tanto en JSON como en multipart. Pregunta 4.
- En la edición, el cliente envía solo los campos que cambian (`api-014` CA-15 y la spec CA-07). Una corrección vacía se envía como `""` y la API la guarda como NULL (CA-30). `category` es obligatorio en el formulario; si no cambia, no se envía. Pregunta 5.
- El `PATCH` con archivo usa `contentFormData(…, "PATCH")` ya existente en `admin.ts` (mismo patrón que noticias y eventos).
- Ninguna respuesta de la API contiene URL de foto. El cliente no construye rutas de `/media` (CA-44).

### Brechas de contrato detectadas (divergencias con `api-014`)

Estas brechas impiden cumplir la spec tal como está escrita. No se corrigen en este plan: se piden a `api-014` como enmienda de contrato.

- **G-1 (CA-03, CA-15).** La fila de la lista (`api-014` CA-05) no incluye si la especie está despublicada. CA-03 exige la etiqueta «Especie despublicada» en la lista. Pedido: añadir `publication_status` a la fila.
- **G-2 (CA-06, CA-44).** El detalle (`api-014` CA-06) no incluye `species_id`. La foto publicada se pide por `GET /species/{id}/image`. Mientras no se añada, el cliente toma `species_id` de la fila de la lista. Pedido: añadirlo al detalle.
- **G-3 (RN-01, CA-62, CA-52).** El detalle no trae `publication_status` de la especie. Sin él, la UI tendría que deducir si ofrece «Aceptar sin publicar» (decisión de la spec: solo con especie despublicada). Pedido: añadir `current.publication_status` (`api-014` RN-18).
- **G-4 (CA-08, CA-11).** `api-014` CA-08 dice que `accept` responde con el detalle de publicación de la especie, no con la solicitud. El ViewModel recarga el detalle de la solicitud tras cada `200`. No requiere cambio de contrato, solo se documenta.

## Seguridad, offline y operación

- **Permisos.** La navegación oculta las secciones sin `species.review`. Ocultar no protege: la API responde `401`/`403` y la UI muestra el mensaje de CA-17 o CA-58. La 2FA la exige la API; el cliente no consulta el estado 2FA (`arquitectura.md`). Pregunta 6.
- **Datos personales.** `veterinarian_name` solo se muestra a `species.review`. No se guarda fuera del estado de React de la sección abierta.
- **Fotos.** Se piden por ruta autenticada y se muestran como `blob:` en memoria. Se revocan al cerrar el detalle, al cambiar de solicitud o de especie, al cambiar de página en la lista de publicadas y al desmontar la sección. La vista previa de la foto elegida se revoca al cancelar (CA-49).
- **Sin almacenamiento local.** Ni solicitudes, ni fotos, ni motivos ni especies se guardan en el navegador (RN-10). Un test estático lo comprueba (T-22).
- **Sin offline.** Sección en línea. Cada apertura de la sección vuelve a pedir datos.
- **Rendimiento.** La lista de publicadas pide una miniatura por fila con foto (máximo 10 por página). Se revocan al cambiar de página. Si resulta lento, se pasa a carga diferida (riesgo R-4).
- **Errores de red.** Un fallo de red o `5xx` muestra error con «Reintentar» (CA-17, CA-58). `ApiError` ya trae `status`, `code` y `errors`.
- **Observabilidad.** Sin registros de datos personales en consola. Sin dependencias nuevas.
- **Portabilidad.** La sección no depende de Aiven ni de MySQL. Corre igual en local y en el ambiente que sirva la API.

## Accesibilidad y diseño adaptable

- Los diálogos usan `ConfirmDialog` (`<dialog>` modal de `@arca/ui`: foco atrapado y Escape). Con `role="dialog"` y nombre accesible por título. Devolver el foco al control que abrió el diálogo no lo garantiza la plataforma en todos los casos: se verifica a mano (T-27).
- Filtros con `<label>` y `<select>`. Casillas de la ficha con etiqueta visible. Errores de campo con `aria-describedby` y `aria-invalid`. Avisos con `NoticeBar` y `aria-live`.
- El estado de solicitud se muestra con icono y texto, no solo color (CA-03).
- El contador de motivo («245/500») se anuncia con `aria-live="polite"` solo al cruzar el límite, para no saturar lectores de pantalla.
- Diseño adaptable: tabla desde 768 px y tarjetas por debajo. Detalle en dos columnas desde 768 px, una columna por debajo. Sin desbordamiento horizontal en 360, 768, 1024 y 1366 px (T-27).
- La spec no tiene CA propio de accesibilidad ni de diseño adaptable. Su verificación se liga a CA-16 y CA-59 y a la verificación manual T-27, y se propone como decisión de equipo en la revisión del plan.
- Tokens semánticos (`--surface-subtle`, colores de texto y de estado del tema). Sin hex ni `rgb()` en componentes (`arquitectura.md`).

## Mapeo de criterios a pruebas

Todas las pruebas están en `apps/dashboard/src/tests/` con Vitest (`npm test` = `vitest run`). El nombre de cada test empieza con el CA (`CA-xx species-…: …`). Como el proyecto no tiene `@testing-library/react`, las vistas se comprueban con render a marcado estático (`react-dom/server`, como `ticket-print-settings.test.tsx`) y la lógica se prueba llamando a las funciones del ViewModel con un cliente simulado. La parte de interacción de diálogos (foco, Escape) se verifica a mano (T-27).

| Criterio | Prueba automatizada | Archivo |
|---|---|---|
| CA-01 | `CA-01 species-navigation: «Solicitudes de especies» solo con species.review; sin permiso, el aviso de denegado` | `species-navigation.test.tsx` |
| CA-02 | `CA-02 species-requests-list: la lista pide status y page; «Todas» omite status; sin filtrado en cliente` | `species-api-client.test.tsx` y `species-requests-list.test.tsx` |
| CA-03 | `CA-03 species-requests-list: la fila muestra tipo, «Especie despublicada», truncado a 60 y estado con icono` | `species-requests-list.test.tsx` |
| CA-04 | `CA-04 species-requests-list: vacío, cargando y error con Reintentar; sin filas anteriores` | `species-requests-list.test.tsx` |
| CA-05 | `CA-05 species-request-detail: comparación actual/propuesto, sin URL de foto en el DTO` | `species-request-detail.test.tsx` |
| CA-06 | `CA-06 species-request-detail: foto blob con alt, revocación al cerrar o cambiar, 404 «No se pudo cargar la foto.»` | `species-request-detail.test.tsx` |
| CA-07 | `CA-07 species-request-edit: formulario con nombre común como texto; PATCH solo con campos cambiados; foto con POST y _method` | `species-request-edit.test.tsx` y `species-api-client.test.tsx` |
| CA-08 | `CA-08 species-request-edit: máximo 150, vacío «Vacío: se mantiene el valor actual.», 422 junto al campo, Cancelar sin llamada` | `species-request-edit.test.tsx` |
| CA-09 | `CA-09 species-request-edit: sin «Editar» en Publicada o Rechazada; 422 «ya fue revisada» recarga` | `species-request-edit.test.tsx` |
| CA-10 | `CA-10 species-request-decisions: aceptar deshabilitado con cambios sin guardar; republicar igual (CA-10 published-species)` | `species-request-decisions.test.tsx` y `published-species-edit.test.tsx` |
| CA-11 | `CA-11 species-request-decisions: diálogo con textos; publish true solo al confirmar; Cancelar no llama` | `species-request-decisions.test.tsx` |
| CA-12 | `CA-12 species-request-decisions: 422 de decisión tardía recarga y no cambia nada más` | `species-request-decisions.test.tsx` |
| CA-13 | `CA-13 species-request-decisions: rechazo con motivo obligatorio, contador y Confirmar deshabilitado; sin llamada al cancelar` | `species-request-decisions.test.tsx` |
| CA-14 | `CA-14 species-request-decisions: éxito muestra motivo y aviso; 422 de motivo junto al campo` | `species-request-decisions.test.tsx` |
| CA-15 | `CA-15 species-request-detail: acciones por estado; «Revisar» o «Ver» en la lista` | `species-request-detail.test.tsx` y `species-requests-list.test.tsx` |
| CA-16 | `CA-16 species-request-decisions: diálogos con role dialog y nombre accesible` (foco y Escape: T-27) | `species-request-decisions.test.tsx` |
| CA-17 | `CA-17 species-errors: 403, 404 y 5xx por sección; 401 sin lógica propia` | `species-errors.test.tsx` |
| CA-18 a CA-38 | Retirados. Ningún test los nombra (T-25 lo comprueba) | — |
| CA-40 | Cruzado: `api-015` (CA-01, CA-18) y `web-011` (CA-02). Sin test en el dashboard. Evidencia en PR | T-23 |
| CA-41 | Cruzado: `api-015` (CA-01, CA-17, CA-18), `api-014` (CA-31, CA-32), `web-011` (CA-02, CA-24). Sin test en el dashboard | T-23 |
| CA-42 | Cruzado: `web-011` (CA-08). Sin test en el dashboard | T-23 |
| CA-43 | PHPUnit de `api-014` (CA-08, CA-10, CA-39) y revisión del ADR 0026. Sin test en el dashboard | T-24 |
| CA-44 | `CA-44 species-request-detail: sin image_url ni rutas de /media en el código de la sección` | `species-request-detail.test.tsx` y `species-publication-mvvm.test.tsx` |
| CA-45 | Regresión: `content-image-display.test.tsx` y `administration-quality.test.tsx` en verde, sin cambios | Existentes (T-22) |
| CA-46 | `CA-46 species-publication-coverage: cada CA vigente aparece en un test nombrado` | `species-publication-coverage.test.tsx` |
| CA-47 | Revisión documental: `dashboard-009` con nota «Integrada en dashboard-010»; `dashboard-008` sin nota | T-24 |
| CA-48 | Cruzado: `web-011` (CA-03, CA-04, CA-22). Sin test en el dashboard | T-23 |
| CA-49 | `CA-49 species-request-edit: vista previa blob con alt, revocación al cancelar y validación JPG/PNG 5 MB` | `species-request-edit.test.tsx` y `species-shared.test.tsx` |
| CA-50 | `CA-50 species-navigation: «Especies publicadas» con species.review` | `species-navigation.test.tsx` |
| CA-51 | `CA-51 published-species-list: status y category en la query; paginación; «Sin foto»; vacío` | `published-species-list.test.tsx` y `species-api-client.test.tsx` |
| CA-52 | `CA-52 published-species-list: acciones por estado (publicada, despublicada, solicitud pendiente)` | `published-species-list.test.tsx` |
| CA-53 | `CA-53 published-species-actions: diálogo de despublicar; POST solo al confirmar; 422 recarga` | `published-species-actions.test.tsx` |
| CA-54 | `CA-54 published-species-actions: diálogo de republicar; 422 por foto o datos ausentes con pista a «Editar»` | `published-species-actions.test.tsx` |
| CA-55 | `CA-55 published-species-edit: PATCH sin publicar; Republicar deshabilitado con cambios; 422 junto al campo; Cancelar sin llamada` | `published-species-edit.test.tsx` |
| CA-56 | `CA-56 published-species-actions: bloque propio; diálogo con título, texto y dos botones exactos; sin casilla` | `published-species-actions.test.tsx` |
| CA-57 | `CA-57 published-species-list: Editar y Republicar deshabilitados con aviso y enlace; Despublicar y Eliminar disponibles` | `published-species-list.test.tsx` y `published-species-actions.test.tsx` |
| CA-58 | `CA-58 species-errors: errores de la sección de publicadas por estado` | `species-errors.test.tsx` |
| CA-59 | `CA-59 published-species-actions: diálogos con role dialog y nombre accesible` (foco y Escape: T-27) | `published-species-actions.test.tsx` |
| CA-60 | `CA-60 species-publication-mvvm: views, components y sections sin fetch ni axios; sin cálculo de estados` | `species-publication-mvvm.test.tsx` |
| CA-61 | `CA-61 species-request-detail: etiqueta «Especie despublicada» y aviso de catálogo` | `species-request-detail.test.tsx` |
| CA-62 | `CA-62 species-request-decisions: dos acciones en despublicada con publish true o false; una en publicada o sin publicar` | `species-request-decisions.test.tsx` |

Pruebas de contrato del cliente (`species-api-client.test.tsx`): `fetch` simulado que captura método, URL y cuerpo. Cubren las rutas y bodies de la tabla de endpoints, incluido `POST` con `_method=PATCH` cuando hay archivo y `published_fields` como cadena JSON.

Pruebas de regla visual: no se añaden. Las reglas de tamaño y de adaptación se verifican a mano (T-27).

## Riesgos

- **R-1 (bloqueo de integración, parcialmente resuelto).** DBR-013 está aplicada en `arca_pruebas` (2026-11-12). La prueba de integración contra la API real sigue sin poder hacerse hasta que `api-014` y `api-015` estén implementadas. Mitigación: las pruebas de cliente usan el contrato de esta spec; la integración y el cierre quedan en T-27 y T-29.
- **R-2 (brechas de contrato G-1 a G-3).** Sin los campos, la UI no puede mostrar la etiqueta ni la acción correctas sin deducir estado (incumple RN-01). Mitigación: pedir la enmienda a `api-014` antes de T-07 y T-09. Si no llega, la tarea queda bloqueada, no se resuelve en la UI.
- **R-3 (sin router).** «Abrir por URL» (CA-01, CA-50) no existe en una SPA sin React Router. Mitigación: el aviso de denegado aparece cuando la API responde 403 a la sección. Pregunta 2.
- **R-4 (rendimiento de miniaturas).** Una petición de foto por fila en la lista de publicadas (máximo 10). Mitigación: revocación al cambiar de página y, si hace falta, carga diferida con `IntersectionObserver` (decisión en T-16).
- **R-5 (diálogos nativos y foco).** La apertura y el cierre del `<dialog>` los gestiona la plataforma; el retorno de foco puede variar según navegador. Mitigación: verificación manual en T-27.
- **R-6 (sin testing-library).** Las pruebas de interacción pasan por el ViewModel y por marcado estático. Añadir `@testing-library/react` exige ADR (`AGENTS.md`); no se propone en este plan.
- **R-7 (decisiones de la spec aplicadas a pruebas).** Eliminar la publicación no revierte correcciones (RN-16). Las decisiones válidas para pruebas (A, G1, G2 y G3 de `api-014`) se mantienen y se anotan en `arquitectura.md`.
- **R-8 (fotos públicas en pruebas).** `media/species-requests/` y `media/species/` son alcanzables por `/media` en pruebas (ADR 0026, riesgo m). La sección no lo evita y no lo muestra. Riesgo aceptado para pruebas, sin cambio aquí.
- **R-9 (etiquetas propuestas).** Las etiquetas de tipo de animal (Mamífero, Ave, Reptil, Anfibio, Pez, Invertebrado) y «Área de distribución natural» son propuestas de este plan. Pendiente de confirmación de producto (ver T-27).

## Alternativas consideradas

- **React Router para `/species-requests`.** Descartada: requiere ADR 0002 aprobado. Se usa el estado de shell existente.
- **Calcular `publication_status` en el cliente.** Descartada: incumple RN-01 y CA-60. Se pide el campo a `api-014` (G-1, G-3).
- **Guardar la foto o el borrador en `localStorage`.** Descartada: incumple RN-10 y la regla de la Constitución V para datos.
- **Un único ViewModel para ambas secciones.** Descartada: las dos secciones tienen estados, permisos de navegación y contratos distintos. Comparten solo `species-publication-shared.ts` y `SpeciesFichaForm`.
- **Subir la foto con `PATCH` directo.** Descartada: PHP no entrega multipart en `PATCH` (`api-014` G1). Se usa `POST` con `_method=PATCH`, como en noticias y eventos.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React 19, TypeScript, Vite 7, Tailwind 4 y `@arca/*` ya existentes. Sin dependencias nuevas, sin React Router, sin librerías de iconos ni de pruebas. Sin servicios propietarios. Sin ADR requerido. |
| II. La spec manda | Sí, con pendiente | Spec 010 Aprobada (2026-11-12). Este plan y su `tasks/010-public-content-management.md` comparten NNN-slug. Pendiente: aprobación técnica del plan y de las tareas. Ninguna tarea se ejecuta antes. |
| III. Lógica separada de la interfaz | Sí, con dependencias | Permisos, estados, elegibilidad y publicación los decide la API. La UI usa `publication_status`, `is_published`, `has_pending_request` tal como llegan. Depende de G-1 a G-3 para no deducir estado. Validaciones de presentación (longitud, tipo y tamaño de foto) se repiten en la API. |
| IV. Un test por criterio | Sí, con cruzados | CA-01 a CA-17 y CA-49 a CA-62 con test de Vitest nombrado (mapeo). CA-18 a CA-38 retirados. CA-40, CA-41, CA-42 y CA-48 se verifican en `api-015`, `api-014` y `web-011`, sin test en el dashboard. CA-43 y CA-47 son documentales. Pregunta 7. |
| V. Una sola fuente de verdad para los datos | Sí | El dashboard no crea tablas ni migraciones y no cambia esquema. Ningún dato se persiste en el navegador (RN-10). Las acciones quedan auditadas en la API (Activitylog). |
| VI. Código en inglés, personas en español | Sí | Identificadores en inglés (`speciesPublicationRequests`, `publishedSpecies`, `species-requests`, `published-species`). Textos de UI en español. Nombres de test en español con el CA en inglés de la spec. |

Sin excepciones aprobadas. No requiere ADR.

## Dependencias y orden de implementación

1. **Precondiciones (T-01):** `api-014` y `api-015` aprobadas; enmiendas G-1 a G-3 pedidas o rechazadas; respuestas a las preguntas de este plan.
2. **Cliente de API (T-02, T-03):** tipos y métodos de `packages/api-client`, con pruebas de contrato.
3. **Compartido y navegación (T-04, T-05).**
4. **Solicitudes (T-06 a T-15):** lista, detalle, foto, edición, decisiones, diálogos y errores.
5. **Especies publicadas (T-16 a T-21):** lista, acciones, edición de despublicada, errores y arquitectura.
6. **Imágenes, cruzados y documentales (T-22 a T-24).**
7. **Cobertura, documentación y entrega (T-25 a T-29).**

**Bloqueos:** T-07 y T-09 requieren G-1 y G-3 (o una decisión de la pregunta 1). La integración de T-27 requiere DBR-013 «Lista para backend» y las implementaciones de `api-014` y `api-015`.

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec 010 | Aprobada (2026-11-12, Jonathan) |
| Equipo técnico | Este plan, su Constitution Check y las preguntas 1 a 8 | **Pendiente** |
| Backend | Enmiendas G-1 a G-3 a `api-014` | **Pendiente** |
| Responsable de BD | Aplicación de DBR-013 en `arca_pruebas` con evidencia | **Aplicada** (lote 5, verificada el 2026-11-12). Pendiente de BD: EXPLAIN y registro de fecha y responsable |

## Preguntas abiertas

Máximo 8 por ronda (`AGENTS.md`).

1. **Contrato `api-014` (G-1, G-2, G-3).** ¿Se añaden a `api-014` (CA-05 y CA-06) `publication_status` en la fila de la lista, `species_id` en el detalle y `current.publication_status` en el detalle? Propuesta: sí, como enmienda de contrato. Sin ello, T-07 y T-09 quedan bloqueadas.
2. **Navegación sin router.** ¿Se acepta que «abrir por URL» (CA-01, CA-50) se verifique con la respuesta 403 de la sección y no con una ruta propia? Cualquier ruta propia exige ADR 0002.
3. **Inicio de la UI.** ¿Pueden empezar T-02 a T-22 con pruebas de contrato simuladas antes de «Lista para backend»? `apps/dashboard/AGENTS.md` dice que la implementación espera a DBR-013 «Lista para backend». Propuesta: sí para cliente y ViewModels; la integración y el cierre quedan después.
4. **Formato de `published_fields`.** ¿Se envía como cadena JSON también en el cuerpo JSON (literal de `api-014` CA-21) o como array? Propuesta: cadena JSON en ambos casos.
5. **`category` en el PATCH.** ¿Un PATCH que omite `category` mantiene la corrección anterior (`api-014` CA-25 no lo dice)? Propuesta: el formulario envía `category` siempre que se guarda; los demás campos, solo si cambian.
6. **2FA sin confirmar.** ¿Qué respuesta devuelve la API a un usuario con `species.review` sin 2FA confirmado (estado y código)? Propuesta: 403 y el mensaje de la sección, sin mensaje específico.
7. **Brecha en CA-40, CA-41, CA-42 y CA-48.** Son verificaciones de `api-015` y `web-011`, sin test en el dashboard. ¿Basta con la evidencia de esas specs para cumplir la Constitución IV en `dashboard-010`?
8. **Texto «Petición no encontrada.» (CA-17).** No corresponde a ninguna acción de estas secciones. Propuesta: sustituirlo por «Solicitud no encontrada.» o «Especie no encontrada.» según la sección, o confirmar a qué recurso se refiere.

Decisiones tomadas en el plan, no preguntas: etiquetas de tipo de animal propuestas (R-9); accesibilidad y diseño adaptable verificados por T-27 sin CA propio; `http.ts` sin cambios; la foto se descarga con `http.download`.
