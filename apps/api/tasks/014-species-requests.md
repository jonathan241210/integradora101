# Tareas · 014 · species-requests

- Spec: `apps/api/specs/014-species-requests.md` (Aprobada, 2026-11-12)
- Plan: `apps/api/plan/014-species-requests.md` (Estado: **Aprobado**, Jonathan, 2026-11-13).
- Estado: **Aprobado** (Jonathan, responsable de backend, 2026-11-13). Implementación pendiente de iniciar; coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Aviso vigente: ninguna tarea está hecha. Ninguna casilla se marca sin evidencia aportada por la sesión principal.
- Bloqueo: no empezar T-03 hasta que se cumplan T-01 y T-02 (DBR-013 en «Lista para backend», migración aplicada en `arca_pruebas` con evidencia; cumplido el 2026-11-12 para la parte de la migración), la precondición P2 del plan (disco `media`, `api-013`, pendiente) y la P5 del plan (brecha de `BaseModel`, registrada como excepción el 2026-11-13). La precondición P4 (plan y tasks aprobados) está cumplida desde el 2026-11-13.
- Rutas de archivos: son previstas, bajo `apps/api/src/` (no existen aún). Los tests van en `apps/api/src/tests/`.
- Regla general: PHPUnit contra `arca_pruebas`, con `DatabaseTransactions`; prohibido `RefreshDatabase`, `migrate:fresh` o migraciones desde los tests. Nunca `arca_zoo`.

---

## Precondiciones (solo lectura)

- [ ] **T-01** (precondición de CA-01 a CA-41; RN-20): verificar P1 y P2 del plan en solo lectura.
  - [x] Ejecutar `php artisan migrate:status` desde `apps/api/src` (solo lectura; no ejecutar `migrate`). La migración `2026_11_12_000013_species_publication_requests_schema` debe figurar como ejecutada. **Evidencia (verificado 2026-11-12, lote 5):** `Ran`, después de `2026_11_11_000012_visitor_memories_schema` (lote 4); consulta de solo lectura de backend contra `arca_pruebas`.
  - Confirmar `DB_DATABASE=arca_pruebas` en `.env` local (sin copiar secretos al repositorio).
  - Confirmar que `api-013` está aprobada y que el disco `media` existe en `apps/api/src/config/filesystems.php`. Si no, detenerse.
  - Confirmar si `ext-gd` está disponible en el entorno de pruebas (riesgo R8 del plan). Si no, usar fixtures binarios.
  - Confirmar que no se crea ninguna migración ni SQL en esta fase.
  - Archivos: ninguno.
  - Hecho cuando: la evidencia (salida de `migrate:status`, estado de `api-013` y de `ext-gd`) está en el PR. Si algo falla, detenerse y reportarlo.

## Base de datos (responsable de BD)

- [x] **T-02** (precondición de CA-01 a CA-41; RN-20): aplicar la migración DBR-013 en `arca_pruebas`. **Nota de evidencia (verificado 2026-11-12, lote 5):** migración `Ran` y tablas y columnas presentes en `arca_pruebas`, por consulta de solo lectura de backend. Fecha y responsable de la aplicación: por registrar por BD. Pendiente de BD y no registrado: respaldo previo, pruebas de restricciones de DBR-013 (incluido EXPLAIN).
  - Responsable: BD (Víctor Adrián). Un agente no ejecuta esta tarea ni escribe SQL.
  - Pasos de BD: respaldo previo, aplicación de `2026_11_12_000013_species_publication_requests_schema`, pruebas de restricciones de DBR-013 («Pruebas y evidencia») y registro en `docs/database/requests/DBR-013-species-requests.md`, tabla «Aplicación por ambiente». Pasar DBR-013 a «Lista para backend».
  - Pendiente de BD antes de producción (no bloquea pruebas): C (`down()`), D (índices), E (texto de `is_published`), según la spec.
  - Archivos: `docs/database/requests/DBR-013-species-requests.md` (lo edita BD, no esta tarea).
  - Hecho cuando: evidencia de aplicación en `arca_pruebas` y DBR-013 en «Lista para backend». **Cumplido el 2026-11-12** (DBR-013 registrada en «Lista para backend»).

## Implementación: modelos, enums y almacenamiento

- [ ] **T-03** (CA-24; RN-20, RN-22): alinear `Species` con SoftDeletes sobre `Model` (decisión F).
  - Archivos: `apps/api/src/app/Models/Species.php` (modificar).
  - Cambios: añadir `SoftDeletes`; casts de `is_published` (boolean), `published_at` y `unpublished_at` (datetime), `published_fields` (array). Mantener `$timestamps = false` y `$guarded = []` hasta revisar `AnimalController::store` (`firstOrCreate`, `pwa-004`).
  - Regresión: la suite existente de catálogo (`apps/api/src/tests/Feature/Catalog/PublicCatalogTest.php`) y las pruebas de `AnimalController` deben seguir en verde sin cambios.
  - Tests: se verifican en T-09 (exclusión de `deleted_at`) y T-20 (listado admin).
  - Hecho cuando: `Species::query()` excluye filas con `deleted_at`, no se cambió `$guarded` sin revisión y la regresión pasa.

- [ ] **T-04** (RN-02, RN-03, RN-20): crear el modelo de solicitudes y sus estados.
  - Archivos: `apps/api/src/app/Models/SpeciesPublicationRequest.php` (nuevo); `apps/api/src/app/Enums/SpeciesRequestStatus.php` (nuevo: `submitted`, `accepted`, `rejected`); `apps/api/src/app/Enums/SpeciesRequestType.php` (nuevo: `publish`, `update`).
  - Cambios: tabla `species_publication_requests`; `SoftDeletes` sobre `Model`; `$fillable` explícito sin `id`, `status`, `submitted_species_id` ni `deleted_at`; casts de `published_fields` (array) y `reviewed_at` (datetime); relaciones `species`, `creator`, `reviewer`.
  - Tests: la inserción sin escribir la columna generada se prueba en T-12.
  - Hecho cuando: el modelo compila, `status` solo lo fija una Action y ninguna asignación en bloque escribe `submitted_species_id`.

- [ ] **T-05** (CA-21, CA-25; RN-13, RN-18): listas cerradas y estado derivado.
  - Archivos: `apps/api/src/app/Enums/SpeciesCategory.php` (nuevo: `mammal`, `bird`, `reptile`, `amphibian`, `fish`, `invertebrate`, DBR-004); `apps/api/src/app/Enums/PublishedSpeciesField.php` (nuevo: `scientific_name`, `origin`, `habitat` como predeterminadas; `conservation_status`, `size_cm`, `gestation_period`, `diet`, `longevity` y `characteristics` no implementadas, RN-13); `apps/api/src/app/Enums/PublicationStatus.php` (nuevo); `apps/api/src/app/Actions/SpeciesPublication/DeriveSpeciesPublicationStatusAction.php` (nuevo).
  - Regla: prioridad `pending` > `published` > `unpublished` > `not_published`, con `next_request_type` según la tabla del plan.
  - Tests: la derivación se prueba en T-09 (CA-26); la lista de categorías y de claves, en T-10 (CA-21, CA-25).
  - Hecho cuando: las listas coinciden con DBR-004 y RN-13, y la derivación no lee columnas que no existan.

- [ ] **T-06** (CA-02, CA-08, CA-23, CA-37, CA-39; RN-04): servicios de fotos.
  - Archivos: `apps/api/src/app/Actions/SpeciesPublication/Media/StoreSpeciesImageAction.php` (nuevo: escribe en `species-requests/<uuid>.<ext>`, `ext` según MIME validado); `…/Media/CopySpeciesImageAction.php` (nuevo: copia a `species/` con el mismo nombre); `…/Media/DeleteManagedSpeciesImageAction.php` (nuevo: solo rutas que cumplen `^species(-requests)?/[0-9a-f-]{36}\.(jpg|png)$`; si el archivo no existe, aviso técnico sin ruta).
  - Tests: `Storage::fake('media')`. Se prueban con T-11 (CA-02), T-16 (CA-23), T-18 (CA-08) y T-24 (CA-39).
  - Hecho cuando: ninguna ruta fuera de las dos carpetas se borra; el nombre nunca viene del cliente.

- [ ] **T-07** (T-SEED) (CA-20; RN-10): permisos del seeder.
  - Archivos: `apps/api/src/database/seeders/RolesAndPermissionsSeeder.php` (modificar); `apps/api/src/tests/Feature/Staff/SeedersTest.php` (ampliar).
  - Cambios: añadir `species.review` y `memories.review` al arreglo `$permissions`, creados con `Permission::findOrCreate`; asignar ambos solo a `zoo-admin`; excluirlos de `admin` de forma explícita: `array_diff($permissions, ['tickets.create', 'tickets.cancel', 'species.review', 'memories.review'])`; `executive`, `cashier` y `veterinarian` no los reciben.
  - Tests: `test_ca20_species_review_only_zoo_admin`. La parte de «zoo-admin con 2FA recibe 200» se completa al cerrar T-14.
  - Ejecución: `php artisan db:seed --class=RolesAndPermissionsSeeder` en `arca_pruebas`, por el equipo, con evidencia. Nunca sin `--class` (ejecuta `DemoStaffSeeder`). Nunca contra `arca_zoo`.
  - Hecho cuando: el test pasa y la evidencia del seeder está en el PR.

## Implementación: rutas y autorización

- [ ] **T-08** (CA-07, CA-12; RN-01): rutas nombradas y middleware de las dos familias.
  - Archivos: `apps/api/src/routes/api.php` (grupo `veterinarian` con `auth:sanctum`, `staff.user` y rol `veterinarian`; subgrupo dentro de `admin` con `permission:species.review`); `apps/api/src/bootstrap/app.php` (alias `role`, solo si se aprueba la decisión D-R4 del plan); `apps/api/src/tests/Feature/SpeciesPublication/SpeciesPublicationAccessTest.php` (nuevo).
  - Tests: `test_ca07_admin_routes_return_403_without_permission` (con `admin`, `executive`, `cashier` y `veterinarian` → 403; zoo-admin sin 2FA → rechazado por `administrator.two-factor`); `test_ca12_session_and_role_errors` (sin sesión → 401; `zoo-admin` en rutas de veterinario → 403).
  - Método: el test tiene un data provider con las rutas declaradas hasta ese momento. Cada tarea siguiente añade su ruta a ese provider.
  - Hecho cuando: CA-07 y CA-12 pasan con las rutas declaradas hasta T-08.

## Implementación: lectura y envío del veterinario

- [ ] **T-09** (CA-26; RN-01, RN-18, RN-22): selector de especies.
  - Archivos: `apps/api/src/app/Http/Controllers/Veterinarian/SpeciesController.php` (nuevo, `index`); `apps/api/src/app/Actions/Veterinarian/SpeciesPublication/ListSelectableSpeciesAction.php` (nuevo); `apps/api/src/app/Http/Resources/Veterinarian/SelectableSpeciesResource.php` (nuevo).
  - Cambios: `GET /api/v1/veterinarian/species` (nombre `veterinarian.species.index`, propuesto), sin paginación, orden `common_name` ascendente y `id` ascendente; `origin` desde `species.distribution`; `last_rejection_reason` solo de la solicitud propia `rejected` cuando el estado es `not_published`, completo; excluye `deleted_at`; no muestra datos de revisión ni de otros veterinarios.
  - Tests: `test_ca26_veterinarian_lists_species_with_publication_status` (los cuatro estados y `next_request_type`); `test_ca26_last_rejection_reason_full_text` (motivo de 500 caracteres íntegro y sin motivos de otros veterinarios).
  - Hecho cuando: ambos tests pasan y la ruta está en el provider de T-08.

- [ ] **T-10** (CA-03, CA-04, CA-21, CA-25, CA-29; RN-06, RN-13, RN-15): validación del envío.
  - Archivos: `apps/api/src/app/Http/Requests/Veterinarian/StoreSpeciesPublicationRequest.php` (nuevo). Mensajes en la propia Request, en español (patrón de `api-008`).
  - Cambios: `species_id` requerido y existente sin `deleted_at`; longitudes de 150; `category` requerido en la lista cerrada; `published_fields` como cadena JSON de array, con claves de RN-13 y deduplicación; `image` requerida solo en `publish`, con `image`, `mimes:jpg,jpeg,png` y `max:5120`; `common_name`, `species`, `category` e `image` en `published_fields` se rechazan con su mensaje.
  - Tests: `test_ca03_submit_returns_422_messages_in_spanish`; `test_ca04_photo_rules_jpeg_png_5mb_required_only_for_publish`; `test_ca21_published_fields_validation`; `test_ca25_store_requires_category`; `test_ca25_store_rejects_category_outside_closed_list`; `test_ca29_submit_rejects_common_name_and_creates_no_species` (archivo: `SubmitSpeciesRequestValidationTest.php`).
  - Hecho cuando: cada mensaje de CA-03 coincide literalmente, y un `422` no crea filas ni archivos.

- [ ] **T-11** (CA-01, CA-02, CA-24, CA-27, CA-28, CA-30, CA-32; RN-03, RN-11, RN-12, RN-16, RN-17): envío de solicitud.
  - Archivos: `apps/api/src/app/Http/Controllers/Veterinarian/SpeciesPublicationRequestController.php` (nuevo, `store`); `apps/api/src/app/Actions/Veterinarian/SpeciesPublication/SubmitSpeciesPublicationRequestAction.php` (nuevo); `apps/api/src/app/Http/Resources/Veterinarian/OwnSpeciesPublicationRequestResource.php` (nuevo, respuesta 201).
  - Cambios: `POST /api/v1/veterinarian/species-publication-requests` (nombre `veterinarian.species-publication-requests.store`, propuesto). Foto guardada antes de la transacción (T-06). Transacción con bloqueo de la especie; `DeriveSpeciesPublicationStatusAction` decide: `not_published` → `publish`; `published` o `unpublished` → `update`; `pending` → 422. Correcciones iguales o vacías → NULL. La solicitud no cambia `species`. Auditoría de envío. Ante fallo, se borra la foto nueva. La respuesta 201 no incluye URL de foto.
  - Tests: `test_ca01_veterinarian_submits_publication_request`; `test_ca02_submit_stores_photo_and_keeps_species_unchanged`; `test_ca27_eligibility_by_publication_status`; `test_ca28_rejected_species_accepts_new_publish_request`; `test_ca30_unchanged_or_empty_correction_is_stored_as_null`; `test_ca32_update_keeps_published_version_until_accept` (la fila de `species` no cambia tras el envío de `update`; no prueba `api-015`). Archivos de test: `SubmitSpeciesRequestTest.php`.
  - Hecho cuando: los tests pasan y la ruta está en el provider de T-08. Los 401 y 403 de CA-01 quedan cubiertos por T-08.

- [ ] **T-12** (CA-34; RN-03, RN-11): una solicitud viva por especie y captura de la violación de unicidad.
  - Archivos: `SubmitSpeciesPublicationRequestAction.php` (ampliar).
  - Cambios: comprobación de aplicación dentro del bloqueo; captura de `QueryException` con `errorInfo[1] = 1062` y el nombre `uq_species_publication_requests_submitted_species` en el mensaje; rollback; borrado de la foto nueva; respuesta 422 «Ya hay una solicitud pendiente para esta especie.». Nunca 500 por esta causa.
  - Tests: `test_ca34_only_one_live_request_per_species` (envío de `publish` o `update` con una `submitted` previa → 422; `accepted` y `rejected` no bloquean); `test_ca34_db_unique_violation_maps_to_422_and_removes_new_photo` (la comprobación de aplicación se salta mediante inyección en el test; no se añaden ganchos de prueba en producción). Archivo: `SubmitSpeciesRequestConcurrencyTest.php`.
  - Hecho cuando: el test de violación de BD pasa con 422, sin fila nueva y sin foto nueva.

- [ ] **T-13** (CA-33; RN-01, RN-07): «Mis solicitudes».
  - Archivos: `apps/api/src/app/Actions/Veterinarian/SpeciesPublication/ListOwnSpeciesPublicationRequestsAction.php` (nuevo); `apps/api/src/app/Http/Controllers/Veterinarian/SpeciesPublicationRequestController.php` (ampliar, `index`); Resource ya creado en T-11.
  - Cambios: `GET /api/v1/veterinarian/species-publication-requests` (nombre `veterinarian.species-publication-requests.index`), solo `created_by` del usuario, sin eliminadas, orden `created_at` y `id` descendentes, 10 por página, `meta.has_more`; `rejection_reason` completo solo en `rejected`; `species_publication_status` para «Despublicada»; sin fotos ni nombres de revisores.
  - Tests: `test_ca33_veterinarian_lists_only_own_requests`; `test_ca33_rejection_reason_full_up_to_500_not_truncated`; `test_ca33_hides_requests_of_deleted_publication`. Archivo: `VeterinarianRequestsListTest.php`.
  - Hecho cuando: los tres tests pasan y la ruta está en el provider de T-08.

## Implementación: revisión de la Dirección

- [ ] **T-14** (CA-05, CA-06, CA-20; RN-05, RN-08): listado, detalle y foto pendiente.
  - Archivos: `apps/api/src/app/Http/Controllers/Admin/SpeciesPublicationRequestController.php` (nuevo, `index`, `show`); `…/Admin/SpeciesPublicationRequestImageController.php` (nuevo); `apps/api/src/app/Actions/Admin/SpeciesPublication/ListSpeciesPublicationRequestsAction.php` y `ShowSpeciesPublicationRequestAction.php` (nuevos); `apps/api/src/app/Http/Requests/Admin/ListSpeciesPublicationRequestsRequest.php` (nuevo); Resources `apps/api/src/app/Http/Resources/Admin/SpeciesPublicationRequestResource.php` y `SpeciesPublicationRequestDetailResource.php` (nuevos).
  - Cambios: `GET /api/v1/admin/species-publication-requests` (nombre `admin.species-publication-requests.index`) con `status` opcional, 10 por página, orden `created_at` descendente; `GET …/{id}` (`admin.species-publication-requests.show`) con bloques `current` y `proposed` (CA-06); `GET …/{id}/image` (`admin.species-publication-requests.image`) binario o 404. Sin URL de foto en el JSON.
  - Tests: `test_ca05_admin_lists_requests_paginated_without_photo`; `test_ca06_detail_shows_current_and_proposed_without_photo_url` (incluye la descarga binaria de la foto pendiente y el 404 sin foto). Además, en `SeedersTest.php`, se completa el caso «zoo-admin con 2FA recibe 200» de CA-20. Archivo: `AdminSpeciesRequestsReadTest.php`.
  - Hecho cuando: los tests pasan, `origin` sale de `distribution`, y la ruta está en el provider de T-08. Enmienda 2026-11-13 (G-1 a G-3 de `dashboard-010`): `publication_status` en cada fila del listado y `species_id` y `current.publication_status` en el detalle, con sus pruebas dentro de `test_ca05_…` y `test_ca06_…`. (T-09 no cambia: es el selector del veterinario.)

- [ ] **T-15** (CA-14, CA-15, CA-16, CA-17, CA-25; RN-09, RN-12, RN-15): edición de datos de una solicitud `submitted` (JSON, sin foto).
  - Archivos: `apps/api/src/app/Http/Controllers/Admin/SpeciesPublicationRequestController.php` (ampliar, `update`); `apps/api/src/app/Http/Requests/Admin/UpdateSpeciesPublicationRequest.php` (nuevo); `apps/api/src/app/Actions/Admin/SpeciesPublication/UpdateSpeciesPublicationRequestAction.php` (nuevo).
  - Cambios: `PATCH /api/v1/admin/species-publication-requests/{id}` (nombre `admin.species-publication-requests.update`), solo con `species.review` y 2FA; valores trimados; `status` y `request_type` sin cambios; `updated_by` y `updated_at` actualizados; `category` vacío → «Tipo de animal requerido.»; sin campos → «Nada que guardar.»; campos no editables → «Campo no editable: {campo}.»; `common_name` fuera (RN-15); en `accepted` o `rejected` → «Esta solicitud ya fue revisada.»; auditoría solo si algún valor cambia (se implementa aquí con el mismo diff que T-16).
  - Tests: `test_ca14_patch_request_only_for_review_permission`; `test_ca15_patch_saves_trimmed_values_and_keeps_status`; `test_ca16_patch_validation_in_spanish`; `test_ca17_patch_only_when_submitted`; `test_ca25_update_replaces_category_and_audits_change`; `test_ca25_update_rejects_empty_or_unknown_category`. Archivo: `UpdateSpeciesRequestTest.php`.
  - Hecho cuando: los tests pasan y la ruta está en el provider de T-08.

- [ ] **T-16** (CA-18, CA-22, CA-23; RN-04, RN-09, RN-12): edición de `published_fields` y de la foto; auditoría del diff.
  - Archivos: `UpdateSpeciesPublicationRequestAction.php` y `UpdateSpeciesPublicationRequest.php` (ampliar); `apps/api/src/app/Actions/SpeciesPublication/Audit/LogSpeciesPublicationAction.php` (nuevo, log `admin`, sin binario ni ruta absoluta).
  - Cambios: `published_fields` reemplaza la lista completa (CA-22); foto nueva guardada en `species-requests/` antes de la transacción; dentro del bloqueo se actualiza `image_path`; tras commit se borra la anterior; si la transacción falla, se borra la nueva. Si la solicitud ya no está `submitted`: 422 y se borra la foto nueva. Auditoría «Solicitud de publicación editada por {admin}» con anterior y nuevo; «Foto de solicitud de publicación reemplazada por {admin}» sin ruta.
  - Verificación de método (R6): prueba de integración con `POST` + `_method=PATCH` y archivo, y `PATCH` JSON sin archivo.
  - Tests: `test_ca18_edit_audit_only_when_values_change` (archivo `UpdateSpeciesRequestAuditTest.php`); `test_ca22_patch_replaces_published_fields` (mismo archivo); `test_ca23_patch_replaces_photo_and_deletes_previous_after_commit` y `test_ca23_failed_transaction_removes_new_photo_keeps_previous` (archivo `UpdateSpeciesRequestPhotoTest.php`).
  - Hecho cuando: los tests pasan; una edición sin cambios responde 200 y no registra auditoría.

- [ ] **T-17** (CA-09, CA-10, CA-11; RN-02, RN-04, RN-12): rechazo.
  - Archivos: `apps/api/src/app/Http/Controllers/Admin/SpeciesPublicationRequestController.php` (ampliar, `reject`); `apps/api/src/app/Http/Requests/Admin/RejectSpeciesPublicationRequest.php` (nuevo); `apps/api/src/app/Actions/Admin/SpeciesPublication/RejectSpeciesPublicationRequestAction.php` (nuevo).
  - Cambios: `POST …/{id}/reject` (nombre `admin.species-publication-requests.reject`); bloqueo de especie y solicitud; `submitted` → `rejected`; `rejection_reason` 1 a 500 caracteres; `reviewed_by`, `reviewed_at`; `image_path` NULL; la foto pendiente se borra tras commit; `species` no cambia; auditoría «Solicitud de publicación rechazada: {motivo}». Decisión tardía → 422 «Esta solicitud ya fue revisada.».
  - Tests: `test_ca09_late_decision_returns_422`; `test_ca10_reject_deletes_photo_and_keeps_species_unchanged`; `test_ca11_reject_requires_reason_1_to_500`. Archivo: `RejectSpeciesRequestTest.php`.
  - Hecho cuando: los tests pasan y la ruta está en el provider de T-08.

- [ ] **T-18** (CA-08, CA-25, CA-32; RN-02, RN-04, RN-14): aceptar con publicación (y por defecto).
  - Archivos: `apps/api/src/app/Http/Controllers/Admin/SpeciesPublicationRequestController.php` (ampliar, `accept`); `apps/api/src/app/Http/Requests/Admin/AcceptSpeciesPublicationRequest.php` (nuevo); `apps/api/src/app/Actions/Admin/SpeciesPublication/AcceptSpeciesPublicationRequestAction.php` (nuevo); `apps/api/src/app/Http/Resources/Admin/SpeciesPublicationDetailResource.php` (nuevo; forma `GET` de CA-37, usada aquí como respuesta de la aceptación y en T-21/T-22).
  - Cambios: `POST …/{id}/accept` (nombre `admin.species-publication-requests.accept`) con `publish` opcional (por defecto `true`); bloqueo de especie y solicitud; aplicar correcciones no NULL: `scientific_name`, `habitat`, `origin` → `distribution`, `category` efectivo; `published_fields` copiado; con publicación `is_published = 1`, `unpublished_at = NULL`, `published_at = now`; foto: copia a `species/` dentro de la transacción; solicitud `accepted`, `reviewed_by`, `reviewed_at`, `image_path` NULL; tras commit, borrado de la original y de la foto publicada anterior (CA-39); si el borrado falla, 200 y aviso técnico; si la transacción falla, se borra la copia nueva. Respuesta 200 con el detalle de publicación (`SpeciesPublicationDetailResource`). Auditoría «Especie publicada por {admin} a partir de la solicitud de {vet}» o «Actualización publicada por…».
  - Tests: `test_ca08_accept_publishes_existing_species_copies_confirms_and_deletes_original`; `test_ca08_accept_returns_200_when_original_delete_fails`; `test_ca08_origin_is_written_to_distribution`; `test_ca25_accept_writes_effective_category_to_species`; `test_ca32_update_accept_replaces_data_and_keeps_species_listed`; `test_ca32_update_without_photo_keeps_current_image`. Archivo: `AcceptSpeciesRequestTest.php`.
  - Hecho cuando: los tests pasan; no se crea ni se borra ninguna fila de `species` (CA-24, comprobado en T-26).

- [ ] **T-19** (CA-08, CA-32; RN-14, RN-17): aceptar sin publicar y visibilidad de una actualización sobre especie despublicada.
  - Archivos: `AcceptSpeciesPublicationRequestAction.php` y `AcceptSpeciesPublicationRequest.php` (ampliar).
  - Cambios: `publish` no booleano → 422 «Indica si se publica o no.»; `publish: false` en `published` o `not_published` → 422 «Esta solicitud solo puede aceptarse publicándola.»; con `publish: false` en `unpublished`, no cambian `is_published`, `unpublished_at` ni `published_at`.
  - Tests: `test_ca08_accept_unpublished_without_publishing_keeps_unpublished`; `test_ca08_publish_param_rules`; `test_ca32_unpublished_update_stays_hidden_until_publish_accept` (mientras la solicitud está `submitted`, `is_published` sigue en 0). Archivos: `AcceptUnpublishedSpeciesTest.php`.
  - Hecho cuando: los tests pasan.

- [ ] **T-20** (CA-40; RN-08, RN-22): listado de publicadas y despublicadas, y foto pública.
  - Archivos: `apps/api/src/app/Http/Controllers/Admin/PublishedSpeciesController.php` (nuevo, `index`); `apps/api/src/app/Http/Controllers/Admin/SpeciesImageController.php` (nuevo, `show`); `apps/api/src/app/Actions/Admin/SpeciesPublication/ListPublishedSpeciesAction.php` (nuevo); `apps/api/src/app/Http/Requests/Admin/ListPublishedSpeciesRequest.php` (nuevo); `apps/api/src/app/Http/Resources/Admin/PublishedSpeciesResource.php` (nuevo).
  - Cambios: `GET /api/v1/admin/published-species` (nombre `admin.published-species.index`): `is_published = 1` o `unpublished_at` no nulo; nunca `not_published`; sin `deleted_at`; `status` (`published`, `unpublished` o vacío) y `category` (DBR-004 o vacío, otro → «Tipo de animal no válido.»); 10 por página, `published_at` y `id` descendentes; `has_image`, `has_pending_request`; sin URL. `GET /api/v1/admin/species/{id}/image` (nombre `admin.species.image`): binario o 404.
  - Tests: `test_ca40_admin_lists_published_and_unpublished_species_and_serves_image`. Archivo: `AdminPublishedSpeciesTest.php`.
  - Hecho cuando: el test pasa y las rutas están en el provider de T-08.

## Implementación: gestión de la publicación

- [ ] **T-21** (CA-35, CA-36; RN-19, RN-22): despublicar y republicar.
  - Archivos: `apps/api/src/app/Http/Controllers/Admin/SpeciesPublicationController.php` (nuevo, `unpublish`, `republish`); `apps/api/src/app/Actions/Admin/SpeciesPublication/UnpublishSpeciesAction.php` y `RepublishSpeciesAction.php` (nuevos); `SpeciesPublicationDetailResource.php` (creado en T-18; reutilizado aquí).
  - Cambios: `POST /api/v1/admin/species/{id}/unpublish` (nombre `admin.species.unpublish`): `published` → `is_published = 0`, `unpublished_at = now`; no borra nada; si no está `published` → 422 «Esta especie no está publicada.»; auditoría «Especie despublicada por {admin}». `POST /api/v1/admin/species/{id}/republish` (nombre `admin.species.republish`): `unpublished` con `image_path` y `published_fields` no NULL y sin `submitted` → `is_published = 1`, `unpublished_at = NULL`, `published_at = now`; errores: «No se puede republicar: faltan la foto o los datos publicados.», «Hay una solicitud pendiente para esta especie. Decide sobre ella antes de republicar.», «Esta especie ya está publicada.», «Esta especie no tiene una ficha publicada para restaurar.»; auditoría «Especie republicada por {admin}».
  - Tests: `test_ca35_unpublish_hides_species_without_deleting_data`; `test_ca36_republish_without_new_request_and_guards`. Archivo: `SpeciesPublicationManagementTest.php`.
  - Hecho cuando: los tests pasan y las rutas están en el provider de T-08.

- [ ] **T-22** (CA-37; RN-15, RN-16, RN-19): ficha de una especie despublicada.
  - Archivos: `SpeciesPublicationController.php` (ampliar, `show`, `update`); `apps/api/src/app/Actions/Admin/SpeciesPublication/ShowSpeciesPublicationAction.php` y `UpdateUnpublishedSpeciesAction.php` (nuevos); `apps/api/src/app/Http/Requests/Admin/UpdateSpeciesPublicationDetailRequest.php` (nuevo).
  - Cambios: `GET` y `PATCH /api/v1/admin/species/{id}/publication` (nombres `admin.species.publication.show` y `admin.species.publication.update`); el `PATCH` acepta `scientific_name`, `habitat`, `origin`, `category`, `published_fields` e `image` (foto directa a `species/`, con borrado de la anterior tras commit); vacío en `scientific_name`, `habitat` u `origin` → NULL; `category` vacío → «Tipo de animal requerido.»; `common_name` → «Campo no editable: common_name.»; no publica ni cambia `is_published`; sin campos → «Nada que guardar.»; sin cambios reales → 200 sin auditoría; auditoría «Ficha de especie despublicada editada por {admin}»; errores de estado: «Despublica la especie antes de editar su ficha pública.», «Esta especie no tiene una ficha publicada que editar.», «Hay una solicitud pendiente para esta especie. Decide sobre ella antes de editar.».
  - Tests: `test_ca37_edit_unpublished_species_without_publishing`; `test_ca37_new_photo_saved_in_species_folder_and_old_deleted_after_commit`. Archivo: `SpeciesUnpublishedEditTest.php`.
  - Hecho cuando: los tests pasan y las rutas están en el provider de T-08.

- [ ] **T-23** (CA-38; RN-02, RN-19, RN-20, RN-21): eliminar la publicación.
  - Archivos: `SpeciesPublicationController.php` (ampliar, `destroy`); `apps/api/src/app/Actions/Admin/SpeciesPublication/DeleteSpeciesPublicationAction.php` (nuevo).
  - Cambios: `DELETE /api/v1/admin/species/{id}/publication` (nombre `admin.species.publication.destroy`). Dentro de la transacción y con bloqueo de especie y solicitudes: (1) cada `submitted` → `rejected` con «La publicación fue eliminada por la Dirección.», `reviewed_by` y `reviewed_at`; (2) `deleted_at` en todas las solicitudes; (3) `is_published = 0`, `published_at`, `unpublished_at`, `image_path` y `published_fields` a NULL. Las correcciones aplicadas no se revierten (RN-21). La fila de `species` no se borra. Se capturan en memoria las rutas de fotos antes de la transacción; el borrado es tras commit (T-24). Respuesta 200 con `publication_status = not_published`. `not_published` → 422 «Esta especie no tiene publicación que eliminar.». Auditoría «Publicación de especie eliminada por {admin}» con los identificadores de las solicitudes marcadas y de las que pasaron a `rejected`.
  - Tests: `test_ca38_delete_publication_keeps_species_row_and_soft_deletes_requests`; `test_ca38_submitted_requests_are_rejected_then_soft_deleted_and_new_request_is_allowed` (tras eliminar, un envío `publish` de la especie se acepta, CA-28). Archivo: `SpeciesDeletePublicationTest.php`.
  - Hecho cuando: los tests pasan y la ruta está en el provider de T-08.

## Calidad transversal

- [ ] **T-24** (CA-39; RN-04): borrado seguro de archivos solo tras commit.
  - Archivos: revisión de `AcceptSpeciesPublicationRequestAction`, `RejectSpeciesPublicationRequestAction`, `UpdateSpeciesPublicationRequestAction`, `UpdateUnpublishedSpeciesAction`, `DeleteSpeciesPublicationAction` y `DeleteManagedSpeciesImageAction` (ajustes si hace falta).
  - Cambios: ninguna Action borra un archivo original antes del commit; si la transacción falla, se borra solo la copia nueva; si el borrado falla tras el commit, la respuesta sigue siendo 200 y se registra un aviso técnico.
  - Tests: `test_ca39_files_removed_only_after_commit` (con `Storage::fake('media')`; cubre: fallo de transacción sin borrar originales; borrado tras commit; fallo de borrado tras commit → 200 y aviso). Archivo: `SpeciesImageFilesTest.php`.
  - Hecho cuando: el test pasa y la tabla de «Transacciones por operación» del plan coincide con el código.

- [ ] **T-25** (CA-19, CA-41; RN-11): bloqueo y revalidación de estado.
  - Archivos: revisión de todas las Actions de cambio de solicitud o especie (orden de bloqueo del plan: especie y después solicitud).
  - Cambios: cada operación comprueba el estado dentro del bloqueo. Solicitud eliminada → 404 «Solicitud no encontrada.»; ya no `submitted` → 422; especie con cambio de estado → mensaje de esa acción.
  - Tests: `test_ca19_edit_and_decision_sequential_rules` (nombre propuesto: publicar y después editar → 422; editar y después publicar → publica los datos editados); `test_ca41_publication_actions_recheck_state_inside_lock` (secuencial: despublicar y después republicar; republicar con solicitud pendiente; eliminar y después aceptar). La barrera de BD de CA-34 se comprueba en T-12. Archivo: `SpeciesPublicationConcurrencyTest.php`.
  - Hecho cuando: los tests pasan. Los tests son secuenciales; la concurrencia real queda como deuda (R5).

- [ ] **T-26** (CA-24, CA-31; RN-05, RN-12, RN-20): invariantes de la publicación.
  - Archivos: `apps/api/src/tests/Feature/SpeciesPublication/SpeciesPublicationInvariantsTest.php` (nuevo).
  - Tests: `test_ca24_request_never_creates_or_deletes_species_rows` (cuenta filas de `species` antes y después de cada operación y compara `species_id`); `test_ca31_publication_columns_change_only_in_publication_actions` (tras envío, edición y rechazo, `is_published`, `published_at`, `unpublished_at`, `image_path` y `published_fields` no cambian; solo cambian con aceptar, despublicar, republicar, editar despublicada y eliminar).
  - Hecho cuando: ambos tests pasan.

- [ ] **T-27** (CA-13; todos los CA): cobertura de pruebas.
  - Archivos: `apps/api/src/tests/Feature/SpeciesPublication/SpeciesPublicationCoverageTest.php` (nuevo).
  - Tests: busca `CA-01` a `CA-41` en los tests de esta spec (`tests/Feature/SpeciesPublication/` y `tests/Feature/Staff/SeedersTest.php`); verifica `DB_DATABASE=arca_pruebas`; verifica que estos tests no usan `RefreshDatabase`.
  - Hecho cuando: el test pasa y ningún CA queda sin nombre de test.

## Documentación y entrega

- [ ] **T-28** (documental; RN-04, RN-10, RN-22; CA-20): actualizar `infra/README.md` y la documentación de la API.
  - Archivos: `infra/README.md` (modificar, en el mismo PR); `apps/api/docs/` (sección nueva «Publicación de especies», sin secretos).
  - Cambios en `infra/README.md`:
    - Checklist de roles y permisos: `db:seed --class=RolesAndPermissionsSeeder` tras cambiar el seeder, con `species.review` y `memories.review` asignados solo a `zoo-admin` y excluidos de `admin`.
    - Checklist de medios de prueba: carpetas `apps/api/src/media/species/` y `apps/api/src/media/species-requests/`, `storage:link` del disco `media`, y la decisión de versionado pendiente (pregunta Q3).
    - Límites de subida de 5 MB (ya existentes): confirmar que cubren las peticiones de esta spec.
    - Portal: confirmar si `CORS_ALLOWED_ORIGINS` debe cubrir `published-species` (la ruta pública es de `api-015`, pregunta Q7 del plan).
  - Hecho cuando: el checklist de `infra/README.md` menciona cada requisito nuevo, sin valores de secretos, y el PR lo incluye.

- [ ] **T-29** (todos los CA; DoD de la spec): verificación, CI y entrega.
  - Ejecutar desde `apps/api/src`: `composer lint` y `composer test` (o los comandos exactos del `composer.json`), con `DB_DATABASE=arca_pruebas`. Registrar comandos, códigos de salida, tests omitidos y fallidos.
  - Ejecutar `/verify` para `apps/api`.
  - CI en verde (`007-ci-workflow`) con la evidencia del pipeline.
  - PR que enlaza spec, plan y tasks del mismo `014-species-requests`; commit que cita `api-014`.
  - Estado de la spec: pasar a «En progreso» y «Implementada» solo con aprobación humana y evidencia aportada por la sesión principal. No se cambia el estado desde esta tarea.
  - Hecho cuando: el checklist DoD (abajo) está completo con evidencia.

---

## Definición de terminado (DoD)

- [ ] `/verify` ejecutado para `apps/api` con resultados registrados.
- [ ] CI en verde.
- [ ] Cada CA-01 a CA-41 tiene al menos un test automatizado con su nombre (verificado por T-27).
- [ ] Cada RN-01 a RN-22 aparece en al menos una tarea de esta lista (tabla siguiente).
- [ ] Constitution Check del plan resuelto, incluida la fila V.
- [ ] `infra/README.md` actualizado en el mismo PR (T-28).
- [ ] Spec, plan y tasks enlazados en el PR; estado de la spec actualizado por decisión humana.

---

## Trazabilidad CA → tarea → test

| CA | Tarea(s) | Test (nombre) |
|---|---|---|
| CA-01 | T-11 | `test_ca01_veterinarian_submits_publication_request` |
| CA-02 | T-06, T-11 | `test_ca02_submit_stores_photo_and_keeps_species_unchanged` |
| CA-03 | T-10 | `test_ca03_submit_returns_422_messages_in_spanish` |
| CA-04 | T-10 | `test_ca04_photo_rules_jpeg_png_5mb_required_only_for_publish` |
| CA-05 | T-14 | `test_ca05_admin_lists_requests_paginated_without_photo` |
| CA-06 | T-14 | `test_ca06_detail_shows_current_and_proposed_without_photo_url` |
| CA-07 | T-08 | `test_ca07_admin_routes_return_403_without_permission` |
| CA-08 | T-18, T-19 | `test_ca08_accept_publishes_existing_species_copies_confirms_and_deletes_original`; `test_ca08_accept_returns_200_when_original_delete_fails`; `test_ca08_accept_unpublished_without_publishing_keeps_unpublished`; `test_ca08_publish_param_rules`; `test_ca08_origin_is_written_to_distribution` |
| CA-09 | T-17 | `test_ca09_late_decision_returns_422` |
| CA-10 | T-17 | `test_ca10_reject_deletes_photo_and_keeps_species_unchanged` |
| CA-11 | T-17 | `test_ca11_reject_requires_reason_1_to_500` |
| CA-12 | T-08 | `test_ca12_session_and_role_errors` |
| CA-13 | T-27 | `SpeciesPublicationCoverageTest` (verifica todos los CA) |
| CA-14 | T-15 | `test_ca14_patch_request_only_for_review_permission` |
| CA-15 | T-15 | `test_ca15_patch_saves_trimmed_values_and_keeps_status` |
| CA-16 | T-15 | `test_ca16_patch_validation_in_spanish` |
| CA-17 | T-15 | `test_ca17_patch_only_when_submitted` |
| CA-18 | T-15, T-16 | `test_ca18_edit_audit_only_when_values_change` |
| CA-19 | T-25 | `test_ca19_edit_and_decision_sequential_rules` (nombre propuesto) |
| CA-20 | T-07, T-14 | `test_ca20_species_review_only_zoo_admin` |
| CA-21 | T-05, T-10 | `test_ca21_published_fields_validation` |
| CA-22 | T-16 | `test_ca22_patch_replaces_published_fields` |
| CA-23 | T-16 | `test_ca23_patch_replaces_photo_and_deletes_previous_after_commit`; `test_ca23_failed_transaction_removes_new_photo_keeps_previous` (nombres propuestos) |
| CA-24 | T-03, T-11, T-26 | `test_ca24_request_never_creates_or_deletes_species_rows` |
| CA-25 | T-10, T-15, T-18 | `test_ca25_store_requires_category`; `test_ca25_store_rejects_category_outside_closed_list`; `test_ca25_update_replaces_category_and_audits_change`; `test_ca25_update_rejects_empty_or_unknown_category`; `test_ca25_accept_writes_effective_category_to_species` |
| CA-26 | T-09 | `test_ca26_veterinarian_lists_species_with_publication_status`; `test_ca26_last_rejection_reason_full_text` |
| CA-27 | T-11 | `test_ca27_eligibility_by_publication_status` |
| CA-28 | T-11 | `test_ca28_rejected_species_accepts_new_publish_request` |
| CA-29 | T-10 | `test_ca29_submit_rejects_common_name_and_creates_no_species` |
| CA-30 | T-11 | `test_ca30_unchanged_or_empty_correction_is_stored_as_null` |
| CA-31 | T-26 | `test_ca31_publication_columns_change_only_in_publication_actions` |
| CA-32 | T-11, T-18, T-19 | `test_ca32_update_keeps_published_version_until_accept`; `test_ca32_update_accept_replaces_data_and_keeps_species_listed`; `test_ca32_update_without_photo_keeps_current_image`; `test_ca32_unpublished_update_stays_hidden_until_publish_accept` |
| CA-33 | T-13 | `test_ca33_veterinarian_lists_only_own_requests`; `test_ca33_rejection_reason_full_up_to_500_not_truncated`; `test_ca33_hides_requests_of_deleted_publication` |
| CA-34 | T-12 | `test_ca34_only_one_live_request_per_species`; `test_ca34_db_unique_violation_maps_to_422_and_removes_new_photo` |
| CA-35 | T-21 | `test_ca35_unpublish_hides_species_without_deleting_data` |
| CA-36 | T-21 | `test_ca36_republish_without_new_request_and_guards` |
| CA-37 | T-22 | `test_ca37_edit_unpublished_species_without_publishing`; `test_ca37_new_photo_saved_in_species_folder_and_old_deleted_after_commit` |
| CA-38 | T-23 | `test_ca38_delete_publication_keeps_species_row_and_soft_deletes_requests`; `test_ca38_submitted_requests_are_rejected_then_soft_deleted_and_new_request_is_allowed` |
| CA-39 | T-06, T-24 | `test_ca39_files_removed_only_after_commit` |
| CA-40 | T-20 | `test_ca40_admin_lists_published_and_unpublished_species_and_serves_image` |
| CA-41 | T-25 | `test_ca41_publication_actions_recheck_state_inside_lock` |

### Trazabilidad RN → tarea

| RN | Tarea(s) |
|---|---|
| RN-01 (acceso) | T-08, T-09, T-13 |
| RN-02 (estados de la solicitud) | T-04, T-17, T-18, T-23 |
| RN-03 (una solicitud viva) | T-04, T-11, T-12 |
| RN-04 (foto) | T-06, T-16, T-17, T-18, T-23, T-24 |
| RN-05 (autoridad de la API) | T-11, T-14, T-26 |
| RN-06 (mensajes en español) | T-10 |
| RN-07 (feedback al veterinario) | T-13 |
| RN-08 (foto binaria) | T-14, T-20 |
| RN-09 (edición previa) | T-15, T-16 |
| RN-10 (permisos del seeder) | T-07 |
| RN-11 (concurrencia) | T-11, T-12, T-25 |
| RN-12 (auditoría) | T-11, T-15, T-16, T-17, T-21, T-22, T-23, T-26 |
| RN-13 (campos de la ficha pública) | T-05, T-10, T-16 |
| RN-14 (aceptar sobre la fila existente) | T-18, T-19 |
| RN-15 (nombre común no editable) | T-10, T-15, T-22 |
| RN-16 (correcciones NULL) | T-11, T-22 |
| RN-17 (sin efecto público antes de decidir) | T-11, T-19 |
| RN-18 (estados de publicación derivados) | T-05, T-09 |
| RN-19 (despublicar, republicar, eliminar) | T-21, T-22, T-23 |
| RN-20 (SoftDeletes) | T-02, T-03, T-04, T-23, T-26 |
| RN-21 (correcciones aplicadas no se revierten) | T-23 |
| RN-22 (especie borrada lógicamente) | T-03, T-09, T-20, T-21, T-22 |

### Resumen de cobertura

- Tareas: 29 (T-01 a T-29): 2 de precondición y BD (T-01, T-02), 25 de implementación, calidad y verificación (T-03 a T-27) y 2 documentales y de entrega (T-28, T-29). T-SEED es T-07.
- CA cubiertos: 41 de 41 (CA-01 a CA-41). CA sin cobertura: 0.
- RN cubiertas: 22 de 22.
