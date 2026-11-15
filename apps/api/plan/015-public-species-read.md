# Plan técnico · 015 · public-species-read

- Spec: `apps/api/specs/015-public-species-read.md`
- Estado de spec: Aprobada (Jonathan, responsable de backend, 2026-11-12). Aprobar no autoriza implementar.
- Estado: **Aprobado** (Jonathan, responsable de backend, 2026-11-13). Implementación pendiente de iniciar; coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Aviso vigente: la implementación depende de `api-014` implementada y de la configuración del disco `media` de `api-013`, pendientes según la sección de precondiciones. Preguntas 1 a 7 resueltas el 2026-11-13 (sección «Preguntas»).
- Responsable técnico: Jonathan (responsable de backend); aprobación técnica del plan cumplida el 2026-11-13.
- Precondición de ejecución: DBR-013 en **«Lista para backend»**. Cumplida desde el 2026-11-12: DBR-013 está en «Lista para backend» y su migración (`apps/api/src/database/migrations/2026_11_12_000013_species_publication_requests_schema.php`) está aplicada en `arca_pruebas` (lote 5), verificada por consulta de solo lectura. Pendiente de BD: EXPLAIN (T-29).
- Consumidores: `web-011` (`apps/web`, TulanPedia; consumidor, sin cambios en este plan). Sin cambios en `apps/mobile`, `apps/dashboard`, `packages/api-client` ni en `api-006`.
- Dependencias: `api-014` (fuente de los datos publicados; Aprobada, no implementada), DBR-013, ADR 0026 (Aceptado, con enmienda de `media/species/`), ADR 0028 (Aceptado), `api-013` (**Aprobada** 2026-11-12: disco `media` y `MEDIA_PUBLIC_URL`, aún sin configurar), `api-011` (CORS por ambiente y formato de respuestas públicas).

## Diseño de solución

La API expone una ruta pública, de solo lectura, con nombre `published-species.index` (`GET /api/v1/published-species`). Lee únicamente la tabla `species`, con las columnas que añade DBR-013 (`is_published`, `published_fields`, `image_path`, `deleted_at`) y `distribution` para `origin`. No lee `species_publication_requests`, no escribe, no crea Activitylog y no añade migraciones (RN-01, RN-02).

Flujo de cada petición:

1. Ruta nombrada, fuera de cualquier middleware de autenticación.
2. `PublishedSpeciesController::index` (delgado): recibe la petición validada y delega. No contiene reglas.
3. `ListPublishedSpeciesRequest` (Form Request): recorta espacios, valida `habitat`, `name` y `category`, y devuelve `422` con mensajes en español. Ignora los parámetros desconocidos.
4. `ListPublishedSpeciesAction`: consulta única con la regla de visibilidad (`is_published = 1` y `deleted_at IS NULL`), los filtros que llegan y el orden `common_name`, `id`. No hay paginación (RN-12) ni carga de `animals`.
5. `PublishedSpeciesResource`: serializa con una lista blanca de claves. Siempre emite `id`, `common_name`, `category` e `image_url`; añade las claves de `published_fields` que están en la lista permitida (`scientific_name`, `origin`, `habitat`). El resto de claves se ignora, incluso si aparecen en la base (RN-06).
6. `ResolvePublishedSpeciesImageUrlAction`: única ruta de lectura de la imagen. Solo acepta rutas bajo `species/` del disco de medios configurado y comprueba que el archivo existe; en otro caso devuelve `null` (RN-07, CA-08).

Decisiones de diseño:

- **Visibilidad en la consulta, no en el controlador.** `is_published = 1` y `deleted_at IS NULL` se escriben en `ListPublishedSpeciesAction` (CA-11, RN-03). El filtro de `deleted_at` es explícito porque el modelo `Species` todavía no usa SoftDeletes (ver Riesgos y pregunta 2).
- **Estado de la solicitud fuera de la lectura.** La visibilidad depende solo de `species.is_published`. Una solicitud `update` viva no cambia lo que se lista (CA-17, CA-18, RN-03).
- **Lista blanca de campos en el Resource.** Ninguna clave se copia de forma automática desde el modelo. Así las claves de RN-08 (`is_published`, `published_at`, `published_fields`, `image_path`, `created_by`, `reviewed_by`, `reviewed_at`, `rejection_reason`, `species_request_id`) no llegan a la respuesta, aunque el modelo las tenga.
- **Nombre de la clave `origin`.** La respuesta usa `origin`, aunque el dato sale de `species.distribution` (DBR-013, decisión 2a=A). `api-006` expone el mismo dato como `distribution`; ese contrato no cambia.
- **Filtros con comparación binaria tras `LOWER(TRIM(...))`.** Ver la sección de SQL de filtros: así se respeta la decisión 8 de la spec (no se normalizan acentos) y se ignoran las mayúsculas.
- **Sin paginación.** Igual que `api-006` RN-07 (catálogo pequeño). Si crece, se abre una spec de paginación (pregunta 3 de la spec, resuelta).

## Contrato y datos

### Endpoint

| Método | Ruta | Nombre | Auth | Éxito | Error |
|---|---|---|---|---|---|
| `GET` | `/api/v1/published-species` | `published-species.index` | Ninguna (público) | `200 {"data":[...]}` | `422` por parámetros inválidos; `500` si la BD falla |

Sin `meta`. Colección vacía: `200 {"data": []}`. No hay ruta de detalle (fuera de alcance de la spec).

### Parámetros (todos opcionales)

| Parámetro | Regla tras recortar espacios | Coincidencia | Mensaje 422 (`errors.<clave>`) |
|---|---|---|---|
| `habitat` | `sometimes`, `required`, `string`, `min:1`, `max:150` | igualdad del valor normalizado, solo entre especies que publican `habitat` | «El hábitat debe tener de 1 a 150 caracteres.» |
| `name` | `sometimes`, `required`, `string`, `min:1`, `max:150` | contiene el texto (`LIKE` con `%` y `_` escapados), sin distinguir mayúsculas | «El nombre debe tener de 1 a 150 caracteres.» |
| `category` | `sometimes`, `required`, `string`, `in:mammal,bird,reptile,amphibian,fish,invertebrate` | igualdad | «Tipo de animal no válido.» |

Notas de implementación de la validación:

- `sometimes` aplica la regla solo si la clave llega. `required` rechaza la cadena vacía o de solo espacios, porque `ConvertEmptyStringsToNull` la convierte en `null` antes de validar. Así `?habitat=` responde `422` (CA-04), y no se trata como «sin filtro».
- `prepareForValidation` recorta espacios solo en las tres claves y solo si el valor es cadena. Los arreglos (`?habitat[]=x`) fallan la regla `string` y reciben el mensaje en español.
- Los mensajes de `required`, `string`, `min` y `max` de `habitat` y `name` se sobrescriben con el texto de la tabla, para que CA-07 se cumpla sin mensajes genéricos de Laravel.
- Errores con la forma estándar de Laravel: `{"message": "<mensaje>", "errors": {"<clave>": ["<mensaje>"]}}`. La API responde JSON en `api/*` y los tests usan `getJson`.

### SQL de los filtros (sin entrada del usuario en el texto SQL)

- **Visibilidad base:** `species.is_published = 1 AND species.deleted_at IS NULL`.
- **`habitat`:** `JSON_CONTAINS(species.published_fields, '"habitat"')` (Eloquent: `whereJsonContains`) y `LOWER(TRIM(species.habitat)) COLLATE utf8mb4_bin = ?`, con el valor enviado recortado y pasado por `mb_strtolower` como parámetro vinculado.
- **`name`:** `LOWER(species.common_name) COLLATE utf8mb4_bin LIKE ?`, con el valor recortado, en minúsculas, y escapado con `addcslashes($valor, '%_\\')`, envuelto en `%...%`. El escape de MySQL por defecto es la barra invertida.
- **`category`:** `species.category = ?` (el valor ya está en la lista cerrada).
- **Combinación:** los filtros presentes se añaden con `AND`. Un filtro ausente no se aplica.
- **Orden:** `ORDER BY species.common_name ASC, species.id ASC`.

Motivo del `COLLATE utf8mb4_bin`: la collation por defecto `utf8mb4_unicode_ci` no distingue acentos (`á` = `a`). Con ella, `?name=aguila` encontraría «Águila», y la decisión 8 de la spec dice que no se normalizan acentos. Ver pregunta 1.

### Campos de la respuesta

Siempre:

| Clave | Origen |
|---|---|
| `id` | `species.id` |
| `common_name` | `species.common_name` |
| `category` | `species.category` (`null` si no tiene valor) |
| `image_url` | `ResolvePublishedSpeciesImageUrlAction` con `species.image_path` (`null` si no hay archivo) |

Solo si la clave está en `species.published_fields` (lista permitida):

| Clave en `published_fields` | Clave en la respuesta | Origen | Valor sin dato |
|---|---|---|---|
| `scientific_name` | `scientific_name` | `species.scientific_name` | `null` |
| `origin` | `origin` | `species.distribution` | `null` |
| `habitat` | `habitat` | `species.habitat` | `null` |

Claves de `published_fields` que no están en la lista (`conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity`, `characteristics`, o cualquier otra) no se devuelven, aunque estén en la base (CA-13, RN-06).

Orden de las claves en el JSON: primero las siempre presentes, después `scientific_name`, `origin` y `habitat` en ese orden fijo.

Ejemplo de elemento (predeterminados de `api-014` RN-13):

```json
{
  "id": 3,
  "common_name": "Jaguar",
  "category": "mammal",
  "image_url": "http://localhost:8000/media/species/0b1c-…-….jpg",
  "scientific_name": "Panthera onca",
  "origin": "Sureste de México y Centroamérica",
  "habitat": "Selva tropical y bosques húmedos"
}
```

### Imagen (`ResolvePublishedSpeciesImageUrlAction`)

1. Si `image_path` es `null`, devuelve `null`.
2. Si la ruta no empieza por `species/`, contiene `..` o `\`, devuelve `null`. Así ninguna respuesta puede contener una URL de `species-requests/` (CA-08).
3. Consulta el disco de medios configurado por api-013 (el nombre sale de configuración, nunca de un literal en la Action; api-013 CA-02). Si `Storage::disk(...)->exists($ruta)` es falso, devuelve `null` sin error (CA-08).
4. Devuelve `Storage::disk(...)->url($ruta)`. Con `MEDIA_PUBLIC_URL` vacía, la URL empieza por `APP_URL` más `/media/` (api-013 CA-17).

### Datos y DBR

- **Sin DBR propia y sin migraciones.** El esquema lo define DBR-013 (ver la tabla siguiente).
- Columnas que se leen: `species.id`, `common_name`, `scientific_name`, `category`, `distribution`, `habitat`, `image_path`, `published_fields`, `is_published`, `deleted_at`.
- Índices de DBR-013 relevantes: `idx_species_is_published` (`species(is_published)`) e `idx_species_is_published_unpublished_at` (`species(is_published, unpublished_at)`). Ver la comprobación EXPLAIN (T-29).
- `published_fields` es JSON. El modelo lo convierte a `array` con un `cast` (T-01). Un valor `NULL` con `is_published = 1` se trata como lista vacía (pregunta 4).
- Los tests crean las filas con Eloquent o con `DB::table` dentro de `DatabaseTransactions` sobre `arca_pruebas`. Nada de esto es una migración ni un cambio de esquema.

### Errores y compatibilidad

- `422` con los mensajes de la tabla de parámetros.
- `500` si la BD no responde: el portal muestra su estado de error (`web-011` CA-07).
- Sin `Access-Control-Allow-Origin` si el origen no está en `CORS_ALLOWED_ORIGINS` (el navegador bloquea la lectura).
- No hay cambio de contrato para `api-006` ni para `web-011`.
- Efecto conocido en `api-006` (ver Riesgos): las correcciones que `api-014` escribe en `species` también aparecen en `GET /api/v1/species` para especies con animales. Es un efecto de datos, no de contrato.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / modelo | `apps/api/src/app/Models/Species.php` (ajuste mínimo) | `cast` de `published_fields` a `array`. No se añade `SoftDeletes` aquí (pregunta 2). |
| API / Actions | `apps/api/src/app/Actions/Catalog/ListPublishedSpeciesAction.php` (nuevo) | Visibilidad, filtros, orden. Sin escrituras. |
| API / Actions | `apps/api/src/app/Actions/Catalog/ResolvePublishedSpeciesImageUrlAction.php` (nuevo) | Única ruta de lectura de `image_path` → `image_url` (RN-07). |
| API / validación | `apps/api/src/app/Http/Requests/Catalog/ListPublishedSpeciesRequest.php` (nuevo) | Recorte, reglas y mensajes 422 en español. |
| API / Resources | `apps/api/src/app/Http/Resources/Catalog/PublishedSpeciesResource.php` (nuevo) | Lista blanca de claves; llama al resolver de imagen. |
| API / HTTP | `apps/api/src/app/Http/Controllers/Catalog/PublishedSpeciesController.php` (nuevo) | `index` delgado. No se toca `SpeciesController` (api-006). |
| API / rutas | `apps/api/src/routes/api.php` (ajuste) | Añadir `GET /published-species` con `->name('published-species.index')`, fuera de middleware de autenticación, junto a las rutas de `species`. |
| API / configuración | `apps/api/src/config/cors.php` (sin cambio), `apps/api/src/.env.example` (verificar) | `CORS_ALLOWED_ORIGINS` ya incluye `http://localhost:8080`. |
| API / pruebas | `apps/api/src/tests/Feature/Catalog/PublishedSpeciesTest.php` (nuevo) | Un método por CA-01 a CA-11, CA-13 a CA-18. |
| API / pruebas | `apps/api/src/tests/Feature/Catalog/PublishedSpeciesCoverageTest.php` (nuevo) | CA-12: comprueba los nombres de los tests y el uso de `DatabaseTransactions`. |
| API / documentación | `apps/api/docs/contenido-publico.md` (ajuste: añadir sección) | Referencia del endpoint, parámetros, errores y campos. |
| Infraestructura | `infra/README.md` (ajuste; lo hace el PR de implementación) | Condiciones de ambiente: DBR-013 aplicada, disco `media`, `storage:link`, CORS, evidencia con `curl`. |
| Cliente(s) | Ninguno en este plan | `web-011` consumirá el endpoint en su propio plan. |
| Paquetes | Ninguno | `packages/api-client` no cambia. |
| Datos | Ninguno | DBR-013 es prerrequisito, no parte de este plan. |

## Seguridad, offline y operación

- Ruta pública de solo lectura. No se leen cookies, `Authorization` ni sesión. No hay Activitylog en lecturas (CA-09).
- Entradas: `habitat`, `name` y `category` tienen longitud y lista cerrada. Todo valor va como parámetro vinculado; el texto SQL es fijo.
- Salida: lista blanca de claves (RN-06, RN-08). Sin rutas internas, sin `image_path`, sin datos de personal.
- Imagen: solo rutas `species/`, comprobadas en disco. Ningún enlace a `species-requests/` (RN-07).
- Rate limit: no se añade en esta spec, igual que `api-011` (catálogo público y pequeño). Riesgo aceptado; se revisa si el tráfico crece.
- Caché: ninguna en servidor ni CDN. El navegador puede cachear; no es responsabilidad de esta spec.
- Portabilidad (ADR 0013): `JSON_CONTAINS`, `LIKE` con escape por defecto, `LOWER` y `COLLATE utf8mb4_bin` existen en MySQL 8.0.x, en Aiven y en local. Configuración solo por `.env` (`CORS_ALLOWED_ORIGINS`, `APP_URL`, `MEDIA_PUBLIC_URL` y el disco de medios).
- Ambientes: `arca_pruebas` es la base de todos los tests. `arca_zoo` no se usa.
- Operación: el checklist de `infra/README.md` (T-31).

## Mapeo de criterios a pruebas

Todas las pruebas son PHPUnit en `apps/api/src/tests/Feature/Catalog/`, usan `DatabaseTransactions` sobre `arca_pruebas` y llaman a la ruta con `getJson` o `get`. Nunca usan `RefreshDatabase`, `migrate:fresh` ni migraciones.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_ca01_only_published_species_are_listed` | `PublishedSpeciesTest.php` |
| CA-02 | `test_ca02_orders_by_common_name_and_returns_empty_list` | `PublishedSpeciesTest.php` |
| CA-03 | `test_ca03_public_fields_only` | `PublishedSpeciesTest.php` |
| CA-04 | `test_ca04_habitat_filter_matches_normalized_value` | `PublishedSpeciesTest.php` |
| CA-05 | `test_ca05_name_filter_is_literal_and_case_insensitive` | `PublishedSpeciesTest.php` |
| CA-06 | `test_ca06_filters_combine_with_and` | `PublishedSpeciesTest.php` |
| CA-07 | `test_ca07_invalid_filters_return_422_in_spanish` | `PublishedSpeciesTest.php` |
| CA-08 | `test_ca08_image_url_only_from_species_folder` | `PublishedSpeciesTest.php` (con `Storage::fake`) |
| CA-09 | `test_ca09_read_only_without_session_and_without_activitylog` | `PublishedSpeciesTest.php` |
| CA-10 | `test_ca10_cors_allows_only_configured_origin` | `PublishedSpeciesTest.php` |
| CA-11 | `test_ca11_route_name_and_thin_controller` | `PublishedSpeciesTest.php` |
| CA-12 | `test_ca12_suite_names_every_criterion_and_uses_database_transactions` | `PublishedSpeciesCoverageTest.php` |
| CA-13 | `test_ca13_published_fields_select_response_keys` | `PublishedSpeciesTest.php` (tres combinaciones) |
| CA-14 | `test_ca14_habitat_filter_ignores_unpublished_habitat` | `PublishedSpeciesTest.php` |
| CA-15 | `test_ca15_category_filter_returns_only_matching_species` | `PublishedSpeciesTest.php` |
| CA-16 | `test_ca16_invalid_category_returns_422_in_spanish` | `PublishedSpeciesTest.php` |
| CA-17 | `test_ca17_pending_update_keeps_published_version` | `PublishedSpeciesTest.php` |
| CA-18 | `test_ca18_unpublished_or_deleted_species_are_hidden_even_with_live_request` | `PublishedSpeciesTest.php` |

Notas por criterio:

- **CA-01:** el conjunto de fixtures tiene las seis especies del escenario, incluida la publicada con `deleted_at` no nulo. Se verifica que solo sale la publicada sin borrar.
- **CA-04 y CA-05:** además de lo que pide la spec, cada test comprueba la decisión 8: `Sélva` no coincide con `Selva` y `Jaguar` no coincide con `jaguár`. Es una aserción adicional que deriva de la decisión aprobada, no un requisito nuevo.
- **CA-08:** los archivos se crean con `Storage::fake(<disco de api-013>)`. Nunca se escribe en `apps/api/src/media/`, que es una carpeta versionada (api-013 CA-22).
- **CA-09:** se cuenta `activity_log` antes y después de la petición.
- **CA-10:** se sobrescribe `config('cors.allowed_origins')` dentro del test. No se cambia `.env`.
- **CA-17 y CA-18:** las solicitudes `update` se insertan con `DB::table('species_publication_requests')`. Así el test no depende de que `api-014` esté implementada.
- **CA-12:** el test lee el archivo de `PublishedSpeciesTest.php` y comprueba que cada CA-01 a CA-18 tiene un método nombrado, que el archivo usa `DatabaseTransactions` y que no aparece `RefreshDatabase` ni `migrate`.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel 12, PHP 8.4, Eloquent y MySQL 8.0.x. Sin dependencias nuevas, sin SDK de nube, sin ADR nuevo. Conexión y URLs por `.env`. |
| II. La spec manda | Sí, con condición | Spec 015 Aprobada (2026-11-12) con plan y tasks del mismo NNN-slug, aprobados el 2026-11-13. DBR-013 ya está en «Lista para backend». La implementación queda bloqueada hasta implementar `api-014` y la configuración del disco de `api-013`. |
| III. Lógica separada de la interfaz | Sí | Controlador delgado; validación en Form Request; reglas de visibilidad y filtros en Action; serialización en Resource; imagen en su propia Action. No hay UI en esta spec. |
| IV. Un test por criterio | Sí | CA-01 a CA-18 con un método nombrado cada uno (tabla de mapeo). CA-12 se comprueba con su propio test. |
| V. Una sola fuente de verdad para los datos | Sí, con excepción registrada | Solo lectura de `species`; sin migraciones, sin escrituras, sin borrado físico. **Brecha:** `Species` extiende `Model` (no `BaseModel`) y no usa SoftDeletes; la Constitución V lo exige para modelos de negocio. Se mitiga con el filtro explícito de `deleted_at` (CA-01, RN-03). La pregunta 2 queda resuelta el 2026-11-13: `api-014` T-03 añade SoftDeletes a `Species` (decisión F, la misma excepción de `api-014`). Este plan no lo añade ni crea `BaseModel`. |
| VI. Código en inglés, personas en español | Sí | Rutas, clases, claves y campos en inglés (`published-species.index`, `ListPublishedSpeciesAction`, `PublishedSpeciesResource`, `habitat`, `origin`). Mensajes 422 y documentación en español. |

No hay excepciones que requieran ADR. La brecha de V se cierra con una decisión, no con una excepción.

## Riesgos y decisiones

- **ADR/DBR:** no se requiere ADR nuevo ni DBR propia. Se apoyan ADR 0013 (Aiven), ADR 0026 (medios, Aceptado con enmienda de `species/`) y ADR 0028 (catálogo dinámico, Aceptado).
- **Bloqueo 1, DBR-013 (resuelto el 2026-11-12).** Las columnas y los índices están aplicados en `arca_pruebas`. T-00 sigue siendo la puerta de entrada y solo lee; T-01 no empieza hasta que T-00 deje constancia de la evidencia.
- **Bloqueo 2, api-013 Aprobada (2026-11-12) y sin disco configurado.** El disco `media`, `MEDIA_PUBLIC_URL` y la regla de `species/` dependen de esa spec. Sin ella, `image_url` no tiene origen configurado (CA-08). Mitigación: T-09 y T-22 esperan a api-013, o se acuerda una configuración provisional por escrito (pregunta 3).
- **Riesgo: collation insensible a acentos.** Si se usa la collation de la tabla sin cambio, `habitat` y `name` no respetan la decisión 8. Mitigación: `LOWER(...) COLLATE utf8mb4_bin` y las aserciones de CA-04 y CA-05. Pregunta 1.
  - **Colaciones observadas en `arca_pruebas` (2026-11-12):** `species.*` usa `utf8mb4_0900_ai_ci` y `species_publication_requests.*` usa `utf8mb4_unicode_ci`. Ambas son insensibles a acentos (`ai`) y a mayúsculas (`ci`), así que la comparación con la collation de la tabla no respeta la decisión 8 en ninguna de las dos. Esta observación confirma el riesgo y no cambia la decisión 8 ni la mitigación anterior.
- **Riesgo: el filtro `habitat` no usa índice.** `JSON_CONTAINS` y `LOWER(TRIM(...))` obligan a recorrer las publicadas. Con el catálogo pequeño es aceptable. T-29 lo mide con EXPLAIN.
- **Riesgo: `exists()` por cada especie.** Una comprobación de archivo por fila. Con disco local es barata. Con almacenamiento de objetos futuro (`docs/propuestas/almacenamiento-objetos-s3.md`, no aprobado) sería una llamada remota por fila. Mitigación: si el catálogo crece o cambia el disco, pasar la comprobación a un solo listado o a un campo de estado (spec nueva).
- **Riesgo: datos compartidos con `api-006`.** Las correcciones de `api-014` cambian `species`, que también lee `GET /api/v1/species` (app móvil). Sin cambio de contrato; aviso informativo al equipo de `mobile`, sin cambios en sus specs ni código (spec, RN-11).
- **Riesgo: `published_fields` NULL con `is_published = 1`.** No debería ocurrir (`api-014` exige `published_fields` al publicar), pero si ocurre, la respuesta trae solo las claves siempre presentes. Pregunta 4.
- **Riesgo: dos rutas con nombres parecidos.** `/species` (app) y `/published-species` (portal). Mitigación: nombres de ruta distintos y la tabla de diferencias de la spec.
- **Riesgo: `api-014` sin implementar.** Los datos de CA-17 y CA-18 llegan por tests con fixtures. Cuando `api-014` esté implementada, hay que volver a ejecutar esos tests con sus flujos reales.
- **Alternativas descartadas:**
  - Ampliar `GET /api/v1/species` (`api-006`): descartada por la spec (cambia el contrato de la app móvil).
  - Filtrar con la collation por defecto: descartada (acentos, decisión 8).
  - Unir con `species_publication_requests` para decidir visibilidad: descartada (RN-02, RN-03; CA-18 exige ignorar la solicitud viva).
  - Devolver todas las claves de `published_fields` sin lista blanca: descartada (permitiría `diet` o `longevity` si se guardan en la base).

## Estrategia de pruebas y riesgos de ejecución

- Suite: PHPUnit (Feature), contra `arca_pruebas`, con `DatabaseTransactions`. Un método por CA (tabla de mapeo).
- Fixtures: `Species` (Eloquent, `timestamps = false`) y `DB::table('species_publication_requests')` para las solicitudes. No se usan factories de otras features.
- Archivos: `Storage::fake(...)` para todo lo que toque medios.
- Pruebas de regresión: `api-006` (`PublicCatalogTest.php`) y la suite de `api-011` deben seguir verdes sin cambios.
- Calidad: `php artisan test` y `vendor/bin/pint --test` sobre los archivos tocados (T-30). Los fallos ya existentes se registran aparte.
- Ejecución: la hace el agente de implementación o el equipo, nunca el redactor de documentos. Sin evidencia no se marca nada (T-30, T-33).

## Orden y aprobación

### Secuencia

1. **T-00** precondiciones (solo lectura en `arca_pruebas`). Bloquea todo lo demás.
2. Modelo (T-01), Action base (T-02), filtros (T-03 a T-06).
3. Form Request (T-07), resolver de imagen (T-09), Resource (T-08).
4. Controlador y ruta (T-10). Verificaciones de CORS y de no cambio en `api-006` (T-11, T-12).
5. Pruebas (T-13 a T-28), en el orden de la spec.
6. EXPLAIN (T-29), verificación completa (T-30).
7. Infra y documentación (T-31, T-32). Estado de la spec y PR (T-33).

### Aprobaciones requeridas

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec 015 | Aprobada (Jonathan, 2026-11-12) |
| Equipo técnico | Este plan y su Constitution Check | Aprobado: Jonathan, responsable de backend, en nombre del equipo, 2026-11-13 |
| Responsable de BD | Confirmación de que DBR-013 está aplicada en `arca_pruebas` (sin DBR propia) | Pendiente de confirmación de BD. Evidencia de solo lectura del 2026-11-12 disponible (lote 5); fecha y responsable por registrar (evidencia de T-00) |
| Responsable backend | DBR-013 «Lista para backend» | Cumplido el 2026-11-12 (migración aplicada en `arca_pruebas`); EXPLAIN pendiente de BD |
| Responsable de `api-013` | Disco `media`, `MEDIA_PUBLIC_URL` (`api-013` CA-17 y RN-04) | Pendiente (api-013 Aprobada 2026-11-12; disco sin configurar) |

## Preguntas (resueltas el 2026-11-13)

1. **Collation de `habitat` y `name`.** ¿Se acepta la comparación binaria tras `LOWER` (sensible a acentos, insensible a mayúsculas), como exige la decisión 8, o se acepta la insensibilidad a acentos de `utf8mb4_unicode_ci`?
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación.** Comparación binaria tras `LOWER`, como exige la decisión 8 de la spec. Afecta a T-03, T-04, T-16 y T-18.
2. **Modelo `Species`.** ¿`T-01` añade `SoftDeletes` ya, o lo hace `api-014` (RN-20, RN-22)? ¿Cuándo se convierte `Species` en modelo de negocio con `BaseModel`? Mientras tanto, el filtro explícito de `deleted_at` se mantiene.
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación.** `api-014` T-03 añade `SoftDeletes` a `Species`; este plan no lo añade, mantiene el filtro explícito de `deleted_at` y no crea `BaseModel` (decisión F). Afecta a T-01.
3. **api-013.** ¿Cuándo se aprueba y se implementa la configuración del disco `media` y de `MEDIA_PUBLIC_URL`? ¿Cuál es el nombre de la clave de configuración del disco público (sin literal `'media'` en las Actions, api-013 CA-02)? Bloquea T-09 y T-22.
   **Resuelta en cuanto a la clave y la aprobación (2026-11-13):** `filesystems.media_scopes.public`, leída solo por `ResolveMediaDiskAction::publicDisk()`. Plan de `api-013` aprobado el 2026-11-13. La configuración del disco sigue pendiente en `api-013`; T-09 y T-22 siguen bloqueadas hasta entonces.
4. **Datos inconsistentes.** Una especie con `is_published = 1` y `published_fields` NULL: ¿se trata como lista vacía (propuesta de este plan) o se considera error de datos que debe corregirse?
   **Resuelta (2026-11-13, Jonathan): se adopta la propuesta.** Se trata como lista vacía. Afecta a T-08 y T-26.
5. **Lugar del cálculo de la URL.** ¿Se acepta `ResolvePublishedSpeciesImageUrlAction` como Action dedicada (propuesta), que cumple «un único punto de la Action» de RN-07? ¿O debe vivir dentro de `ListPublishedSpeciesAction`?
   **Resuelta (2026-11-13, Jonathan): se adopta la propuesta.** Action dedicada `ResolvePublishedSpeciesImageUrlAction`.
6. **Aprobador del plan y de las tasks.** ¿Quién aprueba técnicamente este plan y las tasks: Jonathan, como responsable de backend?
   **Resuelta (2026-11-13): Jonathan, responsable de backend, aprobó el plan y las tasks en nombre del equipo.**
7. **Fixtures de CA-17 y CA-18.** ¿Se acepta que los tests inserten `species_publication_requests` con `DB::table` antes de que `api-014` esté implementada, con el riesgo de desalineación que se anota arriba?
   **Resuelta (2026-11-13, Jonathan): se adopta la propuesta.** Sí, con el riesgo anotado: al implementar `api-014` se repiten los tests de CA-17 y CA-18 con sus flujos reales.

## Revisión

- Redactado: 2026-11-12, a partir de la spec 015 Aprobada y de DBR-013 (Aprobada; migración aplicada en `arca_pruebas` el 2026-11-12, lote 5).
- Aprobación técnica: Jonathan, responsable de backend, 2026-11-13.
- Evidencia de precondiciones: pendiente (T-00).
