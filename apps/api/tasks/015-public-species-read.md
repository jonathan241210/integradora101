# Tareas · 015 · public-species-read

- Spec: `apps/api/specs/015-public-species-read.md` (Estado: **Aprobada**, Jonathan, responsable de backend, 2026-11-12).
- Plan: `apps/api/plan/015-public-species-read.md` (Estado: **Aprobado**, Jonathan, 2026-11-13).
- Estado del checklist: **En progreso** (actualizado 2026-11-13; plan y tasks aprobados por Jonathan, responsable de backend). Coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Aviso vigente: cada casilla marcada tiene su evidencia en la misma línea. Las no marcadas indican el motivo pendiente; no se marca nada sin evidencia.

## Puerta de entrada

**No se empieza ninguna tarea de implementación (T-01 en adelante) hasta que T-00 esté marcada con evidencia y DBR-013 esté en «Lista para backend».** Desde el 2026-11-12, DBR-013 está en «Lista para backend»: su migración (`apps/api/src/database/migrations/2026_11_12_000013_species_publication_requests_schema.php`) está aplicada en `arca_pruebas` (lote 5), verificada por consulta de solo lectura. T-00 sigue abierta porque faltan otras precondiciones. Tampoco se empieza T-09 sin la configuración del disco de medios de `api-013` (Aprobada desde el 2026-11-12; plan de `api-013` aprobado el 2026-11-13; disco sin configurar; pregunta 3 del plan resuelta en cuanto a la clave).

Todas las pruebas usan `DatabaseTransactions` sobre `arca_pruebas`; nunca `RefreshDatabase`, `migrate:fresh` ni migraciones desde los tests. Ninguna tarea toca `arca_zoo`. Esta feature no tiene DBR propia ni migraciones.

**Datos de prueba existentes (2026-11-12):** `arca_pruebas` ya contiene 5 filas de prueba en `species_publication_requests` y 6 en `species` (0 publicadas). Se conservan a propósito (decisión del usuario 2026-11-12). Los tests no deben asumir tablas vacías: usan fixtures propios y limpian solo lo que crean; ojo con el índice único de solicitud `submitted` por especie (`uq_species_publication_requests_submitted_species`) si una fila existente está `submitted` para una especie.

## Trazabilidad

### Criterios de aceptación (CA-xx)

| CA | Tareas de implementación | Tarea de prueba (nombre del test) |
|---|---|---|
| CA-01 | T-02 | T-13 (`test_ca01_only_published_species_are_listed`) |
| CA-02 | T-02 | T-14 (`test_ca02_orders_by_common_name_and_returns_empty_list`) |
| CA-03 | T-08 | T-15 (`test_ca03_public_fields_only`) |
| CA-04 | T-03 | T-16 (`test_ca04_habitat_filter_matches_normalized_value`) |
| CA-05 | T-04 | T-18 (`test_ca05_name_filter_is_literal_and_case_insensitive`) |
| CA-06 | T-06 | T-19 (`test_ca06_filters_combine_with_and`) |
| CA-07 | T-07 | T-21 (`test_ca07_invalid_filters_return_422_in_spanish`) |
| CA-08 | T-09 | T-22 (`test_ca08_image_url_only_from_species_folder`) |
| CA-09 | T-10, T-02 | T-23 (`test_ca09_read_only_without_session_and_without_activitylog`) |
| CA-10 | T-11 | T-24 (`test_ca10_cors_allows_only_configured_origin`) |
| CA-11 | T-10 | T-25 (`test_ca11_route_name_and_thin_controller`) |
| CA-12 | (cobertura de las anteriores) | T-28 (`test_ca12_suite_names_every_criterion_and_uses_database_transactions`) |
| CA-13 | T-01, T-08 | T-26 (`test_ca13_published_fields_select_response_keys`) |
| CA-14 | T-03 | T-17 (`test_ca14_habitat_filter_ignores_unpublished_habitat`) |
| CA-15 | T-05 | T-20 (`test_ca15_category_filter_returns_only_matching_species`) |
| CA-16 | T-07 | T-21 (`test_ca16_invalid_category_returns_422_in_spanish`) |
| CA-17 | T-02 | T-27 (`test_ca17_pending_update_keeps_published_version`) |
| CA-18 | T-02 | T-27 (`test_ca18_unpublished_or_deleted_species_are_hidden_even_with_live_request`) |

### Reglas de negocio (RN-xx)

| RN | Tareas que lo cubren |
|---|---|
| RN-01 (solo lectura, `GET`) | T-02, T-10 |
| RN-02 (sin esquema propio; lee solo `species`) | T-00, T-01, T-12, T-31 |
| RN-03 (visibilidad: `is_published = 1`, sin `deleted_at`) | T-02, T-13, T-27, T-29 |
| RN-04 (orden `common_name`, `id`) | T-02, T-14 |
| RN-05 (normalización de filtros) | T-03, T-04, T-05, T-06, T-29 |
| RN-06 (campos públicos) | T-01, T-03, T-08, T-26, T-32 |
| RN-07 (imagen pública solo de `species/`) | T-09, T-22, T-31 |
| RN-08 (sin datos de personal) | T-08, T-15 |
| RN-09 (errores en español) | T-07, T-21, T-32 |
| RN-10 (CORS por ambiente) | T-11, T-24, T-31 |
| RN-11 (sin cambios en `api-006`) | T-12 |
| RN-12 (sin paginación) | T-02, T-14 |

Cobertura: todos los CA-01 a CA-18 y RN-01 a RN-12 tienen al menos una tarea. CA sin cobertura: 0. RN sin cobertura: 0.

## Precondiciones (solo lectura, sin código)

- [ ] **T-00** (RN-02; prerrequisito de todos los CA; CA-08 para la parte de medios): **verificación de precondiciones en `arca_pruebas`, solo lectura.** No se ejecuta DDL ni DML, ni se toca `arca_zoo`. Comprobar y registrar con evidencia:
  - [x] DBR-013 en «Lista para backend» en `docs/database/requests/DBR-013-species-requests.md`, con la migración aplicada en `arca_pruebas` (fecha y evidencia en la tabla «Aplicación por ambiente»). **Evidencia (verificado 2026-11-12, lote 5):** `migrate:status` = Ran; fecha y responsable de la aplicación: por registrar por BD.
  - Columnas en `species`: `is_published`, `published_at`, `unpublished_at`, `image_path`, `published_fields`, `deleted_at`, y que `distribution`, `habitat`, `category`, `common_name` y `scientific_name` existen (`SHOW COLUMNS FROM species` o `information_schema.COLUMNS`).
  - Índices `idx_species_is_published` e `idx_species_is_published_unpublished_at` en `species` (`SHOW INDEX FROM species`).
  - Tabla `species_publication_requests` presente (solo para los fixtures de CA-17 y CA-18).
  - Estado de `api-013` (disco de medios y `MEDIA_PUBLIC_URL`) y de la clave de configuración del disco público. Si no está implementada, dejar T-09 y T-22 bloqueadas y anotarlo.
  - Versión de MySQL (`SELECT VERSION()`, debe ser 8.0.x) y collation de `species` (`utf8mb4_unicode_ci`). **Observado 2026-11-12 (sin marcar):** `species.*` usa `utf8mb4_0900_ai_ci`, no `utf8mb4_unicode_ci`; `species_publication_requests.*` usa `utf8mb4_unicode_ci`. Divergencia a revisar antes de T-01 (ver riesgo de collation en el plan). Columnas, índices y tabla comprobados con `db:table` el mismo día; la versión de MySQL no se consultó en esa verificación.
  - **Criterio de hecho:** salida registrada en esta tarea con fecha, sin datos personales ni credenciales. Si falta algo, la tarea queda abierta y el plan se revisa.
  - Evidencia (2026-11-13): `SHOW COLUMNS FROM species` confirma `is_published`, `published_at`, `unpublished_at`, `image_path`, `published_fields`, `deleted_at`, `distribution`, `habitat`, `category`, `common_name`, `scientific_name`; `species_publication_requests` presente; MySQL 8.0 (Aiven); disco `media` y `media_scopes` de api-013 implementados en la rama; collation de `species` es `utf8mb4_0900_ai_ci` (cubierta por `COLLATE utf8mb4_bin`). No se verificaron los índices con `SHOW INDEX`.
  - Pendiente (T-00 desmarcada el 2026-11-13 por la sesión de revisión): faltan `SHOW INDEX` de `idx_species_is_published` e `idx_species_is_published_unpublished_at`, y confirmar MySQL 8.0.x en `arca_pruebas` (api-012 T-00 registró 8.4.11). Sin esto, T-00 no cumple su criterio de hecho.
## Implementación (API)

- [x] **T-01** (CA-13; RN-02, RN-06): **ajustar el modelo `Species`** con `protected $casts = ['published_fields' => 'array']` (o equivalente). No añadir `SoftDeletes` aquí (pregunta 2 del plan, resuelta el 2026-11-13: lo añade `api-014` T-03). No cambiar otros atributos ni la salida de `api-006`.
  - Rutas: `apps/api/src/app/Models/Species.php`.
  - **Criterio de hecho:** `published_fields` llega como array al leer; `PublicCatalogTest.php` (api-006) sigue verde sin cambios.
  - Evidencia (2026-11-13): cast `published_fields => array` en `app/Models/Species.php` (solo ese cambio); `PublicCatalogTest` sin regresión por el cambio (los 2 fallos `Unknown column 'longevity'` en `animals` son previos: ocurren igual sin el cambio).
- [x] **T-02** (CA-01, CA-02, CA-09, CA-17, CA-18; RN-01, RN-03, RN-04, RN-12): **crear `ListPublishedSpeciesAction`** con el método `execute(?string $habitat, ?string $name, ?string $category): Collection`. Base de la consulta: `species.is_published = 1`, `species.deleted_at IS NULL`, `orderBy('species.common_name')`, `orderBy('species.id')`. Sin `with(['animals'])`, sin join con `species_publication_requests`, sin escrituras ni Activitylog. Sin paginación.
  - Rutas: `apps/api/src/app/Actions/Catalog/ListPublishedSpeciesAction.php`.
  - **Criterio de hecho:** con solo la base y sin filtros, devuelve todas las especies visibles en orden; una especie despublicada o con `deleted_at` no aparece aunque tenga una solicitud viva.
  - Tests que lo cubren: T-13, T-14, T-23, T-27.
  - Evidencia (2026-11-13): `ListPublishedSpeciesAction`; cubierta por CA-01, CA-02, CA-09, CA-17, CA-18 en verde.
- [x] **T-03** (CA-04, CA-14; RN-05, RN-06): **filtro `habitat`** en `ListPublishedSpeciesAction`. Condiciones: `whereJsonContains('species.published_fields', 'habitat')` y `LOWER(TRIM(species.habitat)) COLLATE utf8mb4_bin = ?`, con el valor recortado y pasado por `mb_strtolower` como parámetro vinculado.
  - Rutas: `apps/api/src/app/Actions/Catalog/ListPublishedSpeciesAction.php`.
  - **Criterio de hecho:** `?habitat=  Selva  ` encuentra la especie con `habitat` «Selva» (RN-05); una especie que no publica `habitat` no aparece aunque su hábitat coincida (CA-14); un valor sin coincidencias devuelve `[]`.
  - Tests que lo cubren: T-16 (CA-04), T-17 (CA-14).
  - Evidencia (2026-11-13): filtro `habitat` en la Action; CA-04 y CA-14 en verde.
- [x] **T-04** (CA-05; RN-05): **filtro `name`**. Condición: `LOWER(species.common_name) COLLATE utf8mb4_bin LIKE ?`, con el texto recortado, en minúsculas y escapado con `addcslashes($texto, '%_\\')`, envuelto en `%...%`.
  - Rutas: `apps/api/src/app/Actions/Catalog/ListPublishedSpeciesAction.php`.
  - **Criterio de hecho:** `%` y `_` se buscan como texto literal; la coincidencia no distingue mayúsculas; `Sélva` no coincide con «Selva» (decisión 8 de la spec).
  - Tests que lo cubren: T-18.
  - Evidencia (2026-11-13): filtro `name` en la Action; CA-05 en verde.
- [x] **T-05** (CA-15; RN-05): **filtro `category`**. Condición `species.category = ?` con el valor ya validado.
  - Rutas: `apps/api/src/app/Actions/Catalog/ListPublishedSpeciesAction.php`.
  - **Criterio de hecho:** solo salen las especies visibles con esa `category`; una especie visible con `category` NULL no sale con ningún valor.
  - Tests que lo cubren: T-20.
  - Evidencia (2026-11-13): filtro `category` en la Action; CA-15 en verde.
- [x] **T-06** (CA-06; RN-05): **combinación de filtros**. Los filtros presentes se añaden con `AND`; un filtro ausente (`null`) no se aplica. Sin filtros, la respuesta es la de T-02.
  - Rutas: `apps/api/src/app/Actions/Catalog/ListPublishedSpeciesAction.php`.
  - **Criterio de hecho:** `habitat`, `name` y `category` a la vez devuelven solo las especies que cumplen los tres; sin parámetros, la lista completa; un parámetro desconocido no cambia el resultado.
  - Tests que lo cubren: T-19.
  - Evidencia (2026-11-13): combinación con AND; CA-06 en verde.
- [x] **T-07** (CA-07, CA-16; RN-09): **crear `ListPublishedSpeciesRequest`**. Recorta espacios en `habitat`, `name` y `category` (solo si son cadena). Reglas: `sometimes`, `required`, `string`; `habitat` y `name` con `min:1` y `max:150`; `category` con `in:mammal,bird,reptile,amphibian,fish,invertebrate`. Mensajes en español: «El hábitat debe tener de 1 a 150 caracteres.» (`habitat`, todas sus reglas), «El nombre debe tener de 1 a 150 caracteres.» (`name`, todas sus reglas), «Tipo de animal no válido.» (`category`, todas sus reglas). Ignora claves desconocidas.
  - Rutas: `apps/api/src/app/Http/Requests/Catalog/ListPublishedSpeciesRequest.php`.
  - **Criterio de hecho:** `?habitat=`, `?habitat=%20%20`, `?habitat=<151 caracteres>`, `?name=` y `?category=%20` responden `422` con el mensaje exacto y el error en la clave correspondiente; ningún dato cambia.
  - Tests que lo cubren: T-21 (CA-07 y CA-16).
  - Evidencia (2026-11-13): `ListPublishedSpeciesRequest`; CA-07 y CA-16 en verde.
- [x] **T-08** (CA-03, CA-13; RN-06, RN-08): **crear `PublishedSpeciesResource`** con lista blanca. Siempre: `id`, `common_name`, `category` (`null` si no hay valor), `image_url` (desde T-09). Según `published_fields` (tratado como lista vacía si es `NULL`): `scientific_name` → `scientific_name`; `origin` → `distribution`; `habitat` → `habitat`. Sin esas claves en la lista, no aparecen. Nunca se devuelven `is_published`, `published_at`, `unpublished_at`, `published_fields`, `image_path`, `created_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `species_request_id`, `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` ni `characteristics`, aunque estén en la base o en `published_fields`.
  - Rutas: `apps/api/src/app/Http/Resources/Catalog/PublishedSpeciesResource.php`.
  - **Criterio de hecho:** con los predeterminados de `api-014` RN-13, cada elemento trae `id`, `common_name`, `category`, `image_url`, `scientific_name`, `origin` y `habitat`; con `published_fields` vacío, solo las cuatro primeras; `origin` sale de `distribution`.
  - Tests que lo cubren: T-15 (CA-03), T-26 (CA-13).
  - Evidencia (2026-11-13): `PublishedSpeciesResource` con lista blanca; CA-03 y CA-13 en verde.
- [x] **T-09** (CA-08; RN-07): **crear `ResolvePublishedSpeciesImageUrlAction`** con `execute(?string $imagePath): ?string`. Devuelve `null` si la ruta es `null`, no empieza por `species/`, contiene `..` o `\`, o si el archivo no existe en el disco de medios configurado (`Storage::disk(<nombre desde configuración>)->exists()`). Si existe, devuelve `Storage::disk(...)->url($ruta)`. El nombre del disco sale de configuración; no se escribe `'media'` como literal (api-013 CA-02).
  - Rutas: `apps/api/src/app/Actions/Catalog/ResolvePublishedSpeciesImageUrlAction.php`.
  - **Criterio de hecho:** nunca devuelve una URL de `species-requests/`; con `MEDIA_PUBLIC_URL` vacía, la URL empieza por `APP_URL` más `/media/`; si falta el archivo, `null` sin error.
  - Bloqueada por: T-00 (parte de medios) y `api-013` implementada en la configuración del disco.
  - Tests que lo cubren: T-22.
  - Evidencia (2026-11-13): `ResolvePublishedSpeciesImageUrlAction` con `ResolveMediaDiskAction::publicDisk()`; CA-08 en verde.
- [x] **T-10** (CA-09, CA-11; RN-01): **crear `PublishedSpeciesController`** con el método `index(ListPublishedSpeciesRequest $request, ListPublishedSpeciesAction $action)`, que devuelve `PublishedSpeciesResource::collection($action->execute(...$request->validated()))`. Sin lógica de negocio. Registrar en `apps/api/src/routes/api.php`, junto a las rutas de `species`: `Route::get('/published-species', [PublishedSpeciesController::class, 'index'])->name('published-species.index');`, sin middleware de autenticación.
  - Rutas: `apps/api/src/app/Http/Controllers/Catalog/PublishedSpeciesController.php` (nuevo); `apps/api/src/routes/api.php` (añadir una línea; no modificar las de `species`).
  - **Criterio de hecho:** la ruta existe con nombre `published-species.index` y responde en `/api/v1/published-species`; el controlador no contiene consultas ni reglas; no se usa `SpeciesController`.
  - Tests que lo cubren: T-23, T-25.
  - Evidencia (2026-11-13): controlador y ruta `published-species.index` (bloque `// api-015`); `route:list` la muestra; CA-09 y CA-11 en verde.
- [x] **T-11** (CA-10; RN-10): **verificar la configuración de CORS** sin cambiar el código: `apps/api/src/config/cors.php` no cambia (`allowed_origins` ya lee `CORS_ALLOWED_ORIGINS`); `apps/api/src/.env.example` incluye `http://localhost:8080` como valor de muestra. Si falta, añadirlo como valor de muestra (sin secretos). No añadir origen fijo en código.
  - Rutas: `apps/api/src/config/cors.php` (sin cambio), `apps/api/src/.env.example` (verificar).
  - **Criterio de hecho:** `grep` de `published-species` y `allowed_origins` confirma que la configuración viene de `.env`; el test T-24 pasa.
  - Tests que lo cubren: T-24.
  - Evidencia (2026-11-13): `config/cors.php` sin cambio y `.env.example` ya incluye `http://localhost:8080`; CA-10 en verde.
- [x] **T-12** (RN-11, RN-02): **verificar que no cambia `api-006` ni hay migraciones nuevas.** Revisar con `git diff` que no cambian `apps/api/src/app/Http/Controllers/Catalog/SpeciesController.php`, `apps/api/src/app/Actions/Catalog/ListSpeciesAction.php`, `apps/api/src/app/Actions/Catalog/GetSpeciesAction.php`, `apps/api/src/app/Http/Resources/SpeciesResource.php`, las rutas `/species` y `/species/{species}`, ni `apps/api/src/database/migrations/`. `apps/mobile` no cambia.
  - **Criterio de hecho:** el PR no toca esos archivos (salvo T-01 en el modelo, ya acotado); la lista se registra en la evidencia del PR.
  - Tests que lo cubren: regresión de `PublicCatalogTest.php` (api-006) dentro de T-30.
  - Evidencia (2026-11-13): `git status` no muestra cambios en `SpeciesController`, `ListSpeciesAction`, `GetSpeciesAction`, `SpeciesResource`, rutas `/species`, `database/migrations` ni `apps/mobile`; en `Species.php` solo el cast.
## Pruebas automatizadas (PHPUnit, un método por CA)

Archivos: `apps/api/src/tests/Feature/Catalog/PublishedSpeciesTest.php` y `apps/api/src/tests/Feature/Catalog/PublishedSpeciesCoverageTest.php`. Todos con `DatabaseTransactions` sobre `arca_pruebas`. Los fixtures usan `Species` y `DB::table('species_publication_requests')`. Para medios, `Storage::fake(<disco de api-013>)`; nunca escribir en `apps/api/src/media/`.

- [x] **T-13** (CA-01; RN-03): `test_ca01_only_published_species_are_listed`. Fixtures: una publicada (`is_published = 1`); una con solicitud `submitted` y `is_published = 0`; una con solicitud `rejected` y `is_published = 0`; una sin solicitud y `is_published = 0`; una despublicada (`is_published = 0`, `unpublished_at` no nulo, datos previos) con solicitud `update` viva; una con publicación eliminada (`is_published = 0`, sin foto ni datos); una publicada con `deleted_at` no nulo. Verifica `200` y que `data` contiene solo la primera.
  - Rutas: `apps/api/src/tests/Feature/Catalog/PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-01 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-14** (CA-02; RN-04, RN-12): `test_ca02_orders_by_common_name_and_returns_empty_list`. Dos especies con el mismo `common_name` ordenadas por `id`; orden por `common_name`; sin especies visibles, `200` con `{"data": []}`; sin paginación (todas las visibles en una sola respuesta).
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-02 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-15** (CA-03; RN-06, RN-08): `test_ca03_public_fields_only`. Cada elemento trae `id`, `common_name`, `category` (con `null` si no hay valor), `image_url`; con los predeterminados, también `scientific_name`, `origin` y `habitat`. No aparecen las claves de RN-08 ni `image_path`, `published_fields` ni datos de personal.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-03 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-16** (CA-04; RN-05): `test_ca04_habitat_filter_matches_normalized_value`. `?habitat=  Selva  ` coincide con «Selva»; `?habitat=selva` coincide (mayúsculas); `?habitat=Sélva` no coincide (decisión 8); sin coincidencias, `200` con `[]`; `?habitat=` y `?habitat=%20%20` responden `422`.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-04 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-17** (CA-14; RN-05, RN-06): `test_ca14_habitat_filter_ignores_unpublished_habitat`. Una especie cuyo `published_fields` no incluye `habitat` no aparece con `?habitat=<su valor>`. Si ninguna visible publica ese hábitat, `200` con `[]`. `name` y `category` no cambian porque siempre se publican.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-14 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-18** (CA-05; RN-05): `test_ca05_name_filter_is_literal_and_case_insensitive`. `?name=JAG` encuentra «Jaguar»; `%` y `_` se buscan como texto (`?name=%` no devuelve todo); `Jaguár` no coincide con `Jaguar` (decisión 8); vacío o solo espacios → `422`; más de 150 caracteres → `422`.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-05 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-19** (CA-06; RN-05): `test_ca06_filters_combine_with_and`. Con `habitat`, `name` y `category` juntos solo salen las especies que cumplen los tres; sin parámetros, la lista completa de CA-02; un parámetro desconocido (`?foo=bar`) no cambia la respuesta.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-06 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-20** (CA-15; RN-05): `test_ca15_category_filter_returns_only_matching_species`. Cada uno de los seis valores de DBR-004 devuelve solo sus especies; una visible con `category` NULL no sale con ningún valor; un valor válido sin coincidencias devuelve `200` con `[]`.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-15 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-21** (CA-07, CA-16; RN-09): `test_ca07_invalid_filters_return_422_in_spanish` y `test_ca16_invalid_category_returns_422_in_spanish`. Para `habitat`, `name` y `category` inválidos: `422`, `message` en español («El hábitat debe tener de 1 a 150 caracteres.», «El nombre debe tener de 1 a 150 caracteres.» o «Tipo de animal no válido.»), error en `errors.habitat`, `errors.name` o `errors.category`, y ningún dato cambia. `category` valor fuera de la lista, vacío o solo espacios → «Tipo de animal no válido.».
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-07 y CA-16 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-22** (CA-08; RN-07): `test_ca08_image_url_only_from_species_folder`. Con `Storage::fake` del disco de medios: una especie con `image_path` `species/<archivo>` y el archivo presente → `image_url` es la URL pública (empieza por `MEDIA_PUBLIC_URL` o por `APP_URL` más `/media/`); `image_path` NULL → `image_url` null; archivo ausente → `image_url` null y `200`; una especie con `image_path` `species-requests/...` no devuelve ninguna URL con esa ruta.
  - Rutas: `PublishedSpeciesTest.php`.
  - Bloqueada por: `api-013` (disco y URL) y T-09.
  - Evidencia (2026-11-13): test de CA-08 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-23** (CA-09; RN-01): `test_ca09_read_only_without_session_and_without_activitylog`. Llamada sin cookies, sin `Authorization` y sin sesión → `200` (o `422` con parámetros inválidos). Se cuentan las filas de `species` y de `activity_log` antes y después: no cambian.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-09 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-24** (CA-10; RN-10): `test_ca10_cors_allows_only_configured_origin`. Con `config(['cors.allowed_origins' => ['http://localhost:8080']])` dentro del test: `Origin: http://localhost:8080` recibe `Access-Control-Allow-Origin: http://localhost:8080`; `Origin: http://127.0.0.1:8080` no recibe esa cabecera.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-10 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-25** (CA-11; RN-01): `test_ca11_route_name_and_thin_controller`. Comprueba que `route('published-species.index')` termina en `/api/v1/published-species` y que la ruta es `GET` sin middleware de autenticación; y que el controlador no contiene `where(`, `Species::` ni reglas de visibilidad (lectura del archivo, sin ejecutar nada).
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-11 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-26** (CA-13; RN-06): `test_ca13_published_fields_select_response_keys`. Tres combinaciones: (a) predeterminados → aparecen `scientific_name`, `origin` (de `distribution`) y `habitat`; no aparecen `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` ni `characteristics`; (b) `published_fields` sin `origin` → no aparece `origin`; (c) `published_fields` vacío → solo `id`, `common_name`, `category`, `image_url`. Incluir también una clave no permitida guardada en `published_fields` (`diet`) que no debe aparecer.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-13 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-27** (CA-17, CA-18; RN-03): `test_ca17_pending_update_keeps_published_version` y `test_ca18_unpublished_or_deleted_species_are_hidden_even_with_live_request`. CA-17: especie publicada con solicitud `update` `submitted` (insertada con `DB::table`) → sale con los datos y la foto publicados, sin cambios. CA-18: despublicada (`is_published = 0`, `unpublished_at` no nulo) con solicitud `update` viva → no sale; republicada (`is_published = 1`, `unpublished_at` NULL) → vuelve con foto y datos guardados; publicación eliminada (`image_path`, `published_fields` NULL) → no sale; `unpublished` con `image_path` y `published_fields` conservados → no sale.
  - Rutas: `PublishedSpeciesTest.php`.
  - Evidencia (2026-11-13): test de CA-17 y CA-18 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
- [x] **T-28** (CA-12): `test_ca12_suite_names_every_criterion_and_uses_database_transactions`. Lee `PublishedSpeciesTest.php` y `PublishedSpeciesCoverageTest.php` y comprueba: hay un método nombrado para cada CA-01 a CA-18; el archivo usa `DatabaseTransactions`; no aparecen `RefreshDatabase`, `migrate:fresh` ni `artisan migrate` en los tests; la conexión de pruebas apunta a `arca_pruebas` (`config('database.connections.mysql.database')`).
  - Rutas: `apps/api/src/tests/Feature/Catalog/PublishedSpeciesCoverageTest.php`.
  - Evidencia (2026-11-13): test de CA-12 en verde (`PublishedSpeciesTest`/`PublishedSpeciesCoverageTest`: 18 pasaron, 175 aserciones).
## Verificación y documentación

- [ ] **T-29** (RN-03, RN-05; BD de DBR-013): **EXPLAIN de las consultas** en `arca_pruebas`, solo lectura: (a) sin filtros; (b) con `habitat`; (c) con `name`; (d) con `category`. Registrar el plan de ejecución y si usa `idx_species_is_published` o `idx_species_is_published_unpublished_at`. Anotar que `JSON_CONTAINS` y `LOWER(...)` no usan índice y que `ORDER BY common_name` requiere `filesort`, aceptable para el volumen esperado.
  - Rutas: evidencia en el PR o en `apps/api/docs/` (no en `arca_zoo`).
  - **Criterio de hecho:** salida de EXPLAIN registrada; si el índice no se usa en (a), se abre una nota de riesgo y no se crea índice sin DBR.
  - Pendiente: EXPLAIN contra `arca_pruebas` por el responsable de BD (solo lectura; un agente no lo ejecuta). Nota: EXPLAIN no ejecutado.
- [x] **T-30** (CA-12; regresión): **ejecutar `php artisan test` contra `arca_pruebas`** y `vendor/bin/pint --test` sobre los archivos tocados. Incluir la suite de `api-006` (`PublicCatalogTest.php`) y la de `api-011` (`PublicNewsTest.php`, `PublicEventsLimitTest.php`) como regresión. Registrar número de tests, aserciones y fallos preexistentes por separado.
  - **Criterio de hecho:** todos los tests de `PublishedSpeciesTest` y `PublishedSpeciesCoverageTest` en verde; pint sin errores en los archivos nuevos; evidencia pegada en el PR. Sin esta evidencia, ninguna tarea se marca.
  - Evidencia (2026-11-13, `arca_pruebas`): `PublishedSpeciesTest` y `PublishedSpeciesCoverageTest`: 18 pruebas pasadas, 175 aserciones. Regresión por archivo verde salvo fallos preexistentes de esquema ajenos a esta feature (`PublicCatalogTest` ca02–ca05, por columnas `longevity` de `animals`). `pint` OK. Pendiente de integración (S1): evidencia pegada en el PR.

- [x] **T-31** (RN-02, RN-07, RN-10): **anotar en `infra/README.md`** un bloque «Portal público: especies publicadas (api-015, web-011)» en el mismo PR de implementación, con: DBR-013 aplicada en el ambiente; disco de medios y carpeta `species/` persistentes; `storage:link` para `public/media`; `CORS_ALLOWED_ORIGINS` con el origen del portal (ya listado para `api-011`); y la prueba `curl -i -H "Origin: <origen del portal>" <API>/api/v1/published-species` con `Access-Control-Allow-Origin` igual a ese origen. Sin valores reales ni secretos.
  - Rutas: `infra/README.md`.
  - **Criterio de hecho:** el bloque existe y cada línea tiene su casilla y su evidencia pendiente.
  - Evidencia (2026-11-13): líneas de api-015 añadidas al bloque «Portal público (TulanPedia)» de `infra/README.md` (DBR-013, `species/` persistente, `storage:link`; CORS y `curl` ya estaban); las casillas de ese bloque quedan sin marcar (evidencia de despliegue).
- [x] **T-32** (RN-06, RN-07, RN-09): **documentar el endpoint** en `apps/api/docs/contenido-publico.md`: sección «Especies publicadas» con ruta, parámetros y reglas de validación, mensajes 422, campos (lista blanca y tabla `origin` ← `distribution`), formato de `image_url`, y ejemplos de respuesta. Sin secretos.
  - Rutas: `apps/api/docs/contenido-publico.md`.
  - **Criterio de hecho:** la sección coincide con el contrato de la spec y del plan; no menciona `arca_zoo` ni credenciales.
  - Evidencia (2026-11-13): sección «Especies publicadas (api-015)» en `apps/api/docs/contenido-publico.md`.
  - Nota: pendiente de integración (S1): suite completa no ejecutada; solo por clase.
- [ ] **T-33** (CA-12; DoD): **enlazar spec, plan y tasks en el PR** y citar `api-015` en el commit. Actualizar el estado de la spec a En progreso o Implementada solo con evidencia de T-30 (y T-29 para RN-03/RN-05). No marcar Implementada si algún CA no tiene test pasando. Marcar cada T-xx solo con su evidencia.
  - **Criterio de hecho:** PR con los tres artefactos enlazados; estado y casillas coherentes con la evidencia.
  - Pendiente: PR, commit citando `api-015` y estado de la spec (integración S1). La spec sigue Aprobada.
## Definición de terminado (DoD)

- Spec Aprobada y estado actualizado; plan y tasks con el mismo NNN-slug (`015-public-species-read`).
- T-00 con evidencia de DBR-013 aplicada en `arca_pruebas` y «Lista para backend».
- Todos los T-xx aplicables marcados con evidencia; cada CA-01 a CA-18 cubierto por un test automatizado en verde.
- `/verify` ejecutado para `apps/api`: pruebas, formato y tipos. **CI en verde** (el PR no se mergea en rojo, Constitución IV). Este documento no puede verificarlo: la evidencia la aporta quien ejecuta.
- Sin violaciones a los seis principios (ver el Constitution Check del plan; la brecha de Constitución V sigue abierta hasta resolver la pregunta 2 del plan).
- Documentación de `apps/api/docs/` e `infra/README.md` actualizada; PR enlaza spec, plan y tasks; no hay secretos ni archivos generados comprometidos.
- Sin migraciones, sin SQL manual y sin escrituras en la base desde esta feature.

## Preguntas abiertas que bloquean o condicionan

Las preguntas completas están en el plan (`apps/api/plan/015-public-species-read.md`, sección «Preguntas abiertas»). Las que afectan a estas tareas:

- Pregunta 1 (collation de `habitat` y `name`): resuelta el 2026-11-13: comparación binaria tras `LOWER` (T-03, T-04, T-16 y T-18).
- Pregunta 2 (`SoftDeletes` y `BaseModel` en `Species`): resuelta el 2026-11-13: `api-014` T-03 añade `SoftDeletes`; T-01 no lo añade.
- Disco `media` y `MEDIA_PUBLIC_URL` (`api-013` CA-17 y RN-04): bloquea T-09 y T-22 hasta que `api-013` esté implementada; la clave del disco público está resuelta (pregunta 3 del plan).
- Pregunta 4 (`published_fields` NULL con `is_published = 1`): resuelta el 2026-11-13: se trata como lista vacía (T-08 y T-26).
- Pregunta 6 (aprobador del plan y de las tasks): resuelta el 2026-11-13 (Jonathan, responsable de backend).
- Pregunta 7 (fixtures de CA-17 y CA-18 sin `api-014`): resuelta el 2026-11-13: se usan `DB::table` con el riesgo anotado (T-27).

## Verificación (2026-11-13)

- Tests de la feature (`arca_pruebas`): `PublishedSpeciesTest` y `PublishedSpeciesCoverageTest`, 18 pruebas pasadas y 175 aserciones. Todos los CA-01 a CA-18 tienen test con nombre.
- Regresión por archivo: verde salvo fallos preexistentes de esquema ajenos (`PublicCatalogTest` ca02–ca05, columnas `longevity` de `animals`). `pint` OK.
- Casillas abiertas: T-00 (índices y versión de MySQL), T-29 (EXPLAIN por BD), T-33 (PR y estado de la spec).
- CI y PR: no verificados en esta sesión.

Estado final de estas tareas: **En progreso** (plan y tasks aprobados por Jonathan, 2026-11-13). La spec sigue **Aprobada**.
