# Tareas · 008 · event-news-images

- Spec: `apps/api/specs/008-event-news-images.md` (Aprobada, 2026-11-02)
- Plan: `apps/api/plan/008-event-news-images.md` (Aprobado, 2026-11-02); spec En progreso
- Dependencias de BD: DBR-005 aplicada en el ambiente (`deleted_at` en `news` y `events`). `docs/database/requests/DBR-007-news-events-hard-delete.md` está **Descartada** (2026-11-01): el borrado sigue siendo lógico. No bloquea ninguna tarea.
- Estado del checklist: en ejecución; las tareas se marcan al completarse (Constitución II).
- Numeración: T-24 y T-25 se retiraron el 2026-11-01 con la descarte de DBR-007. No se reutilizan ni se renumeran las demás tareas.

Rutas relativas a `apps/api/src` salvo que se diga otra cosa. Los tests usan `DatabaseTransactions` sobre `arca_pruebas` y `Storage::fake('public')`; ninguna tarea crea SQL, migraciones ni usa `RefreshDatabase`. Cada método de test se llama `test_caNN_event_news_images_<descripción>`. Las tareas de `packages/api-client` se verifican desde `apps/dashboard` (ver `dashboard-004`).

Decisiones ya tomadas (2026-11-01) y reflejadas aquí: P1 `POST` + `_method=PATCH`; P2 al eliminar se borra el archivo, `image_path` queda en `null` y la fila se marca con `deleted_at`; P3 `image_url` `null` para valores no gestionados; P4 gana el archivo; P5 mismo dominio vía `storage:link`; P6 evento `image-changed`; P7 `image_url` en catálogo público; P8 sin quitar EXIF (fuera de alcance).

## Base de datos (responsable de BD)

No hay tareas de BD. La subida y la eliminación no requieren DBR ni migración (RN-10). Backend no crea migraciones.

Precondición, no tarea: DBR-005 aplicada en el ambiente (`deleted_at` en `news` y `events`).

## Implementación

### Base común

- [x] **T-01** (CA-02, RN-01, RN-02): En `lang/es/validation.php` añadir el atributo `image` («imagen») y `remove_image`, y los mensajes en español para `image`, `mimes` y `max` (5 120 KB).
- [x] **T-02** (CA-01, CA-02, CA-08, RN-03, RN-04, RN-05): Crear `app/Actions/Admin/Content/StoreContentImageAction.php` (escribe el archivo en `public` dentro de `news/` o `events/` con nombre `<uuid>.<ext>` derivado del tipo validado y devuelve la ruta relativa) y `app/Actions/Admin/Content/DeleteContentImageAction.php` (borra un archivo solo si la ruta es gestionada: prefijo `news/` o `events/` y patrón `<uuid>.(jpg|png|webp)`; cualquier otro valor se ignora). Incluir el cálculo de `image_url`: `null` si la ruta no es gestionada (P3).

### Noticias y eventos

- [x] **T-03** (CA-01, CA-03, CA-04, CA-05, CA-06, CA-09, RN-04, RN-06, RN-08, RN-12): Ajustar `SaveNewsRequest` y `SaveEventRequest` (reglas `image` nullable, `mimes:jpg,jpeg,png,webp`, `max:5120`; `remove_image` boolean; `image_path` no aceptado). Ajustar `SaveNewsAction` y `SaveEventAction`: archivo nuevo antes de la transacción; `save()` dentro de `DB::transaction`; si la transacción falla, borrar el archivo nuevo; tras el commit, borrar el anterior cuando se reemplaza o se quita; con archivo válido, `remove_image` se ignora (P4); asignar `image_path` de forma explícita.
- [x] **T-04** (CA-07, CA-08, RN-04, RN-09, P2): Ajustar `DeleteNewsAction` y `DeleteEventAction`: capturar la ruta de `image_path` antes de la transacción; dentro de `DB::transaction`, poner `image_path` en `null` y ejecutar `delete()` (borrado lógico con SoftDeletes, que fija `deleted_at`); tras el commit, borrar el archivo capturado con `DeleteContentImageAction` (solo si es ruta gestionada, CA-08). No se usa `forceDelete()`. Sin DBR ni migración.
- [x] **T-05** (CA-10, RN-07): Verificar que las rutas de subida, reemplazo, quitar y eliminación de noticias y eventos usan solo `news.manage` y `events.manage` (middleware `permission` existente) y que `SaveNewsAction`/`SaveEventAction` no escriben nada si la autorización falla. No se crean permisos ni roles.
- [x] **T-06** (CA-11): Ajustar `EventAdminResource`, `Admin/NewsResource` y `EventResource` (catálogo público) para incluir `image_url` (null sin imagen gestionada). `image_path` no cambia.
- [x] **T-07** (CA-01, CA-03, CA-09, RN-08): Ajustar `NewsController` y `EventController` para pasar `$request->file('image')` y `remove_image` a la Action (sin lógica en el controlador). Las rutas `admin.news.update` y `admin.events.update` aceptan `PATCH` (JSON) y `POST` con `_method=PATCH` (multipart) según P1; no se crean rutas `…/image`.
- [x] **T-08** (CA-12, RN-08): Registrar en Activitylog `image-changed` (con `action`: `set`, `replaced` o `removed`, e `image_changed` booleano) junto a `created`/`updated`, y `deleted` en la eliminación; revisar `LogAdminActivityAction` para que ninguna propiedad incluya el binario ni la ruta absoluta del disco.

### Documentación

- [x] **T-09** (RN-03, RN-10): Actualizar `apps/api/docs/administracion.md` con una sección «Imágenes» (formatos, tamaño máximo, carpetas `news/` y `events/`, `image_url`, `POST` + `_method=PATCH` para subir archivos, errores 422 en `errors.image`, borrado del archivo de imagen al eliminar (P2) con la nota de que una restauración de la fila no recupera la imagen, y `php artisan storage:link` en cada ambiente). Mantener la sección «Borrado lógico (DBR-005)». Sin secretos.
- [x] **T-23** (CA-11): Anotar en `apps/api/specs/006-public-catalog-read.md` una nota de vigencia: `GET /api/v1/events` añade `image_url` como campo aditivo (P7). Sin cambiar criterios de `api-006`. Se hace cuando esta spec esté aprobada.

### Contrato del cliente (consumido por `dashboard-004`)

- [x] **T-10** (CA-01, CA-11): Ajustar `packages/api-client/admin-types.ts` (`image_url`, `image?: File | null`, `remove_image?: boolean` en `NewsInput` y `EventInput`), `packages/api-client/http.ts` (envío `FormData` sin `Content-Type` JSON) y `packages/api-client/admin.ts` (helper `content` que envía `FormData` cuando hay archivo y usa `POST` con `_method=PATCH` para editar con archivo). Ruta real: `packages/api-client/admin.ts` (sin `src/`). Verificación en `apps/dashboard/src/tests/api-client-admin.test.tsx` (ver T-22 de `dashboard-004`).

## Pruebas (un test por CA)

- [x] **T-11** (CA-01): `tests/Feature/Admin/NewsImagesTest.php` y `EventImagesTest.php`: alta y edición con JPG, PNG y WebP; archivo en `news/` o `events/`; `image_path` relativo; `image_url` en la respuesta (201/200).
- [x] **T-12** (CA-02): Mismos archivos: GIF, PDF, SVG y archivo de 5 MB + 1 byte → 422 con `errors.image`; sin archivo escrito; registro sin cambios.
- [x] **T-13** (CA-03, CA-04, CA-05, CA-06): Reemplazo borra el anterior; con `remove_image` verdadero y archivo nuevo a la vez, gana el archivo; `remove_image` sin archivo borra y deja `null`; edición sin archivo conserva la imagen; alta sin archivo deja `null`.
- [x] **T-14** (CA-07): Eliminación lógica: `assertSoftDeleted` de la fila (`deleted_at` con valor), `image_path` en `null`, archivo borrado del disco tras el commit y 404 en una consulta posterior; sin imagen gestionada no se borra ningún archivo. Requiere T-04.
- [x] **T-15** (CA-08, CA-09): `image_path` externo (URL o ruta fuera de `news/`/`events/`): no se borra nada del disco y `image_url` es `null`; `image_path` enviado como texto se ignora.
- [x] **T-16** (CA-10): `executive` y usuarios sin el permiso de contenido → 403 en subida, reemplazo, quitar y eliminar; sin escritura ni borrado.
- [x] **T-17** (CA-11): `image_url` en `GET /api/v1/admin/news`, `GET /api/v1/admin/events` y `GET /api/v1/events`.
- [x] **T-18** (CA-12): Activitylog: `image-changed` en alta con imagen, reemplazo y quitar; `deleted` en eliminación; sin binario ni ruta absoluta.
- [x] **T-19** (CA-13): `tests/Feature/Admin/ContentImageCoverageTest.php`: busca `CA-01` a `CA-12` (con el slug `event-news-images`) en `tests/Feature/Admin/` y verifica `DB_DATABASE=arca_pruebas`. Depende de que existan T-11 a T-18.

## Calidad y entrega

- [x] **T-20**: Desde `apps/api/src` ejecutar `php artisan test --filter=Images`, la suite `Admin` completa y la suite completa para confirmar que `api-006` y `api-007` siguen en verde; ejecutar `./vendor/bin/pint --test`. Registrar resultados en el PR. Sin ejecutar nada en `arca_zoo`. Suite Admin + Catalog: 82 passed (2026-11-02).
- [ ] **T-21** (CA-01, CA-07, RN-03): Verificación manual en un ambiente local con `storage:link`: subir, reemplazar, quitar y eliminar; comprobar en `storage/app/public/{news,events}` que el archivo aparece y desaparece. Probar un archivo mayor de 5 MB para confirmar el comportamiento de los límites HTTP (riesgo de la spec). Evidencia en el PR.
  - Evidencia parcial (2026-11-06): Jonathan informó que probó subir y gestionar imágenes. Al reemplazar la imagen de la noticia 15, el archivo anterior desapareció de `storage/app/public/news`; el nuevo quedó sin EXIF, XMP ni mapa de ganancia, con perfil ICC, y Jonathan confirmó que se ve bien. **Sigue abierta:** la foto HEIF de 6.1 MB llegó a la API como JPEG de 400 KB, así que no comprueba los límites; falta probar un JPG real de más de 5 MB. En este equipo PHP tiene `upload_max_filesize=2M`.
- [ ] **T-22**: Completar el Constitution Check del PR, enlazar spec, plan y tasks, citar `api-008` en los commits y pasar la spec a Implementada solo cuando CA-01 a CA-13 estén verificados con evidencia y exista aprobación funcional.

## Revisión 2026-11-06: metadatos y HDR

- [x] **T-26** (CA-14, CA-15; RN-13): `app/Actions/Admin/Content/StripImageMetadataAction.php` recorta JPG, PNG y WebP. `StoreContentImageAction` guarda el resultado.
- [x] **T-27** (CA-14, CA-15): `tests/Feature/Admin/ContentImageMetadataTest.php`: los tres formatos, eventos, orientación normal y archivo truncado.
- [x] **T-28** (RN-13): actualizar `apps/api/docs/administracion.md`.

## Trazabilidad

- CA-01 → T-02, T-03, T-07, T-10 (implementación); T-11 (prueba).
- CA-02 → T-01, T-03 (implementación); T-12 (prueba).
- CA-03, CA-04, CA-05, CA-06 → T-03 (implementación); T-13 (prueba).
- CA-07 → T-04 (implementación); T-14 (prueba).
- CA-08 → T-02, T-04 (implementación); T-15 (prueba).
- CA-09 → T-03 (implementación); T-15 (prueba).
- CA-10 → T-05 (implementación); T-16 (prueba).
- CA-11 → T-06, T-10, T-23 (implementación); T-17 (prueba).
- CA-12 → T-08 (implementación); T-18 (prueba).
- CA-13 → T-19 (prueba de cobertura); T-20 (ejecución).
- CA-14, CA-15 → T-26 (implementación); T-27 (prueba).
- RN-01 a RN-12: T-01, T-02, T-03, T-04, T-05, T-07, T-09 y T-10 según corresponda. RN-10: ninguna tarea crea migraciones.
- RN-09 (P2): T-04 (implementación); T-14 y T-18 (prueba).

Orden por dependencias: T-01 → T-02 → T-03, T-04, T-05 → T-06, T-07, T-08 → T-10 (contrato cliente, en paralelo con T-11 a T-18) → T-11 a T-18 → T-19 → T-09, T-23 → T-20 → T-21 → T-22. Sin bloqueos externos de BD: solo DBR-005 aplicada en el ambiente.
