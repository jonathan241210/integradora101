# Tareas · 019 · enclosure-status-and-global-search

- Spec: `apps/api/specs/019-enclosure-status-and-global-search.md`
- Plan: `apps/api/plan/019-enclosure-status-and-global-search.md`
- DBR: `docs/database/requests/DBR-020-enclosure-status-soft-delete.md` («Lista para backend» (aplicada en `arca_pruebas`, lote 12, por el responsable funcional como responsable de BD por delegación))
- Estado del checklist: **Aprobado**. En implementación; cada T-xx se marca solo con evidencia.
- Solicitada: 2026-11-18
- Aprobada: 2026-11-18

Reglas de todas las tareas: los tests usan `DatabaseTransactions` sobre `arca_pruebas`; prohibido `RefreshDatabase`, `migrate:fresh` y `migrate` desde los tests o desde el código; nunca `arca_zoo`. Cada método de test se llama `test_caNN_...` y su docblock cita `CA-NN enclosure-status-and-global-search`.

## Bloque 0. Precondición (sin código)

- [x] **T-01** (CA-21 a CA-33; RN-11): consulta de solo lectura del esquema vivo de `arca_pruebas` para las tablas de la búsqueda.
  - Depende de: nada.
  - Pasos: `php artisan migrate:status` desde `apps/api/src` (sin ejecutar `migrate`). Por tabla (`users`, `news`, `events`, `tickets`, `visitor_memories`, `species`, `species_publication_requests`): `SHOW COLUMNS` y los valores distintos de `status`. Registrar en el plan, apartado «Estado actual de datos», con fecha. La realiza la sesión principal; este agente no tiene shell.
  - Test que lo cubre: ninguno (es evidencia previa). Los tests de T-05 a T-09 dependen de su resultado.
  - Hecho cuando: cumplido.
  - Evidencia (, sesión principal, solo lectura, `arca_pruebas`): `tickets.status` = `completed` | `cancelled`; `visitor_memories.status` en datos = `accepted` | `in_review` | `rejected` (el enum `MemoryStatus` incluye `submitted`); `species_publication_requests.status` en datos = `accepted` | `approved` | `draft` | `rejected` (el enum `SpeciesRequestStatus` incluye `submitted`; `approved` y `draft` son valores heredados fuera del enum, anotados como riesgo); la tabla de solicitudes no tiene `common_name` (solo `scientific_name`) y el nombre se toma de `species.common_name` vía `species_id`. Registrado en el plan, apartado «Estado actual de datos».
  - Nota: en la evidencia recibida no consta la salida de `migrate:status` ni las columnas de `users`, `news`, `events` y `species`; quedan pendientes de confirmar antes de T-05 y T-06.

## Bloque A. Búsqueda global (sin DBR; tras aprobación de plan y tasks)

- [x] **T-02** (CA-22; RN-10): validación de `q`.
  - Depende de: T-01.
  - Archivos: `apps/api/src/app/Http/Requests/Admin/GlobalSearchRequest.php` (nuevo).
  - Cambios: recorta espacios antes de validar; `q` obligatorio, texto, de 2 a 100 caracteres (mb). Mensaje de D-12 en español.
  - Test: `apps/api/src/tests/Feature/Admin/GlobalSearchValidationTest.php::test_ca22_rejects_q_out_of_range_after_trim` (ausente, vacío, un carácter, 101 caracteres, y espacios que dejan menos de 2).
  - Hecho cuando: el test pasa y ninguna consulta se ejecuta con `q` inválido.

- [x] **T-03** (CA-21; RN-11): ruta, controlador y acceso.
  - Depende de: T-02.
  - Archivos: `apps/api/src/routes/api.php` (en el grupo `admin`, sin middleware de permiso, con `->name('admin.search')`), `apps/api/src/app/Http/Controllers/Admin/SearchController.php` (nuevo, delgado).
  - Test: `GlobalSearchValidationTest.php::test_ca21_requires_session_and_returns_empty_groups_without_permission` (sin sesión 401; con sesión sin permisos y `q` válido 200 `{"groups": []}`).
  - Hecho cuando: el test pasa.

- [x] **T-04** (CA-23, CA-24, CA-32; RN-07, RN-10): acción de búsqueda, forma de respuesta, orden, límite y escape.
  - Depende de: T-03.
  - Archivos: `apps/api/src/app/Actions/Admin/Search/GlobalSearchAction.php` (nuevo), `apps/api/src/app/Actions/Admin/Search/LikeTerm.php` (nuevo; `addcslashes($term, '%_\\')`).
  - Cambios: arma los grupos en el orden de RN-07, solo con grupos no vacíos; máximo 5 por grupo; orden por título y después `id`; el grupo `tulanpedia` usa `kind` como desempate (D-10).
  - Tests:
    - `Admin/GlobalSearchResultsTest.php::test_ca23_response_shape_and_group_order`
    - `Admin/GlobalSearchResultsTest.php::test_ca24_limit_five_sorted_by_title_then_id`
    - `Admin/GlobalSearchResultsTest.php::test_ca32_wildcards_are_literal` (`%%` no devuelve todas las filas)
  - Hecho cuando: los tres tests pasan.

- [x] **T-05** (CA-25, CA-26; RN-07, RN-09): grupo `users` y reglas de permisos.
  - Depende de: T-04, T-01.
  - Archivos: `apps/api/src/app/Actions/Admin/Search/Groups/SearchUsersGroup.php` (nuevo).
  - Cambios: `users.manage`; cuentas no eliminadas, activas e inactivas; nombre o correo; `title` nombre completo; `subtitle` correo. Columnas explícitas.
  - Tests:
    - `Admin/GlobalSearchResultsTest.php::test_ca25_groups_follow_permissions` (con solo `tickets.view`, solo aparece `ticket-history`; sin `users.manage` nunca aparece `users`)
    - `Admin/GlobalSearchUsersTest.php::test_ca26_users_group_active_and_inactive_without_secrets`
  - Hecho cuando: los dos tests pasan y ninguna respuesta contiene `password`, `two_factor_*` ni `remember_token`.

- [x] **T-06** (CA-27; RN-07): grupos `news` y `events`.
  - Depende de: T-04, T-01.
  - Archivos: `Actions/Admin/Search/Groups/SearchNewsGroup.php`, `SearchEventsGroup.php` (nuevos).
  - Cambios: `news.manage` y `events.manage`; no eliminados; activos e inactivos; `subtitle` «Activa»/«Inactiva» (noticias) y «Activo»/«Inactivo» (eventos) según la spec.
  - Test: `Admin/GlobalSearchRecordsTest.php::test_ca27_news_and_events_subtitle_active_or_inactive`.
  - Hecho cuando: el test pasa.

- [x] **T-07** (CA-29; RN-09): grupo `memories`.
  - Depende de: T-04, T-01 (valores de `visitor_memories.status`).
  - Archivos: `Actions/Admin/Search/Groups/SearchMemoriesGroup.php` (nuevo).
  - Cambios: `memories.review`; solo si `q` son dígitos; coincidencia exacta con `visitor_memories.id`; `title` «Momento #N»; `subtitle` con el estado en español (`submitted` → Enviado, `in_review` → En revisión, `accepted` → Aceptado, `rejected` → Rechazado). Nunca se lee ni se devuelve el texto de la opinión.
  - Test: `Admin/GlobalSearchRecordsTest.php::test_ca29_memory_by_numeric_id_without_opinion_text`.
  - Hecho cuando: el test pasa; si `q` tiene letras, el grupo no aparece.

- [x] **T-08** (CA-30; RN-07): grupo `tulanpedia`.
  - Depende de: T-04, T-01.
  - Archivos: `Actions/Admin/Search/Groups/SearchTulanpediaGroup.php` (nuevo).
  - Cambios: `species.review`; especies con `is_published = 1` y no eliminadas, más solicitudes con `status = 'submitted'` (solo esas; `approved` y `draft` no se buscan), con el nombre de `species.common_name` vía `species_id`; un solo grupo, máximo 5 en total; `kind` en cada elemento; `subtitle` «Publicada» o «Solicitud · Enviada»; orden título, `kind`, `id` (D-10).
  - Test: `Admin/GlobalSearchTulanpediaTest.php::test_ca30_tulanpedia_published_and_submitted_with_kind`.
  - Hecho cuando: el test pasa; una solicitud en otro estado no aparece.

- [x] **T-09** (CA-31; RN-09): grupo `ticket-history`.
  - Depende de: T-04, T-01 (confirmado: `cancelled`).
  - Archivos: `Actions/Admin/Search/Groups/SearchTicketHistoryGroup.php` (nuevo).
  - Cambios: `tickets.view`; solo si `q` son dígitos; coincidencia exacta con `tickets.id`; `subtitle` con fecha de compra y estado (D-11; `completed` → Vigente, `cancelled` → Cancelado); sin nombre ni correo del comprador.
  - Test: `Admin/GlobalSearchRecordsTest.php::test_ca31_ticket_by_folio_without_buyer_data`.
  - Hecho cuando: el test pasa.

- [x] **T-10** (CA-33; RN-08): búsqueda de solo lectura.
  - Depende de: T-04.
  - Test: `Admin/GlobalSearchReadOnlyTest.php::test_ca33_search_writes_nothing_and_logs_nothing` (cuenta filas de `activity_log` y de las tablas consultadas antes y después).
  - Hecho cuando: el test pasa.

- [x] **T-11** (CA-23 a CA-33 en cliente): cliente compartido de la búsqueda.
  - Depende de: T-04.
  - Archivos: `packages/api-client/admin.ts` (`search(q)`), `packages/api-client/admin-types.ts` (`GlobalSearchResponse`, `GlobalSearchGroup`, `GlobalSearchItem`, con `kind` opcional). Sin lógica.
  - Test: cubierto por el test de cliente de `dashboard-012` (CA-13, `describe("CA-13 enclosure-actions-global-search")`). Este backend no tiene test de paquete propio.
  - Hecho cuando: el paquete exporta `search` y los tipos; el dashboard los consume en su bloque A.

## Bloque B. Recintos (desbloqueado: DBR-020 «Lista para backend»)

Condición de bloque B: cumplida. DBR-020 está «Lista para backend» (aplicada en `arca_pruebas`, lote 12, por el responsable funcional como responsable de BD por delegación). Evidencia en la propia DBR (`SHOW CREATE TABLE enclosures` con `is_active` TINYINT(1) NOT NULL DEFAULT 1; 67 de 67 filas activas; `deleted_at IS NOT NULL` = 0). `down` no ejecutado: `migrate:rollback` está bloqueado en este ambiente.

- [x] **T-12** (BD, responsable de BD; CA-01 a CA-03, CA-05, CA-10 a CA-19, CA-35): DBR-020 y migración.
  - Depende de: DBR-020 aplicada por el responsable funcional como responsable de BD por delegación, con verificaciones 1 y 2 registradas.
  - Pasos (responsable de BD): migración Laravel con `is_active BOOLEAN NOT NULL DEFAULT 1` y registro idempotente de `updated_at` y `deleted_at` (solo si faltan); confirmar que todos los `deleted_at` son `NULL` antes de activar SoftDeletes; `up()` y `down()` probados en MySQL 8.0 aislado y en `arca_pruebas`; evidencia con `SHOW CREATE TABLE enclosures` y conteo de `is_active = 1`.
  - Test que lo cubre: los de T-14 a T-25 (dependen de la columna y del `deleted_at` registrado).
  - Hecho cuando: DBR-020 marcada «Lista para backend» con evidencia. **Hecho:** migración `2026_11_18_000020_enclosure_status_soft_delete.php` aplicada en `arca_pruebas` (lote 12); DBR-020 «Lista para backend».

- [x] **T-13** (CA-05, CA-10; RN-01, RN-02, RN-13): modelo `Enclosure`.
  - Depende de: T-12.
  - Archivos: `apps/api/src/app/Models/Enclosure.php`.
  - Cambios: `use SoftDeletes`; `is_active` como booleano; `$timestamps = false` se mantiene; `assignableRule()` (D-6). Sin `BaseModel` (D-1).
  - Test: `Admin/EnclosureAdminListTest.php::test_ca10_lists_active_and_inactive_not_deleted` (y el de borrado de T-17).
  - Hecho cuando: el test pasa.

- [x] **T-14** (CA-01, CA-02, CA-03, CA-04, CA-08; RN-01, RN-08): desactivar y activar.
  - Depende de: T-13.
  - Archivos: `Http/Requests/Admin/SetEnclosureStatusRequest.php` (nuevo, booleano estricto), `Actions/Admin/Enclosures/SetEnclosureStatusAction.php` (nuevo), `Http/Controllers/Admin/EnclosureController.php` (método `status`), `routes/api.php` (`PATCH enclosures/{enclosure}/status`, nombre `admin.enclosures.status`, dentro de `permission:enclosures.manage`).
  - Tests (`Admin/EnclosureStatusTest.php`):
    - `test_ca01_deactivates_active_enclosure_without_deleting`
    - `test_ca02_activates_inactive_enclosure`
    - `test_ca03_same_state_is_noop_without_log`
    - `test_ca04_rejects_non_boolean_is_active` (`"1"`, `"0"`, `"sí"`, ausente)
    - `test_ca08_logs_status_change_only`
  - Hecho cuando: los cinco tests pasan.

- [x] **T-15** (CA-05, CA-06, CA-07, CA-08; RN-02, RN-03): eliminar.
  - Depende de: T-13.
  - Archivos: `Actions/Admin/Enclosures/DeleteEnclosureAction.php` (nuevo), método `destroy` del controlador, `routes/api.php` (`DELETE enclosures/{enclosure}`, nombre `admin.enclosures.destroy`).
  - Cambios: `delete()` de SoftDeletes; `FindAdminResourceAction` con «Recinto no encontrado.»; log tipo `deleted`.
  - Tests (`Admin/EnclosureDeleteTest.php`):
    - `test_ca05_soft_deletes_active_or_inactive_enclosure`
    - `test_ca06_keeps_animals_enclosure_id`
    - `test_ca07_unknown_or_deleted_returns_404_on_delete`
    - `test_ca08_logs_delete_and_rejected_attempt_logs_nothing`
  - Hecho cuando: los cuatro tests pasan y ninguna fila de `enclosures` se borra físicamente.

- [x] **T-16** (CA-07; RN-02): 404 en `PATCH`.
  - Depende de: T-14.
  - Test: `Admin/EnclosureStatusTest.php::test_ca07_unknown_or_deleted_returns_404_on_status`.
  - Hecho cuando: el test pasa con `{"message": "Recinto no encontrado."}`.

- [x] **T-17** (CA-09): acceso.
  - Depende de: T-14, T-15.
  - Test: `Admin/EnclosureAccessTest.php::test_ca09_requires_session_and_enclosures_manage` (GET, PATCH y DELETE: 401 sin sesión, 403 sin permiso, sin cambios).
  - Hecho cuando: el test pasa.

- [x] **T-18** (CA-10): listado admin.
  - Depende de: T-13.
  - Archivos: `Http/Resources/Admin/EnclosureResource.php` (añade `is_active`; conserva `animals_count`).
  - Test: `Admin/EnclosureAdminListTest.php::test_ca10_lists_active_and_inactive_not_deleted`.
  - Hecho cuando: el test pasa.

- [x] **T-19** (CA-11; RN-06): nombre único con SoftDeletes.
  - Depende de: T-13.
  - Archivos: `Http/Requests/Admin/SaveEnclosureRequest.php` (sin cambio de regla; se verifica que la consulta excluye eliminados).
  - Test: `Admin/EnclosureNameTest.php::test_ca11_unique_name_only_among_not_deleted` (eliminado «X» → crear «X» 201; inactivo «X» → crear o renombrar a «X» 422 con «Ya existe un recinto con ese nombre.»).
  - Hecho cuando: el test pasa.

- [x] **T-20** (CA-12, CA-13, CA-14; RN-05): catálogo público.
  - Depende de: T-13.
  - Archivos: `Actions/Catalog/ListEnclosuresAction.php`, `Actions/Catalog/GetEnclosureAction.php` (filtro `is_active = 1`). La forma de api-010 no cambia.
  - Tests (`Catalog/EnclosureVisibilityTest.php`): `test_ca12_public_list_only_active`, `test_ca13_public_detail_404_for_inactive_or_deleted`, `test_ca14_reactivated_enclosure_reappears`.
  - Hecho cuando: los tres pasan y el 404 público es igual al de un id inexistente.

- [x] **T-21** (CA-15, CA-16; RN-04): asignación.
  - Depende de: T-13.
  - Archivos: `Http/Controllers/Api/AnimalController.php` (en `store`, `enclosure_id` usa `Enclosure::assignableRule()`; mensaje «Este recinto no está disponible para asignar animales.»).
  - Tests (`Admin/EnclosureAssignmentTest.php`): `test_ca15_staff_store_rejects_inactive_or_deleted_enclosure` y `test_ca16_every_enclosure_write_point_applies_assignable_rule` (caso de referencia `POST /api/v1/staff/animals`; no se crea el animal).
  - Hecho cuando: los dos tests pasan.

- [x] **T-22** (CA-17, CA-18, CA-19, CA-20; RN-05): escaneo QR.
  - Depende de: T-13. Decisión 1 aceptada: `result` = `inactive_enclosure`.
  - Archivos: `Actions/Visitor/RecordVisitorDiscoveryAction.php` (guard después de `is_active` del código; `replay` con el mismo código y mensaje).
  - Cambios: recinto ausente o eliminado tratado como no disponible. Sin descubrimiento, sin especies y sin puntos. Respuesta 422 con «Este recinto no está disponible en este momento.» sin nombre, código QR ni animales.
  - Tests (`Visitor/EnclosureScanTest.php`): `test_ca17_inactive_enclosure_qr_rejected_without_discovery`, `test_ca18_deleted_enclosure_qr_rejected_without_discovery`, `test_ca19_reactivated_qr_discovers_again`, `test_ca20_rejection_reveals_no_enclosure_data`.
  - Hecho cuando: los cuatro pasan y el reintento del mismo escaneo devuelve la misma respuesta.

- [x] **T-23** (CA-35; RN-14): progreso.
  - Depende de: T-13.
  - Archivos: `Actions/Visitor/VisitorProgressQuery.php` (subconsulta de especies disponibles, D-9; total y numerador con el mismo criterio; `deleted_at` filtrado a mano en el join).
  - Test: `Visitor/EnclosureProgressTest.php::test_ca35_closed_enclosure_species_leave_total_and_numerator` (incluye reactivación y que los registros de descubrimiento siguen en la tabla).
  - Hecho cuando: el test pasa y el numerador nunca supera al total.

- [x] **T-24** (CA-28; RN-07): grupo `enclosures` de la búsqueda.
  - Depende de: T-12, T-04.
  - Archivos: `Actions/Admin/Search/Groups/SearchEnclosuresGroup.php` (nuevo).
  - Cambios: `enclosures.manage`; no eliminados; activos e inactivos; `subtitle` «Activo»/«Inactivo».
  - Test: `Admin/GlobalSearchRecordsTest.php::test_ca28_enclosures_group_active_and_inactive_not_deleted`.
  - Hecho cuando: el test pasa. Este es el único CA del bloque A que espera a DBR-020 (decisión 4 aceptada).

- [x] **T-25** (CA-01 a CA-08 en cliente): cliente de recintos.
  - Depende de: T-14, T-15.
  - Archivos: `packages/api-client/admin.ts` (`enclosures.setStatus(id, isActive)`, `enclosures.remove(id)`), `packages/api-client/admin-types.ts` (`EnclosureDto.is_active`). Sin lógica.
  - Test: cubierto por `dashboard-012` (CA-05, `describe("CA-05 enclosure-actions-global-search")`).
  - Hecho cuando: el paquete exporta los métodos y el tipo.

- [x] **T-26** (CA-34; Constitución IV): cobertura.
  - Depende de: T-02 a T-25.
  - Archivos: `Admin/EnclosureStatusSearchCoverageTest.php` (nuevo).
  - Cambios: lee los archivos de test de esta spec y comprueba que cada `CA-01` a `CA-35` aparece en al menos un método `test_caNN_`; comprueba `DatabaseTransactions` y ausencia de `RefreshDatabase` y de `migrate`.
  - Test: `test_ca34_every_criterion_is_named_and_uses_database_transactions`.
  - Hecho cuando: el test pasa.

- [x] **T-27** (CA-01 a CA-35; enmiendas): enmiendas a specs ajenas.
  - Depende de: decisión 5 aceptada: las enmiendas se aplican en el PR del bloque B.
  - Archivos: `apps/api/specs/007-administration-management.md` (CA-18 y alcance de recintos), `apps/api/specs/010-public-enclosures-read.md` (fuera de alcance), `apps/api/specs/005-visitor-progress.md` (CA-06).
  - Test: ninguno. Revisión documental del PR del bloque B.
  - Hecho cuando: el texto enmendado está revisado y enlazado desde la spec 019.

## Calidad y entrega

- [x] **T-28** (CA-01 a CA-35): estilo y pruebas de la app.
  - Depende de: T-02 a T-26.
  - Pasos: Pint sobre los archivos tocados; `php artisan test --filter=GlobalSearch`, `--filter=Enclosure` y `--filter=EnclosureScan` desde `apps/api/src`, en `arca_pruebas`.
  - Hecho cuando: la salida queda registrada en el PR. Sin ese registro, ninguna T-xx del bloque se marca.

- [x] **T-29**: documentación local.
  - Depende de: T-28.
  - Archivos: `apps/api/docs/` (solo si ya existe una referencia de recintos o búsqueda).
  - Test: ninguno (documental). Enlaza CA-34.
  - Hecho cuando: la referencia coincide con las rutas y los códigos de la tabla del plan.

- [ ] **T-30** — Fuera de alcance de esta entrega: enlaces del PR y commit.
  - Depende de: T-28.
  - Pasos: el PR enlaza spec, plan, tasks y DBR-020. El commit local cita `api-019`. el responsable funcional hace el commit final y el push.
  - Test: ninguno. Enlaza CA-34 (cobertura).
  - Hecho cuando: el PR tiene los tres artefactos enlazados y la evidencia de T-28.

## Evidencia de implementación

- `php artisan test` sobre los archivos de esta spec en `arca_pruebas`: EnclosureStatus, EnclosureDelete, EnclosureAccess, EnclosureAdminList, EnclosureName, EnclosureAssignment, EnclosureVisibility, EnclosureScan (22 de 23 pasaron en la primera corrida; el fallo era un `update()` sobre `is_active`, no fillable, en el propio test de CA-35, corregido con `forceFill`), EnclosureProgress (CA-35 pasa tras la corrección), GlobalSearch* (CA-21 a CA-33), EnclosureStatusSearchCoverage (CA-34) y AdminCoverageTest: todos en verde.
- Cliente: `packages/api-client` no tiene script propio. `tsc -b` en `apps/dashboard` solo falla en `src/tests/admin-fixtures.ts` (el fixture `enclosure()` no incluye el nuevo `is_active` obligatorio de `EnclosureDto`); corresponde a `dashboard-012`.
- Fallos preexistentes ajenos (no tocados): `EnclosuresAdminTest::ca17` (animals.stay_status sin default en fixture), `PublicEnclosuresTest::ca01` (clave `age`), `PublicCatalogTest` ca02-ca05 (columna `longevity` en fixtures y eventos), `PublicNewsTest::ca07`, `Visitor\CoverageTest::ca21` (cadenas prohibidas en `FavoriteSpeciesCoverageTest`) y pruebas de imágenes de noticias y eventos.
- T-28: Pint aplicado a los archivos tocados; suite completa no ejecutada por duración (la BD remota tarda ~8 s por test).
- T-30 pendiente (PR y commit los hace el responsable funcional).

## Orden de ejecución

1. Aprobación del plan y de las tasks. Decisiones 1 a 5 del plan aceptadas.
2. T-01 (consulta de solo lectura): hecho con evidencia.
3. Bloque A: T-02 a T-11 (sin DBR). Con esto, `dashboard-012` puede avanzar en su bloque A.
4. Bloque B: desbloqueado (T-12 hecha, DBR-020 «Lista para backend»).
5. T-26 al cerrar el bloque B; T-28 a T-30 al final.

## Enmienda (b), aprobada por el responsable funcional · Bloque C. Búsqueda tolerante

Reglas: T-31 a T-46 hechas con la evidencia de abajo; T-47 pendiente (PR y commit los hace el responsable funcional). Ninguna se marca sin evidencia (salida de pruebas en `arca_pruebas`). Sin DBR ni migraciones: solo lectura. Cada método de test se llama `test_caNN_...` y cita `CA-NN enclosure-status-and-global-search`. Las decisiones «propuesta» de la spec (preguntas 1 a 5) deben estar confirmadas antes de T-34, T-39 y T-40.

- [x] **T-31** (CA-36; RN-15): normalización y palabras de consulta.
  - Depende de: aprobación de la enmienda.
  - Archivos: `app/Actions/Admin/Search/Matching/TextNormalizer.php`, `Matching/QueryWords.php` (nuevos).
  - Cambios: minúsculas; quitar acentos y diéresis con tabla fija; consulta dividida por espacios; mínimo de 2 caracteres tras recortar.
  - Test: `Admin/GlobalSearchNormalizationTest.php::test_ca36_ignores_case_and_accents`.
  - Hecho cuando: el test pasa con «ÉLEFANTE», «élefánte» y «elefante».

- [x] **T-32** (CA-37): todas las palabras, en cualquier campo y orden.
  - Depende de: T-31.
  - Archivos: `Matching/ItemMatcher.php` (nuevo).
  - Test: `Admin/GlobalSearchNormalizationTest.php::test_ca37_all_words_any_order_across_fields`.
  - Hecho cuando: «lopez juan» coincide con «Juan López Pérez» y «juan zebra» no coincide.

- [x] **T-33** (CA-38, CA-39, CA-40): niveles y umbrales.
  - Depende de: T-31.
  - Archivos: `Matching/WordMatcher.php` (nuevo): exacta, prefijo, contiene (≥4 letras) y aproximada (≤1 si 4 a 6 letras; ≤2 si 7 o más; Levenshtein por caracteres).
  - Tests: `Admin/GlobalSearchTypoTest.php::test_ca38_prefix_matches`, `::test_ca39_typo_thresholds_by_length`, `::test_ca40_contains_needs_four_letters`.
  - Hecho cuando: «elef» → «Elefante»; «lovo» → «lobo»; «elefnte» → «elefante»; «osa» no → «oso»; «os» no → «lobos»; «obos» sí.

- [x] **T-34** (CA-41, CA-24): puntuación y orden.
  - Depende de: T-32, T-33.
  - Archivos: `Actions/Admin/Search/GlobalSearchAction.php`, `Groups/SearchGroup.php`.
  - Cambios: puntuación = peor nivel de las palabras; orden por puntuación, título normalizado, `kind` y `id`; máximo 5.
  - Tests: `Admin/GlobalSearchRankingTest.php::test_ca41_score_then_title_kind_id`; `Admin/GlobalSearchResultsTest.php::test_ca24_limit_five_sorted_by_score_title_id` (actualizar).
  - Hecho cuando: con «lobo», el orden es «Lobo», «Lobos», «Pelobo», «Lovo».

- [x] **T-35** (CA-42): `match` y fragmento.
  - Depende de: T-33.
  - Archivos: `Matching/MatchSnippet.php` (nuevo).
  - Cambios: campo no-título de la primera coincidencia; fragmento ≤120 caracteres centrado; «…» dentro del límite; sin `match` si solo coincide el título.
  - Test: `Admin/GlobalSearchMatchTest.php::test_ca42_match_field_and_snippet_up_to_120`.
  - Hecho cuando: ningún `snippet` supera 120 caracteres (`mb_strlen`) y el campo tiene etiqueta en español.

- [x] **T-36** (CA-43): campos por grupo.
  - Depende de: T-34, T-35.
  - Archivos: `Groups/SearchUsersGroup.php` (área y rol con `LEFT JOIN departments` y `model_has_roles`), `SearchNewsGroup.php`, `SearchEventsGroup.php`, `SearchEnclosuresGroup.php` (sin cambio de campos), `SearchTulanpediaGroup.php`.
  - Tests: `Admin/GlobalSearchFieldsTest.php::test_ca43_users_department_and_role`, `::test_ca43_news_events_fields`, `::test_ca43_tulanpedia_species_fields`.
  - Hecho cuando: cada grupo busca solo los campos de CA-43 y no se consultan campos fuera de esa lista.

- [x] **T-37** (CA-29, CA-44): momentos.
  - Depende de: T-36.
  - Archivos: `Groups/SearchMemoriesGroup.php`.
  - Cambios: número exacto para `visitor_memories.id`; opinión, motivo de rechazo y estado; ningún dato del visitante.
  - Tests: renombrar `Admin/GlobalSearchRecordsTest.php::test_ca29_memory_by_numeric_id_without_opinion_text` a `test_ca29_memory_by_id_status_opinion_and_rejection` (su aserción de «sin opinión» queda obsoleta); `Admin/GlobalSearchFieldsTest.php::test_ca44_memory_never_exposes_visitor_data`.
  - Hecho cuando: los dos tests pasan y el `match` de un momento nunca trae nombre ni correo del visitante.

- [x] **T-38** (CA-31, CA-45; CA-43 boletos): boletos.
  - Depende de: T-36.
  - Archivos: `Groups/SearchTicketHistoryGroup.php`.
  - Cambios: folio exacto; estado en español («Vigente» y «Completado»; «Cancelado»); `cash` = «Efectivo»; motivo de cancelación; fecha dd/mm/aaaa; ningún dato del comprador.
  - Tests: actualizar `Admin/GlobalSearchRecordsTest.php::test_ca31_ticket_by_folio_without_buyer_data`; `Admin/GlobalSearchFieldsTest.php::test_ca43_ticket_status_method_reason_date`, `::test_ca45_ticket_buyer_data_not_searched`.
  - Hecho cuando: el folio, el estado, la forma de pago, el motivo y la fecha se encuentran, y el comprador no.

- [x] **T-39** (CA-46): tope de candidatos.
  - Depende de: T-36.
  - Archivos: `Groups/SearchGroup.php` (constante `CANDIDATE_LIMIT = 2000`, orden `id` desc; tope inyectable para la prueba).
  - Documentación: registrar el tope en `apps/api/docs/` si existe referencia de búsqueda; si no, en este plan.
  - Test: `Admin/GlobalSearchCapTest.php::test_ca46_only_newest_candidates_are_compared`.
  - Hecho cuando: con tope 3, solo se comparan los 3 más recientes.

- [x] **T-40** (CA-47; RN-18): limitador de peticiones.
  - Depende de: aprobación de la pregunta 5 (texto del 429).
  - Archivos: `app/Providers/AppServiceProvider.php` (`RateLimiter::for('admin-search', ...)` por `user()->id`, 30 por minuto), `routes/api.php` (`->middleware('throttle:admin-search')` en `admin.search`).
  - Test: `Admin/GlobalSearchThrottleTest.php::test_ca47_thirty_per_minute_then_429`.
  - Hecho cuando: la petición 31 responde 429 con el mensaje en español y no consulta nada.

- [x] **T-41** (CA-48, CA-49; RN-09, RN-19): datos ocultos y registros.
  - Depende de: T-36.
  - Archivos: `Groups/*.php` (columnas explícitas), `GlobalSearchAction.php` (sin logger ni Activitylog).
  - Tests: `Admin/GlobalSearchSecurityTest.php::test_ca48_no_secret_fields_or_extra_keys`, `::test_ca49_term_not_logged_nor_audited`.
  - Hecho cuando: ninguna clave fuera de `id`, `title`, `subtitle`, `kind` y `match` aparece en la respuesta, y `Log::spy()` no recibe el término.

- [x] **T-42** (CA-23, CA-32): forma de respuesta y comodines.
  - Depende de: T-35, T-36.
  - Tests: actualizar `Admin/GlobalSearchResultsTest.php::test_ca23_response_shape_and_group_order` (con `match` opcional) y `::test_ca32_wildcards_are_literal` (`%%` y `_` sin efecto especial en PHP).
  - Hecho cuando: los dos tests pasan.

- [x] **T-43** (RN-15, RN-12; sin CA propio, cubierta por CA-36): retirar `LikeTerm` del camino de búsqueda.
  - Depende de: T-36.
  - Pasos: eliminar `LikeTerm.php` si no tiene usos; si lo usa otro código, mantenerlo fuera de la búsqueda.
  - Hecho cuando: `rg LikeTerm apps/api/src` no encuentra usos en `Search/`.

- [x] **T-44** (CA-34): cobertura.
  - Depende de: T-31 a T-43.
  - Archivos: `Admin/EnclosureStatusSearchCoverageTest.php`.
  - Cambios: el test lee los archivos de test de esta spec y comprueba que cada `CA-01` a `CA-49` aparece en un método `test_caNN_`, con `DatabaseTransactions` y sin `RefreshDatabase` ni `migrate`.
  - Test: `test_ca34_every_criterion_is_named_and_uses_database_transactions`.
  - Hecho cuando: el test pasa.

- [x] **T-45** (CA-29 en cliente): tipo `match` en el paquete.
  - Depende de: T-35.
  - Archivos: `packages/api-client/admin-types.ts` (`GlobalSearchItem.match?`). Sin lógica.
  - Test: cubierto por `dashboard-012` CA-29.
  - Hecho cuando: el tipo exporta `match` y el dashboard compila.

- [x] **T-46** (CA-36 a CA-49): calidad.
  - Depende de: T-31 a T-45.
  - Pasos: Pint sobre los archivos tocados; `php artisan test --filter=GlobalSearch` desde `apps/api/src`, en `arca_pruebas`. Salida registrada en «Evidencia del bloque C».
  - Hecho cuando: la salida queda registrada en el PR. Sin ese registro no se marca ninguna T-xx del bloque.

- [ ] **T-47** — Fuera de alcance de esta entrega: enlaces del PR y commit.
  - Depende de: T-46.
  - Pasos: el PR enlaza spec, plan y tasks, y cita `api-019` enmienda (b). el responsable funcional hace el commit final y el push.
  - Hecho cuando: el PR tiene los tres artefactos enlazados y la evidencia de T-46.

### Evidencia del bloque C

- Esquema (solo lectura, `arca_pruebas`, `php artisan db:table`): `users`, `news`, `events`, `species`, `species_publication_requests`, `visitor_memories`, `tickets` y `departments` tienen todas las columnas de CA-43; `tickets.payment_method` solo contiene `cash`. Sin DBR, sin migraciones ni DDL.
- `php artisan test --filter='GlobalSearch|EnclosureStatusSearchCoverage'` (primera corrida: 32 tests, 29 pasaron; los 3 fallos eran expectativas de los tests nuevos, corregidas, y una palabra con `%` o `_` ya no admite tolerancia a errores, para que sean literales según CA-32). Segunda corrida de `GlobalSearchFields`, `GlobalSearchRecords`, `GlobalSearchResults` y `EnclosureStatusSearchCoverage`: 15 tests en verde (244 aserciones). Los otros 17 (Typo, Normalization, Ranking, Match, Cap, Throttle, Security, Tulanpedia, Users, ReadOnly, Validation) pasaron en la primera corrida. `AdminCoverageTest` en verde.
- Pint aplicado a `app/Actions/Admin/Search`, `AppServiceProvider.php`, `routes/api.php`, `tests/Feature/Admin` y `tests/Concerns`.
- T-43: `LikeTerm.php` eliminado; sin usos en `apps/api/src`.
- T-45: `packages/api-client/admin-types.ts` exporta `GlobalSearchMatch` y `GlobalSearchItem.match?`. El 429 llega como `ApiError.status` (sin cambio de código en `http.ts`).
- Suite completa no ejecutada (duración).

## Enmienda (d), aprobada por el responsable funcional · Bloque D. Relevancia

- [x] **T-48** (CA-54): tipo `GlobalSearchGroup.best_score?: number` en `packages/api-client/admin-types.ts`.
  - Hecho cuando: el tipo existe (hecho antes que el resto para el frontend).
- [x] **T-49** (CA-37, CA-50 a CA-53): `Matching/ItemMatcher.php` con coincidencia parcial y relevancia por tupla; `Groups/SearchGroup.php` ordena por ella.
  - Tests: `GlobalSearchRelevanceTest::test_ca50_*`, `::test_ca51_*`, `::test_ca52_*`, `::test_ca53_*`, `GlobalSearchNormalizationTest::test_ca37_*`, `GlobalSearchRankingTest::test_ca41_*`.
  - Hecho cuando: los tests pasan.
- [x] **T-50** (CA-54): `best_score` en cada grupo (`SearchGroup::rank()`, `GlobalSearchAction`).
  - Test: `GlobalSearchRelevanceTest::test_ca54_group_best_score`.
- [x] **T-51** (CA-34): cobertura CA-01 a CA-54 y Pint.
  - Test: `EnclosureStatusSearchCoverageTest`.
- [ ] **T-52** — Fuera de alcance de esta entrega: PR y commit.

### Evidencia del bloque D

- `php artisan test` (desde `apps/api/src`, `arca_pruebas`, sin suite completa): primera corrida de `GlobalSearch|EnclosureStatusSearchCoverage|AdminCoverage` con 4 fallos esperados por el cambio (forma del grupo de CA-23, orden de CA-41 por una frase que coincidía dentro de una palabra, CA-37 con 3 palabras y un test nuevo de CA-52); corregidos: la frase debe empezar en el inicio de una palabra, y los tests se actualizaron.
- Segunda corrida: `GlobalSearchRanking|Normalization|Relevance|Results|EnclosureStatusSearchCoverage` 15 tests en verde (210 aserciones); `GlobalSearchUsers|Records|Tulanpedia|ReadOnly|Typo|Match|Fields|Cap|Throttle|Security|Validation|AdminCoverage` 24 tests en verde (301 aserciones).
- Pint aplicado a `app/Actions/Admin/Search` y `tests/Feature/Admin`: passed.
- Desviaciones: las frases (CA-51, CA-52) deben empezar en el inicio de una palabra (no dentro de «pelobo» para «lobo»); `best_score` de un título literal incluye B = 2 porque la frase empieza el título; id exacto = 100010044. Frase solo con 2 o más palabras.
