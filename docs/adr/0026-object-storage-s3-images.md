# 0026 · Almacenamiento de imágenes: carpeta de medios versionada para pruebas compartidas

- Estado: Propuesto (2026-11-10). Decisión del responsable (Jonathan, 2026-11-10), **pendiente de aprobación formal del equipo**. No aprueba la spec, no autoriza dependencias ni implementación. Enmienda del 2026-11-11 (carpetas de especies), también pendiente de aprobación formal.
- Fecha: 2026-11-10. Última enmienda: 2026-11-11.
- Spec relacionada: `apps/api/specs/013-object-storage-images.md` (Borrador). Afecta a `apps/api/specs/008-event-news-images.md`, `apps/api/specs/010-visitor-memory-requests.md`, `apps/api/specs/012-public-memories-read.md`, `apps/api/specs/014-species-requests.md`, `apps/api/specs/015-public-species-read.md`, `apps/dashboard/specs/008-memory-moderation.md`, `apps/dashboard/specs/010-public-content-management.md`, `apps/web/specs/010-dynamic-memories.md`, `apps/web/specs/011-dynamic-tulanpedia.md`, `apps/api/docs/contenido-publico.md` y `docs/database/requests/DBR-012-visitor-memories.md` y `docs/database/requests/DBR-013-species-requests.md`. Relacionado con ADR 0013 y con la Constitución I y V.
- Opción futura, no decidida: `docs/propuestas/almacenamiento-objetos-s3.md`. Esta decisión no la adopta ni la descarta, y no añade fases al plan.

## Contexto

- Las imágenes de noticias y eventos (`apps/api/specs/008-event-news-images.md`, En progreso) se guardan en el disco `public` de Laravel, es decir, en `apps/api/src/storage/app/public`. Se sirven con `php artisan storage:link` y su URL sale de `APP_URL` más `/storage`. La imagen solo existe en el equipo o servidor donde se subió.
- Requisito del 2026-11-10: las imágenes deben verse desde cualquier equipo del equipo de pruebas.
- Para pruebas compartidas se usa una **carpeta de medios versionada en git**: al hacer `pull`, todos reciben los mismos archivos. Las rutas relativas siguen guardadas en la base de datos compartida (Aiven) y la URL se arma al leer, con el disco configurado.
- Hechos verificados en el código (revisión del 2026-11-10):
  - `StoreContentImageAction` (`apps/api/src/app/Actions/Admin/Content/StoreContentImageAction.php`), `DeleteContentImageAction` y `ResolveContentImageUrlAction` son los únicos puntos que nombran el disco (`Storage::disk('public')`). `FILESYSTEM_DISK` no cambia su comportamiento.
  - La base de datos guarda rutas relativas (`news/<uuid>.<jpg|png|webp>`, `events/...`), nunca URLs absolutas.
  - `apps/api/src/config/filesystems.php` define el disco `local` (raíz `storage/app/private`), el disco `public` (raíz `storage/app/public`, URL `APP_URL/storage`) y `links` con `public/storage`.
  - El `.gitignore` de `apps/api/src/storage/app/public/` contiene `*` y `!.gitignore`: hoy nada de esa carpeta se versiona.
  - `apps/api/src/media/` **no existe todavía**. Crearla es parte de la implementación de esta decisión.
  - Las subidas nuevas pasan por `StripImageMetadataAction` (sin EXIF; `api-008`, revisión 2026-11-06). Las imágenes guardadas antes de esa fecha pueden conservar metadatos.
- Momentos para recordar (`apps/api/specs/010-visitor-memory-requests.md`, Borrador): la regla de que una imagen pendiente o rechazada no tenga URL pública (`api-010` RN-10) es un requisito de datos personales. Con esta decisión, **la API no devuelve URL de esas imágenes**, pero el archivo queda en una carpeta que el servidor publica por `/media`. La barrera es de la API, no del almacenamiento: es una excepción registrada en este ADR (riesgo b).
- DBR-012 (`docs/database/requests/DBR-012-visitor-memories.md`, Aprobada y aplicada en `arca_pruebas` el 2026-11-11) describe `image_path` y `published_image_path` como rutas relativas en la carpeta local `media/`. Con esta decisión, ambos viven en `media/`. **Divergencia resuelta:** la DBR se alineó y se aplicó el 2026-11-11; la opción S3/nube sigue como propuesta futura en `docs/propuestas/almacenamiento-objetos-s3.md`.
- Solicitudes de especie (`apps/api/specs/014-species-requests.md`, Borrador): la foto de una solicitud pendiente y la de una especie aceptada necesitan carpetas dentro de `media/`. Ver la enmienda de esta sección.
- ADR 0013 deja el almacenamiento de archivos detrás de discos de Laravel Filesystem. Constitución I: stack declarado, sin nada propietario de la nube en el código. Constitución V: la base de datos es la fuente de verdad y los archivos viven fuera de ella.

## Decisión

### Reglas

1. **Contrato por disco.** Las imágenes se guardan y se leen mediante discos de Laravel Filesystem cuyo nombre sale de la configuración. Ninguna Action, Form Request, Resource ni Model nombra un disco (`api-013` CA-02 y CA-04).
2. **La base de datos guarda solo rutas relativas.** Nunca guarda URLs absolutas, endpoints ni rutas absolutas del sistema de archivos. Así cambiar de disco no toca la base de datos.
3. **Configuración solo por `.env`.** Las variables de cada ambiente viven en `.env`. Ningún secreto ni valor real se versiona.
4. **Dos ámbitos.** Público: noticias, eventos, momentos aceptados y especies aceptadas. Privado: momentos pendientes o rechazados. El ámbito privado nunca tiene URL en ninguna respuesta de la API. Comparte disco y raíz con el público (subcarpeta `memories/`); la barrera es la API. Las fotos pendientes de especie también están sin URL en la API, pero **en pruebas comparten la carpeta publicada** (enmienda de 2026-11-11, riesgo m).
5. **Sin cambio de esquema.** No crea tablas ni columnas. No requiere DBR por el almacenamiento (`api-013` RN-08). Las DBR de datos de cada feature (DBR-012 y DBR-013) siguen siendo necesarias para sus tablas.

### Mecanismo

- Disco nuevo `media` (driver `local`) con raíz `apps/api/src/media/`. Visibilidad pública. URL: `MEDIA_PUBLIC_URL` si tiene valor; si no, `APP_URL` más `/media`.
- Subcarpetas: `news/`, `events/` y `memories/` (momentos para recordar), y, desde la enmienda de 2026-11-11, `species/` y `species-requests/` (ver «Enmienda»). Cada una con un `.gitkeep`.
- `storage:link` crea `public/media` apuntando a `media/`. Se añade ese enlace a `links` de `config/filesystems.php`. El enlace se ignora en git.
- La entrada `public/storage` se conserva en `links` solo por compatibilidad con el valor por defecto (`PUBLIC_MEDIA_DISK=public`, comportamiento actual de `api-008` CA-13 y de un despliegue que no adopte esta carpeta).
- `apps/api/src/media/.gitignore` ignora todo salvo `news/`, `events/`, `memories/`, `species/` y `species-requests/`, y dentro de ellas solo las imágenes `.jpg`, `.jpeg`, `.png`, `.webp` y los `.gitkeep` (`api-013` CA-15). El filtro evita archivos accidentales, como `.DS_Store`; **no es un filtro de privacidad**.
- Cada `.env` de prueba define `PUBLIC_MEDIA_DISK=media` y `PRIVATE_MEDIA_DISK=media`. Sin esas variables, el valor por defecto sigue siendo `public` y `local` (`api-013` CA-01).
- La carpeta `storage/` no se usa para estas imágenes: ni `storage/app/public`, ni `storage/app/private`, ni el enlace `public/storage` para medios.
- Las Actions de imágenes leen el nombre del disco de configuración.

### Flujo del equipo

1. Subir la imagen desde el dashboard (`news.manage` o `events.manage`), recibir un momento enviado desde la app (`api-010`), o recibir una solicitud de especie desde la PWA (`api-014`). El archivo queda en `apps/api/src/media/news/`, `events/`, `memories/`, `species-requests/` o `species/`, con nombre UUID y sin metadatos (`api-008` RN-13, que se aplica también a momentos y a especies).
2. Revisar `git status`. Hacer `git add apps/api/src/media`: el `.gitignore` deja pasar solo lo permitido.
3. Commit con el identificador de la spec en el mensaje (por ejemplo, `api-013: imagen de noticia de prueba`).
4. Los demás hacen `git pull` y arrancan su API con `PUBLIC_MEDIA_DISK=media`, `PRIVATE_MEDIA_DISK=media` y el enlace `public/media` creado.
5. **Moderación entre equipos.** La fila del momento o de la solicitud vive en la base compartida; el archivo llega con el `pull` del commit. Hasta entonces, el dashboard de otro equipo muestra la fila sin imagen (`api-013` flujo 8).
6. Un reemplazo, un borrado o un rechazo borran el archivo de la carpeta. El borrado se confirma con commit igual que la subida (riesgo c).
7. **Imágenes ya subidas.** Se vuelven a subir desde el dashboard antes de versionarlas, para que queden sin metadatos (`api-013` D-04). Cambia la ruta de la fila en la base compartida; es uso normal de la aplicación, no cambio de esquema. No hay comando de copia.

### Reglas de la carpeta compartida

- **Solo datos de prueba.** Nunca visitantes reales, nunca producción ni `arca_zoo`, nunca datos de terceros sin consentimiento. La definición de «dato de prueba» la aprueba el equipo (`api-013` pregunta 3).
- La API nunca devuelve `image_url` de momentos ni de solicitudes de especie pendientes o rechazadas.
- Git no es respaldo ni almacenamiento de producción.
- Límite de 5 MB por imagen (`api-008`). El equipo fija un tope de cantidad antes de empezar (riesgo f).

## Enmienda del 2026-11-11: carpetas de especies

Decisión del usuario (2026-11-11), **pendiente de aprobación formal del equipo**. Se añaden dos subcarpetas a `media/`:

- **`species/`** (público): fotos de especies aceptadas. Se copian aquí al aceptar una solicitud (`api-014` CA-08) y las usa `api-015` para `image_url` (`web-011` las muestra en TulanPedia).
- **`species-requests/`** (solicitudes pendientes): fotos de las solicitudes de especie mientras están en `submitted`. Se borran al rechazar (`api-014` CA-10) y al aceptar, tras copiar a `species/` (`api-014` CA-08; pregunta 7 resuelta con la opción B el 2026-11-11, entorno de pruebas).

**Decisión para pruebas:** `species-requests/` vive en la carpeta `media/`, que el servidor publica por `/media`, igual que `memories/`. La API no devuelve la URL de la foto pendiente (`api-014` CA-06 y RN-04). Esta enmienda no crea un disco privado para especies en pruebas.

**Consecuencia (riesgo m):** una foto pendiente de especie es alcanzable por URL si alguien conoce su nombre (`/media/species-requests/<uuid>.<ext>`). Es el mismo riesgo b de los momentos, aceptado para pruebas con datos de prueba. El UUID no es control de acceso.

**Recomendación antes de producción (2026-11-11):** antes de producción, la carpeta de solicitudes pendientes debe cambiar a una de estas dos opciones, y se configurará entonces (`.env`, `infra/README.md`, y un ADR propio si se adopta la segunda):

- **A. Almacenamiento privado:** sacar `species-requests/` de la carpeta publicada y entregar la foto solo por ruta protegida con `species.review` (o URL firmada de corta duración).
- **B. Otro almacenamiento:** migrar a un almacenamiento de objetos, como describe `docs/propuestas/almacenamiento-objetos-s3.md`.

Esta recomendación se anota también en `api-014` («Recomendación antes de producción»), en `dashboard-010` y en el ADR 0028.

## Por qué requiere ADR

No añade dependencias, así que no aplica la regla de dependencias de la Constitución I. Sí requiere ADR por cinco motivos:

1. **Versionar fotos en git.** Incluye fotos de visitantes, que son datos personales. Choca con el modelo de la Constitución V, que las guarda fuera del historial. Se acepta solo como excepción de pruebas.
2. **Dejar `storage/` sin usar** para estas imágenes. Cambia dónde viven los archivos de contenido que documentan `api-008` y `infra/README.md`.
3. **Publicar `/media` por el servidor.** La carpeta de pendientes queda alcanzable por URL. El ADR asume ese riesgo explícitamente.
4. **Ubicar `media/` dentro de `apps/api/src/`.** `AGENTS.md` dice que `src/` es el único lugar de código. `media/` contiene binarios de contenido, no código. Toda excepción requiere ADR, según `AGENTS.md`.
5. **Aceptar riesgos de privacidad para momentos** en la misma carpeta versionada, con la barrera solo en la API.

La enmienda de 2026-11-11 suma el riesgo de solicitudes de especie pendientes publicadas por `/media` en pruebas (riesgo m).

## Alternativas consideradas

1. **Disco persistente en el servidor de la API.** Mantener `storage/app/public` en un volumen persistente que entre en los respaldos y servir las imágenes desde `APP_URL`. Sin servicio nuevo ni dependencia. Ata las imágenes a un servidor y complica varios nodos y la migración de hosting. **Se conserva como plan de respaldo para producción.**
2. **Seguir con el disco local de cada equipo.** Descartada: no cumple el requisito de visibilidad.
3. **Guardar los binarios en MySQL (BLOB).** Descartada: infla la base administrada (ADR 0013), complica respaldos y exige DBR (Constitución V).
4. **CDN delante del almacenamiento.** Complemento, no alternativa. Requiere su propio ADR si se contrata.
5. **Servicio de medios propietario con transformaciones** (por ejemplo, Cloudinary). Descartada: acopla el dominio a un proveedor y las transformaciones no son necesidad actual (`api-008` excluye miniaturas y recortes).
6. **Carpeta versionada en git para producción.** Descartada: privacidad, peso del historial, sin respaldo ni control de acceso al contenido. Se acepta solo para pruebas compartidas.
7. **Carpeta versionada sin momentos.** Descartada por el responsable el 2026-11-10: obliga a que la moderación de momentos siga atada a una sola máquina.
8. **Ruta autenticada de la API para la imagen de revisión, también en la carpeta.** Se mantiene como lectura de la API (`api-013` CA-10), pero no protege el archivo, que sigue en `media/memories/`. Su valor es que la URL no aparece en las respuestas de la API.
9. **Almacenamiento de objetos compatible con S3, otros proveedores de nube.** No se adoptan con esta decisión. Quedan documentados como opción futura en `docs/propuestas/almacenamiento-objetos-s3.md`. Si alguien decide adoptarlos, requiere un ADR propio.
10. **Disco privado separado para `species-requests/` ya en pruebas (enmienda 2026-11-11).** Descartada para pruebas por decisión del usuario: el ambiente es de pruebas. Queda como recomendación para antes de producción (opción A).

## Consecuencias

### Positivas

- Las imágenes de noticias, eventos, momentos y especies llegan a todo el equipo de pruebas con `git pull`, sin servicio externo, sin coste recurrente y sin dependencias nuevas.
- La moderación de momentos y de solicitudes de especie funciona entre equipos tras `pull`.
- Sin cambio de esquema ni de contratos de respuesta: `image_path` e `image_url` siguen igual.
- La API separa lo no aceptado: ninguna respuesta de un pendiente o rechazado incluye `image_url`.

### Riesgos aceptados (carpeta compartida)

Riesgos aceptados por el responsable para pruebas con compañeros. Requieren confirmación formal del equipo antes de la primera subida de un momento.

- **(a) Privacidad e historial de git.** Las fotos de visitantes pueden incluir terceros o menores. Un momento versionado queda en el historial aunque después se borre o se rechace. Mitigación: usar **solo datos de prueba**; nunca visitantes reales, nunca producción ni `arca_zoo`; y retirar `media/memories/` del repositorio y de su historial antes de cualquier uso fuera de pruebas (`api-013` pregunta 4). Quien tiene acceso al repositorio ve todo lo versionado, incluidos los pendientes.
- **(b) Acceso por URL a pendientes y rechazados.** Los archivos pendientes y rechazados viven en `media/memories/`, que se publica por `/media`. Quien conozca `/media/memories/<uuid>.<ext>` puede verlos. El UUID no es adivinable, pero **no es control de acceso**: la URL puede llegar por un registro, una captura o un compañero. Mitigaciones: la API no devuelve `image_url` de pendientes ni rechazados hasta que estén aceptados (`api-010` RN-10, `api-013` RN-16), y el dashboard de revisión no muestra URL de `/media`. La imagen en revisión llega por una ruta autenticada de la API (`api-013` CA-10), que no protege el archivo, solo evita que la URL aparezca en las respuestas.
- **(c) Rechazadas.** Al rechazar con motivo de imagen, el archivo se borra de `media/memories/` y el borrado se confirma con commit (`api-013` CA-12 y CA-18). **Consecuencia:** el contenido sigue en el historial de git y en cualquier clon que lo haya recibido; el borrado solo impide que aparezca en el árbol actual. Borrar después de rechazar es preferible a conservarlo. Decisión humana: aceptar esta consecuencia.
- **(d) Commit de los momentos.** Si el archivo de un momento no se commitea, los demás ven la fila sin imagen hasta que alguien commitee y hagan `pull`. Regla propuesta: commitear el mismo día (`api-013` pregunta 5).
- **(e) Metadatos.** Las imágenes nuevas llegan sin metadatos (`api-008` RN-13; `api-010` RN-05). Las imágenes anteriores se vuelven a subir antes del commit (`api-013` D-04).
- **(f) Peso del repositorio.** Cada imagen (hasta 5 MB) queda en el historial aunque se borre después. El equipo fija un tope de cantidad (`api-013` pregunta 3).
- **(g) Sin separación de disco.** El ámbito privado comparte disco y raíz con el público. La barrera es la API. Un `.env` mal configurado (por ejemplo, `PRIVATE_MEDIA_DISK` distinto) no tiene barrera de almacenamiento. Decisión humana: aceptar esta consecuencia (`api-013` pregunta 7).
- **(h) Conflictos.** Los nombres UUID evitan colisiones al subir en paralelo. Los binarios no se fusionan: un conflicto de archivo se resuelve eligiendo uno. El conflicto de datos sigue siendo de la base compartida (última escritura).
- **(i) Visibilidad condicionada.** `image_url` se arma al leer con el `APP_URL` de la API que responde (o `MEDIA_PUBLIC_URL`). Una imagen se ve en un equipo solo si la API que consume tiene el archivo en su carpeta, el enlace `public/media` existe y su `APP_URL` es alcanzable desde ese equipo. El portal (`web-009`) usa la base de `arca-api-base`.
- **(j) Filas sin archivo.** La base compartida apunta a rutas. Si la fila llega antes que el commit del archivo, los demás ven una imagen rota hasta el `pull`. Regla: commitear la imagen el mismo día de la subida y avisar al equipo. Aplica también a las filas de imágenes subidas antes de la decisión de volver a subirlas, cuyas rutas apuntan a `storage/` de cada equipo.
- **(k) Configuración incompleta de un equipo.** Un equipo sin `PUBLIC_MEDIA_DISK=media` escribe en `storage/` y la fila apunta a un archivo que los demás no tienen. Mitigación: el checklist de `infra/README.md` y la evidencia del PR.
- **(l) No es producción.** Sin respaldo, sin CDN, sin retirada inmediata de contenido, y quien tiene acceso al repositorio ve las imágenes.
- **(m) Solicitudes de especie pendientes por `/media` (enmienda 2026-11-11).** La foto de una solicitud pendiente de `species-requests/` es alcanzable por URL si se conoce, igual que el riesgo b. Mitigación: la API no devuelve la URL (`api-014` CA-06); datos de prueba; y la recomendación de cambiar antes de producción (opción A o B de la enmienda). Decisión humana: aceptar esta consecuencia para pruebas.

### Constitución (resumen de verificación)

- **I (stack portable):** sin dependencias nuevas. La carpeta `media/` es del sistema de archivos local de Laravel.
- **III (lógica separada):** las reglas de visibilidad viven en la API; el dashboard solo presenta.
- **V (fuente de verdad):** la base guarda rutas; los archivos viven fuera de la base. **Tensión:** versionar datos personales en git no es el modelo previsto para datos de visitantes. Se acepta solo como excepción de pruebas y requiere acuerdo del equipo. No se cambia el principio; se documenta una excepción.

## Decisiones humanas pendientes

Las preguntas completas están en `apps/api/specs/013-object-storage-images.md`, «Preguntas pendientes».

- **Aprobación formal del equipo** de las decisiones D-01 a D-03 y D-05 de `api-013` (carpeta `media/` con subcarpetas, incluidos momentos; no usar `storage/`; excepción de ubicación en `src/`; rechazo según el motivo).
- **Aprobación formal de la enmienda del 2026-11-11** (carpetas `species/` y `species-requests/`, y la decisión de carpeta pública durante pruebas).
- **D-04 (volver a subir las imágenes anteriores):** confirmada por Jonathan el 2026-11-10 según `api-013` D-04.
- **Aceptación explícita de los riesgos (a), (b), (c), (g) y (m)** para pruebas con compañeros, o retirar los momentos y las solicitudes de la carpeta antes de la primera subida.
- **Pregunta 3 de `api-013`:** definición de «dato de prueba» y tope de cantidad de imágenes en git.
- **Pregunta 4 de `api-013`:** procedimiento de retirada del historial antes de producción (no se decide ahora).
- **Pregunta 5 de `api-013`:** quién commitea los momentos recibidos por la API y con qué frecuencia.
- **Pregunta 1 de `api-013`:** ubicación de los datos, si hay requisito de región, para el alojamiento del repositorio.
- **Recomendación de producción (enmienda 2026-11-11):** elegir la opción A (almacenamiento privado) o la opción B (otro almacenamiento) para `species-requests/` antes de producción. No se decide ahora.
- **Aprobador:** quien apruebe el ADR debe quedar identificado en el PR o en el registro del equipo (`docs/05-flujo-sdd.md`, «Aprobaciones»).

## Validación y revisión

- Estado: **Propuesto**. No autoriza ninguna dependencia, ni la implementación de la carpeta `media/`, ni la adopción de la opción futura.
- Aprobación: pendiente del equipo de desarrollo. La decisión del responsable (2026-11-10) y la enmienda del usuario (2026-11-11) no equivalen a aprobación formal.
- Revisión obligatoria: antes de producción (incluida la recomendación de las solicitudes de especie); si el repositorio de la carpeta se hace accesible a más personas de las del equipo; antes de cualquier uso de `media/` con datos que no sean de prueba; si se añade una CDN o un dominio propio de medios; y si se decide adoptar la opción futura de `docs/propuestas/almacenamiento-objetos-s3.md` (requiere ADR propio).
- Enlaces: `apps/api/specs/013-object-storage-images.md`, `apps/api/specs/008-event-news-images.md`, `apps/api/specs/010-visitor-memory-requests.md`, `apps/api/specs/012-public-memories-read.md`, `apps/api/specs/014-species-requests.md`, `apps/api/specs/015-public-species-read.md`, `apps/dashboard/specs/008-memory-moderation.md`, `apps/dashboard/specs/010-public-content-management.md`, `apps/web/specs/010-dynamic-memories.md`, `apps/web/specs/011-dynamic-tulanpedia.md`, `apps/api/docs/contenido-publico.md`, `docs/database/requests/DBR-012-visitor-memories.md`, `docs/database/requests/DBR-013-species-requests.md`, `docs/propuestas/almacenamiento-objetos-s3.md`, `infra/README.md`, `docs/adr/0013-aiven-managed-mysql.md`.
