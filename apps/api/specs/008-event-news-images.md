# 008 · event-news-images

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: validación, Actions, almacenamiento y Resources); `packages/api-client` (tipos y envío con archivo); `dashboard` (consumidor, `dashboard-004`); `api-006` (catálogo público de eventos: campo `image_url` aditivo, decidido en P7).
- Estado: En progreso
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: no aplica. Esta feature no requiere DBR (ver «Datos, privacidad y auditoría»).
- Aprobación funcional: aprobada por Jonathan el 2026-11-02.
- Relación con otras specs: complementa `api-007` (reemplaza su exclusión de subida de imágenes) y acompaña a `dashboard-004` (formularios en línea con imagen).
- Revisión 2026-11-06 (aprobada por Jonathan el 2026-11-06): la API quita metadatos y HDR de las imágenes al guardarlas (CA-14, CA-15, RN-13; revierte P8). Ver «Revisión 2026-11-06».
- Nota de vigencia (2026-11-01): la eliminación de noticias y eventos sigue siendo **lógica** (`deleted_at`, DBR-005; `api-007` CA-15 y RN-09 vigentes). Esta spec no reemplaza esas reglas: solo añade el borrado del archivo de imagen al eliminar (CA-07, P2). La subida, el reemplazo y quitar la imagen tampoco requieren DBR adicional. DBR-007 (borrado físico) queda descartada (`docs/database/requests/DBR-007-news-events-hard-delete.md`).

## Problema y contexto

Noticias y eventos tienen desde el esquema inicial una columna `image_path` (VARCHAR(255), NULL), pero la API no permite subir ninguna imagen: `api-007` la dejó fuera de alcance y `image_path` se conserva tal cual. El personal con `news.manage` o `events.manage` necesita acompañar cada noticia o evento con su cartel o foto. Además, al reemplazar o eliminar un registro, el archivo anterior no debe quedar huérfano en el servidor.

Afectados: `admin` y `zoo-admin` (publican y editan), `executive` (solo consulta, sin subida), y visitantes que leen el catálogo público (`api-006`), que recibirán la URL de la imagen como dato adicional.

## Objetivos

- Subir, reemplazar y quitar la imagen de una noticia o de un evento en JPG, PNG o WebP de hasta 5 MB.
- Guardar los archivos en el disco `public` de Laravel y exponer `image_url` en las respuestas.
- Borrar el archivo del disco cuando el registro se elimina o cuando la imagen se reemplaza o se quita.
- Al eliminar una noticia o un evento, borrar su archivo de imagen del disco; el registro se elimina de forma lógica (`api-007`).
- Validar tipo y tamaño en el servidor, con mensajes en español.

## Fuera de alcance

- GitHub Actions, workflows de CI y pruebas automáticas de CI: las atiende otro compañero. No se tocan `.github/workflows` ni la configuración de CI.
- Almacenamiento en la nube u otro proveedor de objetos. Requiere un ADR aprobado (Constitución I) y queda fuera de alcance. Para pruebas compartidas, la carpeta versionada `media/` de `api-013` y el ADR 0026 (Propuesto) (ver «Nota de almacenamiento 2026-11-10»). Opción futura: `docs/propuestas/almacenamiento-objetos-s3.md`.
- Varias imágenes o galería por registro.
- Recorte, redimensionado o generación de miniaturas en el servidor.
- Formatos distintos de JPG, PNG y WebP (GIF, SVG, PDF, HEIC, etc.).
- Carga masiva o migración de imágenes para registros existentes. Tampoco se limpian los metadatos de las imágenes ya guardadas: se limpian al volver a subirlas (Revisión 2026-11-06).
- Restauración de noticias o eventos desde la aplicación: no se incluye en esta spec (`api-007`). Tras el borrado lógico, la fila puede recuperarse por base de datos (`deleted_at`), pero el archivo de imagen borrado no se recupera (ver «Riesgos», P2).
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`. Pueden usar `image_url` cuando lo decidan en su propia spec.
- Aceptar `image_path` como texto editable desde la petición (se ignora, CA-09).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia) | Subir, reemplazar, quitar y eliminar imágenes de noticias y eventos | `news.manage` (noticias), `events.manage` (eventos) |
| `zoo-admin` (Dirección) | Lo mismo que `admin` | `news.manage`, `events.manage` |
| `executive`, `cashier`, `veterinarian` | Sin acceso de escritura; reciben 403 | — |
| Visitante (catálogo público) | Ver la imagen del evento en `GET /api/v1/events` | Pública (`api-006`) |
| Responsable de BD | No requerido por esta feature | — |

Esta feature no crea permisos ni roles nuevos (RN-07).

## Historias de usuario

- Como `admin` o `zoo-admin`, quiero subir una imagen al crear o editar una noticia o un evento, para que el cartel o la foto acompañen la publicación.
- Como `admin` o `zoo-admin`, quiero reemplazar o quitar la imagen, para corregir una publicación sin dejar archivos viejos en el servidor.
- Como administrador, quiero que al eliminar una noticia o un evento se borre también su archivo de imagen, para no acumular archivos sin uso. El registro se oculta por borrado lógico (`api-007`).

## Criterios de aceptación

### Subida y validación

- **CA-01:** Dado un usuario con `news.manage` (noticias) o `events.manage` (eventos) y un archivo JPG, PNG o WebP de hasta 5 MB, cuando crea o edita la noticia o el evento con ese archivo, entonces la API responde 201 (alta) o 200 (edición), guarda el archivo en el disco `public` dentro de `news/` o `events/` con un nombre generado por la API, guarda la ruta relativa en `image_path` y devuelve `image_url` con la URL pública.
- **CA-02:** Dado un archivo que no es JPG, PNG o WebP, o que pesa más de 5 MB, cuando se envía en un alta o en una edición, entonces la API responde 422 con el mensaje en español en `errors.image`, no escribe ningún archivo y no cambia el registro.
- **CA-03:** Dado un registro con imagen, cuando se edita con un archivo nuevo válido, entonces se guarda el archivo nuevo, se borra del disco el archivo anterior y `image_path` e `image_url` apuntan al nuevo. Si la misma petición trae `remove_image` verdadero, gana el archivo nuevo (P4).
- **CA-04:** Dado un registro con imagen, cuando se edita con `remove_image` verdadero y sin archivo nuevo, entonces el archivo se borra del disco y `image_path` e `image_url` quedan en `null`.
- **CA-05:** Dado un registro con imagen, cuando se edita sin archivo y sin `remove_image` (o con `remove_image` falso), entonces `image_path` no cambia y el archivo se conserva.
- **CA-06:** Dado un alta sin archivo, cuando se guarda, entonces el registro se crea con `image_path` y `image_url` en `null`.

### Eliminación

- **CA-07:** Dada una noticia o un evento con imagen gestionada, cuando se elimina, entonces el registro recibe `deleted_at` (borrado lógico, `api-007` CA-15), `image_path` queda en `null`, el archivo se borra del disco después del commit (P2) y el recurso deja de aparecer en las listas de administración y, en eventos, en `GET /api/v1/events`. Una consulta posterior al mismo recurso responde 404 («Noticia no encontrada.» o «Evento no encontrado.»). Sin imagen gestionada, la eliminación no borra ningún archivo.

### Valores externos

- **CA-08:** Dado un `image_path` que no corresponde a un archivo gestionado por esta feature (p. ej. una URL externa o una ruta fuera de `news/` y `events/`), cuando se edita, se quita o se elimina el registro, entonces la API no borra ningún archivo del disco a partir de ese valor y `image_url` es `null` (P3).
- **CA-09:** Dado un cuerpo de petición con el campo `image_path`, cuando se crea o se edita un registro, entonces el valor se ignora y no se guarda; solo la subida de archivo (CA-01) o `remove_image` (CA-04) cambian la imagen.

### Acceso

- **CA-10:** Dado un usuario sin `news.manage` (para noticias) o sin `events.manage` (para eventos), cuando intenta subir, reemplazar, quitar o eliminar una imagen, entonces responde 403 y no escribe ni borra ningún archivo.

### Respuestas

- **CA-11:** Dadas las respuestas de `GET /api/v1/admin/news`, `GET /api/v1/admin/events` y `GET /api/v1/events`, cuando se consultan, entonces cada elemento incluye `image_url` (`null` si no tiene imagen gestionada) además de `image_path`, que se mantiene como hoy. En el catálogo público el campo es aditivo (P7).

### Auditoría y cobertura

- **CA-12:** Dada una acción que crea, reemplaza, quita o elimina una imagen, cuando se registra en Activitylog, entonces: (a) el alta con imagen, el reemplazo y el quitar registran además el evento `image-changed`, junto al `created` o `updated` que corresponda (P6); (b) la eliminación registra `deleted`; y (c) ninguna propiedad registrada incluye el contenido binario del archivo ni la ruta absoluta del disco.
- **CA-13:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test` contra `arca_pruebas`, entonces existe al menos un test que nombra cada CA-01 a CA-12 y que usa `Storage::fake('public')` y `DatabaseTransactions` (sin `RefreshDatabase` ni migraciones desde los tests).

### Metadatos y HDR (revisión 2026-11-06)

- **CA-14:** Dado un JPG, PNG o WebP con metadatos (EXIF con GPS, fecha y modelo; XMP; comentarios; textos) o datos HDR (mapa de ganancia, imágenes adicionales, señalización HDR de PNG), cuando se guarda en una noticia o un evento, entonces el archivo guardado no contiene esos datos, conserva los píxeles comprimidos sin cambios, conserva el perfil de color y, si la orientación no es la normal, conserva solo esa etiqueta.
- **CA-15:** Dado un archivo que pasa la validación de tipo y tamaño pero cuya estructura no se puede procesar (por ejemplo, truncado), cuando se envía, entonces la API responde 422 en `errors.image` con «No se pudo procesar la imagen. Prueba con otro archivo.», no escribe ningún archivo y no guarda el registro.

## Reglas de negocio

- **RN-01 (formatos):** Solo se aceptan JPG (`.jpg`, `.jpeg`), PNG y WebP. La API valida el archivo con las reglas `image` y `mimes` de Laravel; la extensión del nombre original no decide por sí sola.
- **RN-02 (tamaño):** El tamaño máximo es 5 MB (5 120 KB).
- **RN-03 (almacenamiento):** Los archivos se guardan en el disco `public` de Laravel, en las carpetas `news/` y `events/`. El nombre del archivo lo genera la API; el nombre original enviado por el cliente no se usa. En `image_path` se guarda la ruta relativa al disco. La URL pública se construye sobre el mismo dominio de la API mediante `php artisan storage:link` (P5).
- **RN-04 (sin huérfanos):** Al reemplazar, quitar o eliminar, el archivo anterior gestionado por esta feature se borra del disco. Un fallo al guardar el registro no deja un archivo nuevo sin registro.
- **RN-05 (valor externo):** Un `image_path` que no sea una ruta gestionada se trata como ignorado (CA-08 y CA-09).
- **RN-06 (opcional):** La imagen es opcional. Sin imagen, noticias y eventos se crean y editan como hoy; no cambia ninguna regla de texto o fechas de `api-007`.
- **RN-07 (permisos):** Se usan los permisos vigentes `news.manage` y `events.manage`. No se crean permisos ni roles.
- **RN-08 (servidor):** La validación de archivos y la lógica de almacenamiento viven en la API (Form Requests y Actions). El cliente puede avisar del tipo o del tamaño, pero la decisión es del servidor (Constitución III).
- **RN-09 (borrado lógico y archivo, P2):** Eliminar una noticia o un evento aplica el borrado lógico de `api-007` (`deleted_at`; no hay borrado físico). Además, borra su archivo de imagen del disco después del commit y deja `image_path` en `null`. Las cuentas de `users` no cambian (`api-007` CA-08 y RN-09). Esta regla amplía `api-007` CA-15 solo con el borrado del archivo; no altera sus criterios.
- **RN-10 (sin DBR para la subida ni la eliminación):** La subida, el reemplazo, quitar la imagen y la eliminación no crean ni modifican esquema: `image_path` (VARCHAR(255), NULL) y `deleted_at` (DBR-005) ya existen. No requieren DBR ni migración. Sí requieren que DBR-005 esté aplicada en el ambiente de despliegue. DBR-007 queda descartada.
- **RN-11 (dependencias):** No añade dependencias PHP ni JavaScript. Usa el sistema de archivos y `Storage` de Laravel, por lo que no requiere ADR de dependencia.
- **RN-12 (archivo y quitar a la vez):** Si una petición trae un archivo nuevo válido y `remove_image` verdadero, el archivo nuevo sustituye la imagen y `remove_image` se ignora (P4).
- **RN-13 (metadatos y HDR, revisión 2026-11-06):** Antes de guardar, la API recorta del contenedor todo lo que no sea imagen, perfil de color u orientación, sin decodificar ni recomprimir. Lo que no se reconoce se descarta. Si el archivo no se puede procesar, no se guarda nada (CA-15).

## Datos, privacidad y auditoría

- Los datos son imágenes institucionales de noticias y eventos (carteles o fotos). No son datos personales del personal, clínicos ni financieros. Aun así, son archivos subidos por personal, por lo que la validación de tipo y tamaño es obligatoria (RN-01, RN-02).
- Las imágenes son accesibles por URL pública por diseño, porque alimentan el catálogo. Los metadatos de las fotos pueden contener datos sensibles (p. ej. ubicación), por lo que la API los quita al guardar (CA-14, RN-13). El contenido visible de la foto sigue siendo responsabilidad de quien la publica.
- Auditoría: Activitylog registra las operaciones ya definidas en `api-007` CA-26 (`created`, `updated`, `deleted`) y, además, `image-changed` cuando cambia la imagen (CA-12). Las propiedades no incluyen contenido binario ni ruta absoluta.
- Borrado: la fila se marca con `deleted_at` (borrado lógico, `api-007`) y el archivo de imagen se borra del disco. La aplicación no conserva copia del archivo; una restauración de la fila por base de datos no recupera la imagen. Activitylog conserva la acción `deleted` (CA-12 b), sin binario ni ruta absoluta. Clasificación: contenido institucional público, no clínico ni financiero. Constitución V: se cumple con SoftDeletes (ver «Dependencias, riesgos y decisiones»).
- Esquema: la subida y la eliminación no crean ni modifican tablas, columnas ni índices. Las columnas que usa ya existen (`image_path` en `news` y `events`; `deleted_at` por DBR-005).
- Configuración: el disco `public` y el enlace `php artisan storage:link` se configuran por ambiente en `.env`/configuración de Laravel, sin secretos versionados.

## Flujos y errores

1. **Alta con imagen:** el cliente envía los campos y el archivo `image` (opcional). La API valida (CA-01, CA-02), guarda el archivo, guarda el registro y responde 201 con `image_url`.
2. **Edición:** con archivo nuevo, reemplaza (CA-03); con `remove_image`, quita (CA-04); sin ninguno, conserva (CA-05). La edición con archivo se envía como `POST` multipart con `_method=PATCH` (P1). Los cambios que no afectan la imagen funcionan igual que en `api-007`, también por `PATCH` JSON.
3. **Eliminación:** transacción que marca la fila con `deleted_at` (borrado lógico) y deja `image_path` en `null`; tras el commit, borrado del archivo (CA-07, CA-12 b). No requiere DBR adicional.
4. **Errores:**
   - 401 sin sesión (`api-007`).
   - 403 sin permiso de `news.manage` o `events.manage` (CA-10).
   - 404 «Noticia no encontrada.» o «Evento no encontrado.» (`api-007`).
   - 422 en `errors.image` para tipo o tamaño no válidos (CA-02) o archivo que no se puede procesar (CA-15), con mensaje en español.
   - Error del servidor (5xx) si el disco falla al escribir: no se guarda un registro con una ruta que no existe.
5. **Compatibilidad:** las peticiones JSON existentes de `api-007` siguen funcionando sin cambios cuando no llevan archivo.

## Dependencias, riesgos y decisiones

- **Dependencias/ADR:**
  - `api-007` (rutas, permisos, Form Requests, SoftDeletes y Activitylog).
  - DBR-005 (`deleted_at` en `news` y `events`): aplicada en `arca_pruebas`; debe estar aplicada en cada ambiente antes de desplegar este código. Es la base del borrado lógico de noticias y eventos.
  - DBR-007 (borrado físico de noticias y eventos, `docs/database/requests/DBR-007-news-events-hard-delete.md`): **Descartada** el 2026-11-01. El equipo mantiene el borrado lógico por la Constitución V. No bloquea esta spec ni deja tareas pendientes.
  - `api-006` (catálogo público): impacto decidido (P7): `GET /api/v1/events` añade `image_url` como campo nuevo. Es un cambio aditivo; la spec `api-006` se anota cuando esta spec se apruebe (T-23).
  - `dashboard-004` (consumidor de la subida con archivo).
  - ADR: ninguno para esta versión. Un almacenamiento externo o una biblioteca de procesamiento de imágenes requerirían ADR; el recorte de metadatos no añade dependencias (RN-11, RN-13). La eliminación lógica cumple la Constitución V sin excepción. Para la carpeta compartida, ver ADR 0026 (Propuesto, 2026-11-10) y `api-013` (Borrador). Un almacenamiento externo, si se decide, tendría su propio ADR.
- **Decisiones tomadas (2026-11-01, por la sesión principal con la decisión del usuario):**
  - **P1 (ruta de actualización con archivo):** `POST` multipart con `_method=PATCH` sobre las mismas rutas `admin.news.update` y `admin.events.update`. No se crean endpoints `…/image`. Las rutas de `api-007` no cambian de nombre.
  - **P2 (campo tras eliminar, decisión del usuario):** al eliminar se borra el archivo de imagen y `image_path` queda en `null`; el resto de la fila se conserva con `deleted_at` (borrado lógico, DBR-005). Es una decisión explícita, con el riesgo de «Imagen tras el borrado lógico» en «Riesgos».
  - **P3 (valor externo):** `image_url` es `null` si `image_path` no es una ruta gestionada. El valor externo no se devuelve en `image_url`; los Resources siguen devolviendo `image_path` tal cual (CA-11).
  - **P4 (archivo y `remove_image` a la vez):** gana el archivo nuevo; `remove_image` se ignora.
  - **P5 (ruta pública):** mismo dominio de la API mediante `storage:link`. No hay CDN ni dominio distinto por ahora.
  - **P6 (auditoría):** sí, evento propio `image-changed` en Activitylog (CA-12).
  - **P7 (catálogo público):** sí, `image_url` se añade a `GET /api/v1/events`. Impacto: `api-006` gana un campo aditivo; los clientes que ignoran campos desconocidos no se ven afectados. Se anota en `api-006` cuando esta spec se apruebe (T-23).
  - **P8 (EXIF):** *revertida el 2026-11-06.* Decisión original: no quitar metadatos EXIF. Ahora la API los quita (Revisión 2026-11-06).
- **Riesgos:**
  - **Límites de la capa HTTP:** `upload_max_filesize`, `post_max_size` y el límite del servidor web pueden rechazar el archivo antes de llegar a Laravel. En ese caso la respuesta no es el 422 en español de CA-02. Mitigación: configuración de despliegue y prueba manual con un archivo de más de 5 MB.
  - **PATCH con archivo:** PHP no entrega el cuerpo multipart en peticiones PATCH; por eso se usa `POST` con `_method=PATCH` (P1). Los clientes deben usar esa forma para subir archivos.
  - **Disco local en varios servidores:** el disco `public` local no se comparte entre servidores. Si la API corre en más de un nodo, las imágenes no estarían disponibles en todos. Pendiente de decisión de infraestructura (requeriría ADR si se usa almacenamiento externo).
  - **Archivos huérfanos:** si la base de datos falla después de guardar el archivo, el archivo nuevo debe borrarse (plan, decisiones).
  - **Imágenes ya guardadas:** las subidas antes de esta revisión conservan sus metadatos hasta que se vuelvan a subir.
  - **Colores amplios sin gestión:** el perfil de color se conserva; un cliente que lo ignore puede mostrar colores algo distintos. Es el mismo comportamiento que antes de esta revisión.
  - **Espacio en disco:** no hay límite de cantidad de imágenes; el crecimiento se vigila en operación.
  - **Desarrollo local:** sin `storage:link` la URL pública no resuelve.
  - **Imagen tras el borrado lógico (P2):** al eliminar, el archivo se borra y `image_path` queda en `null`. Si BD restaura la fila (`deleted_at = NULL`), la noticia o el evento vuelve sin imagen. Esta pérdida se asume como decisión explícita; recuperar el archivo solo sería posible desde una copia de seguridad del disco, fuera de esta spec.
  - **Archivo tras el commit:** si el borrado del archivo falla después del commit, queda un archivo sin referencia en la base de datos. Decisión pendiente: basta registrar el fallo en el log o se requiere un comando de limpieza de huérfanos.

## Revisión 2026-11-06 (aprobada por Jonathan el 2026-11-06)

Decisión de Jonathan tras revisar una foto de iPhone guardada con sus coordenadas GPS y un mapa de ganancia HDR: quitar metadatos y HDR al guardar.

- **Revierte P8.** Añade CA-14, CA-15 y RN-13. Los CA-01 a CA-13 no cambian.
- **Recorte, no recompresión.** Volver a generar la imagen con GD perdería calidad y el perfil de color. El recorte no añade dependencias ni requiere ADR, DBR ni cambios en clientes.
- **Orientación.** Se conserva esa única etiqueta porque, sin ella, las fotos de teléfono pueden verse giradas.
- **Imágenes existentes.** No se limpian; hay que volver a subirlas.

## Nota de almacenamiento (2026-11-10, decisión del responsable pendiente de aprobación formal del equipo)

Petición del 2026-11-10: las imágenes de noticias y eventos deben verse desde cualquier equipo, no solo desde la máquina donde se subieron. La propuesta está en `api-013` (Borrador) y en el ADR 0026 (Propuesto). La decisión vigente es una carpeta de medios versionada en git (`apps/api/src/media/`, con `news/`, `events/` y `memories/`) para pruebas compartidas. Un almacenamiento de objetos queda como opción futura, sin fecha ni aprobación (`docs/propuestas/almacenamiento-objetos-s3.md`). Esta nota no cambia ningún CA-01 a CA-15 ni el estado de la spec (En progreso).

- **Qué no cambia:** la subida, el reemplazo, quitar la imagen, el borrado, los errores y los CA de esta spec siguen igual. Con la configuración por defecto, la API sigue usando el disco `public` y `Storage::fake('public')` (CA-13) sigue siendo válido.
- **Disco.** Hoy `StoreContentImageAction`, `DeleteContentImageAction` y `ResolveContentImageUrlAction` llaman a `Storage::disk('public')` por nombre. `FILESYSTEM_DISK` no lo cambia. Con `api-013`, el nombre del disco sale de la configuración (`api-013` CA-02) y cada equipo de pruebas lo fija en `.env` con `PUBLIC_MEDIA_DISK=media`. Esa es la forma de cambiar de disco; no se cambia `FILESYSTEM_DISK`. En la carpeta compartida, las imágenes de noticias y eventos no usan `storage/` (`api-013` D-03).
- **Ruta pública (P5).** El cuerpo de P5 (2026-11-01, «mismo dominio mediante `storage:link`») sigue siendo el valor por defecto con `PUBLIC_MEDIA_DISK=public`. Con la decisión del responsable del 2026-11-10 (`api-013` D-01), en la carpeta compartida la URL de noticias y eventos sale de `MEDIA_PUBLIC_URL` o de `APP_URL` más `/media` (carpeta `apps/api/src/media/`, `api-013` CA-17), en vez de `/storage`. El cambio de P5 queda pendiente de aprobación formal del equipo.
- **Riesgo «disco local en varios servidores»:** para pruebas compartidas queda cubierto por la carpeta `media/` (`api-013`) cuando se apruebe. En producción sigue abierto.
- **Imágenes existentes:** las imágenes ya subidas (incluidas las anteriores a la revisión del 2026-11-06) se vuelven a subir desde el dashboard antes de versionarlas (`api-013` D-04; confirmado por Jonathan el 2026-11-10); la nueva subida cambia la ruta de la fila. Las filas anteriores apuntan a `storage/` de la máquina que subió la imagen y no se ven en otros equipos hasta esa nueva subida.
- **Infraestructura:** el checklist de `infra/README.md` describe los medios de prueba (carpeta `media/`, enlace `public/media` con `storage:link`). `storage:link` y el disco persistente del servidor siguen aplicando al disco `public` por defecto y al disco local de desarrollo.
- **Plan y tareas:** `apps/api/plan/008-event-news-images.md` y `apps/api/tasks/008-event-news-images.md` no se actualizan con esta nota. Si se aprueba `api-013`, la divergencia se registra en plan y tasks en el mismo cambio (`docs/05-flujo-sdd.md`, paso 7).

## Revisión

- Aprobadores y fecha: Jonathan (solicitante / responsable funcional), 2026-11-02.
- Evidencia/enlaces: `apps/api/specs/007-administration-management.md`, `apps/api/plan/007-administration-management.md`, `apps/api/docs/administracion.md`, `apps/dashboard/specs/003-administration-sections.md`, `apps/dashboard/specs/004-inline-content-forms.md`, `docs/database/requests/DBR-005-news-events-soft-deletes.md`, `docs/database/requests/DBR-007-news-events-hard-delete.md` (descartada, solo historial).
- Preguntas abiertas: ninguna sobre la eliminación (DBR-007 descartada). La decisión de limpieza de archivos huérfanos (ver «Riesgos») queda pendiente.
- Origen: plan de trabajo aprobado por el usuario el 2026-11-01 (fuera del repositorio), decisiones de P1 a P8 comunicadas por la sesión principal el mismo día, y revisión del borrado el mismo día (decisión del usuario: borrado lógico).
