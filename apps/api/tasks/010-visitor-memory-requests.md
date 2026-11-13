# Tareas · 010 · visitor-memory-requests

- Spec: `apps/api/specs/010-visitor-memory-requests.md` (Aprobada, 2026-11-12, Jonathan, responsable de backend)
- Plan: `apps/api/plan/010-visitor-memory-requests.md` (Borrador, pendiente de aprobación técnica y del Constitution Check)
- Estado de estas tareas: **Borrador. Ninguna tarea está hecha.** Ninguna casilla se marca sin evidencia aportada por la sesión principal.
- Fases: **Fase 1** = revisión y publicación (consumida por `dashboard-008`, `api-012` y `web-010`). **Fase 2** = envío y lista del visitante (consumida por `mobile-010`). El mapeo CA→fase es **propuesto** (plan, sección «Fases y mapeo CA→fase») y lo confirma el usuario.
- Bloqueos principales: P2 (plan y tasks de `api-013` con el disco de medios; hoy no existen), P3 (seeder compartido con `api-014` T-07), P4 (aprobación de plan y tasks), P5 (excepción de la Constitución V, D-M1), P6 (correo verificado en sesiones de visitante), P8 (plan de `api-012`, solo para T-26) y P9 (enmienda de `api-004` y `mobile-004`, solo para T-25).
- Rutas de archivos: previstas, bajo `apps/api/src/` (no existen aún). Los tests van en `apps/api/src/tests/Feature/Memories/`, salvo `SeedersTest.php`.
- Regla general: PHPUnit contra `arca_pruebas`, con `DatabaseTransactions`. Prohibido `RefreshDatabase`, `migrate:fresh` o migraciones desde los tests. Nunca `arca_zoo`.
- Nombres de test: propuestos. Los métodos usan `caNN_` (PHPUnit no admite guiones) y cada docblock cita `CA-NN`. Los tests de `api-013` usan el prefijo `api013_caNN_`.
- Ninguna tarea añade alcance. Si algo de la lista no está en la spec, se para y se pregunta.

---

## Precondiciones (solo lectura y puertas)

- [ ] **T-01** (precondición de todos los CA; RN-15): verificar P1, P6 y P7 del plan, en solo lectura.
  - Fase: transversal (bloquea Fase 1 y Fase 2).
  - Pasos: `php artisan migrate:status` desde `apps/api/src` (no ejecutar `migrate`). La migración `2026_11_11_000012_visitor_memories_schema` debe figurar como ejecutada (`Ran`). Confirmar `DB_DATABASE=arca_pruebas` en `.env` local, sin copiar secretos al repositorio. Confirmar con `php -m` si `gd` está disponible (riesgo R8 de `api-014`). Comprobar en `apps/api/src/app/Http/Middleware` y en la emisión de tokens de `api-004` si el token de visitante exige correo verificado (P6). Confirmar que no se crea migración ni SQL en esta fase.
  - Archivos: ninguno.
  - Hecho cuando: la evidencia (salida de `migrate:status`, salida de `php -m` y la respuesta a P6) está en el PR. Si algo falla, detenerse y reportarlo.

- [ ] **T-02** (precondición de CA-02, CA-08, CA-09, CA-10, CA-11, CA-12, CA-29; RN-05, RN-10): puerta de `api-013`.
  - Fase: 1 (imagen en revisión, aceptar, rechazar) y 2 (almacenamiento del envío).
  - Pasos: confirmar que `apps/api/specs/013-object-storage-images.md` tiene plan y tasks aprobados (hoy no existen `apps/api/plan/013-*` ni `apps/api/tasks/013-*`). Confirmar que `apps/api/src/config/filesystems.php` define la clave del disco privado de medios (carpeta `media/`) y que `storage:link` crea `public/media` en `arca_pruebas`. Confirmar la clave exacta que se usará para el nombre del disco privado (D-M5). Confirmar que `.env.example` tiene `PRIVATE_MEDIA_DISK` y `MEDIA_PUBLIC_URL`.
  - Archivos: ninguno en esta tarea. La configuración del disco es de `api-013`.
  - Hecho cuando: la evidencia (plan y tasks de `api-013` aprobados, clave del disco y salida de `storage:link`) está en el PR. Sin esto, no se empieza T-10, T-12, T-14 ni T-19; si `api-013` no está lista, detenerse y reportarlo.

---

## Fase 1 · Base: enums, modelos, configuración y permiso

- [ ] **T-03** (CA-07, CA-28; RN-01, RN-20): listas cerradas de estados y decisiones.
  - Fase: 1. Depende de: T-01.
  - Archivos: `apps/api/src/app/Enums/MemoryStatus.php` (nuevo: `submitted`, `in_review`, `accepted`, `rejected`); `apps/api/src/app/Enums/MemoryReviewDecision.php` (nuevo: `accepted`, `rejected`); `apps/api/src/app/Enums/MemoryRejectedField.php` (nuevo: `image`, `content`).
  - Cambios: valores en inglés; etiquetas en español solo en los mensajes de las Requests y Resources, nunca en los valores persistidos (RN-01).
  - Tests: se usan en T-07, T-08, T-13 y T-24; no tienen test propio.
  - Hecho cuando: los enums compilan y coinciden con DBR-012 (`status`, `decision`) y con la lista de `rejected_fields` de RN-20.

- [ ] **T-04** (CA-18, CA-20, CA-31; RN-03, RN-14, RN-15): modelos `VisitorMemory` y `VisitorMemoryReview`, y alcance de visibilidad.
  - Fase: 1. Depende de: T-03, T-01.
  - Archivos: `apps/api/src/app/Models/VisitorMemory.php` (nuevo); `apps/api/src/app/Models/VisitorMemoryReview.php` (nuevo); `apps/api/src/tests/Feature/Memories/MemoryModelTest.php` (nuevo).
  - Cambios: `SoftDeletes` sobre `Model` (D-M1; sin `BaseModel`, que no existe). `$fillable` explícito sin `id`, `status`, `resubmitted_count` ni `deleted_at` (los fijan las Actions). Casts de fechas y de booleanos (`rejected_image`, `rejected_content`). Relaciones `visitor()`, `reviewer()`, `reviews()`. Scope `publiclyVisible(CarbonInterface $now)`: `status = accepted`, `published_until > $now`. El historial no se actualiza ni se borra (`visitor_memory_reviews`). Ninguna migración, ninguna columna nueva (RN-15).
  - Tests: `ca20_models_use_soft_deletes_and_no_hard_delete_path`; `ca18_accepted_current_memory_is_in_public_scope`; `ca31_expired_memory_keeps_status_row_and_file_without_audit` (con `Carbon::setTestNow`). Fixtures: filas creadas dentro de la transacción.
  - Hecho cuando: los tests pasan; el scope excluye `submitted`, `in_review`, `rejected` y los `accepted` vencidos sin escribir nada; ningún modelo llama a `forceDelete()`.

- [ ] **T-05** (RN-21, RN-23): configuración del plazo y de la versión de términos.
  - Fase: 1 (plazo) y 2 (términos). Depende de: T-01.
  - Archivos: `apps/api/src/config/memories.php` (nuevo: `publication_days` desde `MEMORIES_PUBLICATION_DAYS`, por defecto 7; `terms_version` desde `MEMORIES_TERMS_VERSION`); `apps/api/src/.env.example` (modificar, en el mismo cambio que `api-013` CA-06: añadir `MEMORIES_PUBLICATION_DAYS=7` y `MEMORIES_TERMS_VERSION=` sin valor secreto).
  - Cambios: solo `config/` lee `env()`; las Actions leen `config('memories.…')`. El valor de `terms_version` por defecto se confirma en Q2.
  - Tests: se prueban en T-11 (plazo) y T-20 (versión de términos guardada).
  - Hecho cuando: la configuración carga con los valores por defecto y `.env.example` no contiene secretos.

- [ ] **T-06** (CA-16; RN-07): permiso `memories.review` en el seeder, compartido con `api-014`.
  - Fase: 1. Depende de: T-01 y P3.
  - Archivos: `apps/api/src/database/seeders/RolesAndPermissionsSeeder.php` (modificar, solo si `api-014` T-07 aún no lo hizo); `apps/api/src/tests/Feature/Staff/SeedersTest.php` (ampliar).
  - Cambios: `memories.review` en `$permissions`; asignado a `zoo-admin`; excluido de `admin` con `array_diff($permissions, ['tickets.create', 'tickets.cancel', 'memories.review'])`, y con `species.review` si `api-014` lo añade en el mismo arreglo. `executive`, `cashier` y `veterinarian` no lo reciben. **No se duplica el cambio:** si `api-014` T-07 ya lo incluye, esta tarea solo añade el test.
  - Tests: `ca16_memories_review_only_zoo_admin` (en `SeedersTest.php`, comprueba `zoo-admin` con el permiso, `admin` sin él por exclusión explícita y los otros tres roles sin él).
  - Ejecución: `php artisan db:seed --class=RolesAndPermissionsSeeder` en `arca_pruebas`, por el equipo, con evidencia. Nunca sin `--class`; nunca contra `arca_zoo`.
  - Hecho cuando: el test pasa y la evidencia del seeder está en el PR.

- [ ] **T-07** (CA-14, CA-15; RN-07, RN-13): rutas de revisión, middleware y acceso por rol.
  - Fase: 1. Depende de: T-06.
  - Archivos: `apps/api/src/routes/api.php` (modificar: subgrupo con `permission:memories.review` dentro del grupo `admin.`, que ya tiene `auth:sanctum`, `staff.user` y `administrator.two-factor`); `apps/api/src/tests/Feature/Memories/MemoriesReviewAccessTest.php` (nuevo).
  - Cambios: declarar las rutas `admin.memories.index`, `admin.memories.show`, `admin.memories.image`, `admin.memories.accept` y `admin.memories.reject` con su middleware completo. Cada método del controlador se implementa en su tarea (T-08 a T-13); mientras una ruta no tenga método, el test de acceso solo comprueba el 401 o el 403 que responde el middleware, que es lo que se prueba aquí. Los `{id}` usan `whereNumber`. Cada ruta se añade al data provider de este test en cuanto se declara.
  - Tests: `ca14_admin_role_gets_403_on_memory_routes` (data provider: `admin`, `executive`, `cashier`, `veterinarian`); `ca14_zoo_admin_without_two_factor_is_blocked`; `ca15_visitor_session_cannot_read_staff_memory_routes` (401 o 403 sin datos).
  - Hecho cuando: los tests pasan con las rutas declaradas hasta este punto; ninguna ruta de personal responde 200 a un visitante ni a `admin`.

## Fase 1 · Revisión

- [ ] **T-08** (CA-07; RN-09, RN-11): lista de revisión con filtro por estado.
  - Fase: 1. Depende de: T-03, T-04, T-07.
  - Archivos: `apps/api/src/app/Http/Controllers/Admin/MemoryReviewController.php` (nuevo, `index`); `apps/api/src/app/Actions/Memories/Review/ListMemoriesForReviewAction.php` (nuevo); `apps/api/src/app/Http/Requests/Admin/ListMemoriesForReviewRequest.php` (nuevo); `apps/api/src/app/Http/Resources/Admin/MemoryReviewResource.php` (nuevo); `apps/api/src/tests/Feature/Memories/MemoriesReviewListTest.php` (nuevo).
  - Cambios: `GET /api/v1/admin/memories` (`admin.memories.index`). Filtro `status` opcional (`submitted`, `in_review`, `accepted`, `rejected`). `page` por defecto 1; `limit` por defecto 10, máximo 50 (D-M11). Orden `created_at` descendente. `meta` `{page, limit, has_more}` con `has_more` calculado pidiendo un elemento más. El Resource no incluye URL de imagen ni datos del visitante.
  - Tests: `ca07_review_list_paginates_and_filters_by_status`; `ca07_invalid_status_or_page_returns_422` (mensajes en español).
  - Hecho cuando: los tests pasan y la ruta está en el data provider de T-07.

- [ ] **T-09** (CA-08, CA-09, CA-10; RN-02, RN-09, RN-12): apertura del detalle y paso a En proceso.
  - Fase: 1. Depende de: T-04, T-07, T-08.
  - Archivos: `apps/api/src/app/Actions/Memories/Review/ShowMemoryForReviewAction.php` (nuevo); `apps/api/src/app/Http/Resources/Admin/MemoryReviewDetailResource.php` (nuevo); `MemoryReviewController.php` (ampliar, `show`); `apps/api/src/tests/Feature/Memories/MemoriesReviewOpenTest.php` (nuevo).
  - Cambios: `GET /api/v1/admin/memories/{id}` (`admin.memories.show`). Transición condicional: `UPDATE … WHERE id = ? AND status = 'submitted'`. Si afecta a una fila, registra `in-review` (Activitylog, log `admin`, con actor e identificador). Si no, relee el estado y no registra nada. Respuesta 200 con `id`, `status`, `opinion`, `created_at`, `resubmitted_count`, `rejection_reason`, `rejected_fields` (a partir de los booleanos), `reviewed_at`, `published_until`, `is_published` y `publication_days` (de `config`). Sin URL de imagen. 404 «Petición no encontrada.» si no existe, desde la Action.
  - Tests: `ca08_opening_submitted_moves_to_in_review_and_logs_once`; `ca08_detail_has_no_image_url_and_publication_days`; `ca09_reopening_in_review_accepted_or_rejected_changes_nothing`; `ca10_second_open_after_transition_logs_no_second_in_review` (secuencial, R5 del plan).
  - Hecho cuando: los tests pasan; ninguna respuesta incluye `image_path`, `published_image_path` ni una URL.

- [ ] **T-10** (CA-08; RN-06, RN-10; `api-013` CA-10): imagen en revisión por ruta autenticada.
  - Fase: 1. Depende de: T-02, T-09.
  - Archivos: `apps/api/src/app/Http/Controllers/Admin/MemoryReviewImageController.php` (nuevo, invocable); `apps/api/src/app/Actions/Memories/Review/ShowMemoryImageForReviewAction.php` (nuevo); `apps/api/src/tests/Feature/Memories/MemoriesReviewImageTest.php` (nuevo).
  - Cambios: `GET /api/v1/admin/memories/{id}/image` (`admin.memories.image`). Lee el archivo del disco privado (nombre de la configuración de `api-013`) y responde binario con `Content-Type` `image/*` según la extensión guardada. Si la fila no tiene `image_path` o el archivo no existe: 404 «La imagen ya no está disponible.». Propuesto: cabecera `Cache-Control: no-store`. No cambia el estado.
  - Tests: `ca08_image_route_serves_binary_only_with_permission`; `api013_ca10_review_image_is_binary_without_url_and_403_without_permission`.
  - Hecho cuando: los tests pasan con `Storage::fake` y el nombre del disco de la configuración; el JSON de la respuesta no contiene la URL.

- [ ] **T-11** (CA-30; RN-21): cálculo del plazo y errores de configuración.
  - Fase: 1. Depende de: T-05.
  - Archivos: `apps/api/src/app/Actions/Memories/Review/ComputePublicationWindowAction.php` (nuevo); `apps/api/src/tests/Feature/Memories/MemoriesPublicationWindowTest.php` (nuevo).
  - Cambios: lee `config('memories.publication_days')`. Si no es un entero mayor o igual que 1, lanza un error de configuración (500), registra el error en el log sin datos de la petición y no cambia nada. Devuelve `published_at` (ahora) y `published_until` (`published_at` + días).
  - Tests: `ca30_published_until_is_published_at_plus_configured_days`; `ca30_changing_config_does_not_change_accepted_memories` (el valor se fija al aceptar, no se recalcula); `ca30_invalid_config_returns_500_and_changes_nothing` (valores 0, -1, «siete», 1.5).
  - Hecho cuando: los tests pasan con `Carbon::setTestNow`.

- [ ] **T-12** (CA-11, CA-13; RN-02, RN-03, RN-12, RN-21; `api-013` CA-11): aceptar.
  - Fase: 1. Depende de: T-02, T-09, T-11.
  - Archivos: `apps/api/src/app/Actions/Memories/Review/AcceptMemoryAction.php` (nuevo); `MemoryReviewController.php` (ampliar, `accept`); `apps/api/src/tests/Feature/Memories/MemoriesAcceptTest.php` (nuevo).
  - Cambios: `POST /api/v1/admin/memories/{id}/accept` (`admin.memories.accept`). Fila bloqueada (`lockForUpdate`). Si el estado es `submitted` o `in_review`: `status = accepted`, `reviewed_by`, `reviewed_at`, `published_at` y `published_until` (T-11), `published_image_path = image_path` (sin mover el archivo). Fila de historial `accepted` en `visitor_memory_reviews`. Activitylog `accepted`. Si el archivo no existe en el disco: 422 en `errors.image` con «La imagen no está disponible; no se puede aceptar.» y no cambia nada. Si está `accepted`: 422 «Esta petición ya fue revisada.». Si está `rejected`: 422 «Esta petición está rechazada y espera la corrección del visitante.». Respuesta 200 con `published_until`.
  - Tests: `ca11_accept_sets_window_history_and_published_image_path`; `ca11_accept_without_file_returns_422_and_changes_nothing`; `api013_ca11_accept_does_not_move_the_file`; `ca13_accepted_cannot_be_decided_again`; `ca13_rejected_waits_for_visitor_correction` (las dos últimas en `MemoriesAcceptTest.php`).
  - Hecho cuando: los tests pasan; ningún test usa el disco real; el archivo se queda en el mismo sitio tras aceptar.

- [ ] **T-13** (CA-12, CA-13, CA-28; RN-02, RN-04, RN-13, RN-20): rechazar con motivo y campos marcados.
  - Fase: 1. Depende de: T-03, T-09.
  - Archivos: `apps/api/src/app/Http/Requests/Admin/RejectMemoryRequest.php` (nuevo); `apps/api/src/app/Actions/Memories/Review/RejectMemoryAction.php` (nuevo); `MemoryReviewController.php` (ampliar, `reject`); `apps/api/src/tests/Feature/Memories/MemoriesRejectTest.php` (nuevo).
  - Cambios: `POST /api/v1/admin/memories/{id}/reject` (`admin.memories.reject`). Validación: `rejection_reason` requerido, 1 a 500 caracteres; `rejected_fields` requerido, lista de 1 o 2 valores únicos de `image` y `content`. Fila bloqueada. Si está `submitted` o `in_review`: `status = rejected`; `rejected_image` y `rejected_content` según la lista; `rejection_reason`; `reviewed_by` y `reviewed_at`; si incluye `image`, `image_path = NULL` y se conserva `image_sha256`; fila de historial `rejected` con los campos; Activitylog `rejected` con los campos marcados (sin binario ni ruta). No publica nada. Estados tardíos: mismos 422 que T-12. El borrado del archivo es de T-14.
  - Tests: `ca12_reject_with_reason_and_fields_creates_history_and_no_publication`; `ca28_reject_validates_reason_and_fields_in_spanish` (sin motivo, con 501 caracteres, sin campos, con un valor fuera de la lista, con valores repetidos); `ca13_rejected_cannot_be_rejected_or_accepted_again`.
  - Hecho cuando: los tests pasan y un 422 no cambia nada.

- [ ] **T-14** (CA-29; RN-10, RN-19; `api-013` CA-12 y CA-18): archivo al rechazar según el motivo.
  - Fase: 1. Depende de: T-02, T-13.
  - Archivos: `apps/api/src/app/Actions/Memories/Media/DeleteMemoryImageAction.php` (nuevo); `RejectMemoryAction.php` (ampliar); `apps/api/src/tests/Feature/Memories/MemoriesRejectFileTest.php` (nuevo).
  - Cambios: `DeleteMemoryImageAction` borra solo rutas que cumplen `^memories/[0-9a-f-]{36}\.(jpg|jpeg|png|webp)$`. Cualquier otra ruta se ignora y se registra como aviso sin la ruta. El borrado se hace después del commit, solo si los campos incluyen `image`. Si solo incluye `content`, el archivo se conserva y `image_path` no cambia. Si el borrado falla tras el commit: la petición queda `rejected`, se registra el fallo en el log sin ruta, y el archivo queda huérfano (R9).
  - Tests: `ca29_reject_image_deletes_file_after_commit_and_keeps_sha`; `ca29_reject_content_only_keeps_file`; `ca29_delete_failure_after_commit_keeps_rejected_and_logs` (con disco falso que falla al borrar); `api013_ca18_deletion_only_for_managed_memory_paths` (rutas fuera del patrón no se borran).
  - Hecho cuando: los tests pasan y ninguna Action borra un archivo antes del commit.

- [ ] **T-15** (CA-19; RN-13 y el apartado «Datos, privacidad y auditoría»): auditoría de la revisión.
  - Fase: 1. Depende de: T-09, T-12, T-13.
  - Archivos: `apps/api/src/tests/Feature/Memories/MemoriesAuditTest.php` (nuevo). Ajustes, si hacen falta, en `ShowMemoryForReviewAction.php`, `AcceptMemoryAction.php` y `RejectMemoryAction.php`.
  - Cambios: cada registro de `in-review`, `accepted` y `rejected` incluye actor, acción e identificador de la petición (y, en `rejected`, los campos marcados). Ningún registro incluye binario ni ruta absoluta. Log `admin` (`LogAdminActivityAction`), textos en español.
  - Tests: `ca19_review_audit_has_actor_action_and_id_without_binary_or_path` (para `in-review`, `accepted` y `rejected`).
  - Hecho cuando: el test pasa y se revisa que `properties` no contiene rutas.

- [ ] **T-16** (CA-17, CA-31; RN-09, RN-10, RN-21): sin URL antes de aceptar y vencimiento en la vista de revisión.
  - Fase: 1. Depende de: T-09, T-12.
  - Archivos: `apps/api/src/tests/Feature/Memories/MemoriesReviewVisibilityTest.php` (nuevo); ajustes en `MemoryReviewResource.php` y `MemoryReviewDetailResource.php` si hace falta.
  - Cambios: en ninguna respuesta de revisión aparece `image_url` ni una ruta de una petición no aceptada. Para una petición aceptada con `published_until` vencido, la vista de revisión muestra `published_until`, `is_published = false` y `publication_days`. No se escribe nada al consultar (CA-31).
  - Tests: `ca17_non_accepted_memories_have_no_image_url_in_review_responses`; `ca31_zoo_admin_sees_publication_expired`.
  - Hecho cuando: los tests pasan; el test de CA-17 recorre listado, detalle y decisiones.

- [ ] **T-17** (CA-21 parcial; RN-14): capas y nombres de la Fase 1.
  - Fase: 1. Depende de: T-07 a T-16.
  - Archivos: `apps/api/src/tests/Feature/Memories/MemoriesRoutesTest.php` (nuevo).
  - Cambios: revisión de que los controladores de revisión solo llaman a Form Requests, Actions y Resources; ninguna regla de estado está en un controlador. Nombres de ruta en inglés: `admin.memories.index`, `admin.memories.show`, `admin.memories.image`, `admin.memories.accept`, `admin.memories.reject`.
  - Tests: `ca21_staff_memory_routes_are_named_in_english` (comprueba los nombres con `Route::has`/`route()`).
  - Hecho cuando: el test pasa. Cierra la Fase 1 interna; la integración pública es T-26.

---

## Fase 2 · Envío y lista del visitante (consumida por `mobile-010`)

- [ ] **T-18** (CA-02, CA-03, CA-04; RN-05, RN-06, RN-08, RN-13): validación del envío.
  - Fase: 2. Depende de: T-03, T-05.
  - Archivos: `apps/api/src/app/Http/Requests/Visitor/StoreVisitorMemoryRequest.php` (nuevo); `apps/api/src/app/Http/Requests/Visitor/ResubmitVisitorMemoryRequest.php` (nuevo); `apps/api/src/tests/Feature/Memories/VisitorMemoryValidationTest.php` (nuevo); fixtures en `apps/api/src/tests/Fixtures/memories/` (JPEG, PNG y WebP pequeños, sin metadatos reales, sin fotos de personas).
  - Cambios: `image` requerido, `mimes:jpg,jpeg,png,webp` y `max:5120` (KB). `opinion` opcional y texto plano; tras recortar espacios, vacía se guarda como NULL; máximo 300 caracteres. `consent` requerido y `accepted`. Mensajes en español: el de CA-04 literal («Confirma que tienes permiso para compartir esta foto y que aceptas los términos.»); el resto, propuestos en el PR. Nombres de campo `image`, `opinion` y `consent` (D-M9, Q5). En el reenvío, `image` es opcional.
  - Tests: `ca02_invalid_file_returns_422_and_writes_nothing` (no JPG/PNG/WebP, más de 5 MB, archivo no procesable); `ca03_opinion_over_300_returns_422_in_errors_opinion`; `ca04_missing_consent_returns_422_with_spanish_message`.
  - Hecho cuando: cada mensaje de CA-02 a CA-04 coincide con la spec y un 422 no crea filas ni archivos.

- [ ] **T-19** (CA-02; RN-05, RN-16; `api-013` CA-08 y CA-09): almacenamiento de la imagen del envío.
  - Fase: 2. Depende de: T-02, T-04, T-18.
  - Archivos: `apps/api/src/app/Actions/Memories/Media/StoreMemoryImageAction.php` (nuevo); `apps/api/src/tests/Feature/Memories/VisitorMemoryStorageTest.php` (nuevo).
  - Cambios: retira los metadatos con `StripImageMetadataAction::execute($bytes, $mimeType)` (`api-008`, reutilizado sin cambios); calcula el SHA-256 del archivo limpio; genera el nombre `memories/<uuid>.<ext>` (`jpg` para JPEG, `png`, `webp`); escribe en el disco privado de la configuración de `api-013`. Si el retiro falla o el archivo no se lee: 422 en `errors.image` con «No se pudo procesar la foto. Intenta con otro archivo.». Si la escritura falla: 5xx y nada queda registrado (RN-16). No copia nada a un disco público.
  - Tests: `api013_ca08_storage_failure_creates_nothing`; `api013_ca09_memory_file_is_stored_under_memories_without_metadata` (con `Storage::fake` del nombre de la configuración).
  - Hecho cuando: los tests pasan; el nombre generado nunca viene del cliente.

- [ ] **T-20** (CA-01, CA-05; RN-08, RN-12, RN-16, RN-23): envío base.
  - Fase: 2. Depende de: T-18, T-19, T-04, P6.
  - Archivos: `apps/api/src/app/Actions/Memories/Visitor/SubmitVisitorMemoryAction.php` (nuevo); `apps/api/src/app/Http/Controllers/Visitor/VisitorMemoryController.php` (nuevo, `store`); `apps/api/src/app/Http/Resources/Visitor/VisitorMemoryResource.php` (nuevo); `apps/api/src/routes/api.php` (modificar: `visitor.memories.store` dentro del grupo `visitor.`, con `auth:sanctum` y `visitor.token`); `apps/api/src/tests/Feature/Memories/VisitorMemorySubmitTest.php` (nuevo).
  - Cambios: `POST /api/v1/visitor/memories` (`visitor.memories.store`), multipart. Orden de la Action: fila de `visitors` bloqueada (`lockForUpdate`); escritura del archivo limpio dentro de la transacción (T-19); inserción en `submitted` con `resubmitted_count = 0`, `opinion` (NULL si no se envía), `consent_at` = ahora, `terms_version` = `config('memories.terms_version')` (RN-23); commit. Si algo falla antes del commit, se borra el archivo nuevo. Respuesta 201 con `id`, `status` (`submitted`), `opinion`, `created_at` y `resubmitted_count`, sin URL. Los límites (CA-23 a CA-25) son de T-21; aquí la Action deja el punto de extensión después del bloqueo.
  - Pendiente antes de cerrar: P6. Si el token no garantiza correo verificado, añadir la comprobación y su test (403 `email_not_verified`, sin archivo ni petición).
  - Tests: `ca01_visitor_submits_memory_and_gets_201_without_url`; `ca05_no_session_401_and_unverified_email_403_write_nothing`.
  - Hecho cuando: los tests pasan; un 401 o 403 no escribe archivo ni fila.

- [ ] **T-21** (CA-23, CA-24, CA-25; RN-12, RN-17, RN-18): límites del envío.
  - Fase: 2. Depende de: T-20.
  - Archivos: `SubmitVisitorMemoryAction.php` (ampliar); `apps/api/src/tests/Feature/Memories/VisitorMemoryLimitsTest.php` (nuevo).
  - Cambios: dentro del bloqueo de la fila del visitante, en este orden: (1) petición abierta, es decir, cualquier fila del visitante en `submitted`, `in_review` o `rejected` (CA-24): 422 en `errors.open_request` con «Ya tienes una petición abierta. Espera la revisión o corrígela si fue rechazada.» y `open_request_id`; (2) límite semanal: la última fila nueva del visitante, incluidas las eliminadas lógicamente (`withTrashed()`), con `created_at` hace menos de 7 días (CA-23): 429 con `weekly_limit_reached`, `next_submission_at` (`created_at` + 7 días, ISO 8601 UTC), el mensaje con la fecha en `APP_TIMEZONE` y la cabecera `Retry-After` en segundos. Exactamente 7 días después, el envío es válido. Los reenvíos no cuentan. Ninguno de los dos escribe archivo ni fila. `meta.can_submit` y `next_submission_at` se calculan con la misma regla en T-22.
  - Tests: `ca23_weekly_limit_returns_429_with_next_submission_at`; `ca23_exactly_seven_days_allows_submit` (`Carbon::setTestNow`); `ca24_open_request_returns_422_with_open_request_id` (para `submitted`, `in_review` y `rejected`); `ca25_second_submit_after_first_is_blocked_by_open_request` (secuencial, R5 del plan).
  - Hecho cuando: los tests pasan; el orden de comprobación es sesión, campos, petición abierta y límite.

- [ ] **T-22** (CA-06, CA-31; RN-09, RN-11, RN-18, RN-21): lista propia del visitante.
  - Fase: 2. Depende de: T-04, T-20, T-21.
  - Archivos: `apps/api/src/app/Actions/Memories/Visitor/ListVisitorMemoriesAction.php` (nuevo); `VisitorMemoryController.php` (ampliar, `index`); `VisitorMemoryResource.php` (ampliar); `apps/api/src/tests/Feature/Memories/VisitorMemoryListTest.php` (nuevo).
  - Cambios: `GET /api/v1/visitor/memories` (`visitor.memories.index`). Solo las peticiones del visitante, de la más reciente a la más antigua, máximo 50 (RN-11). Campos: `id`, `status`, `opinion`, `created_at`, `reviewed_at`, `resubmitted_count`. Si `rejected`: `rejection_reason` y `rejected_fields`. Si `accepted`: `published_until` e `is_published` (`published_until > now`). `meta`: `can_submit` (falso si hay petición abierta o si está dentro del límite semanal), `next_submission_at` (ISO 8601 UTC o `null`) y `open_request_id` (o `null`). Sin nombres, correos ni datos del revisor. Sin campos de imagen. Respuesta `{"data": [...], "meta": {...}}`.
  - Tests: `ca06_list_only_own_newest_first_max_50_with_meta`; `ca06_rejected_and_accepted_fields_and_no_reviewer_data`; `ca31_visitor_sees_is_published_false_after_expiry`.
  - Hecho cuando: los tests pasan; ningún campo de la respuesta lleva una ruta ni un identificador de revisor.

- [ ] **T-23** (CA-26, CA-19 de reenvío; RN-02, RN-16, RN-17, RN-19): reenvío de una rechazada.
  - Fase: 2. Depende de: T-13, T-19, T-20.
  - Archivos: `apps/api/src/app/Actions/Memories/Visitor/ResubmitVisitorMemoryAction.php` (nuevo); `VisitorMemoryController.php` (ampliar, `resubmit`); `apps/api/src/tests/Feature/Memories/VisitorMemoryResubmitTest.php` (nuevo).
  - Cambios: `POST /api/v1/visitor/memories/{id}/resubmit` (`visitor.memories.resubmit`), multipart. Fila de la petición bloqueada; comprobación de propiedad (si no es del visitante o no existe: 404 «Petición no encontrada.»). Si no está `rejected`: 422 en `errors.status` con «Solo puedes corregir una petición rechazada.». Calcula el hash del archivo limpio antes de la transacción; dentro de la transacción aplica las reglas de CA-27 (T-24), escribe el archivo nuevo si lo hay, y actualiza `status = submitted`, `resubmitted_count + 1`, `rejection_reason`, `rejected_image`, `rejected_content` a NULL o 0, `consent_at`, `terms_version` y `opinion`; si hay archivo nuevo, `image_path` e `image_sha256`. Fila de historial: la decisión anterior ya está en `visitor_memory_reviews`; no se borra. Activitylog `resubmitted` (log `visitor-memories`, Q8). No cuenta ni abre la ventana semanal (RN-17). Tras el commit, si se sustituyó un archivo, se borra el anterior con `DeleteMemoryImageAction`.
  - Tests: `ca26_resubmit_rejected_returns_200_and_keeps_history`; `ca26_non_rejected_returns_422_status`; `ca26_other_account_returns_404`; `ca19_resubmitted_audit_has_no_binary_or_path`; `ca23_resubmit_does_not_open_or_count_the_window` (reenvío no abre ni cuenta la ventana semanal, RN-17).
  - Hecho cuando: los tests pasan; un reenvío que falla no cambia la petición ni borra el archivo anterior (RN-16).

- [ ] **T-24** (CA-27; RN-19, RN-20): reglas de corrección según los campos marcados.
  - Fase: 2. Depende de: T-23.
  - Archivos: `ResubmitVisitorMemoryAction.php` (ampliar); `apps/api/src/tests/Feature/Memories/VisitorMemoryResubmitRulesTest.php` (nuevo).
  - Cambios: si `rejected_fields` incluye `image`, el reenvío exige archivo nuevo y válido (CA-02). Si su hash coincide con `image_sha256`, 422 en `errors.image` con «Sube una foto distinta a la que fue rechazada.». Si incluye `content`, la opinión (recortada) debe ser distinta de la guardada; si no, 422 en `errors.opinion` con «Cambia la opinión antes de reenviarla.»; si el rechazo incluye `content`, la opinión debe enviarse (D-M12). Si solo incluye `content`, la imagen es opcional; si se envía, sustituye a la anterior. En todos los 422, nada cambia. La consentimiento es obligatorio en todos los casos (T-18).
  - Tests: `ca27_image_rejection_requires_different_photo_hash`; `ca27_content_rejection_requires_changed_opinion`; `ca27_content_only_keeps_or_replaces_image_and_deletes_previous_after_commit`.
  - Hecho cuando: los tests pasan; el hash se compara con el del archivo limpio.

- [ ] **T-25** (CA-32; RN-22, RN-23): elección de borrado de cuenta. **BLOQUEADA** por P9.
  - Fase: 2. Depende de: P9 (enmienda aprobada de `api-004` CA-14 y de `mobile-004` CA-10).
  - Estado: **no se implementa** hasta que la enmienda de `api-004` (`DELETE /api/v1/visitor/me` con `memories_policy`) esté aprobada por Aksel y sus responsables estén avisados (pregunta 5 de la spec).
  - Archivos previstos (solo si se desbloquea): `apps/api/src/app/Actions/Memories/Visitor/ApplyVisitorMemoriesPolicyAction.php` (nuevo); `apps/api/src/app/Actions/Visitor/DeleteVisitorAccountAction.php` (`api-004`, modificar solo por la enmienda); `apps/api/src/tests/Feature/Memories/VisitorMemoryAccountDeletionTest.php` (nuevo).
  - Cambios previstos: `keep` (filas con `visitor_id` NULL, sin borrar archivos); `delete` (filas con `deleted_at` y `visitor_id` NULL; archivos borrados después del commit). Sin peticiones, el campo no se pide. Con peticiones y sin `memories_policy` válido: 422 en `errors.memories_policy`. Activitylog `visitor-memories-policy-applied`.
  - Tests: `ca32_policy_required_when_memories_exist_returns_422`; `ca32_keep_unlinks_rows_and_keeps_files_and_audits`; `ca32_delete_soft_deletes_rows_and_removes_files_after_commit`. **Mientras esté bloqueada, los tests existen con su nombre y se marcan `markTestSkipped` con el motivo «Pendiente de enmienda de api-004 (P9)».**
  - Hecho cuando: la enmienda está aprobada y los tests pasan sin omitir. Hasta entonces, la tarea sigue sin marcar.

- [ ] **T-26** (CA-17, CA-18, CA-31; RN-03, RN-09, RN-11, RN-21): integración con la lectura pública de `api-012`. **Depende de P8.**
  - Fase: 1 (integración del portal). Depende de: T-04, T-12, y del plan y tasks de `api-012` (P8).
  - Archivos: `apps/api/src/tests/Feature/Memories/MemoriesPublicReadIntegrationTest.php` (nuevo).
  - Cambios: sin escribir código propio en `GET /api/v1/memories` (eso es de `api-012`). Esta tarea solo añade las pruebas que verifican las reglas de esta spec sobre esa ruta: una petición aceptada vigente aparece con imagen y opinión y sin datos del visitante ni del revisor; las no aceptadas (`submitted`, `in_review`, `rejected`) y las vencidas no aparecen y no tienen `image_url`.
  - Tests: `ca17_public_list_never_exposes_non_accepted_memories`; `ca18_public_list_shows_image_and_opinion_only`; `ca31_public_list_excludes_expired`.
  - Hecho cuando: los tests pasan con la ruta de `api-012` implementada. Hasta entonces, la tarea sigue sin marcar y el resto de la Fase 1 se verifica con los tests de T-04, T-16 y T-22.

---

## Calidad transversal y entrega

- [ ] **T-27** (CA-21 de la Fase 2, CA-22; RN-14, RN-15): arquitectura y cobertura de pruebas.
  - Fase: transversal. Depende de: T-17, T-20 a T-24, T-26 (o de su bloqueo).
  - Archivos: `apps/api/src/tests/Feature/Memories/MemoriesCoverageTest.php` (nuevo); `MemoriesRoutesTest.php` (ampliar).
  - Cambios: revisión de que los controladores del visitante solo llaman a Form Requests, Actions y Resources. Nombres de ruta: `visitor.memories.store`, `visitor.memories.index`, `visitor.memories.resubmit`. Cobertura: el test busca `caNN_` (`ca01_` a `ca32_`) y `CA-NN` en los docblocks de `tests/Feature/Memories/` y de `tests/Feature/Staff/SeedersTest.php`; verifica `DB_DATABASE=arca_pruebas`, `DatabaseTransactions` y la ausencia de `RefreshDatabase` y de migraciones en los tests.
  - Tests: `ca21_visitor_memory_routes_are_named_and_controllers_are_thin`; `MemoriesCoverageTest` (CA-22).
  - Hecho cuando: el test de cobertura pasa; cada CA-01 a CA-32 tiene un test con su nombre (CA-32 con su test omitido, según T-25).

- [ ] **T-28** (documental; RN-05, RN-21, RN-23): `infra/README.md` y documentación de la API.
  - Fase: transversal. Depende de: T-05, T-06, T-19.
  - Archivos: `infra/README.md` (modificar, en el mismo PR); `apps/api/docs/` (solo si la arquitectura de la API se documenta con `docs/templates/arquitectura-app.md`; no se duplica la guía `momentos-contrato-para-mobile.md`, que es de referencia).
  - Cambios en `infra/README.md`: variables `MEMORIES_PUBLICATION_DAYS` (7 por defecto, decisión del 2026-11-12) y `MEMORIES_TERMS_VERSION` (valor pendiente de Q2); seeder `db:seed --class=RolesAndPermissionsSeeder` con `memories.review` solo para `zoo-admin`; datos de prueba únicamente (las fotos de visitantes no se versionan fuera de pruebas, `api-013` CA-22); el flujo de commit de `memories/` lo cubre `api-013` CA-20 (no se duplica); límites de subida de 5 MB (ya existentes) y mensajes 413 y 415 que la app muestra. Sin secretos.
  - Si la Fase 2 se entrega, actualizar la guía `apps/api/docs/momentos-contrato-para-mobile.md` con las respuestas reales de `arca_pruebas` solo si el responsable de backend lo decide; no es obligatorio en este plan.
  - Hecho cuando: el checklist de `infra/README.md` menciona cada requisito nuevo (`MEMORIES_*`, seeder) y el PR lo incluye.

- [ ] **T-29** (todos los CA; DoD de la spec): verificación, CI y entrega.
  - Fase: transversal.
  - Pasos: desde `apps/api/src`, ejecutar `composer lint` y `composer test` (o los comandos exactos de `composer.json`), con `DB_DATABASE=arca_pruebas`. Registrar comandos, códigos de salida, tests omitidos (T-25 y, si aplica, T-26) y fallidos. Ejecutar `/verify` para `apps/api`. CI en verde con evidencia del pipeline (`007-ci-workflow`). PR que enlaza spec, plan y tasks del mismo `010-visitor-memory-requests`; commit que cita `api-010`.
  - Estado de la spec: pasar a «En progreso» y a «Implementada» solo con aprobación humana y evidencia aportada por la sesión principal. No se cambia el estado desde esta tarea.
  - Hecho cuando: el checklist de «Definición de terminado» (abajo) está completo con evidencia.

---

## Definición de terminado (DoD)

- [ ] `/verify` ejecutado para `apps/api` con resultados registrados.
- [ ] CI en verde.
- [ ] Cada CA-01 a CA-32 tiene al menos un test automatizado con su nombre (verificado por T-27). CA-32 queda con su test omitido hasta P9.
- [ ] Cada RN-01 a RN-23 aparece en al menos una tarea (tabla siguiente).
- [ ] Constitution Check del plan resuelto, incluida la fila V (D-M1).
- [ ] `infra/README.md` actualizado en el mismo PR (T-28).
- [ ] Spec, plan y tasks enlazados en el PR; estado de la spec actualizado por decisión humana.
- [ ] Fase 2: el contrato de la app está en `apps/api/docs/momentos-contrato-para-mobile.md` sin divergencias nuevas.

---

## Trazabilidad CA → fase → tarea → test

| CA | Fase | Tarea(s) | Test (nombre propuesto) |
|---|---|---|---|
| CA-01 | 2 | T-19, T-20 | `ca01_visitor_submits_memory_and_gets_201_without_url` |
| CA-02 | 2 | T-18, T-19 | `ca02_invalid_file_returns_422_and_writes_nothing`; `api013_ca08_storage_failure_creates_nothing` |
| CA-03 | 2 | T-18 | `ca03_opinion_over_300_returns_422_in_errors_opinion` |
| CA-04 | 2 | T-18 | `ca04_missing_consent_returns_422_with_spanish_message` |
| CA-05 | 2 | T-20 | `ca05_no_session_401_and_unverified_email_403_write_nothing` |
| CA-06 | 2 | T-22 | `ca06_list_only_own_newest_first_max_50_with_meta`; `ca06_rejected_and_accepted_fields_and_no_reviewer_data` |
| CA-07 | 1 | T-08 | `ca07_review_list_paginates_and_filters_by_status`; `ca07_invalid_status_or_page_returns_422` |
| CA-08 | 1 | T-09, T-10 | `ca08_opening_submitted_moves_to_in_review_and_logs_once`; `ca08_detail_has_no_image_url_and_publication_days`; `ca08_image_route_serves_binary_only_with_permission`; `api013_ca10_review_image_is_binary_without_url_and_403_without_permission` |
| CA-09 | 1 | T-09 | `ca09_reopening_in_review_accepted_or_rejected_changes_nothing` |
| CA-10 | 1 | T-09 | `ca10_second_open_after_transition_logs_no_second_in_review` |
| CA-11 | 1 | T-12 | `ca11_accept_sets_window_history_and_published_image_path`; `ca11_accept_without_file_returns_422_and_changes_nothing`; `api013_ca11_accept_does_not_move_the_file` |
| CA-12 | 1 | T-13 | `ca12_reject_with_reason_and_fields_creates_history_and_no_publication` |
| CA-13 | 1 | T-12, T-13 | `ca13_accepted_cannot_be_decided_again`; `ca13_rejected_waits_for_visitor_correction`; `ca13_rejected_cannot_be_rejected_or_accepted_again` |
| CA-14 | 1 | T-07 | `ca14_admin_role_gets_403_on_memory_routes`; `ca14_zoo_admin_without_two_factor_is_blocked` |
| CA-15 | 1 | T-07 | `ca15_visitor_session_cannot_read_staff_memory_routes` |
| CA-16 | 1 | T-06 | `ca16_memories_review_only_zoo_admin` |
| CA-17 | 1 (admin) y 1 de integración (público) | T-16, T-26 | `ca17_non_accepted_memories_have_no_image_url_in_review_responses`; `ca17_public_list_never_exposes_non_accepted_memories` |
| CA-18 | 1 (modelo) y 1 de integración (público) | T-04, T-26 | `ca18_accepted_current_memory_is_in_public_scope`; `ca18_public_list_shows_image_and_opinion_only` |
| CA-19 | 1 (revisión) y 2 (reenvío) | T-15, T-23 | `ca19_review_audit_has_actor_action_and_id_without_binary_or_path`; `ca19_resubmitted_audit_has_no_binary_or_path` |
| CA-20 | 1 | T-04 | `ca20_models_use_soft_deletes_and_no_hard_delete_path` |
| CA-21 | Transversal | T-17, T-27 | `ca21_staff_memory_routes_are_named_in_english`; `ca21_visitor_memory_routes_are_named_and_controllers_are_thin` |
| CA-22 | Transversal | T-27 | `MemoriesCoverageTest` |
| CA-23 | 2 | T-21, T-23 | `ca23_weekly_limit_returns_429_with_next_submission_at`; `ca23_exactly_seven_days_allows_submit`; `ca23_resubmit_does_not_open_or_count_the_window` |
| CA-24 | 2 | T-21 | `ca24_open_request_returns_422_with_open_request_id` |
| CA-25 | 2 | T-21 | `ca25_second_submit_after_first_is_blocked_by_open_request` |
| CA-26 | 2 | T-23 | `ca26_resubmit_rejected_returns_200_and_keeps_history`; `ca26_non_rejected_returns_422_status`; `ca26_other_account_returns_404` |
| CA-27 | 2 | T-24 | `ca27_image_rejection_requires_different_photo_hash`; `ca27_content_rejection_requires_changed_opinion`; `ca27_content_only_keeps_or_replaces_image_and_deletes_previous_after_commit` |
| CA-28 | 1 | T-13 | `ca28_reject_validates_reason_and_fields_in_spanish` |
| CA-29 | 1 | T-14 | `ca29_reject_image_deletes_file_after_commit_and_keeps_sha`; `ca29_reject_content_only_keeps_file`; `ca29_delete_failure_after_commit_keeps_rejected_and_logs`; `api013_ca18_deletion_only_for_managed_memory_paths` |
| CA-30 | 1 | T-11 | `ca30_published_until_is_published_at_plus_configured_days`; `ca30_changing_config_does_not_change_accepted_memories`; `ca30_invalid_config_returns_500_and_changes_nothing` |
| CA-31 | 1 (modelo y admin), 2 (visitante), 1 de integración (público) | T-04, T-16, T-22, T-26 | `ca31_expired_memory_keeps_status_row_and_file_without_audit`; `ca31_zoo_admin_sees_publication_expired`; `ca31_visitor_sees_is_published_false_after_expiry`; `ca31_public_list_excludes_expired` |
| CA-32 | 2, **bloqueada** (P9) | T-25 | `ca32_policy_required_when_memories_exist_returns_422`; `ca32_keep_unlinks_rows_and_keeps_files_and_audits`; `ca32_delete_soft_deletes_rows_and_removes_files_after_commit` (omitidos hasta P9) |

### Trazabilidad RN → tarea

| RN | Tarea(s) |
|---|---|
| RN-01 (estados) | T-03 |
| RN-02 (transiciones) | T-09, T-12, T-13, T-23 |
| RN-03 (aceptar publica durante un plazo) | T-04, T-12, T-26 |
| RN-04 (motivo de rechazo) | T-13 |
| RN-05 (archivo) | T-02, T-18, T-19 |
| RN-06 (opinión) | T-10, T-18 |
| RN-07 (permisos) | T-06, T-07 |
| RN-08 (consentimiento) | T-18, T-20 |
| RN-09 (datos públicos) | T-08, T-09, T-16, T-22, T-26 |
| RN-10 (imagen pendiente; excepción de `media/`) | T-02, T-10, T-14, T-16 |
| RN-11 (listas) | T-08, T-22, T-26 |
| RN-12 (concurrencia) | T-09, T-12, T-20, T-21 |
| RN-13 (mensajes) | T-07, T-13, T-18 |
| RN-14 (arquitectura) | T-04, T-17, T-27 |
| RN-15 (esquema) | T-01, T-04, T-27 |
| RN-16 (fallo de guardado) | T-19, T-20, T-23 |
| RN-17 (frecuencia) | T-21, T-23 |
| RN-18 (una petición abierta) | T-21, T-22 |
| RN-19 (corrección y reenvío) | T-14, T-23, T-24 |
| RN-20 (motivos del rechazo) | T-03, T-13, T-24 |
| RN-21 (plazo de publicación) | T-05, T-11, T-12, T-16, T-22, T-26, T-28 |
| RN-22 (borrado de cuenta) | T-25 (bloqueada) |
| RN-23 (términos y casilla) | T-05, T-20, T-25 (registro de `api-004`, bloqueado), T-28 |

### Resumen de cobertura

- Tareas: 29 (T-01 a T-29): 2 de precondición (T-01, T-02), 15 de Fase 1 (T-03 a T-17), 7 de Fase 2 (T-18 a T-24), 1 bloqueada de Fase 2 (T-25), 1 de integración pública que depende de `api-012` (T-26) y 3 transversales (T-27 a T-29).
- CA cubiertos por tarea: 32 de 32 (CA-01 a CA-32). **CA sin cobertura: 0.** Tres CA dependen de otra spec para su prueba completa: CA-17, CA-18 y CA-31 (parte pública, T-26, P8). CA-32 tiene test nombrado pero omitido (T-25, P9).
- RN cubiertas: 23 de 23 (RN-01 a RN-23). RN-22 solo en T-25, bloqueada.
- Tareas que no pueden empezar: T-10, T-12, T-14 y T-19 hasta P2 (`api-013`); T-06 y T-07 hasta P3 (compartido con `api-014`); T-20 hasta P6; T-25 hasta P9; T-26 hasta P8.
