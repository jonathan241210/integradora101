# 014 · species-requests (solicitudes de publicación de especie)

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: selector de especies para el veterinario, envío de solicitudes de primera publicación y de actualización, lista «Mis solicitudes», revisión, edición previa, publicar, actualizar, rechazar, despublicar, republicar, editar una especie despublicada, eliminar la publicación, auditoría); `pwa` (`pwa-005`, consumidor del selector, del envío y de la lista propia; sin cambio de regla de rol); `dashboard` (`dashboard-010`, que absorbe `dashboard-009`); `api-015` (lectura pública de especies publicadas para `web-011`); `packages/api-client` (métodos y tipos); ADR 0026 (sin cambio de carpetas; la enmienda de 2026-11-11 sigue vigente).
- Estado: Aprobada (2026-11-12, Jonathan, responsable de backend). Aprobar no autoriza implementar: la implementación espera a que DBR-013 esté en «Lista para backend» (condición cumplida el 2026-11-12: migración aplicada en `arca_pruebas`, lote 5, verificada).
- Solicitante / responsable funcional: (por designar)
- Responsable de BD: Víctor Adrián. DBR-013 aprobada por BD (2026-11-12) con las decisiones 2a=A, 2b, 2c=A, 7, 13, 14, 15, 16 y 17. Migración `2026_11_12_000013_species_publication_requests_schema` aplicada en `arca_pruebas` (lote 5), verificada el 2026-11-12 por consulta de solo lectura. Aprobación de backend: Jonathan, 2026-11-12 (`docs/database/requests/README.md`, regla 4). Estado de DBR-013: Lista para backend (desde el 2026-11-12). Pendiente de BD: EXPLAIN y registro de la fecha y del responsable de la aplicación.
- Aprobación funcional: Jonathan (responsable de backend), 2026-11-12.
- Aprobado por: Jonathan (responsable de backend), 2026-11-12.

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

### Cuarta ronda (2026-11-12, decisiones del usuario)

Cierra las preguntas funcionales 15 (c) y 17 a 21. Sin cambio de columnas ni de la lista de endpoints.

- **Foto nueva de una especie despublicada (pregunta 15, c):** se guarda directamente en `media/species/` y la anterior se borra tras confirmar la transacción (CA-37, CA-39).
- **Motivo de rechazo en «Mis solicitudes» (pregunta 17):** completo, máximo 500 caracteres, sin truncar (CA-26, CA-33). Se descarta el extracto de 120 caracteres.
- **Historial del veterinario tras eliminar la publicación (pregunta 18):** CA-38 marca como eliminadas todas las solicitudes de la especie, y dejan de aparecer en «Mis solicitudes». Se descarta marcar solo las `submitted`.
- **Nombres de endpoints (pregunta 19):** se aceptan los propuestos, con sus nombres de ruta.
- **Republicar (pregunta 20):** exige `image_path` y `published_fields` no nulos y ninguna solicitud viva (CA-36). Si no hay foto, la Dirección la añade con CA-37 antes de republicar.
- **`published_at` (pregunta 21, nota informativa):** guarda la fecha de la versión publicada vigente. Se actualiza al aceptar una actualización con publicación y al republicar. La fecha de la primera publicación no se conserva aparte; si algún día se quisiera, sería otra columna a decidir por BD.

### Quinta ronda (2026-11-12, decisiones de BD sobre DBR-013)

- **DBR-013 aprobada por BD.** Decisiones 2a=A, 2b, 2c=A, 7, 13, 14, 15, 16 y 17. La migración existe y está pendiente de aplicar en `arca_pruebas`. Esta spec no pasa a «Lista para backend» sin la aprobación de backend y la migración aplicada con evidencia.
- **`origin` (2a=A).** La solicitud guarda `species_publication_requests.origin`; al aceptar, se copia a `species.distribution`. No existe `species.origin`. La API expone la clave `origin` en las respuestas de administración y del selector (CA-06, CA-26), y `api-015` la publica (RN-06).
- **Columnas de `species` (2b, 7, 13, 15).** `image_path` (foto pública), `published_fields` (JSON NULL), `deleted_at` (SoftDeletes) y `unpublished_at` (guardado). No hay columna `unpublished_by`: quien despublica queda en Activitylog (CA-35, RN-12).
- **Solicitud (2c, 7, 16).** Tabla delgada. `published_fields` es JSON NOT NULL en la solicitud. `category` NULL significa «sin corrección» (CA-25 explica la conciliación con «obligatorio»).
- **Una solicitud viva por especie (14).** Columna generada `submitted_species_id` con índice único. La Action captura la violación y responde `422` (CA-34).
- **Especie borrada (13, RN-22).** No aparece en el selector, en el listado de publicadas ni en `api-015`. Tarea de backend: alinear `Species` con SoftDeletes.
- **Índices (17).** `species(is_published)` y `species(is_published, unpublished_at)`, además de los de la solicitud que fija DBR-013.
- **Divergencia detectada al alinear con la migración (pregunta 24).** CA-38 deja `status = 'submitted'` en las solicitudes eliminadas, y el índice único no considera `deleted_at`. **Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción):** CA-38 pasa antes las `submitted` a `rejected` en la aplicación (decisión A; sin cambio de migración).
- **Pregunta 8 de DBR-013.** Sigue abierta y no cambia esta spec salvo lo que ya dice RN-13.

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
- **Correcciones precargadas y editables** (`scientific_name`, `habitat`, `origin`, `category`). Un valor igual al actual o vacío se guarda NULL (RN-16, CA-30). `origin` se guarda en `species_publication_requests.origin` y se copia a `species.distribution` al aceptar (DBR-013 2a=A).
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
- **Notificación:** v1 sin push ni correo. El veterinario ve el estado y el motivo completo (máximo 500 caracteres, sin truncar) en «Mis solicitudes» y en el selector (CA-26, CA-33).
- **Purga:** no hay purga automática de rechazadas (pregunta 1, resuelta).

## Problema y contexto

El alta de animal crea especies a partir de texto libre, con datos de relleno y sin categoría (`pwa-004`; `apps/api/src/app/Http/Controllers/Api/AnimalController.php`, método `store`). Para que una especie aparezca en el catálogo público (TulanPedia, `web-011`), hace falta un último paso: el veterinario **solicita la publicación de una especie existente** con su foto, su tipo de animal y sus correcciones; la Dirección la revisa, la corrige si hace falta, y la publica o la rechaza. Una vez publicada, la Dirección puede pedir su actualización, despublicarla, republicarla o eliminar su publicación.

## Objetivos

- Exponer `GET /api/v1/veterinarian/species` como selector, con el estado de publicación, el tipo de envío que cabe y, si aplica, el motivo completo de la última rechazada.
- Exponer `POST /api/v1/veterinarian/species-publication-requests` para enviar una solicitud de primera publicación o de actualización, con foto multipart cuando corresponde, sobre una especie existente.
- Exponer `GET /api/v1/veterinarian/species-publication-requests` («Mis solicitudes»): solo las propias, con estado y motivo completo.
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
- Campos extra de la ficha (`conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics`): no por ahora (decisión del usuario 2026-11-12; DBR-013 pregunta 8). Se retoman con una spec nueva.
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
  - «La especie no existe.» (también si la especie tiene `deleted_at`, RN-22).
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
  - `current`: valores de `species` que están publicados o en el catálogo ahora (`common_name`, `scientific_name`, `habitat`, `origin` de `species.distribution` (DBR-013 2a=A), `category`, `is_published`, `published_at`) y `has_image` (booleano: hay foto publicada). La foto publicada se pide por `GET /api/v1/admin/species/{id}/image` (CA-40).
  - `proposed`: valores que se publicarían, con la corrección o, si es NULL, el valor actual (`scientific_name`, `habitat`, `origin` de `species.distribution`, `category`), `published_fields` propuestos y `has_new_photo` (booleano).
  - Sin URL de ninguna foto. La foto pendiente se sirve por `GET /api/v1/admin/species-publication-requests/{id}/image` (binario, `species.review` y 2FA). En pruebas, la foto pendiente es alcanzable por `/media` si se conoce su URL (riesgo aceptado; ver «Recomendación antes de producción»).
  - Verificación: `test_ca06_detail_shows_current_and_proposed_without_photo_url`.

- **CA-07 (acceso denegado):** Dado un usuario sin `species.review`, cuando llama cualquier ruta de administración de esta spec (listados, detalles, imágenes, edición, publicar, actualizar, rechazar, `published-species`, `species/{id}/publication`, `unpublish`, `republish` o `DELETE` de la publicación), responde `403`. Un `veterinarian` recibe `403` en esas rutas. Sin sesión, `401`. Las rutas de administración exigen 2FA confirmado además del permiso.
  - Verificación: `test_ca07_admin_routes_return_403_without_permission`.

### Publicar, actualizar y rechazar

- **CA-08 (publicar o actualizar = aceptar, sobre la fila existente):** Dada una solicitud en `submitted`, cuando `zoo-admin` con `species.review` y 2FA llama `POST .../{id}/accept` con el cuerpo `{publish}` (booleano, reglas abajo), entonces, en una transacción con bloqueo de la solicitud y de la fila de `species` (RN-11):
  - Aplica a `species` las correcciones no NULL: `scientific_name`, `habitat`, `origin` (en `species.distribution`, DBR-013 2a=A; no existe `species.origin`) y `category` (valor efectivo, CA-25).
  - Regla de `publish` (resuelta, decisión del usuario 2026-11-12; pregunta 22):
    - Si la especie es `not_published` o `published`, `publish` es `true` (por defecto si falta). Con `publish: false` responde `422` con «Esta solicitud solo puede aceptarse publicándola.».
    - Si la especie es `unpublished`, `publish` por defecto es `true`. Con `publish: true` (**«Aceptar y publicar»**): pone `species.is_published = 1`, `species.unpublished_at = NULL` y `species.published_at` = fecha de esta aceptación. Con `publish: false` (**«Aceptar sin publicar»**): `is_published` sigue en 0, `unpublished_at` y `published_at` no cambian, y la especie queda despublicada y republicable desde «Publicadas» (CA-36).
    - `publish` no booleano responde `422` con «Indica si se publica o no.».
  - Copia `published_fields` a `species.published_fields` en cualquier caso (RN-14). La fecha `published_at` de una aceptación con publicación es la versión publicada vigente (resuelta el 2026-11-12, pregunta 21).
  - Si la solicitud trae foto, la copia de `media/species-requests/<uuid>.<ext>` a `media/species/<uuid>.<ext>` y guarda `species.image_path` con esa ruta, anotando la ruta anterior de `species.image_path` para borrarla después. Si no trae foto (solo en `update`), `species.image_path` no cambia.
  - Pone la solicitud en `accepted`, guarda `reviewed_by` y `reviewed_at`, y pone `image_path` a NULL.
  - Confirma la transacción. Solo después borra la original en `media/species-requests/` y, si había una foto publicada anterior reemplazada, la borra también (CA-39). Si la transacción falla antes de confirmar, borra la copia nueva en `media/species/` y conserva la original y la foto anterior.
  - Responde `200` con el detalle de publicación de la especie (CA-37, forma `GET`).
  - No crea ni elimina filas de `species` (CA-24).
  - Registra auditoría: «Especie publicada por {admin} a partir de la solicitud de {vet}» (`publish`) o «Actualización publicada por {admin} a partir de la solicitud de {vet}» (`update`).
  - Verificación: `test_ca08_accept_publishes_existing_species_copies_confirms_and_deletes_original` (secuencia: copia, commit, borrado de la original y de la foto anterior, `image_path` NULL en la solicitud), `test_ca08_accept_returns_200_when_original_delete_fails` (la respuesta es `200`, la especie queda publicada y el archivo queda pendiente de reintento), `test_ca08_accept_unpublished_without_publishing_keeps_unpublished` (con `publish: false`, la especie queda con `is_published = 0`, `unpublished_at` sin cambios y datos nuevos) y `test_ca08_publish_param_rules` (`publish: false` en `published` o `not_published` responde `422`; un valor no booleano responde `422`), y `test_ca08_origin_is_written_to_distribution` (la corrección de `origin` queda en `species.distribution`). Todos con `Storage::fake('media')` cuando hay archivos.

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
  - `created_by`, `created_at` y los campos de revisión no cambian. `updated_by` y `updated_at` registran la última edición. `image_path` cambia solo si se envía una foto nueva.
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
  - Decisión de pruebas (G1, resuelta, decisión del usuario 2026-11-12; válida para pruebas; revisar antes de producción): la petición con archivo se envía como `POST` con `_method=PATCH`; el contrato lógico sigue siendo `PATCH` (ver «Riesgos»).
  - Verificación: prueba de la secuencia (foto nueva guardada, fila actualizada, archivo anterior borrado) y prueba de fallo de la transacción (archivo nuevo borrado, anterior conservado).

- **CA-24 (vínculo con la especie existente; nunca se crea ni borra especie):** Dado un envío, una edición, una publicación, una actualización, una acción de CA-35 a CA-39 o un rechazo, cuando se ejecutan, entonces `species_publication_requests.species_id` no cambia, la operación actúa sobre la especie con ese mismo `id`, y ninguna operación crea ni borra filas de `species`. `species_id` es NOT NULL desde el envío (DBR-013). Verificación: `test_ca24_request_never_creates_or_deletes_species_rows` (cuenta las filas de `species` antes y después de cada operación y compara `species_id`).

- **CA-25 (tipo de animal obligatorio):** Dado el envío (`POST`) o la edición (`PATCH`) de una solicitud en `submitted`, cuando se valida `category`, entonces:
  - El campo es **obligatorio** en el envío (decidido el 2026-11-11). Si falta o llega vacío, responde `422` con «Tipo de animal requerido.», aunque la especie ya tenga tipo. La PWA precarga el tipo actual, así que el caso normal no ocurre.
  - El valor debe estar en la lista cerrada de DBR-004: `mammal`, `bird`, `reptile`, `amphibian`, `fish` o `invertebrate`. Otro valor responde `422` con «Tipo de animal no válido.» y error en `errors.category`.
  - Si el valor enviado es igual a `species.category`, se guarda NULL (sin corrección, CA-30). Si es distinto, se guarda como corrección. Conciliación con DBR-013 (preguntas 10 y 16): «obligatorio» es una regla de la API, que exige que el veterinario elija o confirme el tipo en cada envío. La columna `species_publication_requests.category` guarda solo la corrección, así que NULL significa «sin corrección» y no «sin tipo». La columna nullable de la migración no contradice este CA.
  - Un `PATCH` con `category` reemplaza la corrección anterior. Con un valor válido responde `200` con el JSON de CA-06 y registra en la auditoría de CA-18 el valor anterior y el nuevo. Un `PATCH` con `category` vacío responde `422` con «Tipo de animal requerido.».
  - Al publicar o actualizar (CA-08), `species.category` recibe el valor efectivo (corrección, o el valor actual si la corrección es NULL).
  - `category` se publica siempre y no es desmarcable (decidido el 2026-11-11). No se acepta en `published_fields`: esa clave responde `422` con «Campo no permitido en la ficha pública: category.» (CA-21).
  - Verificación: `test_ca25_store_requires_category`, `test_ca25_store_rejects_category_outside_closed_list`, `test_ca25_update_replaces_category_and_audits_change`, `test_ca25_update_rejects_empty_or_unknown_category` y `test_ca25_accept_writes_effective_category_to_species`. Todos con `DatabaseTransactions` sobre `arca_pruebas`.

### Selector, elegibilidad y actualizaciones

- **CA-26 (selector de especies para el veterinario):** Dado un usuario con rol `veterinarian`, cuando llama `GET /api/v1/veterinarian/species`, entonces responde `200` con `data`: cada especie no borrada (RN-22) trae `id`, `common_name`, `scientific_name`, `habitat`, `origin` (de `species.distribution`, DBR-013 2a=A), `category` (NULL si no tiene), `publication_status` (RN-18: `not_published`, `pending`, `published` o `unpublished`), `next_request_type` (`publish` si `not_published`; `update` si `published` o `unpublished`; `null` si `pending`) y `last_rejection_reason`.
  - `last_rejection_reason` trae el motivo de la última solicitud **propia** de esa especie si esa solicitud está `rejected` y `publication_status` es `not_published`; en otro caso, `null`. El motivo va completo, máximo 500 caracteres, sin truncar (resuelta, decisión del usuario 2026-11-12; pregunta 17). No muestra motivos de otros veterinarios.
  - Orden `common_name` ascendente y, a igual nombre, `id` ascendente. Sin paginación (propuesta, como `api-006` RN-07). No incluye datos de revisión ni de otros veterinarios. Sin rol `veterinarian`, `403`.
  - Verificación: `test_ca26_veterinarian_lists_species_with_publication_status` y `test_ca26_last_rejection_reason_full_text`.

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
  - Cada elemento trae `id`, `species_id`, `common_name`, `request_type`, `status`, `created_at`, `reviewed_at` (NULL si no hay decisión), `rejection_reason` (solo en `rejected`; completo, máximo 500 caracteres, sin truncar; resuelta, decisión del usuario 2026-11-12, pregunta 17) y `species_publication_status` (estado actual de la especie, RN-18: `published` o `unpublished` para mostrar «Despublicada»; ver pwa-005 CA-16).
  - Sin fotos, sin nombre de la persona revisora y sin datos de otros veterinarios.
  - Sin rol `veterinarian`, `403`; sin sesión, `401`.
  - Verificación: `test_ca33_veterinarian_lists_only_own_requests`, `test_ca33_rejection_reason_full_up_to_500_not_truncated` (motivo de 500 caracteres devuelto íntegro) y `test_ca33_hides_requests_of_deleted_publication` (tras CA-38 no aparecen).

- **CA-34 (una solicitud viva por especie):** Dada una especie con una solicitud `submitted`, cuando se envía otra solicitud para ella, entonces responde `422` con «Ya hay una solicitud pendiente para esta especie.», sea de `publish` o de `update`. La regla vale aunque la especie esté publicada o despublicada. Las solicitudes `accepted` y `rejected` no bloquean un envío nuevo. Defensa en BD (DBR-013, decisión 14): la columna generada `submitted_species_id` con el índice único `uq_species_publication_requests_submitted_species` rechaza una segunda solicitud `submitted` de la misma especie aunque la comprobación de aplicación falle en una carrera. La Action captura esa violación (error 1062 de MySQL sobre ese índice) dentro de la transacción, revierte, borra la foto nueva (CA-39) y responde `422` con «Ya hay una solicitud pendiente para esta especie.», igual que la comprobación de aplicación. Nunca responde `500` por esta causa. `accepted` y `rejected` tienen `submitted_species_id` NULL y no chocan (MySQL admite varios NULL en un índice único). Las solicitudes eliminadas por CA-38 no ocupan el índice: CA-38 las pasa a `rejected` antes de eliminarlas (pregunta 24, resuelta; decisión A). Verificación: `test_ca34_only_one_live_request_per_species` y `test_ca34_db_unique_violation_maps_to_422_and_removes_new_photo` (simula la carrera saltando la comprobación de aplicación y comprueba el `422`, que no queda fila nueva y que se borra la foto).

### Acciones de la Dirección sobre la publicación

- **CA-35 (despublicar):** Dada una especie `published`, cuando `zoo-admin` con `species.review` y 2FA llama `POST /api/v1/admin/species/{id}/unpublish`, entonces, en una transacción con bloqueo de la fila de `species`:
  - Pone `species.is_published = 0` y `species.unpublished_at` con la fecha actual.
  - Quien despublica queda en Activitylog. `species` no tiene columna `unpublished_by` (DBR-013, pregunta 15).
  - Conserva `image_path`, `published_fields`, `published_at` y los datos. No borra ningún archivo ni fila, y no cambia las solicitudes.
  - Responde `200` con el detalle de publicación (CA-37, forma `GET`).
  - Si la especie no está `published`, responde `422` con «Esta especie no está publicada.».
  - Registra auditoría: «Especie despublicada por {admin}».
  - `api-015` la deja de devolver de inmediato (`api-015` CA-18).
  - Verificación: `test_ca35_unpublish_hides_species_without_deleting_data`.

- **CA-36 (republicar):** Dada una especie `unpublished`, cuando `zoo-admin` con `species.review` y 2FA llama `POST /api/v1/admin/species/{id}/republish`, entonces, en una transacción con bloqueo:
  - Pone `species.is_published = 1`, `species.unpublished_at = NULL` y `species.published_at` con la fecha actual. No crea ni requiere una solicitud nueva.
  - Antes de publicar comprueba que `image_path` y `published_fields` no son NULL (resuelta, decisión del usuario 2026-11-12; pregunta 20). Si falta alguno, responde `422` con «No se puede republicar: faltan la foto o los datos publicados.» (texto propuesto, que cubre ambos casos). Si no hay foto, la Dirección la añade con CA-37 antes de republicar.
  - Si hay una solicitud `submitted` para la especie, responde `422` con «Hay una solicitud pendiente para esta especie. Decide sobre ella antes de republicar.».
  - Si la especie está `published`, responde `422` con «Esta especie ya está publicada.»; si está `not_published`, responde `422` con «Esta especie no tiene una ficha publicada para restaurar.».
  - Responde `200` con el detalle de publicación. Registra auditoría: «Especie republicada por {admin}». `api-015` la vuelve a devolver de inmediato.
  - Verificación: `test_ca36_republish_without_new_request_and_guards` (incluye la guarda de foto y datos publicados, y la republicación tras añadir la foto con CA-37).

- **CA-37 (editar la ficha de una especie despublicada):** Dada una especie `unpublished`, cuando `zoo-admin` con `species.review` y 2FA llama `GET /api/v1/admin/species/{id}/publication` (detalle) o `PATCH /api/v1/admin/species/{id}/publication`, entonces:
  - El detalle responde `200` con `id`, `common_name`, `scientific_name`, `habitat`, `origin`, `category`, `publication_status`, `is_published`, `published_at`, `unpublished_at`, `published_fields`, `has_image` y `has_pending_request`.
  - El `PATCH` admite `scientific_name`, `habitat`, `origin`, `category`, `published_fields` (CA-21) e `image` (CA-23, con foto guardada directamente en `media/species/`, resuelta según la pregunta 15, punto c). Un valor vacío en `scientific_name`, `habitat` u `origin` se guarda NULL. Un `category` vacío responde `422` con «Tipo de animal requerido.».
  - `common_name` responde `422` con «Campo no editable: common_name.» (RN-15).
  - El `PATCH` **no publica** y no cambia `is_published`. Escribe directamente en `species`, sin correcciones pendientes.
  - Responde `200` con el detalle. Sin campos en el cuerpo, `422` con «Nada que guardar.». Sin cambios reales, `200` sin auditoría.
  - Auditoría con valores anteriores y nuevos: «Ficha de especie despublicada editada por {admin}».
  - Si la especie está `published`, responde `422` con «Despublica la especie antes de editar su ficha pública.». Si está `not_published`, `422` con «Esta especie no tiene una ficha publicada que editar.». Si está `pending`, `422` con «Hay una solicitud pendiente para esta especie. Decide sobre ella antes de editar.».
  - Verificación: `test_ca37_edit_unpublished_species_without_publishing` y `test_ca37_new_photo_saved_in_species_folder_and_old_deleted_after_commit` (con `Storage::fake('media')`).

- **CA-38 (eliminar la publicación):** Dada una especie `published` o `unpublished`, cuando `zoo-admin` con `species.review` y 2FA llama `DELETE /api/v1/admin/species/{id}/publication`, entonces, en una transacción con bloqueo de la fila de `species` y de sus solicitudes:
  - Pone `species.is_published = 0`, `species.published_at = NULL`, `species.unpublished_at = NULL`, `species.image_path = NULL` y `species.published_fields = NULL`.
  - **Antes**, en la misma transacción, pasa cada solicitud `submitted` a `rejected` con `rejection_reason` = «La publicación fue eliminada por la Dirección.», `reviewed_by` = quien elimina y `reviewed_at` = ahora (resuelta, decisión del usuario 2026-11-12, válida para pruebas; revisar antes de producción; pregunta 24, decisión A). Así `submitted_species_id` queda NULL.
  - Marca como eliminadas (SoftDeletes, `deleted_at`) **todas** las solicitudes de esa especie, incluidas las `submitted`, `accepted` y `rejected` (decidido el 2026-11-11; confirmado el 2026-11-12, pregunta 18: se descarta marcar solo las `submitted`; consecuencia en «Riesgos»). Su `image_path` pasa a NULL.
  - **No revierte** las correcciones ya aplicadas a `scientific_name`, `habitat`, `origin` o `category` de `species`. Anotado como limitación.
  - No borra la fila de `species`. La especie y sus animales siguen existiendo.
  - **Unicidad (pregunta 24, resuelta; decisión A, válida para pruebas, revisar antes de producción):** el paso anterior evita que una solicitud eliminada siga ocupando el índice único `submitted_species_id`. CA-38 se implementa sobre todas las solicitudes, incluidas las `submitted`. Las filas eliminadas no aparecen en «Mis solicitudes» (CA-33).
  - Tras confirmar, borra la foto pública de `media/species/` y las fotos pendientes de las solicitudes eliminadas (CA-39).
  - Responde `200` con el detalle de publicación, con `publication_status = not_published`. Para volver a publicarla hace falta una solicitud nueva (`publish`, CA-28).
  - Si la especie está `not_published`, responde `422` con «Esta especie no tiene publicación que eliminar.».
  - Registra auditoría: «Publicación de especie eliminada por {admin}», con los identificadores de las solicitudes marcadas y de las que pasaron a `rejected` en el paso anterior.
  - Verificación: `test_ca38_delete_publication_keeps_species_row_and_soft_deletes_requests` y `test_ca38_submitted_requests_are_rejected_then_soft_deleted_and_new_request_is_allowed` (tras eliminar, la especie admite un envío nuevo `publish`, CA-28).

- **CA-39 (borrado seguro de archivos):** Dada una acción que borra archivos (aceptar con foto nueva en CA-08, reemplazo en CA-23, rechazo en CA-10 y eliminar en CA-38), cuando se ejecuta, entonces los archivos se borran **solo después de confirmar la transacción**. Si el borrado falla tras confirmar, la respuesta sigue siendo `200` y se registra un aviso técnico; el archivo queda para reintento. Si la transacción falla, no se borra ningún archivo original y se borra cualquier copia nueva. Verificación: `test_ca39_files_removed_only_after_commit` con `Storage::fake('media')`.

- **CA-40 (listado de publicadas y despublicadas):** Dado `zoo-admin` con `species.review`, cuando llama `GET /api/v1/admin/published-species?status=&category=&page=`, entonces:
  - Responde las especies con `is_published = 1` o con `unpublished_at` no nulo (nunca `not_published`; sin `deleted_at`, RN-22), paginadas de 10 en 10 (`meta.has_more`), ordenadas por `published_at` descendente y `id` descendente.
  - `status` acepta `published`, `unpublished` o vacío (ambas). `category` acepta los seis valores de DBR-004 o vacío. Un valor fuera de lista responde `422` con «Tipo de animal no válido.».
  - Cada elemento trae `id`, `common_name`, `scientific_name`, `category`, `status` (`published` o `unpublished`), `published_at`, `unpublished_at`, `has_image` y `has_pending_request`. No trae URL de la foto.
  - Las fotos se piden por `GET /api/v1/admin/species/{id}/image` (binario, `species.review` y 2FA). Responde `404` si la especie no tiene foto.
  - Verificación: `test_ca40_admin_lists_published_and_unpublished_species_and_serves_image`.

- **CA-41 (concurrencia de las acciones de publicación):** Dadas las acciones de CA-08, CA-10, CA-15, CA-22, CA-23, CA-35, CA-36, CA-37 y CA-38, cuando dos llegan a la vez sobre la misma especie o solicitud, entonces cada una ejecuta su operación en una transacción con bloqueo de la fila de `species` y, si aplica, de la solicitud, y comprueba el estado dentro del bloqueo. Quien llegue después ve el estado actual: si la solicitud ya no existe porque se eliminó (CA-38), responde `404` con «Solicitud no encontrada.»; si ya no está `submitted`, `422` (CA-09 o CA-17); si la especie ya cambió de estado, responde con el mensaje de esa acción. Verificación: `test_ca41_publication_actions_recheck_state_inside_lock` (prueba secuencial: despublicar y después republicar; republicar con solicitud pendiente; eliminar y después aceptar). La barrera de BD de CA-34 se comprueba en la misma suite.

## Reglas de negocio

- **RN-01 (acceso):** Solo `veterinarian` puede ver el selector, enviar y consultar sus solicitudes, por regla de rol (`pwa-005` RN-01). Solo `zoo-admin` con `species.review` y 2FA puede listar, ver, editar, publicar, actualizar, rechazar, despublicar, republicar, editar una especie despublicada o eliminar una publicación. Ningún otro rol tiene acceso.
- **RN-02 (estados de la solicitud):** Estados válidos: `submitted`, `accepted`, `rejected`. Transiciones: `submitted` → `accepted` (publicar o actualizar) o `rejected`; ambos terminales. La edición no es una transición de estado. Una solicitud eliminada (SoftDeletes) no aparece en ninguna lista ni en ninguna decisión. Al eliminar la publicación, CA-38 pasa las `submitted` a `rejected` (transición de sistema, con motivo fijo; sin estado nuevo).
- **RN-03 (una solicitud viva por especie):** Una especie tiene como máximo una solicitud `submitted`, sea `publish` o `update`. El tipo se decide por `publication_status` (CA-27). Las solicitudes `accepted` y `rejected` no bloquean un envío nuevo. La regla se aplica en el envío (CA-34) y dentro del bloqueo (RN-11). La base la refuerza con `submitted_species_id` y su índice único (DBR-013, decisión 14): ante una violación, la API responde como CA-34. Las solicitudes eliminadas por CA-38 pasan antes a `rejected` (pregunta 24, decisión A), así que no bloquean un envío nuevo.
- **RN-04 (foto):** La foto pendiente se guarda en `media/species-requests/` (disco `media`). Al publicar o actualizar se copia a `media/species/` con el mismo nombre, se confirma la transacción y después se borran la original y la foto publicada que se reemplazó (CA-08, CA-39); al rechazar se borra (CA-10); al reemplazarla en la edición, el archivo anterior se borra tras confirmar (CA-23); al eliminar la publicación se borran la foto pública y las fotos pendientes de las solicitudes eliminadas (CA-38). En pruebas, ambas carpetas se publican por `/media`. La API no devuelve la URL de ninguna foto en las respuestas de administración.
- **RN-05 (autoridad de la API):** La API es la única autoridad de estados, elegibilidad, tipo de envío, correcciones, publicación y auditoría. El dashboard y la PWA solo presentan y solicitan.
- **RN-06 (mensajes):** Mensajes en español; identificadores, rutas y campos en inglés (Constitución VI).
- **RN-07 (feedback al veterinario):** El veterinario consulta sus solicitudes en «Mis solicitudes» (CA-33) y el estado de cada especie en el selector (CA-26). Ve el motivo de una rechazada (`rejection_reason`) y no recibe ninguna notificación activa. Opción futura: push o correo (ver «Riesgos»).
- **RN-08 (foto binaria):** La foto pendiente se entrega solo por la ruta autenticada `admin.species-publication-requests.image`; la publicada, por `admin.species.image` (análoga a `admin.memories.image` de `api-013`). Ninguna respuesta de administración incluye una URL.
- **RN-09 (edición previa):** Solo en `submitted`. Cambia `scientific_name`, `habitat`, `origin`, `category` y `published_fields`, y la foto solo si se envía una nueva (CA-23). No cambia el estado, no publica y no reenvía. Valida como el envío (CA-16, CA-21, CA-23, CA-25).
- **RN-10 (permisos del seeder):** `species.review` se crea en `RolesAndPermissionsSeeder` con `Permission::findOrCreate` y se asigna solo a `zoo-admin`. El seeder da a `admin` todos los permisos de su arreglo salvo `tickets.create` y `tickets.cancel`. Por eso `species.review` (y `memories.review`, `api-010` RN-07) debe excluirse de `admin` de forma explícita. `executive`, `cashier` y `veterinarian` no lo reciben. El seeder no borra permisos existentes.
- **RN-11 (concurrencia):** Todas las operaciones de esta spec que cambian una solicitud o una especie usan transacción con bloqueo de la fila de la solicitud y de la fila de `species`. La comprobación de estado y de elegibilidad se hace dentro del bloqueo (CA-19, CA-27, CA-41).
- **RN-12 (auditoría):** Cada envío, edición, publicación, actualización, rechazo, despublicación, republicación, edición de especie despublicada y eliminación de publicación queda registrado en Activitylog con el actor, las fechas y, en las ediciones, los valores anteriores y nuevos (CA-18, CA-37). El veterinario creador y la Dirección revisora quedan identificados. Las solicitudes eliminadas conservan su auditoría. Como `species` no tiene `unpublished_by` (DBR-013, pregunta 15), quien despublica queda solo en Activitylog.
- **RN-13 (campos de la ficha pública):** `common_name` y la foto se publican siempre. `category` se publica siempre cuando la especie lo tiene, y es obligatorio en el envío (decidido el 2026-11-11; no aparece en `published_fields`). El resto se elige de una lista cerrada que valida la API: `scientific_name`, `origin` y `habitat` vienen marcados por defecto; `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics` vienen desmarcados. Desmarcar un campo solo evita que se muestre en el portal: el dato sigue guardado en la solicitud y es visible para `zoo-admin` en el dashboard. Las claves `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics` no se implementan hasta resolver DBR-013 pregunta 8. En una actualización, la PWA precarga la selección de la especie publicada.
- **RN-14 (publicar o actualizar = aceptar, sobre la fila existente):** Aceptar actualiza la fila de `species` con las correcciones efectivas (`origin` en `species.distribution`, DBR-013 2a=A), `category`, `published_fields` e `image_path` (si hay foto nueva). Además, con publicación (`publish: true`) pone `is_published = 1`, `unpublished_at = NULL` y `published_at` (fecha de la aceptación). Sin publicación (`publish: false`, solo en `unpublished`) no toca `is_published`, `unpublished_at` ni `published_at` (CA-08). No crea especies. Es la única operación de la solicitud que cambia la publicación.
- **RN-15 (nombre común no editable; decidido):** El `zoo-admin` no edita `common_name`, ni en la solicitud ni en la especie despublicada. Es la identidad de la fila de `species` y de los animales; `mobile` la lee sin cambios (`api-006`).
- **RN-16 (correcciones NULL):** Una corrección vacía o igual al valor actual se guarda NULL, y `species` conserva su valor (CA-30). Desde la solicitud no se puede borrar un dato existente (limitación de la v1). La edición directa de CA-37 sí puede borrar un valor.
- **RN-17 (sin efecto público antes de decidir):** Los datos propuestos no son visibles en ninguna lectura pública. En una actualización de una especie publicada, la versión publicada sigue visible hasta que se acepta (CA-32). Una especie despublicada no aparece en `api-015` aunque tenga una solicitud viva (`api-015` RN-03, CA-18). `api-015` lee solo `species` con `is_published = 1`.
- **RN-18 (estados de publicación de la especie):** El `publication_status` se deriva en la API con la tabla de «Estados de publicación y elegibilidad» (prioridad `pending` > `published` > `unpublished` > `not_published`). No es una columna. `api-015` y `dashboard-010` lo usan tal cual; la PWA no lo recalcula.
- **RN-19 (despublicar, republicar y eliminar):** Despublicar solo oculta; no borra nada (CA-35). Republicar vuelve a publicar la ficha guardada sin solicitud nueva, pero exige foto y datos publicados y ninguna solicitud viva (CA-36). Eliminar la publicación borra la foto pública y los datos publicados, marca como eliminadas las solicitudes y no borra la especie (CA-38). Todas exigen `species.review` y 2FA.
- **RN-20 (SoftDeletes):** Las solicitudes tienen `deleted_at` y no se borran físicamente (Constitución V). La fila de `species` no se borra en ninguna operación de esta spec. `species` tiene `deleted_at` (DBR-013, decisión 13). El modelo `Species` aún no usa SoftDeletes: es una tarea de backend (RN-22).
- **RN-21 (correcciones aplicadas a la especie):** Una vez aceptada una corrección o editada directamente, el dato de `species` no se revierte al despublicar o eliminar la publicación. Es un cambio sobre la fila de `species` que lee `api-006`, y se documenta en «Riesgos».
- **RN-22 (especie borrada lógicamente; DBR-013, decisión 13):** una especie con `species.deleted_at` no nulo no aparece en el selector (CA-26), en el listado de publicadas (CA-40) ni en `api-015`. Para el veterinario se trata como inexistente (`422` «La especie no existe.», CA-03); para la Dirección, como `404` «Especie no encontrada.» en las acciones de publicación. Las consultas y Actions de esta spec excluyen `deleted_at`. Tarea de backend: alinear `Species` con SoftDeletes (Constitución V; `apps/api/AGENTS.md`). `BaseModel` no existe hoy en `apps/api/src` (ver `api-010` pregunta 1): si se exige, su creación o la elección de otra base se decide en el plan de backend, no en esta spec. Ninguna operación de esta spec pone `deleted_at` en `species`. Decisión de pruebas (F, resuelta, decisión del usuario 2026-11-12; válida para pruebas; revisar antes de producción): `Species` y el modelo de solicitudes usan el trait `SoftDeletes` directamente sobre `Model`; esta spec no crea `BaseModel`. La base común se resuelve en `api-010` pregunta 1; alinear a `BaseModel` cuando exista.

## Datos, privacidad y auditoría

- Solicitud pendiente: la foto no tiene URL en ninguna respuesta de la API. En pruebas, la carpeta es alcanzable por `/media` si se conoce la URL (riesgo aceptado; ADR 0026, riesgo m).
- Especie publicada: pública; foto y datos visibles en el catálogo (`api-015`) y, en parte, en `api-006` para especies con animales (ver «Riesgos»). La foto publicada se sirve al dashboard solo por ruta autenticada (CA-40).
- Especie despublicada: su foto y sus datos se conservan en `species` y no son visibles en lecturas públicas (`api-015` CA-18). En pruebas, su foto sigue en `media/species/`, que es pública por `/media` si se conoce la URL. Riesgo aceptado, mismo criterio que la pregunta 15, punto c (resuelta el 2026-11-12).
- Especie con publicación eliminada: sin foto ni datos publicados; la fila de `species` y los animales siguen.
- Auditoría: veterinario creador, revisor, timestamp, estado, motivo de rechazo y cada edición con valores anteriores y nuevos (Activitylog; pregunta 1 resuelta).
- No requiere consentimiento adicional del veterinario (obra por encargo).
- Longitud de `scientific_name`, `habitat` y `origin`: 150 caracteres (CA-03, CA-16).
- `species` tiene `deleted_at` (DBR-013, decisión 13; RN-22). Las operaciones de esta spec no borran filas de `species`.
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
  - DBR-013 (`docs/database/requests/DBR-013-species-requests.md`, aprobada por BD y backend el 2026-11-12; migración aplicada en `arca_pruebas` (lote 5, verificada el 2026-11-12): tabla `species_publication_requests` (`species_id` NOT NULL desde el envío, `request_type`, `deleted_at`) y columnas `is_published`, `published_at`, `unpublished_at`, `image_path`, `published_fields` y `deleted_at` en `species`. Decisiones de BD registradas: 2a=A, 2b, 2c=A, 7, 13, 14, 15, 16 y 17. La pregunta 8 (campos extra, RN-13) se cerró el 2026-11-12 con «no por ahora». La condición de «Lista para backend» (aprobaciones separadas y migración aplicada con evidencia) se cumple desde el 2026-11-12; los EXPLAIN de BD no son condición de esa regla y siguen pendientes. Tareas de backend derivadas de DBR-013: (a) alinear `Species` con SoftDeletes (RN-22); (b) escribir y leer `origin` en `species.distribution` (CA-06, CA-08, CA-26, RN-14); (c) capturar la violación de unicidad de `submitted_species_id` y responder `422` (CA-34); (d) excluir `deleted_at` en el selector, el listado y `api-015` (CA-26, CA-40, RN-22); (e) registrar en Activitylog el actor de la despublicación (CA-35).
  - **Pendientes de BD antes de producción** (no piden migración nueva; **no se crean más migraciones en esta etapa, decisión del usuario 2026-11-12**):
    - **C (`down()`):** resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). `down()` aceptado tal cual, porque `arca_pruebas` no tiene datos reales en estas tablas. Pendiente de BD antes de producción: respetar la regla de reversión de DBR-013 («Reversión en `down()`»).
    - **D (índices no idempotentes):** resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). Si la aplicación falla a medias, BD limpia a mano antes de reintentar. Pendiente de BD antes de producción: aplicar la migración por ambiente con respaldo previo (DBR-013, «Impacto, rendimiento y reversión»).
    - **E (texto de DBR-013 sobre `is_published`):** resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). Sin efecto funcional: corrección de redacción pendiente de BD (DBR-013). La fuente de verdad del comportamiento es esta spec, CA-31 y CA-35 a CA-39.
  - `api-013` (Aprobada 2026-11-12; sus D-04 y D-06 siguen pendientes de confirmación expresa) y ADR 0026 (Aceptado 2026-11-12; enmienda del 2026-11-11 con `species/` y `species-requests/`).
  - `api-015` (Aprobada 2026-11-12): lectura pública de especies publicadas; CA-17 y CA-18 cubren la actualización pendiente y las acciones de despublicar, republicar y eliminar.
  - `dashboard-010` (Aprobada 2026-11-12): revisión, edición, publicación, actualización, rechazo, despublicación, republicación, edición y eliminación desde el dashboard.
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
  - **Publicar cambia la fila de `species`.** Las correcciones aceptadas cambian `scientific_name`, `habitat`, `distribution` (donde BD guarda `origin`, DBR-013 2a=A) y `category`. Decisión del usuario (2026-11-12): la publicación de especies es solo del portal web (TulanPedia). `mobile` no recibe esta función ni ninguna pantalla nueva. Lo único compartido es la tabla `species`: `GET /api/v1/species` (`api-006`, sin cambios) ya lee esa fila y expone los datos corregidos para especies con animales. Una `category` asignada hace que la especie cuente en `category_species_count` (`api-005`, misiones de `mobile-005`). Se mantiene un aviso informativo al equipo de `mobile`; esta spec no cambia código ni specs de mobile.
  - **Las correcciones no se revierten al despublicar ni al eliminar** (RN-21, CA-38; resuelta, decisión del usuario 2026-11-12). Un dato corregido se queda en la especie aunque deje de estar publicado.
  - **Despublicar o eliminar la publicación no quita la especie de la app móvil** (decisión del usuario 2026-11-12: la publicación solo afecta al portal). `api-006` no filtra por `is_published` y se mantiene así a propósito. La especie sigue en `GET /api/v1/species` si tiene animales. Pregunta 23 resuelta.
  - **Eliminar la publicación borra también el historial visible del veterinario** (CA-38 marca como eliminadas todas las solicitudes). Las filas siguen en la base y en Activitylog, pero dejan de aparecer en «Mis solicitudes». Consecuencia asumida (decisión del usuario 2026-11-12, pregunta 18): la alternativa de marcar solo las `submitted` queda descartada.
  - **Datos de relleno.** Las especies existentes tienen `scientific_name` igual al nombre común y `category` NULL (`pwa-004`). La solicitud permite corregirlos antes de publicar; no los corrige sola.
  - **Foto no borrada tras un error después de la decisión:** riesgo de archivos huérfanos. Mitigación: orden de CA-08, CA-23 y CA-39, y reintento seguro.
  - **Fallo entre la copia y el borrado de la original (CA-08):** la solicitud queda `accepted` con `image_path` NULL y la original en `species-requests/`, alcanzable por `/media` en pruebas. La respuesta sigue `200`. El reintento borra solo archivos que ninguna solicitud `submitted` referencia en `image_path`. El mecanismo del reintento no está en esta spec. Decisión de pruebas (G3, resuelta, decisión del usuario 2026-11-12; revisar antes de producción): el reintento es manual; un técnico borra a mano los archivos de `media/species-requests/` y `media/species/` que ninguna fila referencia en `image_path`, sin pedir cambio de migración.
  - **Pérdida de la foto anterior al reemplazarla** (decisión del 2026-11-11): no queda copia en la API. Si la foto se versionó en git, queda en el historial (ADR 0026, RN-17 de `api-013`).
  - **PHP solo interpreta multipart en `POST`:** con `PATCH` multipart el archivo no llega a Laravel sin un ajuste. Decisión de pruebas (G1, resuelta, decisión del usuario 2026-11-12; revisar antes de producción): `POST` con `_method=PATCH` cuando la petición lleva archivo, sin cambiar el contrato lógico de CA-23 ni de CA-37. El plan lo confirma.
  - **Validación de formato de foto (G2, resuelta, decisión del usuario 2026-11-12; válida para pruebas; revisar antes de producción):** la regla `image` de Laravel (tipo y contenido), sin paquete nuevo ni ADR. Si el archivo no pasa, `422` (CA-03, CA-04).
  - **Modelo `Species` sin SoftDeletes** (tarea de backend; DBR-013, decisión 13): la columna `deleted_at` ya está en la migración. Hasta que el modelo la use, las consultas de esta spec deben excluirla explícitamente (RN-22).
  - **Edición y decisión simultáneas (CA-19, CA-41) y envíos simultáneos (CA-34):** resueltos con bloqueo y, como barrera de BD, la columna generada `submitted_species_id` con índice único (DBR-013, decisión 14).
  - **Violación de unicidad mal traducida:** si la Action no captura el error 1062 del índice, un envío concurrente respondería `500` en vez de `422`. Mitigación: CA-34 (captura, mapeo y prueba).
  - **Solicitud `submitted` eliminada frente al índice único:** resuelta en la aplicación (pregunta 24, decisión A, válida para pruebas; revisar antes de producción): CA-38 la pasa a `rejected` antes de eliminarla. Riesgo residual: una fila eliminada fuera de la Action seguiría ocupando el índice; no se corrige con migración en esta etapa.
  - **Notificación (v1):** el veterinario consulta su lista y su selector; no hay aviso activo. Opción futura de push o correo, con su complejidad:
    - **Push (Web Push en la PWA):** necesita service worker (hoy la PWA solo tiene manifest), tabla de suscripciones por dispositivo, claves VAPID, y una dependencia de envío que exige ADR aprobado (`AGENTS.md`). Además, el iOS solo lo permite con la PWA instalada.
    - **Correo:** necesita la configuración de correo del ambiente (`MAIL_*` en `.env` y el checklist de `infra/README.md`) y una plantilla en español.
    - Ambas requieren una spec nueva. No se abre ADR en esta versión.
  - **Mobile no usa push** (`api-010`): la app consulta su lista, igual que propone esta spec para la PWA.

- **Preguntas** (todas las funcionales están resueltas el 2026-11-12; la pregunta 8 de `DBR-013` quedó cerrada con «no por ahora»):
  1. **Purga de rechazadas.** **Resuelta, decisión del usuario 2026-11-11:** no se purgan; se conservan.
  2. **Notificación.** **Resuelta, decisión del usuario 2026-11-11:** en v1 no hay push ni correo. El aviso es la consulta de «Mis solicitudes» y del selector (CA-26, CA-33). Opción futura en «Riesgos».
  3. **Fuentes de campos extra.** **Resuelta, decisión del usuario 2026-11-12: no por ahora.** No se añaden campos extra al formulario ni columnas a `species_publication_requests`; sin migración. La ficha pública usa solo los campos ya definidos. Se podrá retomar con una spec nueva (DBR-013 pregunta 8; ADR 0028). Pendiente de alinear al aprobarse esa spec: `pwa-005` tiene su pregunta 2 (fuentes de campos extra) abierta y debe alinearse con esta decisión cuando se apruebe (su aprobación corresponde a otra persona). Ver también `dashboard-010`.
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
     - (c) **Foto nueva de una especie despublicada. Resuelta, decisión del usuario 2026-11-12.** Se guarda directamente en `media/species/` y la anterior se borra tras confirmar la transacción (CA-37, CA-39). Riesgo aceptado: queda alcanzable por URL antes de republicar, como el resto de `media/species/` (sección «Datos, privacidad y auditoría»). Descartada la alternativa de guardarla en `media/species-requests/` hasta republicar.
  16. **(d) Especie despublicada y solicitud.** **Resuelta, decisión del usuario 2026-11-12:** el veterinario sí puede enviar una solicitud `update` sobre una especie `unpublished`. La solicitud le llega a la Dirección en su bandeja de «Solicitudes de especies». Elegibilidad final: `not_published` → `publish`; `published` → `update`; `unpublished` → `update`; `pending` → bloqueada (CA-27, CA-34).
  17. **(e) Límite del motivo en «Mis solicitudes».** **Resuelta, decisión del usuario 2026-11-12.** El motivo se muestra completo, máximo 500 caracteres (el límite de CA-10), sin truncar, en CA-26 y CA-33 y en la PWA (`pwa-005` CA-18). Descartado el extracto de 120 caracteres.
  18. **(f) Historial del veterinario tras eliminar la publicación.** **Resuelta, decisión del usuario 2026-11-12.** CA-38 marca como eliminadas (SoftDeletes) todas las solicitudes de la especie, y dejan de aparecer en «Mis solicitudes» (CA-33; `pwa-005` CA-16). Descartada la alternativa de marcar solo las `submitted`.
  19. **(g) Nombres de endpoints nuevos.** **Resuelta, decisión del usuario 2026-11-12:** se aceptan los endpoints propuestos: `GET /api/v1/veterinarian/species-publication-requests`, `GET /api/v1/admin/published-species`, `GET|PATCH|DELETE /api/v1/admin/species/{id}/publication`, `POST /api/v1/admin/species/{id}/unpublish`, `POST /api/v1/admin/species/{id}/republish` y `GET /api/v1/admin/species/{id}/image`. Nombres de ruta: `veterinarian.species-publication-requests.index`, `admin.published-species.index`, `admin.species.publication.show|update|destroy`, `admin.species.unpublish`, `admin.species.republish`, `admin.species.image`.
  20. **(h) Republicar exige foto y datos publicados.** **Resuelta, decisión del usuario 2026-11-12.** Republicar exige `image_path` y `published_fields` no nulos, y ninguna solicitud viva (CA-36). Si no hay foto, la Dirección edita la ficha (CA-37) y añade una foto antes de republicar.
  21. **(i) `published_at` y actualizaciones.** **Resuelta, decisión del usuario 2026-11-12.** `published_at` guarda la fecha de la versión publicada vigente; se actualiza al aceptar una actualización con publicación y al republicar. Nota informativa, no pregunta abierta: la fecha de la primera publicación no se conserva aparte; si algún día se quisiera, sería otra columna a decidir por BD (`DBR-013`).
  22. **(j) Aceptar sin publicar una especie despublicada.** **Resuelta, decisión del usuario 2026-11-12.** Para una especie despublicada con solicitud viva, la Dirección tiene dos acciones: «Aceptar y publicar» (`publish: true`) y «Aceptar sin publicar» (`publish: false`). La segunda aplica los cambios y deja la especie despublicada, republicable después desde «Publicadas». Para una especie publicada o sin publicar solo existe «Aceptar y publicar». Ambas respetan la regla de guardar antes de aceptar (dashboard-010 CA-10). Ver CA-08, CA-32 y dashboard-010 CA-62.
  23. **(k) Despublicar y la app móvil.** **Resuelta, decisión del usuario 2026-11-12: no aplica a mobile, la publicación solo afecta al portal.** Mobile no tiene esta funcionalidad y su catálogo (`mobile-003`, `api-006`, misiones de `mobile-005`) no cambia. Despublicar o eliminar la publicación no quita la especie de mobile, y `api-006` no filtra por `is_published` (se mantiene a propósito). Lo único compartido es la tabla `species`; el aviso informativo al equipo de mobile se mantiene, sin cambios en sus specs ni código.
  24. **(p) Solicitud `submitted` eliminada y unicidad en BD.** **Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción).** CA-38 marca como eliminadas todas las solicitudes de la especie, incluidas las `submitted` (pregunta 18). Pero el índice único de `submitted_species_id` (DBR-013, decisión 14) no considera `deleted_at`: una fila eliminada en `submitted` sigue bloqueando un envío nuevo de esa especie, y la API respondería el mensaje de CA-34 sin que haya solicitud viva. Decisión definitiva (solo aplicación; no se pide ningún cambio de migración ni de la columna generada): al «Eliminar la publicación», antes de marcar como eliminadas, la Action pasa cada solicitud `submitted` a `rejected` con `rejection_reason` fijo «La publicación fue eliminada por la Dirección.», `reviewed_by` = quien elimina y `reviewed_at` = ahora, en la misma transacción. Así `submitted_species_id` queda NULL. No se añade estado nuevo (RN-02 sin cambio). Las filas quedan con `deleted_at` y no aparecen en «Mis solicitudes» (CA-33). Descartadas: el estado terminal nuevo y cualquier cambio de la columna generada o de la migración. **No se crean más migraciones en esta etapa (decisión del usuario 2026-11-12).**

## Decisiones válidas solo para pruebas (revisar antes de producción)

Decisiones del usuario del 2026-11-12 para que la funcionalidad funcione en `arca_pruebas`. Cada una se revisa antes de producción. **No se crean más migraciones en esta etapa (decisión del usuario 2026-11-12):** ninguna fila pide cambio de esquema.

| Punto | Decisión | Motivo | Qué revisar antes de producción | Quién |
|---|---|---|---|---|
| A (pregunta 24) | Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). Solo en la aplicación: CA-38 pasa cada solicitud `submitted` a `rejected` (motivo fijo «La publicación fue eliminada por la Dirección.», `reviewed_by`, `reviewed_at`) en la misma transacción, antes de marcarla como eliminada. | La columna generada `submitted_species_id` y su índice no consideran `deleted_at`; sin este paso, una solicitud eliminada bloquearía un envío nuevo de la especie. No se añade estado nuevo (RN-02). | Confirmar que el motivo fijo es aceptable para el veterinario y que el paso de aplicación se mantiene en producción. | Backend (Jonathan, aprobó la spec el 2026-11-12) |
| B (web-011, pregunta 9) | Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). La ficha pública cambia «Origen» a «Área de distribución natural». | Coherente con `pwa-005`, `dashboard-010` y esta spec; el dato sale de `species.distribution`. | Confirmar la etiqueta con producto; la clave pública `origin` no cambia. | Producto (responsable funcional de `web-011`, por designar) |
| C (`down()`) | Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). `down()` aceptado tal cual. | `arca_pruebas` no tiene datos reales en estas tablas. | Pendiente de BD antes de producción: respetar la regla de reversión de DBR-013. Sin migración nueva ahora. | BD (Víctor Adrián) |
| D (índices) | Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). Índices no idempotentes aceptados. | Ver C: pruebas sin datos reales. | Si la aplicación falla a medias, BD limpia a mano antes de reintentar. Pendiente de BD antes de producción: aplicar por ambiente con respaldo previo. Sin migración nueva ahora. | BD (Víctor Adrián) |
| E (DBR-013, `is_published`) | Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). Sin efecto funcional. | El texto de DBR-013 dice «solo cambia al aceptar»; no describe la despublicación. | Corrección de redacción pendiente de BD (DBR-013). La fuente de verdad del comportamiento es esta spec: CA-31 y CA-35 a CA-39. | BD (Víctor Adrián) |
| F (`BaseModel`) | Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). `Species` y el modelo de solicitudes usan el trait `SoftDeletes` directamente sobre `Model`. | `BaseModel` no existe en `apps/api/src`. | Alinear a `BaseModel` cuando exista (sin ADR nuevo). La base común se resuelve en `api-010` pregunta 1. | Backend (Jonathan, aprobó la spec el 2026-11-12) |
| G1 (método multipart) | Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). Peticiones con archivo como `POST` con `_method=PATCH`. | PHP no interpreta multipart en `PATCH`; el contrato lógico no cambia. | Confirmar en el plan; `dashboard-010` lo referencia en CA-07 y CA-55. | Backend (Jonathan, aprobó la spec el 2026-11-12) |
| G2 (validación de foto) | Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). Regla `image` de Laravel, sin paquete nuevo. | Evita una dependencia nueva sin ADR. | Confirmar en el plan que la validación cubre JPG y PNG hasta 5 MB. | Backend (Jonathan, aprobó la spec el 2026-11-12) |
| G3 (archivos huérfanos) | Resuelta, decisión del usuario 2026-11-12 (válida para pruebas; revisar antes de producción). Limpieza manual. | No hay mecanismo de reintento automático en esta spec. | Definir la limpieza automática antes de producción (con la opción A o B de «Recomendación antes de producción»). | Backend (Jonathan, aprobó la spec el 2026-11-12) y producto |

Pendientes que no se decidieron aquí y siguen fuera de esta sección: DBR-013 pregunta 8 (campos extra) y el origen de producción de la API y del portal (`web-009` pregunta 2).

## Revisión

- Aprobadores y fecha: Jonathan (responsable de backend), 2026-11-12.
- Estado: Aprobada (2026-11-12). Aprobar no autoriza implementar. Antes de En progreso: DBR-013 en «Lista para backend» (cumplido el 2026-11-12) y validación técnica del equipo. La enmienda del ADR 0026 quedó aceptada el 2026-11-12. La pregunta 24 queda resuelta (2026-11-12, válida para pruebas).
- Historial: 2026-11-11, borrador original: solicitud de especie nueva, creada al aceptar, con edición `PATCH`, lectura pública en `api-015`, foto en carpeta pública durante pruebas, permisos por seeder y tarea T-SEED. Ampliaciones del mismo día: `species_id` nullable, foto reemplazable, selección de la ficha pública, rechazo con diálogo obligatorio, predeterminados de la ficha, foto anterior borrada, y tipo de animal (`category`, CA-25). **2026-11-11, cambio de modelo:** la solicitud pasa a ser de publicación de una especie existente; `species_id` obligatorio desde el envío; selector (CA-26); elegibilidad (CA-27); reenvío tras rechazo (CA-28); no se crea especie (CA-24, CA-29); correcciones NULL (CA-30); publicar = aceptar sobre la fila existente (CA-08, RN-14); publicación solo al aceptar (CA-31); nombre común no editable (RN-15). **2026-11-11 (segunda ronda, decisiones del usuario):** `category` obligatorio al enviar (CA-03, CA-25); solicitud de actualización `request_type` con una sola solicitud viva (CA-02, CA-06, CA-08, CA-27, CA-32, CA-34); estados de publicación derivados (RN-18); lista «Mis solicitudes» (CA-33, RN-07); despublicar, republicar, editar una despublicada, eliminar publicación y listado de publicadas (CA-35 a CA-40); concurrencia y borrado de archivos (CA-39, CA-41); `published_at` (CA-08, pregunta 13); notificación v1 por consulta (pregunta 2); purga descartada (pregunta 1); historial en Activitylog (pregunta 5). **2026-11-12 (tercera ronda, decisiones del usuario):** permiso único `species.review` y edición de especie despublicada resueltos (preguntas 14 y 15); eliminar no revierte correcciones (RN-21, CA-38); el veterinario puede enviar una `update` sobre una especie despublicada (CA-27, CA-32, CA-34); la solicitud sobre una especie despublicada se acepta con «Aceptar y publicar» o «Aceptar sin publicar» (CA-08, pregunta 22). Pregunta 23 resuelta el 2026-11-12 (la publicación solo afecta al portal; mobile sin cambios). **2026-11-12, cuarta ronda (decisiones del usuario, cierran las preguntas funcionales 15 (c) y 17 a 21):** foto nueva de especie despublicada en `media/species/` (CA-37, CA-39); motivo completo de 500 caracteres en «Mis solicitudes» y en el selector (CA-26, CA-33; se descarta el extracto de 120); eliminar marca todas las solicitudes (CA-38, CA-33; se descarta marcar solo las `submitted`); nombres de endpoints aceptados; republicar exige foto y datos publicados (CA-36, CA-37); `published_at` como versión vigente (nota informativa). **2026-11-12, quinta ronda (DBR-013 aprobada por BD):** `origin` se escribe y se lee en `species.distribution` (2a=A; CA-06, CA-08, CA-26, RN-14); `species.image_path`, `published_fields`, `deleted_at` y `unpublished_at` (2b, 7, 13 y 15; RN-20, RN-22); `submitted_species_id` y su índice único (14; CA-34, RN-03, Riesgos); `category` NULL = sin corrección, con la conciliación explícita (16; CA-25); `updated_by` en la edición (CA-15); quien despubica solo en Activitylog (CA-35, RN-12); índices (17). Nuevas: RN-22 y pregunta 24 (solicitud `submitted` eliminada frente al índice único; divergencia entre CA-38 y la migración). La pregunta 8 de DBR-013 sigue abierta y no cambia aquí. **2026-11-12, sexta ronda (decisiones del usuario para pruebas):** pregunta 24 resuelta con la solución de aplicación (CA-38, decisión A), sin cambio de migración; aclaraciones G1 a G3 (método de la petición multipart, validación de foto y reintento manual de archivos) y pendientes de BD C, D y E anotados como «pendiente antes de producción». **No se crean más migraciones en esta etapa (decisión del usuario 2026-11-12).** Preguntas funcionales resueltas; la pregunta 8 de DBR-013 se cerró el 2026-11-12 (no por ahora). **2026-11-12, aprobación (Jonathan, responsable de backend):** spec Aprobada; ADR 0026 aceptado con la enmienda de 2026-11-11; DBR-013 Aprobada por BD y backend, con la migración pendiente de aplicar. **2026-11-12, verificación:** migración aplicada en `arca_pruebas` (lote 5; consulta de solo lectura de backend); DBR-013 pasa a «Lista para backend». Sin cambio de CA, RN ni endpoints.
- Evidencia/enlaces: `apps/api/src/app/Http/Controllers/Api/AnimalController.php` (método `store`), `docs/database/esquema-ingles.md` (sección 7, `species`), `apps/pwa/specs/004-animal-registration.md`, `apps/pwa/specs/005-species-request-submission.md`, `apps/dashboard/specs/010-public-content-management.md`, `apps/api/specs/015-public-species-read.md`, `apps/api/specs/006-public-catalog-read.md`, `apps/api/specs/013-object-storage-images.md`, `docs/adr/0026-object-storage-s3-images.md`, `docs/adr/0028-dynamic-tulanpedia-catalog.md`, `docs/database/requests/DBR-013-species-requests.md`.
