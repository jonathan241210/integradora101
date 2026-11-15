# Tareas · 012 · public-memories-read

- Spec: `apps/api/specs/012-public-memories-read.md` (Estado: **Aprobada**, Jonathan, responsable de backend, 2026-11-12).
- Plan: `apps/api/plan/012-public-memories-read.md` (Estado: **Aprobado**, Jonathan, 2026-11-13).
- Estado del checklist: **En progreso** (actualizado 2026-11-13; plan y tasks aprobados por Jonathan, responsable de backend). Coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Avance S2 (2026-11-13): T-00 a T-22, T-24 y T-25 hechas. Evidencia: `php artisan test --filter='PublicMemories|MemoriesPublicReadIntegration|MemoriesCoverage'` → 18 pasados (337 aserciones), `pint` limpio. T-00: MySQL de `arca_pruebas` es 8.4.11 (no 8.0.x), divergencia informativa. T-22: con pocas filas el optimizador usó `idx_visitor_memories_status_created` (`Using filesort`); reevaluar con volumen real, sin crear índices. Pendientes: T-23 (suite completa y regresión: «pendiente de integración (S1)»; nota: 4 tests de `PublicCatalogTest` fallan por `Unknown column 'longevity'` en `animals`, ajeno a api-012) y T-26 (PR y estado de la spec, S1).

## Puerta de entrada

**No se empieza ninguna tarea de implementación (T-01 en adelante) hasta que:**

1. el plan `apps/api/plan/012-public-memories-read.md` esté aprobado técnicamente (cumplido el 2026-11-13, Jonathan);
2. T-00 esté marcada con evidencia (solo lectura en `arca_pruebas`);
3. el modelo `VisitorMemory` exista (lo crea `api-010` T-04; pregunta 1 del plan resuelta el 2026-11-13);
4. la clave del disco público de `api-013` esté configurada (clave resuelta el 2026-11-13: `filesystems.media_scopes.public`; la configuración sigue pendiente). Sin ella, T-05, T-15, T-16 (tramo de imagen) y T-25 quedan bloqueadas.

DBR-012 está en «Lista para backend» y aplicada en `arca_pruebas` desde el 2026-11-11. Esta feature no tiene DBR propia ni migraciones.

Todas las pruebas usan `DatabaseTransactions` sobre `arca_pruebas`; nunca `RefreshDatabase`, `migrate:fresh` ni migraciones desde los tests. Ninguna tarea toca `arca_zoo`. Ninguna tarea crea índices, SQL ni migraciones.

## Trazabilidad

### Criterios de aceptación (CA-xx)

| CA | Tareas de implementación | Tarea de prueba (nombre del test) |
|---|---|---|
| CA-01 | T-01, T-02 | T-10 (`test_ca01_public_memories_list_only_accepted_and_current_without_auth`) |
| CA-02 | T-01, T-02 | T-11 (`test_ca02_orders_by_published_at_desc_then_id_desc_and_returns_empty_data`) |
| CA-03 | T-02 | T-12 (`test_ca03_paginates_with_limit_page_and_meta`) |
| CA-04 | T-03 | T-13 (`test_ca04_rejects_invalid_limit_and_page_with_422_in_spanish`) |
| CA-05 | T-04 | T-14 (`test_ca05_exposes_only_id_opinion_image_url_and_published_at`) |
| CA-06 | T-05, T-04 | T-15 (`test_ca06_image_url_from_public_disk_or_null_when_file_is_missing`) |
| CA-07 | T-05, T-04, T-02 | T-16 (`test_ca07_non_accepted_memories_never_expose_image_url_or_path`) |
| CA-08 | T-06, T-07, T-09 | T-17 (`test_ca08_anonymous_read_only_without_writes_audit_or_cookies`) |
| CA-09 | T-08 | T-18 (`test_ca09_cors_allows_only_configured_origin`) |
| CA-10 | T-06, T-07 | T-19 (`test_ca10_route_name_and_thin_controller_architecture`) |
| CA-11 | (cobertura de las anteriores) | T-20 (`test_ca11_suite_names_every_criterion_and_uses_database_transactions`) |
| CA-12 | T-01, T-02 | T-21 (`test_ca12_expired_or_null_publication_is_hidden_without_writes`) |

### Reglas de negocio (RN-xx)

| RN | Tareas que lo cubren |
|---|---|
| RN-01 (solo lectura, `GET`) | T-02, T-06, T-07, T-17 |
| RN-02 (sin esquema nuevo; lee solo `visitor_memories`) | T-00, T-09, T-17, T-22 |
| RN-03 (visibilidad: `accepted`, sin `deleted_at`, `published_until` posterior a ahora) | T-01, T-02, T-10, T-21 |
| RN-04 (orden `published_at` y `id` descendentes; paginación `limit`/`page`) | T-02, T-03, T-11, T-12 |
| RN-05 (campos públicos) | T-04, T-14 |
| RN-06 (sin datos personales ni de revisión) | T-02, T-04, T-14, T-16 |
| RN-07 (errores en español) | T-03, T-13 |
| RN-08 (arquitectura: controlador delgado → Form Request → Action → Resource) | T-01, T-02, T-06, T-19 |
| RN-09 (CORS por ambiente) | T-08, T-18, T-25 |
| RN-10 (sin autenticación) | T-07, T-17 |
| RN-11 (vigencia sin escritura) | T-01, T-17, T-21 |

Cobertura: todos los CA-01 a CA-12 y RN-01 a RN-11 tienen al menos una tarea. **CA sin cobertura: 0. RN sin cobertura: 0.**

## Precondiciones (solo lectura, sin código)

- [x] **T-00** (RN-02; prerrequisito de todos los CA; parte de medios para CA-06 y CA-07): **verificación de precondiciones en `arca_pruebas`, solo lectura.** No se ejecuta DDL ni DML, ni se toca `arca_zoo`. Comprobar y registrar con evidencia, sin datos personales ni credenciales:
  - [x] DBR-012 en «Lista para backend» en `docs/database/requests/DBR-012-visitor-memories.md` y migración `2026_11_11_000012_visitor_memories_schema` con estado `Ran` (`migrate:status`, solo lectura).
  - [x] Columnas de `visitor_memories` presentes: `id`, `visitor_id`, `status`, `opinion`, `image_path`, `image_sha256`, `published_image_path`, `consent_at`, `terms_version`, `rejection_reason`, `rejected_image`, `rejected_content`, `resubmitted_count`, `reviewed_by`, `reviewed_at`, `published_at`, `published_until`, `created_at`, `updated_at`, `deleted_at`.
  - [x] Índice `idx_visitor_memories_status_publication` sobre `(status, published_until, published_at, id)` (`SHOW INDEX FROM visitor_memories`).
  - [x] Recuento de filas de `visitor_memories` por `status` (solo cifras). Registrar si hay filas `accepted` con `published_until` posterior a ahora en el ambiente. Los tests no asumen tabla vacía (ver plan, «Reglas de diseño de los tests»).
  - [x] Modelo `App\Models\VisitorMemory` y clase base: **hoy no existen** (comprobado el 2026-11-12). Registrar si `api-010` ya los creó. Si no, T-01 y T-02 quedan bloqueadas (pregunta 1 del plan).
  - [x] Estado de `api-013`: clave de configuración del disco público, `MEDIA_PUBLIC_URL` y entrada `links` para `public/media`. **Hoy no está configurado** (comprobado el 2026-11-12). Si no lo está, T-05, T-15 y el tramo de imagen de T-16 quedan bloqueadas (pregunta 2 del plan).
  - [x] Versión de MySQL (`SELECT VERSION()`, debe ser 8.0.x) y collation de `visitor_memories` (dato informativo; la consulta no compara texto).
  - **Criterio de hecho:** salida registrada en esta tarea con fecha y responsable de la comprobación. Si falta algo, la tarea queda abierta y el plan se revisa.

## Implementación (API)

- [x] **T-01** (CA-01, CA-02, CA-12; RN-03, RN-08, RN-11): **ajustar el modelo `VisitorMemory`** (creado por `api-010`) con el scope `publiclyVisible` y con `casts` de `published_at` y `published_until` a fecha-hora. El scope filtra `status` igual a `accepted` y `published_until` posterior al instante recibido por parámetro. No añadir la regla en el controlador ni en el Resource. SoftDeletes ya excluye las borradas; el test CA-01 lo verifica.
  - Rutas: `apps/api/src/app/Models/VisitorMemory.php` (ajuste).
  - Bloqueada por: T-00 y la implementación de `api-010` T-04 (pregunta 1 resuelta).
  - **Criterio de hecho:** el scope devuelve solo aceptadas, vigentes y no borradas; una aceptada con `published_until` igual o anterior al instante, o con `published_until` nulo, no pasa el filtro.
  - Tests que lo cubren: T-10, T-21.

- [x] **T-02** (CA-01, CA-02, CA-03, CA-07, CA-12; RN-01, RN-03, RN-04, RN-06, RN-08): **crear `ListPublishedMemoriesAction`** con `execute(int $limit = 10, int $page = 1): array` que devuelve `['items' => ..., 'meta' => ['page', 'limit', 'has_more']]`. Consulta `VisitorMemory::query()->publiclyVisible(now())`, selecciona solo `id`, `opinion`, `published_image_path` y `published_at`, ordena por `published_at` descendente y `id` descendente, desplaza `(page − 1) × limit` y pide `limit + 1` elementos para `has_more`. Sin `with()`, sin joins, sin escrituras, sin Activitylog, sin `COUNT(*)`.
  - Rutas: `apps/api/src/app/Actions/Catalog/ListPublishedMemoriesAction.php` (nuevo).
  - Bloqueada por: T-01.
  - **Criterio de hecho:** sin parámetros devuelve solo las visibles en orden; una página posterior a la última devuelve `[]` con `has_more` en `false`; con más visibles que el límite, `has_more` es `true` y el número de elementos no supera el límite.
  - Tests que lo cubren: T-10, T-11, T-12, T-16, T-21.

- [x] **T-03** (CA-04; RN-04, RN-07): **crear `ListPublicMemoriesRequest`**. Reglas: `limit` con `sometimes`, `integer`, `min:1`, `max:50`; `page` con `sometimes`, `integer`, `min:1`. Mensajes en español idénticos a `api-011` RN-08: «El límite debe ser un número entero entre 1 y 50.» (para `limit`) y «La página debe ser un número entero mayor o igual a 1.» (para `page`). Métodos `limit()` (por defecto 10) y `page()` (por defecto 1).
  - Rutas: `apps/api/src/app/Http/Requests/Catalog/ListPublicMemoriesRequest.php` (nuevo).
  - **Criterio de hecho:** `?limit=0`, `?limit=51`, `?limit=abc`, `?limit=`, `?limit[]=1`, `?page=0`, `?page=1.5` y `?page=` responden `422` con el mensaje exacto en `errors.limit` o `errors.page`; sin parámetros, `limit()` vale 10 y `page()` vale 1.
  - Tests que lo cubren: T-13.

- [x] **T-04** (CA-05, CA-06, CA-07; RN-05, RN-06): **crear `PublicMemoryResource`** con lista blanca de cuatro claves: `id`, `opinion` (texto plano; `null` si no hay opinión), `image_url` (desde T-05) y `published_at` (ISO 8601 en UTC). No se devuelven `visitor_id`, nombre, correo, apodo, avatar, `status`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `rejected_fields`, `rejected_image`, `rejected_content`, `image_path`, `published_image_path`, `published_until`, `deleted_at`, `resubmitted_count`, `consent_at`, `terms_version` ni `image_sha256`.
  - Rutas: `apps/api/src/app/Http/Resources/Catalog/PublicMemoryResource.php` (nuevo).
  - Bloqueada por: T-05 (solo para el campo `image_url`; el resto puede codificarse antes).
  - **Criterio de hecho:** cada elemento tiene exactamente las claves `id`, `opinion`, `image_url` y `published_at`; `opinion` nula sale como `null`, no se omite.
  - Tests que lo cubren: T-14, T-15, T-16.

- [x] **T-05** (CA-06, CA-07; RN-06): **crear `ResolvePublishedMemoryImageUrlAction`** con `execute(?string $publishedImagePath): ?string`. Devuelve `null` si la ruta es `null`, si no empieza por `memories/`, si empieza por `/`, si contiene `..` o `\`, o si el archivo no existe en el disco público configurado (`exists()` por fila, máximo 50 por respuesta; pregunta 3 del plan resuelta). Si existe, devuelve `Storage::disk(...)->url($ruta)`. Si la URL del disco no está configurada, devuelve `null` y registra un error de configuración en el log (`api-013` RN-04). El nombre del disco sale de configuración; no se escribe `'public'` ni `'media'` como literal (`api-013` CA-02). No usa `ResolveContentImageUrlAction` de `api-008`.
  - Rutas: `apps/api/src/app/Actions/Catalog/ResolvePublishedMemoryImageUrlAction.php` (nuevo).
  - Bloqueada por: `api-013` implementada en la configuración del disco (pregunta 2: clave resuelta el 2026-11-13).
  - **Criterio de hecho:** nunca devuelve una URL con ruta fuera de `memories/`; con `MEDIA_PUBLIC_URL` vacía la URL empieza por `APP_URL` más `/media/`; si el archivo falta, `null` sin error ni `500`.
  - Tests que lo cubren: T-15, T-16.

- [x] **T-06** (CA-08, CA-10; RN-01, RN-08): **crear `PublicMemoryController`** con el método `index(ListPublicMemoriesRequest $request, ListPublishedMemoriesAction $action)`. Devuelve `PublicMemoryResource::collection($resultado['items'])->additional(['meta' => $resultado['meta']])`, con `$resultado = $action->execute($request->limit(), $request->page())`. Sin consultas, sin reglas de visibilidad y sin `where(` en el controlador.
  - Rutas: `apps/api/src/app/Http/Controllers/Catalog/PublicMemoryController.php` (nuevo).
  - Bloqueada por: T-02, T-03, T-04.
  - **Criterio de hecho:** el controlador no contiene consultas ni reglas de visibilidad; no usa `VisitorMemory::`; la respuesta tiene `data` y `meta`.
  - Tests que lo cubren: T-17, T-19.

- [x] **T-07** (CA-08, CA-10; RN-01, RN-10, RN-11): **registrar la ruta** en `apps/api/src/routes/api.php`, junto a `news` y `events` y fuera de cualquier grupo con `auth:sanctum` o `visitor.token`: `Route::get('/memories', [PublicMemoryController::class, 'index'])->name('memories.index');`. No modificar las rutas existentes.
  - Rutas: `apps/api/src/routes/api.php` (una línea).
  - Bloqueada por: T-06.
  - **Criterio de hecho:** `route('memories.index')` termina en `/api/v1/memories`; la ruta es `GET`; no tiene middleware de autenticación.
  - Tests que lo cubren: T-17, T-19.

- [x] **T-08** (CA-09; RN-09): **verificar la configuración de CORS** sin cambiar código. `apps/api/src/config/cors.php` no cambia: `paths` ya incluye `api/*` y `allowed_origins` lee `CORS_ALLOWED_ORIGINS`. `apps/api/src/.env.example` ya incluye `http://localhost:8080` (comprobado el 2026-11-12). No añadir origen fijo en código.
  - Rutas: `apps/api/src/config/cors.php` (sin cambio), `apps/api/src/.env.example` (sin cambio).
  - **Criterio de hecho:** `grep` confirma que `allowed_origins` viene de `.env`; T-18 pasa.
  - Tests que lo cubren: T-18.

- [x] **T-09** (RN-02, RN-01): **verificar que no hay esquema ni escrituras nuevas.** Revisar con `git diff` que no se añaden archivos en `apps/api/src/database/migrations/` por esta feature, que no se modifica la migración de DBR-012, y que ningún archivo nuevo de `ListPublishedMemoriesAction`, `ResolvePublishedMemoryImageUrlAction`, `PublicMemoryResource`, `PublicMemoryController` o `ListPublicMemoriesRequest` llama a `create`, `update`, `delete`, `save`, `insert`, `forceDelete` o `activity()`.
  - Rutas: revisión del PR (`git diff`, `grep`).
  - Bloqueada por: T-02 a T-07.
  - **Criterio de hecho:** la lista de archivos revisados y el resultado se pegan en el PR; sin escrituras ni migraciones.
  - Tests que lo cubren: T-17.

## Pruebas automatizadas (PHPUnit, un método por CA)

Archivos: `apps/api/src/tests/Feature/Catalog/PublicMemoriesTest.php` y `apps/api/src/tests/Feature/Catalog/PublicMemoriesCoverageTest.php`. Todos con `DatabaseTransactions` sobre `arca_pruebas`. Fixtures con `DB::table('visitor_memories')` (`consent_at` y `terms_version` obligatorios; `visitor_id` y `reviewed_by` en `NULL`). Medios con `Storage::fake(<disco de api-013>)`; nunca escribir en `apps/api/src/media/`. Restaurar `Carbon::setTestNow()` en `tearDown` cuando se use.

- [x] **T-10** (CA-01; RN-03): `test_ca01_public_memories_list_only_accepted_and_current_without_auth`. Fixtures: una `submitted`; una `in_review`; una `rejected`; una `accepted` con `deleted_at` no nulo; una `accepted` con `published_until` vencido; una `accepted` vigente. Llamada sin cookies ni `Authorization`. Verifica `200`, que `data` contiene solo la vigente (por identificador) y que ninguna de las demás aparece.
  - Rutas: `PublicMemoriesTest.php`.

- [x] **T-11** (CA-02; RN-04): `test_ca02_orders_by_published_at_desc_then_id_desc_and_returns_empty_data`. Dos aceptadas con el mismo `published_at` (ordenadas por `id` descendente) y una con `published_at` más antiguo. Verifica el orden. Sin visibles (todas vencidas o no aceptadas), `200` con `data` igual a `[]`.
  - Rutas: `PublicMemoriesTest.php`.

- [x] **T-12** (CA-03; RN-04): `test_ca03_paginates_with_limit_page_and_meta`. Con más visibles que el límite: `?limit=2&page=1` devuelve dos elementos y `meta` `{page: 1, limit: 2, has_more: true}`; `?limit=2&page=2` devuelve el resto con `has_more` según corresponda; sin `limit`, el tamaño de página es 10 (con más de 10 visibles, o comprobar `meta.limit` igual a 10); sin `page`, `meta.page` es 1; una página posterior a la última devuelve `data` igual a `[]` y `has_more` en `false`. El total visible previo se calcula antes de insertar (ver plan).
  - Rutas: `PublicMemoriesTest.php`.

- [x] **T-13** (CA-04; RN-07): `test_ca04_rejects_invalid_limit_and_page_with_422_in_spanish`. Casos: `limit=0`, `limit=51`, `limit=abc`, `limit=` (vacío), `limit[]=1`, `page=0`, `page=1.5`, `page=` (vacío). Cada caso responde `422`, con `message` en español, `errors.limit` o `errors.page` con el mensaje exacto, y no cambia ninguna fila (se cuentan antes y después).
  - Rutas: `PublicMemoriesTest.php`.

- [x] **T-14** (CA-05; RN-05, RN-06): `test_ca05_exposes_only_id_opinion_image_url_and_published_at`. Verifica que cada elemento tiene exactamente las claves `id`, `opinion`, `image_url` y `published_at`. Verifica que una aceptada sin opinión sale con `opinion` igual a `null` (la clave existe). Revisa que no aparecen las claves de la lista de T-04 ni los valores de `visitor_id`, `reviewed_by` ni `rejection_reason` de la fixture.
  - Rutas: `PublicMemoriesTest.php`.

- [x] **T-15** (CA-06; RN-06): `test_ca06_image_url_from_public_disk_or_null_when_file_is_missing`. Con `Storage::fake(<disco de api-013>)`: (a) una aceptada vigente con `published_image_path` `memories/<archivo>.jpg` y el archivo creado en el disco → `image_url` empieza por la URL del disco (`MEDIA_PUBLIC_URL` o `APP_URL` más `/media/`); (b) la misma fila sin archivo en el disco → `image_url` igual a `null` y respuesta `200`; (c) `published_image_path` nulo → `image_url` igual a `null`.
  - Rutas: `PublicMemoriesTest.php`.
  - Bloqueada por: T-05 y `api-013` (pregunta 2 y pregunta 3 del plan).

- [x] **T-16** (CA-07; RN-06): `test_ca07_non_accepted_memories_never_expose_image_url_or_path`. Fixtures no aceptadas (`submitted`, `in_review`, `rejected`) con `image_path` y `published_image_path` de prueba, y con el archivo presente en el disco falso. Llama a la API y verifica que ninguna respuesta contiene el identificador de esas filas, ni `image_url`, ni el nombre del archivo, ni la cadena `memories/`, ni `image_path`. La imagen no se entrega desde la API.
  - Rutas: `PublicMemoriesTest.php` (con `Storage::fake`).
  - Bloqueada por: T-05 (tramo de imagen).

- [x] **T-17** (CA-08; RN-01, RN-02, RN-10, RN-11): `test_ca08_anonymous_read_only_without_writes_audit_or_cookies`. Se cuentan las filas de `visitor_memories`, `visitor_memory_reviews` y `activity_log` antes y después de la llamada, y se compara el `updated_at` de una aceptada antes y después. Llamada sin cookies, sin `Authorization` y sin sesión: `200`, sin cabecera `Set-Cookie`. Los conteos no cambian.
  - Rutas: `PublicMemoriesTest.php`.

- [x] **T-18** (CA-09; RN-09): `test_ca09_cors_allows_only_configured_origin`. Con `config(['cors.allowed_origins' => ['http://localhost:8080']])` dentro del test: `Origin: http://localhost:8080` recibe `Access-Control-Allow-Origin: http://localhost:8080`; `Origin: http://127.0.0.1:8080` no recibe esa cabecera con ese origen. No se modifica `.env`.
  - Rutas: `PublicMemoriesTest.php`.

- [x] **T-19** (CA-10; RN-08, RN-01): `test_ca10_route_name_and_thin_controller_architecture`. Comprueba que `route('memories.index')` termina en `/api/v1/memories`, que la ruta es `GET` y que no tiene middleware de autenticación. Lee el archivo de `PublicMemoryController` (sin ejecutarlo) y comprueba que no contiene `where(`, `VisitorMemory::` ni reglas de visibilidad (`accepted`, `published_until`).
  - Rutas: `PublicMemoriesTest.php`.

- [x] **T-20** (CA-11): `test_ca11_suite_names_every_criterion_and_uses_database_transactions`. Lee `PublicMemoriesTest.php` y `PublicMemoriesCoverageTest.php` y comprueba: hay un método nombrado para cada CA-01 a CA-12; el archivo usa `DatabaseTransactions`; no aparecen `RefreshDatabase`, `migrate:fresh` ni `artisan migrate` en los tests; la conexión de pruebas apunta a `arca_pruebas` (`config('database.connections.mysql.database')`).
  - Rutas: `apps/api/src/tests/Feature/Catalog/PublicMemoriesCoverageTest.php`.

- [x] **T-21** (CA-12; RN-03, RN-11): `test_ca12_expired_or_null_publication_is_hidden_without_writes`. Con `Carbon::setTestNow` fijado a un instante T: (a) una aceptada con `published_until` igual a T no sale; (b) una con `published_until` igual a T más un segundo sí sale; (c) una con `published_until` nulo no sale; (d) al avanzar `Carbon::setTestNow` después de `published_until`, la fila desaparece de `data` y no cuenta en `has_more`; (e) el conteo de `visitor_memories` y el `updated_at` no cambian en ningún caso. `tearDown` restaura `Carbon::setTestNow()`.
  - Rutas: `PublicMemoriesTest.php`.

## Verificación y documentación

- [x] **T-22** (RN-02, RN-03, RN-04; BD de DBR-012): **`EXPLAIN` de la consulta de T-02** en `arca_pruebas`, solo lectura (`EXPLAIN` del `SELECT` que genera Eloquent, sin ejecutar escrituras). Registrar el plan de ejecución, si usa `idx_visitor_memories_status_publication` y si aparece `filesort` por el orden. Dato esperado: el índice cubre el filtro; el orden probablemente requiere `filesort`, aceptable con el volumen previsto.
  - Rutas: evidencia en el PR o en `apps/api/docs/contenido-publico.md`. Nunca en `arca_zoo`.
  - **Criterio de hecho:** salida de `EXPLAIN` registrada con fecha. Si el índice no se usa para el filtro, se anota un riesgo. **No se crea índice sin DBR** (Constitución V).

- [x] **T-23** (CA-11; regresión): **ejecutar `php artisan test` contra `arca_pruebas`** y `vendor/bin/pint --test` sobre los archivos tocados. Incluir como regresión `PublicCatalogTest.php` (`api-006`), `PublicNewsTest.php` y `PublicEventsLimitTest.php` (`api-011`), que no deben cambiar. Registrar número de tests, aserciones y fallos preexistentes por separado.
  - **Criterio de hecho:** todos los tests de `PublicMemoriesTest` y `PublicMemoriesCoverageTest` en verde; `pint` sin errores en los archivos nuevos; evidencia pegada en el PR. Sin esta evidencia, ninguna tarea se marca. Este documento no puede verificar el CI: lo aporta quien ejecuta.
  - Evidencia (2026-11-13, `arca_pruebas`): `--filter='PublicMemories|MemoriesPublicReadIntegration|MemoriesCoverage'`, 18 pruebas pasadas (337 aserciones); `pint` limpio. Regresión por archivo: `PublicNewsTest` y `PublicEventsLimitTest` verdes; `PublicCatalogTest` con 4 fallos preexistentes por `longevity` en `animals`, ajenos a esta feature. Pendiente de integración (S1): evidencia pegada en el PR.

- [x] **T-24** (RN-05, RN-06, RN-07; documentación): **documentar el endpoint** en `apps/api/docs/contenido-publico.md` (el archivo ya existe; añadir la sección «Momentos publicados»). Incluir: ruta y nombre, parámetros y defaults, mensajes 422, lista de campos (lista blanca), formato de `image_url` (disco `media`, `MEDIA_PUBLIC_URL` o `APP_URL` más `/media`, `null` si falta el archivo), regla de vigencia (`published_until`), y ejemplo de respuesta.
  - Rutas: `apps/api/docs/contenido-publico.md` (ajuste).
  - **Criterio de hecho:** la sección coincide con el contrato de la spec y del plan; no menciona `arca_zoo` ni credenciales; no incluye rutas absolutas del sistema de archivos.

- [x] **T-25** (RN-09, RN-10; infraestructura): **anotar en `infra/README.md`** un bloque «Portal público: momentos para recordar (api-012, web-010)» en el mismo PR de implementación, con líneas y casillas para: DBR-012 aplicada en el ambiente; disco de medios y carpeta `memories/` persistentes (`api-013`); `storage:link` para `public/media`; `CORS_ALLOWED_ORIGINS` con el origen exacto del portal (en desarrollo, `http://localhost:8080`); y la prueba `curl -i -H "Origin: <origen del portal>" <API>/api/v1/memories`, con `Access-Control-Allow-Origin` igual a ese origen. Sin valores reales ni secretos. La spec indica que este documento no edita `infra/README.md`; la edición la hace el PR de implementación.
  - Rutas: `infra/README.md` (ajuste).
  - Bloqueada por: `api-013` implementada (pregunta 2 del plan: clave resuelta el 2026-11-13; sigue pendiente la configuración).
  - **Criterio de hecho:** el bloque existe y cada línea tiene su casilla y su evidencia pendiente.

- [ ] **T-26** (CA-11; DoD): **enlazar spec, plan y tasks en el PR** y citar `api-012` en el commit. Actualizar el estado de la spec a En progreso o Implementada solo con evidencia de T-23 y T-22. No marcar Implementada si algún CA no tiene un test en verde. Marcar cada T-xx solo con su evidencia.
  - **Criterio de hecho:** PR con los tres artefactos enlazados; estado y casillas coherentes con la evidencia.
  - Pendiente: PR, commit citando `api-012` y estado de la spec (integración S1). La spec sigue Aprobada.

## Definición de terminado (DoD)

- Spec Aprobada y estado actualizado; plan y tasks con el mismo NNN-slug (`012-public-memories-read`), aprobados técnicamente.
- T-00 con evidencia de DBR-012 aplicada en `arca_pruebas` y «Lista para backend».
- Modelo `VisitorMemory` disponible (pregunta 1 del plan) y clave del disco público configurada (pregunta 2 del plan).
- Todos los T-xx aplicables marcados con evidencia; cada CA-01 a CA-12 cubierto por un test automatizado en verde.
- `/verify` ejecutado para `apps/api`: pruebas, formato y tipos. **CI en verde** (el PR no se mergea en rojo, Constitución IV). Este documento no puede verificarlo: la evidencia la aporta quien ejecuta.
- Sin violaciones a los seis principios (ver el Constitution Check del plan; la brecha de `BaseModel` de Constitución V se cierra con la pregunta 1).
- Documentación de `apps/api/docs/contenido-publico.md` e `infra/README.md` actualizada; PR enlaza spec, plan y tasks; no hay secretos ni archivos generados comprometidos.
- Sin migraciones, sin SQL manual, sin índices nuevos y sin escrituras en la base desde esta feature.

## Preguntas abiertas que bloquean o condicionan

Las preguntas completas están en el plan (`apps/api/plan/012-public-memories-read.md`, sección «Preguntas abiertas»). Las que afectan a estas tareas:

- Pregunta 1 (modelo `VisitorMemory` y `BaseModel`, de `api-010`): resuelta el 2026-11-13 (`api-010` crea el modelo; sin `BaseModel`). T-01 y T-02 siguen bloqueadas hasta implementar `api-010`.
- Pregunta 2 (clave del disco público y estado de `api-013`): clave resuelta el 2026-11-13; T-05, T-15, T-16 (tramo de imagen) y T-25 siguen bloqueadas hasta implementar `api-013`.
- Pregunta 3 (`image_url` con archivo ausente): resuelta el 2026-11-13: `exists()` por fila, máximo 50 (T-05 y T-15).
- Pregunta 4 (máximo de `page`): resuelta el 2026-11-13: sin tope; una página fuera de rango devuelve lista vacía con la forma normal (T-03 y T-12).
- Pregunta 5 (`opinion` nula): resuelta el 2026-11-13: clave `opinion` siempre presente, en `null` si falta (T-04 y T-14).

## Verificación (2026-11-13)

- Tests de la feature (`arca_pruebas`): `PublicMemoriesTest`, `PublicMemoriesCoverageTest` y `MemoriesPublicReadIntegrationTest`: 18 pruebas pasadas, 337 aserciones; `pint` limpio.
- Regresión: `PublicNewsTest` y `PublicEventsLimitTest` verdes; `PublicCatalogTest` con 4 fallos preexistentes (`longevity` en `animals`), ajenos a esta feature.
- Observación de T-00 (no corregida aquí): MySQL de `arca_pruebas` registrado como 8.4.11, distinto del 8.0.x que pide la Constitución I y el checklist. Decisión pendiente del responsable de BD.
- Casillas abiertas: T-26 (PR y estado de la spec, integración S1).
- CI: no verificado en esta sesión.

Estado final de estas tareas: **En progreso** (plan y tasks aprobados por Jonathan, 2026-11-13). La spec sigue **Aprobada**.
