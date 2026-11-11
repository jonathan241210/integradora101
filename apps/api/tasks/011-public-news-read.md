# Tareas · 011 · public-news-read

- Spec: `apps/api/specs/011-public-news-read.md` (Estado: **Aprobada**, Jonathan, 2026-11-07)
- Plan: `apps/api/plan/011-public-news-read.md` (Estado: **Aprobado**, Jonathan, 2026-11-07)
- Checklist: aprobado por Jonathan, 2026-11-07. Las tareas de código y documentación están marcadas (implementadas; ver nota). T-00, T-12, T-13, T-16, T-17 y T-18 siguen pendientes: los tests no pudieron ejecutarse en la sesión de implementación porque `arca_pruebas` (Aiven) no fue alcanzable por red (fallo DNS), por lo que las pruebas están escritas pero sin ejecutar.

Todas las pruebas usan `DatabaseTransactions` sobre `arca_pruebas`; nunca `RefreshDatabase`, `migrate:fresh` ni migraciones. Ninguna tarea toca `arca_zoo`. No hay DBR ni cambio de esquema.

## Trazabilidad

| Criterio / regla | Tareas que lo cubren |
|---|---|
| CA-01 / RN-03, RN-14 | T-01, T-02, T-08, T-11 |
| CA-02 / RN-04 | T-01, T-02, T-08 |
| CA-03 / RN-05 | T-02, T-03, T-08 |
| CA-04 / RN-05, RN-08 | T-02, T-05, T-08 |
| CA-05 / RN-03, RN-09 | T-03, T-06, T-08 |
| CA-06 / RN-07 | T-04, T-08 |
| CA-07 / `api-008` CA-08 | T-04, T-08 |
| CA-08 / RN-06, RN-14 | T-05, T-09, T-19 |
| CA-09 / RN-01, RN-13 | T-08 |
| CA-10 / RN-12 | T-07, T-08 |
| CA-11 | T-10 |
| CA-12 / RN-14 | T-01, T-11, T-19 |
| RN-07 (listado sin `content`) | T-04, T-08 |

## Base de datos (responsable de BD)

- [ ] **T-00** (precondición, sin migración): confirmar en `arca_pruebas` y en cada ambiente de despliegue que DBR-005 está aplicada (`deleted_at` en `news` y `events`). Evidencia: resultado de consulta de solo lectura del responsable de BD. No hay migración ni DBR nuevas.

## Implementación

- [x] **T-01** (CA-01, CA-02, CA-12; RN-03, RN-14): crear `App\Support\PublicCalendar` con `today()` en la zona de `config('arca.public_timezone')`; añadir a `config/arca.php` la clave `public_timezone` = `America/Mexico_City`; añadir a `App\Models\News` el scope `publicVisible()` con `is_active = true`, `published_date <= hoy` y `end_date` nulo o `>= hoy`, usando `PublicCalendar::today()`. No se toca `config/app.php`.
- [x] **T-02** (CA-01, CA-02, CA-03; RN-04, RN-05): crear `ListPublishedNewsAction` con `publicVisible()`, orden `published_date desc`, `id desc`, `limit + 1` y `meta` (`page`, `limit`, `has_more`); crear `ListPublicNewsRequest` con validación de `limit` (1..50, por defecto 10) y `page` (mínimo 1).
- [x] **T-03** (CA-05; RN-03, RN-09): crear `GetPublishedNewsAction` que devuelve la noticia visible por `id` o `null`.
- [x] **T-04** (CA-06, CA-07; RN-07): crear `PublicNewsResource` (sin `author_id`, `is_active`, `image_path` ni `content`) y `PublicNewsDetailResource` (añade `content`), ambos con `image_url` vía `ResolveContentImageUrlAction`.
- [x] **T-05** (CA-04, CA-08; RN-05, RN-06, RN-08): ajustar `ListEventsAction` para aceptar `?int $limit = null`; crear `ListPublicEventsRequest` (`limit` 1..50, opcional); mantener sin cambios la respuesta cuando no se envía `limit`.
- [x] **T-06** (CA-05; RN-09, RN-10): crear `App\Http\Controllers\Catalog\NewsController` con `index` y `show`; `show` usa `abort_unless(ctype_digit(...), 404, 'Noticia no encontrada.')` antes de la Action; ajustar `Catalog\EventController::index` para pasar el `limit` validado.
- [x] **T-07** (CA-10; RN-11, RN-12): registrar en `routes/api.php` `news.index` y `news.show` fuera de middleware de autenticación, con nombres en inglés; actualizar `apps/api/src/.env.example` con `http://localhost:8080` en `CORS_ALLOWED_ORIGINS` (valor de muestra, sin secretos). No modificar `config/cors.php`.
- [x] **T-08** (CA-01 a CA-07, CA-09, CA-10): crear `tests/Feature/Catalog/PublicNewsTest.php` con un método nombrado por criterio (`test_ca01_…` a `test_ca07_…`, `test_ca09_…`, `test_ca10_…`). Incluye: noticias de cada tipo no visibles, orden, paginación, 422 en español, detalle y 404 (incluido `abc` sin consulta), campos internos ausentes en listado y detalle, `content` ausente en el listado, `image_url` gestionada y externa, lecturas sin escrituras ni Activitylog, y CORS con `http://localhost:8080` permitido y `http://127.0.0.1:8080` no permitido, en `news.index` y `news.show` (sobrescribiendo `config('cors.allowed_origins')` en el test).
- [x] **T-09** (CA-08; RN-06): crear `tests/Feature/Catalog/PublicEventsLimitTest.php` con `test_ca08_…`: sin `limit` igual que hoy; con `limit` devuelve como máximo N en el orden de `api-006`; `limit` inválido responde 422 en `errors.limit`.
- [x] **T-10** (CA-11): crear `test_ca11_…` en `PublicNewsTest.php` que verifica que existe al menos un test nombrado para cada CA-01 a CA-10 y CA-12 en `tests/Feature/Catalog/` y que la base activa es `arca_pruebas`.
- [x] **T-11** (CA-01, CA-12; RN-14): test de frontera de zona horaria en `PublicNewsTest.php` (`test_ca12_…`, parte de noticias): con `Carbon::setTestNow('2026-11-07 05:30:00', 'UTC')` (`2026-11-06 23:30` en Tulancingo), una noticia con `end_date` `2026-11-06` es visible; una con `end_date` `2026-11-05` y una con `published_date` `2026-11-07` no lo son; y `config('app.timezone')` es `UTC`. Es obligatorio (decisión de 2026-11-07).
- [x] **T-19** (CA-08, CA-12; RN-14): ajustar `GetEventAction` y `ListEventsAction` (código de `api-006`) para usar `PublicCalendar::today()` en lugar de `now()->toDateString()`, sin cambiar el contrato; añadir en `PublicEventsLimitTest.php` el caso de frontera de eventos (`test_ca12_…`, parte de eventos: evento con `end_date` `2026-11-06` visible en `GET /events` y `GET /events/{id}`, y evento con `end_date` `2026-11-05` oculto en ambos). Es el único cambio de comportamiento sobre `api-006` y se anota en T-14.

## Calidad y entrega

- [ ] **T-12**: ejecutar `php artisan test` contra `arca_pruebas` y `vendor/bin/pint --test` sobre los archivos tocados; registrar el resultado (número de tests y aserciones). Los fallos preexistentes se registran por separado.
- [ ] **T-13**: verificación manual con `php artisan serve`: `GET /api/v1/news`, `GET /api/v1/news?limit=3&page=2`, `GET /api/v1/news/{id}`, `GET /api/v1/news/abc`, `GET /api/v1/events?limit=2`, y CORS con `curl -i -H "Origin: http://localhost:8080"` (permitido) y con `Origin: http://127.0.0.1:8080` (no permitido). Evidencia en el PR.
- [x] **T-14** (spec 011 aprobada el 2026-11-07; se ejecuta con la implementación): añadir nota de vigencia en `apps/api/specs/006-public-catalog-read.md` (RN-07 y «Fuera de alcance»: `limit` opcional en `GET /events`, sin `page`; RN-12: «hoy» en `America/Mexico_City` mediante `PublicCalendar`, con el efecto de que un evento que termina hoy se oculta a las 24:00 locales y no a las 18:00) y en `apps/api/plan/006-public-catalog-read.md` si corresponde. No cambiar criterios de `api-006`. Avisar al equipo de `mobile-003` del cambio de hora de corte.
- [x] **T-15** (CA-11 y entrega): crear `apps/api/docs/contenido-publico.md` (por crear) con la referencia de endpoints, parámetros, errores, zona horaria y ejemplos de respuesta; sin secretos.
- [ ] **T-16**: anotar en `infra/README.md` los requisitos de ambiente de esta spec en el mismo PR: `CORS_ALLOWED_ORIGINS` con el origen exacto del portal en cada ambiente (desarrollo: `http://localhost:8080`), prueba de CORS con `curl`, y precondición DBR-005 para noticias. Sin valores reales ni secretos.
- [ ] **T-17**: enlazar spec, plan y tasks en el PR y citar `api-011` en el commit. Actualizar el estado de la spec a En progreso o Implementada solo con evidencia de T-12 y T-13; no marcar Implementada si algún CA carece de test.
- [ ] **T-18**: revisar que `apps/web` (`web-009`) y `apps/mobile` no requieren cambios por el `limit` de eventos ni por el cambio de hora de corte de la vigencia; registrar la confirmación en el PR.
