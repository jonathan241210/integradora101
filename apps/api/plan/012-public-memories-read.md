# Plan técnico · 012 · public-memories-read

- Spec: `apps/api/specs/012-public-memories-read.md`
- Estado de spec: Aprobada (Jonathan, responsable de backend, 2026-11-12). Aprobar no autoriza implementar.
- Estado: **Aprobado** (Jonathan, responsable de backend, 2026-11-13). Implementación pendiente de iniciar; coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Aviso vigente: lo redactó la sesión de documentación; la aprobación es de Jonathan (2026-11-13). Las preguntas 1 a 5 quedan resueltas el 2026-11-13 (la 4: sin tope de `page`). Las precondiciones de ejecución siguen abiertas según la lista de abajo.
- Responsable técnico: Jonathan (responsable de backend). Aprobación técnica cumplida el 2026-11-13.
- Precondiciones de ejecución (ninguna cumplida como condición de código):
  - DBR-012 en «Lista para backend» (aplicada en `arca_pruebas` el 2026-11-11, migración `2026_11_11_000012_visitor_memories_schema`). Cumplida.
  - Modelo `VisitorMemory` de `api-010`. **No existe hoy** en `apps/api/src/app/Models/` (comprobado el 2026-11-12). Plan y tasks de `api-010` aprobados el 2026-11-13, sin implementar. Bloquea T-01 y T-02 hasta que `api-010` T-04 esté implementada (pregunta 1 resuelta).
  - Disco público de `api-013` (carpeta `media/`, clave de configuración y `MEDIA_PUBLIC_URL`). **No configurado hoy** en `apps/api/src/config/filesystems.php`. Plan y tasks de `api-013` aprobados el 2026-11-13. Bloquea T-05 hasta que `api-013` T-01 esté implementada (pregunta 2: clave resuelta el 2026-11-13, `filesystems.media_scopes.public`).
- Consumidor: `web-010` (`apps/web`, galería «Momentos para recordar», ADR 0027). Sin cambios en `packages/api-client` ni en `apps/mobile`.

## Diseño de solución

La API expone una ruta pública de solo lectura, `GET /api/v1/memories`, con nombre `memories.index`, fuera de cualquier middleware de autenticación. Lee solo la tabla `visitor_memories` de DBR-012 y, dentro de ella, solo las columnas `id`, `opinion`, `published_image_path` y `published_at`. No escribe, no crea registros de Activitylog y no toca `image_path`, `visitor_id`, `reviewed_by`, `rejection_reason`, `rejected_image`, `rejected_content` ni `consent_at`.

Flujo de cada petición:

1. Ruta nombrada, sin middleware de sesión ni de token.
2. `PublicMemoryController::index` (delgado): recibe la petición validada, llama a la Action y devuelve `PublicMemoryResource::collection(...)` con `meta` añadido. No contiene consultas ni reglas.
3. `ListPublicMemoriesRequest` (Form Request): `limit` entero entre 1 y 50 (por defecto 10) y `page` entero mayor o igual a 1 (por defecto 1). Los mensajes de error son los mismos que `api-011` RN-08.
4. `ListPublishedMemoriesAction`: consulta única con el scope de visibilidad del modelo, orden `published_at` descendente y `id` descendente, y paginación por `offset` y `limit + 1` para calcular `has_more` sin `COUNT(*)`.
5. `PublicMemoryResource`: serializa con lista blanca de cuatro claves (`id`, `opinion`, `image_url`, `published_at`).
6. `ResolvePublishedMemoryImageUrlAction`: única ruta de lectura de `published_image_path` hacia `image_url`.

Decisiones de diseño:

- **Visibilidad en el modelo, no en el controlador (RN-03, RN-08).** La regla vive en un scope `publiclyVisible` de `VisitorMemory`: `status` igual a `accepted`, `published_until` posterior al instante actual y sin `deleted_at`. La Action la reutiliza. Así no puede divergir de otra consulta pública que se añada después.
- **Vigencia por instante, en UTC (RN-11).** `published_until` es un `TIMESTAMP`, por lo que se compara con el instante actual (`now()`, en la zona `UTC` de `config('app.timezone')`). No se usa `App\Support\PublicCalendar::today()` de `api-011`, que resuelve fechas de día, no instantes.
- **`published_until` nulo no se lista.** Una aceptada sin `published_until` no cumple «posterior a la hora actual» en SQL (la comparación con `NULL` no es verdadera). Es una interpretación segura que se cubre en el test de CA-12.
- **Borrado lógico excluido por el modelo.** `VisitorMemory` usa SoftDeletes (Constitución V, `api-010` CA-20). CA-01 comprueba con una fila borrada que no sale.
- **Doble barrera de campos (CA-05).** La Action selecciona solo las columnas necesarias y el Resource usa lista blanca. Ninguna clave se copia automáticamente desde el modelo.
- **Imagen con resolver propio.** No se reutiliza `ResolveContentImageUrlAction` de `api-008`: usa el disco literal `'public'` y espera rutas `news/…` o `events/…`, lo que contradice `api-013` CA-02 y la carpeta `memories/`.
- **Paginación sin total (`api-011` RN-05).** Se piden `limit + 1` elementos; si llega el extra, `has_more` es `true` y se descarta.
- **Sin paginación por cursor, sin caché de servidor, sin límite de tasa** (Fuera de alcance de la spec).

## Contrato y datos

### Endpoint

| Método | Ruta | Nombre | Auth | Éxito | Error |
|---|---|---|---|---|---|
| `GET` | `/api/v1/memories` | `memories.index` | Ninguna (público) | `200 {"data":[...],"meta":{...}}` | `422` por `limit` o `page` no válidos; `500` si la BD falla |

Colección vacía o página posterior a la última: `200` con `{"data": []}` y `meta.has_more` en `false`. No hay ruta de detalle (Fuera de alcance de la spec).

### Parámetros

| Parámetro | Regla | Por defecto | Mensaje 422 (`errors.<clave>`) |
|---|---|---|---|
| `limit` | entero, mínimo 1, máximo 50 | 10 | «El límite debe ser un número entero entre 1 y 50.» |
| `page` | entero, mínimo 1 | 1 | «La página debe ser un número entero mayor o igual a 1.» |

Notas de validación:

- `?limit=` y `?page=` vacíos llegan como `null` (Laravel convierte las cadenas vacías) y fallan la regla `integer`, por lo que responden `422`. Se cubre en CA-04.
- Los arreglos (`?limit[]=1`) también fallan `integer` y reciben el mensaje en español.
- El formato de error es el estándar de Laravel: `{"message": "...", "errors": {"limit": ["..."]}}`.

### Respuesta

Cada elemento tiene exactamente cuatro claves:

| Clave | Origen | Valor sin dato |
|---|---|---|
| `id` | `visitor_memories.id` | nunca nulo |
| `opinion` | `visitor_memories.opinion`, texto plano | `null` (pregunta 5) |
| `image_url` | `ResolvePublishedMemoryImageUrlAction` con `published_image_path` | `null` (CA-06) |
| `published_at` | `visitor_memories.published_at`, en ISO 8601 UTC | nunca nulo en una aceptada |

`meta` tiene `page`, `limit` y `has_more`, como en `api-011`.

Ejemplo (valores de muestra):

```json
{
  "data": [
    {
      "id": 7,
      "opinion": "Los flamencos estaban en el lago.",
      "image_url": "http://localhost:8000/media/memories/0b1c0000-0000-4000-8000-000000000000.jpg",
      "published_at": "2026-11-10T15:20:00+00:00"
    }
  ],
  "meta": { "page": 1, "limit": 10, "has_more": false }
}
```

### Consulta y orden

- Filtro: `status` igual a `accepted`, `published_until` posterior al instante actual y sin `deleted_at` (scope `publiclyVisible`).
- Orden: `published_at` descendente y `id` descendente (CA-02, RN-03).
- Paginación: desplazamiento `(page − 1) × limit` y `limit + 1` elementos.
- Columnas: `id`, `opinion`, `published_image_path`, `published_at`.
- Sin `with()`, sin joins con `visitors`, `users` ni `visitor_memory_reviews`.

### Índices (DBR-012)

- Índice disponible: `idx_visitor_memories_status_publication` sobre `(status, published_until, published_at, id)`.
- El filtro por `status` e `published_until` puede usar el índice. Como `published_until` es una columna de rango antes de `published_at`, el orden `published_at` descendente, `id` descendente probablemente requiere `filesort`. Con el volumen esperado es aceptable. T-22 lo mide con `EXPLAIN` en `arca_pruebas`.
- Esta spec no crea índices. Si el `EXPLAIN` o el volumen real lo exigen, se abre una DBR aparte (Constitución V, `docs/database/README.md`). Ningún agente crea ese índice.

### Imagen (`ResolvePublishedMemoryImageUrlAction`)

1. Si `published_image_path` es `null`, devuelve `null`.
2. Si la ruta no empieza por `memories/`, empieza por `/`, contiene `..` o contiene `\`, devuelve `null` sin consultar el disco.
3. Obtiene el nombre del disco público de la configuración (clave que fija `api-013`, pregunta 2). No escribe el literal `'public'` ni `'media'` (api-013 CA-02).
4. Si `Storage::disk(...)->exists($ruta)` es falso, devuelve `null` sin error (CA-06). Esta comprobación depende de la pregunta 3.
5. Si la URL del disco público no está configurada, devuelve `null` y registra un error de configuración (api-013 RN-04).
6. Devuelve `Storage::disk(...)->url($ruta)`. Con `MEDIA_PUBLIC_URL` vacía, la URL empieza por `APP_URL` más `/media/`.

### Errores y compatibilidad

- `422` con los mensajes de la tabla de parámetros.
- `500` si la base de datos no responde. El portal muestra su estado de error (`web-010`).
- Sin `Access-Control-Allow-Origin` si el origen no está en `CORS_ALLOWED_ORIGINS`. El navegador bloquea la lectura.
- Primera versión de la ruta: no hay contrato previo que preservar.
- Sin cookies, sin `Set-Cookie` y sin sesión. No se añaden cabeceras de caché (Fuera de alcance). Las cabeceras CORS las pone el middleware existente.

### Datos y DBR

- Sin DBR propia y sin migraciones (RN-02). El esquema lo define DBR-012.
- Precondición de despliegue: DBR-012 aplicada en el ambiente. Sin ella, la consulta falla.
- Tests: las filas se crean con `DB::table('visitor_memories')` dentro de `DatabaseTransactions` sobre `arca_pruebas`. Las columnas `consent_at` y `terms_version` son `NOT NULL` y se rellenan en cada fixture. `visitor_id` y `reviewed_by` quedan en `NULL`.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / modelo | `apps/api/src/app/Models/VisitorMemory.php` (ajuste; lo crea `api-010`) | Scope `publiclyVisible` (RN-03) y `casts` de `published_at` y `published_until` a fecha-hora. |
| API / Actions | `apps/api/src/app/Actions/Catalog/ListPublishedMemoriesAction.php` (nuevo) | Consulta visible, orden, `limit + 1` y `meta`. Sin escrituras. |
| API / Actions | `apps/api/src/app/Actions/Catalog/ResolvePublishedMemoryImageUrlAction.php` (nuevo) | Única lectura de `published_image_path` → `image_url` (CA-06, CA-07). |
| API / validación | `apps/api/src/app/Http/Requests/Catalog/ListPublicMemoriesRequest.php` (nuevo) | `limit` y `page` con defaults 10 y 1, mensajes en español. |
| API / Resources | `apps/api/src/app/Http/Resources/Catalog/PublicMemoryResource.php` (nuevo) | Lista blanca de cuatro claves; llama al resolver de imagen. |
| API / HTTP | `apps/api/src/app/Http/Controllers/Catalog/PublicMemoryController.php` (nuevo) | `index` delgado. |
| API / rutas | `apps/api/src/routes/api.php` (ajuste: una línea) | `Route::get('/memories', ...)->name('memories.index')` fuera de autenticación, junto a `news` y `events`. |
| API / configuración | `apps/api/src/config/cors.php` (sin cambio), `apps/api/src/.env.example` (sin cambio) | `paths` ya incluye `api/*`, y `.env.example` ya incluye `http://localhost:8080` (comprobado el 2026-11-12). |
| API / pruebas | `apps/api/src/tests/Feature/Catalog/PublicMemoriesTest.php` (nuevo) | Un método por CA-01 a CA-10 y CA-12. |
| API / pruebas | `apps/api/src/tests/Feature/Catalog/PublicMemoriesCoverageTest.php` (nuevo) | CA-11: cobertura de nombres y uso de `DatabaseTransactions`. |
| API / documentación | `apps/api/docs/contenido-publico.md` (ajuste: sección nueva; el archivo ya existe) | Referencia del endpoint, parámetros, errores, campos e `image_url`. |
| Infraestructura | `infra/README.md` (ajuste; lo hace el PR de implementación) | Bloque «Portal público: momentos» con DBR-012, disco `media`, `storage:link`, CORS y `curl`. |
| Clientes | Ninguno en este plan | `web-010` consume la ruta en su propio plan. |
| Paquetes | Ninguno | `packages/api-client` no cambia. |
| Datos | Ninguno | DBR-012 es prerrequisito, no parte de este plan. |

## Seguridad, offline y operación

- Ruta pública de solo lectura. No se leen cookies, `Authorization` ni sesión. No hay Activitylog en lecturas (CA-08).
- Entradas: `limit` y `page` son enteros acotados (`limit` entre 1 y 50). No hay texto libre en la consulta. Eloquent parametriza todos los valores (ver pregunta 4 sobre el máximo de `page`).
- Salida: lista blanca de cuatro claves (RN-05, RN-06). Ninguna clave de personal ni de visitante. La URL sale solo de `published_image_path` y solo para aceptadas vigentes.
- Imagen: la consulta no devuelve nunca una fila no aceptada, y el resolver solo acepta rutas `memories/` (CA-07).
- **Riesgo fuera de la API:** la carpeta `media/` se publica por `/media`. Una imagen vencida o pendiente es alcanzable si alguien conoce su URL (`api-013` RN-16; ADR 0026, riesgo b). La barrera es la API y se documenta; no se resuelve aquí.
- Límite de tasa: no se añade (Fuera de alcance). Riesgo aceptado para contenido público de volumen bajo.
- Caché: ninguna en servidor ni en CDN. El navegador puede cachear; no es responsabilidad de esta spec.
- Portabilidad (ADR 0013): comparación de fechas, `ORDER BY`, `LIMIT` y `OFFSET` estándar de MySQL 8.0.x; sin funciones propietarias. Configuración solo por `.env` (`CORS_ALLOWED_ORIGINS`, `APP_URL`, `MEDIA_PUBLIC_URL` y la clave del disco).
- Ambientes: `arca_pruebas` es la base de todos los tests. `arca_zoo` no se usa.
- Operación: el checklist de `infra/README.md` (T-25).

## Mapeo de criterios a pruebas

Todas las pruebas son PHPUnit en `apps/api/src/tests/Feature/Catalog/`, con `DatabaseTransactions` sobre `arca_pruebas`. Usan `getJson` o `get`. Nunca usan `RefreshDatabase`, `migrate:fresh` ni migraciones.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_ca01_public_memories_list_only_accepted_and_current_without_auth` | `PublicMemoriesTest.php` |
| CA-02 | `test_ca02_orders_by_published_at_desc_then_id_desc_and_returns_empty_data` | `PublicMemoriesTest.php` |
| CA-03 | `test_ca03_paginates_with_limit_page_and_meta` | `PublicMemoriesTest.php` |
| CA-04 | `test_ca04_rejects_invalid_limit_and_page_with_422_in_spanish` | `PublicMemoriesTest.php` |
| CA-05 | `test_ca05_exposes_only_id_opinion_image_url_and_published_at` | `PublicMemoriesTest.php` |
| CA-06 | `test_ca06_image_url_from_public_disk_or_null_when_file_is_missing` | `PublicMemoriesTest.php` (con `Storage::fake`) |
| CA-07 | `test_ca07_non_accepted_memories_never_expose_image_url_or_path` | `PublicMemoriesTest.php` |
| CA-08 | `test_ca08_anonymous_read_only_without_writes_audit_or_cookies` | `PublicMemoriesTest.php` |
| CA-09 | `test_ca09_cors_allows_only_configured_origin` | `PublicMemoriesTest.php` |
| CA-10 | `test_ca10_route_name_and_thin_controller_architecture` | `PublicMemoriesTest.php` |
| CA-11 | `test_ca11_suite_names_every_criterion_and_uses_database_transactions` | `PublicMemoriesCoverageTest.php` |
| CA-12 | `test_ca12_expired_or_null_publication_is_hidden_without_writes` | `PublicMemoriesTest.php` (con `Carbon::setTestNow`) |

Notas por criterio:

- **CA-01:** fixtures de cada tipo: `submitted`, `in_review`, `rejected`, `accepted` borrada lógicamente, `accepted` vencida y `accepted` vigente. Solo debe salir la vigente.
- **CA-02:** dos aceptadas con el mismo `published_at` ordenadas por `id`, y una con `published_at` distinto. Sin visibles, `data` es `[]`.
- **CA-04:** además de `limit=0`, `limit=51`, `limit=abc`, `page=0` y `page=1.5`, se prueban `?limit=` y `?page=` vacíos y `?limit[]=1`. Cada caso verifica que ninguna fila cambia.
- **CA-05:** se compara el conjunto exacto de claves de cada elemento, no solo la presencia de algunas.
- **CA-06:** con `Storage::fake(<disco de api-013>)`, el archivo presente da URL que empieza por la URL del disco. El archivo ausente da `null` con `200`.
- **CA-07:** las filas no aceptadas llevan `image_path` y `published_image_path` de prueba. Ninguna respuesta debe contener el nombre de esos archivos, ni la ruta `memories/`, ni `image_url`.
- **CA-08:** se cuentan las filas de `visitor_memories`, `visitor_memory_reviews` y `activity_log` antes y después. No cambian. Se comprueba que la respuesta no trae `Set-Cookie`.
- **CA-09:** se sobrescribe `config(['cors.allowed_origins' => ['http://localhost:8080']])` dentro del test. No se toca `.env`.
- **CA-10:** lectura de la ruta (`GET`, nombre, sin middleware de autenticación) y del controlador (sin `where(`, sin `VisitorMemory::`, sin reglas de visibilidad).
- **CA-11:** el test lee los dos archivos de tests y comprueba que cada CA-01 a CA-12 tiene un método nombrado, que se usa `DatabaseTransactions`, que no aparecen `RefreshDatabase` ni `migrate`, y que la conexión apunta a `arca_pruebas`.
- **CA-12:** `published_until` igual a la hora fijada se excluye; uno segundo después se incluye; avanzar `Carbon::setTestNow` hace desaparecer la fila sin escribir nada. Se comprueba también que una aceptada con `published_until` nulo no sale. Se restaura `Carbon::setTestNow()` en `tearDown`.

Reglas de diseño de los tests:

- **No asumir tabla vacía.** `arca_pruebas` puede tener filas de `visitor_memories` ajenas al test (T-00 registra el conteo). Los tests calculan el conjunto esperado con sus propios identificadores y comparan con inclusión o exclusión. En paginación, el total previo se calcula antes de insertar.
- **Fechas controladas.** `Carbon::setTestNow` en CA-01, CA-02, CA-03 y CA-12.
- **Medios falsos.** `Storage::fake(<disco de api-013>)`. Nunca se escribe en `apps/api/src/media/`.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel 12, PHP 8.4, Eloquent y MySQL 8.0.x. Sin dependencias nuevas, sin SDK de nube, sin ADR nuevo. Configuración solo por `.env`. |
| II. La spec manda | Sí, con condición | Spec 012 Aprobada (2026-11-12). Plan y tasks aprobados el 2026-11-13. La implementación queda bloqueada hasta T-00 con evidencia y hasta que `api-010` y `api-013` estén implementados. |
| III. Lógica separada de la interfaz | Sí | Controlador delgado; validación en Form Request; visibilidad en el scope del modelo y en la Action; serialización en Resource; imagen en su propia Action. `web-010` solo presenta. |
| IV. Un test por criterio | Sí | CA-01 a CA-12 con un método nombrado cada uno (tabla de mapeo). CA-11 se comprueba con su propio test. |
| V. Una sola fuente de verdad para los datos | Sí, con excepción D-M1 registrada | Solo lectura de `visitor_memories`. Sin migraciones, sin escrituras, sin borrado físico. **Excepción D-M1 (decisión del 2026-11-13):** `BaseModel` no existe; `VisitorMemory` usa SoftDeletes sobre `Model`, como decidió `api-010`, y esta spec solo ajusta ese modelo (pregunta 1). Queda como excepción registrada, no como base nueva. No existe ninguna clase `BaseModel` en `apps/api/src/app` (verificado 2026-11-13). |
| VI. Código en inglés, personas en español | Sí | Rutas, clases y campos en inglés (`memories.index`, `ListPublishedMemoriesAction`, `PublicMemoryResource`, `opinion`, `published_at`). Mensajes 422 y documentación en español. |

No hay excepciones que requieran ADR.

## Riesgos y decisiones

- **ADR/DBR:** no se requiere ADR nuevo ni DBR propia. Se apoyan ADR 0010 (gobierno de BD), ADR 0013 (Aiven y portabilidad), ADR 0026 (medios, Aceptado con enmiendas de `species/`) y ADR 0027 (galería dinámica, Aceptado).
- **Bloqueo 1, modelo `VisitorMemory`.** No existe hoy. Se resuelve con la pregunta 1 (resuelta el 2026-11-13). Mientras `api-010` no esté implementada no se escribe código de la Action.
- **Bloqueo 2, disco público de `api-013`.** No está configurado; `api-013` tiene plan y tasks aprobados (2026-11-13), pero su implementación está pendiente. Bloquea T-05, T-15 y el tramo de imagen de T-16.
- **Divergencia 3, `image_url` de un archivo ausente.** `api-012` CA-06 dice que la imagen ausente da `null`. `api-013` CA-11 y su flujo 8 dicen que la API no comprueba la existencia del archivo y que la imagen no carga hasta el `pull`. Son dos decisiones aprobadas que no coinciden. Pregunta 3. Mientras no se resuelva, este plan sigue el texto literal de CA-06.
- **Riesgo: plazo corto.** Con 7 días de vigencia (`api-010`, decisión del 2026-11-12), la lista estará vacía o casi vacía con frecuencia. Es el comportamiento esperado: `web-010` muestra el estado vacío y no rellena la galería. CA-02 cubre la respuesta vacía.
- **Riesgo: `page` sin máximo.** Un `page` muy grande produce un desplazamiento enorme, que puede terminar en error de base de datos (`500`) por desbordamiento. La spec no fija un máximo. Pregunta 4 resuelta: sin tope; riesgo aceptado el 2026-11-13.
- **Riesgo: `filesort`.** El orden no sale del índice de DBR-012. Aceptable con el volumen previsto. T-22 lo mide.
- **Riesgo: comprobación de archivo por fila.** `exists()` se hace por cada fila, como máximo 50. Con disco local es barato. Con almacenamiento de objetos futuro (`docs/propuestas/almacenamiento-objetos-s3.md`, no aprobado) sería una llamada remota por fila. Si cambia el disco, se revisa con una spec nueva.
- **Riesgo: imagen vencida accesible por URL.** La vigencia oculta la foto en la API, pero el archivo queda en `media/memories/` (`api-010` pregunta 3; `api-013` RN-16). Riesgo aceptado y documentado.
- **Riesgo: datos personales en la opinión.** Lo que se publica es lo que aprueba el revisor (`api-010` RN-09 y riesgos). La API no filtra texto libre.
- **Riesgo: `published_until` nulo.** No debería ocurrir (`api-010` lo llena al aceptar). Si ocurre, la fila no se lista (CA-12).
- **Alternativas descartadas:**
  - Reutilizar `ResolveContentImageUrlAction` de `api-008`: descartada (disco literal `'public'`, rutas `news/` y `events/`).
  - Usar `App\Support\PublicCalendar::today()` para la vigencia: descartada (la vigencia es un instante, no un día).
  - `COUNT(*)` para `total`: descartada (`has_more` basta para «Cargar más», como en `api-011`).
  - Ruta de detalle `GET /memories/{id}`: descartada en esta versión (Fuera de alcance).
  - Incluir campos de revisión en el listado para depurar: descartada (CA-05).

## Suposiciones de implementación (no requieren decisión previa)

- Clases en `App\Http\Controllers\Catalog\`, `App\Actions\Catalog\`, `App\Http\Requests\Catalog\` y `App\Http\Resources\Catalog\`, igual que `api-011` y `api-015`. Si `api-010` crea otro espacio de nombres para su revisión, la lectura pública conserva el de catálogo.
- `published_at` se serializa en ISO 8601 con zona UTC (`toIso8601String()`). `api-011` usa solo fecha porque sus campos son fechas de día. Si `web-010` necesita otro formato, se ajusta antes de implementar.
- Los mensajes de `limit` y `page` son los de `api-011` RN-08 (mismo texto para consistencia entre listados).

## Dependencias

| Dependencia | Estado | Qué aporta | Efecto en este plan |
|---|---|---|---|
| `api-010` (Aprobada 2026-11-12; plan y tasks aprobados 2026-11-13) | Sin código aún. Modelo `VisitorMemory` inexistente; `BaseModel` no se crea | Datos, estados, plazo `published_until` y publicación al aceptar | Bloquea T-01 y T-02 (pregunta 1). Fixtures con `DB::table` mientras tanto |
| DBR-012 (Lista para backend; aplicada en `arca_pruebas` 2026-11-11) | Cumplida | Tabla, columnas e índices | T-00 verifica en solo lectura |
| `api-011` (implementada) | Código existente | Patrón de paginación, mensajes, CORS y forma de respuesta | Se replica el patrón |
| `api-013` (Aprobada 2026-11-12; plan y tasks aprobados 2026-11-13) | Disco sin configurar | Disco `media`, clave de configuración, `MEDIA_PUBLIC_URL` y `storage:link` | Bloquea T-05, T-15 y T-25 (pregunta 2) |
| ADR 0026 y ADR 0027 | Aceptados (2026-11-12) | Carpeta compartida y galería dinámica | Marco de riesgo y de consumidor |
| `web-010` | Consumidor | Galería del portal | Sin cambio en esta API |

## Orden y aprobación

### Secuencia

1. **T-00** (solo lectura en `arca_pruebas`): precondiciones. Bloquea todo lo demás.
2. Resolver las preguntas 1 y 2 (bloqueos de modelo y disco).
3. Modelo (T-01), Action de listado (T-02), Form Request (T-03), Resource (T-04), resolver de imagen (T-05), controlador (T-06), ruta (T-07), verificación de CORS (T-08) y verificación de ausencia de migraciones (T-09).
4. Pruebas (T-10 a T-21), en el orden de la spec.
5. `EXPLAIN` (T-22), regresión y `pint` (T-23), documentación (T-24 y T-25) y enlace de artefactos (T-26).

### Aprobaciones requeridas

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec 012 | Aprobada (Jonathan, 2026-11-12) |
| Equipo técnico | Este plan y su Constitution Check | Aprobado: Jonathan, responsable de backend, en nombre del equipo, 2026-11-13 |
| Responsable de BD | Confirmación de que DBR-012 está aplicada en `arca_pruebas` | Aplicada el 2026-11-11 (confirmada por el responsable de BD en la DBR). Confirmación de T-00 pendiente |
| Responsable de `api-010` | Modelo `VisitorMemory` y base de modelo (pregunta 1) | Aprobado: Jonathan, responsable de backend, 2026-11-13 (SoftDeletes sobre `Model`, D-M1). `api-010` implementa el modelo |
| Responsable de `api-013` | Disco público y clave de configuración (pregunta 2) | Clave aprobada: Jonathan, responsable de backend, 2026-11-13 (`filesystems.media_scopes.public`). Configuración pendiente de implementar |

## Preguntas (resueltas el 2026-11-13)

1. **Modelo `VisitorMemory` y `BaseModel`.** ¿Los crea `api-010` antes de implementar `api-012` (propuesta de este plan), o los crea `api-012` como parte de su T-01? Si los crea `api-012`, ¿se decide ya la base de modelo (`BaseModel` con SoftDeletes) o se acepta otra base?
   **Resuelta (2026-11-13, Jonathan): se adopta la propuesta y la decisión de `api-010`.** `api-010` crea `VisitorMemory` y `VisitorMemoryReview` (su T-04) con SoftDeletes sobre `Model` (D-M1). No se crea `BaseModel`: es la decisión ya tomada en `api-010`. Esta decisión sustituye la frase «No es una excepción» de la fila V.
2. **Disco público de `api-013`.** ¿Qué clave de configuración se usa para el disco público (sin el literal `'media'` ni `'public'` en las Actions)? ¿Cuándo se aprueba el plan de `api-013` y se configura `MEDIA_PUBLIC_URL`? Bloquea T-05, T-15 y T-25.
   **Resuelta en cuanto a la clave (2026-11-13):** `filesystems.media_scopes.public`, leída solo por `ResolveMediaDiskAction::publicDisk()` (`api-013` D-P2 y D-P3). Plan de `api-013` aprobado el 2026-11-13. La configuración sigue pendiente en `api-013`; T-05, T-15 y T-25 siguen bloqueadas hasta entonces.
3. **`image_url` con archivo ausente.** `api-012` CA-06 dice `null` si el archivo no existe. `api-013` CA-11 y su flujo 8 dicen que la API no comprueba la existencia y que la imagen no carga hasta el `pull`. ¿Qué regla se aplica? Propuesta de este plan: comprobación `exists()` por fila (texto literal de CA-06), con un máximo de 50 comprobaciones por respuesta. **Resuelta (2026-11-13, Jonathan): se adopta la propuesta.**
4. **Máximo de `page`.** La spec no fija un tope. Un valor muy grande puede provocar un desbordamiento del desplazamiento y un error `500`. ¿Se fija un máximo de `page` que responda `422`, o se acepta el riesgo? Si se fija, ¿con qué valor?
   **Resuelta (2026-11-13, Jonathan): sin tope de `page`.** No se añade requisito ni 422 nuevo; una página fuera de rango devuelve lista vacía con la forma normal.
5. **`opinion` nula.** Una aceptada sin opinión (`api-010`, opinión opcional) ¿se devuelve con la clave `opinion` en `null` (propuesta de este plan, igual que `image_url`) o se omite la clave? CA-05 enumera las claves; la propuesta mantiene siempre las cuatro. **Resuelta (2026-11-13, Jonathan): se adopta la propuesta.** `opinion` siempre presente, en `null` si no hay opinión.

## Revisión

- Redactado: 2026-11-12, a partir de la spec 012 Aprobada, de DBR-012 (Lista para backend) y de los patrones de `api-011` y `api-015`.
- Aprobación técnica: Jonathan, responsable de backend, 2026-11-13.
- Evidencia de precondiciones: pendiente (T-00).
