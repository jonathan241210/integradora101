# Arquitectura de `apps/dashboard`

## Estado y alcance

- La autenticación del personal es actual conforme a `dashboard-002-real-staff-login`.
- Las secciones de administración (Panel principal, Noticias, Eventos, Reporte de boletos, Recintos y Usuarios) están conectadas a la API (`api-007`) conforme a `dashboard-003-administration-sections`.
- Venta, Historial y Precios están conectados a la API (`api-009`) conforme a `dashboard-005-ticket-sales`; ya no hay datos ficticios ni `DemoBanner`. El buscador y el botón de notificaciones de la barra superior siguen siendo de demostración (el centro de notificaciones, el modal de acuse y el polling están diferidos).
- La publicación de especies en TulanPedia (`dashboard-010`: entrada única «TulanPedia» con las pestañas «Solicitudes» y «Publicadas», solo con `species.review`, esto es `zoo-admin`) está **en progreso**: las tareas de cliente T-02 a T-22, T-25 y T-26 están escritas y probadas con cliente simulado; la verificación manual (T-27), la verificación cruzada (T-23) y el cierre (T-28, T-29) siguen pendientes y la spec no pasa a «Implementada» sin esa evidencia.
- La moderación de momentos (`dashboard-008`: sección «Momentos», solo con `memories.review`, esto es `zoo-admin`) está **en progreso**: las tareas de cliente T-02 a T-16 están escritas y probadas con respuestas simuladas del contrato de `api-010` (aún no implementado en esta rama); la integración con la API (T-17), la verificación (T-18) y el cierre (T-19) siguen pendientes y la spec no pasa a «Implementada» sin esa evidencia.
- No hay React Router ni integración de pagos. La única persistencia local es la preferencia de impresión del boleto (`localStorage`, excepción acotada `dashboard-005` RN-12). La exportación del reporte la genera la API; CSV, Excel y PDF están habilitados en la API (ADR 0017 aceptado); el error «Formato de exportación no disponible.» queda para un formato fuera de la lista habilitada y el PDF responde 422 si el periodo supera el tope de boletos.

## Actores

| Perfil | Destino | Acceso visible |
|---|---|---|
| `admin` | `administration` | Secciones permitidas por sus permisos; requiere 2FA |
| `zoo-admin` | `administration` | Secciones permitidas por sus permisos; requiere 2FA |
| `executive` | `executive` | Panel y reporte de solo lectura |
| `cashier` | `ticket` | Venta, Historial propio (con cancelación) e impresión configurable |
| `veterinarian` | `pwa` | Redirección a `pwa_url`; la PWA tendrá su propio login |

Los permisos efectivos se aplican en la API. La navegación del dashboard solo presenta las secciones asociadas con `home` y `permissions` de `GET /api/v1/auth/me`; no sustituye la autorización del servidor.

## Módulos y flujo

| Módulo | Responsabilidad |
|---|---|
| `LoginView` | Correo institucional, contraseña, feedback y control accesible para mostrar/ocultar |
| `TwoFactorChallengeView` | Enviar código TOTP o código de recuperación |
| `TwoFactorSetupView` | Mostrar QR, confirmar TOTP y presentar códigos de recuperación una sola vez |
| `PwaRedirectView` | Informar y redirigir a veterinaria cuando `pwa_url` está configurada |
| `useAuthSession` | ViewModel de sesión: comprobación inicial, login, reto, enrolamiento, expiración y logout |
| `navigation` | Traducir `home` y permisos a las secciones que se pueden presentar (Usuarios solo con `users.manage` desde el 2026-11-05) |
| `useDashboardShell` / `dashboard-shell` | Sección activa, menú móvil y aviso; navega solo a secciones de la lista de `navigation` (sin datos de demostración) |
| `TicketSaleSection`, `TicketHistorySection`, `TicketPricesSection` y sus Views | Venta (solo `cashier`), Historial (cancelación solo si la API marca `cancellable`; lectura para `admin` y `zoo-admin`) y Precios (`ticket-prices.manage`) |
| `useTicketSale`, `useTicketHistory`, `useTicketPrices`, `useTicketPrintSettings` | ViewModels sobre `ticketSalesApi` (`createTicketSalesApi`); la configuración de impresión se lee y escribe en `localStorage` con `try/catch`. `useTicketSale` pide `sales.quote` al abrir la confirmación y guarda `quote.status` (`loading`, `ready`, `error`); solo confirma con `ready`, sin reintento automático, e ignora respuestas tardías con un identificador de solicitud |
| `TicketReceipt`, `PrintSettingsDialog`, `CancelTicketDialog` | Un boleto imprimible por unidad vendida (tipo, precio, folio y QR siempre; QR como `<img>` con data URI). En pantalla solo se listan folio, tipo y precio; los boletos fluyen en la impresión con `break-inside: avoid`. También configuración de impresión y cancelación con motivo |
| `UsersSection`, `NewsSection`, `EventsSection`, `EnclosuresSection`, `DashboardSection`, `TicketReportSection` | Contenedores delgados: llaman a su hook ViewModel solo cuando la sección se abre y pasan el resultado a la View |
| `UsersView`, `NewsView`, `EventsView`, `EnclosuresView`, `DashboardView`, `TicketReportView` | Presentación por props, sin lógica ni llamadas a la API |
| `useStaffAccounts`, `useNewsManagement`, `useEventsManagement`, `useEnclosuresManagement`, `useDashboardSummary`, `useTicketReport` | ViewModels (uno por sección) sobre `adminApi` de `@arca/api-client` |
| `DataTable`, `PaginationBar`, `ConfirmDialog`, `FieldErrors`, `ListStatusMessage`, `NoticeBar`, `SalesTotals` | Componentes locales con las clases y tokens del `styles.css` vigente (`ConfirmDialog` solo lo usan Venta y Precios) |
| `FormPanel`, `FormField`, `InlineFormFooter`, `InlineConfirm`, `InlinePasswordReset`, `ImageUploadBox`, `ContentCardActions`, `ContentThumbnail` | `dashboard-004`: formulario fijo y minimizable (`aria-expanded`/`aria-controls`), confirmación y campo de contraseña en línea (Escape cancela, foco inicial en «Cancelar»), caja de imagen con selector y arrastrar y soltar nativos, y tarjetas con miniatura |
| `@arca/api-client` | Encapsular solicitudes JSON, cookie Sanctum y CSRF; es reutilizable por la PWA |

`App.tsx` compone las vistas según el estado de autenticación. Ninguna sección muestra aviso de demostración.

## API consumida

`@arca/api-client` usa la respuesta de `me` bajo `data` y normaliza el perfil. Todos los endpoints se originan en `api-003`.

| Método y ruta | Uso |
|---|---|
| `GET /sanctum/csrf-cookie` | Preparar cookie CSRF antes de operaciones de escritura |
| `POST /api/v1/auth/login` | Login institucional |
| `POST /api/v1/auth/two-factor-challenge` | Reto TOTP o de recuperación |
| `GET /api/v1/auth/me` | Identidad, roles, permisos, destino y estado 2FA |
| `POST /api/v1/auth/logout` | Cierre de sesión |
| `POST /api/v1/auth/user/two-factor-authentication` | Iniciar enrolamiento |
| `GET /api/v1/auth/user/two-factor-qr-code` | Obtener el QR SVG |
| `POST /api/v1/auth/user/confirmed-two-factor-authentication` | Confirmar el TOTP |
| `GET /api/v1/auth/user/two-factor-recovery-codes` | Obtener códigos para mostrarlos una vez |

## Venta de boletos (`dashboard-005`)

- Navegación por permisos: «Venta» (`tickets.create`, solo `cashier`), «Historial» (`tickets.view`) y «Precios» (`ticket-prices.manage`).
- Los precios, totales, `cancellable` y reglas de cancelación (día, dueño, límites por tipo) los decide la API; el cliente solo muestra sus mensajes. El historial envía `timezone` del dispositivo solo para presentación; la cancelación no lo envía.
- Fechas del historial en `dd/mm/aaaa HH:mm` en la zona del dispositivo (`formatTicketDateTime`). `effective_at` de un cambio programado se envía en ISO 8601 con desfase.
- Impresión: `window.print` mediante `services/printer.ts`; `@media print` deja visible solo `.ticket-receipt` con `--ticket-width`, `--ticket-margin` y `--ticket-font`. Preferencias en `arca:ticket-print-settings` (formato térmica 58/80 mm o carta, fuente, márgenes 2 mm/15 mm por defecto, campos y pie ≤ 80 caracteres); si `localStorage` falla se usan los valores por defecto. No se guardan ventas, tokens ni SVG.
- Un 403 `two_factor_setup_required` en Precios muestra un mensaje en español; el cliente no consulta el estado 2FA.

## Secciones de administración

Estructura de cada sección conectada:

```
View (props)  ←  Section (contenedor)  ←  hook ViewModel  →  reducer/funciones puras  →  @arca/api-client  →  API
```

- `src/views/*View.tsx`: reciben `state` y `actions`; no importan `services/` ni `@arca/api-client` (los tipos de DTO se reexportan desde `viewmodels/admin-types.ts`).
- `src/sections/*Section.tsx`: llaman al hook de su sección; así las listas se piden solo al abrir cada sección.
- `src/viewmodels/<tema>.ts`: estado, reducer y funciones asíncronas que reciben el cliente (`AdminApi`) como parámetro, por lo que se prueban con un cliente simulado. `managed-list.ts` concentra el estado común de Recintos (carga, vacío, error, diálogo, aviso, errores 422 por campo); Noticias, Eventos y Usuarios usan `inline-list.ts` (`editing`, `pendingAction`, `formExpanded`, `form`, `formError`, `fieldErrors`), con `inline-content.ts` como motor compartido de Noticias y Eventos, `image-field.ts` (validación de ayuda JPG/PNG/WebP ≤ 5 MB) y `services/image-preview.ts` (vista previa local con `URL.createObjectURL`, inyectable) y `api-errors.ts` traduce `ApiError`. El 401 lo atiende el manejador global de sesión ("Tu sesión expiró"); los ViewModels no lo duplican.
- Los roles asignables, el alcance de cuentas, las validaciones, los totales y los periodos (`previous_date`/`next_date`) los entrega la API; el cliente no los calcula. Los importes llegan como cadena y solo se formatean.
- La contraseña de restablecimiento vive en el estado local de `InlinePasswordReset`, se envía y se descarta; no pasa por ningún reducer. La contraseña inicial del alta de Usuarios se conserva en el formulario del ViewModel solo hasta guardar con éxito (para respetar lo escrito ante un 422) y se descarta al volver al modo de alta.
- Noticias, Eventos y Usuarios (`dashboard-004`) no usan diálogos: el formulario es fijo en la página dentro de un `FormPanel` minimizable y las confirmaciones (desactivar/activar, eliminar, restablecer contraseña o 2FA) se piden en línea dentro de la tarjeta o fila, una a la vez por sección. Noticias y Eventos suben la imagen con `multipart/form-data` (edición con archivo: `POST` + `_method=PATCH`) mediante `@arca/api-client`; el archivo y su vista previa viven solo en memoria. Las demás confirmaciones del dashboard (Venta y Precios) siguen con `ConfirmDialog` sobre el `Dialog` de `@arca/ui`.

Endpoints consumidos (todos bajo `/api/v1/admin`, de `api-007`): `users` (lista, opciones, alta, edición, estado, baja, contraseña y 2FA), `news`, `events`, `enclosures`, `dashboard` y `reports/tickets` (con `/export`). Ver `packages/api-client/README.md`.

## Publicación de especies (`dashboard-010`, en progreso)

Una sola sección del shell, visible solo con `species.review`: `tulanpedia` («TulanPedia»), con las pestañas «Solicitudes» y «Publicadas» (`TulanpediaSection`, `TulanpediaTabs`, `role="tablist"`/`tab`/`tabpanel`). La pestaña activa se refleja en la URL como `?section=tulanpedia&tab=requests|published` con `history.replaceState` (decisión A2, sin router; `viewmodels/tulanpedia-tab.ts` y `useTulanpediaTab.ts`); al salir se quitan los parámetros y el detalle no tiene URL propia (CA-65). Una entrada con esos parámetros solo abre TulanPedia si el usuario tiene `species.review`. Consumen `api-014`; `api-015` (lectura pública) no se consume aquí. La API decide estados, transiciones, elegibilidad y permisos (RN-01); el cliente solo presenta lo que devuelve y calcula estado de formulario (`dirty`) y validación de presentación que la API repite.

- **Solicitudes de especies:** lista con filtro de estado (Todas, Pendiente, Publicada, Rechazada) y paginación `has_more`; detalle con datos actuales frente a propuestos, fotos (blob en memoria), edición de la ficha, «Aceptar y publicar», «Aceptar sin publicar» (solo si la especie está despublicada) y «Rechazar» con motivo de 1 a 500 caracteres. Aceptar y publicar quedan deshabilitados con cambios sin guardar.
- **Especies publicadas:** lista con filtros de estado (Todas, Publicadas, Despublicadas) y de tipo de animal, miniaturas (blob de `GET /species/{id}/image`, solo con `has_image`) y «Solicitud pendiente». Detalle con «Despublicar» (publicada), «Editar» y «Republicar» (despublicada), y un bloque propio «Eliminar publicación». «Editar» y «Republicar» aparecen deshabilitados con el aviso «Esta especie tiene una solicitud pendiente. Revísala en la pestaña Solicitudes.» y el enlace «Ver la solicitud» (`PendingRequestNotice`, CA-64), que abre la pestaña «Solicitudes» con el filtro «Pendiente» (decisión A1; no identifica la solicitud concreta), mientras `has_pending_request` sea verdadero. Los tres diálogos usan `ConfirmDialog`; eliminar no lleva casilla.
- **ViewModels:** `viewmodels/species-publication-shared.ts` (etiquetas, validadores de texto y foto, mapeo de errores por sección con `describeSpeciesError`, `isStateConflict`, borrador de ficha `draftFromSheet`/`buildSheetUpdate`/`sheetIsDirty`, contador de generación), `species-requests.ts` y `useSpeciesRequests.ts` (solicitudes), `published-species.ts` y `usePublishedSpecies.ts` (publicadas). Las funciones reciben el cliente por contexto y se prueban con un cliente simulado; los hooks solo llaman a `adminApi`. Lista y detalle tienen contador de generación propio: una respuesta tardía no escribe en el estado.
- **Views y componentes:** `views/SpeciesRequestsView.tsx`, `SpeciesRequestDetailView.tsx`, `PublishedSpeciesView.tsx`, `PublishedSpeciesDetailView.tsx`; `components/SpeciesFichaForm.tsx` (formulario compartido por la edición de una solicitud y la de una especie despublicada), `SpeciesPhoto.tsx`, `SpeciesStatusBadge.tsx` y `RejectSpeciesRequestDialog.tsx`. Sin `fetch`, `axios` ni `services/`.
- **Errores (CA-17, CA-58):** `401` lo atiende el manejador global («Tu sesión expiró.»); `403` muestra «No tienes permiso para revisar solicitudes de especies.» o «No tienes permiso para gestionar especies publicadas.»; `404`, «Solicitud no encontrada.» o «Especie no encontrada.»; `5xx` o red, «Reintentar». Un `422` de estado llega de la API bajo las claves `status` o `species` (no son campos de formulario): la vista muestra el mensaje y recarga; un `422` por campo queda junto al campo.
- **Estado de la especie en el detalle:** `GET /species/{id}/publication` devuelve `publication_status` con prioridad `pending` > `published` > `unpublished` > `not_published` (api-014 RN-18). Una especie con solicitud pendiente llega como `pending`, por lo que los botones se deciden con `is_published`, `unpublished_at` y `has_pending_request`, no con `publication_status` aislado.
- **Imágenes y datos locales:** las fotos se descargan con `http.download` y se muestran como URL `blob:` que se revoca al cambiar de página o especie y al desmontar (RN-10); ninguna respuesta ni vista usa `image_url` ni rutas `/media` (CA-44). No se guarda nada en `localStorage` ni `sessionStorage`.

Endpoints (todos bajo `/api/v1/admin`): `species-publication-requests` (lista, detalle, `PATCH`, `accept`, `reject`, `image`) y `published-species` (lista), `species/{id}/publication` (`GET`, `PATCH`, `DELETE`), `species/{id}/unpublish`, `species/{id}/republish` y `species/{id}/image`. Ver `packages/api-client/README.md`.

## Moderación de momentos (`dashboard-008`, en progreso)

Una sección del shell, `memories` («Momentos»), visible solo con `memories.review` (después de «Usuarios»). Consume `api-010` (revisión) y `api-013` (ruta autenticada de la imagen); la API decide estados, transiciones, plazos, permisos y auditoría (RN-01, RN-03, RN-04). El permiso solo muestra u oculta la sección: ocultarla no la protege, y quien llegue por otra vía recibe 403 y el aviso «No tienes permiso para revisar momentos.».

- **Lista:** filtro «Estado» (Todas, Enviada, En proceso, Aceptada, Rechazada; «Todas» no envía `status`; por defecto Enviada), tabla `DataTable` con fecha de envío, estado con icono y texto, fragmento de la opinión (120 caracteres), «Reenviada n veces» y «Revisar». Paginación de 10 con `has_more` (`HasMorePaginationBar`, compartida con `dashboard-010`). No muestra datos del visitante.
- **Detalle:** `GET /memories/{id}` pasa la petición de Enviada a En proceso en la API; el dashboard no envía nada más. Opinión como texto, imagen completa (`object-fit: contain`) y bloque de decisión según `status`: Enviada o En proceso ofrecen «Aceptar» y «Rechazar»; Rechazada y Aceptada son de solo lectura («Esperando la corrección del visitante.», motivo y casillas; fecha de publicación `published_at` y vigencia según `is_published`). Sin imagen, mientras carga o con error, «Aceptar» queda deshabilitado («No se puede aceptar sin la imagen.» si no está disponible); «Rechazar» sigue disponible.
- **Decisiones:** «Aceptar» abre un diálogo con `publication_days` de la API; «Rechazar» pide un motivo de 1 a 500 caracteres y al menos una de las casillas «La foto» (`image`) y «La opinión» (`content`). Tras aceptar o rechazar, el ViewModel vuelve a pedir el detalle (el cuerpo de `accept` y `reject` no se usa). Un `422` sin campo o con `errors.status` (decisión tardía) muestra el mensaje de la API en `role="alert"` y recarga; un `422` de `rejection_reason` o `rejected_fields` queda junto al campo y el de `errors.image` dentro del diálogo.
- **Imagen (CA-17):** `memoryReview.image(id)` (`http.download`, ruta relativa del mismo origen por el proxy de `/api`, sin CORS) devuelve un blob; el ViewModel comprueba que `blob.type` empiece por `image/` y crea la URL `blob:` con `services/image-preview.ts`. La URL se revoca al cerrar el detalle, al cambiar de petición y al desmontar (`MemoryDetailSection` se monta con `key` por id). No se guarda nada en `localStorage`, `sessionStorage`, IndexedDB ni cookies, y la imagen no aparece en la URL.
- **ViewModels:** `viewmodels/memory-review-shared.ts` (etiquetas, validadores del motivo, textos de diálogos, mapeo de errores, `BlobPreview`; reutiliza `createGeneration` de `dashboard-010`), `memory-review.ts` (reducers y funciones con cliente y vista previa inyectados) y los hooks `useMemoryReviewList.ts` y `useMemoryReviewDetail.ts`, que solo llaman a `adminApi.memoryReview`. Lista y detalle tienen contador de generación propio.
- **Errores (CA-11):** `401` lo atiende el manejador global («Tu sesión expiró.»); `403` «No tienes permiso para revisar momentos.»; `404` «Petición no encontrada.»; `5xx` o red, «Reintentar». Ningún error deja datos anteriores visibles como actuales.

Endpoints (todos bajo `/api/v1/admin`): `memories` (lista), `memories/{id}` (detalle), `memories/{id}/image`, `memories/{id}/accept` y `memories/{id}/reject`. Ver `packages/api-client/README.md`. Sin requisito nuevo de servidor: `infra/README.md` no cambia (el proxy de `/api` ya existe).

## Patrón y estructura

La SPA sigue MVVM:

- **View:** componentes React en `src/views/` y la shell `src/App.tsx`.
- **ViewModel de autenticación:** reducer y orquestación en `src/viewmodels/auth-session.ts`; hook delgado en `useAuthSession.ts`.
- **ViewModel de navegación:** `src/viewmodels/navigation.ts`.
- **Servicios:** `src/services/arca-api.ts` crea las instancias compartidas `authApi` y `adminApi`; `src/services/save-file.ts` entrega al navegador los archivos exportados.
- **Shell:** `dashboard-shell.ts` y `useDashboardShell.ts` (sin datos de demostración). `printer.ts` y `ticketSalesApi` en `services/`.

Las vistas, componentes, secciones y `App.tsx` no llaman a `fetch` ni a `axios`. El uso de `fetch` queda encapsulado en `packages/api-client`.

## Desarrollo local

Vite usa el puerto `5174` con `strictPort`; la PWA usa `5173`. El proxy de `/api` y `/sanctum` apunta a `process.env.ARCA_API_PROXY_TARGET ?? 'http://localhost:8000'` y conserva el origen `localhost:5174` para Sanctum.

## Seguridad y datos

- La cookie de sesión HttpOnly y CSRF pertenecen a la API; las credenciales no se guardan en almacenamiento del navegador.
- Los códigos de recuperación permanecen en memoria mientras se presentan y se descartan al confirmar que fueron guardados.
- El QR se representa mediante un `<img>` con URI SVG codificada; no se usa `innerHTML` ni `dangerouslySetInnerHTML`.
- Si `pwa_url` está vacío, la vista veterinaria explica que la aplicación no está configurada y no intenta una redirección ni muestra un enlace roto.
- `localStorage` solo guarda la preferencia de impresión (`arca:ticket-print-settings`); nunca ventas, boletos, precios, tokens ni el SVG del QR.
- Los datos personales del personal (nombre, correo, área, rol) solo viven en el estado de React de la sección abierta; no se persisten en el navegador.
- `download` valida que la respuesta sea 2xx antes de crear el `Blob` y sanea el nombre de archivo.

## Diagrama

```mermaid
flowchart LR
  Staff[Personal] --> Views[Login, 2FA y vistas React]
  Views --> App[App.tsx]
  App --> VM[useAuthSession]
  VM --> Client[@arca/api-client]
  Client --> API[API Laravel api-003]
  API --> Me[Perfil, roles, permisos y home]
  Me --> Navigation[navigation ViewModel]
  Navigation --> Sections[Secciones de administración]
  Sections --> AdminVM[Hooks ViewModel por sección]
  AdminVM --> Client
  Navigation --> Taquilla[Venta, Historial y Precios]
  Taquilla --> AdminVM
  Views --> UI[@arca/ui y @arca/tokens]
```
