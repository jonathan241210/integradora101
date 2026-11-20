# Tareas · 024 · pending-review-counts

- Spec: `apps/api/specs/024-pending-review-counts.md` (Aprobada, 2026-11-20)
- Plan: `apps/api/plan/024-pending-review-counts.md` (Borrador — pendiente de aprobación técnica)
- DBR: ninguna (la feature no cambia el esquema).

**Pendiente: se ejecuta solo cuando el plan esté aprobado.** Todas las tareas están sin marcar. Ninguna se marca como hecha sin evidencia aportada por la sesión principal.

## Precondición

- [ ] **T-01** (sin CA; proceso): confirmar que `api-021`, `api-025`, `api-022` y `api-023` están mergeadas en la rama base (orden acordado). Rebase antes de tocar `routes/api.php` y `AppServiceProvider`. Sin cambio de código.

## Implementación

- [ ] **T-02** (CA-01, CA-02, CA-03): crear `app/Actions/Admin/PendingReview/GetPendingReviewCountsAction.php` con `execute(User $user): array`. Con `species.review` añade `species_requests` (`SpeciesPublicationRequest` en `submitted`, `whereHas('species')`). Con `memories.review` añade `memories` (`VisitorMemory` en `submitted` e `in_review`). Solo las claves permitidas. Valores de estado desde `SpeciesRequestStatus` y `MemoryStatus`. Sin escritura ni Activitylog (RN-01, RN-05, RN-07).
- [ ] **T-03** (CA-01, CA-02, CA-03, CA-04): tests en `tests/Feature/Admin/PendingReviewCountsTest.php`: `test_ca01_counts_both_keys_for_both_permissions`, `test_ca02_only_species_key_without_memories_permission`, `test_ca03_only_memories_key_without_species_permission`, `test_ca04_zero_when_nothing_pending`. Usuarios con `createAccount` y rol/permisos de prueba; cero pendientes devuelve `0`.
- [ ] **T-04** (CA-05, CA-06, CA-12): tests `test_ca05_counts_only_pending_states_and_matches_lists` (fixtures en `submitted`, `accepted`, `rejected` y, para momentos, `submitted`, `in_review`, `accepted`, `rejected`; compara con los listados `GET /api/v1/admin/species-publication-requests?status=submitted` y `GET /api/v1/admin/memories` con `submitted` e `in_review`, recorriendo páginas), `test_ca06_soft_deleted_rows_are_not_counted` y `test_ca12_species_request_of_soft_deleted_species_is_not_counted`.
- [ ] **T-05** (CA-01, CA-07): crear `app/Http/Controllers/Admin/PendingReviewCountsController.php` (invocable, delgado: `response()->json($action->execute($request->user()))`). En `routes/api.php`, dentro del grupo `admin`: `Route::get('pending-counts', PendingReviewCountsController::class)->middleware(['permission:species.review|memories.review', 'throttle:admin-pending-counts'])->name('pending-counts.show');`. Nombre resultante `admin.pending-counts.show`.
- [ ] **T-06** (CA-10): en `AppServiceProvider` añadir el limitador `admin-pending-counts`: `Limit::perMinute(60)` por identificador de usuario si tiene `species.review` o `memories.review`; `Limit::none()` en otro caso. Respuesta 429 JSON con `message` en español y las cabeceras del middleware (`Retry-After`), como `admin-search`.

## Pruebas

- [ ] **T-07** (CA-07): `tests/Feature/Admin/PendingReviewCountsAccessTest.php` con `test_ca07_403_without_either_permission_and_no_data` (`admin`, `executive`, `cashier`, `veterinarian`: 403 sin claves ni cifras), y casos de 401 sin sesión y de 2FA no confirmado en rol de 2FA (respuesta de `administrator.two-factor`, sin cifras).
- [ ] **T-08** (CA-08, CA-09): `test_ca08_response_contains_only_integer_counts` (solo claves de CA-01 a CA-03, enteros, sin ids, nombres, correos ni URLs) y `test_ca09_read_only_no_rows_or_activity_changed` (snapshot de `species_publication_requests`, `species`, `visitor_memories`, `visitor_memory_reviews` y Activitylog antes y después).
- [ ] **T-09** (CA-10): `tests/Feature/Admin/PendingReviewCountsThrottleTest.php` con `test_ca10_throttle_per_user_returns_429`: 60 llamadas dentro del límite responden 200; la 61.ª responde 429 con `Retry-After`; otro usuario no comparte el límite; un usuario sin permiso no consume cuota.
- [ ] **T-10** (CA-11): `tests/Feature/Admin/PendingReviewCountsCoverageTest.php` con `test_ca11_every_ca_is_named_and_suite_uses_database_transactions`: comprueba que existe un `test_caNN_` para CA-01 a CA-12 en los archivos de esta feature, que usan `DatabaseTransactions` y que ninguno usa `RefreshDatabase`.
- [ ] **T-11** (RN-08; CA-01, CA-02; condicionada a `api-023`): test `test_comunicacion_sees_both_keys` con el rol «Comunicación» (ambos permisos) y sus 2FA. Se ejecuta solo cuando `api-023` esté mergeada; hasta entonces queda abierta y se indica en el PR.

## Documentación y entrega

- [ ] **T-12**: actualizar `apps/api/docs/administracion.md` con `GET /api/v1/admin/pending-counts`, forma de la respuesta, permisos (`species.review|memories.review`), 401/403/429. Sin cambios en `infra/README.md` (no hay requisito de servidor).
- [ ] **T-13** (`/verify`): Pint sobre los archivos tocados; `php artisan test --filter PendingReview` contra `arca_pruebas` (nunca `arca_zoo`); comprobar que no se creó ninguna migración (`migrate:status` sin cambios). Registrar la salida real aportada por la sesión principal. Sin evidencia no se marca.
- [ ] **T-14** (entrega): PR enlaza `apps/api/specs/024-pending-review-counts.md`, `apps/api/plan/024-pending-review-counts.md`, `apps/api/tasks/024-pending-review-counts.md` y la tarea de cliente `apps/dashboard/tasks/018-pending-review-badges.md`. El commit cita `api-024`. Los commits los hace Jonathan con el comando que indique él. El cambio de estado de la spec (En progreso / Implementada) solo con aprobación humana y enlace al PR.

Cada tarea de código nombra su CA-xx; todo CA-xx tiene al menos una tarea de test (CA-01 a CA-12 cubiertos por T-03, T-04, T-05, T-07, T-08, T-09, T-10). Sin tareas de BD: no hay DBR.
