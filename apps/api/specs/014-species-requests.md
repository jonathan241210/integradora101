# 014 · species-requests

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: envío, revisión, edición previa a la aceptación, publicación, auditoría); `pwa` (`pwa-005`, consumidor; sin cambio de regla); `dashboard` (`dashboard-010`, que absorbe `dashboard-009`); `api-015` (lectura pública de especies aceptadas para `web-011`); `packages/api-client` (métodos y tipos); ADR 0026 (enmienda de carpetas de especies).
- Estado: Borrador
- Solicitante / responsable funcional: (por designar)
- Responsable de BD: (por designar; requiere DBR-013 aprobada)
- Aprobación funcional: (pendiente)

## Decisiones tomadas (2026-11-11)

- **Foto en carpeta pública durante pruebas.** La foto pendiente va a `media/species-requests/`, que es una subcarpeta de `media/` y, por tanto, se publica por `/media` (enmienda del ADR 0026). La API no devuelve su URL en ninguna respuesta. Esta excepción es una deuda conocida; ver «Recomendación antes de producción».
- **Edición antes de aceptar.** `PATCH /api/v1/admin/species-requests/{id}` está en esta spec (CA-14 a CA-19). Solo `zoo-admin` con `species.review` y 2FA; solo en `submitted`; campos editables: nombre común, nombre científico, origen y hábitat.
- **Lectura pública de especies aceptadas.** Se especifica en `api-015`. `api-006` no se amplía.
- **Envío por rol.** El veterinario envía por su rol `veterinarian` (regla de `pwa-005` RN-01), sin permiso nuevo.
- **Permisos.** `species.review` se crea con `findOrCreate` y se asigna solo a `zoo-admin`. Se excluye de `admin` de forma explícita (RN-10, CA-20).
- **Vínculo con `species` (decisión del usuario 2026-11-11, DBR-013 pregunta 3).** `species_id` es nullable: queda NULL en `submitted` y `rejected`, y se llena al aceptar (CA-08, CA-24).
- **Foto reemplazable en la edición (pregunta 4 resuelta).** `PATCH` acepta una foto opcional con las validaciones del envío (CA-23).
- **Ficha pública (2026-11-11).** La solicitud guarda la selección de campos con predeterminados (`published_fields`): `scientific_name`, `origin` y `habitat` marcados; `zoo-admin` la ajusta al editar (CA-21, CA-22, RN-13).
- **Rechazo.** La confirmación obligatoria es un diálogo de `dashboard-010` CA-13; la API no cambia (CA-10). El motivo sigue siendo obligatorio.
- **Foto original tras aceptar (2026-11-11, pregunta 7 resuelta):** opción B. Al aceptar se copia a `media/species/`, se confirma y se borra la original; `image_path` queda NULL (CA-08, RN-04).
- **Tipo de animal (decisión del usuario 2026-11-11; DBR-013 pregunta 10 resuelta).** La solicitud captura `category` con la lista cerrada de DBR-004 (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`). Se recibe en el envío, es editable antes de aceptar y se copia a `species.category` al aceptar (CA-01, CA-08, CA-15, CA-16, CA-25). Obligatoriedad: **por confirmar** (propuesta: obligatorio; si no, la especie aceptada queda con `category` NULL y no cuenta en las misiones ni en el filtro por tipo de TulanPedia). Publicación: `category` se publica siempre cuando la especie lo tiene, no es desmarcable y no forma parte de `published_fields` (**propuesta por confirmar**; RN-13).

## Problema y contexto

No existe actualmente un mecanismo para que el veterinario proponga nuevas especies al catálogo. Hoy se registran animales individuales que crean especies automáticamente. Se necesita un flujo intermedio donde:

1. El veterinario envía una solicitud con datos de la especie y una foto.
2. La API guarda la solicitud como pendiente sin publicar.
3. La Dirección (`zoo-admin`) la revisa en el dashboard, puede corregir sus datos y decide aceptarla o rechazarla.
4. Al aceptar, se registra la especie en el catálogo público.

## Objetivos

- Exponer endpoint `POST /api/v1/veterinarian/species-requests` para que la PWA envíe solicitudes con foto multipart.
- Validar datos de la especie: nombres únicos, tipo de animal de la lista cerrada (`category`), foto soportada (JPG, PNG; máx. 5 MB).
- Guardar en tabla `species_requests` con estado `submitted`.
- Exponer endpoints administrativos `GET /api/v1/admin/species-requests` para listado paginado filtrable por estado.
- Exponer `GET /api/v1/admin/species-requests/{id}` con datos (sin URL de foto) y `GET .../{id}/image` (binario por ruta autenticada) para `zoo-admin`.
- Exponer `PATCH /api/v1/admin/species-requests/{id}` para corregir los datos de una solicitud pendiente antes de decidir.
- Exponer `POST .../accept` y `POST .../reject` para `zoo-admin`.
- Publicar especie en `species` al aceptar.
- Registrar auditoría de envío, edición, revisión, decisiones y rechazo.

## Fuera de alcance

- Edición de solicitudes Aceptadas o Rechazadas.
- Reenvío o corrección por el veterinario, y lista «mis solicitudes» en la PWA.
- Cambios de esquema de `species` en esta spec; dependen de DBR-013.
- Integración con registros de animales individuales (son procesos separados).
- Lectura pública de especies aceptadas (`api-015`) y cualquier cambio de `api-006`.
- Exportación de solicitudes.
- Purga automática de solicitudes rechazadas (pregunta 1).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `veterinarian` | Enviar solicitud | Sesión válida (Sanctum) y rol `veterinarian` (regla de rol, `pwa-005` RN-01) |
| `zoo-admin` | Listar, ver, editar, aceptar y rechazar | Sesión válida + 2FA; permiso `species.review` (asignado en el seeder, tarea futura T-SEED) |
| `admin` | Sin acceso. Excluido de `species.review` de forma explícita | — |
| `executive`, `cashier` | Sin acceso | — |

## Historias de usuario

- Como veterinario, quiero enviar una solicitud de nueva especie con foto para que la Dirección la revise antes de publicarla en el catálogo.
- Como `zoo-admin`, quiero ver las solicitudes pendientes, revisar la foto y los datos, y decidir aceptarlas o rechazarlas.
- Como `zoo-admin`, quiero corregir el nombre, el origen o el hábitat de una solicitud pendiente antes de aceptarla, para publicar datos correctos sin pedir un reenvío.

## Criterios de aceptación

### Envío (veterinario)

- **CA-01:** Dado un usuario con rol `veterinarian` y sesión válida, cuando llama `POST /api/v1/veterinarian/species-requests` con multipart (nombre común, científico, origen, hábitat, tipo de animal `category`, foto binaria), entonces:
  - Valida nombres (requeridos, máx. 150 caracteres).
  - Valida `category` (lista cerrada y obligatoriedad por confirmar; CA-25).
  - Valida foto (JPG o PNG, máx. 5 MB).
  - Rechaza si nombre común existe en `species` o en `species_requests` con estado `submitted`/`accepted`.
  - Rechaza si foto es corrupta o formato inválido.
  - Responde `201` si es válido; `422` si hay error de validación; `401` si sesión inválida.

- **CA-02:** Ante `201`, la respuesta incluye `id`, `status` (`submitted`) y `created_at`. La foto se guarda en `media/species-requests/<uuid>.<ext>` (disco `media`, enmienda del ADR 0026 de 2026-11-11). En pruebas esa carpeta se publica por `/media`; la API no devuelve su URL en ninguna respuesta (CA-06, RN-04).

- **CA-03:** Ante `422`, la respuesta incluye mensajes en español: «Nombre común requerido.», «La especie ya fue solicitada.», «No se pudo procesar la foto.» (según corresponda). Para el tipo de animal, «Tipo de animal requerido.» o «Tipo de animal no válido.» (textos propuestos; por confirmar, CA-25).

- **CA-04:** La foto se valida: MIME type (`image/jpeg`, `image/png`), tamaño máximo 5 MB, dimensiones mínimas 400x300 px (opcional, a decidir con diseño).

### Listado y detalle (administración)

- **CA-05:** Dado `zoo-admin` con `species.review`, cuando llama `GET /api/v1/admin/species-requests?status=submitted`, entonces lista solicitudes paginadas (10 por página), ordenadas por `created_at` descendente, con campos: `id`, `common_name`, `scientific_name`, `status`, `created_at`, `veterinarian_name` (del `created_by`); no incluye la foto en el JSON.

- **CA-06:** Dado un `id` válido, cuando llama `GET /api/v1/admin/species-requests/{id}`, entonces responde `200` con:
  - `id`, `common_name`, `scientific_name`, `origin`, `habitat`, `category`, `status`, `created_at`, `veterinarian_name`, `rejection_reason` (si aplica) y `published_fields` (lista de claves, RN-13).
  - Sin URL de foto en el JSON. La foto se sirve por ruta autenticada `GET /api/v1/admin/species-requests/{id}/image` (binario, con `species.review` y 2FA). En pruebas la misma foto también es alcanzable por `/media` si se conoce su URL (riesgo aceptado; ver «Recomendación antes de producción»).

- **CA-07:** Dado un usuario sin permiso `species.review`, cuando llama cualquier endpoint de solicitudes (listado, detalle, imagen, edición, aceptar o rechazar), responde `403`.

### Aceptación

- **CA-08:** Dada una solicitud en `submitted`, cuando llama `POST /api/v1/admin/species-requests/{id}/accept`, entonces:
  - Crea un registro en `species` con los datos (`common_name`, `scientific_name`, `origin`, `habitat`, `category`; CA-25).
  - Dentro de la transacción con bloqueo de la fila (CA-19), copia la foto de `media/species-requests/<uuid>.<ext>` a `media/species/<uuid>.<ext>` (mismo nombre, carpeta pública). Guarda la ruta publicada según la opción 2b de DBR-013 (`docs/database/requests/DBR-013-species-requests.md`, «Decisiones para el responsable de BD») y vincula la solicitud con la especie creada (`species_id`, CA-24).
  - Actualiza solicitud a status `accepted`, guarda `reviewed_by` y `reviewed_at`, y pone `image_path` a NULL.
  - Confirma la transacción y solo después borra la original `media/species-requests/<uuid>.<ext>`. Si la transacción falla antes de confirmar, borra la copia nueva en `media/species/` y conserva la original (mismo orden que CA-23).
  - Si el borrado de la original falla después de confirmar, la respuesta sigue siendo `200`; se registra un aviso técnico que no se muestra al usuario y el archivo queda para el reintento de Riesgos.
  - Responde `200` con la especie creada.
  - Registra auditoría: "Especie solicitada por {vet} aceptada por {admin}".
  - Verificación: test PHPUnit `test_ca08_accept_copies_confirms_and_deletes_original` (secuencia: copia en `species/`, commit, borrado de la original, `image_path` NULL) y `test_ca08_accept_returns_200_when_original_delete_fails` (la respuesta es `200`, la especie existe y la original queda pendiente de reintento). Ambos con `Storage::fake('media')`.

- **CA-09:** Dado una solicitud no en `submitted`, cuando intenta aceptar, responde `422`: «Esta solicitud ya fue revisada.»

### Rechazo

- **CA-10:** Dado una solicitud en `submitted`, cuando llama `POST /api/v1/admin/species-requests/{id}/reject` con cuerpo `{rejection_reason}` (requerido, 1-500 caracteres), entonces:
  - Actualiza solicitud a status `rejected`.
  - Guarda `rejection_reason`, `reviewed_by`, `reviewed_at`.
  - Borra la foto de `media/species-requests/<uuid>.<ext>` y deja `image_path` en `null`.
  - Responde `200`.
  - Registra auditoría: "Especie solicitada rechazada: {motivo}".

- **CA-11:** Ante motivo faltante o fuera de rango, responde `422`: «Motivo requerido (1-500 caracteres).»

### Transversales

- **CA-12:** Dado cualquier `401` en estas rutas, responde sin sesión válida. Dado cualquier `403`, responde sin permiso.

- **CA-13:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` y existe al menos un test que nombra cada CA-01 a CA-25.

### Edición previa a la decisión (2026-11-11)

- **CA-14 (acceso a la edición):** Dada una solicitud en `submitted`, cuando `zoo-admin` con `species.review` y 2FA confirmado llama `PATCH /api/v1/admin/species-requests/{id}`, entonces responde `200`. Cuando lo llama `admin`, `executive`, `cashier` o `veterinarian`, responde `403` y no cambia nada. Sin sesión, responde `401`.

- **CA-15 (edición de campos):** Dada una solicitud en `submitted`, cuando se envían uno o más de los campos `common_name`, `scientific_name`, `origin`, `habitat`, `category` y `published_fields`, o una foto nueva en `image` (CA-23), con valores válidos, entonces:
  - La API guarda los valores sin espacios al inicio ni al final.
  - `origin` y `habitat` pueden enviarse vacíos; se guardan como `null`.
  - `status` sigue en `submitted`. No se publica nada y no se reenvía.
  - `created_by`, `created_at` y los campos de revisión no cambian. `image_path` cambia solo si se envía una foto nueva (CA-23).
  - Responde `200` con el mismo JSON que el detalle de CA-06, ya con los valores guardados.
  - Sin ningún campo en el cuerpo, responde `422` con «Nada que guardar.»

- **CA-16 (validación de la edición):** Dada una edición, cuando ocurre alguno de estos casos, entonces responde `422` con mensaje en español, no cambia nada y no escribe auditoría:
  - `common_name` o `scientific_name` vacíos, ausentes o de más de 150 caracteres: «Nombre común requerido (1-150 caracteres).» o «Nombre científico requerido (1-150 caracteres).».
  - `origin` o `habitat` de más de 150 caracteres: «Origen: máximo 150 caracteres.» o «Hábitat: máximo 150 caracteres.».
  - `category` fuera de la lista cerrada de DBR-004, o vacío si la obligatoriedad se confirma: «Tipo de animal no válido.» o «Tipo de animal requerido.» (textos propuestos; CA-25).
  - `common_name` coincide con una especie publicada o con otra solicitud `submitted`/`accepted` distinta de la que se edita (RN-03): «La especie ya fue solicitada.».
  - El cuerpo incluye un campo fuera de los editables (`common_name`, `scientific_name`, `origin`, `habitat`, `category`, `published_fields` e `image`), por ejemplo `status`, `species_id` o `created_by`: «Campo no editable: {campo}.».

- **CA-17 (solo en `submitted`):** Dada una solicitud en `accepted` o `rejected`, cuando se llama `PATCH`, entonces responde `422` con «Esta solicitud ya fue revisada.» y no cambia nada. Es el mismo mensaje de CA-09.

- **CA-18 (auditoría de la edición):** Dada una edición válida que cambia al menos un valor, cuando se guarda, entonces Activitylog registra «Solicitud de especie editada por {admin}» con los valores anteriores y nuevos de los campos cambiados en sus propiedades. Una edición que no cambia ningún valor responde `200` y no registra nada. Dónde se guarda el historial (Activitylog o tabla propia) depende de la pregunta 5 y de DBR-013 pregunta 1.

- **CA-19 (edición y decisión sin carreras):** Dada una edición y una decisión (aceptar o rechazar) sobre la misma solicitud, cuando llegan a la vez, entonces la Action ejecuta la operación en una transacción con bloqueo de la fila y comprueba `status = submitted` dentro del bloqueo. Quien llegue después ve el estado actual: si la decisión ganó, la edición responde como en CA-17; si la edición ganó, la decisión usa los datos guardados. Verificación: prueba secuencial (aceptar y después editar responde `422`; editar y después aceptar publica los datos editados) y revisión de que la Action usa el bloqueo.

### Permisos por seeder (2026-11-11)

- **CA-20 (permiso asignado solo a `zoo-admin`):** Dado `RolesAndPermissionsSeeder` ejecutado, cuando se comprueba, entonces `species.review` existe en `permissions` (creado con `findOrCreate`), lo tiene solo `zoo-admin` y `admin` lo tiene excluido de forma explícita, no por omisión. Test: un usuario con rol `admin` recibe `403` en las rutas de solicitudes (CA-07) y un `zoo-admin` con 2FA recibe `200` en el listado. Estado: pendiente de implementar en el seeder (tarea futura T-SEED). Hasta entonces, este CA no se cumple.

### Ficha pública, foto y vínculo (2026-11-11)

- **CA-21 (campos de la ficha pública):** Dado un envío (`POST`) o una edición (`PATCH`) con `published_fields`, cuando se valida, entonces:
  - El valor es una cadena JSON con un array de claves, por ejemplo `["scientific_name","origin","habitat"]`. La cadena vacía o `[]` significa solo nombre común y foto.
  - Cada clave debe estar en RN-13. Una clave fuera de la lista, incluidas `common_name`, `category` e `image`, responde `422` con «Campo no permitido en la ficha pública: {clave}.» y error en `errors.published_fields`.
  - Si el valor no es un array JSON de cadenas, responde `422` con «La selección de campos públicos no es válida.».
  - Las claves repetidas se guardan una vez.
  - Sin `published_fields` en un envío, se guardan los predeterminados de RN-13.

- **CA-22 (edición de la selección):** Dada una solicitud en `submitted`, cuando `PATCH` trae `published_fields`, entonces reemplaza la lista completa (no la combina), responde `200` con el JSON de CA-06 y registra la auditoría de CA-18 con la lista anterior y la nueva solo si cambia. Sin `published_fields` en el cuerpo, la lista guardada no cambia.

- **CA-23 (reemplazo de la foto en la edición):** Dada una solicitud en `submitted`, cuando `PATCH` trae un archivo en `image` (multipart), entonces:
  - Se valida como en CA-02 y CA-04 (JPG o PNG, máx. 5 MB), con los mismos mensajes. Un archivo no procesable responde `422` con «No se pudo procesar la foto. Intenta con otro archivo.» y no cambia nada.
  - La API guarda la foto nueva en `media/species-requests/<uuid>.<ext>` antes de abrir la transacción. Dentro de la transacción con bloqueo de la fila (CA-19) actualiza `image_path`. Tras confirmar, borra el archivo anterior, que no se conserva ni se archiva (decisión del usuario 2026-11-11, pregunta 8; mismo criterio de borrado tras confirmar que CA-08). Si la transacción falla, borra la foto nueva y conserva la anterior.
  - Si el archivo anterior ya no existe, la respuesta sigue siendo `200` y se registra un aviso técnico que no se muestra al usuario.
  - Responde `200` con el JSON de CA-06, sin URL de la foto.
  - Registra en Activitylog «Foto de solicitud de especie reemplazada por {admin}», sin ruta ni nombre de archivo.
  - Si la solicitud ya no está en `submitted`, responde `422` con «Esta solicitud ya fue revisada.» (CA-17), no guarda la foto y borra la foto nueva.
  - Verificación: prueba de la secuencia (foto nueva guardada, fila actualizada, archivo anterior borrado) y prueba de fallo de la transacción (archivo nuevo borrado, anterior conservado).

- **CA-24 (vínculo solicitud↔especie):** Dada una aceptación exitosa (CA-08), cuando termina, entonces `species_requests.species_id` es el `id` de la especie creada, dentro de la misma transacción. Dada una solicitud en `submitted` o `rejected`, `species_id` es NULL. Verificación: prueba PHPUnit tras aceptar y tras rechazar.

- **CA-25 (tipo de animal, 2026-11-11):** Dado el envío (`POST`) o la edición (`PATCH`) de una solicitud en `submitted`, cuando se valida `category`, entonces:
  - El valor debe estar en la lista cerrada de DBR-004: `mammal`, `bird`, `reptile`, `amphibian`, `fish` o `invertebrate`. Otro valor responde `422` con «Tipo de animal no válido.» y error en `errors.category`.
  - En el envío, `category` es obligatorio (**por confirmar**). Si falta, responde `422` con «Tipo de animal requerido.». Si no se confirma la obligatoriedad, el envío sin `category` se acepta y la especie queda con `category` NULL, sin contar en las misiones ni en el filtro por tipo.
  - Un `PATCH` con `category` reemplaza el valor anterior. Con un valor válido responde `200` con el JSON de CA-06 y registra en la auditoría de CA-18 el valor anterior y el nuevo.
  - Al aceptar (CA-08), `species.category` recibe el valor de la solicitud.
  - `category` no se acepta en `published_fields`: esa clave responde `422` con «Campo no permitido en la ficha pública: category.» (CA-21), porque se publica siempre (RN-13).
  - Verificación: tests PHPUnit `test_ca25_store_rejects_category_outside_closed_list`, `test_ca25_store_requires_category_when_mandatory` (solo si se confirma la obligatoriedad), `test_ca25_update_replaces_category_and_audits_change`, `test_ca25_update_rejects_category_outside_closed_list` y `test_ca25_accept_copies_category_to_species`. Todos con `DatabaseTransactions` sobre `arca_pruebas`.

## Reglas de negocio

- **RN-01 (acceso):** Solo `veterinarian` puede enviar, por regla de rol (`pwa-005` RN-01). Solo `zoo-admin` con `species.review` y 2FA puede listar, ver, editar, aceptar o rechazar. Ningún otro rol tiene acceso.

- **RN-02:** Estados válidos: `submitted`, `accepted`, `rejected`. Transiciones: `submitted` → `accepted` o `rejected`; terminal. La edición no es una transición de estado.

- **RN-03:** Nombre común es único entre `species` publicadas y solicitudes `submitted`/`accepted`; permite duplicados en `rejected`. Se aplica al envío y a la edición (excluyendo la propia solicitud).

- **RN-04 (foto):** La foto pendiente se guarda en `media/species-requests/` (disco `media`). Al aceptar se copia a `media/species/` con el mismo nombre, se confirma la transacción y después se borra la original (CA-08); al rechazar se borra; al reemplazarla en la edición (CA-23), el archivo anterior se borra tras confirmar. En pruebas, ambas carpetas se publican por `/media`. La API nunca devuelve la URL de la foto de una solicitud pendiente o rechazada.

- **RN-05:** La API es la única autoridad de transiciones de estado; el dashboard solo presenta y solicita, no calcula.

- **RN-06:** Mensajes en español; identificadores, rutas y campos en inglés (Constitución VI).

- **RN-07:** Solicitudes rechazadas no se muestran en la lista de la PWA ni en el dashboard del veterinario (feedback solo administrativo).

- **RN-08:** Foto binaria se entrega solo por ruta autenticada `admin.species-requests.image` (análogo a `admin.memories.image` de `api-013`).

- **RN-09 (edición previa):** Solo en `submitted`. Cambia `common_name`, `scientific_name`, `origin`, `habitat`, `category` y `published_fields`; cambia la foto solo si se envía una nueva (CA-23). No cambia el estado, no publica y no reenvía. Valida igual que el envío (CA-16, CA-21 y CA-23).

- **RN-10 (permisos del seeder):** `species.review` se crea en `RolesAndPermissionsSeeder` con `Permission::findOrCreate` y se asigna solo a `zoo-admin`. El seeder da a `admin` todos los permisos de su arreglo salvo `tickets.create` y `tickets.cancel`. Por eso `species.review` (y `memories.review`, `api-010` RN-07) debe excluirse de `admin` de forma explícita. `executive`, `cashier` y `veterinarian` no lo reciben. El seeder no borra permisos existentes.

- **RN-11 (concurrencia):** Editar, aceptar y rechazar comparten la misma regla: transacción y comprobación de `submitted` con bloqueo de la fila (CA-19).

- **RN-12 (auditoría de la edición):** Cada edición queda registrada con valores anteriores y nuevos (CA-18). El veterinario creador y la Dirección revisora quedan identificados como en las decisiones.

- **RN-13 (campos de la ficha pública):** `common_name` y la foto se publican siempre. El resto se elige de una lista cerrada, que valida la API: `scientific_name`, `origin` y `habitat` vienen marcados por defecto; `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics` vienen desmarcados. Desmarcar un campo solo evita que se muestre en el portal: el dato sigue guardado en la solicitud y es visible para `zoo-admin` en el dashboard. Marcar un campo extra exige que tenga fuente (pregunta 3). Sin `published_fields` en el envío, la API guarda los predeterminados. Las claves `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics` no se implementan hasta resolver DBR-013 pregunta 8, porque la solicitud no las guarda. La API define la lista y los predeterminados; los clientes solo muestran las etiquetas (Constitución III). `category` (tipo de animal) no está en esta lista: se publica siempre (propuesta por confirmar; CA-25), y la clave aparece con `null` si la especie no tiene valor, como en `api-015` CA-03.

## Datos, privacidad y auditoría

- Solicitud pendiente: la foto no tiene URL en ninguna respuesta de la API. En pruebas, la carpeta es alcanzable por `/media` si se conoce la URL (riesgo aceptado; ADR 0026, riesgo m).
- Especie aceptada: pública; foto y datos visibles en el catálogo (`api-015`).
- Auditoría registra: veterinario creador, admin revisor, timestamp, estado, motivo de rechazo y cada edición con valores anteriores y nuevos.
- No requiere consentimiento adicional del veterinario (obra por encargo).
- Longitud de `origin` y `habitat`: 150 caracteres (resuelta el 2026-11-11, propuesta de DBR-013 pregunta 2).

## Flujos y errores

1. Veterinario envía solicitud con foto → `201` si válido.
2. `zoo-admin` lista solicitudes `submitted` → filtro por estado.
3. Abre detalle → ve datos y foto por ruta autenticada.
4. Opcional: edita los datos (`PATCH`) → sigue en `submitted` (CA-15).
5. Acepta → especie publicada en catálogo (`api-015`).
6. Rechaza con motivo → solicitud rechazada, foto borrada.
7. Veterinario no ve ningún resultado del rechazo (no hay feedback).
8. Errores: `401` sin sesión; `403` sin `species.review`; `404` solicitud no encontrada; `422` validación, ya revisada o campo no editable.

## Recomendación antes de producción (2026-11-11)

Deuda y riesgo conocido: en pruebas, una foto pendiente de `media/species-requests/` puede verse si alguien conoce su URL (`/media/species-requests/<uuid>.<ext>`). La API no la revela, pero no hay control de acceso al archivo.

Antes de producción hay que elegir una de estas dos opciones, y se configurará entonces (`.env`, `infra/README.md` y una enmienda del ADR 0026 o un ADR propio):

- **A. Almacenamiento privado:** sacar `species-requests/` de la carpeta publicada y servir la foto solo por ruta protegida con `species.review` (o por URL firmada de corta duración).
- **B. Otro almacenamiento:** migrar la carpeta a un almacenamiento de objetos, como describe `docs/propuestas/almacenamiento-objetos-s3.md`. Requiere ADR propio.

## Dependencias, riesgos y preguntas

- **Dependencias:**
  - DBR-013 (`docs/database/requests/DBR-013-species-requests.md`, Borrador): tabla `species_requests` con `species_id` y `category` (decididos), `published_fields` (propuesta), ruta de imagen (opción 2b, pendiente de BD) y el permiso `species.review` por seeder. Bloquea la implementación hasta que BD decida 2a y 2b.
  - `api-013` (Borrador) y ADR 0026 (Propuesto; enmienda del 2026-11-11 con las carpetas `species/` y `species-requests/`).
  - `api-015` (Borrador): lectura pública de especies aceptadas.
  - `dashboard-010` (Borrador): revisión, edición y decisiones desde el dashboard. Absorbe `dashboard-009`.
  - `pwa-005` (Borrador): envío desde la PWA.
  - `api-007` (2FA y rutas `/api/v1/admin`).
  - Permiso `species.review` nuevo (ver RN-10 y la tarea futura T-SEED).

- **Tarea futura T-SEED (pendiente de `apps/api/tasks/014-species-requests.md`; no se implementa con esta spec):** cambio en `apps/api/src/database/seeders/RolesAndPermissionsSeeder.php`. Hoy el archivo no contiene `species.review` ni `memories.review`, y el rol `admin` recibe `array_diff($permissions, ['tickets.create', 'tickets.cancel'])`, es decir, todos los permisos del arreglo.
  1. Añadir `species.review` y `memories.review` al arreglo `$permissions`, creados con `Permission::findOrCreate` (ya lo hace el `map` del seeder para todos los nombres del arreglo).
  2. Excluir ambos de `admin`: `array_diff($permissions, ['tickets.create', 'tickets.cancel', 'species.review', 'memories.review'])`. La exclusión es explícita; no depende de que el permiso no esté en el arreglo.
  3. Asignar ambos solo a `zoo-admin` en su lista de permisos. `executive`, `cashier` y `veterinarian` no los reciben.
  4. Test de CA-20: `admin` recibe `403` y `zoo-admin` con 2FA recibe `200`.
  5. Anotar el cambio en `infra/README.md` (checklist de seeder de permisos).

- **Riesgos:**
  - Sin lista de seguimiento, el veterinario desconoce el resultado.
  - Foto no borrada en caso de error después de la decisión → riesgo de huérfanos.
- **Fallo entre la copia y el borrado de la original (CA-08, pregunta 7 resuelta):** si el borrado falla tras confirmar, la solicitud ya está `accepted` con `image_path` NULL y la original queda en `species-requests/`, alcanzable por `/media` en pruebas. La respuesta sigue `200`. Mitigación: aviso técnico en el registro y un reintento seguro que borra un archivo de `species-requests/` solo si ninguna solicitud en `submitted` lo referencia en `image_path`. Como `accepted` y `rejected` tienen `image_path` NULL, esa regla no borra fotos pendientes. El mecanismo del reintento (comando, job o tarea de limpieza) no está en esta spec; se decide en el plan y requiere su propio test.
  - Reemplazo de foto en la edición (CA-23): riesgo de huérfanos si falla después de guardar; se mitiga con el orden de CA-23.
  - Pérdida de la foto anterior al reemplazarla (decisión del 2026-11-11, pregunta 8): no queda copia en la API. Si la foto anterior se versionó en git, queda en el historial (ADR 0026, RN-17 de `api-013`).
  - PHP solo interpreta multipart en `POST`; con `PATCH` multipart el archivo no llega a Laravel sin un ajuste. El plan decide el método (por ejemplo, `POST` con `_method=PATCH`) sin cambiar el contrato lógico de CA-23.
  - Validación de formato de foto requiere librería (¿imagick/gd?).
  - Foto pendiente accesible por URL en pruebas (ADR 0026, riesgo m; ver «Recomendación antes de producción»).
  - Edición y decisión simultáneas (CA-19).
  - Efecto en `mobile` (avisar al equipo; esta spec no cambia código ni specs de mobile): al aceptar una especie con `category`, esta pasa a contar en las misiones `category_species_count` (`api-005`) y `GET /api/v1/species` (`api-006`) la expone. El equipo de mobile debe verificarlo.
  - Obligatoriedad de `category` sin confirmar: si el campo queda opcional, habrá especies aceptadas con `category` NULL que no cuentan en las misiones ni en el filtro por tipo (**por confirmar**).

- **Preguntas abiertas:**
  1. ¿La solicitud rechazada se borra después de X días automáticamente?
  2. ¿El veterinario debe recibir notificación de aceptación (email, aviso en PWA)?
  3. **Fuentes de campos extra.** Abierta. La selección de la ficha ya existe (RN-13); falta decidir de dónde sale cada campo extra (DBR-013 pregunta 8). Ver `dashboard-010` pregunta 7. **Pregunta concreta (decisión abierta principal de la ficha, 2026-11-11):** ¿el formulario de la PWA debe pedir también estos campos de especie para poder publicarlos? (`pwa-005`). **`category` resuelta (decisión del usuario 2026-11-11, DBR-013 pregunta 10):** la solicitud la captura (CA-01, CA-15, CA-25). Sigue abierta solo la fuente de los seis campos extra (DBR-013 pregunta 8; ADR 0028).
  4. **Foto reemplazable en la edición.** **Resuelta, decisión del usuario 2026-11-11:** sí, `PATCH` multipart con foto opcional (CA-23).
  5. **Historial de edición.** ¿Basta con Activitylog o se crea una tabla de revisiones? Ver DBR-013 pregunta 1.
  6. **Envío por rol o por permiso.** ¿Se mantiene la regla de rol `veterinarian` (propuesta, `pwa-005` RN-01) o se crea un permiso de envío? Propuesta: rol.
7. **Foto original tras aceptar. Resuelta, decisión del usuario 2026-11-11: opción B («mover»), válida en el entorno de pruebas.** Al aceptar, la API copia la foto a `media/species/`, confirma la transacción y después borra la original de `media/species-requests/`; `image_path` queda NULL (CA-08). Antes de producción se revisa junto con la recomendación de almacenamiento privado.
   - Contexto: CA-08 copia la foto de `media/species-requests/<uuid>.<ext>` a `media/species/<uuid>.<ext>`. En rechazo (CA-10) y en reemplazo por edición (CA-23) la foto de la solicitud se borra. `media/` está versionada en git y, en pruebas, se publica por `/media` (ADR 0026, enmienda de 2026-11-11).
   - Consecuencias comparadas (se conservan como registro de la decisión):

| Aspecto | A. Conservar la original | B. Mover (copiar, confirmar la transacción y borrar la original) — **elegida** |
|---|---|---|
| Copias de la foto | Dos: la original en `species-requests/` y la copia en `species/`. | Una: solo en `species/`. |
| Peso | Git guarda cada contenido una sola vez, así que el repositorio no duplica el archivo, pero sí versiona dos rutas con la misma foto. El doble de peso es real en disco y en despliegues. | Una copia en disco y una ruta versionada. Git puede registrarla como renombrado si el movimiento se confirma en el mismo commit. |
| Exposición pública | La foto de una solicitud aceptada sigue en `/media` (en pruebas). Al pasar a almacenamiento privado queda una copia que mover. | Sin restos públicos en `species-requests/`. |
| Coherencia | Distinto del rechazo y del reemplazo, que borran la foto de la solicitud. | Igual que el rechazo (CA-10) y el reemplazo (CA-23). |
| Auditoría | La foto de la solicitud aceptada es la última que se guardó. La original que envió el veterinario solo se conserva si nunca hubo reemplazo, porque CA-23 borra la anterior. | La foto aceptada es la de `species/`, con el mismo nombre (uuid). La original que envió el veterinario no queda en ningún lugar, igual que en rechazo. |
| Huérfanos | Si en el futuro se purga la solicitud (pregunta 1), la original queda sin fila que la apunte. | Si el borrado tras confirmar falla, queda una original huérfana; se limpia con el reintento de Riesgos. |
| Riesgo de pérdida | Ninguno sobre la foto aceptada. | Si la base falla después de mover, la foto se pierde. Mitigación: copiar primero; si la transacción falla, borrar la copia nueva y conservar la original; borrar la original solo tras confirmar. |
| `species_requests.image_path` al aceptar | No cambia: sigue apuntando a `species-requests/`. | Pasa a NULL, como en rechazo. Con 2b, la ruta publicada va en `species.image_path` o en `species_requests.published_image_path` (DBR-013). |
| Texto de CA-08 | Habría que decir que la original se conserva en `media/species-requests/` y que `image_path` no cambia. | Redactado como «copia, confirma y borra la original». |
| DBR-013 | `image_path` no cambia al aceptar. | `image_path` pasa a NULL al aceptar (alineado, pregunta 9 de DBR-013). |
| ADR 0026 | La enmienda tendría que decir que `species-requests/` conserva las originales de las aceptadas, y mover antes de producción. | Frase añadida a la enmienda: se borran al rechazar y al aceptar, tras copiar a `species/`. |

   - Recomendación: B, aplicada (decisión del usuario, 2026-11-11).
8. **Archivo anterior al reemplazar la foto.** **Resuelta, decisión del usuario 2026-11-11:** se borra tras confirmar la transacción y no se conserva ni se archiva (CA-23). Texto original de la pregunta: CA-23 borra el archivo anterior tras confirmar, porque SoftDeletes aplica a filas, no a archivos, y conservarlo en `media/` lo dejaría publicado por `/media`. Se pidió conservar o archivar la foto anterior: ¿se confirma el borrado, o se archiva en una carpeta privada (requiere enmienda del ADR 0026)? Propuesta: borrar. **Respuesta (2026-11-11):** se confirma el borrado; no se archiva, así que no hay enmienda del ADR 0026 por este punto.

- **Resueltas el 2026-11-11 (decisión del usuario):**
  - Foto en la carpeta pública `media/` durante pruebas, con la recomendación de arriba (ver «Decisiones tomadas»).
  - Lectura pública de especies aceptadas: `api-015` (no se amplía `api-006`).
  - Edición previa a la aceptación: `PATCH` de esta spec (CA-14 a CA-19).
  - Permisos: `species.review` solo para `zoo-admin`, excluido de `admin` (RN-10, CA-20).
  - Longitud de `origin` y `habitat`: 150 caracteres.
  - `species_id` nullable (DBR-013 pregunta 3): decidido.
  - Foto reemplazable en la edición (pregunta 4): decidido.
  - Selección de campos de la ficha pública: RN-13 y CA-21 a CA-22.
  - Predeterminados de la ficha (2026-11-11): `scientific_name`, `origin` y `habitat` marcados por defecto (RN-13, CA-21). Desmarcar solo oculta el campo en el portal.
  - Archivo anterior al reemplazar la foto (pregunta 8): se borra tras confirmar y no se conserva (CA-23).

## Revisión

- Aprobadores y fecha: (pendiente)
- Estado: Borrador (requiere validación técnica, DBR-013 aprobada y la enmienda del ADR 0026 aprobada antes de En progreso).
- Historial: ampliación del 2026-11-11 (edición `PATCH`, lectura pública en `api-015`, foto en carpeta pública durante pruebas, permisos por seeder y tarea T-SEED). Segunda ampliación del mismo día: `species_id` decidido, foto reemplazable en la edición, selección de la ficha pública (RN-13, CA-21 a CA-24) y rechazo con diálogo obligatorio en `dashboard-010`. Tercera ampliación del mismo día: predeterminados de la ficha con origen marcado (RN-13, CA-21), foto anterior borrada sin conservarla (CA-23, pregunta 8) y pregunta concreta sobre la ampliación del formulario (pregunta 3). Cuarta ampliación del mismo día: tipo de animal (`category`) capturado en el envío, editable y copiado al aceptar (CA-01, CA-08, CA-13, CA-15, CA-16, CA-21, nuevo CA-25; RN-09, RN-13); obligatoriedad y publicación siempre, por confirmar; efecto en mobile en riesgos.
