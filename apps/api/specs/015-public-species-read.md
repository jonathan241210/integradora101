# 015 · public-species-read

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: ruta pública, filtros, Action, Resource, regla de visibilidad y URL pública de la imagen); `web` (consumidor: TulanPedia, `web-011`; sin `packages/api-client`, según ADR 0028); `dashboard` (origen de la publicación, `dashboard-010`; sin cambios en esta spec); `packages/api-client` (sin cambios).
- Estado: Aprobada (2026-11-12, Jonathan, responsable de backend). Aprobar no autoriza implementar: la implementación espera a que DBR-013 esté en «Lista para backend» (condición cumplida el 2026-11-12: migración aplicada en `arca_pruebas`, lote 5, verificada).
- Solicitante / responsable funcional: sesión principal, solicitud del 2026-11-11 (lectura pública para `web-011`); responsable funcional: por designar.
- Responsable de BD: no aplica como DBR propia. Usa las columnas de `species` de `docs/database/requests/DBR-013-species-requests.md`, aprobada por BD y backend el 2026-11-12 (migración aplicada en `arca_pruebas`, lote 5, verificada el 2026-11-12; estado «Lista para backend»).
- Responsable backend: Jonathan (aprobación de backend de DBR-013, 2026-11-12).
- Aprobación funcional: Jonathan (responsable de backend), 2026-11-12.
- Aprobado por: Jonathan (responsable de backend), 2026-11-12.
- Número: `015` es el siguiente libre en `apps/api/specs/` (el máximo existente es `014-species-requests.md`).

## Historial del cambio de modelo (2026-11-11)

- **Versión anterior:** la lectura pública leía las especies con una solicitud `accepted` (`species_requests.species_id`), y la ruta era `GET /api/v1/accepted-species`.
- **Modelo actual:** la especie ya existe en `species` antes de cualquier solicitud. Una especie es visible si y solo si `species.is_published = 1` (publicada con `api-014`). La lectura pública **ya no depende de la tabla de solicitudes**; lee solo `species`, con su `image_path` y su `published_fields`.
- **Ruta:** `GET /api/v1/published-species` (antes `accepted-species`), con nombre de ruta `published-species.index`.
- **Preguntas:** la 2 (especies sin solicitud) y la 4 (bloqueo por `species_id`) quedan resueltas por el nuevo modelo. Los CA-01 a CA-16 conservan su número; cambia su contenido donde corresponde.
- **2026-11-11 (aceptado por el usuario):** ruta `published-species`, sin paginación, filtro `name` sin consumidor y sin normalizar acentos (preguntas 1, 3, 7 y 8 resueltas). `category` se publica siempre (decidido).
- **2026-11-12 (tercera ronda):** CA-01 incluye una especie despublicada y una con publicación eliminada. Nuevos CA-17 (actualización pendiente: la versión publicada sigue) y CA-18 (despublicar, republicar y eliminar: sale y vuelve de inmediato; **una despublicada no aparece aunque tenga una solicitud `update` viva**, decisión del usuario 2026-11-12). CA-12 cubre CA-01 a CA-18.

## Problema y contexto

Con `api-014`, una especie se publica cuando la Dirección (`zoo-admin`) acepta la solicitud de publicación del veterinario. TulanPedia (`web-011`) necesita leer solo esas especies publicadas, con su foto pública, para sustituir las fichas de muestra.

`GET /api/v1/species` ya existe en `api-006` (Aprobada), pero no sirve a este fin. Esta spec **no amplía `api-006`**: crea una ruta de lectura nueva con otra semántica.

| | `GET /api/v1/species` (`api-006`, sin cambios) | `GET /api/v1/published-species` (esta spec) |
|---|---|---|
| Cliente | App móvil (`mobile-003`) | Portal TulanPedia (`web-011`) |
| Qué lista | Especies que tienen datos en `animals` y `enclosures` | Especies con `species.is_published = 1` (publicadas por `api-014`) |
| Imagen | `photo_path` del animal representativo (ruta interna) | `image_url` pública de `species.image_path` (`media/species/`) |
| Campos | Ficha compuesta (zona, dieta, longevidad, características) | Solo los campos de `species.published_fields` (`api-014` RN-13), más `id`, `common_name`, `category` e `image_url` |
| Filtros | Ninguno | `habitat`, `name` y `category`, opcionales |

Una ampliación de `api-006` cambiaría el contrato que consume la app móvil. Por eso la lectura del portal va en una ruta propia.

## Decisiones tomadas (2026-11-11)

- La lectura pública de especies publicadas es una spec nueva (`api-015`). `api-006` no se modifica (decisión del usuario).
- La visibilidad es `species.is_published = 1`. Solo las especies publicadas aparecen; las especies creadas desde animales sin publicar **no** aparecen (decisión de esta versión del modelo).
- La lista admite filtros por `habitat` y `name` (decisión del usuario), y por `category` (decisión del usuario, 2026-11-11).
- La foto pública sale de `media/species/` (ADR 0026, enmienda del 2026-11-11). La columna es `species.image_path` (DBR-013, 2b, aprobada por BD el 2026-11-12).
- Ruta `GET /api/v1/published-species`. Se propone porque `/species/{id}` ya existe en `api-006` y responde `404` a identificadores no numéricos, y porque el nombre `accepted-species` describe el proceso y no el estado de la especie. Resuelta, decisión del usuario 2026-11-11 (pregunta 1).
- **Campos publicados (2026-11-11).** La respuesta trae siempre `id`, `common_name`, `category` e `image_url`, y además las claves que la especie tiene en `published_fields` (`api-014` RN-13). Por defecto, `scientific_name`, `origin` y `habitat`. `category` se publica siempre, con `null` si la especie no tiene valor, y no es desmarcable (decidido 2026-11-11).
- **Filtros y campos no publicados (2026-11-11).** Un filtro no revela un campo que la especie no publica: `habitat` filtra solo entre las especies que lo publican (CA-14).

## Objetivos

- Exponer `GET /api/v1/published-species`, público y de solo lectura, con solo las especies con `is_published = 1`.
- Aceptar los filtros opcionales `habitat`, `name` y `category`, con validación en español.
- Entregar `image_url` pública o `null`, sin rutas internas ni datos de personal.
- Cubrir cada CA-xx con al menos un test PHPUnit contra `arca_pruebas`.

## Fuera de alcance

- Cualquier cambio en `GET /api/v1/species` o en `GET /api/v1/species/{id}` (`api-006`).
- Especies no publicadas, incluidas las creadas desde animales (pregunta 2, resuelta).
- Detalle público por especie (`GET /api/v1/published-species/{id}`).
- Paginación (pregunta 3).
- Búsqueda de texto libre y orden distinto de `common_name`. El filtro por `category` sí está en esta spec (CA-15, CA-16).
- Tipos de animal fuera de la lista cerrada de DBR-004 (`category` admite solo sus seis valores).
- Campos extra, no por ahora (decisión del usuario 2026-11-12; `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics`; DBR-013 pregunta 8). No aparecen en la respuesta.
- Escrituras, caché de servidor, CDN y autenticación.
- Despublicar, republicar y eliminar la publicación: acciones de `api-014` CA-35 a CA-38. Esta spec solo las recoge en CA-18.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante anónimo | Ver las especies publicadas | Ninguno; lectura pública |
| Portal institucional (`web-011`) | Leer la lista para TulanPedia | Ninguno; origen permitido por CORS |
| Personal (`zoo-admin` y otros) | Sin cambios; publican con `api-014` | Fuera de esta spec |
| Responsable de BD | Confirmar que DBR-013 está aplicada en el ambiente | No aplica como DBR propia |

## Historias de usuario

- Como visitante, quiero ver solo las especies que el zoológico ha publicado, con su foto, para conocerlas antes de mi visita.
- Como integrante del equipo del portal, quiero pedir solo las especies de un hábitat o cuyo nombre coincida, para mostrar resultados filtrados sin recibir todo el catálogo.

## Criterios de aceptación

- **CA-01 (solo publicadas):** Dado un conjunto de especies que incluye una con `is_published = 1`, una con solicitud `submitted` y `is_published = 0`, una con solicitud `rejected` y `is_published = 0`, una sin solicitud y `is_published = 0`, una despublicada (`is_published = 0`, `unpublished_at` no nulo, datos publicados previos) con una solicitud `update` viva, y una con la publicación eliminada (`is_published = 0`, sin foto ni datos publicados), cuando se llama `GET /api/v1/published-species` sin sesión, entonces responde `200` con `{"data": [...]}` que contiene solo la primera. Una especie publicada con `species.deleted_at` no nulo tampoco aparece (RN-03; DBR-013, decisión 13), y ese escenario forma parte de la prueba.
  - Verificación: `test_ca01_only_published_species_are_listed`.

- **CA-02 (orden y colección vacía):** Dado que hay especies visibles, cuando se llama la ruta, entonces se ordenan por `common_name` ascendente y, a igual nombre, por `id` ascendente. Dado que no hay especies visibles, entonces responde `200` con `{"data": []}`, no `404`.
  - Verificación: `test_ca02_orders_by_common_name_and_returns_empty_list`.

- **CA-03 (campos públicos):** Dada cualquier respuesta, cuando se revisa, entonces cada elemento contiene siempre `id`, `common_name`, `category` (con `null` si la especie no tiene valor; decidido 2026-11-11) e `image_url`, y además cada clave que la especie tiene en `published_fields` (`api-014` RN-13), con `null` si está marcada y no tiene dato. Con los predeterminados de `api-014` RN-13, la respuesta trae `scientific_name`, `origin` y `habitat` salvo que se hayan desmarcado; `origin` se lee de `species.distribution` (DBR-013 2a=A; no existe `species.origin`). Las claves no marcadas no aparecen. No incluye `is_published`, `published_at`, `published_fields`, `image_path`, `created_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `species_request_id` ni datos de personal.
  - Verificación: `test_ca03_public_fields_only`.

- **CA-04 (filtro por hábitat):** Dado `?habitat=<valor>`, cuando se llama, entonces responde solo las especies visibles que publican `habitat` (CA-13) y cuyo `habitat`, normalizado según RN-05, es igual al valor normalizado. Un valor sin coincidencias responde `200` con `{"data": []}`. Un valor vacío, solo con espacios o de más de 150 caracteres responde `422` (CA-07).
  - Verificación: `test_ca04_habitat_filter_matches_normalized_value`.

- **CA-05 (filtro por nombre):** Dado `?name=<texto>`, cuando se llama, entonces responde las especies visibles cuyo `common_name` contiene el texto, sin distinguir mayúsculas. Los caracteres `%` y `_` se tratan como texto literal. Un texto vacío, solo con espacios o de más de 150 caracteres responde `422` (CA-07).
  - Verificación: `test_ca05_name_filter_is_literal_and_case_insensitive`.

- **CA-06 (filtros combinados y sin filtros):** Dados `habitat`, `name` y `category` a la vez, cuando se llama, entonces solo se devuelven las especies que cumplen los tres (los filtros enviados se combinan con «y»). Sin parámetros, responde la lista completa de CA-02. Un parámetro desconocido no cambia la respuesta.
  - Verificación: `test_ca06_filters_combine_with_and`.

- **CA-07 (validación en español):** Dado un `habitat`, un `name` o un `category` que incumpla CA-04, CA-05 o CA-16, cuando se llama, entonces responde `422` con `message` en español («El hábitat debe tener de 1 a 150 caracteres.», «El nombre debe tener de 1 a 150 caracteres.» o «Tipo de animal no válido.») y el error en `errors.habitat`, `errors.name` o `errors.category`, y no cambia ningún dato.
  - Verificación: `test_ca07_invalid_filters_return_422_in_spanish`.

- **CA-08 (imagen pública):** Dada una especie visible con `species.image_path` apuntando a `media/species/`, cuando se consulta, entonces `image_url` es la URL pública del archivo, construida con `MEDIA_PUBLIC_URL` o, si está vacía, con `APP_URL` más `/media` (`api-013` CA-17). Si el archivo no existe o `image_path` es NULL, `image_url` es `null` y la respuesta no falla. Ninguna respuesta contiene una URL de `media/species-requests/`.
  - Verificación: `test_ca08_image_url_only_from_species_folder`.

- **CA-09 (sin autenticación y solo lectura):** Dada la ruta, cuando se llama sin cookies, sin `Authorization` y sin sesión, entonces responde `200` (o `422` si los parámetros no son válidos). Ninguna petición crea, modifica ni borra filas y ninguna genera registros de Activitylog.
  - Verificación: `test_ca09_read_only_without_session_and_without_activitylog`.

- **CA-10 (CORS por ambiente):** Dado un `CORS_ALLOWED_ORIGINS` que incluye `http://localhost:8080`, cuando una petición `GET` llega con `Origin: http://localhost:8080`, entonces la respuesta incluye `Access-Control-Allow-Origin` con ese origen. `http://127.0.0.1:8080` no recibe esa cabecera (mismo criterio que `api-011` CA-10).
  - Verificación: `test_ca10_cors_allows_only_configured_origin`.

- **CA-11 (arquitectura y ruta):** Dado el código de la API, cuando se revisa, entonces el controlador es delgado y delega en un Form Request (`habitat`, `name` y `category`), en `ListPublishedSpeciesAction` y en `PublishedSpeciesResource`. La regla de visibilidad (`is_published = 1`) está en la consulta y en la Action, no en el controlador. La ruta se declara con nombre `published-species.index`.
  - Verificación: revisión de código y `test_ca11_route_name_and_thin_controller` (comprueba el nombre de la ruta).

- **CA-12 (cobertura de pruebas):** Dada la suite PHPUnit contra `arca_pruebas`, cuando se ejecuta, entonces existe al menos un test que nombra cada CA-01 a CA-18, usa `DatabaseTransactions` y no usa `RefreshDatabase` ni migraciones desde los tests.

- **CA-13 (selección de campos):** Dada una especie visible cuyo `published_fields` tiene los predeterminados `scientific_name`, `origin` y `habitat` (`api-014` RN-13), cuando se llama la ruta, entonces cada elemento trae `id`, `common_name`, `category`, `image_url`, `scientific_name`, `origin` y `habitat` (con `null` si no hay dato), y no trae `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` ni `characteristics`. El valor de `origin` sale de `species.distribution` (DBR-013 2a=A); la clave de la respuesta es `origin`. Dada una especie cuyo `published_fields` no incluye `origin`, cuando se llama, entonces no trae `origin`. Dada una especie cuyo `published_fields` es vacío, cuando se llama, entonces trae solo `id`, `common_name`, `category` e `image_url`. Verificación: prueba PHPUnit con esas tres combinaciones.
  - Verificación: `test_ca13_published_fields_select_response_keys`.

- **CA-14 (filtros y campos no publicados):** Dada una especie cuyo `habitat` no está en sus `published_fields`, cuando se llama `?habitat=<su valor>`, entonces esa especie no aparece en la respuesta; si ninguna especie visible publica ese hábitat, responde `200` con `{"data": []}`. El filtro `name` y el filtro `category` no cambian, porque `common_name` y `category` siempre se publican.
  - Verificación: `test_ca14_habitat_filter_ignores_unpublished_habitat`.

- **CA-15 (filtro por tipo de animal):** Dado `?category=<valor>` con uno de los seis valores de DBR-004 (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`), cuando se llama, entonces responde solo las especies visibles cuyo `category` es igual al valor (RN-05). Como `category` siempre se publica (CA-03), el filtro no excluye especies por `published_fields`. Una especie visible con `category` NULL no aparece con ningún valor. Un valor válido sin coincidencias responde `200` con `{"data": []}`.
  - Verificación: `test_ca15_category_filter_returns_only_matching_species`.

- **CA-16 (validación de `category`):** Dado `?category=<valor>` que no es uno de los seis valores de DBR-004, o que está vacío o solo tiene espacios, cuando se llama, entonces responde `422` con «Tipo de animal no válido.» en `errors.category` y no cambia ningún dato.
  - Verificación: `test_ca16_invalid_category_returns_422_in_spanish`.

- **CA-17 (actualización pendiente; decisión del usuario 2026-11-12):** Dada una especie publicada (`is_published = 1`) con una solicitud `update` en `submitted` (`api-014` CA-32), cuando se llama `GET /api/v1/published-species`, entonces la especie aparece con los datos y la foto publicados antes de la solicitud: ningún campo cambia hasta que `api-014` CA-08 acepta la actualización. Verificación: `test_ca17_pending_update_keeps_published_version`.

- **CA-18 (despublicar, republicar y eliminar; decisión del usuario 2026-11-12):** Dada una especie, cuando la Dirección la despublica (`api-014` CA-35), entonces `GET /api/v1/published-species` deja de devolverla de inmediato, aunque tenga una solicitud `update` viva (`api-014` CA-32). Cuando la republica (`api-014` CA-36), vuelve a aparecer con su foto y sus datos guardados. Cuando se elimina su publicación (`api-014` CA-38), no aparece, y `image_url` y los campos publicados ya no existen. Una especie `unpublished` sale de la lista aunque conserve `image_path` y `published_fields`. Verificación: `test_ca18_unpublished_or_deleted_species_are_hidden_even_with_live_request`.

## Reglas de negocio

- **RN-01 (solo lectura):** La ruta es `GET`. No crea, modifica ni borra datos.
- **RN-02 (sin esquema propio):** Lee solo `species`, con las columnas de DBR-013 (`is_published`, `published_fields`, `image_path`, `deleted_at`) y `distribution` para `origin`. No lee `species_publication_requests`. No crea migraciones. DBR-013 debe estar aplicada en el ambiente antes de desplegar esta spec.
- **RN-03 (visibilidad):** Una especie es visible si y solo si `species.is_published = 1`. Las especies no publicadas no se listan, con independencia de que tengan solicitudes, animales o `category` (pregunta 2, resuelta). Las filas con `species.deleted_at` no nulo tampoco se listan (DBR-013, decisión 13; `api-014` RN-22).
- **RN-04 (orden):** `common_name` ascendente; `id` ascendente en empates.
- **RN-05 (normalización de filtros):** Antes de comparar se quitan los espacios al inicio y al final. La comparación no distingue mayúsculas. `habitat` exige igualdad del valor normalizado. `name` busca coincidencia parcial con `%` y `_` escapados. `category` exige igualdad con uno de los seis valores de la lista cerrada (CA-15, CA-16). Si se envían varios filtros, se combinan con «y».
- **RN-06 (campos públicos):** Solo los de CA-03 y CA-13 (selección de `api-014` RN-13 guardada en `species.published_fields`), más `category`, que siempre se publica (decidido 2026-11-11). `origin` se lee de `species.distribution` (DBR-013 2a=A); la respuesta sigue llamándose `origin`. `api-006` expone esa misma columna como `distribution` (ver Riesgos). Un campo no publicado no se devuelve ni sirve de filtro (CA-14).
- **RN-07 (imagen pública):** `image_url` se construye solo con `species.image_path`, que apunta a `media/species/` (ADR 0026, enmienda del 2026-11-11). Nunca con una ruta de `species-requests/`. La decisión 2b de DBR-013 (columna `species.image_path`) está aprobada por BD; toda la lectura de la ruta pasa por un único punto de la Action.
- **RN-08 (sin datos de personal):** La respuesta no incluye el veterinario que envió la solicitud, el revisor, las fechas de revisión ni los motivos (`dashboard-010` CA-05; `web-011` RN-10).
- **RN-09 (errores en español):** Los mensajes visibles van en español. Identificadores, rutas y parámetros van en inglés (Constitución VI).
- **RN-10 (CORS):** El origen del portal se añade a `CORS_ALLOWED_ORIGINS` de cada ambiente (`api-011` RN-12). En desarrollo, `http://localhost:8080`.
- **RN-11 (relación con `api-006`):** `api-006` no cambia. `GET /api/v1/species` y `GET /api/v1/species/{id}` siguen para la app móvil con su contrato actual. Esta spec no los reemplaza ni los amplía. Mobile no recibe la publicación de especies ni pantallas nuevas. Lo único compartido es la tabla `species`: las correcciones publicadas cambian datos que `api-006` ya lee (ver «Riesgos»). `visitor_memories.is_published` (momentos, `mobile-010`) es de otra tabla y no tiene relación con `species.is_published`.
- **RN-12 (sin paginación):** El catálogo es pequeño, igual que en `api-006` RN-07. Si crece, se abre una spec de paginación (pregunta 3).

## Datos, privacidad y auditoría

- Los datos son especies publicadas por el zoológico y su foto pública. No hay datos personales, clínicos ni financieros.
- No hay auditoría: es una lectura pública (CA-09).
- Esta spec no añade `SoftDeletes` a ninguna tabla. `species` ya tiene `deleted_at` (DBR-013, decisión 13), y RN-03 lo aplica.
- Requiere DBR: no por esta spec. Sí requiere que DBR-013 esté aplicada en el ambiente.

## Flujos y errores

### Flujo principal

1. `web-011` llama `GET /api/v1/published-species` sin parámetros y recibe la lista completa (CA-02).
2. Otro consumidor puede pedir `?habitat=...`, `?name=...` o `?category=...` (CA-04, CA-05, CA-15).
3. Si no hay especies publicadas, la respuesta es `200` con `data: []`.

### Errores esperados

- Filtro no válido → `422` con mensaje en español (CA-07, CA-16).
- Base de datos inaccesible → `500`; el portal muestra su estado de error (`web-011` CA-07).
- Origen no permitido → la respuesta llega sin `Access-Control-Allow-Origin`; el navegador bloquea la lectura.
- Imagen ausente → `image_url` es `null` (CA-08).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - DBR-013 (aprobada por BD y backend el 2026-11-12; aplicada en `arca_pruebas`, lote 5, verificada el 2026-11-12; «Lista para backend»): `species.is_published`, `species.published_at`, `species.published_fields`, `species.image_path`, `species.deleted_at` y `species.distribution` (2a=A). Su condición de «Lista para backend» se cumple desde el 2026-11-12; no bloqueó la aprobación de esta spec. Queda pendiente el EXPLAIN de RN-03 (no ejecutado).
  - `api-014` (Aprobada 2026-11-12): la publicación actualiza `species` y copia la foto a `media/species/`.
  - ADR 0026 (Aceptado 2026-11-12; enmienda del 2026-11-11 con `species/` y `species-requests/`).
  - `api-013` (Borrador): disco `media`, `MEDIA_PUBLIC_URL` y `APP_URL` más `/media`.
  - `api-011`: CORS por ambiente y formato de respuestas públicas.
  - `api-006` (Aprobada): referencia; no cambia.
  - `web-011` (consumidor, Aprobada 2026-11-12) y ADR 0028 (Aceptado 2026-11-12).
  - `dashboard-010` (origen de la publicación).
- **Infraestructura (`infra/README.md`):** `CORS_ALLOWED_ORIGINS` con el origen del portal en cada ambiente, y el disco `media` con el enlace `public/media`. Si se aprueba, el PR anota la condición en `infra/README.md`. Esta spec no edita ese archivo.
- **Riesgos:**
  - **Publicar cambia la fila compartida.** Las correcciones de `api-014` cambian `scientific_name`, `habitat`, `distribution` (donde se guarda `origin`, DBR-013 2a=A) y `category` de `species`. `api-006` lee `species` para la app móvil y ya expone `distribution`, `conservation_status`, `size_cm` y `gestation_period`. Efecto: los datos publicados también llegan a `GET /api/v1/species` para especies con animales. Aviso informativo al equipo de `mobile`, sin cambios en sus specs ni código. Una `category` asignada hace que la especie cuente en `category_species_count` (misiones de `mobile-005`).
  - El portal queda vacío hasta la primera publicación (`web-011` CA-06).
  - Dos rutas de especies con nombres parecidos (`/species` para la app y `/published-species` para el portal). Se mitiga con la tabla de diferencias y con los nombres de ruta. Además, `origin` (portal) y `distribution` (app) son el mismo dato con dos nombres de clave; sin cambio de contrato.
  - El filtro `name` no lo usa `web-011` en esta versión. Se mantiene en el contrato, pero queda sin consumidor hasta que se decida (pregunta 7).
  - El filtro `category` tampoco lo usa `web-011`, que filtra en memoria sobre la lista recibida (`web-011` RN-07). Queda en el contrato con el mismo criterio que `name`.
  - Modelo `Species` sin `SoftDeletes` hoy (DBR-013 decisión 13 añade `deleted_at`): hasta que backend alinee el modelo, la consulta debe excluir `deleted_at` de forma explícita (RN-03).
- **Preguntas pendientes** (máximo 8 por ronda; las abiertas de esta lista son las que no tienen resolución):
  1. **Ruta pública.** **Resuelta, decisión del usuario 2026-11-11:** `GET /api/v1/published-species` (sustituye a `accepted-species`).
  2. **Especies sin publicar.** **Resuelta, decisión del modelo (2026-11-11):** solo aparecen las especies con `is_published = 1`. Las creadas desde animales quedan fuera hasta que se publiquen.
  3. **Paginación.** **Resuelta, decisión del usuario 2026-11-11:** sin paginación, mientras el catálogo sea pequeño (criterio de `api-006`).
  4. **Bloqueante de DBR-013.** **Resuelta, decisión del modelo (2026-11-11):** la visibilidad depende de `species.is_published` y no de `species_id` de una solicitud. La aprobación de backend se dio el 2026-11-12; la migración quedó aplicada en `arca_pruebas` el 2026-11-12 (lote 5, verificada; DBR-013).
  5. **Ruta de la imagen publicada.** **Resuelta, BD aprobó 2b el 2026-11-12:** `species.image_path` (DBR-013). Afecta a RN-07.
  6. **Campo `origin`.** **Resuelta, BD (2026-11-12, 2a=A):** `origin` se lee de `species.distribution`. La API pública expone la clave `origin`, como indica DBR-013 para `api-015` RN-06 («la respuesta sigue llamándose origin»; RN-06, CA-03, CA-13). La etiqueta de la Dirección y del veterinario es «Área de distribución natural» (`api-014`, `pwa-005`, `dashboard-010`). La ficha pública de `web-011` usa la misma etiqueta (pregunta 9 de `web-011`, resuelta el 2026-11-12, válida para pruebas).
  7. **Filtro `name` sin consumidor.** **Resuelta, decisión del usuario 2026-11-11:** se mantiene en el contrato aunque `web-011` no lo use.
  8. **Acentos en los filtros.** **Resuelta, decisión del usuario 2026-11-11:** no se normalizan acentos; solo se quitan espacios sobrantes y se ignoran mayúsculas.
  9. **Despublicadas y app móvil.** **Resuelta, decisión del usuario 2026-11-12: no aplica a mobile, la publicación solo afecta al portal.** Mobile no tiene esta función; `api-006` no filtra por `is_published` y se mantiene así a propósito. El portal sí respeta `is_published` (CA-18).

## Revisión

- Aprobadores y fecha: Jonathan (responsable de backend), 2026-11-12. Aprobado por: Jonathan (responsable de backend), 2026-11-12.
- Estado: Aprobada (2026-11-12). Aprobar no autoriza implementar: la condición de DBR-013 («Lista para backend») se cumple desde el 2026-11-12 (migración aplicada en `arca_pruebas`, lote 5). La enmienda del ADR 0026 está aceptada desde el 2026-11-12. Las preguntas 1 a 8 están resueltas (2026-11-11 y 2026-11-12).
- Historial: borrador del 2026-11-11, a partir de la solicitud de `web-011` y de `dashboard-010`. Ampliaciones del mismo día: `species_id`, campos publicados, filtro que no revela campos no publicados, predeterminados de la ficha, filtro por `category` (CA-15, CA-16). **2026-11-11, cambio de modelo (este documento):** la lectura pública deja de depender de `species_requests.species_id` y lee `species` con `is_published = 1` (RN-02, RN-03); la ruta pasa de `accepted-species` a `published-species` (pregunta 1); `image_url` sale de `species.image_path` (RN-07); los campos salen de `species.published_fields` (CA-03, CA-13, RN-06); la pregunta 2 y la 4 quedan resueltas; CA-01 cambia su escenario; CA-08 cambia su fuente; RN-11 anota el efecto en `api-006`. **2026-11-12 (alineación con DBR-013 aprobada por BD):** `origin` se lee de `species.distribution` (2a=A) y la clave pública sigue siendo `origin` (RN-06, CA-03, CA-13, pregunta 6); `species.deleted_at` se excluye en RN-03 y CA-01; `image_path` aprobada (2b, pregunta 5); estados de DBR-013 en Dependencias y Revisión. Sin cambio de CA ni de rutas. **2026-11-12 (aprobación de backend, Jonathan):** spec Aprobada; ADR 0026 y 0028 Aceptados; DBR-013 Aprobada por BD y backend, con la migración pendiente de aplicar. **2026-11-12, verificación:** migración aplicada en `arca_pruebas` (lote 5; consulta de solo lectura de backend); DBR-013 pasa a «Lista para backend».
- Evidencia/enlaces: `apps/api/specs/006-public-catalog-read.md`, `apps/api/specs/014-species-requests.md`, `apps/api/specs/012-public-memories-read.md` (formato), `apps/api/specs/011-public-news-read.md` (CORS y validación), `apps/api/specs/013-object-storage-images.md`, `apps/web/specs/011-dynamic-tulanpedia.md`, `apps/dashboard/specs/010-public-content-management.md`, `docs/adr/0026-object-storage-s3-images.md`, `docs/adr/0028-dynamic-tulanpedia-catalog.md`, `docs/database/requests/DBR-013-species-requests.md`.
