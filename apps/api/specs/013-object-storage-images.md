# 013 · object-storage-images

- App dueña: `api`
- Apps/paquetes afectados: `api` (dueña: discos, Actions, construcción de URLs, ruta autenticada de revisión y pruebas); `dashboard` (consumidor de la imagen de revisión en `dashboard-008`); `web` (consumidor de URLs públicas en `web-009` y `web-010`; esta spec no le pide cambios de código); `mobile` (sin cambios; envía al API, `mobile-010`); `packages/api-client` (solo si la respuesta de revisión añade un campo; sin lógica de negocio); `infra/README.md` (checklist de despliegue y de medios de prueba); `apps/api/docs/contenido-publico.md` (referencia de `image_url`).
- Alcance: las imágenes de noticias, eventos y momentos se guardan en la carpeta versionada `apps/api/src/media/` (subcarpetas `news/`, `events/` y `memories/`), para pruebas compartidas. Sin servicio externo ni dependencias nuevas.
- Opción futura: `docs/propuestas/almacenamiento-objetos-s3.md`. Propuesta no implementada ni aprobada. No es una fase de esta spec y no tiene CA ni RN aquí.
- Estado: Aprobada (2026-11-12, Jonathan, responsable de backend). Aprobar no autoriza implementar: la implementación empieza cuando existan plan y tasks aprobados. DBR-012 está Lista para backend (aplicada en `arca_pruebas` el 2026-11-11). ADR 0026 y ADR 0027 están Aceptados (2026-11-12).
- Solicitante / responsable funcional: Jonathan (decisión del responsable del 2026-11-10; confirmada con la aprobación del 2026-11-12).
- Responsable de BD: no requerido por el almacenamiento (RN-08). La tabla de momentos ya tiene DBR-012 aprobada, aplicada en `arca_pruebas` el 2026-11-11 y en estado Lista para backend; su descripción de discos se alineó con la carpeta local `media/`.
- Responsable backend: Jonathan.
- Aprobación funcional: Jonathan (responsable de backend), 2026-11-12. Aprueba el alcance de D-01, D-02, D-03 y D-05 y el tope de CA-22; ver «Revisión».
- Aprobado por: Jonathan (responsable de backend), 2026-11-12.
- Dependencias de decisión: `docs/adr/0026-object-storage-s3-images.md` (Aceptado 2026-11-12). No añade dependencias.

## Problema y contexto

Las imágenes de noticias y eventos (`api-008`, En progreso) se guardan en el disco `public` de Laravel y su URL sale de `APP_URL` más `/storage`. El archivo existe solo en el equipo o servidor donde se subió. Un visitante o un miembro del personal en otro equipo no puede verla. El requisito del 2026-11-10 es que las imágenes se vean desde cualquier equipo de pruebas.

Esta spec guarda las imágenes en una carpeta versionada en git (`apps/api/src/media/`). Al hacer `pull`, todos los equipos de pruebas reciben los mismos archivos. La base de datos compartida sigue guardando rutas relativas, y la URL se arma por el disco configurado.

Las peticiones de «Momentos para recordar» (`api-010`, Aprobada el 2026-11-12) tienen además imágenes pendientes, aceptadas o rechazadas que son datos personales de visitantes. La decisión del 2026-11-10 las pone en la misma carpeta versionada (subcarpeta `memories/`), para que la moderación funcione entre equipos de pruebas. Esto acepta riesgos de privacidad que quedan documentados en el ADR 0026 y en esta spec. La API nunca devuelve URL de esas imágenes mientras no estén aceptadas (`api-010` RN-10, RN-16 de esta spec).

Hallazgos del análisis que motivan la spec:

- `FILESYSTEM_DISK` no basta. `api-008` llama a `Storage::disk('public')` por nombre en `StoreContentImageAction`, `DeleteContentImageAction` y `ResolveContentImageUrlAction`. El disco por defecto no se usa para estos archivos.
- La carpeta `apps/api/src/storage/app/public` tiene un `.gitignore` con `*`: nada se versiona. Por eso se necesita una carpeta propia (`apps/api/src/media/`), que hoy no existe.
- DBR-012 describe `image_path` como ruta relativa en la carpeta local `apps/api/src/media/`; ya se alineó con esta spec y se aplicó en `arca_pruebas` el 2026-11-11. No queda divergencia de disco.

## Decisiones tomadas (2026-11-10)

Decisión del responsable (Jonathan, 2026-11-10). **Aprobadas por Jonathan el 2026-11-12: D-01, D-02, D-03 y D-05.** D-04 y D-06 ya estaban confirmadas por Jonathan el 2026-11-10, pero no constan en la aprobación del 2026-11-12: quedan pendientes de confirmación expresa (ver «Revisión»). La numeración D-xx de esta sección no sustituye a los CA ni a las RN.

- **D-01 (ubicación y mecanismo):** el disco `media` (driver `local`) tiene raíz `apps/api/src/media/` y URL `MEDIA_PUBLIC_URL` o, si está vacía, `APP_URL` más `/media`. Se acepta la excepción de ubicar `media/` dentro de `apps/api/src/` (ADR 0026, «Por qué requiere ADR»).
- **D-02 (momentos en la carpeta versionada):** dentro de `media/` hay subcarpetas separadas para control del equipo: `news/`, `events/` y `memories/` (Momentos para recordar). **Enmienda del 2026-11-11 (ADR 0026):** se añaden `species/` (especies aceptadas, pública; `api-015`) y `species-requests/` (solicitudes de especie pendientes; `api-014`), ambas dentro de la carpeta publicada en pruebas. Esta spec no cambia sus CA ni RN; la carpeta de solicitudes pendientes queda pendiente de la recomendación de producción de `api-014`. Todo el contenido de `media/` se versiona. Los riesgos de versionar momentos se aceptan y están descritos en el ADR 0026 (riesgos a a l) y en esta spec (RN-14 a RN-18). El uso queda limitado a datos de prueba (CA-22). **Ámbito privado (pregunta 7, resuelta el 2026-11-12):** el ámbito privado comparte disco `media` y raíz con el público; la barrera es solo de la API (RN-05; riesgo g del ADR 0026).
- **D-03 (sin `storage/`):** la carpeta compartida no usa `storage/` para estas imágenes: ni `storage/app/public`, ni el enlace `public/storage`, ni el disco privado `local` (`storage/app/private`) para momentos pendientes o rechazados. Todo pasa a `media/`. Los valores por defecto (`PUBLIC_MEDIA_DISK=public`, `PRIVATE_MEDIA_DISK=local`) se mantienen sin cambio para instalaciones que no adopten la carpeta compartida (CA-01).
- **D-04 (imágenes ya subidas):** confirmado por Jonathan (2026-11-10): se vuelven a subir **todas** las imágenes de noticias y eventos desde el dashboard antes de versionarlas, para que queden sin metadatos (`api-008` RN-13). Cambia la ruta de la fila en la base compartida; es uso normal de la aplicación, no cambio de esquema. No hay comando de copia.
- **D-05 (rechazo y archivo según el motivo):** al rechazar, el archivo privado se borra solo si el motivo incluye `image`. Si el motivo es solo `content`, el archivo se conserva para que el visitante corrija la opinión y reenvíe (`api-010` CA-27, CA-29, RN-19). Aprobado por Jonathan el 2026-11-12 (pregunta 4 de `api-010`). El archivo que se conserva o se borra está en la misma raíz `media/` que el público (D-02, pregunta 7 resuelta el 2026-11-12).
- **D-06 (revisión de la imagen):** el dashboard recibe la imagen de revisión por la ruta autenticada de la API (`admin.memories.image`), con proxy de mismo origen y como blob en memoria. No hay CORS para esa ruta. (Antes pregunta 11; resuelta por Jonathan el 2026-11-10.)

Consecuencia de D-04: las filas anteriores a la carpeta compartida apuntan a `news/...` o `events/...` del disco `public` de la máquina que las subió. Hasta que se vuelvan a subir, los demás equipos ven esas imágenes rotas (flujo 8).

## Objetivos

- Que las noticias, los eventos y los momentos con imagen se vean igual en todos los equipos de pruebas después de `git pull`, sin contratar servicios.
- Que la moderación de momentos funcione entre equipos de pruebas tras `pull`, sin revelar la URL de una imagen pendiente o rechazada en ninguna respuesta de la API.
- Que las imágenes se guarden y se sirvan desde el disco configurado, de modo que el disco se pueda cambiar sin tocar código de dominio ni la base de datos.
- Que la base de datos nunca guarde URLs absolutas, nombres de disco ni rutas absolutas.
- Que, con la configuración por defecto, los CA de `api-008`, `api-010` y `api-012` sigan cumpliéndose sin cambios.

## Fuera de alcance

- Cualquier servicio externo de almacenamiento de objetos. Es una opción futura documentada en `docs/propuestas/almacenamiento-objetos-s3.md`, sin CA ni RN en esta spec. Si alguien decide adoptarla, requiere su propio ADR, su spec y su plan.
- Versionar imágenes con datos reales de visitantes, de usuarios de producción o de `arca_zoo`. Solo datos de prueba (CA-22).
- Comando de copia de medios (D-04).
- Reescribir el historial de git para retirar medios. Es una decisión posterior, antes de producción (pregunta 4).
- CDN, dominio propio de medios, miniaturas, recortes o transformaciones.
- Subida directa del navegador al almacenamiento. La API sigue recibiendo el archivo y validándolo (`api-008` RN-08).
- Respaldo o copia de los archivos fuera del repositorio (pregunta 2).
- Columnas nuevas, incluida una columna de disco por fila. Cualquier cambio de esquema requiere DBR (RN-08).
- Borrado físico de filas. Se mantiene SoftDeletes (Constitución V).
- Cambios en las reglas de visibilidad de `api-010`, `api-011` o `api-012`, salvo las excepciones de la carpeta compartida registradas en sus notas.
- Migrar la base de datos de Aiven a MySQL local. Es independiente de esta spec; ver ADR 0026. No requiere DBR nueva.
- Cambios de código en `apps/web`, `apps/mobile` y `apps/pwa`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante anónimo | Ver imágenes públicas de noticias, eventos y momentos aceptados | Ninguno; URL pública de `media/` |
| Visitante con cuenta (app) | Enviar un momento; no ve la URL de su imagen | Sesión de visitante (`api-010`) |
| `admin`, `zoo-admin` | Subir, reemplazar y quitar imágenes de noticias y eventos (sin cambio) | `news.manage`, `events.manage` (`api-008`) |
| Equipo de desarrollo y pruebas | Subir imágenes desde el dashboard o recibir momentos desde la app; revisar, hacer commit y `pull` | Acceso de escritura al repositorio; permisos de la app para cada acción |
| `zoo-admin` | Ver la imagen de una petición en revisión (ruta autenticada, sin URL) | `memories.review` y 2FA (`api-010` CA-08) |
| `admin`, `executive`, `cashier`, `veterinarian` | Sin acceso a imágenes privadas | — (`api-010` CA-14) |
| Responsable de BD | No requerido por el almacenamiento | — |
| Agentes | No versionan imágenes de producción ni de visitantes reales; no operan sobre `arca_zoo` | — |

## Historias de usuario

- Como visitante, quiero ver la foto de una noticia, de un evento o de un momento aceptado desde mi equipo, para que la imagen no dependa del equipo donde se subió.
- Como miembro del equipo de pruebas, quiero subir una foto desde el dashboard, confirmarla en git y que mis compañeros la vean al hacer `pull`.
- Como `zoo-admin` de otro equipo de pruebas, quiero revisar un momento recibido en la base compartida cuando el archivo llegue con `pull`, para decidir sin depender de la máquina que lo recibió.
- Como `zoo-admin`, quiero ver la foto de una petición pendiente en el dashboard sin que su URL aparezca en ninguna respuesta de la API, para decidir con la menor exposición posible en esta versión.

## Criterios de aceptación

### Configuración y discos

- **CA-01 (valores por defecto):** Dada una instalación sin variables de almacenamiento (`PUBLIC_MEDIA_DISK` y `PRIVATE_MEDIA_DISK` ausentes), cuando la API guarda o lee una imagen de noticia, evento o momento, entonces usa el disco `public` para el ámbito público y el disco `local` para el privado, y el comportamiento de `api-008` no cambia. Verificado con los tests de `api-008` (CA-13) y con un test que nombra este CA. Los `.env` de la carpeta compartida fijan ambos a `media` (CA-14).
- **CA-02 (sin nombres de disco fijos):** Dado el código de `apps/api/src/app/Actions`, `apps/api/src/app/Http` y `apps/api/src/app/Models`, cuando una prueba estática lo revisa, entonces ninguna clase escribe un nombre de disco literal (`'public'`, `'local'` o `'media'`) en una llamada `Storage::disk(...)`; los nombres salen de la configuración de la aplicación.
- **CA-03 (URL pública desde el disco):** Dado un disco público con su URL configurada (`MEDIA_PUBLIC_URL`), cuando se construye `image_url` de una noticia, un evento o un momento aceptado, entonces la URL empieza por la URL del disco y no cambia al cambiar `APP_URL` en la prueba.
- **CA-04 (sin proveedor en el dominio):** Dado el código de `apps/api/src/app/Actions`, `apps/api/src/app/Http` y `apps/api/src/app/Models`, cuando una prueba estática lo revisa, entonces no aparece ningún nombre de proveedor de almacenamiento ni llamadas a un SDK de proveedor. La lista de nombres prohibidos la fija el plan. Las variables de entorno solo se leen en `config/`.
- **CA-05 (dos ámbitos; privado sin URL en la API):** Dada la configuración de medios, cuando se revisa, entonces el ámbito privado usa el mismo disco `media` y la subcarpeta `memories/`. Esta separación es solo de la API (RN-05 y riesgo g del ADR 0026). Dada una petición que no está aceptada, `image_url` es `null` en cualquier respuesta.
- **CA-06 (`.env.example` sin secretos):** Dado el archivo `apps/api/src/.env.example`, cuando una prueba lo lee, entonces incluye `PUBLIC_MEDIA_DISK`, `PRIVATE_MEDIA_DISK` y `MEDIA_PUBLIC_URL` con valores vacíos o de muestra, y ningún archivo versionado contiene llaves, credenciales ni URLs con firma.

### Subida y lectura

- **CA-07 (subida al disco público):** Dada una noticia o un evento con imagen válida (`api-008` CA-01), cuando se guarda con el disco del ámbito público sustituido por un doble de almacenamiento (`Storage::fake` con el nombre que sale de la configuración), entonces el objeto queda bajo `news/` o `events/` en ese disco, `image_path` guarda la ruta relativa igual que hoy e `image_url` usa la URL del disco.
- **CA-08 (fallo de escritura):** Dado un disco que falla al escribir, cuando se sube una imagen de noticia, evento o momento, entonces la API responde 5xx, no crea ni cambia el registro y no deja un objeto sin registro (`api-008` RN-04, `api-010` RN-16).
- **CA-09 (medio privado):** Dada una petición de momento (`api-010` CA-01), cuando se guarda, entonces el archivo queda en el disco `media` bajo `memories/` (`Storage::fake('media')`), pasa la misma limpieza de metadatos que `api-008` (RN-13) y `api-010` (RN-05), y ninguna respuesta pública ni de visitante incluye una URL de esa imagen.
- **CA-10 (lectura de la imagen en revisión):** Dada una petición en revisión y un `zoo-admin` con `memories.review` y 2FA, cuando pide el detalle, entonces la respuesta no incluye ninguna URL de la imagen. La imagen se entrega como binario por una ruta autenticada de la API, con nombre `admin.memories.image` (`api-010` CA-08). El dashboard la consume por proxy de mismo origen, como blob en memoria (D-06). Sin el permiso, la respuesta es 403, sin URL y sin cuerpo. Esta ruta no protege el archivo, que sigue en `media/memories/` (RN-16).

### Aceptar y rechazar

- **CA-11 (aceptar):** Dada una petición en revisión, cuando `zoo-admin` la acepta (`api-010` CA-11), entonces el archivo no se copia ni se mueve, porque ya está en `media/memories/`. `published_image_path` toma el valor de `image_path` (DBR-012 aplicada; el plan lo confirma). La imagen queda accesible por `image_url` desde la aceptación. La API no comprueba que el archivo exista en cada lectura: si falta (flujo 8), la imagen no carga hasta el `pull`.
- **CA-12 (rechazar borra el original si el motivo incluye la foto):** Dada una petición en revisión, cuando `zoo-admin` la rechaza con motivo (`api-010` CA-12) y `rejected_fields` incluye `image`, entonces después del commit se borra el archivo de `media/memories/`, `image_path` queda en `null` y `image_sha256` se conserva (`api-010` CA-29). Si el motivo es solo `content`, el archivo se conserva para la corrección y no cambia (D-05). Si el borrado falla, la petición queda rechazada, el fallo se registra en el log y el archivo queda como huérfano (riesgos). El borrado se confirma con commit (CA-18).
- **CA-13 (rechazada sin copia pública):** Dada una petición rechazada, cuando se consulta su fila, entonces `published_image_path` es `null` y ninguna respuesta incluye su imagen. Si el motivo incluye `image`, `image_path` es `null` y el archivo no existe (CA-12). Si el motivo es solo `content`, el archivo sigue en `media/memories/` para la corrección (`api-010` CA-29), sin copia pública aparte.

### Carpeta versionada

- **CA-14 (escritura en la carpeta versionada):** Dada la configuración de la carpeta compartida con `PUBLIC_MEDIA_DISK=media` y `PRIVATE_MEDIA_DISK=media`, cuando se guarda una imagen de noticia, de evento o de momento con `Storage::fake('media')`, entonces el archivo queda bajo `news/`, `events/` o `memories/` de ese disco, `image_path` guarda la ruta relativa y `image_url` usa la URL del disco `media` (en momentos, solo cuando estén aceptados).
- **CA-15 (solo lo permitido se versiona):** Dado el archivo `apps/api/src/media/.gitignore`, cuando se comprueba con `git check-ignore` sobre rutas de ejemplo (`news/x.jpg`, `memories/x.png`, `events/.gitkeep`, `news/.DS_Store`, `storage/app/private/x.jpg`), entonces `news/`, `events/` y `memories/` solo dejan pasar imágenes `.jpg`, `.jpeg`, `.png`, `.webp` y `.gitkeep`; el resto de la carpeta queda ignorado. La carpeta `storage/` no está dentro de `media/`. Puede ser una prueba automatizada que ejecute `git check-ignore` o evidencia manual en el PR.
- **CA-16 (sin URLs ni rutas absolutas en la base de datos):** Dado un registro con imagen, cuando se guarda y después cambian `MEDIA_PUBLIC_URL` (o `APP_URL`), entonces la base de datos conserva la misma ruta relativa y solo cambia la URL de la respuesta. Ningún campo guardado contiene `http` ni una ruta absoluta del sistema de archivos.
- **CA-17 (URL por defecto de la carpeta):** Dada la carpeta compartida con `MEDIA_PUBLIC_URL` vacía, cuando se construye `image_url`, entonces empieza por `APP_URL` más `/media/`. La configuración de enlaces (`links`) incluye `public_path('media')` apuntando a `media/`, de modo que `storage:link` crea `public/media`. La entrada `public_path('storage')` se conserva solo por compatibilidad del valor por defecto (CA-01; pregunta 6, resuelta el 2026-11-12: se mantiene) y no es necesaria para los medios compartidos.
- **CA-18 (reemplazo y borrado en la carpeta versionada):** Dada una noticia, un evento o un momento con imagen en el disco `media`, cuando la imagen se reemplaza, se quita, se elimina el registro o se rechaza, entonces el archivo anterior se borra de `media/` y el borrado se confirma con commit (`api-008` CA-03, CA-04 y CA-09 con ese disco; `api-010` CA-12 para el rechazo).
- **CA-19 (sin dependencias nuevas):** Dado `apps/api/src/composer.json`, cuando una prueba lo lee, entonces no contiene paquetes de almacenamiento ni de proveedor. Cualquier paquete de ese tipo requiere un ADR aprobado y un cambio de esta spec antes de instalarse (Constitución I).
- **CA-20 (flujo del equipo documentado):** Dado `infra/README.md`, cuando una prueba lo lee, entonces incluye el bloque «Medios de prueba compartidos» con:
  - el flujo subir o recibir → revisar → `git add apps/api/src/media` → commit citando `api-013` → `pull`;
  - la instrucción de volver a subir todas las imágenes de noticias y eventos existentes antes del commit (D-04);
  - la advertencia de que solo se usan datos de prueba y de que el historial de git conserva todo lo versionado (riesgo a del ADR 0026).
- **CA-21 (verificación entre equipos):** Dado un commit con `media/` que dos equipos tienen (`pull`) y la API de cada equipo con `APP_URL` alcanzable desde el otro, cuando se abre desde el otro equipo la URL de una imagen publicada de noticia, evento o momento aceptado, entonces responde 200 con un tipo `image/*`. Y la URL de una imagen pendiente o rechazada no aparece en ninguna respuesta de la API. Verificación manual con evidencia en el PR, sin llaves ni IP privadas. El test de humo automatizado (grupo `smoke`) hace la comprobación contra el ambiente de pruebas.
- **CA-22 (solo datos de prueba y tope):** Dado el contenido de `apps/api/src/media/` antes de cada commit, cuando el equipo lo revisa, entonces ninguna imagen proviene de un visitante real, de un usuario de producción o de `arca_zoo`; todas cumplen la definición de dato de prueba de la pregunta 3 (resuelta el 2026-11-12): imágenes sin personas identificables o con consentimiento escrito de cada persona que aparece, ninguna foto de menores y ningún dato de visitantes reales; y el total de `media/` no supera **100 imágenes o 100 MB, lo que ocurra primero** (tope de la pregunta 3; revisable). La revisión queda en el PR como evidencia manual, sin nombres ni datos personales.

### Operación y verificación

- **CA-23 (sin secretos en registros ni respuestas):** Dada una subida, un reemplazo, una aceptación o un rechazo, cuando se registra en Activitylog o se responde, entonces no aparecen llaves, credenciales, rutas absolutas del sistema de archivos ni URLs con firma.
- **CA-24 (checklist documentado):** Dado `infra/README.md`, cuando una prueba lo lee, entonces incluye las variables de la carpeta compartida (`PUBLIC_MEDIA_DISK`, `PRIVATE_MEDIA_DISK` y `MEDIA_PUBLIC_URL`) y la nota de que `storage:link` crea el enlace `public/media`.
- **CA-25 (cobertura de pruebas):** Dada la suite PHPUnit, cuando se ejecuta contra `arca_pruebas`, entonces existe al menos un test que nombra cada CA de esta spec que sea automatizable. Los CA de evidencia manual (CA-20, CA-21, CA-22) se registran en el PR. Los tests usan `DatabaseTransactions` y dobles de almacenamiento (`Storage::fake` o equivalentes), y no usan `RefreshDatabase` ni migraciones.

## Reglas de negocio

- **RN-01 (contrato de disco):** La API usa discos de Laravel Filesystem configurados por nombre. La carpeta compartida usa el driver `local` con la raíz `media/`. Esta spec no añade drivers remotos.
- **RN-02 (ámbitos y claves):** Hay dos ámbitos. Público: noticias, eventos y momentos aceptados. Privado: momentos no aceptados. Claves: `PUBLIC_MEDIA_DISK` (por defecto `public`; carpeta compartida: `media`), `PRIVATE_MEDIA_DISK` (por defecto `local`; carpeta compartida: `media`, con subcarpeta `memories/`) y `MEDIA_PUBLIC_URL` (opcional).
- **RN-03 (rutas relativas):** La base de datos guarda rutas relativas al disco, como hoy (`api-008` RN-03). Nunca guarda URLs, endpoints ni rutas absolutas. Esto permite cambiar de disco copiando archivos sin tocar la base de datos.
- **RN-04 (URL pública):** `image_url` se construye con la URL del disco público: `MEDIA_PUBLIC_URL` o, si está vacía, `APP_URL` más `/media`. Si el disco público no tiene URL configurada, `image_url` es `null` y se registra un error de configuración.
- **RN-05 (privado sin URL en la respuesta):** El ámbito privado no tiene URL en ningún campo de respuesta de la API. El archivo pendiente o rechazado está en `media/memories/`, que el servidor publica por `/media`. La API no devuelve esa URL (RN-16). La barrera es de la API, no del almacenamiento (riesgo g del ADR 0026).
- **RN-06 (lectura de la imagen en revisión):** La imagen en revisión llega como binario por ruta autenticada, nunca como URL en el JSON (CA-10).
- **RN-07 (sin subida directa):** La API escribe el archivo; el navegador nunca escribe en la carpeta de medios.
- **RN-08 (sin DBR por el almacenamiento):** Esta spec no crea ni modifica tablas, columnas ni índices. `published_image_path` ya está en DBR-012 y no cambia por esta spec; la descripción de disco se alineó con la carpeta local `media/`. Si el plan necesita una columna nueva, se abre una DBR antes de implementar (Constitución V). El cambio de base de datos de Aiven a MySQL local tampoco requiere DBR nueva, porque no cambia el esquema; sí requiere que el responsable de BD aplique y registre las migraciones aprobadas por ambiente.
- **RN-09 (un solo disco por ámbito y ambiente):** En cada ambiente, un ámbito usa un único disco. En la carpeta compartida los dos ámbitos usan `media`; la separación es por subcarpeta y por la API.
- **RN-10 (fallo de almacenamiento):** Si el disco falla al escribir o al borrar antes del commit, no se crea, acepta ni rechaza nada (CA-08, CA-12). Si falla después del commit, se registra el fallo y se deja el objeto como huérfano (riesgos).
- **RN-11 (sin lectura de la imagen privada desde el navegador):** El dashboard muestra la imagen privada solo con la ruta que indica la API (RN-06) y no guarda la imagen ni la URL en el navegador (`dashboard-008` RN-07).
- **RN-12 (sin CORS para imágenes):** Las imágenes públicas se cargan con `<img>`, que no necesita CORS. La ruta autenticada de revisión se consume por proxy de mismo origen (D-06), sin CORS. Si una aplicación necesita leer el binario con `fetch` por otro motivo, se requiere una spec propia con su configuración de CORS.
- **RN-13 (errores en español):** Los mensajes de error que ve el personal o el visitante van en español; los identificadores, rutas y variables van en inglés (Constitución VI).
- **RN-14 (todo `media/` se versiona):** La carpeta versionada es `apps/api/src/media/` completa, con `news/`, `events/` y `memories/` (D-02). Se versionan también las imágenes pendientes y rechazadas mientras existan, como riesgo aceptado (ADR 0026, riesgos a, b y c). Nunca se versiona `storage/`, ni nada fuera de `media/`, ni nada que provenga de `arca_zoo` o de visitantes reales.
- **RN-15 (no es producción):** La carpeta compartida no se usa en producción ni en staging. No se versiona nada proveniente de `arca_zoo`. Git no es respaldo. Solo datos de prueba (CA-22).
- **RN-16 (pendientes y rechazadas sin URL en la API):** La API no devuelve `image_url` de momentos pendientes ni rechazados en ninguna respuesta (visitante, público ni revisión). El archivo pendiente o rechazado existe en `media/memories/` y es accesible por `/media/memories/<uuid>.<ext>` si alguien conoce esa URL. El UUID no es control de acceso. La ruta autenticada de revisión (CA-10) no protege el archivo.
- **RN-17 (borrado en git):** Borrar un archivo versionado se confirma con commit, pero su contenido queda en el historial de git y en cualquier clon que lo haya recibido. Ningún procedimiento de esta spec reescribe el historial. Hacerlo antes de producción es una decisión aparte (pregunta 4).
- **RN-18 (moderación entre equipos):** Un momento se modera en cualquier equipo de pruebas tras el `pull` del commit que contiene su archivo. Antes, la fila se ve sin imagen (flujo 8).

## Datos, privacidad y auditoría

- **Ámbito público:** imágenes institucionales de noticias y eventos, y momentos aceptados. Los momentos aceptados pueden mostrar personas, incluidos menores; la barrera es la aceptación del personal (`api-010`).
- **Ámbito privado:** imágenes de visitantes pendientes o rechazadas. Son datos personales. No tienen URL en ninguna respuesta de la API (CA-05, CA-09, RN-16).
- **Versionar en git deja huella:** todo lo que se versiona queda en el historial aunque se borre después (RN-17). Esto incluye momentos pendientes, aceptados y rechazados (D-02). El riesgo se acepta solo para datos de prueba (CA-22) y se documenta en el ADR 0026 (riesgo a).
- **Lectura no autorizada por URL:** la carpeta versionada se publica por `/media`. Un momento pendiente o rechazado puede verse si se conoce su URL (riesgo b del ADR 0026). La API no la revela.
- **Metadatos:** las imágenes nuevas llegan sin metadatos sensibles (`api-008` RN-13, y también para momentos según `api-010` RN-05). Las existentes deben volver a subirse antes de versionarlas (D-04).
- **Respaldo y versionado:** git no es respaldo. La retención y las copias fuera del repositorio son decisiones pendientes de producción (pregunta 2).
- **Ubicación de los datos:** pendiente de producción (pregunta 1), incluido el lugar donde se aloja el repositorio que guarda los medios.
- **Auditoría:** Activitylog sigue registrando las acciones de `api-008` y `api-010` sin binarios y sin rutas absolutas (CA-23).
- **Esquema:** esta spec no crea ni modifica esquema (RN-08). Las tablas que usa ya están o están en DBR (`DBR-005` para `deleted_at`, `DBR-012` para `visitor_memories`).
- **Clasificación:** los medios públicos no son clínicos ni financieros. Los momentos son datos personales.

## Flujos y errores

1. **Imagen de noticia o evento:** la API valida (`api-008` CA-01 y CA-02), guarda en el disco configurado (`public` por defecto; `media` en la carpeta compartida), guarda el registro y responde con `image_url` del disco. Si el disco falla, responde 5xx y no guarda el registro (CA-08).
2. **Momento pendiente:** la API valida (`api-010` CA-01 a CA-05), guarda en el disco privado (`local` por defecto; `media/memories/` en la carpeta compartida) y crea la petición en `submitted`. No hay URL en ninguna respuesta (CA-09, RN-16).
3. **Revisión:** `zoo-admin` pide el detalle. La API pasa la petición a En proceso (`api-010` CA-08). Responde sin URL y la imagen llega por la ruta autenticada (CA-10).
4. **Aceptar:** la API guarda `published_image_path` con el valor de `image_path`; el archivo no se mueve; `image_url` pasa a tener valor (CA-11).
5. **Rechazar:** la API confirma el commit y, si el motivo incluye `image`, después borra el archivo privado (CA-12). Si el motivo es solo `content`, el archivo se conserva para la corrección (D-05). El borrado queda en el árbol de trabajo y se confirma con commit (CA-18).
6. **Reemplazo o borrado de una imagen de noticia, evento o momento:** el archivo anterior se borra de `media/` y el borrado se confirma con commit (CA-18). El contenido queda en el historial (RN-17).
7. **Flujo del equipo para noticias, eventos y momentos:** subir desde el dashboard o recibir un momento desde la app → archivo en `apps/api/src/media/news/`, `events/` o `memories/` → revisar metadatos, que sea un dato de prueba y que no se supere el tope (CA-22) → `git add apps/api/src/media` → commit citando `api-013` → los demás hacen `pull`. Reemplazos, borrados y rechazos se confirman igual (CA-18, CA-20). Todas las imágenes de noticias y eventos existentes se vuelven a subir antes de versionarlas (D-04).
8. **Fila sin archivo:** si la fila llega antes que el commit del archivo, la API responde normal con `image_url` (o `null` si el momento no está aceptado) y la imagen no carga en el navegador hasta el `pull`. La API no comprueba la existencia del archivo en cada lectura; es una decisión registrada (ver riesgos).
9. **Moderación entre equipos:** el `zoo-admin` de un equipo abre un momento cuya fila llegó con `pull` de la base compartida. Si el archivo no ha llegado, la imagen no carga; si ha llegado, la ruta autenticada la entrega (RN-18).

Errores previstos:

- 401 y 403 según `api-010` CA-14 y CA-15.
- 404 «Petición no encontrada.» según `api-010`.
- 5xx si el disco falla antes del commit. No hay registro ni archivo sin registro (CA-08).
- `image_url` en `null` si el disco público no tiene URL configurada. Se registra un error de configuración, no un 500 para el visitante.
- 404 del navegador para una imagen cuyo archivo no está en la carpeta (flujo 8). La respuesta de la API no cambia.
- 404 de la ruta autenticada de revisión cuando el archivo no existe en `media/memories/`. Si el archivo falta, el dashboard lo muestra como «No se pudo cargar la imagen.» (`dashboard-008` CA-06).

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:**
  - `docs/adr/0026-object-storage-s3-images.md` (Aceptado 2026-11-12). Decide la carpeta `media/` dentro de `src/` (excepción que requiere aprobación), los momentos dentro de la carpeta versionada (D-02) y la ausencia de `storage/` para estas imágenes. Sin aprobación formal no se implementa.
  - Ninguna dependencia nueva de PHP ni de JavaScript (CA-19).
  - `docs/adr/0013-aiven-managed-mysql.md` (Aceptado). Dice que el almacenamiento queda detrás de discos de Laravel Filesystem. Esta spec no cambia el proveedor de base de datos.
  - Constitución I (dependencia con ADR, configuración por `.env`) y V (archivos fuera de la base de datos, esquema solo por DBR).
  - `api-008` (`image_path`, validación, disco público): su CA-13 usa `Storage::fake('public')`, que sigue siendo válido con el valor por defecto (CA-01). Su nota de almacenamiento se actualiza en el mismo cambio.
  - `api-010` (RN-10 sobre disco privado y público, CA-08 sobre la ruta de imagen, CA-11, CA-12 y CA-29 sobre aceptar, rechazar y archivo según motivo). Su RN-10 y su CA-17 tienen una excepción registrada en su nota.
  - `api-012` (CA-06 sobre `image_url` del disco público y la ruta publicada).
  - `DBR-012` (`published_image_path` y `image_path`). Su descripción de discos se alineó con D-02; la DBR se aprobó y se aplicó en `arca_pruebas` el 2026-11-11.
  - `dashboard-008` (consumidor de la imagen de revisión) y `web-010` (consumidor de `image_url`).
  - `infra/README.md` (checklist de despliegue y medios de prueba: CA-20 y CA-24).
  - `apps/api/docs/contenido-publico.md` (referencia de `image_url`).
- **Riesgos:**
  - Privacidad e historial (riesgo a del ADR 0026): los momentos versionados quedan en el historial de git. Mitigación: solo datos de prueba (CA-22); retirada del historial antes de producción (pregunta 4).
  - Acceso por URL a pendientes y rechazados (riesgo b del ADR 0026): la carpeta se publica por `/media`; la API no devuelve la URL, pero no hay control de acceso al archivo. La ruta autenticada de revisión (CA-10) no lo protege.
  - Rechazadas (riesgo c del ADR 0026): el borrado se confirma con commit; el contenido queda en el historial y en los clones. Decisión humana: aceptar esta consecuencia.
  - Commit de momentos (riesgo d del ADR 0026): si el archivo no se commitea, la moderación en otros equipos muestra la fila sin imagen. Pregunta 5 resuelta el 2026-11-12: lo commitea el mismo día quien recibió el envío.
  - Metadatos de imágenes existentes (D-04; riesgo e del ADR 0026).
  - Peso del repositorio: tope de cantidad fijado el 2026-11-12 en 100 imágenes o 100 MB en total en `media/`, lo que ocurra primero (riesgo f del ADR 0026; pregunta 3; CA-22).
  - Visibilidad condicionada al `APP_URL` alcanzable de la API que consume y al enlace `public/media` (riesgo i del ADR 0026).
  - Filas con ruta y archivo sin commit (flujo 8; riesgo j del ADR 0026). Afecta también a las filas previas a D-04.
  - Sin separación de disco entre público y privado (riesgo g del ADR 0026). Pregunta 7 resuelta el 2026-11-12 por Jonathan, válida para pruebas; revisar antes de producción.
  - Configuración incompleta de un equipo (`PUBLIC_MEDIA_DISK` o `PRIVATE_MEDIA_DISK` sin `media`): escritura en `storage/` y fila que los demás no pueden ver (riesgo k del ADR 0026).
  - Huérfanos: si el borrado falla después del commit, queda un archivo sin registro (CA-12). Hace falta un comando de limpieza o una decisión de aceptar el riesgo.
  - Retirada tardía de contenido público por cachés (heredado de `api-010` pregunta 2).
  - **Divergencias detectadas (pendientes de aplicar en el mismo cambio que su documento):**
    1. `docs/database/requests/DBR-012-visitor-memories.md`: sus descripciones de `image_path` y `published_image_path` se alinearon con la carpeta `media/` (sin la rama de almacenamiento de objetos). Revisado por el responsable de BD; la DBR se aprobó y se aplicó en `arca_pruebas` el 2026-11-11.
    2. `infra/README.md`, bloque «Medios de prueba compartidos»: debe quitar la etiqueta de fase, incluir CA-20 y CA-24 y eliminar el bloque de almacenamiento de objetos, que sale del plan (la sesión principal aplica el texto propuesto).
    3. `apps/api/specs/010-visitor-memory-requests.md`: RN-10 y CA-17 tienen una excepción de la carpeta compartida registrada en su nota. Validación técnica/BD aprobada el 2026-11-11; aprobación funcional de `api-010` por Jonathan el 2026-11-12.
    4. `apps/api/plan/` y `apps/api/tasks/` de `api-008` no se han actualizado con la nota de almacenamiento. Si se aprueba esta spec, la divergencia se registra en plan y tasks en el mismo cambio (`docs/05-flujo-sdd.md`, paso 7).
- **Preguntas pendientes:**
  1. ¿Hay requisito de ubicación de los datos (país o región) para las imágenes de visitantes y para el repositorio que guardará los medios? Si lo hay, cambia el alojamiento del repositorio. Propuesta: confirmar antes de la primera subida de un momento. **Pendiente de producción** (no bloquea pruebas): confirmar antes de la primera subida de un momento queda como condición de producción.
  2. ¿Qué retención de versiones y qué copia de respaldo se exigen? Git no cuenta como respaldo. Hay que definirlo antes de cualquier uso fuera de pruebas. **Pendiente de producción** (no bloquea pruebas).
  3. ¿Cuál es la definición de «dato de prueba» que el equipo aprueba para `media/` (CA-22), y cuál es el tope de cantidad de imágenes en git (riesgo f)? Propuesta de definición: imágenes sin personas identificables o con consentimiento escrito de cada persona que aparece; ninguna foto de menores; ningún dato de visitantes reales. Propuesta de tope: el equipo lo fija antes de la primera subida. **Resuelta, decisión del usuario 2026-11-12:** dato de prueba = imágenes sin personas identificables o con consentimiento escrito de cada persona que aparece; ninguna foto de menores; ningún dato de visitantes reales. **Tope: 100 imágenes o 100 MB en total en `media/`, lo que ocurra primero** (cifra sugerida por el asistente y aceptada por el usuario; revisable). Desbloquea CA-22, ya actualizado.
  4. ¿Qué procedimiento de retirada del historial se aplica antes de producción (quitar `media/memories/` y reescribir el historial, con coordinación de clones)? Propuesta: fijarlo en una spec propia antes de cualquier uso de la carpeta fuera de pruebas. No se decide ahora. **Pendiente de producción** (no bloquea pruebas): se fija en una spec propia antes de cualquier uso fuera de pruebas.
  5. ¿Quién hace el commit de un momento recibido por la API (el equipo que lo recibió o uno designado), y con qué frecuencia? Propuesta: el mismo día, por quien recibió el envío. **Resuelta, decisión del usuario 2026-11-12:** el commit lo hace el mismo día quien recibió el envío.
  6. ¿Se mantiene `public_path('storage')` en `links` además de `public_path('media')`? Propuesta: sí, por compatibilidad del valor por defecto (CA-17). **Resuelta, decisión del usuario 2026-11-12:** se mantiene `public_path('storage')` además de `public_path('media')`.
  7. ¿Se acepta que el ámbito privado comparta disco y raíz con el público, con la barrera solo en la API (riesgo g del ADR 0026)? Propuesta: sí, con esa aceptación explícita antes de la primera subida de un momento. **Resuelta, decisión del usuario 2026-11-12:** se acepta que el ámbito privado comparta disco y raíz con el público, con la barrera solo en la API (riesgo g del ADR 0026; confirmado por Jonathan el 2026-11-12). Esta decisión no aprueba la spec.

Estado de las preguntas (2026-11-12): abiertas ahora, ninguna. Pendientes de producción: 1, 2 y 4 (no bloquean pruebas). Resueltas: 3, 5, 6 y 7.

## Complejidad

Resumen; detalle en el ADR 0026 y en la guía de opción futura.

| Cambio | Esfuerzo | Por qué |
|---|---|---|
| Implementar la carpeta compartida | Bajo-Medio | Disco `media` y enlace en `config/`; clave de disco en las Actions de noticias, eventos y momentos; subcarpeta `memories/`; `.gitignore` de `media/`; `.env.example`; ruta autenticada de revisión sin URL (CA-10), que no existe hoy; documentación. Sin migraciones ni dependencias. Sube a Medio si se añade un comando de copia (no decidido: D-04 lo descarta). |
| Cambiar la base de datos de Aiven a MySQL local | Bajo técnico; Medio por coordinación y datos | Solo `.env` y volcado con restauración. No requiere DBR nueva. Riesgos en el ADR 0026. |

## Revisión

- Aprobadores y fecha: Jonathan (responsable de backend), 2026-11-12. Aprobado por: Jonathan (responsable de backend), 2026-11-12. Solicitante y responsable funcional: Jonathan (decisión del 2026-11-10).
- Estado: Aprobada (2026-11-12). Aprobar no autoriza implementar: la implementación empieza cuando existan plan y tasks aprobados. Alcance aprobado: D-01, D-02, D-03 y D-05, y el tope de CA-22 (100 imágenes o 100 MB en `media/`, lo que ocurra primero). D-04 y D-06 no constan en esta aprobación y quedan pendientes de confirmación expresa. Pendientes de producción, que no bloquean pruebas: ubicación de datos (pregunta 1), retención y respaldo (pregunta 2) y retirada del historial (pregunta 4). Condiciones de dependencias: ADR 0026 y ADR 0027 Aceptados (2026-11-12); DBR-012 Lista para backend (aplicada en `arca_pruebas` el 2026-11-11). Validación técnica del equipo con el Constitution Check del plan (`docs/05-flujo-sdd.md`): pendiente.
- Historial: borrador del 2026-11-10 con la carpeta de medios y la opción de almacenamiento de objetos; revisión del mismo día que retira la opción de almacenamiento de objetos del plan y la deja como opción futura en `docs/propuestas/almacenamiento-objetos-s3.md`. Renumeración de CA y RN para cerrar los huecos. 2026-11-12: decisiones del usuario sobre las preguntas 1 a 7 (preguntas 3, 5, 6 y 7 resueltas; 1, 2 y 4 pendientes de producción); CA-22 con el tope de 100 imágenes o 100 MB; D-02 y D-05 alineados con la pregunta 7. Estado sin cambios en esa fecha (Borrador). 2026-11-12, aprobación (Jonathan, responsable de backend): spec Aprobada con D-01, D-02, D-03 y D-05, tope de CA-22, pendientes de producción 1, 2 y 4 sin cambio y responsable de backend registrado; D-04 y D-06 pendientes de confirmación expresa. Sin cambio de CA, RN, alcance ni dependencias.
- Evidencia/enlaces: `docs/adr/0026-object-storage-s3-images.md`, `docs/propuestas/almacenamiento-objetos-s3.md`, `docs/adr/0013-aiven-managed-mysql.md`, `apps/api/specs/008-event-news-images.md`, `apps/api/specs/010-visitor-memory-requests.md`, `apps/api/specs/012-public-memories-read.md`, `apps/dashboard/specs/008-memory-moderation.md`, `apps/web/specs/010-dynamic-memories.md`, `apps/api/docs/contenido-publico.md`, `docs/database/requests/DBR-012-visitor-memories.md`, `infra/README.md`, `apps/api/src/config/filesystems.php`, `apps/api/src/.env.example`, `apps/api/src/app/Actions/Admin/Content/StoreContentImageAction.php`, `apps/api/src/app/Actions/Admin/Content/ResolveContentImageUrlAction.php`, `apps/api/src/storage/app/public/.gitignore`.
