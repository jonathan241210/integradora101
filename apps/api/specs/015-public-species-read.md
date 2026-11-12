# 015 · public-species-read

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: ruta pública, filtros, Action, Resource, regla de visibilidad y URL pública de la imagen); `web` (consumidor: TulanPedia, `web-011`; sin `packages/api-client`, según ADR 0028); `dashboard` (origen de la aceptación, `dashboard-010`; sin cambios en esta spec); `packages/api-client` (sin cambios).
- Estado: Borrador
- Solicitante / responsable funcional: sesión principal, solicitud del 2026-11-11 (lectura pública para `web-011`); responsable funcional: por designar.
- Responsable de BD: no aplica como DBR propia. Usa las tablas de `docs/database/requests/DBR-013-species-requests.md` (Borrador).
- Responsable backend: por designar.
- Aprobación funcional: pendiente.
- Aprobado por: (pendiente).
- Número: `015` es el siguiente libre en `apps/api/specs/` (el máximo existente es `014-species-requests.md`).

## Problema y contexto

Con `api-014`, una especie entra al catálogo público cuando la Dirección (`zoo-admin`) acepta la solicitud del veterinario. TulanPedia (`web-011`) necesita leer solo esas especies aceptadas, con su foto pública, para sustituir las fichas de muestra.

`GET /api/v1/species` ya existe en `api-006` (Aprobada), pero no sirve a este fin. Esta spec **no amplía `api-006`**: crea una ruta de lectura nueva con otra semántica.

| | `GET /api/v1/species` (`api-006`, sin cambios) | `GET /api/v1/accepted-species` (esta spec) |
|---|---|---|
| Cliente | App móvil (`mobile-003`) | Portal TulanPedia (`web-011`) |
| Qué lista | Especies que tienen datos en `animals` y `enclosures` | Especies vinculadas a una solicitud `accepted` (`species_requests.species_id`) |
| Imagen | `photo_path` del animal representativo (ruta interna) | `image_url` pública de la foto aceptada (`media/species/`) |
| Campos | Ficha compuesta (zona, dieta, longevidad, características) | Solo los campos que la solicitud aceptada marca en `published_fields` (`api-014` RN-13), más `id`, `common_name`, `category` e `image_url` |
| Filtros | Ninguno | `habitat`, `name` y `category`, opcionales |

Una ampliación de `api-006` cambiaría el contrato que consume la app móvil. Por eso la lectura del portal va en una ruta propia.

## Decisiones tomadas (2026-11-11)

- La lectura pública de especies aceptadas es una spec nueva (`api-015`). `api-006` no se modifica (decisión del usuario).
- La lista admite filtros por `habitat` y por `name` (decisión del usuario), y por `category` (decisión del usuario, 2026-11-11).
- La foto pública de una especie aceptada sale de `media/species/` (ADR 0026, enmienda del 2026-11-11).
- Ruta propuesta `GET /api/v1/accepted-species`. Se propone porque `/species/{id}` ya existe en `api-006` y responde `404` a identificadores no numéricos; `/species/accepted` chocaría con esa ruta. Pendiente de confirmar (pregunta 1).
- **Campos publicados (2026-11-11).** La respuesta trae siempre `id`, `common_name`, `category` e `image_url`, y además los campos que la solicitud marca en `published_fields` (`api-014` RN-13). Los no marcados no aparecen (CA-13). Por defecto, `scientific_name`, `origin` y `habitat`. `category` se publica siempre, con `null` si la especie no tiene valor, y no es desmarcable (**propuesta por confirmar**).
- **Filtros y campos no publicados (2026-11-11).** Un filtro no revela un campo que la especie no publica: `habitat` filtra solo entre las especies que lo publican (CA-14).

## Objetivos

- Exponer `GET /api/v1/accepted-species`, público y de solo lectura, con solo las especies que tienen una solicitud aceptada.
- Aceptar los filtros opcionales `habitat`, `name` y `category`, con validación en español.
- Entregar `image_url` pública o `null`, sin rutas internas ni datos de personal.
- Cubrir cada CA-xx con al menos un test PHPUnit contra `arca_pruebas`.

## Fuera de alcance

- Cualquier cambio en `GET /api/v1/species` o en `GET /api/v1/species/{id}` (`api-006`).
- Especies sin solicitud aceptada, incluidas las creadas desde animales (pregunta 2).
- Detalle público por especie (`GET /api/v1/accepted-species/{id}`).
- Paginación (pregunta 3).
- Búsqueda de texto libre y orden distinto de `common_name`. El filtro por `category` sí está en esta spec (CA-15, CA-16) desde el 2026-11-11.
- Tipos de animal fuera de la lista cerrada de DBR-004 (`category` admite solo sus seis valores). La captura de `category` en la solicitud está decidida (`api-014` CA-25; DBR-013 pregunta 10).
- Campos cuya fuente no está decidida (`conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics`; DBR-013 pregunta 8). Mientras tanto, no aparecen en la respuesta.
- Escrituras, caché de servidor, CDN y autenticación.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante anónimo | Ver las especies aceptadas | Ninguno; lectura pública |
| Portal institucional (`web-011`) | Leer la lista para TulanPedia | Ninguno; origen permitido por CORS |
| Personal (`zoo-admin` y otros) | Sin cambios; revisan con `api-014` | Fuera de esta spec |
| Responsable de BD | Confirmar que DBR-013 está aplicada en el ambiente | No aplica como DBR propia |

## Historias de usuario

- Como visitante, quiero ver solo las especies que el zoológico ha aceptado, con su foto, para conocerlas antes de mi visita.
- Como integrante del equipo del portal, quiero pedir solo las especies de un hábitat o cuyo nombre coincida, para mostrar resultados filtrados sin recibir todo el catálogo.

## Criterios de aceptación

- **CA-01 (solo aceptadas):** Dado un conjunto de especies que incluye una con solicitud `accepted` sin `deleted_at`, una con solicitud `submitted`, una con solicitud `rejected`, una sin solicitud y una con solicitud `accepted` borrada lógicamente, cuando se llama `GET /api/v1/accepted-species` sin sesión, entonces responde `200` con `{"data": [...]}` que contiene solo la primera.
- **CA-02 (orden y colección vacía):** Dado que hay especies visibles, cuando se llama la ruta, entonces se ordenan por `common_name` ascendente y, a igual nombre, por `id` ascendente. Dado que no hay especies visibles, entonces responde `200` con `{"data": []}`, no `404`.
- **CA-03 (campos públicos):** Dada cualquier respuesta, cuando se revisa, entonces cada elemento contiene siempre `id`, `common_name`, `category` (con `null` si la especie no tiene valor; propuesta por confirmar) e `image_url`, y además cada clave que la solicitud marca en `published_fields` (`api-014` RN-13), con `null` si está marcada y no tiene dato. Con los predeterminados de `api-014` RN-13, la respuesta trae `scientific_name`, `origin` y `habitat` salvo que se hayan desmarcado; `origin` se lee según DBR-013 pregunta 4 (opción 2a). Las claves no marcadas no aparecen. No incluye `status`, `created_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `image_path`, `species_request_id`, `published_fields` ni datos de personal.
- **CA-04 (filtro por hábitat):** Dado `?habitat=<valor>`, cuando se llama, entonces responde solo las especies visibles que publican `habitat` (CA-13) y cuyo `habitat`, normalizado según RN-05, es igual al valor normalizado (CA-14). Un valor sin coincidencias responde `200` con `{"data": []}`. Un valor vacío, solo con espacios o de más de 150 caracteres responde `422` (CA-07).
- **CA-05 (filtro por nombre):** Dado `?name=<texto>`, cuando se llama, entonces responde las especies visibles cuyo `common_name` contiene el texto, sin distinguir mayúsculas. Los caracteres `%` y `_` se tratan como texto literal. Un texto vacío, solo con espacios o de más de 150 caracteres responde `422` (CA-07).
- **CA-06 (filtros combinados y sin filtros):** Dados `habitat`, `name` y `category` a la vez, cuando se llama, entonces solo se devuelven las especies que cumplen los tres (los filtros enviados se combinan con «y»). Sin parámetros, responde la lista completa de CA-02. Un parámetro desconocido no cambia la respuesta.
- **CA-07 (validación en español):** Dado un `habitat`, un `name` o un `category` que incumpla CA-04, CA-05 o CA-16, cuando se llama, entonces responde `422` con `message` en español («El hábitat debe tener de 1 a 150 caracteres.», «El nombre debe tener de 1 a 150 caracteres.» o «Tipo de animal no válido.») y el error en `errors.habitat`, `errors.name` o `errors.category`, y no cambia ningún dato.
- **CA-08 (imagen pública):** Dada una especie visible con foto publicada en `media/species/`, cuando se consulta, entonces `image_url` es la URL pública del archivo, construida con `MEDIA_PUBLIC_URL` o, si está vacía, con `APP_URL` más `/media` (`api-013` CA-17). Si el archivo no existe o no hay ruta publicada, `image_url` es `null` y la respuesta no falla. Ninguna respuesta contiene una URL de `media/species-requests/`.
- **CA-09 (sin autenticación y solo lectura):** Dada la ruta, cuando se llama sin cookies, sin `Authorization` y sin sesión, entonces responde `200` (o `422` si los parámetros no son válidos). Ninguna petición crea, modifica ni borra filas y ninguna genera registros de Activitylog.
- **CA-10 (CORS por ambiente):** Dado un `CORS_ALLOWED_ORIGINS` que incluye `http://localhost:8080`, cuando una petición `GET` llega con `Origin: http://localhost:8080`, entonces la respuesta incluye `Access-Control-Allow-Origin` con ese origen. `http://127.0.0.1:8080` no recibe esa cabecera (mismo criterio que `api-011` CA-10).
- **CA-11 (arquitectura y ruta):** Dado el código de la API, cuando se revisa, entonces el controlador es delgado y delega en un Form Request (`habitat`, `name` y `category`), en `ListAcceptedSpeciesAction` y en `AcceptedSpeciesResource`. La regla de visibilidad está en la consulta y en la Action, no en el controlador. La ruta se declara con nombre `accepted-species.index`.
- **CA-12 (cobertura de pruebas):** Dada la suite PHPUnit contra `arca_pruebas`, cuando se ejecuta, entonces existe al menos un test que nombra cada CA-01 a CA-16, usa `DatabaseTransactions` y no usa `RefreshDatabase` ni migraciones desde los tests.

- **CA-13 (selección de campos):** Dada una especie visible cuya solicitud aceptada tiene `published_fields` con los predeterminados `scientific_name`, `origin` y `habitat` (`api-014` RN-13), cuando se llama la ruta, entonces cada elemento trae `id`, `common_name`, `category`, `image_url`, `scientific_name`, `origin` y `habitat` (con `null` si no hay dato), y no trae `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` ni `characteristics`. El valor de `origin` sale de la columna que decida DBR-013 pregunta 4 (opción 2a: `species.distribution` u `species.origin`); la clave de la respuesta es `origin` en ambos casos. Dada una especie cuya solicitud tiene `published_fields` sin `origin` (porque el veterinario o la Dirección lo desmarcó), cuando se llama, entonces no trae `origin`. Dada una especie cuya solicitud tiene `published_fields` vacío, cuando se llama, entonces trae solo `id`, `common_name`, `category` e `image_url`. Verificación: prueba PHPUnit con esas tres combinaciones.
- **CA-14 (filtros y campos no publicados):** Dada una especie cuyo `habitat` no está en sus `published_fields`, cuando se llama `?habitat=<su valor>`, entonces esa especie no aparece en la respuesta; si ninguna especie visible publica ese hábitat, responde `200` con `{"data": []}`. El filtro `name` y el filtro `category` no cambian, porque `common_name` y `category` siempre se publican. Verificación: prueba PHPUnit con un `habitat` no publicado.
- **CA-15 (filtro por tipo de animal, 2026-11-11):** Dado `?category=<valor>` con uno de los seis valores de DBR-004 (`mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`), cuando se llama, entonces responde solo las especies visibles cuyo `category` es igual al valor (RN-05). Como `category` siempre se publica (CA-03), el filtro no excluye especies por `published_fields`. Una especie visible con `category` NULL no aparece con ningún valor. Un valor válido sin coincidencias responde `200` con `{"data": []}`. Verificación: test PHPUnit `test_ca15_category_filter_returns_only_matching_species`.
- **CA-16 (validación de `category`):** Dado `?category=<valor>` que no es uno de los seis valores de DBR-004, o que está vacío o solo tiene espacios, cuando se llama, entonces responde `422` con «Tipo de animal no válido.» en `errors.category` y no cambia ningún dato. Verificación: test PHPUnit `test_ca16_invalid_category_returns_422_in_spanish`.

## Reglas de negocio

- **RN-01 (solo lectura):** La ruta es `GET`. No crea, modifica ni borra datos.
- **RN-02 (sin esquema propio):** Lee `species` y `species_requests` según DBR-013. No crea migraciones. DBR-013 debe estar aplicada en el ambiente antes de desplegar esta spec.
- **RN-03 (visibilidad):** Una especie es visible si y solo si existe una solicitud con `status = accepted`, `species_id` igual a su `id` y sin `deleted_at`. Las especies sin esa solicitud no se listan (pregunta 2). Depende de `species_requests.species_id` (decidido el 2026-11-11, DBR-013 pregunta 3).
- **RN-04 (orden):** `common_name` ascendente; `id` ascendente en empates.
- **RN-05 (normalización de filtros):** Antes de comparar se quitan los espacios al inicio y al final. La comparación no distingue mayúsculas. `habitat` exige igualdad del valor normalizado. `name` busca coincidencia parcial con `%` y `_` escapados. `category` exige igualdad con uno de los seis valores de la lista cerrada (CA-15, CA-16). Si se envían varios filtros, se combinan con «y».
- **RN-06 (campos públicos):** Solo los de CA-03 y CA-13 (selección de `api-014` RN-13), más `category`, que siempre se publica (propuesta por confirmar). `origin` se lee de la columna que decida DBR-013 pregunta 4 (opción 2a: `species.distribution` u `species.origin`); la respuesta no cambia. Un campo no publicado no se devuelve ni sirve de filtro (CA-14).
- **RN-07 (imagen pública):** `image_url` se construye solo con la ruta publicada en `species/` del disco `media` (ADR 0026, enmienda del 2026-11-11). Nunca con una ruta de `species-requests/`. La forma exacta de guardar la ruta depende de la opción 2b de DBR-013 (pendiente de BD). Toda la lectura de la ruta pasa por un único punto de la Action, que es el único que cambia con esa decisión.
- **RN-08 (sin datos de personal):** La respuesta no incluye el veterinario que envió la solicitud, el revisor, las fechas de revisión ni los motivos (`dashboard-010` CA-05; `web-011` RN-10).
- **RN-09 (errores en español):** Los mensajes visibles van en español. Identificadores, rutas y parámetros van en inglés (Constitución VI).
- **RN-10 (CORS):** El origen del portal se añade a `CORS_ALLOWED_ORIGINS` de cada ambiente (`api-011` RN-12). En desarrollo, `http://localhost:8080`.
- **RN-11 (relación con `api-006`):** `api-006` no cambia. `GET /api/v1/species` y `GET /api/v1/species/{id}` siguen para la app móvil con su contrato actual. Esta spec no los reemplaza ni los amplía.
- **RN-12 (sin paginación):** El catálogo es pequeño, igual que en `api-006` RN-07. Si crece, se abre una spec de paginación (pregunta 3).

## Datos, privacidad y auditoría

- Los datos son especies aceptadas por el zoológico y su foto pública. No hay datos personales, clínicos ni financieros.
- No hay auditoría: es una lectura pública (CA-09).
- Esta spec no añade `SoftDeletes`. Respeta el borrado lógico de `species_requests` (DBR-013).
- Requiere DBR: no por esta spec. Sí requiere que DBR-013 esté aplicada en el ambiente.

## Flujos y errores

### Flujo principal

1. `web-011` llama `GET /api/v1/accepted-species` sin parámetros y recibe la lista completa (CA-02).
2. Otro consumidor puede pedir `?habitat=...` o `?name=...` (CA-04, CA-05).
3. Si no hay especies aceptadas, la respuesta es `200` con `data: []`.

### Errores esperados

- Filtro no válido → `422` con mensaje en español (CA-07).
- Base de datos inaccesible → `500`; el portal muestra su estado de error (`web-011` CA-07).
- Origen no permitido → la respuesta llega sin `Access-Control-Allow-Origin`; el navegador bloquea la lectura.
- Imagen ausente → `image_url` es `null` (CA-08).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - DBR-013 (Borrador): `species_requests.species_id` (decidido el 2026-11-11), `published_fields` (propuesta) y la ruta de la imagen publicada (opción 2b). Bloqueante hasta que BD decida 2a y 2b.
  - `api-014` (Borrador): la aceptación crea la especie y copia la foto a `media/species/`.
  - ADR 0026 (Propuesto; enmienda del 2026-11-11 con `species/` y `species-requests/`).
  - `api-013` (Borrador): disco `media`, `MEDIA_PUBLIC_URL` y `APP_URL` más `/media`.
  - `api-011`: CORS por ambiente y formato de respuestas públicas.
  - `api-006` (Aprobada): referencia; no cambia.
  - `web-011` (consumidor) y ADR 0028 (Propuesto).
  - `dashboard-010` (origen de la aceptación).
- **Infraestructura (`infra/README.md`):** `CORS_ALLOWED_ORIGINS` con el origen del portal en cada ambiente, y el disco `media` con el enlace `public/media`. Si se aprueba, el PR anota la condición en `infra/README.md`. Esta spec no edita ese archivo.
- **Riesgos:**
  - `species_id` ya está decidido (DBR-013 pregunta 3). El bloqueo que queda es la decisión de BD sobre 2a y 2b.
  - El portal queda vacío hasta la primera aceptación (`web-011` CA-06).
  - Dos rutas de especies con nombres parecidos (`/species` para la app y `/accepted-species` para el portal). Se mitiga con la tabla de diferencias y con los nombres de ruta.
  - El filtro `name` no lo usa `web-011` en esta versión. Se mantiene en el contrato, pero queda sin consumidor hasta que se decida (pregunta 7).
  - El filtro `category` tampoco lo usa `web-011`, que filtra en memoria sobre la lista recibida (`web-011` RN-07). Queda en el contrato con el mismo criterio que `name`.
- **Preguntas pendientes** (máximo 8 por ronda):
  1. **Ruta pública.** ¿Se acepta `GET /api/v1/accepted-species` (propuesta)? `species` ya es de `api-006` y `/species/{id}` responde `404` a identificadores no numéricos. Requisito para aprobar esta spec y `web-011` CA-01.
  2. **Especies sin solicitud aceptada.** Las especies creadas desde animales no tienen solicitud. `arca_pruebas` tiene cinco. ¿Quedan fuera? Propuesta: sí, solo aceptadas, como exige `web-011` CA-02.
  3. **Paginación.** ¿Se aplica el criterio de `api-006` (sin paginación)? Propuesta: sí, mientras el catálogo sea pequeño.
  4. **Bloqueante de DBR-013.** **Resuelta, decisión del usuario 2026-11-11:** sí, `species_requests.species_id` nullable (DBR-013 pregunta 3).
  5. **Ruta de la imagen publicada.** **Pendiente: responsable de BD** (ver `docs/database/requests/DBR-013-species-requests.md`, «Decisiones para el responsable de BD», 2b). Afecta a RN-07.
  6. **Campo `origin`.** **Pendiente: responsable de BD** (ver DBR-013, «Decisiones para el responsable de BD», 2a). Afecta a RN-06.
  7. **Filtro `name` sin consumidor.** ¿Se mantiene en el contrato aunque `web-011` no lo use? Propuesta: sí, para no abrir una segunda spec.
  8. **Acentos en los filtros.** ¿Se normalizan los acentos en `habitat` y `name`? Propuesta: no en esta versión; solo se quitan espacios sobrantes y se ignoran mayúsculas.

## Revisión

- Aprobadores y fecha: pendiente. Aprobado por: (pendiente).
- Estado: Borrador. No pasa a Aprobada mientras no se respondan las preguntas 1 a 3, no decida BD las preguntas 5 y 6 (opciones 2a y 2b de DBR-013), no se apruebe DBR-013 y no se apruebe la enmienda de ADR 0026.
- Historial: borrador del 2026-11-11, a partir de la solicitud de `web-011` y de `dashboard-010` (dependencia D-1). Ampliación del mismo día: `species_id` decidido; campos publicados (CA-13, CA-14, RN-06); el filtro no revela campos no publicados. Predeterminados de la ficha (2026-11-11): origen marcado, lo que cambia CA-03 y CA-13. Ampliación del 2026-11-11 (tipo de animal): `category` en la respuesta (CA-03, CA-13, RN-06), filtro `category` (CA-15) y validación (CA-16); CA-12 cubre CA-01 a CA-16.
- Evidencia/enlaces: `apps/api/specs/006-public-catalog-read.md`, `apps/api/specs/014-species-requests.md`, `apps/api/specs/012-public-memories-read.md` (formato), `apps/api/specs/011-public-news-read.md` (CORS y validación), `apps/api/specs/013-object-storage-images.md`, `apps/web/specs/011-dynamic-tulanpedia.md`, `apps/dashboard/specs/010-public-content-management.md`, `docs/adr/0026-object-storage-s3-images.md`, `docs/adr/0028-dynamic-tulanpedia-catalog.md`, `docs/database/requests/DBR-013-species-requests.md`.
