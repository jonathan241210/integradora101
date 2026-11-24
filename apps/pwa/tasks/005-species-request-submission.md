# Tareas · 005 · species-request-submission

- Spec: `apps/pwa/specs/005-species-request-submission.md` (Aprobada)
- Plan: `apps/pwa/plan/005-species-request-submission.md` (Aprobado)
- Estado de este checklist: **Aprobado**. En implementación.
- Solicitada: 2026-11-19
- Aprobada: 2026-11-19
- Dependencia externa: `apps/api/tasks/014-species-requests.md` **T-30** (`published_fields` en el selector). Bloquea CA-09 y CA-14 en actualizaciones y en especies despublicadas.

Convenciones de este checklist:
- Los tests de la PWA van en `apps/pwa/src/tests/` (Vitest, entorno `node`, `renderToStaticMarkup`, sin dependencias nuevas). Cada `describe` empieza con `CA-xx PWA solicitud de publicación: …`.
- Las comprobaciones de foco, interacción con radios y navegador real son verificaciones manuales (T-46), no tests automáticos.
- Cada CA-xx tiene su propia tarea de test (T-19 a T-37). Las RN-xx tienen tareas T-38 a T-42. RN-05, RN-09 y RN-10 se cubren por revisión y por el aviso de CA-03 (T-21, T-46).

## Base de datos (responsable de BD)

- [x] **T-00** (CA-02, CA-05, CA-13, CA-16; RN-03): DBR-013 aplicada en `arca_pruebas`, lote 5 (`2026_11_12_000013_species_publication_requests_schema`, estado Ran). Consulta de solo lectura por la sesión principal, sin divergencias con DBR-013. **Sin migración nueva ni DBR nueva** para esta feature.

## Prerrequisito API

- [x] **T-01** (CA-09, CA-14; RN-07): completar `apps/api/tasks/014-species-requests.md` **T-30**: `published_fields` en `GET /api/v1/veterinarian/species` (fuente `species.published_fields`, `null` si nunca se publicó; test `test_ca26_selector_exposes_published_fields`).
  - Archivos (en `apps/api`, no en esta app): `apps/api/src/app/Http/Resources/Veterinarian/SelectableSpeciesResource.php`, `VeterinarianSelectorTest.php`.
  - Bloquea: la precarga de la ficha pública en actualizaciones y especies despublicadas (CA-09 y CA-14). T-27 y T-32 incluyen esos casos y no se dan por cumplidas hasta que T-01 esté hecha. El resto de la PWA puede avanzar con el contrato actual.
  - Hecho cuando: el test PHPUnit pasa en `arca_pruebas` y la evidencia la aporta la sesión principal. Cerrada: api-014 T-30 hecha y su test pasa (confirmado por la sesión principal).

## Implementación api-client (`packages/api-client`)

- [x] **T-02** (CA-02, CA-05, CA-13, CA-16, CA-17; RN-02, RN-06): crear `packages/api-client/veterinarian-types.ts`.
  - Tipos: `SelectableSpeciesDto` (`id`, `common_name`, `scientific_name`, `habitat`, `origin`, `category`, `publication_status`, `next_request_type`, `last_rejection_reason`, `published_fields`), `OwnSpeciesRequestDto` (`id`, `species_id`, `common_name`, `request_type`, `status`, `created_at`, `reviewed_at`, `rejection_reason`, `species_publication_status`), `SubmitSpeciesRequestInput` (`species_id`, `category`, correcciones opcionales, `published_fields`, `image`), `SubmittedSpeciesRequestDto`.
  - Reutiliza tipos de `admin-types.ts` (`SpeciesCategory`, `SpeciesRequestType`, `SpeciesFichaField`, `SpeciesPublicationStatus`) sin moverlos.
  - Sin métodos de alta de especie (RN-02, RN-06).
  - Hecho cuando: `tsc -b` de `apps/pwa` compila con los tipos importados.

- [x] **T-03** (CA-13, CA-16, CA-17): crear `packages/api-client/veterinarian.ts` con `createVeterinarianApi(http)` y los métodos de lectura.
  - `species.list()`: `GET /api/v1/veterinarian/species`, desenvuelve `data`.
  - `publicationRequests.list(page)`: `GET /api/v1/veterinarian/species-publication-requests`, añade `?page=` solo si `page > 1`, devuelve `{ data, meta: { has_more } }`.
  - Helper `unwrap` local (no compartido con `admin.ts`).
  - Hecho cuando: el paquete compila; la prueba de lectura se escribe en T-23 o T-34 según el caso.

- [x] **T-04** (CA-02, CA-05, CA-08, CA-10, CA-12; RN-02): en `packages/api-client/veterinarian.ts`, método `publicationRequests.submit(input)` y función exportada `buildSpeciesRequestFormData(input)`.
  - Campos: `species_id`, `category`, `scientific_name`, `habitat`, `origin` (valores tal cual; la API guarda NULL si no cambian), `published_fields` como cadena JSON (incluido `[]`), `image` solo si hay archivo.
  - No envía `common_name`, `species` ni tipo de envío.
  - `POST` con `FormData` (el cliente HTTP no fija `Content-Type` en multipart).
  - Los errores 422 llegan con `errors` intacto (no se usa el wrapper de `apiClient.ts`).
  - Hecho cuando: el paquete compila y T-23 y T-28 pueden probarlo con `fetchImpl` simulado.

- [x] **T-05** (CA-19; RN-04): exportar `createVeterinarianApi` y los tipos nuevos desde `packages/api-client/index.ts`.
  - Sin dependencias nuevas en `packages/api-client/package.json` ni en `apps/pwa/package.json`.
  - Hecho cuando: `apps/pwa` importa desde `@arca/api-client` sin error de tipos.

## Implementación PWA: servicios, sesión y navegación (`apps/pwa/src`)

- [x] **T-06** (CA-19; RN-04): crear `apps/pwa/src/services/veterinarianApi.ts`.
  - Instancia de `createVeterinarianApi(createHttpClient({ baseUrl: '' }))` y función `onVeterinarianUnauthorized(handler)`, que usa `setOnUnauthorized` del cliente HTTP.
  - El manejador de 401 se conecta en T-07. No se usa el wrapper `request` de `apiClient.ts` (plan, B-3).
  - Hecho cuando: el módulo compila y no guarda credenciales.

- [x] **T-07** (CA-19): en `apps/pwa/src/viewmodels/useStaffSession.ts`, exponer una función `expireSession` que deje la sesión en `anonymous` con el error «Tu sesión expiró.». Cablear el 401 de `veterinarianApi` a esa función desde `App.tsx`.
  - Resultado: ante 401 en cualquier llamada de la sección, la PWA vuelve a la pantalla de login con el aviso (decisión 4).
  - Hecho cuando: T-37 prueba el 401 y la función no cambia el comportamiento de `login`/`logout` existente (`login.test.tsx` y `staff-login.test.tsx` siguen en verde).

- [x] **T-08** (RN-01): en `apps/pwa/src/viewmodels/pwaDemo.ts`, añadir la sección `species-request` en una lista propia (`speciesRequestSections`), incluirla en `PwaSection` y en `getSectionLabel`. **No** añadirla a `pwaSections` (decisión 5).
  - En `apps/pwa/src/views/AppShell.tsx`, registrar la sección en `sectionViews` apuntando a `SpeciesRequestView` (T-18).
  - Hecho cuando: `screens.test.tsx` sigue esperando cinco secciones y pasa sin cambios.

- [x] **T-09** (RN-01; CA-19): `apps/pwa/src/views/HomeView.tsx` muestra la entrada «Solicitar publicación de especie» solo si el perfil incluye `veterinarian` en `roles`. Pasar `roles` desde `App.tsx` → `StaffWorkspace` → `AppShell` → `HomeView`.
  - Es visibilidad, no seguridad: la autorización real es de la API (plan, Seguridad).
  - Hecho cuando: T-38 prueba que la entrada no aparece sin el rol.

## Implementación PWA: ViewModels y hooks (`apps/pwa/src/viewmodels`)

- [x] **T-10** (CA-04, CA-06, CA-09, CA-11, CA-12, CA-13, CA-14, CA-18; RN-07): crear `apps/pwa/src/viewmodels/speciesRequestForm.ts` con funciones puras.
  - Etiquetas de estado del selector y de «Mis solicitudes»; etiquetas de los seis tipos de animal (CA-12).
  - `validatePhoto(file, requestType)`: tipo JPG/PNG y tamaño máximo 5 MB (5 × 1 024 × 1 024 bytes), obligatoria solo en `publish` (CA-04).
  - `validateDraft(draft, requestType)`: `category` obligatorio, «Tipo de animal requerido.» (CA-12).
  - `fichaFieldsFor(requestType, publishedFields)`: predeterminados en `publish`; precarga desde `published_fields` en `update`; seis casillas extra ocultas (CA-09, CA-11).
  - `draftFromSpecies(species)`: precarga de correcciones, tipo y ficha (CA-14).
  - `isSelectable(species)`: según `next_request_type` no nulo (RN-07, CA-06).
  - `needsChangeConfirmation(draft, baseline)`: true si hay datos escritos respecto a la precarga (CA-14).
  - `validateDraft(draft, selected?)` bloquea el envío si la especie vigente del selector ya no es elegible (CA-06, RN-07). `published_fields` se tipa como `readonly string[] | null`.
  - `lastRejectionNotice(species)`: «Última solicitud rechazada: {motivo}» solo con `last_rejection_reason` (CA-18).
  - Hecho cuando: las funciones no importan React ni `fetch`, y los tests T-22, T-24, T-27, T-29, T-30, T-31, T-32 y T-36 las usan.

- [x] **T-11** (CA-02, CA-03, CA-05, CA-06, CA-08, CA-10, CA-12, CA-19): crear `apps/pwa/src/viewmodels/speciesRequestSubmit.ts` con `submitSpeciesRequest(api, draft)`.
  - Resultado tipado: `created` (con aviso según `request_type`: «Solicitud enviada. La Dirección la revisará.» o «Actualización enviada. La ficha publicada no cambia hasta que la Dirección la acepte.»), `invalid` (mapea `errors` a campos: `species_id`, `category`, `image`, `scientific_name`, `habitat`, `origin`, `published_fields`), `session` (401), `failed` (500 o red, sin limpiar).
  - En 422 de `species_id` por pendiente, pide recargar el selector (CA-06).
  - Hecho cuando: T-20, T-21, T-24, T-26, T-28 y T-37 la usan con cliente simulado.

- [x] **T-12** (CA-13, CA-06, CA-18, CA-19): crear `apps/pwa/src/viewmodels/useSpeciesSelector.ts`. Además, `useSpeciesRequestForm.ts` (ViewModel del formulario: borrador, confirmación de cambio, envío, foco tras 422 con contador y `photoKey` para remontar el control de foto).
  - Estados `loading`, `ready`, `empty`, `error`; `reload()` tras 422 de elegibilidad (CA-06).
  - Usa `veterinarianApi.species.list()` y los 401/403 de T-07.
  - Hecho cuando: T-31 y T-37 cubren los estados del hook con el cliente simulado.

- [x] **T-13** (CA-16, CA-17, CA-18, CA-19): crear `apps/pwa/src/viewmodels/useOwnSpeciesRequests.ts` (el hook de formulario `useSpeciesRequestForm.ts` está en T-12).
  - Página actual, pila de páginas para «Anterior», `meta.has_more` para «Siguiente».
  - En error, vacía la lista para no mostrar datos anteriores como actuales (CA-17).
  - Hecho cuando: T-34, T-35 y T-37 cubren carga, vacío, error, paginación y 403.

## Implementación PWA: presentación y vistas (`apps/pwa/src/views`)

- [x] **T-14** (CA-13, CA-06, CA-18; RN-07): crear `apps/pwa/src/views/SpeciesSelectorField.tsx`.
  - Desplegable `SelectField` (rediseño T-52): placeholder «Selecciona una especie», opciones «Nombre · Estado». El motivo (CA-18) se muestra en el resumen bajo el desplegable.
  - Especies `pending` como opción `disabled` con su estado en texto.
  - Mensaje de carga con `role="status"` («Cargando especies…»); error con «No pudimos cargar las especies. Inténtalo más tarde.» y botón «Reintentar»; lista vacía con «Aún no hay especies registradas. Regístralas primero con un animal.».
  - Hecho cuando: T-31, T-36 y T-42 pasan sobre el markup.

- [x] **T-15** (CA-01, CA-04, CA-07, CA-09, CA-11, CA-12, CA-14, CA-15): crear `apps/pwa/src/views/SpeciesRequestFormPresenter.tsx` como componente puro.
  - Recibe datos y callbacks por props; sin hooks ni `fetch`.
  - Muestra: tipo de envío, correcciones (nombre científico, hábitat, «Área de distribución natural», tipo de animal), foto (con «Sin foto nueva se mantiene la foto publicada.» en `update`), bloque «Qué mostrar en la ficha pública» (solo tres casillas), texto de ayuda de CA-14 sobre correcciones, texto de ayuda de CA-15 (`pwa-004`).
  - Sin control de alta de especie ni campo editable de nombre común. Sin estado de la solicitud enviada en el formulario (CA-07).
  - Errores por campo con `aria-invalid="true"` y `aria-describedby` que combina hint y error (plan, Accesibilidad).
  - Hecho cuando: T-19, T-25, T-30, T-31, T-33 y T-40 pasan sobre el markup.

- [x] **T-16** (CA-02, CA-03, CA-06, CA-08, CA-14; RN-01): crear `apps/pwa/src/views/SpeciesRequestFormView.tsx` como contenedor.
  - Usa `useSpeciesSelector`, `useSpeciesRequestForm` y la lógica de `speciesRequestSubmit`. Foco solo tras 422 (fieldsets con `tabIndex={-1}`); campos de corrección deshabilitados hasta elegir especie.
  - Confirmación con `Dialog` de `@arca/ui` al cambiar de especie con datos escritos (CA-14).
  - Botón de envío deshabilitado durante la petición (plan, doble envío).
  - Tras 201 limpia el formulario y recarga el selector; tras error conserva los datos (CA-02, CA-03).
  - Errores de envío con `role="alert"`; aviso de éxito con `role="status"`.
  - Hecho cuando: el contenedor compila y T-20 y T-21 prueban la lógica que usa.

- [x] **T-17** (CA-16, CA-17, CA-18; RN-08): crear `apps/pwa/src/views/OwnSpeciesRequestsView.tsx` (presentación y contenedor).
  - Campos: nombre común, tipo de envío, estado (con «Actualización publicada» cuando corresponda), «Despublicada» junto al nombre solo si `unpublished`, fechas de envío y decisión, motivo completo en `rejected` con ajuste de línea (`overflow-wrap: anywhere`, sin truncar).
  - Estados: «Cargando tus solicitudes…» (`role="status"`), «Aún no has enviado solicitudes.», «No pudimos cargar tus solicitudes. Inténtalo más tarde.» con «Reintentar»; botones «Anterior» y «Siguiente» según `meta.has_more`.
  - Hecho cuando: T-34, T-35 y T-36 pasan sobre el markup y los hooks.

- [x] **T-18** (CA-19; RN-01): crear `apps/pwa/src/views/SpeciesRequestView.tsx` como contenedor de la sección.
  - Dos pestañas, «Solicitar publicación» y «Mis solicitudes», como botones con `aria-pressed` (decisión tomada en implementación; descarta `role="tablist"`).
  - Muestra el aviso de 403 «No tienes permiso para ver esta sección.» cuando corresponde.
  - Hecho cuando: T-08 registra la sección y T-37 prueba que las vistas no llaman a `fetch`.

## Pruebas por criterio (Vitest, `apps/pwa/src/tests/`)

Cada tarea nombra un CA-xx y su `describe`. Las pruebas de update que dependen de T-01 se marcan.

- [x] **T-19** (CA-01): `describe('CA-01 PWA solicitud de publicación: formulario')` en `species-request-presenters.test.tsx`. Presenta campos, tipo de envío, bloque de ficha y etiqueta «Área de distribución natural».
- [x] **T-20** (CA-02): `describe('CA-02 PWA solicitud de publicación: envío')` en `species-request-submit.test.ts`. Llama a `publicationRequests.submit` con multipart y conserva datos ante error HTTP.
- [x] **T-21** (CA-03): `describe('CA-03 PWA solicitud de publicación: respuestas')` en `species-request-submit.test.ts`. 201 limpia y muestra el aviso según `request_type` (RN-10); 422 mapea errores; 401 lleva a login con «Tu sesión expiró.» y no informa éxito; 500 y red no limpian.
- [x] **T-22** (CA-04): `describe('CA-04 PWA solicitud de publicación: foto')` en `species-request-rules.test.ts`. Más de 5 MB, tipo no JPG/PNG y falta en `publish` no envían; en `update` la foto es opcional.
- [x] **T-23** (CA-05): `describe('CA-05 PWA solicitud de publicación: campos')` en `species-request-api.test.ts`. FormData con `species_id`, correcciones, `category`, `published_fields` e `image`; sin `common_name`, sin alta ni tipo de envío.
- [x] **T-24** (CA-06): `describe('CA-06 PWA solicitud de publicación: especie no elegible')` en `species-request-rules.test.ts` (regla de `pending`) y `species-request-submit.test.ts` (422 de `species_id` recarga la lista).
- [x] **T-25** (CA-07): `describe('CA-07 PWA solicitud de publicación: sin estado tras envío')` en `species-request-presenters.test.tsx`. El formulario no muestra el estado de la solicitud enviada.
- [x] **T-26** (CA-08): `describe('CA-08 PWA solicitud de publicación: foto no procesable')` en `species-request-submit.test.ts`. 422 de `image` se muestra junto al control con el texto exacto «No se pudo procesar la foto. Intenta con otro archivo.».
- [x] **T-27** (CA-09): `describe('CA-09 PWA solicitud de publicación: ficha pública')` en `species-request-rules.test.ts` y `species-request-presenters.test.tsx`. Predeterminados en `publish`, etiquetas, «siempre visibles». **Los casos de actualización dependen de T-01.**
- [x] **T-28** (CA-10): `describe('CA-10 PWA solicitud de publicación: selección de ficha')` en `species-request-api.test.ts` y `species-request-submit.test.ts`. `published_fields` como cadena JSON (`[]` incluido); 422 de `published_fields` conserva las casillas.
- [x] **T-29** (CA-11): `describe('CA-11 PWA solicitud de publicación: campos sin fuente')` en `species-request-rules.test.ts`. Las seis casillas extra no aparecen; «Área de distribución natural» sí.
- [x] **T-30** (CA-12): `describe('CA-12 PWA solicitud de publicación: tipo de animal')` en `species-request-rules.test.ts` y `species-request-presenters.test.tsx`. Seis opciones con etiquetas y claves; vacío no envía con «Tipo de animal requerido.»; 422 de `category` junto al selector.
- [x] **T-31** (CA-13): `describe('CA-13 PWA solicitud de publicación: selector')` en `species-request-presenters.test.tsx` y `species-request-rules.test.ts`. `role="status"` al cargar; `fieldset` con `legend`; estados y elegibilidad; error con «Reintentar»; lista vacía.
- [x] **T-32** (CA-14): `describe('CA-14 PWA solicitud de publicación: precarga')` en `species-request-rules.test.ts` y `species-request-presenters.test.tsx`. Precarga desde la especie; cambiar de especie pide confirmación si hay datos; texto de ayuda sobre correcciones presente. **La precarga de la ficha en actualizaciones depende de T-01.**
- [x] **T-33** (CA-15): `describe('CA-15 PWA solicitud de publicación: sin alta')` en `species-request-presenters.test.tsx` (prueba estática del markup). Sin controles de alta ni nombre común editable; texto de ayuda con `pwa-004`.
- [x] **T-34** (CA-16): `describe('CA-16 PWA solicitud de publicación: mis solicitudes')` en `species-request-list.test.ts`. Campos mostrados, etiquetas de estado, «Despublicada» solo si `unpublished`, orden tal como lo entrega la API.
- [x] **T-35** (CA-17): `describe('CA-17 PWA solicitud de publicación: estados de la lista')` en `species-request-list.test.ts` y `species-request-presenters.test.tsx`. `role="status"` al cargar; estado vacío; error con «Reintentar» sin datos anteriores; paginación con `meta.has_more`.
- [x] **T-36** (CA-18): `describe('CA-18 PWA solicitud de publicación: motivo completo')` en `species-request-list.test.ts` y `species-request-rules.test.ts`. Motivo de 500 caracteres íntegro en la lista y en el selector; «Última solicitud rechazada» solo con `not_published` (decisión D-1).
- [x] **T-37** (CA-19): `describe('CA-19 PWA solicitud de publicación: sesión y permisos')` en `species-request-submit.test.ts`, `species-request-api.test.ts` y `species-request-presenters.test.tsx` (estática). 401 en cualquier llamada lleva a login con «Tu sesión expiró.»; 403 muestra «No tienes permiso para ver esta sección.»; ningún archivo de vista de la feature contiene `fetch(`.

## Pruebas de RN-xx

- [x] **T-38** (RN-01): `describe('RN-01 PWA solicitud de publicación: acceso')` en `species-request-presenters.test.tsx`. La entrada solo aparece si `roles` incluye `veterinarian` (T-09).
- [x] **T-39** (RN-02, RN-06): prueba en `species-request-api.test.ts`. `createVeterinarianApi` no expone métodos de alta de especie y el envío no cambia la especie.
- [x] **T-40** (RN-03, RN-08): `describe('RN-03 PWA solicitud de publicación: foto sin URL')` en `species-request-presenters.test.tsx`. El markup no contiene URL de la foto ni rutas de `media/`.
- [x] **T-41** (RN-04): prueba estática en `species-request-api.test.ts`. Los archivos de la feature no usan `localStorage`, `sessionStorage` ni `document.cookie` para credenciales.
- [x] **T-42** (RN-07): `describe('RN-07 PWA solicitud de publicación: elegibilidad de la API')` en `species-request-rules.test.ts`. El estado deshabilitado depende solo de `next_request_type`.

## Cambio de navegación

- [x] **T-51** (RN-01, CA-19): la sección también aparece en el menú lateral y en la barra móvil, solo con rol `veterinarian`. `pwaDemo.ts`: `speciesRequestNavItem` y `getNavigationSections(roles)`; `AppShell.tsx`: el menú usa `getNavigationSections` (ícono `paw`, etiqueta accesible «Solicitar publicación de especie», activo si la sección es `species-request`); `styles.css`: barra móvil de seis columnas cuando hay el ítem.
  - Prueba: `describe('CA-19 PWA solicitud de publicación: acceso en el menú')` en `screens.test.tsx` (con rol, sin rol y estado activo). Hecha.

- [x] **T-52** (CA-01, CA-06, CA-13, CA-14, CA-18; RN-03): rediseño de usabilidad aprobado. Selector desplegable con resumen (badge de estado, tipo de envío, motivo en alerta suave), maqueta como «Registrar animal» con vista previa local de la foto y botón para quitarla, rejilla de dos columnas, ficha pública como chips, pie con «Limpiar» y «Enviar solicitud», sección deshabilitada con «Elige una especie para continuar.» y pestañas como control segmentado (`aria-pressed`). Archivos: `SpeciesSelectorField.tsx`, `SpeciesRequestFormPresenter.tsx`, `SpeciesRequestFormView.tsx`, `SpeciesRequestView.tsx`, `useSpeciesRequestForm.ts`, `speciesRequestForm.ts`, `styles.css`. Pruebas ajustadas en `species-request-presenters.test.tsx`.
- [x] **T-53** (RN-01; alcance aprobado): el menú lateral de escritorio se contrae al cambiar de sección. `styles.css`: `:focus-within` por `:has(:focus-visible)`; `AppShell.tsx`: `blur()` tras navegar con ratón o toque y `scrollTo` al cambiar de sección. Prueba: `describe('CA-19 PWA solicitud de publicación: menú lateral contraíble')` en `screens.test.tsx`.

## Revisión

- [x] **T-54** (CA-20, CA-21; CA-05, CA-09, CA-14): formulario por secciones, chips opcionales y fijos, campos condicionales, línea «No se publicarán», foco al chip, reglas de campos ocultos y confirmación de «Limpiar». Archivos: `speciesRequestForm.ts`, `speciesRequestSubmit.ts`, `useSpeciesRequestForm.ts`, `SpeciesRequestFormPresenter.tsx`, `SpeciesRequestFormView.tsx`, `components/Icon.tsx` (icono `lock`). Pruebas: `species-request-review-2026-11-21.test.tsx` (CA-20, CA-21) y ajustes en `species-request-presenters.test.tsx`.
- [x] **T-55** (CA-22, CA-23, CA-24): tarjeta de «Mis solicitudes», paginación, vacío, error y «Enviar de nuevo». Archivos: `OwnSpeciesRequestsView.tsx`, `SpeciesRequestView.tsx`. Pruebas: mismo archivo (CA-22 a CA-24) y ajuste en `species-request-list.test.ts`.
- [x] **T-56** (CA-25): ajustes de `styles.css` (`.field-help` 14 px, contraste del fieldset, sin `.ficha-fields__option`, `.form-actions` en 360 px). Prueba CA-25 en el mismo archivo.
- [x] **T-58** (api-026 CA-02, CA-03, CA-04, CA-14): «Dato curioso» en `fichaFieldOptions`, borrador, validación, envío y precarga; `TextAreaField` con ayuda y contador. Archivos: `speciesRequestForm.ts`, `useSpeciesRequestForm.ts`, `SpeciesRequestFormPresenter.tsx`, `styles.css`, `packages/api-client` (tipos y `buildSpeciesRequestFormData`). Pruebas: `species-fun-fact.test.tsx` y ajuste a cuatro casillas en tres pruebas previas. `npx vitest run`: 18 archivos, 153 tests; `npx tsc -b`: código 0.
- [x] **T-57** (CA-20 a CA-25): `npx vitest run` (17 archivos, 148 tests, todos pasan) y `npx tsc -b` (código 0).

## Calidad y entrega

- [x] **T-43** (todos los CA-01 a CA-19): ejecutar `vitest run` y `tsc -b` en `apps/pwa` y registrar comandos, códigos de salida, pruebas omitidas y fallidas. Esta sesión no tiene shell: lo ejecuta la sesión principal. No se afirma que pasen. **Resultado registrado:** `npm test` → 14 archivos, 112 tests pasan, 0 fallan; `npm run build` (`tsc -b && vite build`) → código 0 (solo aviso de tamaño de chunk >500 kB, previo).
- [x] **T-44** (`packages/api-client`): `/verify` del paquete. No tiene runner propio; se verifica con los tipos de `apps/pwa` (T-43) y las pruebas de `apps/pwa/src/tests/species-request-api.test.ts`. **Resultado registrado:** tipos de `@arca/api-client` verificados por `tsc -b` de `apps/pwa` (código 0) y `species-request-api.test.ts` en verde.
- [ ] **T-45** (api, prerrequisito T-01): `/verify` de `apps/api` con `VeterinarianSelectorTest` y la suite completa desde `apps/api/src`, con `DB_DATABASE=arca_pruebas`. Nunca `arca_zoo`. Registrar resultado.
- [x] **T-46** (CA-03, CA-13, CA-17, CA-19; RN-05, RN-09, RN-10; manual): — Fuera de alcance de esta entrega: verificación manual en navegador, sin evidencia registrada. Detalle original: verificación en navegador de foco al primer campo con 422, interacción con radios (teclado y lector de pantalla), límite de 5 MB con archivo real, rechazo de JPG/PNG inválidos, modo claro, vista en pantalla estrecha, revisión de textos en español (RN-05) y alcance sin push ni correo (RN-09). Registrar evidencia.
- [ ] **T-47** (límites de subida): comprobar que `infra/README.md` cubre `upload_max_filesize` y `post_max_size` para 5 MB más multipart (ya pedido por `api-014` T-28). Si no lo cubre, anotarlo en la misma PR. No añadir requisitos nuevos si ya están.
- [ ] **T-48** (documentación): actualizar `apps/pwa/docs/` (nota de flujo de «Solicitar publicación de especie») si el equipo lo pide; si no, dejar constancia en el PR.
- [ ] **T-49** (revisión): revisión con quality-reviewer (MVVM: sin `fetch` en vistas, sin reglas de negocio en el cliente, tokens semánticos, nombres en inglés y textos en español) y con security-reviewer (CSRF, sin credenciales en almacenamiento, validación de foto, 401/403, ausencia de URL de foto, aislamiento por rol). Registrar hallazgos y su resolución.
- [ ] **T-50** (trazabilidad y entrega): PR enlaza `specs/005`, `plan/005` y `tasks/005`; el commit cita `pwa-005`. El commit final para push lo hace el equipo con el comando acordado. Cambiar el estado de la spec a En progreso o Implementada solo con aprobación humana y evidencia de la sesión principal.

## Definición de terminado

- [ ] Cada CA-01 a CA-19 tiene su test con nombre (T-19 a T-37).
- [ ] Cada RN-01 a RN-10 tiene prueba o revisión (T-38 a T-42, T-46, T-21).
- [ ] `vitest run`, `tsc -b`, `/verify` de `apps/api` y de `apps/pwa` registrados (T-43 a T-45).
- [ ] Verificaciones manuales registradas (T-46).
- [ ] `api-014` T-30 cerrada antes de dar por cumplidos CA-09 y CA-14 en actualizaciones (T-01).
- [ ] Revisiones de calidad y seguridad registradas (T-49).

---

## Orden por dependencias

1. T-00 (hecha).
2. T-01 en paralelo con T-02 a T-05 (T-01 es de `api`; T-27 y T-32 esperan a ella).
3. T-06, T-07, T-08, T-09 (servicio, sesión, navegación, acceso por rol).
4. T-10, T-11 (reglas y flujo puros).
5. T-12, T-13 (hooks).
6. T-14, T-15, T-17 (presentación); T-16 y T-18 (contenedores).
7. T-19 a T-42 (pruebas por CA y RN).
8. T-43 a T-50 (calidad, entrega y revisión).

## Trazabilidad CA/RN → T-xx

| CA/RN | Tareas de implementación | Tarea de prueba o verificación |
|---|---|---|
| CA-01 | T-15, T-16 | T-19 |
| CA-02 | T-04, T-11, T-16 | T-20 |
| CA-03 | T-11, T-16 | T-21 (y T-46) |
| CA-04 | T-10, T-15 | T-22 |
| CA-05 | T-02, T-04 | T-23 |
| CA-06 | T-10, T-11, T-12, T-14, T-16 | T-24 |
| CA-07 | T-15 | T-25 |
| CA-08 | T-04, T-11, T-16 | T-26 |
| CA-09 | T-10, T-15 (update: T-01) | T-27 |
| CA-10 | T-04, T-11 | T-28 |
| CA-11 | T-10, T-15 | T-29 |
| CA-12 | T-10, T-11, T-15 | T-30 |
| CA-13 | T-02, T-03, T-12, T-14 | T-31 |
| CA-14 | T-10, T-15, T-16 (update: T-01) | T-32 |
| CA-15 | T-15 | T-33 |
| CA-16 | T-03, T-13, T-17 | T-34 |
| CA-17 | T-03, T-13, T-17 | T-35 |
| CA-18 | T-10, T-14, T-17 | T-36 |
| CA-19 | T-05, T-06, T-07, T-11, T-12, T-13, T-18 | T-37 (y T-46) |
| RN-01 | T-08, T-09, T-18 | T-38 |
| RN-02 | T-02, T-04 | T-39 |
| RN-03 | T-15, T-17 | T-40 |
| RN-04 | T-06, T-03 | T-41 |
| RN-05 | Revisión de textos | T-46 |
| RN-06 | T-02, T-04 | T-39 |
| RN-07 | T-10, T-14 (con T-01 para ficha) | T-42 |
| RN-08 | T-03, T-17 | T-40 (y `api-014`) |
| RN-09 | Sin implementación (alcance v1) | T-46 |
| RN-10 | T-11 (aviso de actualización) | T-21 |

Totales: 60 tareas (T-00 a T-59; la T-54 repetida pasó a T-59). Sin marcar: T-43 a T-50. Tarea externa de bloqueo: `api-014` T-30 (T-01 aquí).

- [x] **T-59** (CA-26): paginador compartido y `meta` con total en «Mis solicitudes»; pruebas en `shared-ui-pagination-and-countdown.test.tsx`. Queda abierta la revisión a ojo en 360 px.
