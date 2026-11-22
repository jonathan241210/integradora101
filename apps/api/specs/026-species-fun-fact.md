# 026 · species-fun-fact (campo «Dato curioso» en la ficha pública de especies)

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: enum de campos publicados, validación, Actions de envío, edición, aceptación, republicar y eliminar, recursos públicos y de administración); `pwa` (`pwa-005`, envío del veterinario: casilla y texto; revisión pendiente, ver «Cambios por área»); `dashboard` (`dashboard-010`, revisión y edición en TulanPedia; revisión pendiente); `web` (`web-011`, muestra el campo solo si la API lo publica; revisión pendiente); `packages/api-client` (tipos del campo; sin cambio de métodos); `mobile` sin cambios (`api-006` no cambia).
- Estado: Aprobada
- Solicitante / responsable funcional: Jonathan
- Aprobación funcional: Jonathan, 2026-11-21
- Base de datos: `docs/database/requests/DBR-025-species-fun-fact.md` (Lista para backend, 2026-11-21).
- Número: `026` es el siguiente libre en `apps/api/specs/` (el máximo existente es `025-single-business-timezone.md`).

## Problema y contexto

La ficha pública de especies (TulanPedia, `web-011`) muestra solo los campos que la Dirección publica (`api-014` RN-13, `api-015`). Falta un dato corto y atractivo para quien visita el zoológico. El veterinario puede proponerlo desde la PWA al solicitar la publicación, y la Dirección lo revisa y lo edita en el dashboard antes de publicarlo.

Los formularios veterinarios tienen datos clínicos. Este campo **no** los reutiliza: es un texto nuevo, de contenido público, y no se copia ningún dato clínico al portal.

## Decisiones (2026-11-21, Jonathan)

- Un solo campo de texto plano opcional, «Dato curioso», de hasta 500 caracteres.
- Sin datos clínicos ni de personas. Texto de ayuda para los formularios: «Escribe una o dos frases para quien visita el zoológico. No incluyas datos clínicos ni de personas.»
- Es obligatorio, con un mínimo de 20 caracteres, solo si en «Qué mostrar» se marca que se muestre.
- No se añaden otros datos de los formularios veterinarios. Lo clínico no va al portal.
- El veterinario lo propone desde la PWA. La Dirección (`zoo-admin`) lo revisa y lo edita en TulanPedia del dashboard. Al aceptar se copia a `species`, igual que `origin` se copia a `distribution`. `web` lo muestra solo si está publicado.

## Objetivos

- Añadir `fun_fact` como clave de `published_fields`, con sus reglas de texto, obligatoriedad y longitud.
- Copiar el valor a `species` al aceptar, y permitir corregirlo en la revisión y en la edición de una especie despublicada.
- Publicarlo en `GET /api/v1/published-species` solo cuando la especie es visible y el campo está seleccionado.
- No exponerlo en listados ni en respuestas de otros roles, salvo donde se indica.

## Fuera de alcance

- Validar automáticamente que el texto no tenga datos clínicos ni de personas. Es responsabilidad de la revisión humana (RN-08).
- Otros campos de la ficha (`conservation_status`, `size_cm`, `gestation_period`, `diet`/`feeding`, `longevity`, `characteristics`): siguen fuera (`api-014` «Fuera de alcance», DBR-013 pregunta 8).
- Varios datos curiosos, traducciones, imágenes asociadas o historial propio de versiones.
- Filtro por `fun_fact` en `GET /api/v1/published-species`.
- Cualquier cambio en `GET /api/v1/species` (`api-006`) y en la app móvil.
- Corregir la deriva `diet`/`feeding` (ver «Riesgos»): se documenta aquí y se corrige en otra spec.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `veterinarian` | Escribir el dato curioso al enviar la solicitud; ver el vigente de la especie en el selector (CA-14) | Sesión válida y rol `veterinarian` (sin permiso nuevo) |
| `zoo-admin` | Revisar, corregir y editar el dato curioso antes de aceptar; editarlo en una especie despublicada | `species.review` y 2FA (`api-014`) |
| Visitante anónimo | Leer el dato curioso de una especie publicada | Ninguno (`api-015`) |
| `admin`, `executive`, `cashier` | Sin acceso al campo | — |

## Historias de usuario

- Como veterinario, quiero proponer un dato curioso de la especie cuando pido su publicación, para que el visitante lo vea en TulanPedia.
- Como `zoo-admin`, quiero revisar y corregir el dato curioso antes de publicarlo, para que el portal muestre texto correcto y apropiado.
- Como visitante, quiero ver un dato curioso de cada especie publicada que lo tenga, para conocerla mejor.

## Criterios de aceptación

- **CA-01 (clave del campo):** Dado el enum de campos publicados, cuando se consulta, entonces `fun_fact` es una clave aceptada en `published_fields` (`PublishedSpeciesField::FunFact`, valor `fun_fact`). Una clave desconocida sigue respondiendo `422` con «Campo no permitido en la ficha pública: {clave}.».
  - Verificación: `test_ca01_fun_fact_is_an_accepted_published_field`.

- **CA-02 (obligatorio y mínimo cuando se muestra):** Dado un envío (`POST`) o una edición (`PATCH`) cuyo estado final incluye `fun_fact` en `published_fields`, cuando el texto tiene menos de 20 caracteres tras quitar los espacios sobrantes (o falta), entonces responde `422` con «Dato curioso: escribe al menos 20 caracteres.» en `errors.fun_fact`, y no cambia nada. Con exactamente 20 caracteres, se acepta.
  - Verificación: `test_ca02_required_and_min_20_when_selected`.

- **CA-03 (máximo y texto plano):** Dado un `fun_fact` de más de 500 caracteres, cuando se envía, entonces responde `422` con «Dato curioso: máximo 500 caracteres.». Con 500 caracteres se acepta. El valor se guarda sin espacios al inicio ni al final, como texto plano: la API no lo interpreta como HTML (RN-07).
  - Verificación: `test_ca03_max_500_plain_text_trimmed`.

- **CA-04 (sin marcar: el texto no se guarda):** Dado un envío (`POST`) cuyo `published_fields` no incluye `fun_fact`, cuando trae un texto en `fun_fact`, entonces responde `201` (no es error), y la solicitud guarda `fun_fact` en NULL (RN-02).
  - Verificación: `test_ca04_text_is_discarded_when_field_not_selected`.

- **CA-05 (edición en revisión):** Dada una solicitud en `submitted`, cuando `zoo-admin` llama `PATCH /api/v1/admin/species-publication-requests/{id}`:
  - Con `fun_fact` válido, responde `200`, guarda el valor sin espacios sobrantes y `status` sigue en `submitted` (`api-014` CA-15).
  - Si quita `fun_fact` de `published_fields` (sin enviar texto), la solicitud queda con `fun_fact` NULL.
  - Si añade `fun_fact` a `published_fields` y la solicitud no tiene texto válido, responde `422` según CA-02 y no cambia nada. La validación usa el estado final, con el registro bloqueado (`api-014` CA-19).
  - Verificación: `test_ca05_patch_validates_fun_fact_on_final_state`.

- **CA-06 (auditoría de la edición):** Dada una edición que cambia `fun_fact` (o la selección que lo incluye), cuando se guarda, entonces Activitylog registra el valor anterior y el nuevo, como `api-014` CA-18. Si el valor no cambia, no se registra nada.
  - Verificación: `test_ca06_fun_fact_change_is_audited_with_before_and_after`.

- **CA-07 (copia al aceptar):** Dada una solicitud en `submitted`, cuando `zoo-admin` la acepta (`POST .../{id}/accept`, `api-014` CA-08), entonces `species.fun_fact` toma el valor de `species_publication_requests.fun_fact` (NULL si la solicitud no lo tiene). Esto ocurre siempre que se copia `published_fields` (RN-03). La respuesta y el detalle de la especie muestran el valor copiado.
  - Verificación: `test_ca07_accept_copies_fun_fact_to_species`.

- **CA-08 (edición de especie despublicada):** Dada una especie `unpublished` o `not_published`, cuando `zoo-admin` la edita con `PATCH /api/v1/admin/species/{id}/publication` (`api-014` CA-37), entonces se aplican las mismas reglas de CA-02, CA-03 y CA-04 sobre `species.fun_fact`, y CA-06 para la auditoría.
  - Verificación: `test_ca08_unpublished_species_sheet_validates_fun_fact`.

- **CA-09 (republicar):** Dada una especie que va a republicarse (`api-014` CA-36), cuando `fun_fact` está en `species.published_fields` y `species.fun_fact` no tiene entre 20 y 500 caracteres, entonces responde `422` con «Falta el dato curioso (mínimo 20 caracteres). Complétalo antes de republicar.» y no cambia nada.
  - Verificación: `test_ca09_republish_requires_valid_fun_fact_when_selected`.

- **CA-10 (eliminar la publicación):** Dada una especie con la publicación eliminada (`api-014` CA-38), cuando se consulta, entonces `species.fun_fact` no cambia (RN-05), pero la especie no aparece en la lista pública ni muestra el campo.
  - Verificación: `test_ca10_delete_keeps_fun_fact_hidden_from_public`.

- **CA-11 (lectura pública):** Dada una especie visible (`api-015` CA-01) con `fun_fact` en `published_fields`, cuando se llama `GET /api/v1/published-species`, entonces cada elemento trae la clave `fun_fact` con el valor de `species.fun_fact` (o `null` si no tiene valor). Si `fun_fact` no está en `published_fields`, la clave no aparece en el elemento. Ninguna respuesta pública trae `fun_fact` de una especie no visible.
  - Verificación: `test_ca11_public_returns_fun_fact_only_when_selected_and_visible`.

- **CA-12 (versión publicada durante una actualización pendiente):** Dada una especie publicada con una solicitud `update` en `submitted` (`api-014` CA-32), cuando se llama `GET /api/v1/published-species`, entonces `fun_fact` es el valor publicado antes de la solicitud, como el resto de campos (`api-015` CA-17).
  - Verificación: `test_ca12_public_fun_fact_keeps_published_version_during_pending_update`.

- **CA-13 (sin el campo fuera de su ámbito):** Dadas las respuestas de `GET /api/v1/admin/published-species` (listado de publicadas), `GET /api/v1/admin/species-publication-requests` (listado, `api-014` CA-05) y `GET /api/v1/species` y `GET /api/v1/species/{id}` (`api-006`), entonces ninguna incluye la clave `fun_fact`. Sus contratos no cambian.
  - Verificación: `test_ca13_fun_fact_absent_from_lists_and_mobile_responses`.

- **CA-14 (selector del veterinario, propuesta):** Dada la respuesta de `GET /api/v1/veterinarian/species` (`api-014` CA-26), cuando se llama con rol `veterinarian`, entonces cada especie trae `fun_fact` con su valor vigente (o `null`), para que la PWA lo precargue en una actualización. Sin rol `veterinarian`, responde `403`.
  - Verificación: `test_ca14_selector_exposes_current_fun_fact_to_veterinarian`.

- **CA-15 (detalle de administración):** Dada una solicitud o una especie, cuando `zoo-admin` consulta el detalle (`api-014` CA-06 y CA-37), entonces el detalle trae `fun_fact` en `current` (valor de `species`) y en `proposed` (valor que se publicaría: el de la solicitud, o el actual si no hay propuesta). Sin `species.review`, responde `403`.
  - Verificación: `test_ca15_admin_detail_shows_current_and_proposed_fun_fact`.

- **CA-16 (cobertura de pruebas):** Dada la suite PHPUnit, cuando se ejecuta `php artisan test` contra `arca_pruebas` con `DatabaseTransactions` (sin `RefreshDatabase` ni migraciones desde los tests), entonces existe al menos un test que nombra cada CA-01 a CA-15.
  - Verificación: búsqueda de `test_ca01` a `test_ca15` en `apps/api/src/tests/` (nombres en la tabla de `plan/026`).

## Reglas de negocio

- **RN-01 (clave y longitud):** `fun_fact` es una clave de `PublishedSpeciesField`. Se cuenta en caracteres (no en bytes) tras quitar los espacios al inicio y al final: mínimo 20 cuando se muestra, máximo 500 siempre.
- **RN-02 (solo con el campo marcado):** `species_publication_requests.fun_fact` guarda texto solo si `fun_fact` está en el `published_fields` de la solicitud. Si no está, guarda NULL (CA-04, CA-05). *Confirmada por Jonathan, 2026-11-21.*
- **RN-03 (copia al aceptar):** al aceptar, `species.fun_fact` toma el valor de la solicitud, igual que `published_fields`, aunque sea NULL. *Confirmada por Jonathan, 2026-11-21.*
- **RN-04 (edición de la especie):** las reglas de RN-01 y RN-02 se aplican a `species.fun_fact` cuando se edita una especie despublicada (CA-08).
- **RN-05 (eliminar no borra el texto):** eliminar la publicación no cambia `species.fun_fact`, como las correcciones (`api-014` RN-21). El campo deja de ser visible porque `published_fields` queda NULL. *Confirmada por Jonathan, 2026-11-21.*
- **RN-06 (visibilidad pública):** la clave `fun_fact` aparece en `GET /api/v1/published-species` solo si la especie es visible (`api-015` RN-03) y el campo está seleccionado (CA-11). No es filtro: el parámetro `fun_fact`, si llega, se ignora.
- **RN-07 (texto plano):** la API guarda el texto sin transformar salvo los espacios de los extremos. No lo interpreta como HTML. Los clientes lo muestran como texto (`web-011` CA-11, `dashboard-010`).
- **RN-08 (contenido sin datos clínicos ni de personas):** la API no detecta datos clínicos ni de personas. La Dirección lo revisa antes de aceptar (`dashboard-010`). El texto de ayuda lo advierte al veterinario.
- **RN-09 (auditoría):** los cambios de `fun_fact` quedan en Activitylog con valor anterior y nuevo (CA-06), igual que el resto de campos de la solicitud y de la especie (`api-014` RN-12).
- **RN-10 (compatibilidad):** sin filas con `fun_fact` antes del despliegue, la respuesta pública no cambia (la clave no aparece porque ninguna especie tiene el campo seleccionado). `api-006` y la app móvil no cambian.
- **RN-11 (orden de implementación):** no se escribe código que lea o escriba `fun_fact` hasta que DBR-025 esté en «Lista para backend» (`docs/database/README.md`).

## Textos de la API (español)

| Caso | Mensaje (`errors.fun_fact`) |
|---|---|
| Falta o menos de 20 caracteres, con el campo marcado | «Dato curioso: escribe al menos 20 caracteres.» |
| Más de 500 caracteres | «Dato curioso: máximo 500 caracteres.» |
| Valor que no es texto | «Dato curioso: texto no válido.» |
| Republicar sin texto válido (CA-09) | «Falta el dato curioso (mínimo 20 caracteres). Complétalo antes de republicar.» |

Textos de ayuda para las interfaces (no los genera la API): etiqueta «Dato curioso»; ayuda «Escribe una o dos frases para quien visita el zoológico. No incluyas datos clínicos ni de personas.»

## Datos, privacidad y auditoría

- Clasificación: contenido público de la especie. No es dato clínico, financiero ni personal. Si el texto contiene datos de personas, la revisión humana lo corrige antes de aceptar (RN-08).
- Auditoría: los cambios se registran como en `api-014` (CA-06, CA-08, RN-09). No hay tabla propia.
- SoftDeletes: no se añade ninguno. `species` y `species_publication_requests` ya los tienen (`api-014`).
- Requiere DBR: **sí**, `docs/database/requests/DBR-025-species-fun-fact.md`: una columna `fun_fact VARCHAR(500) NULL` en `species_publication_requests` y otra en `species`. La DBR no sustituye esta spec.

## Flujos y errores

1. El veterinario marca «Dato curioso» en «Qué mostrar», escribe el texto y envía (`POST`). Si el texto no cumple CA-02 o CA-03, responde `422` y no crea solicitud.
2. `zoo-admin` revisa el detalle (CA-15), corrige el texto (CA-05) y acepta con «Aceptar y publicar» o «Aceptar sin publicar» (`api-014` CA-08). Al aceptar se copia el texto (CA-07).
3. Si la especie se despublica, republica o elimina, se aplican CA-09 y CA-10.
4. Sin conexión: no aplica. Enviar y revisar son acciones en línea (`api-014`).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - DBR-025 (Lista para backend, 2026-11-21).
  - `api-014` (Aprobada; en progreso): endpoints de envío, edición, aceptación, despublicar, republicar y eliminar, que esta spec extiende.
  - `api-015` (Aprobada): lectura pública, que esta spec extiende con CA-11 y CA-12.
  - `api-006` (Aprobada): no cambia (CA-13).
  - Sin ADR nuevo: no hay dependencia nueva.
- **Revisiones de consumidores (cambios por área):** ver la sección siguiente. Las revisiones de `pwa-005`, `dashboard-010` y `web-011` las hace cada app; esta spec no las aprueba.
- **Riesgos:**
  - **Contenido inadecuado:** la API no valida el contenido (RN-08). Mitigación: revisión humana obligatoria antes de aceptar y texto de ayuda en los formularios.
  - **Deriva `diet`/`feeding` (no se corrige aquí):** la columna se llama `feeding` (DBR-014) y `api-014` / `api-015` / `web-011` / `PublishedSpeciesField` usan la clave `diet`. `apps/web/src/js/animals.js` y `apps/web/src/js/search.js` también usan `diet`. Al implementar `fun_fact` no se mezclan con esa clave. Se corrige en una spec propia.
  - **Coste de la fila:** `VARCHAR(500)` en utf8mb4 ocupa hasta 2000 bytes por columna. Verificación pendiente de BD (DBR-025, «Verificaciones para BD»).
- **Preguntas resueltas por Jonathan (2026-11-21):** las cuatro propuestas se aceptan tal cual (1 sí, 2 se descarta, 3 se conserva, 4 `fun_fact`).
- **Preguntas (histórico):**
  1. ¿El veterinario ve en el selector el dato curioso vigente de la especie, para precargarlo al pedir una actualización (CA-14)? Propuesta: sí.
  2. Si el veterinario o la Dirección desmarcan «Dato curioso», ¿el texto se descarta (RN-02, propuesta) o se conserva sin mostrarse? Propuesta: se descarta, para no guardar texto oculto en solicitudes.
  3. Al eliminar la publicación, ¿el texto se conserva (RN-05, propuesta) o se borra? Propuesta: se conserva, como las correcciones.
  4. ¿Confirmas `fun_fact` como clave del enum y del recurso (plan 026, decisión de nombre)? Propuesta: sí.

## Cambios por área (revisiones necesarias en otras specs)

Esta spec no modifica las specs de otras apps. Cada revisión se registra en la spec de su app con una nota que apunta aquí, sin renumerar.

| Spec | Revisión necesaria | Estado |
|---|---|---|
| `apps/api/specs/014-species-requests.md` | Nota de revisión: CA-06, CA-08, CA-15, CA-18, CA-26, CA-36, CA-37 y CA-38 incluyen `fun_fact` según esta spec. | Nota añadida 2026-11-21 |
| `apps/api/specs/015-public-species-read.md` | Nota de revisión: CA-03 y CA-13 admiten `fun_fact` cuando está en `published_fields`. Sin filtro. | Nota añadida 2026-11-21 |
| `apps/pwa/specs/005-species-request-submission.md` | Casilla «Dato curioso» en «Qué mostrar» (CA-09), texto con ayuda, obligatorio y mínimo de 20 caracteres solo si está marcado (CA-02), máximo de 500 (CA-03). El orden «Qué mostrar» primero y la visibilidad de cada campo lo cubre otra revisión de `pwa-005`; esta spec solo cita esa dependencia. | Nota añadida 2026-11-21; plan y tareas de PWA pendientes |
| `apps/dashboard/specs/010-public-content-management.md` | Mostrar «Dato curioso» como dato actual y propuesto en la revisión (sección A) y en las especies publicadas (sección F); edición en solicitud `submitted` y en especie despublicada con las reglas de esta spec; no aparece en listados. | Nota añadida 2026-11-21; plan y tareas de dashboard pendientes |
| `apps/web/specs/011-dynamic-tulanpedia.md` | Mostrar «Dato curioso» solo si la API lo devuelve, como texto (CA-11); añadir la etiqueta a la lista de campos de la ficha (`apps/web/src/js/animals.js`). Ver la deriva `diet`/`feeding`. | Nota añadida 2026-11-21; plan y tareas de web pendientes |

## Revisión

- Aprobadores y fecha: Jonathan (aprobación funcional), 2026-11-21.
- Estado: Aprobada (2026-11-21). Aprobar no autoriza implementar: la implementación espera a DBR-025 en «Lista para backend» (RN-11).
- Historial: borrador del mismo día, a partir de las decisiones funcionales de Jonathan (2026-11-21) y de la lectura de `api-014`, `api-015`, `pwa-005`, `dashboard-010` y `web-011`.
- Evidencia/enlaces: `apps/api/plan/026-species-fun-fact.md`, `apps/api/tasks/026-species-fun-fact.md`, `docs/database/requests/DBR-025-species-fun-fact.md`, `apps/api/src/app/Enums/PublishedSpeciesField.php`, `apps/api/src/app/Http/Resources/Catalog/PublishedSpeciesResource.php`, `apps/api/src/app/Http/Requests/Concerns/ValidatesPublishedFields.php`, `apps/api/src/app/Actions/Admin/SpeciesPublication/AcceptSpeciesPublicationRequestAction.php`.
