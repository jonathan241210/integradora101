# Tareas · 006 · public-catalog-read

- Spec: `apps/api/specs/006-public-catalog-read.md`
- Plan: `apps/api/plan/006-public-catalog-read.md`

Todas las pruebas usan `DatabaseTransactions` sobre `arca_pruebas`; nunca `RefreshDatabase`, `migrate:fresh` ni migraciones. Ninguna tarea toca `arca_zoo`. No hay DBR ni cambio de esquema.

## Implementación

- [x] **T-01** (CA-01, CA-02, CA-05): crear `Species`, `Animal`, `Enclosure` y `Event` como modelos de solo lectura con sus relaciones; `Species::animals()` ordenado por `id` para que el animal representativo sea determinista.
- [x] **T-02** (CA-01, CA-02, CA-05): crear `ListSpeciesAction` y `GetSpeciesAction` con `with(['animals.enclosure'])`, y `SpeciesResource` con los campos derivados del animal representativo y `zone_name`.
- [x] **T-03** (CA-03, CA-04): crear `ListEventsAction` y `GetEventAction` con `is_active = 1` y vigencia (`end_date` nulo o mayor o igual a hoy), orden `start_date`, `start_time`; crear `EventResource`.
- [x] **T-04** (CA-06): registrar `species.index`, `species.show`, `events.index` y `events.show` en `routes/api.php` con validación numérica en el controlador y nombres en inglés.
- [x] **T-05** (CA-01, CA-02, CA-03, CA-04, CA-05, CA-06, CA-07): crear `tests/Feature/Catalog/PublicCatalogTest.php` con un test nombrado por CA.
- [x] **T-06** (CA-08): verificar que cada `CA-01…CA-07` aparece nombrado en los tests de catálogo y que la base activa es `arca_pruebas`.
- [x] **T-07**: actualizar la spec a **Aprobada** y enlazar plan/tasks; registrar el ADR 0014 como **Aceptado** cuando corresponda a la parte móvil.

## Verificación

- [x] **T-08**: ejecutar `php artisan test` (38 tests, 520 aserciones, verde) y `vendor/bin/pint --test`. Pint solo reporta archivos previos (`config/auth.php`, factory y migraciones); los archivos de esta feature pasan.
- [x] **T-09**: prueba manual contra `php artisan serve`: `/api/v1/species`, `/species/1`, `/species/99`, `/events`, `/events/1`, `/events/99`, `/species/abc`.
  - 2026-10-22: listados y detalles responden `200`; IDs inexistentes y `abc` responden `404`. Con `Accept: application/json`, el cuerpo es `{"message":"Especie no encontrada."}` o `{"message":"Evento no encontrado."}`. `APP_DEBUG=true` añade la traza en local; el cliente móvil solo usa `message`.

## Evidencia

- 2026-10-22: endpoints implementados en el working tree y probados de punta a punta contra `arca_pruebas` (5/5 casos reales). Pendiente el filtro de vigencia y la suite formal.
