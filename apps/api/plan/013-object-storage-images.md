# Plan técnico · 013 · object-storage-images

- Spec: `apps/api/specs/013-object-storage-images.md`
- Estado de spec: Aprobada (2026-11-12, Jonathan, responsable de backend). Aprobar la spec no autoriza implementar.
- Estado: **Aprobado** (Jonathan, responsable de backend, 2026-11-13). Implementación pendiente de iniciar; coordinación en `docs/trabajo-paralelo-momentos-especies.md`.
  - Aviso vigente: las precondiciones que sigan «Pendiente» en la tabla bloquean sus tareas. La excepción de la Constitución V (P6) quedó aceptada el 2026-11-13 solo para datos de prueba en `arca_pruebas`. Las preguntas 1 a 8 quedaron resueltas el 2026-11-13 (sección «Preguntas»).
- Responsable técnico: Jonathan (responsable de backend), aprobación del 2026-11-13 en nombre del equipo.
- Tasks: `apps/api/tasks/013-object-storage-images.md` (Aprobado, Jonathan, 2026-11-13; sin casillas marcadas).
- ADR: `docs/adr/0026-object-storage-s3-images.md` (Aceptado 2026-11-12). Relacionado: `docs/adr/0027-dynamic-public-memories-gallery.md` (galería pública de momentos).
- Desbloqueo: esta spec desbloquea **P2 de `api-014`** (disco `media` configurado y `PUBLIC_MEDIA_DISK=media` disponible) y **T-09 y T-22 de `api-015`** (resolución de `image_url` con el disco de medios y pruebas con `Storage::fake('media')`). El desbloqueo se produce al cerrar T-01, T-02 y T-04 de este plan (ver «Orden y aprobación»).
- Divergencia registrada en esta misma entrega: `apps/api/plan/008-event-news-images.md` y `apps/api/tasks/008-event-news-images.md` (ver «Divergencias registradas»).

## Precondiciones y bloqueos

Antes de la primera tarea de código (T-01 en adelante) deben cumplirse P4 y P1 a P3. T-00 las verifica en solo lectura.

| # | Precondición | Responsable | Estado el 2026-11-12 | Evidencia requerida |
|---|---|---|---|---|
| P1 | DBR-012 en «Lista para backend» y migración aplicada en `arca_pruebas` | BD (responsable de la DBR) y backend | Cumplida: DBR-012 aplicada en `arca_pruebas` el 2026-11-11. Esta spec no crea esquema (RN-08). | T-00: salida de solo lectura de `migrate:status` y de las columnas usadas |
| P2 | ADR 0026 Aceptado | Equipo | Cumplida: Aceptado el 2026-11-12 (Jonathan, responsable de backend) | Enlace al ADR en el PR |
| P3 | Riesgos (a), (b), (c), (g) y (m) del ADR 0026 confirmados para pruebas | Equipo | Cumplida (2026-11-12 y 2026-11-13, válido para pruebas): la aceptación de Jonathan en nombre del equipo basta; no se exige confirmación adicional ni se crea ADR nuevo. Bloquea la subida de momentos; no bloquea la configuración de noticias, eventos ni especies. | Registro de confirmación en el ADR o en el PR |
| P4 | Plan y tasks aprobados | Equipo / responsable de backend | Cumplida el 2026-11-13 (Jonathan, responsable de backend) | Aprobación de plan y tasks en el PR |
| P5 | Pregunta 3 de la spec (definición de dato de prueba y tope de CA-22) | Responsable funcional | Resuelta el 2026-11-12. La unidad de «100 MB» quedó resuelta el 2026-11-13 (pregunta 5 de este plan: 104 857 600 bytes). | Spec, «Preguntas pendientes» |
| P6 | Excepción a la Constitución V (datos personales de momentos versionados en git) | Equipo | **Cumplida el 2026-11-13:** aceptada por Jonathan (responsable de backend), en nombre del equipo, solo para datos de prueba en `arca_pruebas`; revisar antes de producción. Registrada en el ADR 0026 (sección «Constitución») y en este plan. Bloquea solo la subida real de momentos. | Acuerdo registrado en este plan y en el ADR 0026; no se crea ADR nuevo |
| P7 | Plan y tasks de `api-010` aprobados (Actions, permisos `memories.review` y rutas de momentos) | Responsable de backend | Cumplida el 2026-11-13 (Jonathan, responsable de backend): plan y tasks de `api-010` aprobados. `api-010` sigue sin implementar; T-08 a T-10 y T-24 a T-26 dependen además de su implementación. | Plan y tasks de `api-010` aprobados |

Notas:
- Las tareas de noticias, eventos y especies (T-01 a T-07, T-11 a T-22) no dependen de P7.
- P3 y P6 bloquean solo la primera subida real de un momento a `media/memories/`, no el código de disco ni las pruebas con `Storage::fake`.

## Diseño de solución

Esta spec no cambia el modelo de datos. Añade un disco de Laravel (`media`), dos ámbitos configurables (público y privado) y una regla única para resolver el nombre del disco. Las Actions de imágenes dejan de nombrar el disco; la base de datos sigue guardando rutas relativas (RN-03).

Flujo de una noticia o evento (api-008, con el ámbito público configurado):

```
dashboard → API (admin.news.* / admin.events.*, permiso news.manage / events.manage)
  → Form Request (api-008, sin cambios)
  → Action de guardado (api-008)
      → StoreContentImageAction → ResolveMediaDiskAction.publicDisk() → disco public | media
      → transacción (fila con image_path relativo)
      → tras el commit de base de datos: DeleteMediaFileAfterCommitAction (archivo anterior)
  → Resource → image_url = URL del disco público (ResolveContentImageUrlAction)
```

Flujo de un momento (api-010, con el ámbito privado configurado; bloqueado por P7):

```
visitante → API (api-010) → StripImageMetadataAction (api-008) → disco privado (local | media) en memories/
  → fila en submitted; respuesta sin URL (RN-16)

zoo-admin → GET /api/v1/admin/memories/{id}/image (memories.review + 2FA)
  → StreamReviewMemoryImageAction → lectura del disco privado → binario (sin URL en JSON)
  → dashboard: proxy de mismo origen y blob en memoria (dashboard-008, fuera de esta spec)
```

Principios de diseño:
- **Un solo punto de resolución de disco.** `ResolveMediaDiskAction` es la única pieza que lee los ámbitos de configuración. Las Actions, Form Requests, Resources y Models no nombran discos (CA-02).
- **Escritura antes del commit, borrado después.** El archivo nuevo se escribe antes de abrir la transacción; si la transacción falla, se borra. El archivo anterior o el capturado se borra solo después del commit de base de datos (RN-10).
- **Terminología de commit.** En este plan y en la spec, «commit» tiene dos sentidos. «Commit de base de datos» es el cierre de la transacción de la aplicación. «Commit de git» es el que sube los archivos de `media/` al repositorio. Los comentarios de código y la documentación deben decir cuál de los dos se refiere.
- **La API no devuelve rutas ni URL de lo no aceptado** (RN-05, RN-16). La barrera del ámbito privado es solo de la API (riesgo g del ADR 0026).

## Decisiones de diseño (aprobadas con el plan, 2026-11-13)

- **D-P1 Valores vacíos.** `PUBLIC_MEDIA_DISK`, `PRIVATE_MEDIA_DISK` y `MEDIA_PUBLIC_URL` se leen con la regla de «valor no vacío o valor por defecto». Motivo: `env()` devuelve cadena vacía si la variable existe sin valor (por ejemplo `PUBLIC_MEDIA_DISK=` en `.env`), y una cadena vacía no sería un nombre de disco válido. CA-01 («variables ausentes») se cumple con la misma regla.
- **D-P2 Ámbitos en `config/filesystems.php`.** Los nombres de disco de cada ámbito se declaran en una clave de configuración de ámbitos dentro de `config/filesystems.php` (nombre propuesto: `media_scopes`, con las claves `public` y `private`). Ninguna otra parte del código lee `env()`.
- **D-P3 Resolución única.** `App\Actions\Media\ResolveMediaDiskAction` expone `publicDisk()` y `privateDisk()`. Las Actions de api-008 y las de momentos la usan; no hay constantes de disco en ninguna clase de `app/`.
- **D-P4 Borrado genérico.** `App\Actions\Media\DeleteMediaFileAfterCommitAction` valida la ruta (relativa, sin `..` ni `\`, prefijo permitido, nombre `<uuid>.<ext>`) y borra solo si cumple. Recibe el ámbito (`public` o `private`). `DeleteContentImageAction` (api-008) delega en ella conservando su contrato. Los prefijos permitidos son `news/`, `events/`, `memories/`, `species/` y `species-requests/`.
- **D-P5 Lista de nombres prohibidos (CA-04).** Las pruebas estáticas de `app/Actions`, `app/Http` y `app/Models` fallan si aparece alguno de estos nombres: `Aws`, `AWS`, `S3`, `Amazon`, `Cloudinary`, `Azure`, `GoogleCloud`, `Google\Cloud`, `Backblaze`, `Wasabi`, `DigitalOcean`, `Flysystem`, `temporaryUploadUrl`, `temporaryUrl`, la cadena `'s3'`, y cualquier `env(` fuera de `config/`.
- **D-P6 Imagen de revisión por ruta autenticada.** La respuesta es un flujo de lectura del archivo, sin ruta ni nombre original en cabeceras ni cuerpo. Cabeceras: `Content-Type` derivado de la extensión almacenada (`jpg` → `image/jpeg`, `png` → `image/png`, `webp` → `image/webp`), `Cache-Control: no-store` y `X-Content-Type-Options: nosniff`. La ruta no toma ninguna ruta del cliente: solo el identificador numérico.
- **D-P7 Enlace y versionado.** `public/media` se añade a `apps/api/src/.gitignore` (el enlace no se versiona). No se añade `.gitattributes`: la spec no lo exige.
- **D-P8 Carpetas de especies.** `species/` y `species-requests/` se crean y se versionan en la carpeta compartida por la enmienda de 2026-11-11 (ADR 0026). La spec no las menciona en CA-15, RN-14 ni CA-20. Pregunta 3 resuelta el 2026-11-13: se versionan también para pruebas.

## Cambios por área

| Área/app | Archivos o módulos previstos (ruta prevista, no existe aún salvo lo indicado) | Propósito |
|---|---|---|
| API / configuración | `apps/api/src/config/filesystems.php` (modificar) | Disco `media`, clave de ámbitos (`media_scopes`), enlace `public_path('media')` → `base_path('media')`; se conserva `public_path('storage')` (pregunta 6 de la spec, resuelta). |
| API / entorno | `apps/api/src/.env.example` (modificar) | Claves `PUBLIC_MEDIA_DISK`, `PRIVATE_MEDIA_DISK`, `MEDIA_PUBLIC_URL` con valores de muestra. Sin secretos. |
| API / versionado | `apps/api/src/.gitignore` (modificar: `/public/media`); `apps/api/src/media/.gitignore` (nuevo); `apps/api/src/media/{news,events,memories,species,species-requests}/.gitkeep` (nuevos) | Carpeta compartida y reglas de versionado (CA-15, RN-14). |
| API / Actions compartidas | `apps/api/src/app/Actions/Media/ResolveMediaDiskAction.php`, `apps/api/src/app/Actions/Media/DeleteMediaFileAfterCommitAction.php` (nuevos) | Resolución de disco (D-P3) y borrado seguro tras commit (D-P4). |
| API / Actions de noticias y eventos (ajuste) | `apps/api/src/app/Actions/Admin/Content/StoreContentImageAction.php`, `DeleteContentImageAction.php`, `ResolveContentImageUrlAction.php` (modificar) | Sustituir el literal `'public'` por el ámbito público. Divergencia registrada en `api-008` (T-29 a T-33 de esa spec). |
| API / Actions de momentos (bloqueadas por P7) | Nombres según `api-010`: guardado de la petición (ámbito privado), aceptar y rechazar | Usan `privateDisk()`, `memories/`, limpieza de metadatos y borrado tras commit. |
| API / Actions de revisión (nuevo, propuesto) | `apps/api/src/app/Actions/Admin/Memories/StreamReviewMemoryImageAction.php` | Lectura del archivo en revisión (CA-10). |
| API / HTTP (nuevo, propuesto) | `apps/api/src/app/Http/Controllers/Admin/MemoryImageController.php` | Controlador delgado: identificador → Action → respuesta de lectura. |
| API / rutas | `apps/api/src/routes/api.php` (modificar) | Una ruta `GET /api/v1/admin/memories/{id}/image`, nombre `admin.memories.image`, `whereNumber`, dentro del grupo de administración de `api-010` con 2FA y `permission:memories.review`. |
| API / pruebas | `apps/api/src/tests/Feature/Media/*.php` (nuevos) | Un test por CA (ver «Mapeo de criterios a pruebas»). |
| Documentación | `infra/README.md` (verificar y completar el bloque «Medios de prueba compartidos»); `apps/api/docs/contenido-publico.md` (sección de `image_url`); `apps/api/docs/arquitectura.md` (sección de discos, si describe almacenamiento) | Checklist, flujo del equipo y referencia de la API. |
| Paquetes | Ninguno | `packages/api-client` no cambia en esta spec: la respuesta de revisión es binaria y no añade campos JSON. Si dashboard-008 necesita un método, lo define esa spec. |
| Apps cliente | Ninguna (`dashboard`, `web`, `pwa`, `mobile` sin cambios de código en esta spec) | El consumo lo definen `dashboard-008`, `web-009`, `web-010`, `api-014`, `api-015`. |
| Datos | Ninguno | Sin migraciones, sin DBR nueva, sin SQL (RN-08). |
| Otras specs (divergencia) | `apps/api/plan/008-event-news-images.md`, `apps/api/tasks/008-event-news-images.md` | Anotación de la divergencia y tareas nuevas ligadas (sin cambiar estado ni marcar casillas). |

## Contrato y datos

### Configuración (claves de entorno)

| Clave | Valor por defecto (ausente o vacía) | Carpeta compartida | RN/CA |
|---|---|---|---|
| `PUBLIC_MEDIA_DISK` | `public` | `media` | RN-02, CA-01, CA-14 |
| `PRIVATE_MEDIA_DISK` | `local` | `media` | RN-02, CA-05, CA-14 |
| `MEDIA_PUBLIC_URL` | Vacía: URL del disco (`APP_URL` + `/storage` para `public`; `APP_URL` + `/media` para `media`) | Vacía (`APP_URL` + `/media`) o URL alcanzable | RN-04, CA-03, CA-17 |
| `FILESYSTEM_DISK` | `local` (sin cambio) | sin cambio | CA-01 |

La URL de `MEDIA_PUBLIC_URL` aplica al ámbito público. Regla resuelta el 2026-11-13 (pregunta 1): sustituye la URL de cualquier disco de ese ámbito; si está vacía, cada disco usa su URL.

### Discos y enlaces

- Disco `media`: driver `local`, raíz `apps/api/src/media/` (`base_path('media')`), visibilidad pública, `throw` en `false` como el disco `public` actual.
- Enlaces: `public_path('media')` → `base_path('media')` y `public_path('storage')` → `storage_path('app/public')` (se conserva por compatibilidad del valor por defecto).
- `storage:link` crea `public/media`. El enlace no se versiona.

### Estructura de carpetas y qué se versiona

```
apps/api/src/media/
  .gitignore                 (versionado)
  news/.gitkeep              (versionado; imágenes .jpg/.jpeg/.png/.webp versionadas)
  events/.gitkeep
  memories/.gitkeep          (pendientes, aceptadas y rechazadas en pruebas; ADR 0026, riesgos a, b, c)
  species/.gitkeep           (especies aceptadas; enmienda 2026-11-11)
  species-requests/.gitkeep  (solicitudes pendientes; enmienda 2026-11-11)
```

Reglas de `apps/api/src/media/.gitignore` (intención, verificada con `git check-ignore` en T-04 y T-18):
- En la raíz de `media/` se ignora todo, salvo `.gitignore` y las cinco carpetas.
- Dentro de cada carpeta se ignora todo, salvo `.gitkeep` y los archivos `.jpg`, `.jpeg`, `.png` y `.webp`.
- Git no permite re-incluir un archivo si su carpeta padre está excluida. Por eso la carpeta se des-ignora antes que su contenido.
- Las extensiones en mayúsculas no se versionan. La API escribe las extensiones en minúsculas (se derivan del tipo MIME validado), así que no hay caso práctico.
- El filtro evita archivos accidentales (`.DS_Store`). **No es un filtro de privacidad** (ADR 0026).
- `storage/` queda fuera de `media/` (D-03). Los archivos de `storage/app/private` no están cubiertos por el `.gitignore` de `media/`; su exclusión depende de las reglas de Laravel en `storage/` (ver pregunta 3 y suposiciones).

### Resolución de `image_url`

- **Noticias y eventos (api-008):** solo si la ruta es gestionada (`news/` o `events/` con UUID y extensión válida). URL = URL del disco público. No se comprueba que el archivo exista en cada lectura (flujo 8 de la spec).
- **Momentos aceptados (api-010):** `published_image_path` (DBR-012) → URL del disco público. Antes de aceptar, `image_url` es `null`.
- **Momentos pendientes y rechazados:** `image_url` siempre `null` en cualquier respuesta (RN-05, RN-16).
- **Especies (api-015):** no se resuelven aquí; `api-015` T-09 define su propia comprobación.
- La base de datos guarda rutas relativas; nunca `http`, nombres de disco ni rutas absolutas (RN-03, CA-16).

### Endpoint nuevo

| Método y ruta | Nombre | Middleware y permiso | CA | Respuesta |
|---|---|---|---|---|
| `GET /api/v1/admin/memories/{id}/image` | `admin.memories.image` | `auth:sanctum`, `staff.user`, `administrator.two-factor`, `permission:memories.review` (grupo de `api-010`) | CA-10, RN-06 | 200 binario `image/*`; 403 sin cuerpo; 404 «Petición no encontrada.» (`api-010`) o «La imagen ya no está disponible.» (`api-010` CA-08; pregunta 6 resuelta) |

No se crean otras rutas. `admin.news.*`, `admin.events.*` y `api-010` mantienen sus contratos.

### Validación

No hay Form Requests nuevos en esta spec. Validación de archivo y de texto: `api-008` (imágenes de noticias y eventos: `image`, `mimes:jpg,jpeg,png,webp`, `max:5120`) y `api-010` (momentos). El identificador de la ruta de revisión se valida con `whereNumber`.

### Datos (sin DBR nueva)

- `news.image_path`, `events.image_path`, `deleted_at` (DBR-005, aplicada).
- `visitor_memories`: `image_path`, `published_image_path`, `image_sha256`, `status` (DBR-012, aplicada en `arca_pruebas` el 2026-11-11).
- No hay columnas nuevas, ni columna de disco por fila (RN-08 y spec «Fuera de alcance»).

### Errores y compatibilidad

- Fallo de escritura antes del commit: 5xx, sin registro y sin archivo nuevo (CA-08, RN-10).
- Fallo de borrado después del commit: la respuesta no cambia; se registra un aviso sin ruta absoluta; el archivo queda huérfano (riesgo de la spec).
- Disco público sin URL: `image_url` `null` y registro de error de configuración, sin 500 para el visitante (spec, «Errores previstos»).
- Compatibilidad con la configuración por defecto: `api-008` (CA-13), `api-010` y `api-012` siguen igual (CA-01).
- Cambio de disco en un equipo: las filas que apuntan a `news/...` o `events/...` del disco `public` de otra máquina no se ven hasta que se vuelven a subir (D-04, flujo 8). No hay comando de copia.

## Seguridad, offline y operación

- **Mínimo privilegio.** La ruta de revisión exige `memories.review` y 2FA en servidor. `admin`, `executive`, `cashier` y `veterinarian` reciben 403 sin cuerpo (`api-010` CA-14).
- **Datos personales.** Los momentos pendientes y rechazados son datos personales. Sin URL en ninguna respuesta de la API (CA-05, CA-09, CA-13). El archivo es accesible por `/media/memories/<uuid>.<ext>` si se conoce la URL (riesgo b del ADR 0026, aceptado para pruebas).
- **Secretos.** Ninguno. Configuración solo por `.env`; `.env.example` sin llaves ni URL firmadas (CA-06).
- **Logs y respuestas.** Sin rutas absolutas del sistema de archivos, sin URL firmadas y sin binario en Activitylog ni en respuestas (CA-23). En los avisos técnicos se usa la ruta relativa.
- **Validación de ruta.** `DeleteMediaFileAfterCommitAction` solo borra rutas que cumplen la lista de prefijos y el patrón UUID. La ruta de revisión no acepta rutas del cliente.
- **Metadatos.** Las imágenes nuevas pasan por `StripImageMetadataAction` (`api-008` RN-13), también las de momentos (`api-010` RN-05). Las anteriores se vuelven a subir (D-04).
- **Offline.** No aplica. La API está en línea; la moderación entre equipos depende del `pull` (RN-18).
- **Operación.** `APP_URL` alcanzable, `storage:link` desde `apps/api/src` y la carpeta `media/` con permisos de escritura (checklist de `infra/README.md`). El disco persistente de producción queda fuera de esta spec (pendiente de producción).
- **Portabilidad (ADR 0013, MySQL 8.0.x).** Sin cambios de base de datos. Sin servicio propietario de nube. El disco es el sistema de archivos local de Laravel, configurable por `.env`. Funciona igual con Aiven y con MySQL local.
- **Límites de subida.** 5 MB por imagen (`api-008`). La configuración de PHP y del servidor es parte de `infra/README.md`.
- **Observabilidad.** Avisos técnicos de borrado y de escritura fallida en el log de la aplicación, sin binario y sin ruta absoluta.

## Mapeo de criterios a pruebas

Convención: PHPUnit, carpeta `apps/api/src/tests/Feature/Media/`. Todas las pruebas que usan base de datos extienden la base de pruebas con `DatabaseTransactions` sobre `arca_pruebas`. Prohibido `RefreshDatabase`, `migrate:fresh` y cualquier migración desde los tests. Los archivos se simulan con `Storage::fake(<nombre resuelto por configuración>)`; ninguna prueba escribe en `apps/api/src/media/`, salvo las pruebas de lectura del repositorio (CA-15, CA-19, CA-20, CA-22, CA-24), que solo leen.

**Nota:** la spec no fija nombres de test. Los nombres de esta tabla son propuestos por este plan.

| Criterio | Prueba automatizada (nombre propuesto) | Archivo previsto | Tareas |
|---|---|---|---|
| CA-01 | `test_ca01_defaults_use_public_and_local_scopes_when_env_absent` | `MediaConfigTest.php` | T-01, T-14 |
| CA-02 | `test_ca02_actions_http_and_models_never_name_disk_literals` | `MediaStaticRulesTest.php` | T-05, T-07, T-15 |
| CA-03 | `test_ca03_public_url_comes_from_disk_url_not_app_url` (noticias y eventos; momentos en T-24) | `SharedMediaStorageTest.php` | T-07, T-12, T-16 |
| CA-04 | `test_ca04_domain_has_no_provider_names_or_sdk_calls` (lista de D-P5; incluye RN-07: sin URL de subida directa) | `MediaStaticRulesTest.php` | T-05, T-15 |
| CA-05 | `test_ca05_private_scope_uses_media_memories_and_null_url_when_not_accepted` | `MemoryMediaStorageTest.php` | T-08, T-24 (bloqueada por P7) |
| CA-06 | `test_ca06_env_example_declares_media_keys_without_secrets` | `MediaConfigTest.php` | T-02, T-14 |
| CA-07 | `test_ca07_public_upload_goes_to_scope_disk_with_relative_path` (noticias y eventos) | `SharedMediaStorageTest.php` | T-07, T-16 |
| CA-08 | `test_ca08_write_failure_returns_5xx_and_creates_no_record` (noticias y eventos; momentos en `MemoryMediaStorageTest.php`) | `SharedMediaWriteFailureTest.php`, `MemoryMediaStorageTest.php` | T-07, T-08, T-17, T-24 |
| CA-09 | `test_ca09_private_upload_under_memories_strips_metadata_and_no_url` | `MemoryMediaStorageTest.php` | T-08, T-24 |
| CA-10 | `test_ca10_review_image_is_binary_and_detail_has_no_url`; `test_ca10_review_image_returns_403_without_permission_and_no_body`; `test_ca10_review_image_missing_file_returns_404_in_spanish` | `MemoryReviewImageTest.php` | T-09, T-25 |
| CA-11 | `test_ca11_accept_keeps_file_in_place_and_sets_published_path` | `MemoryDecisionFilesTest.php` | T-10, T-26 |
| CA-12 | `test_ca12_reject_with_image_deletes_file_after_commit`; `test_ca12_reject_content_only_keeps_file`; `test_ca12_delete_failure_rejects_and_logs` | `MemoryDecisionFilesTest.php` | T-06, T-10, T-26 |
| CA-13 | `test_ca13_rejected_has_no_published_path_and_no_image_in_responses` | `MemoryDecisionFilesTest.php` | T-10, T-26 |
| CA-14 | `test_ca14_shared_folder_write_under_news_events_memories` (noticias y eventos ahora; momentos al cerrar T-08) | `SharedMediaStorageTest.php` | T-01, T-04, T-16 |
| CA-15 | `test_ca15_media_gitignore_allows_only_images_and_gitkeep` (ejecuta `git check-ignore` desde la raíz del repositorio) | `MediaGitignoreTest.php` | T-04, T-18 |
| CA-16 | `test_ca16_database_keeps_relative_path_when_url_changes` | `SharedMediaStorageTest.php` | T-07, T-12, T-16 |
| CA-17 | `test_ca17_default_media_url_and_links_include_public_media` | `MediaConfigTest.php` | T-01, T-14 |
| CA-18 | `test_ca18_replace_remove_and_delete_remove_files_after_commit_news_events`; `test_ca18_memory_reject_and_delete_remove_files_after_commit` | `SharedMediaStorageTest.php`, `MemoryDecisionFilesTest.php` | T-06, T-07, T-10, T-16, T-26 |
| CA-19 | `test_ca19_composer_has_no_storage_or_provider_packages` | `MediaComposerTest.php` | T-03, T-19 |
| CA-20 | `test_ca20_infra_readme_has_shared_media_block` (automatizada además de la evidencia manual de la spec) | `MediaDocsTest.php` | T-11, T-20 |
| CA-21 | `test_ca21_smoke_public_image_from_test_environment` (grupo `smoke`; URL solo por variable de entorno; pregunta 2) + evidencia manual entre equipos | `MediaSmokeTest.php` | T-22, T-28 |
| CA-22 | `test_ca22_media_folder_within_100_images_or_100_mb` (parte automatizable: conteo y tamaño) + revisión manual de origen y consentimiento | `MediaLimitsTest.php` | T-21, T-29 |
| CA-23 | `test_ca23_activity_log_and_responses_have_no_secrets_or_absolute_paths` (noticias y eventos; momentos en `MemoryDecisionFilesTest.php`) | `MediaLogSecurityTest.php` | T-06, T-09, T-23 |
| CA-24 | `test_ca24_infra_readme_lists_media_variables_and_storage_link` | `MediaDocsTest.php` | T-11, T-20 |
| CA-25 | `test_ca25_names_every_automated_criterion_and_uses_arca_pruebas` | `ObjectStorageCoverageTest.php` | T-27 |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas (CA-19; el test verifica `composer.json`). Disco local de Laravel, configurable por `.env`. Sin servicio propietario de nube. Sin cambio de base de datos: funciona igual con Aiven y con MySQL local (ADR 0013). La ubicación `apps/api/src/media/` queda cubierta por el ADR 0026. |
| II. La spec manda | Sí | Spec Aprobada (2026-11-12). Plan y tasks aprobados por Jonathan, responsable de backend, en nombre del equipo, el 2026-11-13 (P4), con el mismo NNN-slug. El PR enlazará los tres artefactos. |
| III. Lógica separada de la interfaz | Sí (propuesto) | Resolución de disco, borrado y lectura de la imagen de revisión en Actions. Controlador delgado. Sin lógica en el dashboard: solo presenta lo que devuelve la API (`dashboard-008`). |
| IV. Un test por criterio | Sí (pendiente la evidencia de CI) | Tabla de mapeo con los 25 CA. Los CA de momentos (CA-05, CA-08 parte momentos, CA-09 a CA-13) dependen de `api-010` (P7). CA-21 tiene prueba automatizada en grupo `smoke` (pregunta 2 resuelta el 2026-11-13). CA-20, CA-22 y CA-24 llevan además prueba automatizada propuesta. CA-25 verifica la cobertura. CI en verde: pendiente de evidencia. |
| V. Una sola fuente de verdad para los datos | Excepción aceptada (ADR 0026, solo pruebas) | No se crean tablas ni migraciones (RN-08). La base guarda rutas relativas; los archivos viven fuera de ella. **Excepción:** los momentos (datos personales) se versionan en git solo para pruebas (ADR 0026, riesgo a); aceptada por Jonathan, en nombre del equipo, el 2026-11-13 (P6), solo para datos de prueba en `arca_pruebas`; revisar antes de producción. Las imágenes de noticias, eventos y especies no son datos clínicos ni financieros. Esta spec no crea modelos; los de `api-010` y `api-014` se rigen por sus propios planes (`api-014` tiene la brecha de `BaseModel` registrada en su plan). |
| VI. Código en inglés, personas en español | Sí (propuesto) | Identificadores en inglés (`ResolveMediaDiskAction`, `media`, `memories/`, `admin.memories.image`). Mensajes al personal en español («La imagen ya no está disponible.», de la spec de `api-010`). |

Ninguna excepción se implementa sin acuerdo. La excepción de la Constitución V (P6) está aceptada desde el 2026-11-13 (Jonathan, en nombre del equipo) solo para datos de prueba en `arca_pruebas`. Si se retira, los momentos no se suben a `media/` y solo se implementa lo de noticias, eventos y especies.

## Riesgos y decisiones

### Riesgos técnicos

- **R-01 Valores vacíos en `.env`.** Una variable vacía produce cadena vacía. Mitigación: D-P1 y prueba de CA-01 con variable vacía.
- **R-02 Reglas de `.gitignore` mal ordenadas.** Un archivo puede quedar ignorado sin aviso. Mitigación: des-ignorar carpetas antes que su contenido; prueba automatizada (T-18).
- **R-03 Enlace `public/media` en el servidor.** Si el servidor no sigue enlaces simbólicos o falta `storage:link`, `/media` no responde. Mitigación: checklist de `infra/README.md` y evidencia de `curl` en T-28.
- **R-04 Dobles de almacenamiento y URL.** La URL del disco puede no conservarse en `Storage::fake`. Mitigación: T-16 comprueba la URL con `MEDIA_PUBLIC_URL` fijada en la prueba.
- **R-05 Lógica de borrado duplicada.** `api-008` (`DeleteContentImageAction`), `api-014` (`DeleteManagedSpeciesImageAction`) y `api-010` tendrían borrados similares. Mitigación: D-P4 y recomendación de que `api-014` reutilice `DeleteMediaFileAfterCommitAction`. Decisión del equipo; no obligatoria.
- **R-06 Filas sin archivo.** Una fila que llega antes que el archivo muestra una imagen rota (flujo 8). Tras cambiar a `media`, las filas antiguas apuntan a `news/...` del disco `public` de otra máquina. Mitigación: D-04 (volver a subir) y revisión antes del commit (T-29).
- **R-07 Huérfanos.** Si el borrado falla después del commit, queda un archivo sin registro (CA-12). Sin comando de limpieza en esta spec. Riesgo aceptado (`api-010` CA-12).
- **R-08 Conflictos binarios en git.** Dos equipos que suben a la vez con nombres UUID no colisionan; un conflicto de binario se resuelve eligiendo uno (riesgo h del ADR 0026).
- **R-09 Historial de git.** Lo versionado y después borrado queda en el historial y en los clones (RN-17). Retirada del historial: pregunta 4 de la spec (pendiente de producción).
- **R-10 Acceso por URL a pendientes y rechazados.** Riesgo b del ADR 0026. La API no revela la URL, pero el archivo no tiene control de acceso. La ruta de revisión no lo protege (CA-10).
- **R-11 Dependencia de `api-010`.** Plan y tasks aprobados el 2026-11-13. Las tareas de momentos siguen bloqueadas hasta implementar `api-010` (P7). Mitigación: el resto del plan (noticias, eventos y especies) no depende de ellas.
- **R-12 Ausencia de la clave de `smoke`.** `phpunit.xml` no define el grupo `smoke`. Ver pregunta 2 (resuelta: el grupo se define al implementar T-22).
- **R-13 Tope de peso.** 100 imágenes o 100 MB en `media/` (pregunta 3 resuelta; unidad resuelta el 2026-11-13: pregunta 5, 104 857 600 bytes). La prueba de T-21 hace el conteo; el control humano está en T-29.

### Decisiones aprobadas con el plan (2026-11-13)

- D-P1 a D-P8 (sección «Decisiones de diseño»).
- Cambio de la URL pública de noticias y eventos a `/media` en la carpeta compartida (P5 de `api-008`): aprobado con el plan por Jonathan, responsable de backend, en nombre del equipo, el 2026-11-13 (`api-013` «Decisiones»; tarea T-33 de `api-008`).

### ADR

- ADR requerido para esta entrega: ninguno nuevo. ADR 0026 Aceptado cubre la carpeta `media/` y los riesgos (a), (b), (c), (g), (m). Cualquier dependencia nueva, proveedor de almacenamiento o CDN requiere ADR propio (Constitución I; ADR 0026, «Validación y revisión»).

### Alternativas consideradas

- Disco persistente del servidor (ADR 0026, alternativa 1): se conserva como plan de respaldo para producción.
- Almacenamiento de objetos (`docs/propuestas/almacenamiento-objetos-s3.md`): fuera de alcance; sin CA ni RN en esta spec.
- Binarios en MySQL: descartado (ADR 0026, alternativa 3).
- Subida directa del navegador: descartada (RN-07).

## Suposiciones y preguntas

### Suposiciones

- **S-01 D-04 confirmado.** Volver a subir las imágenes existentes antes de versionarlas lo confirmó Jonathan el 2026-11-10 (ADR 0026) y lo acepta el plan aprobado el 2026-11-13. Este plan lo trata como procedimiento operativo; no bloquea T-01 a T-07, y se confirma antes de la primera subida de imágenes existentes.
- **S-02 D-06 confirmado.** La ruta autenticada con proxy de mismo origen la confirmó Jonathan el 2026-11-10 y la acepta el plan aprobado el 2026-11-13. Este plan implementa la ruta de la API (T-09) según D-06 y deja la parte de dashboard a `dashboard-008`. Si cambia la forma de la ruta, se reabre T-09.
- **S-03 Unidad del tope.** «100 MB» se toma como 100 × 1024 × 1024 bytes (104 857 600). Pregunta 5.
- **S-04 Extensiones contadas.** El conteo del tope incluye `.jpg`, `.jpeg`, `.png` y `.webp`; no incluye `.gitkeep` ni `.gitignore`.
- **S-05 Git disponible.** Las pruebas de CA-15 necesitan `git` y un repositorio completo en el entorno donde se ejecutan. Si no están disponibles, la prueba falla (no se omite).
- **S-06 Mensajes.** El texto del 404 de la imagen es «La imagen ya no está disponible.», el que fija la spec de `api-010` (CA-08).
- **S-07 Almacenamiento de `storage/app/private`.** El ejemplo de CA-15 `storage/app/private/x.jpg` no está en `media/`; se evalúa con las reglas de `storage/` de Laravel, no con `media/.gitignore`.
- **S-08 Nombres de test.** La spec no fija nombres de test; los de este plan son propuestos.
- **S-09 `.gitattributes`.** No se añade (la spec no lo exige).
- **S-10 Imagen de revisión en estados distintos de «En proceso».** Se asume que la ruta sirve la imagen de cualquier petición con archivo presente y estado visible para el personal; ver pregunta 6.

### Preguntas (resueltas el 2026-11-13)

1. **Regla de `MEDIA_PUBLIC_URL` con el disco público por defecto (RN-04 frente a CA-01).** RN-04 dice que `image_url` sale de `MEDIA_PUBLIC_URL` o, si está vacía, de `APP_URL` + `/media`. Con `PUBLIC_MEDIA_DISK=public` (valor por defecto), eso cambiaría la URL de `api-008` (`APP_URL` + `/storage`) y contradiría CA-01. Propuesta: `MEDIA_PUBLIC_URL` sustituye la URL del ámbito público en cualquier disco; si está vacía, cada disco usa su URL (`/storage` para `public`, `/media` para `media`). ¿Se aprueba?
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación.** `MEDIA_PUBLIC_URL` sustituye la URL del ámbito público en cualquier disco; si está vacía, cada disco usa su URL (`/storage` para `public`, `/media` para `media`). Afecta a T-01 y T-14.
2. **Prueba automatizada de CA-21 (grupo `smoke`).** La spec pide un test de humo en el grupo `smoke`, pero `phpunit.xml` no define ese grupo. Además, CA-21 solo tiene evidencia manual en CA-25, lo que no cumple la Constitución IV («al menos un test automatizado por CA»). Propuesta: grupo `smoke` que lee la URL de una variable de entorno local (no versionada), se ejecuta a demanda y no en el CI por defecto, con la evidencia manual en el PR. ¿Se aprueba, o se cambia el CA-25?
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación.** Grupo `smoke` que lee la URL de una variable de entorno local no versionada, se ejecuta a demanda y no en el CI por defecto; la evidencia manual queda en el PR. CA-25 no cambia. Afecta a T-22.
3. **Carpetas de especies en la spec.** `species/` y `species-requests/` están en el ADR 0026 (enmienda 2026-11-11) y en D-02, pero CA-15, RN-14 y CA-20 de la spec solo mencionan `news/`, `events/` y `memories/`. `api-014` (R9) deja pendiente si `species-requests/` se versiona. ¿Se confirma que ambas carpetas se versionan en pruebas y que sus reglas de `.gitignore` se prueban igual que las demás?
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación.** Sí: `species/` y `species-requests/` se versionan en pruebas (enmienda del 2026-11-11 del ADR 0026, aceptada el 2026-11-12), y sus reglas de `.gitignore` se prueban como las demás. Afecta a T-04, T-11 y T-18.
4. **Orden de implementación con `api-010` sin plan.** Las tareas de momentos (T-08 a T-10, T-24 a T-26) dependen de un plan y unas tareas de `api-010` que no existen. ¿Se implementa primero noticias, eventos y especies con su disco, y los momentos después de aprobar el plan de `api-010`?
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación.** Orden: primero `api-013` (disco, `.gitignore`, noticias, eventos y especies) y después los momentos. El plan y las tasks de `api-010` ya están aprobados (2026-11-13); la implementación de los momentos sigue esperando a `api-010`.
5. **Unidad y alcance del tope de CA-22.** ¿«100 MB» son 104 857 600 bytes (MiB) o 100 000 000 bytes? ¿El tope cuenta solo imágenes (`.jpg`, `.jpeg`, `.png`, `.webp`) y solo el árbol de trabajo, no el historial de git?
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación (S-03 y S-04).** «100 MB» = 104 857 600 bytes (100 MiB). El tope cuenta solo las imágenes `.jpg`, `.jpeg`, `.png` y `.webp` del árbol de trabajo de `apps/api/src/media/` (no el historial de git), medidas con el tamaño en disco de esa carpeta. Afecta a T-21 y T-29.
6. **Imagen de revisión (`admin.memories.image`).** ¿La ruta sirve la imagen en cualquier estado, o solo en «En proceso» y en «Enviada»? ¿Qué mensaje 404 se usa si el archivo falta («Imagen no encontrada.» es propuesta)?
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación (S-10 y la spec de `api-010`).** La ruta sirve la imagen en cualquier estado mientras el archivo exista; el dashboard la pide en todos los estados. Si el archivo falta, 404 «La imagen ya no está disponible.», el texto que fija la spec de `api-010` (CA-08); se descarta «Imagen no encontrada.». Afecta a T-09 y T-25.
7. **Borrado de archivos al eliminar la cuenta (`api-010` RN-22, `keep` o `delete`).** CA-18 incluye «se elimina el registro» como motivo de borrado de archivo, pero `api-010` no dice si la opción `delete` de la cuenta borra también el archivo del momento, ni en qué orden. ¿Se borra el archivo al eliminar el momento con `delete`?
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación (plan de `api-010`, T-25).** Sí: con `delete` el archivo se borra después del commit de base de datos; con `keep` no se borra ningún archivo. Su ejecución depende de P9 de `api-010`. Afecta a T-26.
8. **Existencia del archivo al leer (`api-013` flujo 8 frente a `api-015` T-09).** Esta spec dice que la API no comprueba la existencia del archivo en cada lectura; `api-015` T-09 sí la comprueba y devuelve `null` si falta. ¿Cuál regla aplica a las especies? Esta spec no la cambia; la decisión se registra en `api-015`.
   **Resuelta (2026-11-13, Jonathan): se adopta la recomendación de `api-015`.** Para especies, la API comprueba que el archivo existe y devuelve `null` si falta (`api-015` CA-08 y su plan, T-09). Noticias y eventos siguen el flujo 8 de esta spec, sin comprobación en cada lectura. Esta spec no cambia.

## Divergencias registradas

Registradas en esta entrega y pendientes de resolver por el equipo o por la spec correspondiente. Este plan no edita specs.

1. **`api-008` (plan y tasks, anotado en esta entrega).**
   - Nombres de disco: el plan y las Actions de `api-008` usan `Storage::disk('public')`; `api-013` CA-02 exige nombres desde configuración. Resolución: `api-008` T-29 (tareas nuevas de `api-008`).
   - URL pública: `api-008` RN-03 y P5 fijan `APP_URL` + `/storage`; `api-013` D-01 y CA-17 fijan `/media` en la carpeta compartida. El valor por defecto no cambia. Resolución: `api-008` T-33 (decisión formal de P5).
   - Ruta física: `api-008` usa `storage/app/public`; `api-013` D-03 prohíbe `storage/` para estas imágenes en la carpeta compartida. Resolución: `api-008` T-31 y T-32 (documentación).
   - Pruebas: `ContentImageCoverageTest` de `api-008` busca el literal `Storage::fake('public')` en sus tests. Sigue válido con el valor por defecto; si cambia, se actualiza en el mismo cambio. Resolución: `api-008` T-30.
   - Verificación manual: `api-008` T-21 comprueba `storage/app/public/{news,events}`; en la carpeta compartida la comprobación se hace en `media/`. Resolución: `api-008` T-32.
   - Estado: no cambia (`api-008` sigue «en ejecución» y sus casillas no se tocan).
2. **Espacio de medios de especies.** Resuelta (pregunta 3).
3. **`api-013` RN-04 frente a CA-01.** Resuelta (pregunta 1).
4. **Constitución IV frente a CA-21 y CA-25 de la spec.** Resuelta (pregunta 2).
5. **`api-013` flujo 8 frente a `api-015` T-09.** Resuelta (pregunta 8).
6. **`api-014` R9 frente al ADR 0026 (enmienda 2026-11-11).** `api-014` deja pendiente la versión de `species-requests/`; el ADR la acepta para pruebas. Ver pregunta 3.
7. **`api-010` con plan y tasks aprobados (2026-11-13).** Spec Aprobada; implementación pendiente. P7 cumplida. Ver pregunta 4 (resuelta).
8. **`infra/README.md`.** La spec pide quitar la etiqueta de fase y el bloque de almacenamiento de objetos. El árbol de trabajo ya contiene el bloque «Medios de prueba compartidos» (sin commit). T-11 lo verifica y lo completa.
9. **`DBR-012` y `api-010` RN-10/CA-17.** La descripción de discos de DBR-012 ya se alineó (aplicada el 2026-11-11). La excepción de `api-010` RN-10 y CA-17 consta en su nota; no se edita aquí.

## Orden y aprobación

### Secuencia de implementación

1. **Precondiciones (solo lectura).** T-00.
2. **Configuración y versionado.** T-01 (disco, ámbitos, enlaces), T-02 (`.env.example`), T-03 (`composer.json` sin cambios), T-04 (`.gitignore` y carpetas).
   - Al cerrar T-01, T-02 y T-04, se desbloquean P2 de `api-014` y T-09 y T-22 de `api-015`.
3. **Actions compartidas y noticias/eventos.** T-05, T-06, T-07 (con `api-008` sin cambios de contrato).
4. **Pruebas de noticias, eventos y configuración.** T-14 a T-19, T-21, T-23 (parte de noticias y eventos).
5. **Momentos (bloqueado por P7).** T-08, T-09, T-10, después T-24 a T-26.
6. **Documentación.** T-11, T-12, T-13.
7. **Cierre.** T-20, T-22 (si Q2 se resuelve), T-27, T-28, T-29, T-30, T-31.

### Aprobaciones

| Rol | Quién | Estado |
|---|---|---|
| Responsable funcional de la spec | Jonathan (aprobación de la spec, 2026-11-12) | Aprobada |
| Responsable técnico del plan | Jonathan (responsable de backend) | Aprobado: Jonathan, responsable de backend, en nombre del equipo, 2026-11-13 |
| Equipo (solución técnica y Constitution Check) | Equipo | Aprobado: Jonathan, responsable de backend, en nombre del equipo, 2026-11-13 (P4). P6 aceptada en el mismo acto, solo para datos de prueba |
| Responsable de BD | No requerido por esta spec (RN-08); verificación de solo lectura en T-00 | No aplica |
| Confirmación de riesgos del ADR 0026 | Jonathan, 2026-11-12, válido para pruebas | Cumplida (P3, 2026-11-13): aceptación de Jonathan en nombre del equipo; no se exige más |
| Plan y tasks de `api-010` | Responsable de backend | Cumplida el 2026-11-13 (P7) |

Evidencias requeridas al cerrar el plan: salida de solo lectura de T-00, enlace a la aprobación de la spec, confirmación del ADR 0026, respuesta a las preguntas 1 a 8 y enlace al PR con spec, plan y tasks.
