# Plan técnico · 011 · public-news-read

- Spec: `apps/api/specs/011-public-news-read.md`
- Estado de spec: Aprobada (Jonathan, 2026-11-07).
- Estado del plan: Aprobado (Jonathan, 2026-11-07), con las decisiones del usuario sobre zona horaria, origen de desarrollo, detalle al expandir, paginación (10 por defecto, máximo 50), `422` ante parámetros inválidos y `limit` en `GET /events` sin `page`.
- Responsable técnico: por identificar (backend)
- Consumidores: `web-009` (`apps/web`, portada, página de noticias y detalle al expandir); `mobile-003` (`apps/mobile`, solo `GET /events` sin `limit`, sin cambios)

## Diseño de solución

Se añaden dos rutas públicas de solo lectura para noticias (`news.index` y `news.show`) y un parámetro `limit` opcional a la ruta de eventos ya existente (`events.index`). No hay autenticación, escrituras ni cambios de esquema: se leen las tablas `news` y `events` tal como existen.

La regla de visibilidad de noticias se expresa una sola vez como consulta reutilizable del modelo `News` (scope `publicVisible`). Las dos Actions de noticias la usan, igual que `ListEventsAction` y `GetEventAction` (código de `api-006`) repiten su regla hoy. Así, el listado y el detalle no pueden divergir.

Flujo de cada petición: ruta nombrada → controlador HTTP delgado (`ctype_digit` para identificadores, como `EventController`) → Form Request para `limit` y `page` → Action → API Resource. La validación de parámetros vive en Form Requests; la lógica de visibilidad, en el scope y las Actions; la serialización, en Resources.

Paginación simple sin conteo total: se pide `limit + 1` elementos; si llega el extra, `has_more` es `true` y se descarta. Esto evita `COUNT(*)` en cada petición.

### Zona horaria de «hoy» (RN-14, decisión de 2026-11-07)

- «Hoy» para la visibilidad pública se obtiene con un único punto, `App\Support\PublicCalendar::today()` (nuevo): `CarbonImmutable::now(config('arca.public_timezone'))->toDateString()`, con `public_timezone = 'America/Mexico_City'` en `config/arca.php`.
- `config/app.php` no cambia: `timezone` sigue en `UTC`, y el resto de la API (reportes, boletos, progreso) no cambia.
- El scope `publicVisible()` de `News` y las Actions de eventos (`ListEventsAction`, `GetEventAction`) usan `PublicCalendar::today()`. Sustituyen el `now()->toDateString()` actual de `api-006`. Es un cambio de zona, no de contrato, y se anota en `api-006` (T-14).
- Frontera de prueba (corrige la versión anterior de este plan): `2026-11-07 05:30 UTC` equivale a `2026-11-06 23:30` en Tulancingo (UTC−6; `America/Mexico_City` no tiene horario de verano desde 2022). Con `Carbon::setTestNow('2026-11-07 05:30:00', 'UTC')` «hoy» es `2026-11-06`. La versión anterior citaba «23:30 UTC frente a 18:30 local», que no cruza el día (23:30 UTC son 17:30 locales), por eso se descarta.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / configuración | `apps/api/src/config/arca.php` (ajuste) | Clave `public_timezone` = `America/Mexico_City`. `config/app.php` no cambia. |
| API / soporte | `apps/api/src/app/Support/PublicCalendar.php` (nuevo) | `today(): string` en la zona `arca.public_timezone`. Único punto de «hoy» público (RN-14). |
| API / modelo | `apps/api/src/app/Models/News.php` (ajuste) | Scope `publicVisible()`: `is_active = true`, `published_date <= hoy`, `end_date` nulo o `>= hoy`, con `PublicCalendar::today()`. `SoftDeletes` ya excluye las borradas. |
| API / validación | `apps/api/src/app/Http/Requests/Catalog/ListPublicNewsRequest.php` (nuevo) | `limit`: entero 1..50, opcional; `page`: entero mínimo 1, opcional. Mensajes en español. |
| API / validación | `apps/api/src/app/Http/Requests/Catalog/ListPublicEventsRequest.php` (nuevo) | `limit`: entero 1..50, opcional. Mensajes en español. |
| API / Actions | `apps/api/src/app/Actions/Catalog/ListPublishedNewsAction.php` (nuevo) | Consulta paginada (`limit + 1`), orden `published_date desc`, `id desc`. |
| API / Actions | `apps/api/src/app/Actions/Catalog/GetPublishedNewsAction.php` (nuevo) | Busca por `id` dentro de `publicVisible()`; `null` si no es visible. |
| API / Actions (`api-006`) | `apps/api/src/app/Actions/Catalog/ListEventsAction.php` (ajuste) | Acepta `?int $limit = null`; aplica `limit()` solo si viene. Usa `PublicCalendar::today()` en lugar de `now()` (RN-14). Orden sin cambio. |
| API / Actions (`api-006`) | `apps/api/src/app/Actions/Catalog/GetEventAction.php` (ajuste) | Usa `PublicCalendar::today()` en lugar de `now()` (RN-14). Sin cambio de contrato. |
| API / Resources | `apps/api/src/app/Http/Resources/Catalog/PublicNewsResource.php` (nuevo) | Campos públicos del listado (sin `content`); `image_url` con `ResolveContentImageUrlAction`. |
| API / Resources | `apps/api/src/app/Http/Resources/Catalog/PublicNewsDetailResource.php` (nuevo) | Extiende el anterior y añade `content`. Lo usa `news.show`. |
| API / HTTP | `apps/api/src/app/Http/Controllers/Catalog/NewsController.php` (nuevo) | `index` y `show` delgados; `404` «Noticia no encontrada.» con `abort_unless(ctype_digit(...))`. |
| API / HTTP | `apps/api/src/app/Http/Controllers/Catalog/EventController.php` (ajuste mínimo) | `index` pasa `limit` validado a `ListEventsAction`. Sin lógica nueva. |
| API / rutas | `apps/api/src/routes/api.php` (ajuste) | `news.index` y `news.show` fuera de middleware de autenticación; `events.index` sin cambio de nombre. |
| API / configuración | `apps/api/src/.env.example` (ajuste) | Añadir el origen de desarrollo del portal (`http://localhost:8080`) a `CORS_ALLOWED_ORIGINS` (valor de muestra, sin secretos). `config/cors.php` no cambia. |
| API / pruebas | `apps/api/src/tests/Feature/Catalog/PublicNewsTest.php` (nuevo) | Un test por CA-01 a CA-07, CA-09, CA-10 y CA-12 sobre noticias (incluye `news.show` en CA-10). |
| API / pruebas | `apps/api/src/tests/Feature/Catalog/PublicEventsLimitTest.php` (nuevo) | Tests de `limit` en eventos (CA-08) y de la fecha de eventos en CA-12. No se modifica `PublicCatalogTest.php` de `api-006`. |
| API / documentación | `apps/api/docs/contenido-publico.md` (por crear) | Referencia de los endpoints públicos de noticias y eventos, parámetros, errores y zona horaria. |
| Infraestructura | `infra/README.md` (ajuste) | Requisitos de ambiente: `CORS_ALLOWED_ORIGINS` por ambiente (origen de desarrollo `http://localhost:8080`) y prueba de CORS con `curl`. |
| Paquetes | Ninguno | `packages/api-client` no cambia en esta spec. |
| Datos | Ninguno | Sin DBR ni migración (RN-02). |

## Contrato y datos

### Endpoints (prefijo `/api/v1`, sin autenticación)

| Método | Ruta | Nombre | Auth | Éxito | Error |
|---|---|---|---|---|---|
| `GET` | `/news` | `news.index` | Ninguna | `200 {"data":[...],"meta":{...}}` | `422` por `limit`/`page` inválidos; `500` si la BD falla |
| `GET` | `/news/{news}` | `news.show` | Ninguna | `200 {"data":{...}}` (con `content`) | `404` «Noticia no encontrada.» |
| `GET` | `/events` | `events.index` | Ninguna | `200 {"data":[...]}` (sin `limit`, igual que hoy) | `422` por `limit` inválido |
| `GET` | `/events/{event}` | `events.show` | Ninguna | Sin cambio de contrato (`api-006`); solo cambia la fecha de «hoy» (RN-14) | Sin cambio |

`{news}` se valida con `ctype_digit` en el controlador; un valor no numérico responde `404` antes de consultar la BD.

`news.show` lo llama `web-009` al expandir una tarjeta (CA-14 del portal): una petición por noticia y visita. Por eso el listado no incluye `content` (RN-07 de la spec): mantiene las respuestas pequeñas y el detalle se pide solo cuando el visitante lo necesita.

### Parámetros

- `GET /news`: `limit` (entero 1..50, por defecto 10), `page` (entero mínimo 1, por defecto 1).
- `GET /events`: `limit` (entero 1..50, sin valor por defecto: lista completa).

### `PublicNewsResource` (listado)

```json
{
  "id": 3,
  "title": "Nuevo recorrido por el sendero de aves",
  "description": "Desde el sábado, el sendero …",
  "category": "Aviso a visitantes",
  "published_date": "2026-11-05",
  "start_date": null,
  "end_date": "2026-12-05",
  "image_url": "http://localhost:8000/storage/news/0b1c…-….webp"
}
```

### `PublicNewsDetailResource` (detalle)

Los mismos campos más `"content": "…"`.

### `GET /news` — metadatos de paginación

```json
{
  "data": [ { "id": 3, "…": "…" } ],
  "meta": { "page": 1, "limit": 3, "has_more": true }
}
```

### `GET /events` con `limit`

Igual que `api-006` CA-03 (`{"data": [...]}`), con como máximo `limit` elementos y sin `meta`.

### Errores (formato de Laravel con mensajes en español)

```json
{ "message": "El límite debe ser un número entero entre 1 y 50.", "errors": { "limit": ["El límite debe ser un número entero entre 1 y 50."] } }
```

### Datos y DBR

- Sin DBR y sin migraciones. Columnas usadas: `news.id`, `title`, `description`, `category`, `published_date`, `start_date`, `end_date`, `content` (solo en el detalle), `is_active`, `image_path`, `deleted_at`; `events.*` ya existentes.
- Precondición de despliegue: DBR-005 aplicada en el ambiente (`deleted_at` en `news` y `events`). Sin ella, las consultas fallan.
- Índices: esta spec no añade ninguno. No hay índice documentado sobre `news.published_date` ni sobre `news.deleted_at`; si el volumen lo requiere, se evalúa con datos reales y se tramita como DBR aparte.

### Errores y compatibilidad

- `GET /events` sin `limit` responde igual que hoy (compatibilidad con `mobile-003`).
- `api-006` CA-03 y CA-04 no cambian en contrato. Cambia la fecha de corte de la vigencia (RN-14): ver «Riesgos y decisiones».
- La respuesta de `news` no incluye `image_path`; el campo `image_url` se añade sin retirar nada.

## Seguridad, offline y operación

- Rutas públicas de solo lectura, sin middleware de sesión ni de token. Sin cookies ni `Authorization` en la respuesta.
- No se exponen `author_id`, `is_active`, `image_path`, `deleted_at` ni datos de auditoría (RN-07).
- Entradas validadas: `limit` y `page` como enteros acotados; el identificador se valida con `ctype_digit` (sin inyección, sin consulta si no es número). Eloquent parametriza todas las consultas.
- CORS: `allowed_origins` se toma de `CORS_ALLOWED_ORIGINS`, por ambiente. En desarrollo, `http://localhost:8080` (exacto). `supports_credentials` queda como está; el portal no envía credenciales (`web-009`).
- Límite de tasa: no se añade en esta spec (ver «Fuera de alcance»). Se evaluará en la spec de operación si hay tráfico público alto. Riesgo aceptado para contenido público de bajo volumen.
- Sin caché de servidor ni CDN. El portal puede cachear en el navegador; no es responsabilidad de esta spec.
- Sin datos clínicos, financieros ni personales. Sin Activitylog en lecturas.
- Portabilidad (ADR 0013): solo Eloquent y `.env`; funciona igual en Aiven y MySQL local. `arca_pruebas` es la única base de tests; `arca_zoo` no se usa.
- Operación: la verificación de CORS y de `image_url` forma parte del checklist de `infra/README.md`.

## Mapeo de criterios a pruebas

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_ca01_public_news_read_lists_only_visible_news_without_auth()`: crea noticias de cada tipo y comprueba que solo salen las visibles | `apps/api/src/tests/Feature/Catalog/PublicNewsTest.php` |
| CA-02 | `test_ca02_public_news_read_orders_by_published_date_desc_then_id_and_returns_empty_data()` | `PublicNewsTest.php` |
| CA-03 | `test_ca03_public_news_read_paginates_with_limit_page_and_meta()` | `PublicNewsTest.php` |
| CA-04 | `test_ca04_public_news_read_rejects_invalid_limit_and_page_with_422_in_spanish()` (también para `events`) | `PublicNewsTest.php` |
| CA-05 | `test_ca05_public_news_read_shows_visible_news_and_returns_spanish_404_otherwise()` (incluye `abc` sin consulta) | `PublicNewsTest.php` |
| CA-06 | `test_ca06_public_news_read_does_not_expose_internal_fields()` (listado y detalle) | `PublicNewsTest.php` |
| CA-07 | `test_ca07_public_news_read_resolves_image_url_only_for_managed_paths()` | `PublicNewsTest.php` |
| CA-08 | `test_ca08_public_events_limit_keeps_default_list_and_limits_when_requested()` | `apps/api/src/tests/Feature/Catalog/PublicEventsLimitTest.php` |
| CA-09 | `test_ca09_public_news_read_is_read_only_and_writes_no_audit_rows()` | `PublicNewsTest.php` |
| CA-10 | `test_ca10_public_news_read_sends_cors_header_only_for_allowed_origin()` (en `news.index` y `news.show`; con `http://localhost:8080` permitido y `http://127.0.0.1:8080` no permitido) | `PublicNewsTest.php` |
| CA-11 | Verificación de cobertura: busca `CA-01` a `CA-10` y `CA-12` en `tests/Feature/Catalog/` y confirma `DB_DATABASE=arca_pruebas` | `apps/api/src/tests/Feature/Catalog/PublicNewsTest.php` (`test_ca11_…`) |
| CA-12 | `test_ca12_public_visibility_uses_mexico_city_date_for_news_and_events()`: `Carbon::setTestNow('2026-11-07 05:30:00', 'UTC')`; comprueba noticias y eventos en los bordes de RN-03 y `config('app.timezone') === 'UTC'` | `PublicNewsTest.php` (noticias) y `PublicEventsLimitTest.php` (eventos) |

Todos los tests usan `DatabaseTransactions` sobre `arca_pruebas`. No usan `RefreshDatabase` ni migraciones. Para CA-10 se sobrescribe `config('cors.allowed_origins')` dentro del test; no se cambia el `.env`. Para CA-12 se usa `Carbon::setTestNow` y se restaura en `tearDown`.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel 12, PHP 8.4, Eloquent y MySQL existentes. Sin dependencias nuevas ni servicios propietarios. Configuración por `.env` y `config/arca.php`. |
| II. La spec manda | Sí | Spec 011 Aprobada (Jonathan, 2026-11-07) junto con este plan y sus tasks. |
| III. Lógica separada de la interfaz | Sí | Controladores delgados; validación en Form Requests; reglas de consulta y «hoy» en scope, helper y Actions; serialización en Resources. El portal solo presenta (`web-009`). |
| IV. Un test por criterio | Sí | CA-01 a CA-12 mapeados a `PublicNewsTest` y `PublicEventsLimitTest` (tabla anterior). |
| V. Una sola fuente de verdad para los datos | Sí | Lectura de las tablas existentes; sin escrituras ni migraciones; `SoftDeletes` de `News` excluye las borradas sin borrado físico. |
| VI. Código en inglés, personas en español | Sí | Rutas, clases y campos en inglés (`news.index`, `PublicNewsResource`, `PublicCalendar`, `limit`, `has_more`); mensajes de error y documentación en español. |

No se proponen excepciones: no se requiere ADR ni DBR.

## Riesgos y decisiones

- **ADR/DBR:** ninguno. Se apoyan ADR 0001 (API Laravel), ADR 0010 (gobierno de BD) y ADR 0013 (Aiven).
- **Divergencias con `api-006`** (se anotan en `api-006` en T-14, tras aprobar esta spec; no se cambian sus criterios):
  - `api-006` RN-07 y «Fuera de alcance» excluyen la paginación. Este plan añade `limit` solo a eventos, sin `page`.
  - `api-006` RN-12: «hoy» pasa de `UTC` a `America/Mexico_City` (RN-14). Efecto: un evento con `end_date` igual al día local sigue visible hasta las 24:00 de Tulancingo. Hoy se oculta desde las 18:00 locales. La móvil (`mobile-003`) recibe ese cambio sin cambio de contrato.
- **Zona horaria:** decidida (RN-14). Queda como riesgo de comportamiento descrito arriba, cubierto por CA-12.
- **Orígenes del portal:** deben coincidir exactamente con el origen en el que se sirve el portal. En desarrollo, `http://localhost:8080`; el portal debe arrancarse en `localhost`, no en `127.0.0.1` (ver `web-009` T-22). El origen de producción sigue pendiente (pregunta 2 de la spec).
- **Escalabilidad del listado:** sin índice nuevo; se mide con datos reales si el volumen crece.
- **Alternativas descartadas:**
  - Ruta `/news` con todas las noticias y paginación en el cliente: descartada; el portal no debe recibir contenido no publicado ni filtrar visibilidad.
  - Duplicar la visibilidad en cada Action sin scope: descartada; facilita divergencias entre listado y detalle.
  - `COUNT(*)` para `total`: descartada en esta versión; `has_more` basta para «Cargar más».
  - Cambiar `timezone` de `config/app.php` a `America/Mexico_City`: descartada por decisión del usuario (la zona global no cambia); afectaría reportes y boletos sin necesidad.
  - Incluir `content` en el listado para evitar la petición al expandir: descartada; hace el listado pesado (hasta 50 noticias × 20 000 caracteres) y contradice RN-07.

## Orden y aprobación

1. Spec 011, este plan y su Constitution Check aprobados el 2026-11-07. La pregunta 2 de la spec (origen de producción) queda pendiente y no bloquea.
2. Configuración y soporte: `config/arca.php` (`public_timezone`) y `Support/PublicCalendar`.
3. Modelo: scope `publicVisible()` en `News`.
4. Form Requests y Actions de noticias (`ListPublishedNewsAction`, `GetPublishedNewsAction`) y de eventos (`ListEventsAction` con `limit`; `GetEventAction` y `ListEventsAction` con `PublicCalendar`).
5. Resources (`PublicNewsResource`, `PublicNewsDetailResource`) y controlador `Catalog/NewsController`.
6. Rutas `news.index` y `news.show`; ajuste mínimo de `Catalog/EventController`.
7. Configuración: `.env.example` (CORS con `http://localhost:8080`) y verificación de `config('cors.allowed_origins')`.
8. Tests CA-01 a CA-12; `php artisan test` contra `arca_pruebas`; `vendor/bin/pint --test` sobre los archivos tocados.
9. Documentación: `apps/api/docs/contenido-publico.md` (por crear) y nota en `infra/README.md`.
10. Verificación manual: `php artisan serve`, `curl` a cada ruta y prueba de CORS con `Origin` permitido y no permitido.

**Dependencias:** `api-008` (implementada en código), DBR-005 aplicada, `web-009` (consumidor; no empieza antes de que `news.index`, `news.show` y `events.index?limit` estén disponibles en el ambiente de pruebas).

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec (preguntas resueltas el 2026-11-07; producción pendiente, no bloquea) | Aprobado (Jonathan, 2026-11-07) |
| Equipo técnico | Este plan y el Constitution Check | Aprobado (Jonathan, 2026-11-07) |
| Responsable de BD | No requerido (sin DBR). DBR-005 pendiente de confirmar en el ambiente de despliegue | Pendiente (precondición de despliegue) |
