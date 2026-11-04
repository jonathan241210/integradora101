# Plan técnico · 008 · event-news-images

- Spec: `apps/api/specs/008-event-news-images.md`
- Estado de spec: Aprobada (2026-11-02). Este plan no se ejecuta hasta su propia aprobación técnica.
- Estado del plan: Aprobado (2026-11-02, Jonathan, al ordenar implementar el backend).
- Responsable técnico: por identificar (backend).
- Consumidores: `dashboard-004`, mediante `@arca/api-client`; `api-006` (campo `image_url` aditivo en el catálogo público, P7).
- Origen: plan de trabajo aprobado por el usuario el 2026-11-01 (fuera del repositorio). Las decisiones P1 a P8 se aplican tal como las comunicó la sesión principal el mismo día. La eliminación es lógica (`api-007` y DBR-005) y añade el borrado del archivo de imagen (P2). Cambios de ruta y de nombres frente a ese plan están en «Divergencias y correcciones».
- Dependencias de BD: DBR-005 (`deleted_at`) aplicada en el ambiente. DBR-007 (borrado físico) está descartada; no bloquea ninguna tarea.

## Diseño de solución

Se añade la subida de una imagen opcional a las operaciones de alta y edición de noticias y eventos de `api-007`, y el borrado del archivo de imagen a las operaciones de eliminación (P2). La eliminación sigue siendo lógica con `deleted_at`. La subida y el borrado no cambian ninguna tabla ni columna (RN-10).

Flujo de una petición con archivo:

```
cliente (multipart; edición como POST + _method=PATCH) → Form Request (image/mimes/max, remove_image)
  → SaveNewsAction | SaveEventAction (transacción)
      1. StoreContentImageAction: escribe el archivo nuevo en public/{news|events}/ (nombre generado)
      2. Model::save() dentro de DB::transaction (image_path explícito)
      3. si la transacción falla: DeleteContentImageAction borra el archivo nuevo
      4. tras el commit: DeleteContentImageAction borra el archivo anterior (si se reemplazó o se quitó)
      5. Activitylog: image-changed (P6)
  → Resource (image_url)
```

Eliminación:

```
DeleteNewsAction | DeleteEventAction (transacción):
      1. captura la ruta gestionada actual de image_path (si existe)
      2. image_path = null y delete() (SoftDeletes: fija deleted_at)
  → tras el commit: DeleteContentImageAction borra el archivo capturado (P2)
  → Activitylog: deleted
```

El archivo anterior se borra **después** del commit, no antes: si la base de datos falla, el registro conserva su imagen anterior. Los controladores solo reciben la petición, llaman a la Action y devuelven el Resource (Constitución III; `AGENTS.md` de la API).

## Decisiones de diseño

- **Disco y carpetas (RN-03).** Disco `public` de Laravel; carpetas `news/` y `events/`. El nombre es `<uuid>.<ext>`, con la extensión derivada del tipo validado (`jpg`, `png` o `webp`), nunca del nombre original. La ruta guardada es relativa al disco. La URL pública sale del mismo dominio de la API mediante `storage:link` (P5).
- **Control de rutas gestionadas (CA-08, RN-05).** `DeleteContentImageAction` y el cálculo de `image_url` solo actúan sobre rutas que empiezan por `news/` o `events/` y cuyo nombre cumple el patrón `<uuid>.(jpg|png|webp)`. Cualquier otro valor de `image_path` se trata como externo: no se borra nada del disco y `image_url` es `null` (P3). Esta comprobación evita borrar rutas arbitrarias.
- **`image_path` nunca se asigna desde la petición (CA-09).** Los Form Requests no lo aceptan y las Actions lo escriben de forma explícita (no vía `$fillable` desde el request). `remove_image` y el archivo son las únicas entradas que cambian la imagen.
- **Orden de escritura y borrado (RN-04).** Archivo nuevo antes de la transacción, borrado del archivo anterior después del commit, y borrado del archivo nuevo si la transacción falla.
- **Archivo y `remove_image` a la vez (P4, RN-12).** Gana el archivo nuevo. `remove_image` se ignora cuando llega un archivo válido.
- **Edición con archivo (P1).** `POST` multipart con `_method=PATCH` sobre `admin.news.update` y `admin.events.update`. Laravel trata la petición como `PATCH`; la ruta `PATCH` JSON sigue funcionando para cambios sin archivo.
- **Eliminación lógica con borrado de archivo (P2).** `delete()` con SoftDeletes dentro de la transacción, después de poner `image_path` en `null`. El archivo gestionado se borra después del commit a partir de la ruta capturada antes de la transacción. La fila conserva el resto de sus datos con `deleted_at`. La restauración por base de datos no recupera el archivo (riesgo en la spec).
- **Modelos y SoftDeletes (RN-10, Constitución V).** `News` y `Event` conservan el trait `SoftDeletes` (`api-007`). No se cambia ningún modelo ni se requiere migración.
- **Activitylog (CA-12, P6).** Eventos existentes `created`, `updated`, `deleted` del log `admin`, más `image-changed` cuando la imagen se crea, se reemplaza o se quita. Propiedades: como máximo `image_changed` (booleano) y `action` (`set`, `replaced`, `removed`); nunca el binario ni la ruta absoluta.
- **EXIF (P8).** Fuera de alcance: no se reprocesa la imagen. No se añade ninguna librería.
- **Sin dependencias (RN-11).** Se usan `Storage`, `UploadedFile` y las reglas `image`, `mimes` y `max` de Laravel.
- **Pruebas sin archivos reales.** Todas las pruebas usan `Storage::fake('public')` y `UploadedFile::fake()`.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / validación | `app/Http/Requests/Admin/SaveNewsRequest.php`, `app/Http/Requests/Admin/SaveEventRequest.php` (ajuste) | Reglas `image` (nullable), `mimes:jpg,jpeg,png,webp`, `max:5120`; `remove_image` (boolean); `image_path` no aceptado |
| API / Actions | `app/Actions/Admin/Content/StoreContentImageAction.php` (nuevo) | Guardar archivo en `news/` o `events/` y devolver la ruta |
| API / Actions | `app/Actions/Admin/Content/DeleteContentImageAction.php` (nuevo) | Borrar un archivo solo si es ruta gestionada (CA-08) |
| API / Actions | `SaveNewsAction`, `SaveEventAction`, `DeleteNewsAction`, `DeleteEventAction` (ajuste) | Orquestar archivo, transacción, borrado posterior y Activitylog |
| API / Modelos | `app/Models/News.php`, `app/Models/Event.php` (sin cambio) | Conservan `SoftDeletes`; no se toca en la subida ni en la eliminación |
| API / Resources | `EventAdminResource`, `Admin/NewsResource`, `EventResource` (ajuste) | Añadir `image_url` (null sin imagen gestionada) |
| API / HTTP | `NewsController`, `EventController` (ajuste mínimo) | Pasar `$request->file('image')` y `remove_image` a la Action; sin lógica |
| API / rutas | `routes/api.php` (sin cambio de nombres) | Las rutas `admin.news.update` y `admin.events.update` aceptan `PATCH` y `POST` con `_method=PATCH` (P1) |
| API / idioma | `lang/es/validation.php` (ajuste) | Atributos `image` («imagen») y `remove_image`; mensajes de `image`, `mimes` y `max` en español |
| API / pruebas | `tests/Feature/Admin/EventImagesTest.php`, `tests/Feature/Admin/NewsImagesTest.php`, `tests/Feature/Admin/ContentImageCoverageTest.php` (nuevos) | Un test por CA y verificación de cobertura |
| API / documentación | `apps/api/docs/administracion.md` (ajuste) | Sección «Imágenes»: formatos, tamaño, carpetas, `image_url`, borrado del archivo al eliminar, errores y `storage:link` |
| API / otras specs | `apps/api/specs/006-public-catalog-read.md` (nota de vigencia, T-23) | Anotar el campo `image_url` aditivo de `GET /api/v1/events` (P7) |
| Paquetes | `packages/api-client/admin-types.ts`, `packages/api-client/http.ts`, `packages/api-client/admin.ts` (ajuste) | Tipos `image_url`, `image?: File \| null`, `remove_image?: boolean`; envío `FormData` sin `Content-Type` JSON; edición con archivo como `POST` + `_method=PATCH`. Ver divergencia 1 |
| Datos | Ninguno | No hay DBR ni migración (RN-10) |

## Contrato y datos

### Endpoints (sin cambio de nombre; prefijo `/api/v1/admin`)

| Método y ruta | Nombre | Permiso | CA | Respuesta |
|---|---|---|---|---|
| `POST /news` | `admin.news.store` | `news.manage` | 01, 02, 06 | 201; cuerpo JSON o multipart |
| `PATCH /news/{news}` (JSON) o `POST /news/{news}` con `_method=PATCH` (multipart, con o sin archivo) | `admin.news.update` | `news.manage` | 01, 03, 04, 05 | 200 |
| `DELETE /news/{news}` | `admin.news.destroy` | `news.manage` | 07 | 204 |
| `POST /events` | `admin.events.store` | `events.manage` | 01, 02, 06 | 201 |
| `PATCH /events/{event}` (JSON) o `POST /events/{event}` con `_method=PATCH` (multipart) | `admin.events.update` | `events.manage` | 01, 03, 04, 05 | 200 |
| `DELETE /events/{event}` | `admin.events.destroy` | `events.manage` | 07 | 204 |

No se crean endpoints `…/image` (P1 decidida).

### Campos añadidos a la petición

- `image` (archivo, opcional): `nullable`, `image`, `mimes:jpg,jpeg,png,webp`, `max:5120`.
- `remove_image` (booleano, opcional, por defecto `false`). Se ignora si llega `image` válido (P4).
- `image_path`: no se acepta (se ignora, CA-09).

### Campos añadidos a la respuesta

- `image_url` (cadena o `null`) en `news`, `events` (admin) y `events` (público, P7). `image_path` no cambia.

### Errores

- 422 con `errors.image` para tipo o tamaño (CA-02): `{ "message": "…", "errors": { "image": ["…"] } }`.
- 403 sin permiso (CA-10); 404 «Noticia no encontrada.» / «Evento no encontrado.» (`api-007`).
- 5xx si el disco falla al escribir; el registro no se modifica.

### Datos y DBR

- Subida, reemplazo, quitar imagen y eliminación: sin DBR y sin cambio de esquema (RN-10). Columnas usadas: `news.image_path`, `events.image_path` (VARCHAR(255) NULL) y `deleted_at` (DBR-005, aplicada en `arca_pruebas`).
- Eliminación: borrado lógico con `deleted_at` (`api-007`). DBR-007 (borrado físico) descartada el 2026-11-01; no hay migración ni tarea de BD.
- Longitud: `events/` + UUID (36) + extensión cabe holgadamente en 255.
- Precondición de despliegue: DBR-005 aplicada en el ambiente. Sin ella, `GET /api/v1/events` falla por columna inexistente (`apps/api/docs/administracion.md`).

### Compatibilidad

- Las peticiones JSON de `api-007` sin archivo siguen igual.
- `api-006`: el catálogo público añade `image_url`; no hay campos retirados. Impacto anotado (T-23).
- `api-007` no cambia de contrato: su exclusión de subida de imágenes queda reemplazada por esta spec (nota de vigencia añadida).
- Eliminación: `api-007` CA-15 y RN-09 siguen vigentes. Esta spec solo añade el borrado del archivo de imagen (CA-07, P2). El contrato de `DELETE` (204 y 404) no cambia.

## Seguridad, offline y operación

- **Mínimo privilegio.** Permisos de ruta existentes (`news.manage`, `events.manage`) y autorización en servidor. Ocultar el formulario en la interfaz no protege la API.
- **Validación de archivo.** Tipo y tamaño en servidor; el contenido se valida con las reglas de Laravel, no solo con la extensión. No se admiten SVG (pueden contener scripts) ni PDF.
- **Nombres.** Nombre generado, sin nombre original ni rutas enviadas por el cliente; evita path traversal.
- **Borrado acotado.** Solo se borran rutas gestionadas (CA-08).
- **Datos públicos.** Las imágenes son públicas por diseño. Metadatos EXIF: fuera de alcance (P8); riesgo documentado en la spec.
- **Privacidad y auditoría.** Activitylog sin binario ni ruta absoluta (CA-12).
- **Secretos.** Ninguno nuevo. El disco `public` y `APP_URL` se configuran por `.env`.
- **Portabilidad (ADR 0013).** No se usa ninguna función de base de datos ni servicio propietario. El almacenamiento es el disco local de Laravel. Un disco externo (p. ej. S3) requeriría ADR y se decidirá aparte.
- **Operación.** `php artisan storage:link` en cada ambiente (documentado en `administracion.md`). Sin `storage:link`, las URLs no resuelven.
- **Offline.** No aplica: API en línea.
- **Entorno de pruebas.** `arca_pruebas`, `DatabaseTransactions`, `Storage::fake('public')`; sin migraciones ni `RefreshDatabase`; `arca_zoo` nunca se usa.

## Mapeo de criterios a pruebas

Convención: `test_caNN_event_news_images_<descripción>()` en PHPUnit, bajo `apps/api/src/tests/Feature/Admin/`. Como ambas specs tienen CA-01, el nombre incluye el slug para distinguirlas de `dashboard-004`.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | Alta y edición con JPG, PNG y WebP: archivo en `news/` o `events/`, ruta relativa en `image_path`, `image_url` en la respuesta (201/200) | `NewsImagesTest`, `EventImagesTest` |
| CA-02 | GIF, PDF, SVG y archivo de 5 MB + 1 byte → 422 en `errors.image`; sin archivo escrito y registro intacto | `NewsImagesTest`, `EventImagesTest` |
| CA-03 | Reemplazo: el archivo nuevo existe, el anterior se borra y `image_path` cambia; con `remove_image` verdadero a la vez, gana el archivo nuevo | `NewsImagesTest`, `EventImagesTest` |
| CA-04 | `remove_image` sin archivo: archivo borrado, `image_path` e `image_url` en `null` | `NewsImagesTest`, `EventImagesTest` |
| CA-05 | Edición sin archivo ni `remove_image` (y con `remove_image` falso): imagen conservada | `NewsImagesTest`, `EventImagesTest` |
| CA-06 | Alta sin archivo: `image_path` y `image_url` en `null` | `NewsImagesTest`, `EventImagesTest` |
| CA-07 | Eliminación lógica: `assertSoftDeleted` de la fila (`deleted_at` con valor), `image_path` en `null`, archivo borrado tras el commit y 404 en consulta posterior; sin archivo gestionado no se borra nada | `NewsImagesTest`, `EventImagesTest` |
| CA-08 | `image_path` externo (URL o ruta fuera de `news/`/`events/`): no se borra nada del disco; `image_url` es `null` | `EventImagesTest` (caso externo), `NewsImagesTest` |
| CA-09 | `image_path` enviado como texto en alta y edición: se ignora | `NewsImagesTest`, `EventImagesTest` |
| CA-10 | Usuario sin `news.manage` o `events.manage` (p. ej. `executive`): 403 sin escritura ni borrado | `NewsImagesTest`, `EventImagesTest` |
| CA-11 | `image_url` en `GET /api/v1/admin/news`, `GET /api/v1/admin/events` y `GET /api/v1/events` | `NewsImagesTest`, `EventImagesTest` |
| CA-12 | Activitylog: `image-changed` en alta con imagen, reemplazo y quitar; `deleted` en eliminación; sin binario ni ruta absoluta | `EventImagesTest` (`test_ca12_…`), `NewsImagesTest` |
| CA-13 | Cobertura: busca `CA-01` a `CA-12` en los tests de `tests/Feature/Admin/` y verifica `DB_DATABASE=arca_pruebas` | `ContentImageCoverageTest` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí (propuesto) | Sin dependencias nuevas: `Storage` y validación de Laravel 12 sobre PHP 8.4. Configuración solo por `.env`. Sin servicios propietarios; el almacenamiento externo queda fuera y requeriría ADR. |
| II. La spec manda | Sí (cumplido) | `api-008` está Aprobada (2026-11-02) y este plan Aprobado; el PR enlaza spec, plan y tasks. |
| III. Lógica separada de la interfaz | Sí (propuesto) | Validación en Form Requests; archivos, borrados y transacción en Actions; controladores delgados; `dashboard-004` solo envía el archivo y presenta `image_url`. |
| IV. Un test por criterio | Sí (propuesto) | La tabla de pruebas cubre CA-01 a CA-12; `ContentImageCoverageTest` lo verifica (CA-13). |
| V. Una sola fuente de verdad para los datos | Sí (propuesto) | La subida no cambia esquema (RN-10). La base sigue siendo la única fuente de la ruta; el archivo es un recurso del disco referenciado por la base. La eliminación es lógica con SoftDeletes (`api-007`, DBR-005), conforme al verificable de la Constitución V. Sin excepción ni ADR. |
| VI. Código en inglés, personas en español | Sí (propuesto) | Clases, rutas y campos en inglés (`StoreContentImageAction`, `image_url`, `remove_image`, `image-changed`); mensajes de validación y textos en español. |

Ninguna excepción se propone. No se requiere ADR de dependencia ni de excepción a la Constitución V.

## Riesgos y decisiones

- **ADR requerido/aprobado:** ninguno. Un almacenamiento en la nube, un reprocesado de imágenes (P8) o una librería nueva requerirían ADR aprobado antes de implementarse.
- **Imagen tras el borrado lógico (P2):** al eliminar, el archivo se borra y `image_path` queda en `null`. Una restauración de la fila por base de datos no recupera la imagen. Riesgo aceptado como decisión explícita (spec, «Riesgos»).
- **Archivo huérfano tras el commit:** si el borrado del archivo falla después del commit, queda un archivo sin referencia. Decisión pendiente: registrar el fallo en el log o añadir un comando de limpieza de huérfanos.
- **Alternativas y mitigaciones:**
  - Guardar el binario en MySQL: descartado; infla la base de datos y no encaja con el resto del diseño.
  - Almacenamiento externo (S3 u otro): fuera de alcance; requiere ADR. Mitiga el riesgo de disco local en varios servidores.
  - Subida PATCH: resuelta con `POST` + `_method=PATCH` (P1).
  - Límites HTTP: se verifican en el ambiente de despliegue; las pruebas automáticas no los cubren.
  - Archivos huérfanos: escritura antes de la transacción, borrado posterior al commit y limpieza si falla la transacción.

## Divergencias y correcciones respecto del plan aprobado

1. **Ruta del cliente.** El plan aprobado cita `packages/api-client/src/admin.ts`. La ruta real en el repositorio es `packages/api-client/admin.ts` (sin `src/`), igual que `admin-types.ts` y `http.ts`. Este plan usa la ruta real.
2. **Nombres de Actions.** El plan aprobado propone una sola Action (`Admin/StoreContentImageAction`). Este plan separa la escritura (`StoreContentImageAction`) del borrado (`DeleteContentImageAction`) porque el borrado debe aplicar la comprobación de ruta gestionada (CA-08) y se usa desde las cuatro Actions de contenido.
3. **Momento del borrado.** El plan aprobado dice «antes/después del soft delete». Este plan fija el borrado del archivo después del commit, para no perder la imagen si la transacción falla.
4. **Endpoints de imagen.** El plan aprobado admitía una ruta dedicada `…/image`. Por la decisión P1 no se crea; se usa `POST` + `_method=PATCH` en las rutas existentes.
5. **Actions adicionales.** Se añadieron `ResolveContentImageUrlAction` (decide si una ruta es gestionada y construye `image_url`; la expresión de ruta gestionada usa el modificador `D` para rechazar saltos de línea finales) y `ResolveContentImageChangeAction` (decide la ruta final y la acción `set`, `replaced` o `removed` para el log). No estaban en el plan aprobado; evitan duplicar la regla de ruta gestionada (CA-08) y la lógica de cambio en las cuatro Actions de contenido.
6. **Mensajes de validación.** Los mensajes fijos de `mimes` y `max` de archivo («JPG, PNG o WebP», «5 MB») viven en `messages()` de `SaveNewsRequest` y `SaveEventRequest`, no en `lang/es/validation.php` global.

## Preguntas pendientes

Sobre la subida: ninguna. P1 a P8 quedan decididas en la spec («Decisiones tomadas (2026-11-01)»).

Sobre la eliminación: ninguna pregunta abierta. DBR-007 queda descartada y el borrado sigue siendo lógico. Pendiente de decisión no bloqueante: limpieza de archivos huérfanos si falla el borrado del archivo tras el commit (spec, «Riesgos»).

La spec y este plan están aprobados (2026-11-02).

## Orden y aprobación

**Secuencia de implementación (tras aprobar spec y plan):**

1. Aprobar la spec (con P1 a P8 decididas) y este plan con su Constitution Check.
2. Configuración: `lang/es/validation.php`, verificación de `storage:link` y del disco `public`.
3. Actions: `StoreContentImageAction`, `DeleteContentImageAction` y pruebas unitarias de ruta gestionada.
4. Eventos y noticias: Form Requests, Actions, Resources y controladores (CA-01 a CA-11), incluida la eliminación con borrado de archivo (CA-07, CA-12 b; T-04).
5. Activitylog (CA-12).
6. Contrato cliente: `admin-types.ts`, `http.ts` y `admin.ts` (habilita `dashboard-004`).
7. Pruebas (CA-01 a CA-13), documentación `administracion.md` y nota en `api-006` (T-23).
8. Verificación: `php artisan test` en `arca_pruebas`, `./vendor/bin/pint --test` y prueba manual de subida y borrado en disco.

`dashboard-004` puede empezar con el cliente simulado en cuanto el contrato de tipos esté fijado (como `dashboard-003` RN-08).

**Dependencias:** `api-007` (implementada), DBR-005 aplicada en el ambiente, `api-006` (campo aditivo), `dashboard-004`.

**Aprobaciones requeridas:**

| Rol | Aprueba | Estado |
|---|---|---|
| Responsable funcional | Spec (decisiones P1 a P8 registradas) | Aprobado: Jonathan, 2026-11-02 (al ordenar implementar) |
| Equipo | Solución técnica y Constitution Check de este plan | Aprobado: Jonathan, 2026-11-02 (al ordenar implementar) |
| Responsable de BD | Subida y eliminación: no requerido (sin DBR). Confirmar que DBR-005 está aplicada en el ambiente de despliegue | Pendiente |

Evidencias: `apps/api/specs/007-administration-management.md`, `apps/api/plan/007-administration-management.md`, `apps/api/docs/administracion.md`, `docs/database/requests/DBR-005-news-events-soft-deletes.md`, `docs/database/requests/DBR-007-news-events-hard-delete.md` (descartada, solo historial).
