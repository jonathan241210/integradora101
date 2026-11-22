# Tareas · 026 · species-fun-fact

- Spec: `apps/api/specs/026-species-fun-fact.md` (Aprobada, Jonathan, 2026-11-21)
- Plan: `apps/api/plan/026-species-fun-fact.md` (Aprobado — aprobación técnica: Jonathan, 2026-11-21)
- DBR: `docs/database/requests/DBR-025-species-fun-fact.md` (Lista para backend, 2026-11-21)

Ninguna tarea está marcada. Una casilla se marca solo con evidencia aportada por la sesión principal (salida de comando, enlace a PR o resultado de test). Las tareas de backend (T-05 en adelante) no empiezan hasta que DBR-025 esté en **«Lista para backend»** (T-04).

## Base de datos (responsable de BD)

- [x] **T-01** (CA-16): revisar DBR-025 con BD (responsable por confirmar) y backend (Jonathan); repetir la consulta de solo lectura de `arca_pruebas` justo antes de aprobar (`fun_fact` inexistente en `species` y en `species_publication_requests`; `information_schema.COLUMNS` de ambas tablas); resolver «Verificaciones para BD» de la DBR (margen de fila, collation); estado `Aprobada` con fecha y firma en la DBR.
- [x] **T-02** (CA-07, CA-11): crear la migración idempotente de `species.fun_fact` y `species_publication_requests.fun_fact` (`VARCHAR(500) NULL`, sin default, sin índice, sin FK) con `down()`, bajo `apps/api/src/database/migrations/`. La crea BD según DBR-025. Evidencia: archivo de migración y revisión de BD.
- [ ] **T-03** (CA-07, CA-11): probar la migración en MySQL 8.0 aislado y en `arca_pruebas` (up, re-ejecución idempotente, `down()` en entorno aislado). Evidencia: salida de `migrate:status` y `SHOW CREATE TABLE` de ambas tablas. `migrate:rollback` no se ejecuta en `arca_pruebas`.
- [x] **T-04** (gate): cambiar el estado de DBR-025 a **«Lista para backend»** con evidencia de T-03. Sin este paso no inician T-05 a T-18.

## Implementación (backend; inicia con DBR-025 en «Lista para backend»)

- [x] **T-05** (CA-01; RN-01): añadir `FunFact = 'fun_fact'` a `App\Enums\PublishedSpeciesField` e incluirlo en `implemented()`. Test `Unit/PublishedSpeciesFieldTest.php::test_ca01_fun_fact_is_an_accepted_published_field` (la clave se acepta y `unknown_key` sigue en 422).
- [x] **T-06** (CA-02, CA-03; RN-01, RN-07): helper compartido de texto (recorte, `mb_strlen`, mínimo 20 cuando se muestra, máximo 500) y mensajes en español de la spec. Test `Unit/FunFactRulesTest.php` y `Feature/SpeciesPublication/FunFactValidationTest.php` (`test_ca02_required_and_min_20_when_selected`, `test_ca03_max_500_plain_text_trimmed`). Incluye 19, 20, 500 y 501 caracteres.
- [x] **T-07** (CA-04; RN-02): `StoreSpeciesPublicationRequest` acepta `fun_fact` (`nullable|string|max:500`) y `SubmitSpeciesPublicationRequestAction` guarda el texto solo si `published_fields` lo incluye; si no, NULL. Test `Feature/SpeciesPublication/SubmitFunFactTest.php::test_ca04_text_is_discarded_when_field_not_selected` (`201`, columna NULL).
- [x] **T-08** (CA-05; RN-02): edición de solicitud. `ValidatesSpeciesSheetEdit` añade `fun_fact`; `UpdateSpeciesPublicationRequestAction` valida el estado final dentro del bloqueo y deja NULL si el campo queda desmarcado. Test `Feature/SpeciesPublication/EditFunFactTest.php::test_ca05_patch_validates_fun_fact_on_final_state` (quitar, añadir sin texto, añadir con texto válido).
- [x] **T-09** (CA-06; RN-09): auditoría de `fun_fact` en la edición de solicitud y en la edición de especie despublicada (valor anterior y nuevo; sin registro si no cambia). Test `Feature/SpeciesPublication/EditFunFactTest.php::test_ca06_fun_fact_change_is_audited_with_before_and_after`.
- [x] **T-10** (CA-07; RN-03): `AcceptSpeciesPublicationRequestAction` copia `fun_fact` a `species` junto con `published_fields`, con y sin `publish`. Test `Feature/SpeciesPublication/AcceptFunFactTest.php::test_ca07_accept_copies_fun_fact_to_species`.
- [x] **T-11** (CA-08; RN-04): `UpdateUnpublishedSpeciesAction` aplica CA-02, CA-03 y CA-04 sobre `species.fun_fact`. Test `Feature/SpeciesPublication/UnpublishedFunFactTest.php::test_ca08_unpublished_species_sheet_validates_fun_fact`.
- [x] **T-12** (CA-09, CA-10; RN-05): `RepublishSpeciesAction` exige texto válido cuando el campo está seleccionado (mensaje de la spec); `DeleteSpeciesPublicationAction` no cambia `fun_fact`. Tests `Feature/SpeciesPublication/RepublishFunFactTest.php` (`test_ca09_republish_requires_valid_fun_fact_when_selected`, `test_ca10_delete_keeps_fun_fact_hidden_from_public`).
- [x] **T-13** (CA-11, CA-12; RN-06): `ListPublishedSpeciesAction` selecciona `species.fun_fact` y `PublishedSpeciesResource` lo añade solo si la clave está en `published_fields` (`FIELD_COLUMNS` con `fun_fact`). Tests `Feature/Catalog/PublishedSpeciesFunFactTest.php` (`test_ca11_public_returns_fun_fact_only_when_selected_and_visible`, `test_ca12_public_fun_fact_keeps_published_version_during_pending_update`).
- [x] **T-14** (CA-13; RN-10): comprobar que los listados de administración, `GET /api/v1/species` y `GET /api/v1/species/{id}` (`api-006`) no incluyen `fun_fact`; sin cambio de sus contratos. Test `Feature/SpeciesPublication/FunFactScopeTest.php::test_ca13_fun_fact_absent_from_lists_and_mobile_responses`.
- [x] **T-15** (CA-14): `SelectableSpeciesResource` añade `fun_fact` (valor vigente). Test `Feature/Veterinarian/SelectableSpeciesFunFactTest.php::test_ca14_selector_exposes_current_fun_fact_to_veterinarian` (y `403` sin rol `veterinarian`). Pendiente de confirmar la pregunta 1 de la spec.
- [x] **T-16** (CA-15): `SpeciesPublicationRequestDetailResource` y `SpeciesPublicationDetailResource` añaden `fun_fact` en `current` y `proposed`. Test `Feature/SpeciesPublication/FunFactScopeTest.php::test_ca15_admin_detail_shows_current_and_proposed_fun_fact` (y `403` sin `species.review`).

## Calidad, documentación y entrega

- [ ] **T-17** (CA-16): verificaciones de la API. Pint sobre los archivos tocados; `php artisan test` filtrado a los tests de esta spec y a la regresión de `api-014` y `api-015`, contra `arca_pruebas` (nunca `arca_zoo`, sin `RefreshDatabase`); `migrate:status`. Búsqueda de `test_ca01` a `test_ca15` en `apps/api/src/tests/` con su salida. Registrar la salida real aportada por la sesión principal. Sin evidencia, no se marca.
- [x] **T-18** (CA-11, CA-14): actualizar la documentación de la API: `apps/api/docs/contenido-publico.md` (campo `fun_fact` en la lectura pública y en el selector) y `apps/api/docs/administracion.md` (edición y aceptación con el campo). Sin cambio de `docs/`.
- [ ] **T-19** (CA-16): PR que enlaza `apps/api/specs/026-species-fun-fact.md`, `apps/api/plan/026-species-fun-fact.md`, `apps/api/tasks/026-species-fun-fact.md` y DBR-025, y los PR de `api-014` y `api-015` si siguen abiertos. El commit cita `api-026`. Los commits los hace Jonathan con el comando que indique.
- [ ] **T-20** (CA-16): actualizar el estado de la spec a «En progreso» al iniciar la implementación y a «Implementada» solo con enlace a PR y resultados de tests de CA-01 a CA-15.

## Consumidores (fuera de este documento)

Las revisiones de `pwa-005`, `dashboard-010` y `web-011` (enlazadas en la spec, sección «Cambios por área») y sus tipos en `packages/api-client` no tienen plan ni tareas aquí. Se crean cuando Jonathan confirme la forma del plan por app (pregunta 2 del plan). No empiezan antes de que la API esté implementada (T-13 y T-15).

Cada tarea de código nombra sus CA-xx y todos los CA-01 a CA-15 tienen al menos una tarea de test (T-05 a T-16). Las tareas de BD (T-01 a T-04) son del responsable de BD y no las ejecuta backend.

## Evidencia de BD (sesión principal, 2026-11-21, `arca_pruebas`)

- T-01: consulta previa de solo lectura (`db:table species`, `db:table species_publication_requests`): sin columna `fun_fact`; 9 y 7 filas. DBR-025 aprobada por Jonathan como responsable de BD por delegación.
- T-02: `database/migrations/2026_11_21_000025_species_fun_fact.php` (idempotente con `Schema::hasColumn`, `down()` que retira ambas columnas).
- `php artisan migrate --force` → DONE en lote 15; segunda ejecución → «Nothing to migrate» (idempotencia). `information_schema`: `species.fun_fact varchar(500) NULL utf8mb4_0900_ai_ci`, `species_publication_requests.fun_fact varchar(500) NULL utf8mb4_unicode_ci`.
- T-03 queda parcial: `down()` sin probar en MySQL aislado (rollback prohibido en `arca_pruebas`), igual que DBR-024.
- T-04: DBR-025 en «Lista para backend».

## Revisión de calidad 2026-11-21

- [x] **T-30** (CA-01, CA-16): los docblocks de los tests citan el slug `species-fun-fact`; `FunFactValidationTest::test_ca01_unknown_published_field_returns_422_with_message` cubre la clave desconocida y `Unit/FunFactCoverageTest` cubre CA-16.
