# 014 · species-requests (solicitudes de publicación de especie)

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: selector de especies para el veterinario, envío de solicitudes de primera publicación y de actualización, lista «Mis solicitudes», revisión, edición previa, publicar, actualizar, rechazar, despublicar, republicar, editar una especie despublicada, eliminar la publicación, auditoría); `pwa` (`pwa-005`, consumidor del selector, del envío y de la lista propia; sin cambio de regla de rol); `dashboard` (`dashboard-010`, que absorbe `dashboard-009`); `api-015` (lectura pública de especies publicadas para `web-011`); `packages/api-client` (métodos y tipos); ADR 0026 (sin cambio de carpetas; la enmienda de 2026-11-11 sigue vigente).
- Estado: Borrador
- Solicitante / responsable funcional: (por designar)
- Responsable de BD: (por designar; requiere DBR-013 aprobada)
- Aprobación funcional: (pendiente)

## Historial del cambio de modelo (2026-11-11)

### Primera ronda: de especie nueva a publicación de especie existente

- **Versión anterior (incorrecta):** la solicitud proponía una especie **nueva**; al aceptarla, la API creaba una fila en `species`.
- **Por qué cambia:** la especie ya existe. `AnimalController::store` (`POST /api/v1/staff/animals`) la crea al registrar un animal, con `firstOrCreate` por nombre libre, sin revisión, con `scientific_name` igual al nombre común y `category` NULL.
- **Modelo actual:** la solicitud es de **publicación de una especie existente**. `species_id` es obligatorio desde el envío. Aceptar = publicar: la Action aplica las correcciones a la fila existente, marca `species.is_published` y copia la foto. **No se crea ninguna especie** al aceptar ni desde el formulario.

### Segunda ronda (2026-11-11, decisiones del usuario)

- **Tipo de animal obligatorio al enviar** (resuelve la pregunta «por confirmar» de CA-25). La propuesta de publicarlo siempre y no hacerlo desmarcable queda aceptada.
- **Nombre común no editable** por `zoo-admin` (RN-15; cierra la pregunta 11).
- **Selector** `GET /api/v1/veterinarian/species` aceptado (cierra la pregunta 12). **`published_at`** se añade junto con `is_published` (cierra la pregunta 13).
- **Solicitud de actualización** (`request_type = update`) sobre una especie ya publicada. Una sola solicitud viva por especie, sea `publish` o `update`. Mientras está pendiente, la versión publicada sigue visible sin cambios (CA-32, CA-34).
- **Gestión de la publicación por `zoo-admin`:** despublicar, republicar, editar una especie despublicada y eliminar la publicación (CA-35 a CA-39). Son acciones nuevas; la pregunta 9 y la pregunta 10 quedan resueltas por ellas.
- **Lista «Mis solicitudes» del veterinario** (`GET /api/v1/veterinarian/species-publication-requests`, CA-33). Reemplaza la afirmación anterior de «no hay seguimiento» (RN-07 y pwa-005 CA-07).
- **Avisos al veterinario en v1:** por consulta (lista y selector). Push o correo quedan como opción futura (ver «Riesgos»).
- **Purga de rechazadas:** no se purgan; se conservan (cierra la pregunta 1).
- **Historial de edición:** Activitylog, sin tabla propia (cierra la pregunta 5 y DBR-013 pregunta 1).

### Numeración

- Los CA-01 a CA-31 conservan su número. Cambian de contenido: CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07, CA-08, CA-13, CA-16, CA-19, CA-24, CA-25, CA-26, CA-27 y CA-31.
- Nuevos: CA-32 a CA-41 (actualización, lista propia, una solicitud viva, despublicar, republicar, editar despublicada, eliminar publicación, listado de publicadas, concurrencia y borrado de archivos).
- Las preguntas 1 a 13 conservan su número y se marcan como resueltas o abiertas. Las nuevas son 14 a 21.
- La regla de nombre común duplicado ya no existe (RN-03).

## Decisiones tomadas (2026-11-11)

- **Especie existente, no nueva (decisión del usuario).** El veterinario elige una especie de la lista. Si no está, primero debe existir (la crea `pwa-004` al registrar un animal). La solicitud nunca crea especies (CA-24, CA-29).
- **`species_id` obligatorio desde el envío** (FK RESTRICT, DBR-013).
- **Tipo de envío decidido por la API** (2026-11-12): `publish` si la especie está `not_published`; `update` si está `published` o `unpublished`. El veterinario no elige el tipo.
- **Aceptar** (publicar o actualizar, según `request_type`), sobre la fila existente. Aplica las correcciones, copia la selección de la ficha y, si hay foto nueva, la copia. Confirma en una transacción (CA-08, RN-14).
- **Aceptar sobre una especie despublicada (resuelta, decisión del usuario 2026-11-12; pregunta 22):** la Dirección elige entre «Aceptar y publicar» (`publish: true`: aplica los cambios y deja `is_published = 1`) y «Aceptar sin publicar» (`publish: false`: aplica los cambios y la especie sigue despublicada, republicable después desde «Publicadas»). Para una especie `published` solo existe «Aceptar y publicar»; una `not_published` se publica siempre al aceptar. Ambas opciones respetan la regla de guardar antes de aceptar (dashboard-010 CA-10).
- **Tipo de animal (`category`) obligatorio en el envío** (decidido). La solicitud captura `category` con la lista cerrada de DBR-004 (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`). Si el valor enviado es igual al de la especie, se guarda NULL (sin corrección). Se publica siempre y no forma parte de `published_fields` (decidido; CA-25).
- **Correcciones precargadas y editables** (`scientific_name`, `habitat`, `origin`, `category`). Un valor igual al actual o vacío se guarda NULL (RN-16, CA-30).
- **Nombre común no editable** (decidido; RN-15).
- **Foto:** obligatoria en la primera publicación (`publish`). En una actualización es opcional; sin foto nueva se mantiene la publicada (CA-04, CA-32).
- **Edición antes de decidir.** `PATCH /api/v1/admin/species-publication-requests/{id}` (CA-14 a CA-19). Solo en `submitted`; puede cambiar la foto (CA-23) y la selección de la ficha (CA-22).
- **Ficha pública:** la solicitud guarda `published_fields` con predeterminados (`scientific_name`, `origin` y `habitat`); en una actualización, la PWA los precarga con los de la especie publicada (RN-13).
- **Envío por rol.** El veterinario envía y consulta sus solicitudes por su rol `veterinarian` (`pwa-005` RN-01), sin permiso nuevo.
- **Permisos.** `species.review` se crea con `findOrCreate` y se asigna solo a `zoo-admin`. Se excluye de `admin` de forma explícita (RN-10, CA-20). **Resuelta, decisión del usuario 2026-11-12:** un único permiso, `species.review`, cubre revisar, despublicar, republicar, editar una especie despublicada y eliminar la publicación.
- **Foto en carpeta pública durante pruebas.** La foto pendiente va a `media/species-requests/`, que se publica por `/media` (enmienda del ADR 0026). La API no devuelve su URL. Ver «Recomendación antes de producción».
- **El dashboard no usa `/media`.** Todas las fotos que muestra `dashboard-010` (pendientes y publicadas) llegan por rutas autenticadas (`GET .../{id}/image`, CA-06 y CA-40). La API no devuelve `image_url` en las rutas de administración.
- **Rechazo.** El motivo es obligatorio. La confirmación es un diálogo de `dashboard-010` CA-13; la API no cambia (CA-10).
- **Foto original tras aceptar (opción B, decisión del 2026-11-11).** Al aceptar se copia a `media/species/`, se confirma y se borra la original. `image_path` de la solicitud queda NULL (CA-08, RN-04).
- **Foto reemplazable en la edición (pregunta 4, resuelta).** El `PATCH` acepta foto opcional con las validaciones del envío (CA-23).
- **Correcciones y publicación (decidido).** Publicar cambia la fila de `species` que lee `api-006` (app móvil) y los animales. `mobile` no recibe la publicación ni ninguna pantalla nueva. Ver «Riesgos».
- **Eliminar no revierte las correcciones (resuelta, decisión del usuario 2026-11-12).** Las correcciones ya aplicadas a `species` (nombre científico, hábitat, origen, tipo) se quedan al eliminar la publicación (CA-38, RN-21).
- **Historial de edición:** Activitylog (CA-18, RN-12).
- **Notificación:** v1 sin push ni correo. El veterinario ve el estado y el motivo corto en «Mis solicitudes» y en el selector (CA-26, CA-33).
- **Purga:** no hay purga automática de rechazadas (pregunta 1, resuelta).

## Problema y contexto

El alta de animal crea especies a partir de texto libre, con datos de relleno y sin categoría (`pwa-004`; `apps/api/src/app/Http/Controllers/Api/AnimalController.php`, método `store`). Para que una especie aparezca en el catálogo público (TulanPedia, `web-011`), hace falta un último paso: el veterinario **solicita la publicación de una especie existente** con su foto, su tipo de animal y sus correcciones; la Dirección la revisa, la corrige si hace falta, y la publica o la rechaza. Una vez publicada, la Dirección puede pedir su actualización, despublicarla, republicarla o eliminar su publicación.

## Objetivos

- Exponer `GET /api/v1/veterinarian/species` como selector, con el estado de publicación, el tipo de envío que cabe y, si aplica, el motivo corto de la última rechazada.
- Exponer `POST /api/v1/veterinarian/species-publication-requests` para enviar una solicitud de primera publicación o de actualización, con foto multipart cuando corresponde, sobre una especie existente.
- Exponer `GET /api/v1/veterinarian/species-publication-requests` («Mis solicitudes»): solo las propias, con estado y motivo corto.
- Exponer `GET /api/v1/admin/species-publication-requests` (listado por estado), `GET .../{id}` (detalle actual frente a propuesto) y `GET .../{id}/image` (binario por ruta autenticada).
- Exponer `PATCH /api/v1/admin/species-publication-requests/{id}` para corregir una solicitud pendiente antes de decidir.
- Exponer `POST .../{id}/accept` (publicar o actualizar) con el cuerpo `{publish}` (booleano; `false` = «Aceptar sin publicar», solo en especie despublicada, CA-08) y `POST .../{id}/reject` para `zoo-admin`.
- Exponer las acciones de publicación de una especie existente: `GET /api/v1/admin/published-species` (listado de publicadas y despublicadas), `GET`, `PATCH`, `DELETE` y `POST` de `unpublish` y `republish` sobre `/api/v1/admin/species/{id}/publication`, y `GET /api/v1/admin/species/{id}/image`.
- Publicar en la fila existente de `species`, sin crear ni borrar especies.
- Registrar auditoría de cada operación.

## Fuera de alcance

- Crear especies desde el formulario de solicitud o al aceptar (decisión tomada).
- Cambiar el alta de animal (`pwa-004`, `AnimalController::store`). Es un seguimiento recomendado en una spec aparte.
- Editar directamente la ficha pública de una especie **publicada** sin despublicarla antes (CA-36). Para cambiarla, se despublica, se edita y se republica.
- Editar el nombre común (decidido: no editable).
- Editar solicitudes `accepted` o `rejected`. Reenvío como solicitud nueva sí está en alcance (CA-28); la edición de la rechazada no.
- Restaurar una especie con publicación eliminada sin una solicitud nueva (CA-38).
- Notificaciones push o correo al veterinario (opción futura; ver «Riesgos»).
- Campos extra de la ficha cuya fuente no está decidida (DBR-013 pregunta 8).
- Exportación de solicitudes.
- Lectura pública de especies publicadas (`api-015`) y cualquier cambio de `api-006`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `veterinarian` | Ver el selector, enviar solicitudes de publicación o de actualización, ver «Mis solicitudes» | Sesión válida (Sanctum) y rol `veterinarian` (regla de rol, `pwa-005` RN-01) |
| `zoo-admin` | Listar, ver, editar, publicar, actualizar, rechazar, despublicar, republicar, editar una especie despublicada y eliminar la publicación | Sesión válida + 2FA; permiso `species.review` (asignado en el seeder, tarea T-SEED) |
| `admin` | Sin acceso. Excluido de `species.review` de forma explícita | — |
| `executive`, `cashier` | Sin acceso | — |

## Estados de publicación y elegibilidad

El estado de publicación de una especie **no es una columna**: la API lo deriva de `species.is_published`, `species.unpublished_at` y de si existe una solicitud `submitted` (RN-18). Prioridad: `pending` > `published` > `unpublished` > `not_published`.

| `publication_status` | Condición | Envío del veterinario (`next_request_type`) | Acciones de la Dirección |
|---|---|---|---|
| `not_published` | `is_published = 0`, `unpublished_at` NULL, sin solicitud `submitted` | `publish` | Revisar solicitudes |
| `pending` | Hay una solicitud `submitted` (`publish` o `update`) | `null` (bloqueado) | Revisar, corregir, publicar o rechazar la solicitud |
| `published` | `is_published = 1`, sin solicitud `submitted` | `update` | Despublicar; eliminar la publicación |
| `unpublished` | `is_published = 0`, `unpublished_at` NO NULL, sin solicitud `submitted` | `update` (decidido 2026-11-12) | Republicar; editar la ficha; revisar y aceptar una solicitud (con o sin publicar); eliminar la publicación |

Si una especie `published` tiene una actualización `submitted` y la Dirección la despublica, queda `pending` (prioridad de `pending`). Aceptar esa actualización con «Aceptar y publicar» la vuelve a publicar (`is_published = 1`); con «Aceptar sin publicar» queda despublicada (CA-08, pregunta 22).

Una especie `unpublished` puede recibir una solicitud `update` (decisión del usuario 2026-11-12). La Dirección la ve con la etiqueta «Especie despublicada» (dashboard-010) y el veterinario la ve con el estado «Despublicada» y puede enviarla (pwa-005).

## Historias de usuario

- Como veterinario, quiero elegir una especie existente de una lista y proponer su publicación con foto, tipo de animal y datos corregidos, para que aparezca en el catálogo público.
- Como veterinario, quiero proponer la actualización de una especie ya publicada (foto o datos), para que el catálogo muestre datos correctos sin dejar de mostrar la versión actual mientras se revisa.
- Como veterinario, quiero ver en «Mis solicitudes» si cada solicitud está pendiente, publicada o rechazada, y por qué, para saber qué hacer después.
- Como `zoo-admin`, quiero ver la solicitud junto con los datos actuales de la especie, corregir lo necesario y publicarla o rechazarla con un motivo.
- Como `zoo-admin`, quiero despublicar una especie para ocultarla sin perder su foto ni sus datos, y republicarla sin una solicitud nueva.
- Como `zoo-admin`, quiero corregir la ficha de una especie despublicada antes de volver a publicarla.
- Como `zoo-admin`, quiero eliminar la publicación de una especie cuando ya no debe estar en el catálogo, sin borrar la especie ni sus animales.

## Criterios de aceptación

### Envío (veterinario)

- **CA-01 (envío válido):** Dado un usuario con rol `veterinarian` y sesión válida, cuando llama `POST /api/v1/veterinarian/species-publication-requests` como multipart con `species_id` (obligatorio), `scientific_name`, `habitat`, `origin` (correcciones opcionales, CA-30), `category` (obligatorio, CA-25), `published_fields` (CA-21) e `image` (CA-04), entonces valida los campos y, si la especie es elegible (CA-27), responde `201`. Sin rol `veterinarian` responde `403`; sin sesión, `401`.
  - Verificación: `test_ca01_veterinarian_submits_publication_request`.

- **CA-02 (respuesta, foto y especie intacta):** Ante `201`, la respuesta incluye `id`, `species_id`, `status` (`submitted`), `request_type` (`publish` o `update`) y `created_at`, y ninguna URL de foto. Si hay foto, se guarda en `media/species-requests/<uuid>.<ext>` (disco `media`, ADR 0026) antes de confirmar la transacción. La fila de `species` no cambia: `is_published`, `published_at`, `unpublished_at`, `image_path`, `published_fields` y los campos de la especie quedan como estaban.
  - Verificación: `test_ca02_submit_stores_photo_and_keeps_species_unchanged`.

- **CA-03 (errores de envío en español):** Ante `422`, los mensajes van en `errors.<campo>` y son:
  - «Elige una especie.» (falta `species_id`).
  - «La especie no existe.»
  - «Ya hay una solicitud pendiente para esta especie.» (CA-27, `pending`).
  - «Tipo de animal requerido.» o «Tipo de animal no válido.» (CA-25).
  - «Nombre científico: máximo 150 caracteres.», «Hábitat: máximo 150 caracteres.» y «Origen: máximo 150 caracteres.».
  - «Elige una foto para la primera publicación.» (CA-04, solo en `publish`; texto propuesto).
  - «No se pudo procesar la foto. Intenta con otro archivo.» (CA-04).
  - «Campo no permitido: common_name.» o «species» (CA-29).
  - Un `422` no crea ninguna fila ni guarda ninguna foto.
  - Verificación: `test_ca03_submit_returns_422_messages_in_spanish`.

- **CA-04 (foto):** La foto se valida: MIME `image/jpeg` o `image/png`, tamaño máximo 5 MB. Es **obligatoria** en `publish` y **opcional** en `update` (CA-32): sin foto, la actualización conserva la foto publicada. Un archivo que no se puede leer como imagen responde `422` (CA-03).
  - Verificación: `test_ca04_photo_rules_jpeg_png_5mb_required_only_for_publish`.

### Listado y detalle (administración)

- **CA-05 (listado):** Dado `zoo-admin` con `species.review`, cuando llama `GET /api/v1/admin/species-publication-requests?status=submitted`, entonces responde las solicitudes paginadas (10 por página), ordenadas por `created_at` descendente, con `id`, `species_id`, `common_name` (de `species`), `scientific_name`, `category` efectivos (CA-06), `request_type`, `status`, `created_at` y `veterinarian_name` (de `created_by`). Sin foto en el JSON. `status` vacío lista todas. El listado no incluye solicitudes eliminadas (CA-38).
  - Verificación: `test_ca05_admin_lists_requests_paginated_without_photo`.

- **CA-06 (detalle: actual frente a propuesto):** Dado un `id` válido, cuando llama `GET /api/v1/admin/species-publication-requests/{id}`, entonces responde `200` con:
  - `id`, `status`, `request_type`, `created_at`, `veterinarian_name`, `rejection_reason` (si aplica) y `published_fields` (lista de claves, RN-13).
  - `current`: valores de `species` que están publicados o en el catálogo ahora (`common_name`, `scientific_name`, `habitat`, `origin`, `category`, `is_published`, `published_at`) y `has_image` (booleano: hay foto publicada). La foto publicada se pide por `GET /api/v1/admin/species/{id}/image` (CA-40).
  - `proposed`: valores que se publicarían, con la corrección o, si es NULL, el valor actual (`scientific_name`, `habitat`, `origin`, `category`), `published_fields` propuestos y `has_new_photo` (booleano).
  - Sin URL de ninguna foto. La foto pendiente se sirve por `GET /api/v1/admin/species-publication-requests/{id}/image` (binario, `species.review` y 2FA). En pruebas, la foto pendiente es alcanzable por `/media` si se conoce su URL (riesgo aceptado; ver «Recomendación antes de producción»).
  - Verificación: `test_ca06_detail_shows_current_and_proposed_without_photo_url`.

- **CA-07 (acceso denegado):** Dado un usuario sin `species.review`, cuando llama cualquier ruta de administración de esta spec (listados, detalles, imágenes, edición, publicar, actualizar, rechazar, `published-species`, `species/{id}/publication`, `unpublish`, `republish` o `DELETE` de la publicación), responde `403`. Un `veterinarian` recibe `403` en esas rutas. Sin sesión, `401`. Las rutas de administración exigen 2FA confirmado además del permiso.
  - Verificación: `test_ca07_admin_routes_return_403_without_permission`.

### Publicar, actualizar y rechazar

- **CA-08 (publicar o actualizar = aceptar, sobre la fila existente):** Dada una solicitud en `submitted`, cuando `zoo-admin` con `species.review` y 2FA llama `POST .../{id}/accept` con el cuerpo `{publish}` (booleano, reglas abajo), entonces, en una transacción con bloqueo de la solicitud y de la fila de `species` (RN-11):
  - Aplica a `species` las correcciones no NULL: `scientific_name`, `habitat`, `origin` (según DBR-013 2a) y `category` (valor efectivo, CA-25).
  - Regla de `publish` (resuelta, decisión del usuario 2026-11-12; pregunta 22):
    - Si la especie es `not_published` o `published`, `publish` es `true` (por defecto si falta). Con `publish: false` responde `422` con «Esta solicitud solo puede aceptarse publicándola.».
    - Si la especie es `unpublished`, `publish` por defecto es `true`. Con `publish: true` (**«Aceptar y publicar»**): pone `species.is_published = 1`, `species.unpublished_at = NULL` y `species.published_at` = fecha de esta aceptación. Con `publish: false` (**«Aceptar sin publicar»**): `is_published` sigue en 0, `unpublished_at` y `published_at` no cambian, y la especie queda despublicada y republicable desde «Publicadas» (CA-36).
    - `publish` no booleano responde `422` con «Indica si se publica o no.».
  - Copia `published_fields` a `species.published_fields` en cualquier caso (RN-14). La fecha `published_at` de una aceptación con publicación es la versión publicada vigente (propuesta, pregunta 21).
  - Si la solicitud trae foto, la copia de `media/species-requests/<uuid>.<ext>` a `media/species/<uuid>.<ext>` y guarda `species.image_path` con esa ruta, anotando la ruta anterior de `species.image_path` para borrarla después. Si no trae foto (solo en `update`), `species.image_path` no cambia.
  - Pone la solicitud en `accepted`, guarda `reviewed_by` y `reviewed_at`, y pone `image_path` a NULL.
  - Confirma la transacción. Solo después borra la original en `media/species-requests/` y, si había una foto publicada anterior reemplazada, la borra también (CA-39). Si la transacción falla antes de confirmar, borra la copia nueva en `media/species/` y conserva la original y la foto anterior.
  - Responde `200` con el detalle de publicación de la especie (CA-37, forma `GET`).
  - No crea ni elimina filas de `species` (CA-24).
  - Registra auditoría: «Especie publicada por {admin} a partir de la solicitud de {vet}» (`publish`) o «Actualización publicada por {admin} a partir de la solicitud de {vet}» (`update`).
  - Verificación: `test_ca08_accept_publishes_existing_species_copies_confirms_and_deletes_original` (secuencia: copia, commit, borrado de la original y de la foto anterior, `image_path` NULL en la solicitud), `test_ca08_accept_returns_200_when_original_delete_fails` (la respuesta es `200`, la especie queda publicada y el archivo queda pendiente de reintento), `test_ca08_accept_unpublished_without_publishing_keeps_unpublished` (con `publish: false`, la especie queda con `is_published = 0`, `unpublished_at` sin cambios y datos nuevos) y `test_ca08_publish_param_rules` (`publish: false` en `published` o `not_published` responde `422`; un valor no booleano responde `422`). Todos con `Storage::fake('media')` cuando hay archivos.

- **CA-09 (decisión tardía):** Dada una solicitud que no está en `submitted`, cuando se intenta publicar, actualizar o rechazar, responde `422`: «Esta solicitud ya fue revisada.»
  - Verificación: `test_ca09_late_decision_returns_422`.

- **CA-10 (rechazar):** Dada una solicitud en `submitted`, cuando llama `POST .../{id}/reject` con `{rejection_reason}` (requerido, 1-500 caracteres), entonces:
  - Pone la solicitud en `rejected`, guarda `rejection_reason`, `reviewed_by` y `reviewed_at`.
  - Borra la foto de `media/species-requests/<uuid>.<ext>` si existe, y deja `image_path` en NULL.
  - No cambia `species`: ni `is_published`, ni `published_at`, ni `image_path`, ni `published_fields`. En una actualización, la versión publicada sigue visible (CA-32).
  - Responde `200`. Registra auditoría: «Solicitud de publicación rechazada: {motivo}».
  - Verificación: `test_ca10_reject_deletes_photo_and_keeps_species_unchanged`.

- **CA-11 (motivo):** Ante motivo faltante o fuera de rango, responde `422`: «Motivo requerido (1-500 caracteres).»
  - Verificación: `test_ca11_reject_requires_reason_1_to_500`.

### Transversales

- **CA-12 (sesión y permisos):** Cualquier ruta de esta spec sin sesión válida responde `401`; sin permiso o rol, `403`. Las rutas de `veterinarian` (CA-26, CA-33 y envío) no admiten a `zoo-admin` sin el rol `veterinarian`.
  - Verificación: `test_ca12_session_and_role_errors`.

- **CA-13 (cobertura de pruebas):** Dada la suite PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` con `DatabaseTransactions` y existe al menos un test que nombra cada CA-01 a CA-41.

### Edición previa a la decisión

- **CA-14 (acceso a la edición):** Dada una solicitud en `submitted`, cuando `zoo-admin` con `species.review` y 2FA llama `PATCH /api/v1/admin/species-publication-requests/{id}`, responde `200`. Cuando lo llama `admin`, `executive`, `cashier` o `veterinarian`, responde `403` y no cambia nada. Sin sesión, `401`. Vale igual para `publish` y `update`.
  - Verificación: `test_ca14_patch_request_only_for_review_permission`.

- **CA-15 (campos editables):** Dada una solicitud en `submitted`, cuando se envía uno o más de los campos `scientific_name`, `habitat`, `origin`, `category`, `published_fields` o una foto en `image` (CA-23), con valores válidos, entonces:
  - La API guarda los valores sin espacios al inicio ni al final.
  - `status` sigue en `submitted`. No se publica nada y no se reenvía. `request_type` no cambia.
  - `created_by`, `created_at` y los campos de revisión no cambian. `image_path` cambia solo si se envía una foto nueva.
  - Responde `200` con el JSON de CA-06, ya con los valores guardados.
  - Sin ningún campo en el cuerpo, responde `422` con «Nada que guardar.»
  - Verificación: `test_ca15_patch_saves_trimmed_values_and_keeps_status`.

- **CA-16 (validación de la edición):** Dada una edición, cuando ocurre alguno de estos casos, entonces responde `422` con mensaje en español, no cambia nada y no escribe auditoría:
  - `scientific_name`, `habitat` u `origin` de más de 150 caracteres: «Nombre científico: máximo 150 caracteres.», «Hábitat: máximo 150 caracteres.» u «Origen: máximo 150 caracteres.».
  - `category` fuera de la lista cerrada de DBR-004: «Tipo de animal no válido.». Si el campo llega vacío: «Tipo de animal requerido.» (CA-25).
  - El cuerpo incluye un campo no editable (`common_name`, `species_id`, `status`, `created_by` u otro): «Campo no editable: {campo}.». `common_name` queda fuera por RN-15.
  - Verificación: `test_ca16_patch_validation_in_spanish`.

- **CA-17 (solo en `submitted`):** Dada una solicitud en `accepted` o `rejected`, cuando se llama `PATCH`, entonces responde `422` con «Esta solicitud ya fue revisada.» y no cambia nada (mismo mensaje que CA-09).
  - Verificación: `test_ca17_patch_only_when_submitted`.

- **CA-18 (auditoría de la edición):** Dada una edición válida que cambia al menos un valor, cuando se guarda, entonces Activitylog registra «Solicitud de publicación editada por {admin}» con los valores anteriores y nuevos de los campos cambiados. Una edición que no cambia ningún valor responde `200` y no registra nada. El historial de edición se guarda en Activitylog, sin tabla propia (decidido; DBR-013 pregunta 1).
  - Verificación: `test_ca18_edit_audit_only_when_values_change`.

- **CA-19 (edición y decisión sin carreras):** Dada una edición y una decisión (publicar, actualizar o rechazar) sobre la misma solicitud, o una acción de CA-35 a CA-39 sobre la misma especie, cuando llegan a la vez, entonces la Action ejecuta la operación en una transacción con bloqueo de la solicitud y de la fila de `species`, y comprueba el estado dentro del bloqueo (CA-41). Quien llegue después ve el estado actual.
  - Verificación: prueba secuencial (publicar y después editar responde `422`; editar y después publicar publica los datos editados) y revisión de que la Action usa el bloqueo (CA-41).

### Permisos por seeder

- **CA-20 (permiso solo para `zoo-admin`):** Dado `RolesAndPermissionsSeeder` ejecutado, cuando se comprueba, entonces `species.review` existe en `permissions` (creado con `findOrCreate`), lo tiene solo `zoo-admin`, y `admin` lo tiene excluido de forma explícita. Test: un usuario con rol `admin` recibe `403` en las rutas de solicitudes (CA-07) y un `zoo-admin` con 2FA recibe `200` en el listado. Estado: pendiente de implementar en el seeder (tarea futura T-SEED). Hasta entonces, este CA no se cumple.
  - Verificación: `test_ca20_species_review_only_zoo_admin`.

### Ficha pública, foto, vínculo y tipo

- **CA-21 (campos de la ficha pública):** Dado un envío (`POST`) o una edición (`PATCH`) con `published_fields`, cuando se valida, entonces:
  - El valor es una cadena JSON con un array de claves, por ejemplo `["scientific_name","origin","habitat"]`. La cadena vacía o `[]` significa solo nombre común y foto.
  - Cada clave debe estar en RN-13. Una clave fuera de la lista, incluidas `common_name`, `category` e `image`, responde `422` con «Campo no permitido en la ficha pública: {clave}.» y error en `errors.published_fields`.
  - Si el valor no es un array JSON de cadenas, responde `422` con «La selección de campos públicos no es válida.».
  - Las claves repetidas se guardan una vez. Sin `published_fields` en un envío, se guardan los predeterminados de RN-13.
  - Verificación: `test_ca21_published_fields_validation`.

- **CA-22 (edición de la selección):** Dada una solicitud en `submitted`, cuando `PATCH` trae `published_fields`, entonces reemplaza la lista completa (no la combina), responde `200` con el JSON de CA-06 y registra la auditoría de CA-18 con la lista anterior y la nueva solo si cambia. Sin `published_fields` en el cuerpo, la lista guardada no cambia.
  - Verificación: `test_ca22_patch_replaces_published_fields`.

- **CA-23 (reemplazo de la foto en la edición):** Dada una solicitud en `submitted`, cuando `PATCH` trae un archivo en `image` (multipart), entonces:
  - Se valida como en CA-02 y CA-04 (JPG o PNG, máx. 5 MB). Un archivo no procesable responde `422` con «No se pudo procesar la foto. Intenta con otro archivo.» y no cambia nada.
  - La API guarda la foto nueva en `media/species-requests/<uuid>.<ext>` antes de abrir la transacción. Dentro de la transacción con bloqueo (CA-19) actualiza `image_path`. Tras confirmar, borra el archivo anterior, que no se conserva (decisión del 2026-11-11, pregunta 8). Si la transacción falla, borra la foto nueva y conserva la anterior.
  - Si el archivo anterior ya no existe, la respuesta sigue siendo `200` y se registra un aviso técnico que no se muestra al usuario.
  - Responde `200` con el JSON de CA-06, sin URL de la foto.
  - Registra en Activitylog «Foto de solicitud de publicación reemplazada por {admin}», sin ruta ni nombre de archivo.
  - Si la solicitud ya no está en `submitted`, responde `422` con «Esta solicitud ya fue revisada.» (CA-17), no guarda la foto y borra la foto nueva.
  - El método HTTP de este `PATCH` con multipart lo decide el plan (ver «Riesgos»).
  - Verificación: prueba de la secuencia (foto nueva guardada, fila actualizada, archivo anterior borrado) y prueba de fallo de la transacción (archivo nuevo borrado, anterior conservado).

- **CA-24 (vínculo con la especie existente; nunca se crea ni borra especie):** Dado un envío, una edición, una publicación, una actualización, una acción de CA-35 a CA-39 o un rechazo, cuando se ejecutan, entonces `species_publication_requests.species_id` no cambia, la operación actúa sobre la especie con ese mismo `id`, y ninguna operación crea ni borra filas de `species`. `species_id` es NOT NULL desde el envío (DBR-013). Verificación: `test_ca24_request_never_creates_or_deletes_species_rows` (cuenta las filas de `species` antes y después de cada operación y compara `species_id`).

- **CA-25 (tipo de animal obligatorio):** Dado el envío (`POST`) o la edición (`PATCH`) de una solicitud en `submitted`, cuando se valida `category`, entonces:
  - El campo es **obligatorio** en el envío (decidido el 2026-11-11). Si falta o llega vacío, responde `422` con «Tipo de animal requerido.», aunque la especie ya tenga tipo. La PWA precarga el tipo actual, así que el caso normal no ocurre.
  - El valor debe estar en la lista cerrada de DBR-004: `mammal`, `bird`, `reptile`, `amphibian`, `fish` o `invertebrate`. Otro valor responde `422` con «Tipo de animal no válido.» y error en `errors.category`.
  - Si el valor enviado es igual a `species.category`, se guarda NULL (sin corrección, CA-30). Si es distinto, se guarda como corrección.
  - Un `PATCH` con `category` reemplaza la corrección anterior. Con un valor válido responde `200` con el JSON de CA-06 y registra en la auditoría de CA-18 el valor anterior y el nuevo. Un `PATCH` con `category` vacío responde `422` con «Tipo de animal requerido.».
  - Al publicar o actualizar (CA-08), `species.category` recibe el valor efectivo (corrección, o el valor actual si la corrección es NULL).
  - `category` se publica siempre y no es desmarcable (decidido el 2026-11-11). No se acepta en `published_fields`: esa clave responde `422` con «Campo no permitido en la ficha pública: category.» (CA-21).
  - Verificación: `test_ca25_store_requires_category`, `test_ca25_store_rejects_category_outside_closed_list`, `test_ca25_update_replaces_category_and_audits_change`, `test_ca25_update_rejects_empty_or_unknown_category` y `test_ca25_accept_writes_effective_category_to_species`. Todos con `DatabaseTransactions` sobre `arca_pruebas`.

### Selector, elegibilidad y actualizaciones

- **CA-26 (selector de especies para el veterinario):** Dado un usuario con rol `veterinarian`, cuando llama `GET /api/v1/veterinarian/species`, entonces responde `200` con `data`: cada especie trae `id`, `common_name`, `scientific_name`, `habitat`, `origin`, `category` (NULL si no tiene), `publication_status` (RN-18: `not_published`, `pending`, `published` o `unpublished`), `next_request_type` (`publish` si `not_published`; `update` si `published` o `unpublished`; `null` si `pending`) y `last_rejection_reason`.
  - `last_rejection_reason` trae el motivo de la última solicitud **propia** de esa especie si esa solicitud está `rejected` y `publication_status` es `not_published`; en otro caso, `null`. No muestra motivos de otros veterinarios.
  - Orden `common_name` ascendente y, a igual nombre, `id` ascendente. Sin paginación (propuesta, como `api-006` RN-07). No incluye datos de revisión ni de otros veterinarios. Sin rol `veterinarian`, `403`.
  - Verificación: `test_ca26_veterinarian_lists_species_with_publication_status`.

- **CA-27 (elegibilidad al enviar):** Dado un envío con `species_id`, cuando se valida dentro de la transacción con bloqueo de la fila de `species` (RN-11), entonces:
  - Si `publication_status` es `not_published`, crea una solicitud `publish`.
  - Si es `published` o `unpublished` y no hay solicitud viva, crea una solicitud `update` (decidido 2026-11-12).
  - Si es `pending`, responde `422` con «Ya hay una solicitud pendiente para esta especie.» y no crea ninguna fila.
  - Dos envíos simultáneos para la misma especie no crean dos solicitudes vivas.
  - Verificación: `test_ca27_eligibility_by_publication_status`.

- **CA-28 (reenvío tras rechazo):** Dada una especie cuya última solicitud está `rejected` y `publication_status` es `not_published`, cuando el veterinario envía una solicitud nueva, entonces responde `201` y crea una fila nueva de tipo `publish`. La fila rechazada no cambia.
  - Verificación: `test_ca28_rejected_species_accepts_new_publish_request`.

- **CA-29 (sin alta de especie):** Dado un envío o una edición que trae `common_name` o `species` (nombre libre), cuando se valida, entonces responde `422` con «Campo no permitido: common_name.» (o `species`), y no crea ninguna especie ni fila.
  - Verificación: `test_ca29_submit_rejects_common_name_and_creates_no_species`.

- **CA-30 (correcciones sin cambio o vacías):** Dado un envío o un `PATCH` con una corrección (`scientific_name`, `habitat`, `origin` o `category`) vacía o igual al valor actual de `species`, cuando se guarda, entonces se guarda NULL y la especie conserva su valor al publicar. Un valor distinto se guarda sin espacios sobrantes. Verificación: `test_ca30_unchanged_or_empty_correction_is_stored_as_null`.

- **CA-31 (la publicación cambia solo en las acciones de publicación):** Dada cualquier solicitud en `submitted` o `rejected`, cuando se envía, se edita o se rechaza, entonces `species.is_published`, `species.published_at`, `species.unpublished_at`, `species.image_path` y `species.published_fields` no cambian. Solo cambian con `accept` (CA-08) y con las acciones de la Dirección de CA-35 a CA-39. Verificación: `test_ca31_publication_columns_change_only_in_publication_actions`.

- **CA-32 (actualización de una especie publicada o despublicada):** Dada una especie `published` o `unpublished`, cuando el veterinario envía una solicitud, entonces:
  - La solicitud es `request_type = update` (CA-27) y la foto es opcional (CA-04).
  - Mientras está `submitted`, la versión publicada no cambia: `GET /api/v1/published-species` (`api-015`, CA-17) sigue devolviendo los datos y la foto anteriores.
  - Al aceptar (CA-08), se reemplazan las correcciones, `published_fields` y, si hay foto nueva, la foto. La especie sigue visible durante toda la operación (nunca queda despublicada). `published_at` pasa a la fecha de la aceptación.
  - Si la especie está `unpublished`, la solicitud `update` no la publica por sí misma: la Dirección la decide con «Aceptar y publicar» o «Aceptar sin publicar» (CA-08). Mientras está pendiente, la especie sigue despublicada y no aparece en `api-015`, aunque tenga una solicitud viva (`api-015` CA-18).
  - Verificación: `test_ca32_update_keeps_published_version_until_accept`, `test_ca32_update_accept_replaces_data_and_keeps_species_listed`, `test_ca32_update_without_photo_keeps_current_image` y `test_ca32_unpublished_update_stays_hidden_until_publish_accept`.

- **CA-33 (lista «Mis solicitudes» del veterinario):** Dado un usuario con rol `veterinarian`, cuando llama `GET /api/v1/veterinarian/species-publication-requests`, entonces responde `200` con `data` paginada (10 por página, `meta.has_more`):
  - Solo las solicitudes creadas por ese usuario (`created_by`), no eliminadas (CA-38), ordenadas por `created_at` descendente y `id` descendente.
  - Cada elemento trae `id`, `species_id`, `common_name`, `request_type`, `status`, `created_at`, `reviewed_at` (NULL si no hay decisión), `rejection_reason` (solo en `rejected`, completo; propuesta por confirmar, pregunta 17) y `species_publication_status` (estado actual de la especie, RN-18: `published` o `unpublished` para mostrar «Despublicada»; ver pwa-005 CA-16).
  - Sin fotos, sin nombre de la persona revisora y sin datos de otros veterinarios.
  - Sin rol `veterinarian`, `403`; sin sesión, `401`.
  - Verificación: `test_ca33_veterinarian_lists_only_own_requests`.

- **CA-34 (una solicitud viva por especie):** Dada una especie con una solicitud `submitted`, cuando se envía otra solicitud para ella, entonces responde `422` con «Ya hay una solicitud pendiente para esta especie.», sea de `publish` o de `update`. La regla vale aunque la especie esté publicada o despublicada. Las solicitudes `accepted` y `rejected` no bloquean un envío nuevo. Verificación: `test_ca34_only_one_live_request_per_species`.

### Acciones de la Dirección sobre la publicación

- **CA-35 (despublicar):** Dada una especie `published`, cuando `zoo-admin` con `species.review` y 2FA llama `POST /api/v1/admin/species/{id}/unpublish`, entonces, en una transacción con bloqueo de la fila de `species`:
  - Pone `species.is_published = 0` y `species.unpublished_at` con la fecha actual.
  - Conserva `image_path`, `published_fields`, `published_at` y los datos. No borra ningún archivo ni fila, y no cambia las solicitudes.
  - Responde `200` con el detalle de publicación (CA-37, forma `GET`).
  - Si la especie no está `published`, responde `422` con «Esta especie no está publicada.».
  - Registra auditoría: «Especie despublicada por {admin}».
  - `api-015` la deja de devolver de inmediato (`api-015` CA-18).
  - Verificación: `test_ca35_unpublish_hides_species_without_deleting_data`.

- **CA-36 (republicar):** Dada una especie `unpublished`, cuando `zoo-admin` con `species.review` y 2FA llama `POST /api/v1/admin/species/{id}/republish`, entonces, en una transacción con bloqueo:
  - Pone `species.is_published = 1`, `species.unpublished_at = NULL` y `species.published_at` con la fecha actual. No crea ni requiere una solicitud nueva.
  - Antes de publicar comprueba que existen `image_path` y `published_fields`. Si falta la foto, responde `422` con «No se puede republicar: falta la foto publicada.» (propuesta por confirmar, pregunta 20).
  - Si hay una solicitud `submitted` para la especie, responde `422` con «Hay una solicitud pendiente para esta especie. Decide sobre ella antes de republicar.».
  - Si la especie está `published`, responde `422` con «Esta especie ya está publicada.»; si está `not_published`, responde `422` con «Esta especie no tiene una ficha publicada para restaurar.».
  - Responde `200` con el detalle de publicación. Registra auditoría: «Especie republicada por {admin}». `api-015` la vuelve a devolver de inmediato.
  - Verificación: `test_ca36_republish_without_new_request_and_guards`.

- **CA-37 (editar la ficha de una especie despublicada):** Dada una especie `unpublished`, cuando `zoo-admin` con `species.review` y 2FA llama `GET /api/v1/admin/species/{id}/publication` (detalle) o `PATCH /api/v1/admin/species/{id}/publication`, entonces:
  - El detalle responde `200` con `id`, `common_name`, `scientific_name`, `habitat`, `origin`, `category`, `publication_status`, `is_published`, `published_at`, `unpublished_at`, `published_fields`, `has_image` y `has_pending_request`.
  - El `PATCH` admite `scientific_name`, `habitat`, `origin`, `category`, `published_fields` (CA-21) e `image` (CA-23, con foto guardada en `media/species/` según la pregunta 15, punto c). Un valor vacío en `scientific_name`, `habitat` u `origin` se guarda NULL. Un `category` vacío responde `422` con «Tipo de animal requerido.».
  - `common_name` responde `422` con «Campo no editable: common_name.» (RN-15).
  - El `PATCH` **no publica** y no cambia `is_published`. Escribe directamente en `species`, sin correcciones pendientes.
  - Responde `200` con el detalle. Sin campos en el cuerpo, `422` con «Nada que guardar.». Sin cambios reales, `200` sin auditoría.
  - Auditoría con valores anteriores y nuevos: «Ficha de especie despublicada editada por {admin}».
  - Si la especie está `published`, responde `422` con «Despublica la especie antes de editar su ficha pública.». Si está `not_published`, `422` con «Esta especie no tiene una ficha publicada que editar.». Si está `pending`, `422` con «Hay una solicitud pendiente para esta especie. Decide sobre ella antes de editar.».
  - Verificación: `test_ca37_edit_unpublished_species_without_publishing`.

- **CA-38 (eliminar la publicación):** Dada una especie `published` o `unpublished`, cuando `zoo-admin` con `species.review` y 2FA llama `DELETE /api/v1/admin/species/{id}/publication`, entonces, en una transacción con bloqueo de la fila de `species` y de sus solicitudes:
  - Pone `species.is_published = 0`, `species.published_at = NULL`, `species.unpublished_at = NULL`, `species.image_path = NULL` y `species.published_fields = NULL`.
  - Marca como eliminadas (SoftDeletes, `deleted_at`) **todas** las solicitudes de esa especie, incluidas las `submitted`, `accepted` y `rejected` (decidido el 2026-11-11; consecuencia en «Riesgos»). Su `image_path` pasa a NULL.
  - **No revierte** las correcciones ya aplicadas a `scientific_name`, `habitat`, `origin` o `category` de `species`. Anotado como limitación.
  - No borra la fila de `species`. La especie y sus animales siguen existiendo.
  - Tras confirmar, borra la foto pública de `media/species/` y las fotos pendientes de las solicitudes eliminadas (CA-39).
  - Responde `200` con el detalle de publicación, con `publication_status = not_published`. Para volver a publicarla hace falta una solicitud nueva (`publish`, CA-28).
  - Si la especie está `not_published`, responde `422` con «Esta especie no tiene publicación que eliminar.».
  - Registra auditoría: «Publicación de especie eliminada por {admin}», con los identificadores de las solicitudes marcadas.
  - Verificación: `test_ca38_delete_publication_keeps_species_row_and_soft_deletes_requests`.

- **CA-39 (borrado seguro de archivos):** Dada una acción que borra archivos (aceptar con foto nueva en CA-08, reemplazo en CA-23, rechazo en CA-10 y eliminar en CA-38), cuando se ejecuta, entonces los archivos se borran **solo después de confirmar la transacción**. Si el borrado falla tras confirmar, la respuesta sigue siendo `200` y se registra un aviso técnico; el archivo queda para reintento. Si la transacción falla, no se borra ningún archivo original y se borra cualquier copia nueva. Verificación: `test_ca39_files_removed_only_after_commit` con `Storage::fake('media')`.

- **CA-40 (listado de publicadas y despublicadas):** Dado `zoo-admin` con `species.review`, cuando llama `GET /api/v1/admin/published-species?status=&category=&page=`, entonces:
  - Responde las especies con `is_published = 1` o con `unpublished_at` no nulo (nunca `not_published`), paginadas de 10 en 10 (`meta.has_more`), ordenadas por `published_at` descendente y `id` descendente.
  - `status` acepta `published`, `unpublished` o vacío (ambas). `category` acepta los seis valores de DBR-004 o vacío. Un valor fuera de lista responde `422` con «Tipo de animal no válido.».
  - Cada elemento trae `id`, `common_name`, `scientific_name`, `category`, `status` (`published` o `unpublished`), `published_at`, `unpublished_at`, `has_image` y `has_pending_request`. No trae URL de la foto.
  - Las fotos se piden por `GET /api/v1/admin/species/{id}/image` (binario, `species.review` y 2FA). Responde `404` si la especie no tiene foto.
  - Verificación: `test_ca40_admin_lists_published_and_unpublished_species_and_serves_image`.

- **CA-41 (concurrencia de las acciones de publicación):** Dadas las acciones de CA-08, CA-10, CA-15, CA-22, CA-23, CA-35, CA-36, CA-37 y CA-38, cuando dos llegan a la vez sobre la misma especie o solicitud, entonces cada una ejecuta su operación en una transacción con bloqueo de la fila de `species` y, si aplica, de la solicitud, y comprueba el estado dentro del bloqueo. Quien llegue después ve el estado actual: si la solicitud ya no existe porque se eliminó (CA-38), responde `404` con «Solicitud no encontrada.»; si ya no está `submitted`, `422` (CA-09 o CA-17); si la especie ya cambió de estado, responde con el mensaje de esa acción. Verificación: `test_ca41_publication_actions_recheck_state_inside_lock` (prueba secuencial: despublicar y después republicar; republicar con solicitud pendiente; eliminar y después aceptar).

## Reglas de negocio

- **RN-01 (acceso):** Solo `veterinarian` puede ver el selector, enviar y consultar sus solicitudes, por regla de rol (`pwa-005` RN-01). Solo `zoo-admin` con `species.review` y 2FA puede listar, ver, editar, publicar, actualizar, rechazar, despublicar, republicar, editar una especie despublicada o eliminar una publicación. Ningún otro rol tiene acceso.
- **RN-02 (estados de la solicitud):** Estados válidos: `submitted`, `accepted`, `rejected`. Transiciones: `submitted` → `accepted` (publicar o actualizar) o `rejected`; ambos terminales. La edición no es una transición de estado. Una solicitud eliminada (SoftDeletes) no aparece en ninguna lista ni en ninguna decisión.
- **RN-03 (una solicitud viva por especie):** Una especie tiene como máximo una solicitud `submitted`, sea `publish` o `update`. El tipo se decide por `publication_status` (CA-27). Las solicitudes `accepted` y `rejected` no bloquean un envío nuevo. La regla se aplica en el envío (CA-34) y dentro del bloqueo (RN-11).
- **RN-04 (foto):** La foto pendiente se guarda en `media/species-requests/` (disco `media`). Al publicar o actualizar se copia a `media/species/` con el mismo nombre, se confirma la transacción y después se borran la original y la foto publicada que se reemplazó (CA-08, CA-39); al rechazar se borra (CA-10); al reemplazarla en la edición, el archivo anterior se borra tras confirmar (CA-23); al eliminar la publicación se borran la foto pública y las fotos pendientes de las solicitudes eliminadas (CA-38). En pruebas, ambas carpetas se publican por `/media`. La API no devuelve la URL de ninguna foto en las respuestas de administración.
- **RN-05 (autoridad de la API):** La API es la única autoridad de estados, elegibilidad, tipo de envío, correcciones, publicación y auditoría. El dashboard y la PWA solo presentan y solicitan.
- **RN-06 (mensajes):** Mensajes en español; identificadores, rutas y campos en inglés (Constitución VI).
- **RN-07 (feedback al veterinario):** El veterinario consulta sus solicitudes en «Mis solicitudes» (CA-33) y el estado de cada especie en el selector (CA-26). Ve el motivo de una rechazada (`rejection_reason`) y no recibe ninguna notificación activa. Opción futura: push o correo (ver «Riesgos»).
- **RN-08 (foto binaria):** La foto pendiente se entrega solo por la ruta autenticada `admin.species-publication-requests.image`; la publicada, por `admin.species.image` (análoga a `admin.memories.image` de `api-013`). Ninguna respuesta de administración incluye una URL.
- **RN-09 (edición previa):** Solo en `submitted`. Cambia `scientific_name`, `habitat`, `origin`, `category` y `published_fields`, y la foto solo si se envía una nueva (CA-23). No cambia el estado, no publica y no reenvía. Valida como el envío (CA-16, CA-21, CA-23, CA-25).
- **RN-10 (permisos del seeder):** `species.review` se crea en `RolesAndPermissionsSeeder` con `Permission::findOrCreate` y se asigna solo a `zoo-admin`. El seeder da a `admin` todos los permisos de su arreglo salvo `tickets.create` y `tickets.cancel`. Por eso `species.review` (y `memories.review`, `api-010` RN-07) debe excluirse de `admin` de forma explícita. `executive`, `cashier` y `veterinarian` no lo reciben. El seeder no borra permisos existentes.
- **RN-11 (concurrencia):** Todas las operaciones de esta spec que cambian una solicitud o una especie usan transacción con bloqueo de la fila de la solicitud y de la fila de `species`. La comprobación de estado y de elegibilidad se hace dentro del bloqueo (CA-19, CA-27, CA-41).
- **RN-12 (auditoría):** Cada envío, edición, publicación, actualización, rechazo, despublicación, republicación, edición de especie despublicada y eliminación de publicación queda registrado en Activitylog con el actor, las fechas y, en las ediciones, los valores anteriores y nuevos (CA-18, CA-37). El veterinario creador y la Dirección revisora quedan identificados. Las solicitudes eliminadas conservan su auditoría.
- **RN-13 (campos de la ficha pública):** `common_name` y la foto se publican siempre. `category` se publica siempre cuando la especie lo tiene, y es obligatorio en el envío (decidido el 2026-11-11; no aparece en `published_fields`). El resto se elige de una lista cerrada que valida la API: `scientific_name`, `origin` y `habitat` vienen marcados por defecto; `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics` vienen desmarcados. Desmarcar un campo solo evita que se muestre en el portal: el dato sigue guardado en la solicitud y es visible para `zoo-admin` en el dashboard. Las claves `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics` no se implementan hasta resolver DBR-013 pregunta 8. En una actualización, la PWA precarga la selección de la especie publicada.
- **RN-14 (publicar o actualizar = aceptar, sobre la fila existente):** Aceptar actualiza la fila de `species` con las correcciones efectivas, `category`, `published_fields` e `image_path` (si hay foto nueva). Además, con publicación (`publish: true`) pone `is_published = 1`, `unpublished_at = NULL` y `published_at` (fecha de la aceptación). Sin publicación (`publish: false`, solo en `unpublished`) no toca `is_published`, `unpublished_at` ni `published_at` (CA-08). No crea especies. Es la única operación de la solicitud que cambia la publicación.
- **RN-15 (nombre común no editable; decidido):** El `zoo-admin` no edita `common_name`, ni en la solicitud ni en la especie despublicada. Es la identidad de la fila de `species` y de los animales; `mobile` la lee sin cambios (`api-006`).
- **RN-16 (correcciones NULL):** Una corrección vacía o igual al valor actual se guarda NULL, y `species` conserva su valor (CA-30). Desde la solicitud no se puede borrar un dato existente (limitación de la v1). La edición directa de CA-37 sí puede borrar un valor.
- **RN-17 (sin efecto público antes de decidir):** Los datos propuestos no son visibles en ninguna lectura pública. En una actualización de una especie publicada, la versión publicada sigue visible hasta que se acepta (CA-32). Una especie despublicada no aparece en `api-015` aunque tenga una solicitud viva (`api-015` RN-03, CA-18). `api-015` lee solo `species` con `is_published = 1`.
- **RN-18 (estados de publicación de la especie):** El `publication_status` se deriva en la API con la tabla de «Estados de publicación y elegibilidad» (prioridad `pending` > `published` > `unpublished` > `not_published`). No es una columna. `api-015` y `dashboard-010` lo usan tal cual; la PWA no lo recalcula.
- **RN-19 (despublicar, republicar y eliminar):** Despublicar solo oculta; no borra nada (CA-35). Republicar vuelve a publicar la ficha guardada sin solicitud nueva, pero exige foto y datos publicados y ninguna solicitud viva (CA-36). Eliminar la publicación borra la foto pública y los datos publicados, marca como eliminadas las solicitudes y no borra la especie (CA-38). Todas exigen `species.review` y 2FA.
- **RN-20 (SoftDeletes):** Las solicitudes tienen `deleted_at` y no se borran físicamente (Constitución V). La fila de `species` no se borra en ninguna operación de esta spec. Que `species` tenga SoftDeletes depende de DBR-013 pregunta 13.
- **RN-21 (correcciones aplicadas a la especie):** Una vez aceptada una corrección o editada directamente, el dato de `species` no se revierte al despublicar o eliminar la publicación. Es un cambio sobre la fila de `species` que lee `api-006`, y se documenta en «Riesgos».

## Datos, privacidad y auditoría

- Solicitud pendiente: la foto no tiene URL en ninguna respuesta de la API. En pruebas, la carpeta es alcanzable por `/media` si se conoce la URL (riesgo aceptado; ADR 0026, riesgo m).
- Especie publicada: pública; foto y datos visibles en el catálogo (`api-015`) y, en parte, en `api-006` para especies con animales (ver «Riesgos»). La foto publicada se sirve al dashboard solo por ruta autenticada (CA-40).
- Especie despublicada: su foto y sus datos se conservan en `species` y no son visibles en lecturas públicas (`api-015` CA-18). En pruebas, su foto sigue en `media/species/`, que es pública por `/media` si se conoce la URL. Riesgo aceptado, mismo criterio que la pregunta 15, punto c.
- Especie con publicación eliminada: sin foto ni datos publicados; la fila de `species` y los animales siguen.
- Auditoría: veterinario creador, revisor, timestamp, estado, motivo de rechazo y cada edición con valores anteriores y nuevos (Activitylog; pregunta 1 resuelta).
- No requiere consentimiento adicional del veterinario (obra por encargo).
- Longitud de `scientific_name`, `habitat` y `origin`: 150 caracteres (CA-03, CA-16).
- `species` no tiene `SoftDeletes` (Constitución V; DBR-013 pregunta 13). Las operaciones de esta spec no borran filas de `species`.
- Retención: las solicitudes se conservan, incluidas las rechazadas (sin purga automática; pregunta 1 resuelta). Las eliminadas por CA-38 quedan con `deleted_at`.

## Flujos y errores

1. Veterinario abre el selector (`GET /api/v1/veterinarian/species`) y elige una especie con `next_request_type` no nulo.
2. Revisa las correcciones precargadas, elige tipo de animal y, si es primera publicación, la foto; envía → `201` (CA-01, CA-27, CA-32).
3. Consulta «Mis solicitudes» (CA-33) para ver si está pendiente, publicada o rechazada, y el motivo si lo está.
4. `zoo-admin` lista solicitudes `submitted` (CA-05) y abre el detalle, que compara datos actuales y propuestos (CA-06).
5. Opcional: edita correcciones, ficha o foto (`PATCH`) → sigue en `submitted` (CA-15).
6. Publica o actualiza (`accept` con `publish: true`) → la especie queda `is_published = 1` y visible en `api-015` (CA-08, CA-32; `api-015` CA-01). Con `publish: false` (solo especie despublicada) la especie sigue oculta (CA-08).
7. O rechaza con motivo → la solicitud queda `rejected`, la foto se borra y la especie no cambia (CA-10).
8. Gestión posterior (solo `zoo-admin`): despublicar (CA-35) oculta la especie sin borrar; republicar (CA-36) la vuelve a mostrar; editar una despublicada (CA-37) corrige su ficha antes de republicar; eliminar la publicación (CA-38) borra foto y datos publicados, marca las solicitudes y deja la especie.
9. Errores: `401` sin sesión; `403` sin rol o sin `species.review`; `404` solicitud o especie no encontrada (también una solicitud eliminada); `422` validación, campo no editable, ya revisada, especie no elegible o estado incompatible con la acción.

## Recomendación antes de producción

Deuda y riesgo conocido: en pruebas, una foto pendiente de `media/species-requests/` puede verse si alguien conoce su URL (`/media/species-requests/<uuid>.<ext>`). La API no la revela, pero no hay control de acceso al archivo. Lo mismo vale para las fotos de `media/species/` de especies despublicadas.

Antes de producción hay que elegir una de estas dos opciones, y se configurará entonces (`.env`, `infra/README.md` y una enmienda del ADR 0026 o un ADR propio):

- **A. Almacenamiento privado:** sacar `species-requests/` y las fotos de especies despublicadas de la carpeta publicada, y servirlas solo por ruta protegida con `species.review` (o por URL firmada de corta duración).
- **B. Otro almacenamiento:** migrar la carpeta a un almacenamiento de objetos, como describe `docs/propuestas/almacenamiento-objetos-s3.md`. Requiere ADR propio.

## Dependencias, riesgos y preguntas

- **Dependencias:**
  - DBR-013 (`docs/database/requests/DBR-013-species-requests.md`, Borrador): tabla `species_publication_requests` (`species_id` NOT NULL desde el envío, `request_type`, `deleted_at`) y columnas `is_published`, `published_at`, `unpublished_at`, `image_path` y `published_fields` en `species`. Las decisiones de BD son 2a (origen), 2c (forma de la solicitud) y las preguntas 8, 14 y 15 a 17 de DBR-013. Bloquea la implementación hasta que BD apruebe.
  - `api-013` (Borrador) y ADR 0026 (Propuesto; enmienda del 2026-11-11 con `species/` y `species-requests/`).
  - `api-015` (Borrador): lectura pública de especies publicadas; CA-17 y CA-18 cubren la actualización pendiente y las acciones de despublicar, republicar y eliminar.
  - `dashboard-010` (Borrador): revisión, edición, publicación, actualización, rechazo, despublicación, republicación, edición y eliminación desde el dashboard.
  - `pwa-005` (Borrador): selector, envío, precarga y «Mis solicitudes».
  - `pwa-004` (En progreso): alta de animal. Seguimiento recomendado: que el registro elija una especie de la lista en vez de crearla por nombre libre (spec aparte; fuera de esta spec).
  - `api-007` (2FA y rutas `/api/v1/admin`).
  - Permiso `species.review` nuevo (RN-10 y la tarea T-SEED).
  - **Sin ADR ni dependencia nueva para v1.** El aviso por consulta no necesita nada más.

- **Tarea futura T-SEED (pendiente de `apps/api/tasks/014-species-requests.md`; no se implementa con esta spec):** cambio en `apps/api/src/database/seeders/RolesAndPermissionsSeeder.php`. Hoy el archivo no contiene `species.review` ni `memories.review` (este último pertenece a la cadena de momentos: `api-010` RN-07 y CA-16, y `dashboard-008`; aquí solo se incluye porque el cambio de seeder es el mismo y `admin` debe excluirse de ambos permisos), y el rol `admin` recibe `array_diff($permissions, ['tickets.create', 'tickets.cancel'])`, es decir, todos los permisos del arreglo.
  1. Añadir `species.review` y `memories.review` al arreglo `$permissions`, creados con `Permission::findOrCreate`.
  2. Excluir ambos de `admin`: `array_diff($permissions, ['tickets.create', 'tickets.cancel', 'species.review', 'memories.review'])`. La exclusión es explícita.
  3. Asignar ambos solo a `zoo-admin`. `executive`, `cashier` y `veterinarian` no los reciben.
  4. Test de CA-20: `admin` recibe `403` y `zoo-admin` con 2FA recibe `200`.
  5. Anotar el cambio en `infra/README.md` (checklist de seeder de permisos).

- **Riesgos:**
  - **Publicar cambia la fila de `species`.** Las correcciones aceptadas cambian `scientific_name`, `habitat`, `distribution` (u `origin`) y `category`. Decisión del usuario (2026-11-12): la publicación de especies es solo del portal web (TulanPedia). `mobile` no recibe esta función ni ninguna pantalla nueva. Lo único compartido es la tabla `species`: `GET /api/v1/species` (`api-006`, sin cambios) ya lee esa fila y expone los datos corregidos para especies con animales. Una `category` asignada hace que la especie cuente en `category_species_count` (`api-005`, misiones de `mobile-005`). Se mantiene un aviso informativo al equipo de `mobile`; esta spec no cambia código ni specs de mobile.
  - **Las correcciones no se revierten al despublicar ni al eliminar** (RN-21, CA-38; resuelta, decisión del usuario 2026-11-12). Un dato corregido se queda en la especie aunque deje de estar publicado.
  - **Despublicar o eliminar la publicación no quita la especie de la app móvil** (decisión del usuario 2026-11-12: la publicación solo afecta al portal). `api-006` no filtra por `is_published` y se mantiene así a propósito. La especie sigue en `GET /api/v1/species` si tiene animales. Pregunta 23 resuelta.
  - **Eliminar la publicación borra también el historial visible del veterinario** (CA-38 marca como eliminadas todas las solicitudes). Las filas siguen en la base y en Activitylog, pero dejan de aparecer en «Mis solicitudes». Es una consecuencia de la decisión; si se quiere conservar el historial del veterinario, se cambia la regla de CA-38 (pregunta 18).
  - **Datos de relleno.** Las especies existentes tienen `scientific_name` igual al nombre común y `category` NULL (`pwa-004`). La solicitud permite corregirlos antes de publicar; no los corrige sola.
  - **Foto no borrada tras un error después de la decisión:** riesgo de archivos huérfanos. Mitigación: orden de CA-08, CA-23 y CA-39, y reintento seguro.
  - **Fallo entre la copia y el borrado de la original (CA-08):** la solicitud queda `accepted` con `image_path` NULL y la original en `species-requests/`, alcanzable por `/media` en pruebas. La respuesta sigue `200`. El reintento borra solo archivos que ninguna solicitud `submitted` referencia en `image_path`. El mecanismo del reintento no está en esta spec.
  - **Pérdida de la foto anterior al reemplazarla** (decisión del 2026-11-11): no queda copia en la API. Si la foto se versionó en git, queda en el historial (ADR 0026, RN-17 de `api-013`).
  - **PHP solo interpreta multipart en `POST`:** con `PATCH` multipart el archivo no llega a Laravel sin un ajuste. El plan decide el método (por ejemplo, `POST` con `_method=PATCH`) sin cambiar el contrato lógico de CA-23 ni de CA-37.
  - **Validación de formato de foto** requiere librería (¿imagick/gd?).
  - **Especies sin SoftDeletes** (DBR-013 pregunta 13): la publicación no borra, pero el modelo no cumple la Constitución V.
  - **Edición y decisión simultáneas (CA-19, CA-41) y envíos simultáneos (CA-34):** resueltos con bloqueo; BD decide la protección adicional (DBR-013 pregunta 14).
  - **Notificación (v1):** el veterinario consulta su lista y su selector; no hay aviso activo. Opción futura de push o correo, con su complejidad:
    - **Push (Web Push en la PWA):** necesita service worker (hoy la PWA solo tiene manifest), tabla de suscripciones por dispositivo, claves VAPID, y una dependencia de envío que exige ADR aprobado (`AGENTS.md`). Además, el iOS solo lo permite con la PWA instalada.
    - **Correo:** necesita la configuración de correo del ambiente (`MAIL_*` en `.env` y el checklist de `infra/README.md`) y una plantilla en español.
    - Ambas requieren una spec nueva. No se abre ADR en esta versión.
  - **Mobile no usa push** (`api-010`): la app consulta su lista, igual que propone esta spec para la PWA.

- **Preguntas abiertas** (las resueltas van marcadas; las de BD siguen en `DBR-013`):
  1. **Purga de rechazadas.** **Resuelta, decisión del usuario 2026-11-11:** no se purgan; se conservan.
  2. **Notificación.** **Resuelta, decisión del usuario 2026-11-11:** en v1 no hay push ni correo. El aviso es la consulta de «Mis solicitudes» y del selector (CA-26, CA-33). Opción futura en «Riesgos».
  3. **Fuentes de campos extra.** **Abierta (BD).** La selección de la ficha ya existe (RN-13); falta decidir de dónde sale cada campo extra (DBR-013 pregunta 8). Ver `dashboard-010` y `pwa-005`.
  4. **Foto reemplazable en la edición.** **Resuelta, decisión del usuario 2026-11-11:** sí, `PATCH` multipart con foto opcional (CA-23).
  5. **Historial de edición.** **Resuelta, decisión del usuario 2026-11-11:** Activitylog, sin tabla propia (CA-18; DBR-013 pregunta 1).
  6. **Envío por rol o por permiso.** **Resuelta, decisión del usuario 2026-11-11:** por rol `veterinarian` (`pwa-005` RN-01), sin permiso de envío.
  7. **Foto original tras publicar.** **Resuelta, decisión del usuario 2026-11-11:** opción B («mover»): copiar a `media/species/`, confirmar y borrar la original (CA-08).
  8. **Archivo anterior al reemplazar la foto.** **Resuelta, decisión del usuario 2026-11-11:** se borra tras confirmar y no se conserva (CA-23).
  9. **Despublicar una especie.** **Resuelta, decisión del usuario 2026-11-11:** sí, con CA-35 (`zoo-admin`, `species.review`, 2FA, auditoría; no borra nada).
  10. **Actualizar la foto de una especie publicada.** **Resuelta, decisión del usuario 2026-11-11:** sí, con una solicitud de tipo `update` (CA-27, CA-32). Una sola solicitud viva por especie (CA-34).
  11. **Nombre común no editable.** **Resuelta, decisión del usuario 2026-11-11:** no editable (RN-15, CA-16, CA-37).
  12. **Endpoint del selector.** **Resuelta, decisión del usuario 2026-11-11:** `GET /api/v1/veterinarian/species` (CA-26).
  13. **Fecha de publicación.** **Resuelta, decisión del usuario 2026-11-11:** se añade `species.published_at` además de `is_published` (CA-08, CA-36).
  14. **(a) Permiso único de gestión de publicación.** **Resuelta, decisión del usuario 2026-11-12:** un solo permiso, `species.review`, para revisar, despublicar, republicar, editar una especie despublicada y eliminar la publicación (CA-35 a CA-38). Afecta a RN-10 y a la tarea T-SEED.
  15. **(b) Editar una especie despublicada.** **Resuelta, decisión del usuario 2026-11-12** (interpretación de la sesión del 2026-11-11): el `zoo-admin` puede editar la ficha de una especie despublicada y luego republicarla. Se edita `scientific_name`, `habitat`, `origin`, `category`, `published_fields` y la foto, sin tocar el nombre común y sin publicar (CA-37). Un valor vacío en `scientific_name`, `habitat` u `origin` borra el dato.
     - (c) **Foto nueva de una especie despublicada. Abierta, propuesta por confirmar.** Propuesta: se guarda en `media/species/` y la anterior se borra tras confirmar. Riesgo: queda alcanzable por URL antes de republicar. Alternativa: guardarla en `media/species-requests/` hasta republicar, lo que exige un paso de movimiento en CA-36.
  16. **(d) Especie despublicada y solicitud.** **Resuelta, decisión del usuario 2026-11-12:** el veterinario sí puede enviar una solicitud `update` sobre una especie `unpublished`. La solicitud le llega a la Dirección en su bandeja de «Solicitudes de especies». Elegibilidad final: `not_published` → `publish`; `published` → `update`; `unpublished` → `update`; `pending` → bloqueada (CA-27, CA-34).
  17. **(e) Límite del motivo en «Mis solicitudes».** **Abierta, propuesta por confirmar.** Propuesta: el motivo se muestra completo (máximo 500 caracteres, el límite ya existente en CA-10), sin truncar, en la lista de CA-33 y en la PWA. Alternativa: que la API devuelva un extracto de 120 caracteres con «…» y el texto completo solo en el detalle.
  18. **(f) Historial del veterinario tras eliminar la publicación.** **Abierta, propuesta por confirmar.** Propuesta: CA-38 marca todas las solicitudes de la especie (decisión del usuario). Alternativa: marcar solo las `submitted`, para que el veterinario conserve el historial de `accepted` y `rejected`. Afecta a CA-33 y a la lista de la PWA.
  19. **(g) Nombres de endpoints nuevos.** **Abierta, propuesta por confirmar.** Propuesta: `GET /api/v1/veterinarian/species-publication-requests`, `GET /api/v1/admin/published-species`, `GET|PATCH|DELETE /api/v1/admin/species/{id}/publication`, `POST /api/v1/admin/species/{id}/unpublish`, `POST /api/v1/admin/species/{id}/republish` y `GET /api/v1/admin/species/{id}/image`. Nombres de ruta: `veterinarian.species-publication-requests.index`, `admin.published-species.index`, `admin.species.publication.show|update|destroy`, `admin.species.unpublish`, `admin.species.republish`, `admin.species.image`.
  20. **(h) Republicar exige foto y datos publicados.** **Abierta, propuesta por confirmar.** Propuesta: republicar exige `image_path` y `published_fields` no nulos, y ninguna solicitud viva (CA-36). Si no hay foto, la Dirección edita la ficha (CA-37) y añade una foto antes de republicar.
  21. **(i) `published_at` y actualizaciones.** **Abierta, propuesta por confirmar.** Propuesta: `published_at` guarda la fecha de la versión publicada vigente; se actualiza al aceptar una actualización y al republicar. La primera publicación no se conserva aparte. Si se quiere la fecha de primera publicación, se añade otra columna (BD).
  22. **(j) Aceptar sin publicar una especie despublicada.** **Resuelta, decisión del usuario 2026-11-12.** Para una especie despublicada con solicitud viva, la Dirección tiene dos acciones: «Aceptar y publicar» (`publish: true`) y «Aceptar sin publicar» (`publish: false`). La segunda aplica los cambios y deja la especie despublicada, republicable después desde «Publicadas». Para una especie publicada o sin publicar solo existe «Aceptar y publicar». Ambas respetan la regla de guardar antes de aceptar (dashboard-010 CA-10). Ver CA-08, CA-32 y dashboard-010 CA-62.
  23. **(k) Despublicar y la app móvil.** **Resuelta, decisión del usuario 2026-11-12: no aplica a mobile, la publicación solo afecta al portal.** Mobile no tiene esta funcionalidad y su catálogo (`mobile-003`, `api-006`, misiones de `mobile-005`) no cambia. Despublicar o eliminar la publicación no quita la especie de mobile, y `api-006` no filtra por `is_published` (se mantiene a propósito). Lo único compartido es la tabla `species`; el aviso informativo al equipo de mobile se mantiene, sin cambios en sus specs ni código.

## Revisión

- Aprobadores y fecha: (pendiente)
- Estado: Borrador (requiere validación técnica, DBR-013 aprobada y la enmienda del ADR 0026 aprobada antes de En progreso).
- Historial: 2026-11-11, borrador original: solicitud de especie nueva, creada al aceptar, con edición `PATCH`, lectura pública en `api-015`, foto en carpeta pública durante pruebas, permisos por seeder y tarea T-SEED. Ampliaciones del mismo día: `species_id` nullable, foto reemplazable, selección de la ficha pública, rechazo con diálogo obligatorio, predeterminados de la ficha, foto anterior borrada, y tipo de animal (`category`, CA-25). **2026-11-11, cambio de modelo:** la solicitud pasa a ser de publicación de una especie existente; `species_id` obligatorio desde el envío; selector (CA-26); elegibilidad (CA-27); reenvío tras rechazo (CA-28); no se crea especie (CA-24, CA-29); correcciones NULL (CA-30); publicar = aceptar sobre la fila existente (CA-08, RN-14); publicación solo al aceptar (CA-31); nombre común no editable (RN-15). **2026-11-11 (segunda ronda, decisiones del usuario):** `category` obligatorio al enviar (CA-03, CA-25); solicitud de actualización `request_type` con una sola solicitud viva (CA-02, CA-06, CA-08, CA-27, CA-32, CA-34); estados de publicación derivados (RN-18); lista «Mis solicitudes» (CA-33, RN-07); despublicar, republicar, editar una despublicada, eliminar publicación y listado de publicadas (CA-35 a CA-40); concurrencia y borrado de archivos (CA-39, CA-41); `published_at` (CA-08, pregunta 13); notificación v1 por consulta (pregunta 2); purga descartada (pregunta 1); historial en Activitylog (pregunta 5). **2026-11-12 (tercera ronda, decisiones del usuario):** permiso único `species.review` y edición de especie despublicada resueltos (preguntas 14 y 15); eliminar no revierte correcciones (RN-21, CA-38); el veterinario puede enviar una `update` sobre una especie despublicada (CA-27, CA-32, CA-34); la solicitud sobre una especie despublicada se acepta con «Aceptar y publicar» o «Aceptar sin publicar» (CA-08, pregunta 22). Pregunta 23 resuelta el 2026-11-12 (la publicación solo afecta al portal; mobile sin cambios). Quedan abiertas las preguntas funcionales 15 (c) y 17 a 21 de esta spec; las de BD están en DBR-013 (ver su apartado de preguntas).
- Evidencia/enlaces: `apps/api/src/app/Http/Controllers/Api/AnimalController.php` (método `store`), `docs/database/esquema-ingles.md` (sección 7, `species`), `apps/pwa/specs/004-animal-registration.md`, `apps/pwa/specs/005-species-request-submission.md`, `apps/dashboard/specs/010-public-content-management.md`, `apps/api/specs/015-public-species-read.md`, `apps/api/specs/006-public-catalog-read.md`, `apps/api/specs/013-object-storage-images.md`, `docs/adr/0026-object-storage-s3-images.md`, `docs/adr/0028-dynamic-tulanpedia-catalog.md`, `docs/database/requests/DBR-013-species-requests.md`.
