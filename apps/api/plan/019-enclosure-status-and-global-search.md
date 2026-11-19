# Plan técnico · 019 · enclosure-status-and-global-search

- Spec: `apps/api/specs/019-enclosure-status-and-global-search.md` (Aprobada, Jonathan, 2026-11-18)
- Estado del plan: **Aprobado** (Jonathan, 2026-11-18). Autoriza la implementación según sus tasks.
- Tasks: `apps/api/tasks/019-enclosure-status-and-global-search.md` (Borrador, mismo NNN-slug).
- Responsable técnico: por confirmar (backend). Aprobador funcional de la spec: Jonathan.
- DBR: `docs/database/requests/DBR-020-enclosure-status-soft-delete.md` («Lista para backend» (aplicada en `arca_pruebas` el 2026-11-18, lote 12, por Jonathan como responsable de BD por delegación)). El bloque B está desbloqueado.
- Dependencias: `api-004`, `api-005` (CA-04 y CA-06, este enmendado), `api-007` (CA-18 y CA-26, enmendados), `api-009` (folio = `tickets.id`), `api-010`, `api-014` y DBR-013, DBR-012, DBR-005, DBR-006, ADR 0021 (excepción de `BaseModel`). Consumidor: `dashboard-012`.

## Bloques de implementación

- **Bloque A, búsqueda global** (CA-21 a CA-27, CA-29 a CA-33). Solo lee; no requiere DBR. Puede implementarse con plan y tasks aprobados. Excepción: el grupo `enclosures` (CA-28) necesita `is_active` y `deleted_at` filtrado; ese grupo va en el bloque B (T-24).
- **Bloque B, recintos** (CA-01 a CA-20, CA-35 y CA-28). Desbloqueado el 2026-11-18: DBR-020 está «Lista para backend» con evidencia.

## Diseño de solución

Búsqueda (bloque A):

```text
GET /api/v1/admin/search?q=
  → SearchController (delgado)
      → GlobalSearchRequest (recorta espacios; 2 a 100 caracteres)
      → GlobalSearchAction
          → grupos permitidos por permiso (ver RN-07 de la spec)
          → cada grupo: consulta LIKE con término escapado, máximo 5, orden título y después id
          → solo grupos con resultados, en el orden de RN-07
```

Recintos (bloque B):

```text
PATCH  /api/v1/admin/enclosures/{enclosure}/status  { "is_active": bool }
  → SetEnclosureStatusRequest (booleano estricto)
  → SetEnclosureStatusAction (sin cambio si el estado ya es el pedido; log solo si cambia)
DELETE /api/v1/admin/enclosures/{enclosure}
  → DeleteEnclosureAction (SoftDeletes; animales intactos; log «Recinto eliminado»)
Ambos: FindAdminResourceAction → 404 «Recinto no encontrado.»

Público: ListEnclosuresAction / GetEnclosureAction filtran is_active = 1 (deleted_at ya lo excluye).
Staff: POST /api/v1/staff/animals valida enclosure_id con Enclosure::assignableRule().
Escaneo (api-005): RecordVisitorDiscoveryAction rechaza si el recinto no es asignable/visible.
Progreso (api-005): VisitorProgressQuery cuenta solo especies con un animal en exhibición en un recinto activo y no eliminado.
```

## Decisiones de este plan

| # | Decisión | Motivo |
|---|---|---|
| D-1 | `Enclosure` extiende `Model` y usa `SoftDeletes`. No se usa `BaseModel`. | RN-13 de la spec y ADR 0021. `BaseModel` no existe en el repositorio. El diseño de referencia lo proponía; se descarta. |
| D-2 | Rutas bajo el prefijo `api/v1/admin` del grupo existente. Búsqueda: `/api/v1/admin/search`. | La spec manda (RN-11). El diseño de referencia decía `/api/admin/search`; se descarta. |
| D-3 | Request nuevo `SetEnclosureStatusRequest` con booleano estricto (`is_bool`). `SetStatusRequest` no se toca. | `SetStatusRequest` usa `boolean`, que acepta `"1"`, `"0"`, `"on"`, `"yes"`. CA-04 lo prohíbe. `SetStatusRequest` lo usan eventos y noticias; cambiarlo alcanza otras specs (deuda aparte). |
| D-4 | 404 con `FindAdminResourceAction` y el mensaje «Recinto no encontrado.». | Ya lo usa `EnclosureController::update`. Con SoftDeletes, `find()` excluye eliminados. |
| D-5 | Actions nuevas en `Actions/Admin/Enclosures/` con el patrón de `Actions/Admin/Content/SetEventStatusAction.php` (`LogAdminActivityAction`). | RN-12 y el patrón ya existente. |
| D-6 | Regla de asignabilidad en un único punto: `Enclosure::assignableRule()` devuelve `Rule::exists('enclosures', 'id')` con `is_active = 1` y `deleted_at IS NULL`. | RN-04 y CA-16: reutilizable en cualquier escritura futura. |
| D-7 | Unicidad: `SaveEnclosureRequest` conserva su consulta Eloquent. Con SoftDeletes, los eliminados quedan fuera. Se conserva la comparación sin distinguir mayúsculas que ya existe. | RN-06 y CA-11. El mensaje «Ya existe un recinto con ese nombre.» no cambia. |
| D-8 | Escaneo: el guard va en `RecordVisitorDiscoveryAction` después de la comprobación de `is_active` del código. El rechazo guarda fila en `visitor_scans` con `result` = `inactive_enclosure` y responde 422 con ese mismo código en `code`. La reproducción (`replay`) devuelve el mismo código y mensaje. | CA-17 a CA-20. Decisión aceptada por Jonathan (2026-11-18). |
| D-9 | Progreso: una sola subconsulta de «especies disponibles» (animales con `can_receive_visits = 1` en recintos activos y no eliminados). La usan el total y el numerador. | CA-35 y RN-14. Evita dos criterios distintos. |
| D-10 | Orden del grupo `tulanpedia`: título, después `kind`, después `id`. | `species.id` y `species_publication_requests.id` son espacios de identificadores distintos; sin `kind` el desempate no es determinista. |
| D-11 | Títulos y subtítulos no fijados por la spec (propuesta): boleto → `title` «Boleto #N», `subtitle` «Comprado el dd/mm/aaaa · Vigente|Cancelado» (fecha en `config('app.timezone')`); usuario → nombre completo y correo; momento → «Momento #N». | Pendiente de revisión; no altera CA. |
| D-12 | Mensajes de validación propuestos (pendientes de revisión): búsqueda «Escribe entre 2 y 100 caracteres para buscar.»; estado «El estado del recinto debe ser verdadero o falso.». | La spec pide mensaje en español sin texto fijo. |
| D-13 | No se añade `throttle` a la búsqueda ni a las rutas de recintos. | El grupo admin no lo tiene; la spec no lo pide. Riesgo registrado. |
| D-14 | `staff/animals` mantiene su validación inline en el controlador. Solo cambia la regla de `enclosure_id`. | Cambio mínimo. Mover la validación a un Form Request es una tarea aparte. |
| D-15 | El dashboard reabre historial de boletos con el filtro `folio` que ya existe en `GET /api/v1/admin/tickets` (`ListTicketsRequest`). No hay endpoint nuevo. | Evita contrato nuevo. Decisión aceptada (2026-11-18). |
| D-16 | Escaneo de recinto cerrado: se guarda con `result` = `inactive_enclosure` (ver D-8). | Decisión 1 aceptada por Jonathan (2026-11-18). |
| D-17 | Logros (`species_count`, `category_species_count`, `enclosure_count`) y `collection()` no cambian: siguen contando especies de recintos cerrados. La diferencia queda registrada en Riesgos. | Decisión 2 aceptada. CA-35 solo cubre total y numerador. |
| D-18 | Mensaje del 422 de `staff/animals` para recinto cerrado: «Este recinto no está disponible para asignar animales.». | Decisión 3 aceptada. |
| D-19 | El grupo `enclosures` de la búsqueda sale del bloque A y se implementa en el bloque B (T-24). El bloque A se entrega sin ese grupo hasta que DBR-020 esté «Lista para backend» (cumplido el 2026-11-18; el grupo se implementa con el bloque B). | Decisión 4 aceptada. |
| D-20 | Las enmiendas a `api-005`, `api-007` y `api-010` se aplican en el PR del bloque B (T-27). | Decisión 5 aceptada. |

## Divergencias detectadas

- **Diseño de referencia (`bien-ahora-quiero-que-gentle-puddle.md`) frente a la spec:** `BaseModel` (resuelto por D-1), ruta `/api/admin/search` (resuelto por D-2) y cambio en `script.js` y `styles.css` de la web (resuelto en `web-012`).
- **Spec 019:** el texto de CA-23 y CA-24 aparece en la misma línea en el archivo. El contenido es el mismo; no cambia el alcance.
- **Spec 019, CA-28:** depende de `is_active` (DBR-020). Por eso el grupo `enclosures` va en el bloque B.

## Estado actual de datos (consulta de solo lectura)

- **`enclosures`** (verificado en `arca_pruebas` el 2026-11-18 por la sesión principal, consulta de solo lectura, recogido en DBR-020 «Estado actual»): `id`, `name VARCHAR(100)`, `gps_lat`, `gps_lon`, `map_x`, `map_y`, `updated_at` y `deleted_at` (existen, sin versionar, con índices). **Falta `is_active`.** No hay `UNIQUE` sobre `name`. `animals.enclosure_id` es `INT NOT NULL` con FK `ON DELETE RESTRICT`. `enclosure_qr_codes` tiene dos FK sobre `enclosure_id` con reglas distintas (DBR-020, verificación 2).
- **Consulta de solo lectura en `arca_pruebas` (2026-11-18, sesión principal) para las tablas de la búsqueda:**
  - `tickets.status` = `completed` | `cancelled`. Subtítulo: Vigente / Cancelado.
  - `visitor_memories.status` en datos = `accepted` | `in_review` | `rejected`. El enum `MemoryStatus` incluye además `submitted`. Subtítulos: Aceptado, En revisión, Rechazado y Enviado.
  - `species_publication_requests.status` en datos = `accepted` | `approved` | `draft` | `rejected`. El enum `SpeciesRequestStatus` incluye `submitted`, que es el único valor que busca la búsqueda. `approved` y `draft` son valores heredados fuera del enum (riesgo, ver Riesgos).
  - `species_publication_requests` no tiene `common_name` (solo `scientific_name`). El nombre común se toma de `species.common_name` vía `species_id`.
  - Resto de tablas: consta lo de las migraciones del repositorio, sin consulta de esquema vivo confirmada:
  - `users`: `first_name`, `last_name`, `second_last_name`, `email`, `deleted_at` (`2026_10_14_000002`).
  - `news` y `events`: `deleted_at` (`2026_10_30_000005`, DBR-005); `is_active` (renombrado en `2026_10_14_000001`).
  - `tickets`: `status` (default `completed`), `purchased_at`, `cancelled_at`, `deleted_at` (`2026_11_02_000006`, DBR-006). Valor de cancelado confirmado (`cancelled`).
  - `visitor_memories`: `status` (default `submitted`) (`2026_11_11_000012`, DBR-012). Valores confirmados en datos (ver arriba).
  - `species`: `common_name`, `is_published`, `deleted_at` (`2026_11_12_000013`, DBR-013). `species_publication_requests`: `status` (default `submitted`); sin nombre común propio (ver arriba).
  - `visitor_scans.result`: `string(30)` (`2026_10_15_000004`). Acepta el código nuevo de D-8 sin DDL.
- **Pendiente:** confirmar en esquema vivo las columnas de `users`, `news`, `events` y `species` antes de T-05 y T-06 (solo lectura, sesión principal). Ningún agente ejecuta SQL ni `migrate`.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito | Bloque |
|---|---|---|---|
| API / rutas | `apps/api/src/routes/api.php` | `admin.search` en el grupo admin; `admin.enclosures.status` y `admin.enclosures.destroy` en el grupo `enclosures.manage` | A (search), B (recintos) |
| API / búsqueda | `app/Http/Controllers/Admin/SearchController.php` (nuevo), `app/Http/Requests/Admin/GlobalSearchRequest.php` (nuevo), `app/Actions/Admin/Search/GlobalSearchAction.php` (nuevo), `app/Actions/Admin/Search/LikeTerm.php` (nuevo), `app/Actions/Admin/Search/Groups/*.php` (nuevo, un archivo por grupo) | Búsqueda de solo lectura por grupo | A |
| API / recintos (modelo) | `app/Models/Enclosure.php` | `SoftDeletes`, `is_active` booleano, `assignableRule()` | B |
| API / recintos (admin) | `app/Http/Controllers/Admin/EnclosureController.php`, `app/Http/Requests/Admin/SetEnclosureStatusRequest.php` (nuevo), `app/Actions/Admin/Enclosures/SetEnclosureStatusAction.php` (nuevo), `app/Actions/Admin/Enclosures/DeleteEnclosureAction.php` (nuevo), `app/Http/Resources/Admin/EnclosureResource.php` (añadir `is_active`) | Desactivar, activar, eliminar y listado | B |
| API / recintos (públicos) | `app/Actions/Catalog/ListEnclosuresAction.php`, `app/Actions/Catalog/GetEnclosureAction.php` | Solo activos | B |
| API / asignación | `app/Http/Controllers/Api/AnimalController.php` (regla de `enclosure_id` en `store`) | CA-15 y CA-16 | B |
| API / escaneo | `app/Actions/Visitor/RecordVisitorDiscoveryAction.php` | Guard de recinto cerrado y mapa de respuestas de `replay` | B |
| API / progreso | `app/Actions/Visitor/VisitorProgressQuery.php` | Subconsulta de especies disponibles (D-9) | B |
| Paquete | `packages/api-client/admin.ts`, `packages/api-client/admin-types.ts` | `enclosures.setStatus`, `enclosures.remove`, `search` y tipos. Sin lógica | A (search), B (recintos) |
| API / pruebas | `apps/api/src/tests/Feature/Admin/`, `apps/api/src/tests/Feature/Catalog/`, `apps/api/src/tests/Feature/Visitor/` | Un test por CA (tabla de la sección de pruebas) | A y B |
| Documentación | `apps/api/docs/` (solo si existe una referencia de recintos o de búsqueda) | Referencia local | B |

## Contrato y datos

### Endpoints

| Método | Ruta | Nombre | Permiso | Éxito | Errores |
|---|---|---|---|---|---|
| GET | `/api/v1/admin/search?q=` | `admin.search` | Grupo admin (`auth:sanctum`, `staff.user`, `administrator.two-factor`). Sin permiso de grupo: lista vacía | 200 `{"groups": [...]}` | 401; 422 en `q` |
| GET | `/api/v1/admin/enclosures` | `admin.enclosures.index` (forma nueva: `is_active`) | `enclosures.manage` | 200 | 401, 403 |
| PATCH | `/api/v1/admin/enclosures/{enclosure}/status` | `admin.enclosures.status` | `enclosures.manage` | 200 con el recurso | 401, 403, 404, 422 |
| DELETE | `/api/v1/admin/enclosures/{enclosure}` | `admin.enclosures.destroy` | `enclosures.manage` | 200 `{"message": "Recinto eliminado."}` | 401, 403, 404 |
| GET | `/api/v1/enclosures` | `enclosures.index` (forma sin cambios de api-010) | Público | 200 solo activos | — |
| GET | `/api/v1/enclosures/{enclosure}` | `enclosures.show` | Público | 200 o 404 | 404 «Recinto no encontrado.» |
| POST | `/api/v1/staff/animals` | `staff.animals.store` | Staff | 201 | 422 en `enclosure_id` |
| Escaneo QR | Nombre según `routes/api.php` (api-005) | Sin cambio | Visitante | 201, 200 o 422 | 422 CA-17 y CA-18 |
| GET | `/api/v1/visitor/progress` | Sin cambio | Visitante | 200 con total y numerador nuevos | — |

Los `PATCH` y `DELETE` se declaran dentro del grupo `permission:enclosures.manage`. La búsqueda se declara en el grupo `admin` sin middleware de permiso; el permiso por grupo se aplica en la Action.

### Respuestas

Búsqueda (200):

```json
{"groups": [
  {"section": "enclosures", "label": "Recintos", "items": [
    {"id": 3, "title": "Recinto Lobos", "subtitle": "Activo"}
  ]},
  {"section": "tulanpedia", "label": "TulanPedia", "items": [
    {"id": 8, "title": "Lobo gris", "subtitle": "Publicada", "kind": "published-species"},
    {"id": 4, "title": "Lobo rojo", "subtitle": "Solicitud · Enviada", "kind": "species-request"}
  ]}
]}
```

- Orden de grupos (RN-07): `users`, `news`, `events`, `enclosures`, `memories`, `tulanpedia`, `ticket-history`. Etiquetas: «Usuarios», «Noticias», «Eventos», «Recintos», «Momentos», «TulanPedia», «Historial de boletos».
- Máximo 5 elementos por grupo, orden `title` ascendente y `id` ascendente (D-10 para `tulanpedia`).
- `kind` solo aparece en `tulanpedia`.
- Sin `password`, secretos de 2FA, `remember_token`, datos de visitantes, texto de opiniones ni datos del comprador (RN-09).

Estado (PATCH): cuerpo `{"is_active": true|false}` con booleano JSON. Respuesta 200 con el recurso de `EnclosureResource`, que incluye `is_active`. El `422` usa el mensaje de D-12.

Eliminar (DELETE): 200 `{"message": "Recinto eliminado."}`. No se borra ninguna fila física.

Errores:

| Caso | Código | Cuerpo |
|---|---|---|
| Recinto inexistente o eliminado | 404 | `{"message": "Recinto no encontrado."}` |
| `is_active` ausente o no booleano | 422 | `errors.is_active` con el mensaje de D-12 |
| `q` ausente, vacío, menos de 2 o más de 100 caracteres (después de recortar) | 422 | `errors.q` con el mensaje de D-12. No se consulta nada |
| `enclosure_id` de recinto inactivo o eliminado en `staff/animals` | 422 | `errors.enclosure_id` con «Este recinto no está disponible para asignar animales.». No se crea el animal |
| Escaneo de recinto inactivo o eliminado | 422 | `code` = `inactive_enclosure`, `message` «Este recinto no está disponible en este momento.», sin nombre de recinto, código QR ni animales |

### Actions y reglas

- `GlobalSearchAction`: recibe el término ya recortado y el usuario. Construye los grupos permitidos con los permisos del usuario, aplica LIKE escapado con `addcslashes($term, '%_\\')` (como `AnimalController::index`) y ordena. Solo lee.
- Grupos de dígitos exactos: `memories` (`visitor_memories.id`) y `ticket-history` (`tickets.id`). Si `q` contiene cualquier otro carácter, el grupo no aparece.
- `SetEnclosureStatusAction`: si `is_active` ya coincide, devuelve el recurso sin escribir y sin log (CA-03). Si cambia, guarda y registra con `LogAdminActivityAction` (tipo `status-changed`, descripción «Recinto activado» o «Recinto desactivado», sujeto el recinto, propiedades `{"is_active": bool}`).
- `DeleteEnclosureAction`: `delete()` de SoftDeletes (nunca `forceDelete`). Registra con tipo `deleted`, descripción «Recinto eliminado». No toca `animals`.
- `Enclosure::assignableRule()`: `Rule::exists('enclosures', 'id')->where(fn ($q) => $q->where('is_active', 1)->whereNull('deleted_at'))`.

## Seguridad, offline y operación

- **Autorización en servidor:** grupo admin para todo; `enclosures.manage` para recintos; permiso por grupo en la búsqueda (Action). No se crean Policies ni permisos nuevos (la spec lo excluye).
- **Datos mínimos (RN-09):** consultas con columnas explícitas. Nunca `SELECT *` sobre `users`. Correo solo en el grupo `users`, que exige `users.manage`.
- **Escape de LIKE (CA-32):** `%` y `_` como literales. Término de 2 a 100 caracteres.
- **Límites:** 5 por grupo; sin paginación (la spec lo excluye). Carga: 7 consultas LIKE por petición; volumen bajo (riesgo aceptado en la spec).
- **Auditoría:** solo activación, desactivación y eliminación. La búsqueda no escribe ni registra (CA-33).
- **Sin datos personales en el registro de actividad:** solo `is_active` e identificador.
- **Portabilidad (ADR 0013):** `LIKE`, `whereNull`, `Rule::exists`, `SoftDeletes`. Sin FULLTEXT ni SQL propietario. Conexión por `.env`. Pruebas en `arca_pruebas` con `DatabaseTransactions`; sin `RefreshDatabase`, sin `migrate:fresh`, sin `migrate` en los tests.
- **Sin requisitos nuevos de servidor o de ambiente:** `infra/README.md` no cambia.

## Mapeo de criterios a pruebas

Convención: cada método se llama `test_caNN_<descripcion>` y su docblock cita `CA-NN enclosure-status-and-global-search`. PHPUnit no admite guiones en nombres de método.

| Criterio | Prueba automatizada (archivo y método) | Bloque |
|---|---|---|
| CA-01 | `Admin/EnclosureStatusTest.php::test_ca01_deactivates_active_enclosure_without_deleting` | B |
| CA-02 | `Admin/EnclosureStatusTest.php::test_ca02_activates_inactive_enclosure` | B |
| CA-03 | `Admin/EnclosureStatusTest.php::test_ca03_same_state_is_noop_without_log` | B |
| CA-04 | `Admin/EnclosureStatusTest.php::test_ca04_rejects_non_boolean_is_active` (`"1"`, `"0"`, `"sí"`, ausente) | B |
| CA-05 | `Admin/EnclosureDeleteTest.php::test_ca05_soft_deletes_active_or_inactive_enclosure` | B |
| CA-06 | `Admin/EnclosureDeleteTest.php::test_ca06_keeps_animals_enclosure_id` | B |
| CA-07 | `Admin/EnclosureStatusTest.php::test_ca07_unknown_or_deleted_returns_404_on_status` y `Admin/EnclosureDeleteTest.php::test_ca07_unknown_or_deleted_returns_404_on_delete` | B |
| CA-08 | `Admin/EnclosureStatusTest.php::test_ca08_logs_status_change_only` y `Admin/EnclosureDeleteTest.php::test_ca08_logs_delete_and_rejected_attempt_logs_nothing` | B |
| CA-09 | `Admin/EnclosureAccessTest.php::test_ca09_requires_session_and_enclosures_manage` | B |
| CA-10 | `Admin/EnclosureAdminListTest.php::test_ca10_lists_active_and_inactive_not_deleted` | B |
| CA-11 | `Admin/EnclosureNameTest.php::test_ca11_unique_name_only_among_not_deleted` | B |
| CA-12 | `Catalog/EnclosureVisibilityTest.php::test_ca12_public_list_only_active` | B |
| CA-13 | `Catalog/EnclosureVisibilityTest.php::test_ca13_public_detail_404_for_inactive_or_deleted` | B |
| CA-14 | `Catalog/EnclosureVisibilityTest.php::test_ca14_reactivated_enclosure_reappears` | B |
| CA-15 | `Admin/EnclosureAssignmentTest.php::test_ca15_staff_store_rejects_inactive_or_deleted_enclosure` | B |
| CA-16 | `Admin/EnclosureAssignmentTest.php::test_ca16_every_enclosure_write_point_applies_assignable_rule` (caso de referencia: `POST /api/v1/staff/animals`) | B |
| CA-17 | `Visitor/EnclosureScanTest.php::test_ca17_inactive_enclosure_qr_rejected_without_discovery` | B |
| CA-18 | `Visitor/EnclosureScanTest.php::test_ca18_deleted_enclosure_qr_rejected_without_discovery` | B |
| CA-19 | `Visitor/EnclosureScanTest.php::test_ca19_reactivated_qr_discovers_again` | B |
| CA-20 | `Visitor/EnclosureScanTest.php::test_ca20_rejection_reveals_no_enclosure_data` | B |
| CA-21 | `Admin/GlobalSearchValidationTest.php::test_ca21_requires_session_and_returns_empty_groups_without_permission` | A |
| CA-22 | `Admin/GlobalSearchValidationTest.php::test_ca22_rejects_q_out_of_range_after_trim` | A |
| CA-23 | `Admin/GlobalSearchResultsTest.php::test_ca23_response_shape_and_group_order` | A |
| CA-24 | `Admin/GlobalSearchResultsTest.php::test_ca24_limit_five_sorted_by_title_then_id` | A |
| CA-25 | `Admin/GlobalSearchResultsTest.php::test_ca25_groups_follow_permissions` | A |
| CA-26 | `Admin/GlobalSearchUsersTest.php::test_ca26_users_group_active_and_inactive_without_secrets` | A |
| CA-27 | `Admin/GlobalSearchRecordsTest.php::test_ca27_news_and_events_subtitle_active_or_inactive` | A |
| CA-28 | `Admin/GlobalSearchRecordsTest.php::test_ca28_enclosures_group_active_and_inactive_not_deleted` | B |
| CA-29 | `Admin/GlobalSearchRecordsTest.php::test_ca29_memory_by_numeric_id_without_opinion_text` | A |
| CA-30 | `Admin/GlobalSearchTulanpediaTest.php::test_ca30_tulanpedia_published_and_submitted_with_kind` | A |
| CA-31 | `Admin/GlobalSearchRecordsTest.php::test_ca31_ticket_by_folio_without_buyer_data` | A |
| CA-32 | `Admin/GlobalSearchResultsTest.php::test_ca32_wildcards_are_literal` | A |
| CA-33 | `Admin/GlobalSearchReadOnlyTest.php::test_ca33_search_writes_nothing_and_logs_nothing` | A |
| CA-34 | `Admin/EnclosureStatusSearchCoverageTest.php::test_ca34_every_criterion_is_named_and_uses_database_transactions` | A y B |
| CA-35 | `Visitor/EnclosureProgressTest.php::test_ca35_closed_enclosure_species_leave_total_and_numerator` | B |

## Constitution Check

| Principio | Cumple | Evidencia o excepción |
|---|---|---|
| I. Stack mínimo y portable | Sí | Laravel 12, Sanctum y MySQL 8.0.x. Sin dependencias nuevas. Sin SQL propietario. Conexión por `.env` |
| II. La spec manda | Sí, con condición | Spec 019 Aprobada (2026-11-18). Plan y tasks en Borrador: no hay código hasta su aprobación. DBR-020 «Lista para backend» (2026-11-18); el bloque B puede implementarse cuando se aprueben plan y tasks |
| III. Lógica separada de la interfaz | Sí | Visibilidad, asignación, búsqueda y escaneo en Actions. Controladores delgados. Clientes sin reglas |
| IV. Un test por criterio | Sí, al implementar | La tabla de mapeo cubre CA-01 a CA-35 con un método por criterio |
| V. Una sola fuente de verdad para los datos | Sí, con excepción documentada | MySQL es la autoridad. `is_active` llegó por la migración de DBR-020 (`2026_11_18_000020`, aplicada en `arca_pruebas`). `Enclosure` sin `BaseModel` según RN-13 y ADR 0021. Recintos eliminados con SoftDeletes; nada se borra físicamente. Activitylog en las acciones |
| VI. Código en inglés, personas en español | Sí | Rutas, clases y tablas en inglés. Mensajes y etiquetas en español (D-11, D-12) |

Excepciones: `Enclosure` sin `BaseModel` (RN-13, ADR 0021). Ninguna excepción nueva. No se implementa sin revisión del equipo.

## Riesgos y decisiones

- **ADR:** no se requiere ADR nuevo. Confirmar que ADR 0021 cubre `Enclosure` (la spec lo afirma).
- **Consultas sin SoftDeletes:** el join de `VisitorProgressQuery` con `animals` y `enclosures` debe filtrar `enclosures.deleted_at IS NULL` a mano. Revisar cualquier `DB::table('enclosures')` del repositorio al implementar.
- **Timestamps:** `Enclosure` mantiene `$timestamps = false`. `updated_at` existe en la base y no se escribe (DBR-020 no lo pide).
- **Replay de escaneos:** un escaneo guardado como rechazo debe reproducirse con el mismo mensaje y código; si no, un reintento cambia la respuesta.
- **Métricas de logros:** `VisitorProgressQuery::metrics()` y `collection()` siguen contando especies de recintos cerrados. CA-35 solo cubre total y numerador. Decisión 2 aceptada (2026-11-18): no cambian; se registra la diferencia.
- **Validación inline en `staff/animals`:** cambio mínimo (D-14).
- **Estados heredados de solicitudes:** `species_publication_requests` tiene valores `approved` y `draft` fuera del enum `SpeciesRequestStatus`. La búsqueda solo lee `submitted`, así que no los devuelve. Riesgo de calidad de datos y de consistencia del enum; sin acción en esta spec.

## Decisiones aceptadas (2026-11-18)

1. **Escaneo de recinto cerrado:** se guarda con `result` = `inactive_enclosure` (D-16).
2. **Logros y colección:** no cambian; siguen contando especies de recintos cerrados. Se registra (D-17).
3. **Mensaje del 422 en `staff/animals`:** «Este recinto no está disponible para asignar animales.» (D-18).
4. **Bloque A sin grupo `enclosures`:** resuelto; DBR-020 está «Lista para backend» desde 2026-11-18 y el grupo se implementa con el bloque B (D-19).
5. **Enmiendas a `api-005`, `api-007` y `api-010`:** se aplican en el PR del bloque B (D-20).

## Orden y aprobación

1. Aprobación técnica de este plan y de sus tasks por el equipo. Las decisiones 1 a 5 están aceptadas (2026-11-18).
2. Consulta de solo lectura registrada en «Estado actual de datos» (2026-11-18: `tickets`, `visitor_memories`, `species_publication_requests`).
3. Bloque A (búsqueda): puede empezar tras la aprobación de plan y tasks. No necesita DBR.
4. Bloque B (recintos): desbloqueado. DBR-020 «Lista para backend» desde 2026-11-18 (Jonathan, responsable de BD por delegación).
5. Aprobación funcional de la spec: Jonathan (2026-11-18). Revisión técnica del plan: pendiente.

## Enmienda 2026-11-18 (b), aprobada por Jonathan

- Spec: «Enmienda 2026-11-18 (b)» en `apps/api/specs/019-enclosure-status-and-global-search.md` (CA-23, CA-24, CA-26 a CA-32, CA-34, CA-36 a CA-49; RN-09, RN-10, RN-12, RN-15 a RN-19).
- Dashboard afectado: `apps/dashboard/specs/012-enclosure-actions-global-search.md` («Enmienda 2026-11-18 (b)»). Solo consume `match` y el límite de peticiones.
- DBR: no requerida. Solo lectura de columnas existentes. Sin migraciones ni cambios de esquema.
- Las decisiones marcadas «propuesta» en la spec (preguntas 1 a 5) deben confirmarse antes de implementar el bloque C.

### Diseño de solución (bloque C, búsqueda tolerante)

```text
GET /api/v1/admin/search?q=  (grupo admin; throttle:admin-search, 30/min por usuario: CA-47)
  → SearchController (delgado) → GlobalSearchRequest (sin cambio)
  → GlobalSearchAction
      → por grupo permitido (permiso por grupo, sin cambio):
          candidatos = últimos 2000 por id desc, columnas explícitas (CA-46, CA-48)
          → Matching/TextNormalizer  (minúsculas + tabla de acentos; RN-15)
          → Matching/QueryWords      (palabras de la consulta; ≥ 2 caracteres)
          → Matching/WordMatcher     (exacta 4, prefijo 3, contiene 2, aproximada 1; CA-38 a CA-40)
          → Matching/ItemMatcher     (todas las palabras; peor nivel = puntuación; CA-37, CA-41)
          → Matching/MatchSnippet    (campo y fragmento ≤ 120; omite si solo título; CA-42)
      → orden: puntuación, título normalizado, kind (tulanpedia), id; máx. 5 (CA-24, CA-41)
  → solo grupos con resultados, en el orden de RN-07
```

### Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / búsqueda (nuevo) | `app/Actions/Admin/Search/Matching/TextNormalizer.php`, `QueryWords.php`, `WordMatcher.php`, `ItemMatcher.php`, `MatchSnippet.php` | Motor de coincidencia (RN-15 a RN-16; CA-36 a CA-42) |
| API / grupos | `app/Actions/Admin/Search/Groups/SearchGroup.php` (candidatos, `fields()`, tope `CANDIDATE_LIMIT = 2000`), y los siete grupos | Campos de CA-43, candidatos acotados, orden y `match` |
| API / orden | `app/Actions/Admin/Search/GlobalSearchAction.php` | Mantiene el orden de grupos (RN-07); pasa términos a grupos |
| API / retirada | `app/Actions/Admin/Search/LikeTerm.php` | Sale del camino de búsqueda; se elimina si no tiene usos (T-43) |
| API / límites | `app/Providers/AppServiceProvider.php` (`RateLimiter::for('admin-search')`), `routes/api.php` (`throttle:admin-search` en `admin.search`) | CA-47 |
| Paquete | `packages/api-client/admin-types.ts` | `GlobalSearchItem.match?: { field: string; snippet: string }`. Sin lógica |
| Pruebas | `apps/api/src/tests/Feature/Admin/GlobalSearch*Test.php` (ver mapeo) | Un método `test_caNN_` por CA |
| Documentación | `apps/api/docs/` (solo si existe una referencia de búsqueda; si no, este plan) | Tope de 2000 y reglas de coincidencia |

### Decisiones de la enmienda (b)

| # | Decisión | Motivo |
|---|---|---|
| D-21 | La comparación se hace en PHP sobre candidatos acotados, sin `LIKE`. Tope de 2000 por grupo, los más recientes por `id` desc. | La normalización, los prefijos y los errores de escritura no se expresan con `LIKE` portable (ADR 0013). Las tablas son pequeñas. Riesgo: RN-17. |
| D-22 | Normalización con tabla fija (á, é, í, ó, ú, ü, ñ) y minúsculas `mb_strtolower`. No se usa `ext-intl`. | Evita una extensión nueva. Constitución I. |
| D-23 | Niveles: exacta (palabra igual a un token o a todo el campo), prefijo (token que empieza por la palabra), contiene (solo palabras de 4 o más letras, dentro de un token) y aproximada (Levenshtein por caracteres, contra tokens completos; ≤1 si 4 a 6 letras, ≤2 si 7 o más). | CA-38 a CA-40. Levenshtein propio por caracteres: el nativo `levenshtein()` cuenta bytes. |
| D-24 | Puntuación del elemento = peor nivel de sus palabras. | Pregunta 2 (propuesta). |
| D-25 | `match` = primer campo no-título donde coincide una palabra; fragmento centrado en la primera coincidencia de ese campo. Sin `match` si todas las coincidencias están en el título. | Pregunta 3 (propuesta); CA-42. |
| D-26 | Boletos: estado `completed` → «Vigente» y «Completado»; `cancelled` → «Cancelado»; `cash` → «Efectivo»; fecha en `config('app.timezone')` dd/mm/aaaa. Otro valor de `payment_method` se muestra tal cual y no se traduce. | CA-43; en código solo existe `cash` (`RegisterTicketSaleAction`). |
| D-27 | Momentos: el número solo busca `visitor_memories.id` exacto (no prefijo ni contiene). Opinión y motivo de rechazo se buscan y solo salen en `match` por el permiso del grupo. | Decisión de Jonathan (CA-29, CA-44). |
| D-28 | Rol: se busca la etiqueta en español de `ResolveManageableRolesAction::LABELS` (o el nombre si no hay etiqueta), no el identificador interno. | Pregunta 4 (propuesta). Coincide con lo que muestra Usuarios. |
| D-29 | Limitador `admin-search` por usuario (30/min) en la ruta `admin.search`. Reemplaza D-13 solo para esta ruta. | CA-47; Jonathan. |
| D-30 | La Action de búsqueda no escribe en logs ni Activitylog; no recibe el logger. Las columnas se declaran por grupo (sin `SELECT *`). | CA-48, CA-49, RN-09. |
| D-31 | Usuarios: consulta de candidatos con `LEFT JOIN departments` y lectura de roles con `model_has_roles` (`model_type` = `App\Models\User`) solo para los candidatos. | CA-43 sin consultas N+1. |

Decisiones técnicas de la sesión principal sobre las preguntas 1 a 5 de la spec (2026-11-18), registradas al implementar el bloque C:

| # | Decisión técnica de la sesión principal | Aplica |
|---|---|---|
| D-32 | El tope de 2000 candidatos toma los más recientes por `id` descendente (pregunta 1). En `tulanpedia` el tope se aplica a cada fuente (especies publicadas y solicitudes `submitted`). `memories` y `ticket-history` además consultan directo el registro cuyo `id` es el número buscado, fuera del tope, para que un folio antiguo siga encontrándose. | CA-46, CA-29, CA-31 |
| D-33 | La puntuación del elemento es el peor nivel entre sus palabras (pregunta 2; D-24). | CA-41 |
| D-34 | `match` se omite si la coincidencia está solo en el título (pregunta 3; D-25). | CA-42 |
| D-35 | El rol se busca por su etiqueta en español y también por el identificador interno, ambos bajo la etiqueta «Rol» (pregunta 4; sustituye a D-28 en la parte de «no por el identificador interno»). | CA-43 |
| D-36 | El 429 de `admin.search` dice «Demasiadas búsquedas. Espera un minuto e inténtalo de nuevo.» (pregunta 5). El cliente lo recibe como `ApiError` con `status === 429` y `retryAfterSeconds` (ya existentes en `packages/api-client/http.ts`; sin cambio de código). | CA-47 |
| D-37 | Una palabra de la consulta con signos (`%`, `_`, `@`, `/`) se compara literal contra el campo completo además de contra sus palabras; así `%` y `_` no son comodines y la fecha `09/07/2032` se encuentra. | CA-32, CA-43 |
| D-38 | Los elementos de `memories` y `ticket-history` no tienen título buscable («Momento #N», «Boleto #N»): todo `match` en ellos viene de un campo de CA-43. El tope inyectable es el argumento del constructor de `GlobalSearchAction`. | CA-43, CA-46 |

### Estado actual de datos (enmienda (b))

- Registrado por la sesión principal (consulta de solo lectura en `arca_pruebas`, 2026-11-18, según la petición): `users` (`first_name`, `last_name`, `second_last_name`, `email`, `department_id`); `news` y `events` (`title`, `description`, `content`, `category`, `location`, `name`); `species` (`common_name`, `scientific_name`, `category`, `habitat`, `distribution`, `conservation_status`); `visitor_memories` (`opinion`, `rejection_reason`, `status`); `tickets` (`payment_method`, `cancellation_reason`, `purchased_at`, `status`).
- Verificado en código (2026-11-18): `departments` tiene `name` (`2026_10_14_000001`); `users.department_id` es FK a `departments`; los roles usan `model_has_roles` y `roles` (`2026_10_14_000002`); las etiquetas de rol están en `ResolveManageableRolesAction::LABELS` (`cashier` = Cajero, `veterinarian` = Veterinario); en código solo se escribe `payment_method = 'cash'`.
- Consulta de solo lectura en `arca_pruebas` (2026-11-18): `tickets.payment_method` solo contiene `cash`; las columnas de `users`, `news`, `events`, `species`, `visitor_memories`, `tickets` y `departments` coinciden con la lista anterior. D-26 cubre `cash`.

### Constitution Check (enmienda (b))

| Principio | Cumple | Evidencia |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias ni extensiones nuevas (D-22). Sin SQL propietario. |
| II. La spec manda | Sí | Enmienda aprobada por Jonathan (2026-11-18 (b)). Tasks T-31 a T-47 pendientes de implementación. |
| III. Lógica separada de la interfaz | Sí | Todo el matching y el orden en Actions. El cliente no decide resultados (RN-11 de 012). |
| IV. Un test por criterio | Sí, al implementar | Mapeo de CA-23 a CA-49 abajo. |
| V. Una sola fuente de verdad | Sí | Solo lectura. Sin escritura ni auditoría de búsquedas. |
| VI. Código en inglés, personas en español | Sí | Mensajes y etiquetas en español (CA-42, CA-43, CA-47). |

### Riesgos (enmienda (b))

- **Duplicación de la regla** (PHP en la API y TypeScript en el cliente): mitigación con la tabla de casos de CA-31 en ambos lados; un cambio exige los dos PR.
- **Tope de candidatos** (RN-17): registros antiguos fuera de los 2000 más recientes no aparecen. Revisar con el crecimiento de datos.
- **Costo por petición**: hasta 2000 filas por grupo y 7 grupos. Aceptable con el volumen actual; medir si crece.
- **LIKE retirado**: el camino de búsqueda ya no usa índices; el tope lo limita.

### Mapeo de criterios a pruebas (enmienda (b))

Convención: `test_caNN_<descripcion>`; el docblock cita `CA-NN enclosure-status-and-global-search`.

| Criterio | Prueba automatizada (archivo y método) | Estado |
|---|---|---|
| CA-23 (modificado) | `Admin/GlobalSearchResultsTest.php::test_ca23_response_shape_and_group_order` (actualizar: `match` opcional) | Hecho |
| CA-24 (modificado) | `Admin/GlobalSearchResultsTest.php::test_ca24_limit_five_sorted_by_score_title_id` (actualizar) | Hecho |
| CA-26 (modificado) | `Admin/GlobalSearchUsersTest.php::test_ca26_users_group_active_and_inactive_without_secrets` (ampliar: área y rol) | Hecho |
| CA-27 (modificado) | `Admin/GlobalSearchRecordsTest.php::test_ca27_news_and_events_subtitle_active_or_inactive` (ampliar: campos) | Hecho |
| CA-28 (modificado) | `Admin/GlobalSearchRecordsTest.php::test_ca28_enclosures_group_active_and_inactive_not_deleted` (ampliar: tolerancia) | Hecho |
| CA-29 (modificado) | `Admin/GlobalSearchRecordsTest.php::test_ca29_memory_by_numeric_id_without_opinion_text` → renombrar a `test_ca29_memory_by_id_status_opinion_and_rejection` | Hecho |
| CA-30 (modificado) | `Admin/GlobalSearchTulanpediaTest.php::test_ca30_tulanpedia_published_and_submitted_with_kind` (ampliar: campos) | Hecho |
| CA-31 (modificado) | `Admin/GlobalSearchRecordsTest.php::test_ca31_ticket_by_folio_without_buyer_data` (ampliar: estado, forma de pago, fecha) | Hecho |
| CA-32 (modificado) | `Admin/GlobalSearchResultsTest.php::test_ca32_wildcards_are_literal` | Hecho |
| CA-34 (modificado) | `Admin/EnclosureStatusSearchCoverageTest.php::test_ca34_every_criterion_is_named_and_uses_database_transactions` (rango CA-01 a CA-49) | Hecho |
| CA-36 | `Admin/GlobalSearchNormalizationTest.php::test_ca36_ignores_case_and_accents` | Hecho |
| CA-37 | `Admin/GlobalSearchNormalizationTest.php::test_ca37_all_words_any_order_across_fields` | Hecho |
| CA-38 | `Admin/GlobalSearchTypoTest.php::test_ca38_prefix_matches` | Hecho |
| CA-39 | `Admin/GlobalSearchTypoTest.php::test_ca39_typo_thresholds_by_length` | Hecho |
| CA-40 | `Admin/GlobalSearchTypoTest.php::test_ca40_contains_needs_four_letters` | Hecho |
| CA-41 | `Admin/GlobalSearchRankingTest.php::test_ca41_score_then_title_kind_id` | Hecho |
| CA-42 | `Admin/GlobalSearchMatchTest.php::test_ca42_match_field_and_snippet_up_to_120` | Hecho |
| CA-43 | `Admin/GlobalSearchFieldsTest.php::test_ca43_users_department_and_role`, `::test_ca43_news_events_fields`, `::test_ca43_tulanpedia_species_fields`, `::test_ca43_ticket_status_method_reason_date` | Hecho |
| CA-44 | `Admin/GlobalSearchFieldsTest.php::test_ca44_memory_never_exposes_visitor_data` | Hecho |
| CA-45 | `Admin/GlobalSearchFieldsTest.php::test_ca45_ticket_buyer_data_not_searched` | Hecho |
| CA-46 | `Admin/GlobalSearchCapTest.php::test_ca46_only_newest_candidates_are_compared` | Hecho |
| CA-47 | `Admin/GlobalSearchThrottleTest.php::test_ca47_thirty_per_minute_then_429` | Hecho |
| CA-48 | `Admin/GlobalSearchSecurityTest.php::test_ca48_no_secret_fields_or_extra_keys` | Hecho |
| CA-49 | `Admin/GlobalSearchSecurityTest.php::test_ca49_term_not_logged_nor_audited` | Hecho |

Todas las pruebas usan `DatabaseTransactions` sobre `arca_pruebas`, sin `RefreshDatabase` ni `migrate`.

## Enmienda 2026-11-18 (d), aprobada por Jonathan

- Spec: «Enmienda 2026-11-18 (d)» en `apps/api/specs/019-enclosure-status-and-global-search.md` (CA-37 y CA-41 modificados; CA-50 a CA-54; RN-16).
- DBR: no requerida; sin migraciones. Dashboard: solo consume `best_score` (`packages/api-client` `GlobalSearchGroup.best_score?: number`).

| # | Decisión | Aplica |
|---|---|---|
| D-39 | `ItemMatcher` cuenta las palabras que coinciden; entra el elemento si coinciden `m` = n (n ≤ 2) o ceil(n/2) (n ≥ 3). | CA-37 |
| D-40 | La relevancia es un entero de 9 dígitos `A B C DD EEE F` (título literal; frase en el título 2 = al inicio, 1 = en medio; frase en otro campo; palabras que coinciden; suma de niveles; peor nivel), comparable con una sola comparación entera. Las frases solo cuentan con 2 o más palabras. | CA-41, CA-50 a CA-53 |
| D-41 | `SearchGroup::rank()` devuelve `items` y `best_score` (relevancia del primer elemento, 0 sin resultados); `search()` se conserva. `GlobalSearchAction` añade `best_score` a cada grupo; el orden de grupos sigue siendo RN-07. Coincidencia solo por id exacto = 100010044. | CA-54 |

Mapeo de pruebas: CA-37 `GlobalSearchNormalizationTest::test_ca37_all_words_any_order_across_fields` (actualizado) y `::test_ca37_partial_words_after_complete`; CA-41 `GlobalSearchRankingTest::test_ca41_score_then_title_kind_id` (actualizado); CA-50 `::test_ca50_literal_title_first`; CA-51 `::test_ca51_contiguous_phrase_before_loose_words`; CA-52 `::test_ca52_phrase_in_other_field`; CA-53 `::test_ca53_words_and_levels_two_words_require_both`; CA-54 `::test_ca54_group_best_score` (todos en `GlobalSearchRelevanceTest`).

## Enmienda 2026-11-19 (e), aprobada por Jonathan

Pedida por Jonathan: «busco una noticia y salen primero eventos; solo toma algunas palabras».

- **Palabras vacías** (a, al, con, de, del, el, en, es, la, las, lo, los, o, para, por, que, se, su, sus, un, una, unas, unos, y): no se exigen ni cuentan como coincidencia; sí forman parte de la frase literal (CA-50 a CA-52). Si la consulta solo tiene palabras vacías, se usan todas. Implementado en `ItemMatcher` (API) y `search-tolerance.ts` (cliente, paridad).
- **Coincidencia parcial más estricta** (modifica CA-37 y la regla de ceil(n/2) de la enmienda d): con 1 a 3 palabras con contenido se exigen todas; con 4 o más, al menos 3 y al menos el 75 % (redondeado hacia arriba).
- **Sección nombrada en la consulta** (dashboard, `viewmodels/search-intent.ts`): si la consulta incluye una palabra de sección (noticia/s, nota/s; evento/s, actividad/es; recinto/s; usuario/s, cuenta/s, empleado/s, personal; momento/s, recuerdo/s; especie/s, tulanpedia; boleto/s, folio/s), esa palabra no se envía a la API (si queda texto suficiente) y el grupo de esa sección se muestra primero, antes que el de la sección actual.
- **Palabras de sección y vacías no son acciones** (dashboard, `splitSearchQuery`): antes una palabra como «noticia» se reconocía como parte de una acción («Publicar noticia») y se quitaba de la consulta enviada a la API, por lo que la búsqueda usaba una sola palabra. Ahora esas palabras siempre llegan a la búsqueda.
- **Tests:** pendientes por indicación de Jonathan (no correrlos en esta ronda). Afectan a CA-37, CA-41, CA-43 (dashboard) y CA-50 a CA-54 (API); deben actualizarse antes del PR.
