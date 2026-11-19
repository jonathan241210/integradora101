# Plan técnico · 005 · species-request-submission

- Spec: `apps/pwa/specs/005-species-request-submission.md`
- Estado de spec: Aprobada (Jonathan, 2026-11-19; alineación de CA-03, CA-13, CA-14, CA-18 y CA-19 aprobada el mismo día)
- Estado de este plan: **Aprobado** (aprobación técnica de Jonathan, 2026-11-19). Siguiente paso: `/sdd-tasks pwa 005-species-request-submission`.
- Responsable técnico: Jonathan (decisión de 2026-11-19)
- Fecha del plan: 2026-11-19 (revisión con decisiones del mismo día)
- Dependencias de API: `apps/api/specs/014-species-requests.md` (En progreso; enmienda de 2026-11-19 con `published_fields` en el selector, tarea T-30 de `api-014`) y DBR-013 (Lista para backend)

## Diseño de solución

La PWA permite que el veterinario elija una especie existente, vea su estado y envíe una solicitud de publicación o de actualización. La API decide la elegibilidad (`next_request_type`), valida, guarda y filtra «Mis solicitudes». La PWA presenta, valida solo lo que es de formato (obligatorios, tamaño y tipo de foto) y llama al paquete `@arca/api-client`. No hay alta de especies, ni cálculo de elegibilidad, ni almacenamiento local.

Capas (MVVM explícito, según `apps/pwa/AGENTS.md` y `AGENTS.md` raíz):

- **Vistas** (`src/views/`): solo presentan. Cada contenedor llama a un hook; la presentación es un componente puro que recibe datos y callbacks por props. Así el markup se prueba con `renderToStaticMarkup` (el entorno de test es `node`).
- **ViewModels** (`src/viewmodels/`): hooks que orquestan carga, reintentos, estados y envío. La lógica testable vive en funciones puras (reglas de formulario, mapeo de errores 422, flujo de envío que recibe el cliente como parámetro).
- **Datos** (`packages/api-client`): nuevo módulo `veterinarian` con tipos y métodos. Sin `fetch` ni `axios` en la PWA para esta feature.
- **API** (`apps/api`): la v1 del formulario usa el contrato actual más una enmienda aditiva ya decidida: el selector devuelve `published_fields` (`api-014` CA-26, tarea T-30). El motivo de rechazo en el selector sigue el criterio de la API (solo `not_published`).

Flujo: el hook de selector carga `GET /api/v1/veterinarian/species`. Al elegir una especie elegible, el formulario precarga correcciones, tipo de animal y ficha (en una actualización, la selección de la especie publicada). El envío (`POST` multipart) produce 201 con aviso, o 422 con errores por campo, o 401 con inicio de sesión, o 500/red sin limpiar. «Mis solicitudes» lee `GET /api/v1/veterinarian/species-publication-requests` con paginación de 10 y `meta.has_more`.

Límites de responsabilidad:
- Elegibilidad, tipo de envío, unicidad de solicitud viva, valores que cambian (NULL si no cambian), motivo de rechazo visible y filtrado por autor: API.
- Reglas de formato de la foto (5 MB, JPG/PNG), obligatorios visuales y texto de error: PWA, como guía de UX. La API vuelve a validar y su respuesta manda.

## Consulta previa del esquema vivo (`docs/database/README.md`)

- **Consulta realizada el 2026-11-19 (solo lectura, `arca_pruebas`), por la sesión principal:** `php artisan migrate:status` muestra `2026_11_12_000013_species_publication_requests_schema` en lote 5, `Ran`. `php artisan db:table species_publication_requests` muestra 19 columnas (incluye `request_type`, `origin`, `category`, `image_path`, `published_fields` json, `status` por defecto `submitted`, `rejection_reason` varchar(500) y `submitted_species_id` generada), el índice único `uq_species_publication_requests_submitted_species` y los índices compuestos por `species_id, status` y `status, created_at`. Coincide con DBR-013.
- **Referencia documental:** DBR-013 registra la verificación de solo lectura del 2026-11-12. El archivo de migración existe en el repositorio.
- **Conclusión sobre DBR:** esta feature no cambia el esquema (usa `species`, `species_publication_requests` y `users` ya existentes). No requiere DBR nueva. La enmienda de `published_fields` en el selector lee la columna `species.published_fields`, que ya existe por la migración `2026_11_12_000013` (su modelo `Species` la castea como `array`): cambio aditivo de API sin migración.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / datos | Sin migraciones ni DBR. Enmienda aditiva de `api-014` (tarea T-30): `apps/api/src/app/Http/Resources/Veterinarian/SelectableSpeciesResource.php` (añadir `published_fields`, leído de `species.published_fields`) y su test en `VeterinarianSelectorTest.php`. `ListSelectableSpeciesAction` no cambia (D-1: criterio de `not_published` se mantiene) | Contrato del selector que la PWA necesita para precargar la ficha en actualizaciones (CA-09, CA-14) |
| Paquetes/api-client | `packages/api-client/veterinarian.ts` (nuevo), `packages/api-client/veterinarian-types.ts` (nuevo), `packages/api-client/index.ts` (exports) | `createVeterinarianApi(http)` con `species.list()`, `publicationRequests.list(page)` y `publicationRequests.submit(input)`. Construye el `FormData` del envío en una función exportada para poder probarla. Reutiliza tipos de `admin-types.ts` (`SpeciesCategory`, `SpeciesRequestType`, `SpeciesFichaField`, `SpeciesPublicationStatus`) sin moverlos. Sin dependencias nuevas |
| Cliente PWA · servicios | `apps/pwa/src/services/veterinarianApi.ts` (nuevo) | Instancia de `createVeterinarianApi(createHttpClient({ baseUrl: '' }))` con manejador de 401 que lleva a inicio de sesión. No usa el wrapper `request` de `apiClient.ts` (ver B-3) |
| Cliente PWA · ViewModels | `apps/pwa/src/viewmodels/speciesRequestForm.ts` (reglas puras y etiquetas), `speciesRequestSubmit.ts` (flujo puro de envío), `useSpeciesSelector.ts`, `useOwnSpeciesRequests.ts`, `useSpeciesRequestForm.ts` (hooks), `pwaDemo.ts` (nueva sección `species-request` en una lista propia, fuera de `pwaSections`), `useStaffSession.ts` (función para expulsar la sesión tras 401, CA-19) | Reglas, flujo y estado de la feature |
| Cliente PWA · vistas | `apps/pwa/src/views/SpeciesRequestView.tsx` (contenedor con dos pestañas), `SpeciesRequestFormView.tsx` (contenedor), `SpeciesRequestFormPresenter.tsx` (presentación pura), `SpeciesSelectorField.tsx` (lista de opciones tipo radio, CA-13), `OwnSpeciesRequestsView.tsx`, `AppShell.tsx` (registro de la sección y ítem de menú por rol, decisión 5 revisada el 2026-11-19), `HomeView.tsx` (acceso por rol, RN-01 y única entrada, decisión 5; su estructura no se revisó en esta sesión) | Presentación de formulario, selector y «Mis solicitudes» |
| Cliente PWA · pruebas | `apps/pwa/src/tests/species-request-rules.test.ts`, `species-request-submit.test.ts`, `species-request-list.test.ts`, `species-request-presenters.test.tsx`, `species-request-api.test.ts` | Cobertura por CA-xx (sección de mapeo) |
| Documentación | `apps/pwa/docs/` (nota de flujo, si el equipo la pide) | Referencia local de la pantalla |
| Infra | Ninguna en código. Operación: verificar límites de subida del servidor (ver «Seguridad») | Cumplir el checklist de `infra/README.md` sin añadir requisitos nuevos |

## Contrato y datos

Rutas (nombres según `apps/api/src/routes/api.php`, grupo `veterinarian`, middleware `auth:sanctum`, `staff.user`, `role:veterinarian`):

- **Selector:** `GET /api/v1/veterinarian/species` (`veterinarian.species.index`). Respuesta `{ data: [...] }`, sin paginación, ordenada por `common_name` y `id`. Campos por elemento: `id`, `common_name`, `scientific_name`, `habitat`, `origin` (viene de `species.distribution`), `category`, `publication_status` (`not_published`, `pending`, `published`, `unpublished`), `next_request_type` (`publish`, `update` o `null`), `last_rejection_reason` (texto o `null`; solo con `not_published`, criterio de la API) y `published_fields` (lista de claves de RN-13 guardada en la última publicación, o `null` si la especie nunca se publicó; enmienda de `api-014` CA-26, tarea T-30). La PWA usa `published_fields` para precargar la ficha en actualizaciones y en especies despublicadas (CA-09, CA-14).
- **Mis solicitudes:** `GET /api/v1/veterinarian/species-publication-requests` (`veterinarian.species-publication-requests.index`). Respuesta `{ data: [...], meta: { has_more } }`, 10 por página, orden de más reciente a más antigua. El número de página viaja en `?page=` (lo lee el paginador de Laravel; el controlador no lo declara, ver B-6). Campos: `id`, `species_id`, `common_name`, `request_type` (`publish`, `update`), `status` (`submitted`, `accepted`, `rejected`), `created_at`, `reviewed_at`, `rejection_reason` (solo en `rejected`), `species_publication_status`. Sin fotos ni datos de revisores.
- **Envío:** `POST /api/v1/veterinarian/species-publication-requests` (`veterinarian.species-publication-requests.store`), `multipart/form-data`. Campos: `species_id` (obligatorio), `category` (obligatorio, una de las seis claves de DBR-004), `scientific_name`, `habitat`, `origin` (correcciones; vacío o igual al actual = sin corrección), `published_fields` (siempre enviado como cadena JSON, p. ej. `["scientific_name","origin","habitat"]` o `[]`), `image` (JPG o PNG, máximo 5 120 KB; obligatoria solo si `next_request_type` es `publish`). No se envía `common_name` ni `species`, ni tipo de envío. Respuesta `201` con `{ data: { id, species_id, status, request_type, created_at } }`, sin URL de foto.
- **Errores:** `422` con cuerpo `{ message, errors: { campo: [mensaje] } }`; `401` sin sesión (la PWA lleva a inicio de sesión con «Tu sesión expiró.», CA-19); `403` sin rol `veterinarian` («No tienes permiso para ver esta sección.»); `419` lo resuelve el cliente HTTP al renovar CSRF y reintentar una vez; `500` o red sin respuesta (error genérico, sin limpiar).

Mensajes 422 que devuelve la API (los que la PWA debe mostrar junto al campo, sin reescribirlos):

| Clave en `errors` | Mensajes de la API | Control en la PWA |
|---|---|---|
| `species_id` | «Elige una especie.», «La especie no existe.», «Ya hay una solicitud pendiente para esta especie.» | Selector (y recarga de la lista, CA-06) |
| `category` | «Tipo de animal requerido.», «Tipo de animal no válido.» | Selector de tipo de animal |
| `image` | «Elige una foto para la primera publicación.», «No se pudo procesar la foto. Intenta con otro archivo.» | Control de foto |
| `scientific_name`, `habitat`, `origin` | «…: máximo 150 caracteres.» | Campo correspondiente |
| `published_fields` | «La selección de campos públicos no es válida.», «Campo no permitido en la ficha pública: {clave}.» | Bloque de ficha pública |
| `common_name`, `species` | «Campo no permitido: {campo}.» | No se envían desde la PWA; si llegan, aviso general |

Otras referencias del contrato: el validador de la API acepta `published_fields` como cadena JSON (trait `ValidatesPublishedFields`) y solo admite tres claves implementadas (`scientific_name`, `origin`, `habitat`), lo que coincide con CA-11. La categoría se valida contra la lista cerrada (`SpeciesCategory`: `mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`).

Etiquetas que define la PWA (son texto de presentación, no reglas):
- Estado del selector: `not_published` → «Disponible»; `published` → «Publicada»; `unpublished` → «Despublicada»; `pending` → «Pendiente de revisión».
- Estado de «Mis solicitudes»: `submitted` → «Pendiente de revisión»; `accepted` con `publish` → «Publicada»; `accepted` con `update` → «Actualización publicada»; `rejected` → «Rechazada» con motivo.
- Tipo de animal: Mamífero, Ave, Reptil, Anfibio, Pez, Invertebrado.
- Texto de ayuda de CA-14 sobre correcciones (B-5): «Al publicarse, una corrección cambia el dato de la especie: lo verán también la app móvil y los animales de esta especie.»

Validación y Actions/Resources/Policies: no aplican en la PWA. En la API ya existen `StoreSpeciesPublicationRequest` (FormRequest), `SubmitSpeciesPublicationRequestAction`, `ListSelectableSpeciesAction`, `ListOwnSpeciesPublicationRequestsAction`, `SelectableSpeciesResource`, `OwnSpeciesPublicationRequestResource` y `SubmittedSpeciesPublicationRequestResource`.

DBR relacionada: DBR-013 (`docs/database/requests/DBR-013-species-requests.md`), estado Lista para backend. No se crean migraciones, ni SQL, ni cambios de esquema en esta feature.

Auditoría: la API registra el envío en Activitylog y guarda `created_by`. La PWA no escribe auditoría.

Errores y compatibilidad: la PWA trata cada código como indica CA-03, CA-06, CA-08, CA-12 y CA-19. No se reutiliza el wrapper de errores de `apiClient.ts`, porque descarta el campo `errors` del 422 (ver B-3).

## Seguridad, offline y operación

- **Sesión y CSRF:** el cliente HTTP de `@arca/api-client` envía cookies con `credentials: 'include'` y el cabecero `X-XSRF-TOKEN` en métodos no seguros. No se guarda ningún token ni credencial en `localStorage` o `sessionStorage` (RN-04). `useStaffSession` ya elimina `zoohealth.token` al iniciar.
- **Autorización:** la PWA oculta el acceso si el perfil no incluye `veterinarian` en `roles` (RN-01, visibilidad, no seguridad). La autorización real es de la API (`role:veterinarian`). La PWA no tiene rutas de URL (navegación por estado en `AppShell`), así que el caso «por URL» de RN-01 se cubre con el `403` de la API y el mensaje de CA-19 al abrir la sección.
- **Foto:** en la PWA se valida tipo (`image/jpeg`, `image/png`; `accept` del input) y tamaño (5 × 1 024 × 1 024 bytes) antes de enviar. Se usa `File` en memoria. No se muestra ninguna URL de la foto (RN-03). No se genera vista previa en esta v1 porque CA no la pide (no se añade alcance).
- **Foto pendiente pública en pruebas:** la carpeta `media/species-requests/` se publica en `/media` durante pruebas (ADR 0026, enmienda 2026-11-11). Riesgo aceptado por la spec; la PWA no expone la ruta.
- **Límites de subida:** para que 5 MB más el cuerpo multipart no se corten antes de llegar a la validación de Laravel, el servidor debe tener `upload_max_filesize` y `post_max_size` por encima de 5 MB. `api-014` T-28 ya lo exige en `infra/README.md`; esta feature no añade requisitos nuevos. Si el servidor corta antes, el error no sería un 422 de la API.
- **Datos personales:** la solicitud contiene datos de la especie y la identidad del veterinario en `created_by`. La lista solo muestra solicitudes propias (RN-08, filtro en la API). No se recogen datos de visitantes.
- **Dispositivos compartidos:** el estado de formulario y lista vive solo en memoria de React. Al cerrar sesión, `App` vuelve a la pantalla de login y el estado se pierde. Cambiar de sección también lo descarta.
- **Doble envío:** el botón de envío se deshabilita mientras hay una petición en curso. Es una medida de UX, no una regla nueva.
- **Límite de peticiones:** la spec no define límites de frecuencia para estos endpoints. No se inventan; queda como verificación para la API (ver B-6 y «Riesgos»).
- **Offline:** **no aplica** (decisión 7 de Jonathan, 2026-11-19). No hay borradores ni cola de envío, ni IndexedDB, ni `idb`, ni `vite-plugin-pwa`, ni service worker nuevo. Ante error de red, muestra error genérico sin limpiar (CA-03); los datos viven solo en memoria hasta cambiar de sección o cerrar sesión. Un borrador sin conexión sería una spec nueva con su ADR (ADR 0003).
- **Accesibilidad:**
  - Carga del selector y de la lista: texto con `role="status"` («Cargando especies…», «Cargando tus solicitudes…»).
  - El selector es un desplegable (`SelectField`, rediseño aprobado 2026-11-19). Las especies no elegibles son opciones `disabled` con su estado en texto («· Pendiente de revisión»); el estado de la especie elegida se repite en un badge con texto y el motivo de rechazo, si aplica, se lee en un bloque de alerta bajo el desplegable.
  - Errores de envío y de carga: `role="alert"`, y cada error de campo junto a su control con `aria-invalid="true"` y `aria-describedby` que apunta al hint y al error. `Field` de `@arca/ui` aplica `aria-describedby` antes de `{...props}`, así que el componente debe pasar los dos ids combinados. No hace falta cambiar `@arca/ui`.
  - Al recibir 422, el foco va al primer campo con error.
  - Pestañas «Solicitar» y «Mis solicitudes»: botones con `aria-pressed` (decidido en tasks, T-18).
  - Motivo de rechazo completo (hasta 500 caracteres) con ajuste de línea (`overflow-wrap: anywhere`), sin truncar ni `line-clamp`.
  - Colores: tokens semánticos de `@arca/tokens` y `@arca/ui`; sin colores fijos en componentes; modo claro.
- **Observabilidad:** sin telemetría nueva. Los errores se registran como estados de UI. No se envían datos personales a servicios externos.
- **Portabilidad MySQL 8.0.x (Aiven y local):** sin cambios de BD. No aplica.
- **Secretos:** ninguno nuevo. No hay variables de entorno nuevas.

## Mapeo de criterios a pruebas

Entorno: `apps/pwa` usa Vitest con `environment: 'node'`, `renderToStaticMarkup` y `vi.stubGlobal('fetch')`. No hay `jsdom` ni `@testing-library` (decisión 6: opción A, sin dependencias nuevas). Por eso los criterios de interacción se prueban en las funciones puras de los ViewModels, en el cliente con `fetchImpl` simulado y en el markup de la presentación. Las comprobaciones que solo pueden hacerse en navegador real (por ejemplo, foco tras 422 e interacción con radios) quedan como verificación manual, marcada como tal en el reporte.

Convención de nombres: cada `describe` empieza con `CA-xx PWA ...` para que la comprobación de cobertura (estilo `acceptance-coverage.test.tsx`) los encuentre.

| Criterio | Prueba automatizada (Vitest) | App/ubicación esperada |
|---|---|---|
| CA-01 formulario con selector | `describe('CA-01 PWA solicitud de publicación: formulario')`: presentación con los campos, texto de tipo de envío y bloque de ficha | `src/tests/species-request-presenters.test.tsx` |
| CA-02 envío | `describe('CA-02 PWA solicitud de publicación: envío')`: con cliente simulado llama a `publicationRequests.submit` con multipart, y conserva datos ante error HTTP | `src/tests/species-request-submit.test.ts` |
| CA-03 respuestas | `describe('CA-03 PWA solicitud de publicación: respuestas')`: 201 limpia y muestra el aviso según `request_type`; 422 mapea errores; 401 lleva a inicio de sesión con «Tu sesión expiró.» y no informa éxito; 500 y red sin limpiar | `src/tests/species-request-submit.test.ts` |
| CA-04 foto | `describe('CA-04 PWA solicitud de publicación: foto')`: >5 MB, tipo no JPG/PNG, falta en `publish` (sin enviar), y aviso de actualización opcional | `src/tests/species-request-rules.test.ts` |
| CA-05 campos enviados | `describe('CA-05 PWA solicitud de publicación: campos')`: FormData con `species_id`, correcciones, `category`, `published_fields`, `image`; sin `common_name`, sin alta ni tipo de envío | `src/tests/species-request-api.test.ts` |
| CA-06 especie no elegible | `describe('CA-06 PWA solicitud de publicación: especie no elegible')`: `pending` deshabilitada y sin envío; 422 de `species_id` muestra el mensaje y recarga la lista | `src/tests/species-request-rules.test.ts` (regla) y `src/tests/species-request-submit.test.ts` (recarga) |
| CA-07 resultado tras envío | `describe('CA-07 PWA solicitud de publicación: sin estado tras envío')`: la presentación del formulario no muestra estado de la solicitud enviada | `src/tests/species-request-presenters.test.tsx` |
| CA-08 foto no procesable | `describe('CA-08 PWA solicitud de publicación: foto no procesable')`: 422 de `image` se muestra junto al control de foto con el texto exacto | `src/tests/species-request-submit.test.ts` |
| CA-09 ficha pública | `describe('CA-09 PWA solicitud de publicación: ficha pública')`: casillas, predeterminados por tipo de envío y estado de la especie (precarga desde `published_fields` del selector), etiquetas y «siempre visibles» | `src/tests/species-request-rules.test.ts` (regla) y `species-request-presenters.test.tsx` (etiquetas) |
| CA-10 envío de la selección | `describe('CA-10 PWA solicitud de publicación: selección de ficha')`: `published_fields` como cadena JSON (`[]` incluido); 422 de `published_fields` junto al bloque y conserva casillas | `src/tests/species-request-api.test.ts` y `species-request-submit.test.ts` |
| CA-11 fuentes pendientes | `describe('CA-11 PWA solicitud de publicación: campos sin fuente')`: las seis casillas extra no aparecen; «Área de distribución natural» sí | `src/tests/species-request-rules.test.ts` |
| CA-12 tipo de animal | `describe('CA-12 PWA solicitud de publicación: tipo de animal')`: seis opciones con etiquetas y claves; vacío no envía con «Tipo de animal requerido.»; 422 de `category` junto al selector | `src/tests/species-request-rules.test.ts` y `species-request-presenters.test.tsx` |
| CA-13 selector de especie (desplegable) | `describe('CA-13 PWA solicitud de publicación: selector')`: carga con `role="status"`; `select` con placeholder y opciones «Nombre · Estado», `pending` deshabilitada; estados y elegibilidad por `next_request_type`; error con «Reintentar»; lista vacía | `src/tests/species-request-presenters.test.tsx` y `species-request-rules.test.ts` |
| CA-14 precarga, correcciones y texto de ayuda | `describe('CA-14 PWA solicitud de publicación: precarga')`: precarga desde la especie; cambiar de especie reemplaza la precarga y pide confirmación si hay datos escritos; el texto de ayuda sobre correcciones aparece en el markup | `src/tests/species-request-rules.test.ts` y `species-request-presenters.test.tsx` |
| CA-15 sin alta de especie | `describe('CA-15 PWA solicitud de publicación: sin alta')`: prueba estática del markup sin controles de alta ni nombre común editable; texto de ayuda con `pwa-004` | `src/tests/species-request-presenters.test.tsx` |
| CA-16 lista «Mis solicitudes» | `describe('CA-16 PWA solicitud de publicación: mis solicitudes')`: campos mostrados, etiquetas de estado, «Despublicada» solo si `unpublished`, orden tal como lo entrega la API | `src/tests/species-request-list.test.ts` |
| CA-17 estados de la lista | `describe('CA-17 PWA solicitud de publicación: estados de la lista')`: carga con `role="status"`, vacía, error con «Reintentar» sin datos anteriores, paginación con `meta.has_more` | `src/tests/species-request-list.test.ts` y `species-request-presenters.test.tsx` |
| CA-18 motivo completo | `describe('CA-18 PWA solicitud de publicación: motivo completo')`: motivo de 500 caracteres íntegro en la lista y en el selector; «Última solicitud rechazada: {motivo}» solo si la especie llega con `last_rejection_reason` (`not_published`); en los demás estados no aparece en el selector | `src/tests/species-request-list.test.ts` y `species-request-rules.test.ts` |
| CA-19 sesión, errores y cobertura | `describe('CA-19 PWA solicitud de publicación: sesión y permisos')`: 401 en cualquier llamada de la sección lleva a inicio de sesión con «Tu sesión expiró.»; 403 muestra «No tienes permiso para ver esta sección.»; prueba estática de que ninguna vista de la feature llama a `fetch` | `src/tests/species-request-submit.test.ts`, `species-request-api.test.ts` y `species-request-presenters.test.tsx` (estática) |
| RN-01 acceso por rol | `describe('RN-01 PWA solicitud de publicación: acceso')`: el acceso solo aparece si `roles` incluye `veterinarian` | `src/tests/species-request-presenters.test.tsx` |
| RN-02 y RN-06 sin alta | Prueba del cliente: `createVeterinarianApi` no expone métodos de alta de especie | `src/tests/species-request-api.test.ts` |
| RN-04 sin credenciales en cliente | Prueba estática: los archivos de la feature no usan `localStorage`, `sessionStorage` ni `document.cookie` para credenciales | `src/tests/species-request-api.test.ts` |
| RN-07 elegibilidad de la API | Prueba de reglas: el estado deshabilitado depende solo de `next_request_type` | `src/tests/species-request-rules.test.ts` |
| RN-03, RN-05, RN-08, RN-09, RN-10 | RN-03 y RN-08 se cubren en la API (`api-014`) y en la PWA con la prueba de que no hay URL de foto en el markup. RN-10 se cubre con el aviso de CA-03. RN-05 y RN-09 son revisión de texto y de alcance, sin prueba automática | Según fila |

Pruebas de API (`api-014`, PHPUnit en `apps/api`): no forman parte de este plan, salvo la nueva `test_ca26_selector_exposes_published_fields` (T-30 de `api-014`), que es prerequisito de CA-09 y CA-14 en actualizaciones. Este plan asume que las demás existen y pasan; no se verifica aquí.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | React 19, TypeScript, Vite 7, Tailwind 4 y `@arca/api-client` ya en `apps/pwa/package.json`. Sin dependencias nuevas (`packages/api-client` no añade paquetes). Sin ADR nuevo (decisión 6, opción A). |
| II. La spec manda | Sí | Spec 005 Aprobada (2026-11-19), con la alineación de CA-03, CA-13, CA-14, CA-18 y CA-19 aprobada el mismo día (historial de la spec). El plan cita CA-01 a CA-19 y RN-01 a RN-10. `tasks/005-species-request-submission.md` se crea después de aprobar este plan y se marca al implementar. |
| III. Lógica separada de la interfaz | Sí | Elegibilidad, tipo de envío, filtrado, valores NULL y criterio del motivo de rechazo en la API (`ListSelectableSpeciesAction`, `SubmitSpeciesPublicationRequestAction`). La PWA lee `next_request_type` (RN-07) y solo aplica formato (tamaño, tipo, obligatorio). Vistas puras (presentadores); hooks como ViewModels; llamadas solo en `@arca/api-client`. Observación: `apps/pwa/src/services/apiClient.ts` tiene un `fetch` directo en `createAnimalWithPhoto`. Es anterior a esta feature y queda fuera de alcance, pero no se replica (B-3). |
| IV. Un test por criterio | Sí, planificado | Mapeo completo de CA-01 a CA-19 con `describe('CA-xx ...')` y ubicación. Límite: entorno `node` sin DOM; las comprobaciones de foco e interacción con radios quedan como verificación manual, marcada como tal. Ejecución de Vitest, `tsc -b` y lint pendiente de la sesión principal (esta sesión no tiene shell). |
| V. Una sola fuente de verdad para los datos | Sí | MySQL vía API es la autoridad. La PWA no guarda borradores ni copias locales. Sin cambios de esquema; `published_fields` del selector se lee de `species.published_fields`. Eliminación lógica en `species` y solicitudes (SoftDeletes, DBR-013) respetada por la API; la PWA no borra nada. |
| VI. Código en inglés, personas en español | Sí | Identificadores, rutas, campos y nombres de archivo en inglés; textos de UI, avisos, errores y etiquetas en español. Los nombres de los CA se citan en español en las descripciones de test. |

Ninguna excepción se propone. Si en tasks aparece alguna, se detiene y se resuelve antes de programar.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno (sin dependencias nuevas; pruebas sin jsdom ni `@testing-library`).
- **Brechas y divergencias: estado tras las decisiones de 2026-11-19:**
  - **B-1 (resuelta):** el selector devuelve `published_fields`. Enmienda aditiva de `api-014` CA-26, tarea T-30 de `api-014`, antes de implementar CA-09 y CA-14 en actualizaciones y despublicadas.
  - **D-1 (resuelta):** manda la API. El motivo de rechazo en el selector solo para `not_published`. CA-18 de `pwa-005` alineado.
  - **B-2 (resuelta, revisada 2026-11-19 con aprobación de Jonathan):** selector como desplegable (`SelectField`) con resumen de la especie elegida; sustituye la lista de radios de la primera decisión (poco práctica de usar).
  - **B-3 (abierta, fuera de alcance):** `apps/pwa/src/services/apiClient.ts` descarta `errors` del 422 y reescribe el mensaje de 401. Esta feature usa `createVeterinarianApi` directamente. No se corrige el wrapper en este cambio. Se anota como deuda previa (incluido el `fetch` directo de `createAnimalWithPhoto`) para un cambio aparte.
  - **B-4 (resuelta):** ante 401, llevar a inicio de sesión con el aviso «Tu sesión expiró.»; CA-03 y CA-19 alineados.
  - **B-5 (resuelta):** el texto de ayuda sobre correcciones está en CA-14; no hay CA nuevo.
  - **B-6 (verificación, no bloquea):** el controlador de «Mis solicitudes» no declara `page`; depende del paginador de Laravel. Se pide a la API documentar el parámetro en `api-014` y confirmar en su prueba de CA-33. Anotado también como límite de peticiones no definido (ver «Seguridad»).
- **Riesgos:**
  - Dependencia de `api-014` T-30: la PWA no puede cerrar CA-09 y CA-14 en actualizaciones hasta que el selector devuelva `published_fields`. Orden: T-30 antes de la tarea PWA correspondiente.
  - Pruebas de interacción incompletas en entorno `node`. Mitigación: lógica en funciones puras, markup en presentadores y revisión manual en navegador antes de cerrar.
  - Límite de subida en servidor menor de 5 MB más multipart (ver «Seguridad»; ya cubierto por `api-014` T-28).
  - Foto pendiente accesible por URL en pruebas (ADR 0026, aceptado por la spec).
  - Correcciones que cambian la fila compartida de `species` (que también lee `api-006` para mobile). El texto de ayuda de CA-14 lo advierte.
  - Requisito de rol: `roles` viene en el perfil, pero la visibilidad se decide en el cliente. La autorización real está en la API.
- **Alternativas y mitigaciones (cerradas):**
  - Para B-1: se eligió añadir el campo al selector (alternativa B, mostrar solo predeterminados, descartada porque incumple CA-09).
  - Para B-2: primero radios; el 2026-11-19 se cambió a desplegable por usabilidad (Jonathan).
  - Para la prueba de interacción: se eligió la opción A (sin dependencias).

## Rediseño de usabilidad (Jonathan, 2026-11-19)

- Formulario con la maqueta de «Registrar animal» (`animal-form-card`, `animal-form-container`, `image-upload-area`, `form-grid`, `form-actions`): foto con vista previa local (`URL.createObjectURL`, sin URL de servidor, RN-03) a la izquierda y rejilla de dos columnas a la derecha; en móvil una columna con la foto arriba. Ficha pública como chips. Pie con «Limpiar» y «Enviar solicitud». Sección de datos deshabilitada con «Elige una especie para continuar.» hasta elegir especie.
- Pestañas como control segmentado, botones con `aria-pressed`.
- Menú lateral de escritorio: `:focus-within` se sustituye por `:has(:focus-visible)` y se suelta el foco (`blur`) tras navegar con ratón o toque (`event.detail > 0`); al cambiar de sección el contenido vuelve arriba (`scrollTo`). Ninguna spec previa de la PWA define el menú contraíble; se registra aquí como alcance aprobado por Jonathan (T-53).

## Orden y aprobación

Decisiones registradas (Jonathan, 2026-11-19):

1. **B-1, `published_fields` en el selector:** sí. Enmienda aditiva de `api-014` CA-26 (tarea T-30), fuente `species.published_fields`, sin cambio de esquema.
2. **D-1, motivo de rechazo en el selector:** manda la API (solo `not_published`). CA-18 de `pwa-005` alineado.
3. **B-2, forma del selector:** desplegable (revisada el 2026-11-19, Jonathan; antes lista de radios).
4. **B-4, 401:** llevar a inicio de sesión con el aviso «Tu sesión expiró.». CA-03 y CA-19 alineados.
5. **Entrada de navegación (revisada, Jonathan, 2026-11-19):** la sección es accesible desde la tarjeta de «Inicio» y también desde el menú lateral (y la barra móvil), con ícono `paw` y etiqueta accesible «Solicitar publicación de especie», solo para el rol `veterinarian` (`canRequestSpeciesPublication`). Sigue fuera de `pwaSections` (el test de cinco secciones no cambia): `pwaDemo.ts` expone `speciesRequestNavItem` y `getNavigationSections(roles)`, que `AppShell` usa para el menú. Sustituye la decisión original «solo desde Inicio».
6. **Estrategia de pruebas:** opción A, sin dependencias nuevas. Lógica en funciones puras, markup con `renderToStaticMarkup` e interacción real como verificación manual.
7. **Offline:** no aplica. Sin borradores ni cola sin conexión; los datos viven solo en memoria hasta cambiar de sección o cerrar sesión.
8. **Consulta del esquema vivo y responsable técnico:** la consulta de solo lectura de 2026-11-19 está registrada en «Consulta previa del esquema vivo» (sin divergencias con DBR-013). Responsable técnico: Jonathan.

Observación de spec resuelta: el texto de ayuda de «Riesgos» (B-5) quedó en CA-14.

Secuencia propuesta (después de aprobar este plan):

1. Implementar `api-014` T-30 (`published_fields` en el selector) con su test PHPUnit `test_ca26_selector_exposes_published_fields`, en el flujo de `api-014`.
2. Crear `apps/pwa/tasks/005-species-request-submission.md` con `/sdd-tasks` (T-xx ligadas a CA-xx). No se crea hasta aprobar este plan.
3. Implementar en orden: paquete `@arca/api-client` (con su prueba), servicio y ViewModels puros (con pruebas), presentadores (con markup), contenedores y navegación, y por último docs. CA-09 y CA-14 en actualizaciones dependen del paso 1.
4. Verificación: `vitest run` y `tsc -b` en `apps/pwa`, y `/verify`. Esta sesión no tiene shell; esas comprobaciones las ejecuta la sesión principal y se reportan con evidencia. No se afirma que pasen hoy.

Dependencias: `api-014` (selector con `published_fields`, envío, lista propia y reglas), `api-013` (almacenamiento de imágenes), DBR-013 (aplicada en `arca_pruebas`, lote 5), `pwa-004` (alta de animal, seguimiento aparte; el texto de CA-15 lo menciona).

Aprobación técnica: **Jonathan, 2026-11-19**. Plan Aprobado; se avanza a tasks.
