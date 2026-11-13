# Tareas · 013 · object-storage-images

- Spec: `apps/api/specs/013-object-storage-images.md` (Aprobada, 2026-11-12).
- Plan: `apps/api/plan/013-object-storage-images.md` (Estado: **Aprobado**, Jonathan, 2026-11-13).
- Estado: **Aprobado** (Jonathan, responsable de backend, 2026-11-13). Implementación pendiente de iniciar; coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Aviso vigente: ninguna casilla marcada. No se marca nada sin evidencia (Constitución II).
- Puerta de entrada: no se empieza T-01 hasta que el plan esté aprobado (P4, cumplida el 2026-11-13) y T-00 esté marcada con evidencia.
- Desbloqueos: al cerrar T-01, T-02 y T-04 se desbloquean **P2 de `api-014`** (disco `media` y `PUBLIC_MEDIA_DISK=media`) y **T-09 y T-22 de `api-015`** (resolución de `image_url` y pruebas con `Storage::fake('media')`).

Rutas relativas a `apps/api/src` salvo que se diga otra cosa. Las pruebas usan `DatabaseTransactions` sobre `arca_pruebas` y `Storage::fake`; ninguna tarea crea SQL, migraciones ni usa `RefreshDatabase`. Los nombres de test son propuestos por el plan (la spec no los fija). Cada CA-xx aparece en al menos un método de test; los de evidencia manual se registran además en el PR.

## Precondiciones (solo lectura, sin código)

- [ ] **T-00** (RN-08, RN-15; precondición de todas las tareas de código): **verificación de precondiciones en `arca_pruebas`, solo lectura.** No se ejecuta DDL ni DML, no se toca `arca_zoo` y no se lee `.env`. Registrar con evidencia y fecha:
  - DBR-012 en «Lista para backend» en `docs/database/requests/DBR-012-visitor-memories.md`, con la migración aplicada en `arca_pruebas` (aplicada el 2026-11-11). Evidencia: salida de `php artisan migrate:status` (solo lectura) con la migración de DBR-012 en «Ran».
  - Columnas `image_path` y `deleted_at` en `news` y `events`; columnas `image_path`, `published_image_path`, `image_sha256` y `status` en `visitor_memories`. Evidencia: `SHOW COLUMNS` o `information_schema.COLUMNS`.
  - Estado de `apps/api/plan/010-visitor-memory-requests.md` y `apps/api/tasks/010-visitor-memory-requests.md`: plan y tasks aprobados el 2026-11-13 (Jonathan). Comprobar que existen en el repositorio al ejecutar T-00; si no existieran, T-08 a T-10 y T-24 a T-26 quedan **bloqueadas** y se anota.
  - Ausencia de `apps/api/src/media/` y de `apps/api/src/public/media` antes de empezar (o contenido esperado si ya existen).
  - **Criterio de hecho:** salida registrada en esta tarea, sin datos personales ni credenciales. Si falta algo, la tarea queda abierta y el plan se revisa.

No hay tareas de base de datos: esta spec no crea tablas, columnas ni índices (RN-08). Ninguna tarea genera migraciones ni SQL.

## Implementación: configuración y versionado

- [ ] **T-01** (CA-01, CA-14, CA-17; RN-01, RN-02, RN-04, RN-09): **ajustar `config/filesystems.php`**.
  - Disco `media`: driver `local`, raíz `base_path('media')`, visibilidad pública, `throw` en `false`, URL = `MEDIA_PUBLIC_URL` si no está vacía; si no, `APP_URL` + `/media`.
  - Clave de ámbitos (`media_scopes`): `public` ← `PUBLIC_MEDIA_DISK` (vacía o ausente = `public`); `private` ← `PRIVATE_MEDIA_DISK` (vacía o ausente = `local`). Ver D-P1 y D-P2 del plan.
  - `links`: añadir `public_path('media')` → `base_path('media')`; conservar `public_path('storage')`.
  - URL del disco `public`: resuelta (pregunta 1 del plan, 2026-11-13): `MEDIA_PUBLIC_URL` sustituye la URL de cualquier disco del ámbito público; si está vacía, cada disco usa su URL (`/storage` para `public`, `/media` para `media`).
  - Rutas: `apps/api/src/config/filesystems.php`.
  - **Criterio de hecho:** sin variables, los ámbitos resuelven `public` y `local`; con `media`, ambos resuelven `media`; `links` contiene `public/media` y `public/storage`; la URL por defecto del disco `media` es `APP_URL` + `/media`. Cubierto por T-14.

- [ ] **T-02** (CA-06; RN-02): **añadir las claves de medios a `.env.example`**: `PUBLIC_MEDIA_DISK`, `PRIVATE_MEDIA_DISK` y `MEDIA_PUBLIC_URL` con valores de muestra (`public`, `local` y vacío) y sin llaves, credenciales ni URL firmadas. `FILESYSTEM_DISK` no cambia.
  - Rutas: `apps/api/src/.env.example`.
  - **Criterio de hecho:** el archivo contiene las tres claves y ningún secreto. Cubierto por T-14.

- [ ] **T-03** (CA-19; RN-01, RN-08): **verificar `composer.json` sin cambios**: no se añade ningún paquete de almacenamiento ni de proveedor; no se instala nada (la instalación de paquetes requiere ADR).
  - Rutas: `apps/api/src/composer.json` (sin cambio).
  - **Criterio de hecho:** `git diff` no muestra cambios en `composer.json` ni en `composer.lock`. Cubierto por T-19.

- [ ] **T-04** (CA-14, CA-15; RN-14): **preparar la carpeta compartida y sus reglas de versionado**.
  - Añadir `/public/media` a `apps/api/src/.gitignore` (el enlace no se versiona).
  - Crear `apps/api/src/media/.gitignore` con la regla de D-P7 del plan: todo ignorado en la raíz salvo `.gitignore` y las cinco carpetas; dentro de cada carpeta, todo ignorado salvo `.gitkeep`, `.jpg`, `.jpeg`, `.png` y `.webp`. Des-ignorar la carpeta antes que su contenido.
  - Crear `.gitkeep` en `news/`, `events/`, `memories/`, `species/` y `species-requests/`.
  - Rutas: `apps/api/src/.gitignore` (modificar), `apps/api/src/media/.gitignore` y `apps/api/src/media/{news,events,memories,species,species-requests}/.gitkeep` (nuevos).
  - **Criterio de hecho:** `git check-ignore` confirma: `media/news/x.jpg` no ignorado; `media/memories/x.png` no ignorado; `media/events/.gitkeep` no ignorado; `media/news/.DS_Store` ignorado; `media/species-requests/x.gif` ignorado; `public/media` ignorado. Automatizado en T-18. Pregunta 3 del plan resuelta el 2026-11-13: `species/` y `species-requests/` se versionan en pruebas.

## Implementación: Actions compartidas y noticias/eventos

- [ ] **T-05** (CA-02, CA-04; RN-01, RN-02, RN-07): **crear `ResolveMediaDiskAction`** en `app/Actions/Media/`, con `publicDisk(): string` y `privateDisk(): string`, que leen solo `config('filesystems.media_scopes')`. No llama a `env()`.
  - Rutas: `apps/api/src/app/Actions/Media/ResolveMediaDiskAction.php`.
  - **Criterio de hecho:** devuelve `public` y `local` sin variables; devuelve `media` con las variables a `media`. Cubierto por T-14 y T-15.

- [ ] **T-06** (CA-18, CA-23; RN-10, RN-17): **crear `DeleteMediaFileAfterCommitAction`** en `app/Actions/Media/`. Recibe la ruta relativa y el ámbito (`public` o `private`). Valida la ruta (relativa, sin `..` ni `\`, prefijo `news/`, `events/`, `memories/`, `species/` o `species-requests/`, nombre `<uuid>.<ext>`). Si no cumple, no borra y registra un aviso técnico. Si el borrado falla, registra un aviso y no lanza excepción al llamador. Solo se llama después del commit de base de datos.
  - Rutas: `apps/api/src/app/Actions/Media/DeleteMediaFileAfterCommitAction.php`.
  - **Criterio de hecho:** borra rutas válidas; ignora `other/...`, `../...` y rutas absolutas; los avisos no contienen rutas absolutas. Cubierto por T-23 (noticias y eventos) y T-26 (rechazo de momentos).

- [ ] **T-07** (CA-02, CA-03, CA-07, CA-16, CA-18; RN-03, RN-04, RN-10): **ajustar las Actions de noticias y eventos de `api-008`**.
  - `StoreContentImageAction`: usar `ResolveMediaDiskAction->publicDisk()` en lugar de `'public'`. Mantener la escritura antes de la transacción y el error que produce 5xx.
  - `DeleteContentImageAction`: delegar en `DeleteMediaFileAfterCommitAction` con el ámbito público, conservando su contrato (`execute(?string $path): void`) y la comprobación de ruta gestionada de `api-008`.
  - `ResolveContentImageUrlAction`: construir la URL con el disco público resuelto.
  - Divergencia registrada en `api-008` (tareas T-29 a T-33 de esa spec).
  - Rutas: `apps/api/src/app/Actions/Admin/Content/StoreContentImageAction.php`, `DeleteContentImageAction.php`, `ResolveContentImageUrlAction.php` (modificar).
  - **Criterio de hecho:** ninguna de las tres Actions contiene `'public'`, `'local'` ni `'media'`; las pruebas de `api-008` (T-02 a T-19 de esa spec) siguen verdes sin cambios; `image_path` no cambia de formato. Cubierto por T-15 y T-16.

## Implementación: momentos y revisión (bloqueadas por P7)

Plan y tasks de `api-010` aprobados el 2026-11-13. Las tareas de momentos siguen dependiendo de la implementación de `api-010`. Los nombres de Actions y Controllers de `api-010` se confirman con su plan.

- [ ] **T-08** (CA-05, CA-08, CA-09; RN-02, RN-05, RN-10, RN-16) — **bloqueada por la implementación de `api-010`** (P7 cumplida el 2026-11-13): en la Action de guardado de peticiones de momento de `api-010`, usar `privateDisk()` y la ruta `memories/<uuid>.<ext>`; aplicar `StripImageMetadataAction` antes de escribir; escribir antes de la transacción; si la escritura falla, responder 5xx sin registro y sin archivo. La respuesta no incluye `image_url`.
  - Rutas: Action de `api-010` (nombre según su plan).
  - **Criterio de hecho:** el archivo queda en `memories/` del disco privado; ninguna respuesta de visitante ni pública tiene URL de la imagen. Cubierto por T-24.

- [ ] **T-09** (CA-10, CA-23; RN-06, RN-11, RN-13) — **bloqueada por la implementación de `api-010`** (P7 cumplida el 2026-11-13): crear `StreamReviewMemoryImageAction` (`app/Actions/Admin/Memories/`) y `MemoryImageController` (`app/Http/Controllers/Admin/`, delgado). Añadir la ruta `GET /api/v1/admin/memories/{id}/image`, nombre `admin.memories.image`, con `whereNumber`, dentro del grupo de `api-010` con 2FA y `permission:memories.review`. La respuesta es binaria, con `Content-Type` derivado de la extensión almacenada, `Cache-Control: no-store` y `X-Content-Type-Options: nosniff`. Si la petición no existe, 404 «Petición no encontrada.»; si el archivo no existe, 404 «La imagen ya no está disponible.» (pregunta 6 resuelta: texto de la spec de `api-010`, CA-08). Sin ruta ni nombre original en la respuesta.
  - Rutas: `apps/api/src/app/Actions/Admin/Memories/StreamReviewMemoryImageAction.php`, `apps/api/src/app/Http/Controllers/Admin/MemoryImageController.php`, `apps/api/src/routes/api.php` (modificar).
  - **Criterio de hecho:** 200 con `image/*` para `memories.review` y 2FA; 403 sin cuerpo sin el permiso; el detalle JSON de `api-010` no contiene URL. Cubierto por T-25.

- [ ] **T-10** (CA-11, CA-12, CA-13, CA-18; RN-05, RN-10, RN-17) — **bloqueada por la implementación de `api-010`** (P7 cumplida el 2026-11-13): en aceptar y rechazar de `api-010`:
  - Aceptar: `published_image_path` toma el valor de `image_path`; no se copia ni se mueve el archivo.
  - Rechazar: la transacción pasa la petición a `rejected` y registra el motivo; si `rejected_fields` incluye `image`, `image_path` queda en `null`, y tras el commit de base de datos se llama a `DeleteMediaFileAfterCommitAction`; si solo incluye `content`, el archivo se conserva (D-05); si el borrado falla, la petición queda rechazada, se registra el fallo y el archivo queda huérfano. `image_sha256` se conserva.
  - Rutas: Actions de aceptar y rechazar de `api-010` (nombres según su plan).
  - **Criterio de hecho:** `published_image_path` es `null` en peticiones rechazadas; ninguna respuesta incluye la imagen rechazada. Cubierto por T-26.

## Documentación y verificación de configuración

- [ ] **T-11** (CA-20, CA-24; RN-14, RN-15, RN-17, RN-18): **verificar y completar el bloque «Medios de prueba compartidos» de `infra/README.md`**. El bloque ya aparece en el árbol de trabajo sin commit. Comprobar que:
  - no tiene etiqueta de fase y no contiene el bloque de almacenamiento de objetos (la referencia a `docs/propuestas/` puede quedar);
  - incluye `PUBLIC_MEDIA_DISK`, `PRIVATE_MEDIA_DISK`, `MEDIA_PUBLIC_URL` y la nota de que `storage:link` crea `public/media`;
  - incluye el flujo subir o recibir → revisar → `git add apps/api/src/media` → commit citando `api-013` → `pull`;
  - incluye la instrucción de volver a subir las imágenes existentes antes del commit (D-04);
  - advierte que solo se usan datos de prueba y que el historial de git conserva lo versionado (riesgo a del ADR 0026);
  - indica que `media/` no es producción ni respaldo;
  - las carpetas `species/` y `species-requests/` se incluyen (pregunta 3 del plan resuelta el 2026-11-13).
  - Rutas: `infra/README.md`.
  - **Criterio de hecho:** el bloque existe y cada punto tiene su casilla. Cubierto por T-20.

- [ ] **T-12** (CA-03, CA-16; RN-03, RN-04): **documentar `image_url` y los discos de medios**.
  - `apps/api/docs/contenido-publico.md`: la URL sale del disco público; con la carpeta compartida es `APP_URL` + `/media` (o `MEDIA_PUBLIC_URL`); los momentos pendientes y rechazados nunca tienen `image_url`; la base guarda rutas relativas.
  - `apps/api/docs/arquitectura.md`: añadir una sección de discos de medios si el documento describe almacenamiento; si no lo describe, no se modifica.
  - Rutas: `apps/api/docs/contenido-publico.md`, `apps/api/docs/arquitectura.md` (si aplica).
  - **Criterio de hecho:** la documentación coincide con la spec y el plan; no aparece `arca_zoo`, credenciales ni URL firmada.

- [ ] **T-13** (RN-11, RN-12): **verificar CORS y acceso a medios sin cambios de código**: `apps/api/src/config/cors.php` no cambia (sus `paths` son `api/*` y `sanctum/csrf-cookie`); `/media` no pasa por CORS porque es un archivo estático del enlace; la ruta de revisión se consume por proxy de mismo origen (D-06).
  - Rutas: `apps/api/src/config/cors.php` (sin cambio).
  - **Criterio de hecho:** `git diff` no muestra cambios en `cors.php`; la evidencia (salida de `git diff --stat`) se pega en el PR.

## Pruebas automatizadas (PHPUnit, un método por CA)

Archivos en `apps/api/src/tests/Feature/Media/`. Las pruebas usan `DatabaseTransactions` sobre `arca_pruebas` y `Storage::fake`. Nunca escriben en `apps/api/src/media/`, salvo las pruebas de lectura del repositorio, que solo leen.

- [ ] **T-14** (CA-01, CA-06, CA-17; RN-02, RN-09): `MediaConfigTest.php` con `test_ca01_defaults_use_public_and_local_scopes_when_env_absent` (incluye variable vacía), `test_ca06_env_example_declares_media_keys_without_secrets` y `test_ca17_default_media_url_and_links_include_public_media`.
  - Rutas: `apps/api/src/tests/Feature/Media/MediaConfigTest.php`.
  - Bloqueada por: T-01, T-02.

- [ ] **T-15** (CA-02, CA-04; RN-01, RN-07): `MediaStaticRulesTest.php` con `test_ca02_actions_http_and_models_never_name_disk_literals` (escanea `app/Actions`, `app/Http` y `app/Models`; busca literales `'public'`, `'local'`, `'media'` y `'s3'` en `Storage::disk(...)`) y `test_ca04_domain_has_no_provider_names_or_sdk_calls` (lista de nombres prohibidos de D-P5; `env(` solo en `config/`; sin `temporaryUploadUrl` ni `temporaryUrl`, RN-07).
  - Rutas: `apps/api/src/tests/Feature/Media/MediaStaticRulesTest.php`.
  - Bloqueada por: T-05, T-07.

- [ ] **T-16** (CA-03, CA-07, CA-14, CA-16, CA-18; RN-03, RN-04): `SharedMediaStorageTest.php` con `test_ca03_public_url_comes_from_disk_url_not_app_url`, `test_ca07_public_upload_goes_to_scope_disk_with_relative_path`, `test_ca14_shared_folder_write_under_news_events_memories`, `test_ca16_database_keeps_relative_path_when_url_changes` y `test_ca18_replace_remove_and_delete_remove_files_after_commit_news_events`. Los ámbitos se fijan con `config(...)` dentro de la prueba; los archivos se simulan con `Storage::fake('media')` o `Storage::fake('public')`.
  - Rutas: `apps/api/src/tests/Feature/Media/SharedMediaStorageTest.php`.
  - Bloqueada por: T-01, T-04, T-07.

- [ ] **T-17** (CA-08; RN-10): `SharedMediaWriteFailureTest.php` con `test_ca08_write_failure_returns_5xx_and_creates_no_record` (noticias y eventos). Se usa un doble de almacenamiento cuyo `put()` devuelve `false`; se comprueba que la respuesta es 5xx, que no se crea ni cambia la fila y que no queda ningún archivo.
  - Rutas: `apps/api/src/tests/Feature/Media/SharedMediaWriteFailureTest.php`.
  - Bloqueada por: T-07.

- [ ] **T-18** (CA-15; RN-14): `MediaGitignoreTest.php` con `test_ca15_media_gitignore_allows_only_images_and_gitkeep`: ejecuta `git check-ignore` desde la raíz del repositorio sobre las rutas de ejemplo de la spec y las de T-04. Si `git` no está disponible, la prueba falla (no se omite).
  - Rutas: `apps/api/src/tests/Feature/Media/MediaGitignoreTest.php`.
  - Bloqueada por: T-04.

- [ ] **T-19** (CA-19; RN-01): `MediaComposerTest.php` con `test_ca19_composer_has_no_storage_or_provider_packages`: lee `require` y `require-dev` de `composer.json` y falla si aparece un paquete de almacenamiento o de proveedor (`flysystem`, `aws`, `s3`, `azure`, `cloudinary`, `google/cloud`, `medialibrary`, `backblaze`, `wasabi`, `digitalocean`).
  - Rutas: `apps/api/src/tests/Feature/Media/MediaComposerTest.php`.
  - Bloqueada por: T-03.

- [ ] **T-20** (CA-20, CA-24; RN-14, RN-15, RN-17, RN-18): `MediaDocsTest.php` con `test_ca20_infra_readme_has_shared_media_block` (busca el encabezado «Medios de prueba compartidos», `api-013`, `git add apps/api/src/media`, la instrucción D-04, la advertencia de datos de prueba y de historial) y `test_ca24_infra_readme_lists_media_variables_and_storage_link` (busca `PUBLIC_MEDIA_DISK`, `PRIVATE_MEDIA_DISK`, `MEDIA_PUBLIC_URL`, `storage:link` y `public/media`). Automatizadas además de la evidencia de la spec.
  - Rutas: `apps/api/src/tests/Feature/Media/MediaDocsTest.php`.
  - Bloqueada por: T-11.

- [ ] **T-21** (CA-22; RN-14, RN-15): `MediaLimitsTest.php` con `test_ca22_media_folder_within_100_images_or_100_mb`: cuenta los archivos `.jpg`, `.jpeg`, `.png` y `.webp` de `apps/api/src/media/` (sin `.gitkeep` ni `.gitignore`) y su tamaño total; falla si hay más de 100 imágenes o más de 104 857 600 bytes (unidad resuelta el 2026-11-13, pregunta 5 del plan). La parte de origen y consentimiento es manual (T-29).
  - Rutas: `apps/api/src/tests/Feature/Media/MediaLimitsTest.php`.
  - Bloqueada por: T-04. Pregunta 5 del plan resuelta (2026-11-13).

- [ ] **T-22** (CA-21; RN-18) — **bloqueada por T-01 y T-04** (pregunta 2 del plan resuelta: grupo `smoke`): `MediaSmokeTest.php` con `test_ca21_smoke_public_image_from_test_environment` en el grupo `smoke`. Lee la URL de una imagen pública de la variable de entorno de prueba (no versionada), comprueba `200` y `Content-Type` `image/*`, y no se ejecuta en la suite por defecto. Sin IP privada ni llaves en el archivo.
  - Rutas: `apps/api/src/tests/Feature/Media/MediaSmokeTest.php`.
  - Bloqueada por: T-01 y T-04. La pregunta 2 del plan está resuelta (grupo `smoke`, 2026-11-13).

- [ ] **T-23** (CA-23; RN-10): `MediaLogSecurityTest.php` con `test_ca23_activity_log_and_responses_have_no_secrets_or_absolute_paths` para noticias y eventos: tras crear, reemplazar y quitar una imagen, se leen las propiedades de `activity_log` y el cuerpo de la respuesta, y se comprueba que no aparecen rutas absolutas (`base_path`, `storage_path`), URL firmadas (`Signature=`, `X-Amz`) ni binario. Los momentos se cubren en T-26.
  - Rutas: `apps/api/src/tests/Feature/Media/MediaLogSecurityTest.php`.
  - Bloqueada por: T-06, T-07.

- [ ] **T-24** (CA-05, CA-08, CA-09; RN-05, RN-16) — **bloqueada por la implementación de `api-010`** (P7 cumplida el 2026-11-13): `MemoryMediaStorageTest.php` con `test_ca05_private_scope_uses_media_memories_and_null_url_when_not_accepted`, `test_ca09_private_upload_under_memories_strips_metadata_and_no_url` y `test_ca08_memory_write_failure_returns_5xx_and_creates_no_record`. Usa `Storage::fake` del disco privado resuelto.
  - Rutas: `apps/api/src/tests/Feature/Media/MemoryMediaStorageTest.php`.
  - Bloqueada por: T-08 y la implementación de `api-010` (P7 cumplida el 2026-11-13).

- [ ] **T-25** (CA-10; RN-06, RN-11, RN-13) — **bloqueada por la implementación de `api-010`** (P7 cumplida el 2026-11-13): `MemoryReviewImageTest.php` con `test_ca10_review_image_is_binary_and_detail_has_no_url`, `test_ca10_review_image_returns_403_without_permission_and_no_body` (incluye `admin`, `executive`, `cashier` y `veterinarian`) y `test_ca10_review_image_missing_file_returns_404_in_spanish`.
  - Rutas: `apps/api/src/tests/Feature/Media/MemoryReviewImageTest.php`.
  - Bloqueada por: T-09 y la implementación de `api-010` (P7 cumplida el 2026-11-13).

- [ ] **T-26** (CA-11, CA-12, CA-13, CA-18; RN-05, RN-10, RN-17) — **bloqueada por la implementación de `api-010`** (P7 cumplida el 2026-11-13): `MemoryDecisionFilesTest.php` con `test_ca11_accept_keeps_file_in_place_and_sets_published_path`, `test_ca12_reject_with_image_deletes_file_after_commit`, `test_ca12_reject_content_only_keeps_file`, `test_ca12_delete_failure_rejects_and_logs`, `test_ca13_rejected_has_no_published_path_and_no_image_in_responses` y `test_ca18_memory_reject_and_delete_remove_files_after_commit`. También comprueba CA-23 para momentos (sin rutas absolutas en `activity_log`).
  - Rutas: `apps/api/src/tests/Feature/Media/MemoryDecisionFilesTest.php`.
  - Bloqueada por: T-10 y la implementación de `api-010`. Pregunta 7 del plan resuelta (2026-11-13): con `delete` el archivo se borra después del commit (`api-010` T-25).

- [ ] **T-27** (CA-25; RN-08): `ObjectStorageCoverageTest.php` con `test_ca25_names_every_automated_criterion_and_uses_arca_pruebas`: busca `test_ca01_` a `test_ca24_` (incluido el nombre de CA-21) en `tests/Feature/Media/` y comprueba que `config('database.connections.mysql.database')` es `arca_pruebas`; comprueba que los archivos de la carpeta no usan `RefreshDatabase`, `migrate:fresh` ni `artisan migrate`.
  - Rutas: `apps/api/src/tests/Feature/Media/ObjectStorageCoverageTest.php`.
  - Bloqueada por: T-14 a T-26 (existentes; las de momentos pueden marcarse como pendientes con evidencia).

## Verificación, evidencia y entrega

- [ ] **T-28** (CA-21; RN-18) — **manual, entre equipos**: con el mismo commit de `apps/api/src/media/` en dos equipos, y `APP_URL` alcanzable desde el otro, abrir desde el otro equipo la URL de una imagen publicada de noticia, evento o momento aceptado: respuesta `200` con `image/*`. Comprobar que la URL de una imagen pendiente o rechazada no aparece en ninguna respuesta de la API. Evidencia en el PR sin llaves, IP privadas ni datos personales.
  - Bloqueada por: T-01, T-02, T-04 y el `pull` del commit.

- [ ] **T-29** (CA-22; RN-15): **manual, revisión de origen y consentimiento** antes de cada commit de `apps/api/src/media/`: ninguna imagen de visitante real, usuario de producción o `arca_zoo`; cada imagen cumple la definición de dato de prueba (sin personas identificables o con consentimiento escrito de cada persona que aparece; ninguna foto de menores). Registrar en el PR el total de imágenes y bytes, sin nombres ni datos personales.
  - Bloqueada por: T-04.

- [ ] **T-30** (RN-08, RN-12; `/verify`): **verificación para `apps/api`**. Ejecutar `php artisan test` sobre `arca_pruebas` (suite completa, incluida `tests/Feature/Media/`); `vendor/bin/pint --test` sobre los archivos tocados; regresión de `api-006` (`PublicCatalogTest.php`) y de `api-008` (`tests/Feature/Admin/` de noticias, eventos e imágenes). `git diff --stat` sin cambios en `database/migrations/`, en `composer.json` ni en `cors.php`. Registrar número de pruebas, aserciones y fallos preexistentes por separado. No se ejecuta nada en `arca_zoo`.
  - **Criterio de hecho:** pruebas en verde en el CI; evidencia pegada en el PR. Sin esta evidencia, ninguna tarea se marca.

- [ ] **T-31** (CA-25; DoD): **enlazar spec, plan y tasks en el PR**; citar `api-013` en los commits; actualizar el estado de la spec a En progreso solo al iniciar la implementación con plan y tasks aprobados, y a Implementada solo con evidencia de T-30, T-28 y T-29 y aprobación funcional. Anotar en el PR el desbloqueo de P2 de `api-014` y de T-09 y T-22 de `api-015`. Marcar cada T-xx solo con su evidencia.
  - **Criterio de hecho:** PR con los tres artefactos enlazados; casillas y estado coherentes con la evidencia.

## Trazabilidad

### Criterios de aceptación (CA-xx)

| CA | Tareas de implementación | Tarea de prueba (nombre propuesto) |
|---|---|---|
| CA-01 | T-01 | T-14 (`test_ca01_defaults_use_public_and_local_scopes_when_env_absent`) |
| CA-02 | T-05, T-07 | T-15 (`test_ca02_actions_http_and_models_never_name_disk_literals`) |
| CA-03 | T-07, T-12 | T-16 (`test_ca03_public_url_comes_from_disk_url_not_app_url`); momentos en T-24 |
| CA-04 | T-05 | T-15 (`test_ca04_domain_has_no_provider_names_or_sdk_calls`) |
| CA-05 | T-08 | T-24 (`test_ca05_private_scope_uses_media_memories_and_null_url_when_not_accepted`) |
| CA-06 | T-02 | T-14 (`test_ca06_env_example_declares_media_keys_without_secrets`) |
| CA-07 | T-07 | T-16 (`test_ca07_public_upload_goes_to_scope_disk_with_relative_path`) |
| CA-08 | T-07, T-08 | T-17 (noticias y eventos); T-24 (momentos) |
| CA-09 | T-08 | T-24 (`test_ca09_private_upload_under_memories_strips_metadata_and_no_url`) |
| CA-10 | T-09 | T-25 (`test_ca10_review_image_is_binary_and_detail_has_no_url`; `..._returns_403_...`; `..._missing_file_returns_404_in_spanish`) |
| CA-11 | T-10 | T-26 (`test_ca11_accept_keeps_file_in_place_and_sets_published_path`) |
| CA-12 | T-06, T-10 | T-26 (`test_ca12_reject_with_image_deletes_file_after_commit`; `..._reject_content_only_keeps_file`; `..._delete_failure_rejects_and_logs`) |
| CA-13 | T-10 | T-26 (`test_ca13_rejected_has_no_published_path_and_no_image_in_responses`) |
| CA-14 | T-01, T-04 | T-16 (`test_ca14_shared_folder_write_under_news_events_memories`) |
| CA-15 | T-04 | T-18 (`test_ca15_media_gitignore_allows_only_images_and_gitkeep`) |
| CA-16 | T-07, T-12 | T-16 (`test_ca16_database_keeps_relative_path_when_url_changes`) |
| CA-17 | T-01 | T-14 (`test_ca17_default_media_url_and_links_include_public_media`) |
| CA-18 | T-06, T-07, T-10 | T-16 (`test_ca18_replace_remove_and_delete_remove_files_after_commit_news_events`); T-26 (`test_ca18_memory_reject_and_delete_remove_files_after_commit`) |
| CA-19 | T-03 | T-19 (`test_ca19_composer_has_no_storage_or_provider_packages`) |
| CA-20 | T-11 | T-20 (`test_ca20_infra_readme_has_shared_media_block`); evidencia manual de la spec en PR |
| CA-21 | T-01, T-02, T-04 (prerrequisitos); T-22 (smoke) | T-22 (`test_ca21_smoke_public_image_from_test_environment`, bloqueada por pregunta 2); T-28 (manual) |
| CA-22 | T-04 | T-21 (`test_ca22_media_folder_within_100_images_or_100_mb`); T-29 (manual) |
| CA-23 | T-06, T-09 | T-23 (`test_ca23_activity_log_and_responses_have_no_secrets_or_absolute_paths`); T-26 (momentos) |
| CA-24 | T-11 | T-20 (`test_ca24_infra_readme_lists_media_variables_and_storage_link`) |
| CA-25 | T-27 | T-27 (`test_ca25_names_every_automated_criterion_and_uses_arca_pruebas`) |

### Reglas de negocio (RN-xx)

| RN | Tareas que lo cubren |
|---|---|
| RN-01 (contrato de disco) | T-01, T-03, T-05 |
| RN-02 (ámbitos y claves) | T-01, T-02, T-05, T-08, T-14 |
| RN-03 (rutas relativas) | T-07, T-12, T-16 |
| RN-04 (URL pública) | T-01, T-07, T-12, T-14, T-16 |
| RN-05 (privado sin URL en respuesta) | T-08, T-10, T-24, T-26 |
| RN-06 (imagen de revisión binaria) | T-09, T-25 |
| RN-07 (sin subida directa) | T-05, T-15 |
| RN-08 (sin DBR por el almacenamiento) | T-00, T-03, T-27, T-30 |
| RN-09 (un disco por ámbito) | T-01, T-14 |
| RN-10 (fallo de almacenamiento) | T-06, T-07, T-08, T-10, T-17, T-23, T-24 |
| RN-11 (sin lectura privada desde el navegador) | T-09, T-13, T-25 |
| RN-12 (sin CORS para imágenes) | T-13, T-30 |
| RN-13 (errores en español) | T-09, T-25 |
| RN-14 (todo `media/` se versiona) | T-04, T-11, T-18, T-21 |
| RN-15 (no es producción) | T-11, T-29 |
| RN-16 (pendientes y rechazadas sin URL en la API) | T-08, T-24 |
| RN-17 (borrado en git) | T-06, T-10, T-11, T-20, T-26 |
| RN-18 (moderación entre equipos) | T-11, T-22, T-28 |

**Cobertura:** CA-01 a CA-25 tienen al menos una tarea de implementación o de evidencia y al menos un método de test (o evidencia manual registrada). **CA sin cobertura: 0.** RN-01 a RN-18 tienen al menos una tarea. **RN sin cobertura: 0.**

Nota de cobertura: los CA de momentos (CA-05, CA-08 parte momentos, CA-09 a CA-13 y CA-18 parte momentos) dependen de `api-010` (P7). Su cobertura está escrita, pero no puede ejecutarse hasta que su plan y sus tareas estén aprobados (cumplido el 2026-11-13) y `api-010` esté implementada.

## Definición de terminado (DoD)

- Spec Aprobada y estado actualizado; plan y tasks con el mismo NNN-slug (`013-object-storage-images`).
- T-00 con evidencia de solo lectura (DBR-012 aplicada en `arca_pruebas`).
- Todos los T-xx aplicables marcados con evidencia.
- Cada CA-01 a CA-25 cubierto por un test automatizado en verde o por evidencia manual registrada en el PR (CA-21 y CA-22 también tienen tarea automatizada cuando se resuelvan las preguntas 2 y 5).
- `/verify` ejecutado para `apps/api` (T-30): pruebas, formato y tipos. **CI en verde** (Constitución IV). Este documento no puede verificarlo: la evidencia la aporta quien ejecuta.
- Sin violaciones a los seis principios (ver el Constitution Check del plan; la excepción de la Constitución V requiere acuerdo del equipo, P6).
- Documentación (`infra/README.md`, `apps/api/docs/`) actualizada; PR enlaza spec, plan y tasks; no hay secretos ni archivos generados comprometidos.
- Sin migraciones, sin SQL, sin cambios en `composer.json`, `cors.php` ni `database/migrations/`.

## Preguntas abiertas que bloquean o condicionan

Las preguntas completas están en `apps/api/plan/013-object-storage-images.md`, sección «Suposiciones y preguntas». Las que afectan a estas tareas:

- Pregunta 1 (`MEDIA_PUBLIC_URL` con el disco público por defecto): resuelta el 2026-11-13 (T-01 y T-14 la aplican).
- Pregunta 2 (prueba automatizada de CA-21 y grupo `smoke`): resuelta el 2026-11-13; T-22 solo espera a T-01 y T-04.
- Pregunta 3 (carpetas de especies en la spec): resuelta el 2026-11-13: se versionan en pruebas (T-04, T-11, T-18).
- Pregunta 4 (orden con `api-010`): resuelta el 2026-11-13: primero `api-013`; los momentos después (T-08 a T-10 y T-24 a T-26).
- Pregunta 5 (unidad del tope de 100 MB): resuelta el 2026-11-13: 104 857 600 bytes (T-21 y T-29).
- Pregunta 6 (estados y mensaje 404 de la imagen de revisión): resuelta el 2026-11-13: cualquier estado con archivo; «La imagen ya no está disponible.» (T-09 y T-25).
- Pregunta 7 (borrado de archivo al eliminar la cuenta): resuelta el 2026-11-13: con `delete`, el archivo se borra después del commit (T-26).
- Pregunta 8 (existencia del archivo al leer, frente a `api-015`): resuelta el 2026-11-13; la regla de especies se registra en `api-015`.
- P7 (plan y tasks de `api-010` aprobados; cumplida el 2026-11-13): T-08 a T-10 y T-24 a T-26 siguen dependiendo de la implementación de `api-010`.

Estado final de estas tareas: **Aprobado** (Jonathan, 2026-11-13); sin casillas marcadas; pendiente T-00.
