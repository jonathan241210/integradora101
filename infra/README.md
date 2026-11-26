# Infraestructura

**Estado: bosquejo; no hay infraestructura implementada.** No crear recursos, archivos de entorno ni despliegues sin spec, plan, aprobación y revisión de seguridad.

## Desarrollo local

Se prevé un `docker-compose` para servicios locales de desarrollo, incluido MySQL 8.0.x. Aún no existe archivo Compose ni configuración de contenedores. El equipo debe decidir puertos, volúmenes, datos semilla y estrategia de respaldos en una spec.

Para levantar la API y conectar un dispositivo, sigue [Requisitos y arranque de la API](../apps/api/docs/requisitos-entorno.md). Incluye el caso local, una computadora visible en la red y un servidor compartido por HTTPS. El cliente se configura desde la [guía móvil](../apps/mobile/README.md#conectar-la-api).

## Alojamiento previsto

La base de datos administrada es Aiven MySQL (ADR 0013), con TLS configurado por `DB_SSL_CA` en `.env`; `arca_pruebas` es la base de trabajo y PHPUnit, y `arca_zoo` es producción. Google Cloud dejó de ser el destino del sistema: el hosting de la API Laravel y de los clientes queda por definir. El almacenamiento de archivos que se agregue usará discos configurables de Laravel Filesystem, no llamadas a SDK desde dominio.

## Base de datos

La familia MySQL 8.0.x es obligatoria en todos los ambientes; la revisión mínima queda pendiente del inventario inicial (`SELECT VERSION()`, charset/collation, modo SQL, motor y esquema existente). La instancia existente contiene esquema sin datos: no se borra, recrea ni adopta como baseline automáticamente; una decisión aprobada definirá baseline o reconstrucción controlada. Cada ambiente (desarrollo/pruebas, staging y producción) usa una base aislada; los cambios siguen `docs/database/README.md` y los aplica el responsable de BD con respaldo, autorización, evidencia y reversión.

## Portabilidad

- Usar capacidades compatibles con MySQL 8.0.x; no depender de extensiones exclusivas de Aiven ni de funciones posteriores a la familia 8.0.x.
- Configurar acceso, host, base, usuario y secreto mediante variables de entorno; no versionar credenciales.
- Mantener datos persistentes en migraciones Laravel y planear exportación, respaldo y restauración verificables.
- Para migrar a MySQL Server local, apuntar conexiones a la instancia local mediante `.env`, validar collation/versión y probar restauración; revisar por separado el driver de archivos.
- `settings_colores` se conecta por `mysql2` como fuente externa de solo lectura; sus credenciales se gestionan fuera del repo.

## Checklist obligatorio de despliegue de la API

Ninguno de estos ajustes viaja con el código: la configuración local no se copia al servidor, y sin ellos la app arranca pero falla después. Se repite en cada ambiente y se registra con su evidencia. Es el mínimo conocido, no sustituye al checklist operativo aprobado que falta definir, y se amplía si aparece otro requisito.

**Zona horaria (api-025)**

- [ ] `ARCA_TIMEZONE` tiene la zona de negocio (por defecto y en producción `America/Mexico_City`, a confirmar por operaciones). Debe ser un identificador IANA: si está vacía o es inválida, la API no arranca.
- [ ] `DB_TIMEZONE=+00:00` (valor por defecto): la sesión MySQL va en UTC.
- [ ] Tras cambiar `.env` se ejecutó `php artisan config:clear` o `config:cache`.
- [ ] **Evidencia antes de desplegar (operaciones, sobre `arca_zoo`):** `@@session.time_zone` y `@@system_time_zone`, y que `tickets.purchased_at` y `cancelled_at` guardados están en UTC.

**Consola de administradores (api-023)**

- [ ] `ARCA_PRIMARY_ADMIN_EMAIL` apunta a un administrador activo (titular) y `ARCA_ADMIN_RECOVERY=false`. Sin titular los comandos `arca:admin:*` de nivel alto fallan; el modo recuperación solo se activa durante el procedimiento de `apps/api/docs/administracion.md` y se desactiva al terminar (api-023).

**Seguridad de la configuración**

- [ ] `APP_ENV=production` y `APP_DEBUG=false` en producción; nunca `APP_DEBUG=true` fuera de desarrollo.
- [ ] `LOG_LEVEL=warning` (o superior) en producción: el nivel `debug` registra datos de las peticiones (api-028).
- [ ] `TRUSTED_PROXIES` con la IP o el CIDR del balanceador o proxy inverso (lista separada por comas; `*` solo si el servidor no es alcanzable sin pasar por el proxy). Sin esto, detrás de un balanceador `$request->ip()` es la IP del proxy y los límites por IP (`throttle`) se vuelven globales; con un valor demasiado amplio, un cliente puede falsear su IP con `X-Forwarded-For` (api-028).
- [ ] El proxy o el hosting agrega las cabeceras de seguridad (no se fijan en el código de la API): `Content-Security-Policy`, `Strict-Transport-Security` (HSTS), `X-Frame-Options` (`DENY` o `SAMEORIGIN`) y `Referrer-Policy` (por ejemplo `strict-origin-when-cross-origin`) (api-028).
- [ ] Los scripts `docs/database/backups/reset-and-init.php` y `restore.php` y los seeders `Dbr019*` se niegan a correr con `APP_ENV=production` o `DB_DATABASE=arca_zoo`; no se ejecutan contra producción (api-028).
- [ ] El bloqueo por intentos fallidos de confirmación del titular (api-023) y los límites de frecuencia (`throttle`) viven en la caché: `CACHE_STORE=database` o `redis` (persistente y compartida entre procesos); **nunca** `array` ni `file` en producción, porque el bloqueo se perdería al reiniciar o no se compartiría.
- [ ] `DEMO_STAFF_PASSWORD` vacía en producción y el comando `arca:demo:cancellation-reviews` (cuentas `demo-cancel-*`) **no se ejecuta nunca** en producción; el comando se niega fuera de `arca_pruebas` y con `APP_ENV=production`.

**Imágenes de noticias y eventos**

- [ ] `APP_URL` tiene la dirección pública real, con esquema y puerto si aplica. De ahí sale la URL de cada imagen.
- [ ] Se ejecutó `php artisan storage:link` desde `apps/api/src`. El enlace `public/storage` no se versiona.
- [ ] `storage/app/public` tiene permisos de escritura, **persiste entre despliegues** y entra en los respaldos. Si el alojamiento borra el disco en cada despliegue, las imágenes se pierden: hay que definir antes un disco persistente.
- [ ] PHP tiene `upload_max_filesize` mayor que 5 MB (el valor por defecto es 2 MB) y `post_max_size` mayor que `upload_max_filesize`. Ejemplo: `6M` y `8M`.
- [ ] Si hay Nginx o similar, su límite también lo permite. Ejemplo: `client_max_body_size 8M;`.
- [ ] Se reinició PHP y el servidor web, y se ejecutó `php artisan config:cache` después de cambiar `.env`.
- [ ] **Evidencia:** se subió desde el dashboard una imagen de entre 2 y 5 MB, se ve en la lista y al editar, y su URL `/storage/...` responde 200.

El límite de 5 MB también está en la validación de la API, en la pantalla y en `apps/api/specs/008-event-news-images.md`. Para aceptar más, hay que cambiar la spec y los tres lugares, además del servidor.

Las fotos de especies (api-014: envío del veterinario y edición de la Dirección, JPEG o PNG) usan el mismo límite de 5 MB y los mismos ajustes de PHP y del servidor web de este checklist; no requieren un valor distinto. Las peticiones de edición con foto viajan como `multipart/form-data` con `_method=PATCH`.

**Medios de prueba compartidos** (decisión del responsable; ADR 0026 Aceptado y `apps/api/specs/013-object-storage-images.md` Aprobada)

- [ ] `.env` de cada equipo de pruebas: `PUBLIC_MEDIA_DISK=media` y `PRIVATE_MEDIA_DISK=media`. Sin ellas, las imágenes van a `storage/` y no se versionan. Sin `PUBLIC_MEDIA_DISK=media` y `PRIVATE_MEDIA_DISK=media` en el mismo equipo, los momentos aceptados se publican sin imagen (api-013 CA-11).
- [ ] `MEDIA_PUBLIC_URL` vacía (por defecto `APP_URL` + `/media`) o con una URL alcanzable desde el equipo que consulta.
- [ ] `php artisan storage:link` desde `apps/api/src` crea `public/media` apuntando a `media/`. Los medios de prueba no usan `public/storage`. `public/media` no se versiona.
- [ ] Se versiona toda `apps/api/src/media/` (`news/`, `events/`, `memories/`, `species/`, `species-requests/` y `models/`; `species/species-requests` por enmienda del ADR 0026). Solo se versionan imágenes `.jpg`, `.jpeg`, `.png`, `.webp`, modelos `.glb` aprobados y los `.gitkeep`; tope de 100 imágenes o 100 MB (api-013 CA-22). Solo datos de prueba: nunca visitantes reales, producción ni `arca_zoo` (api-013 CA-22). Los momentos pendientes y rechazados también se versionan (api-013 D-02); su contenido queda en el historial de git aunque se borre (ADR 0026, riesgo a).
- [ ] Fotos de especies (api-014, RN-04, RN-22): las carpetas `apps/api/src/media/species/` (foto publicada) y `apps/api/src/media/species-requests/` (foto pendiente de revisión) existen en el disco `media` y su `storage:link` es el mismo de arriba. Se versionan en pruebas (api-014, Q3 resuelta, según la enmienda del ADR 0026); las fotos pendientes quedan en el historial de git aunque se rechacen (riesgo m). Antes de producción se revisa esta decisión. La API solo borra archivos de esas dos carpetas con nombre UUID, y solo después de confirmar la transacción.
- [ ] Hay que volver a subir todas las imágenes ya subidas de noticias y eventos desde el dashboard antes del commit (api-013 D-04).
- [ ] Flujo: subir o recibir (noticia, evento, momento o especie) → revisar → `git add apps/api/src/media` → commit citando `api-013` → `git pull` en los demás equipos. Reemplazos, borrados y rechazos se confirman igual (api-013 CA-18, CA-20).
- [ ] La API no devuelve la URL de un momento pendiente, pero su archivo es alcanzable por `/media/memories/<uuid>` si se conoce (api-013 RN-16).
- [ ] `.env` de momentos (api-010): `MEMORIES_PUBLICATION_DAYS` (vigencia en el portal; 7 días por defecto, decisión del usuario) y `MEMORIES_TERMS_VERSION` (versión de términos aceptada al enviar). `MEMORIES_TERMS_VERSION` vale `v1` por defecto; si se deja vacía en `.env`, se usa `v1`.
- [ ] Momentos (api-010): el seeder de permisos debe incluir `memories.review` solo para `zoo-admin` (`admin` queda excluido). La subida de fotos de visitantes admite JPG, PNG o WebP de hasta 5 MB: el servidor web y PHP (`upload_max_filesize`, `post_max_size`) deben permitir al menos ese tamaño; la app muestra los 413 y 415 con el mismo mensaje de tamaño o formato.
- [ ] Avisos del visitante (api-017): un proceso ejecuta `php artisan queue:work` y otro `php artisan schedule:run` cada minuto. `PUSH_ENABLED`, `EXPO_PUSH_URL` y `EXPO_ACCESS_TOKEN` se configuran por ambiente. El token no se versiona: es un token de acceso de la organización de Expo `arca-nb`. El proyecto de EAS es esa organización (`owner` y `projectId` en `apps/mobile/app.json`); no se crea otro. La credencial FCM vive en ese proyecto, fuera de Git. Quien compila entra con una cuenta invitada a la organización. El push no funciona en Expo Go. El APK de prueba es el perfil `preview` de EAS; la URL queda en ese entorno, no en `apps/mobile/.env`. Los comandos están en `apps/mobile/docs/013-permiso-notificaciones.md`. La cola, también si la API corre en un contenedor, está en `apps/api/docs/visitante-push.md`. Cuando la API esté en un servidor, el teléfono usa su HTTPS. El perfil `preview` no sirve para eso, y el build de producción usa el perfil `production` de EAS (`mobile-008`, `mobile-018`).
- [x] Quién commitea los momentos recibidos y con qué frecuencia: el mismo día, por quien recibió el envío.
- [x] El equipo registra la aceptación de los riesgos a, b, c y g del ADR 0026 antes de la primera subida de un momento. (Confirmados por el responsable de backend, válido para pruebas; el ADR también confirma el riesgo m. Revisar antes de producción.)
- [ ] Antes de producción se retira `memories/` del repositorio y de su historial (api-013, pregunta 4: se fija en una spec propia antes de cualquier uso fuera de pruebas; pendiente de producción).
- [ ] Sin dependencias nuevas en `composer.json`. Git no es respaldo ni producción; `arca_zoo` no usa esta carpeta.
- [ ] **Evidencia:** otro equipo, con `pull` del mismo commit, abre la URL de una imagen publicada y responde 200 con `image/*` (api-013 CA-21).

**Opción futura de almacenamiento de objetos:** ver `docs/propuestas/almacenamiento-objetos-s3.md`. Es una propuesta no implementada ni aprobada; no es un requisito de despliegue ni tiene checklist aquí.

**Roles y permisos**

- [ ] Se aplicó `php artisan db:seed --class=RolesAndPermissionsSeeder` después de cualquier cambio en ese seeder. El código no actualiza los permisos de una base existente. No correr `db:seed` sin `--class`: también ejecuta `DemoStaffSeeder`, que crea cuentas de prueba.
- [ ] Publicación de especies (api-014, CA-20, RN-10): el seeder crea `species.review` y `memories.review` y los asigna **solo** a `zoo-admin`; `admin`, `executive`, `cashier` y `veterinarian` no los reciben. Hay que volver a ejecutar `db:seed --class=RolesAndPermissionsSeeder` en cada ambiente tras este cambio; un `admin` que ya los tuviera por otra vía debe revisarse.
- [ ] **Evidencia:** Presidencia ve «Precios» y no «Venta»; el cajero ve «Venta» y puede cancelar sus boletos del día.

**Pendiente antes de producción:** no hay un procedimiento aprobado para aplicar el seeder en `arca_zoo` (`apps/api/specs/009-ticket-sales.md`, pregunta R6). Lo ejecuta solo el responsable de BD, nunca un agente. Sin ese procedimiento, los cambios de permisos no pueden llegar a producción.

## Portal público: noticias y eventos (api-011, web-009)

- [ ] `CORS_ALLOWED_ORIGINS` incluye el origen exacto (esquema, host y puerto) desde el que se sirve el portal en cada ambiente. En desarrollo: `http://localhost:8080`. Sin esta línea el portal no muestra noticias ni eventos.
- [ ] La base URL de la API está en `<meta name="arca-api-base">` de `index.html`, `noticias.html` y `eventos.html`, o el servidor reenvía `/api/v1` a la API en el mismo origen.
- [ ] DBR-005 está aplicada en el ambiente (`deleted_at` en `news` y `events`).
- [ ] Se cumple el checklist de «Imágenes de noticias y eventos» (`APP_URL`, `storage:link`, disco persistente).
- [ ] Nota (api-014): la ruta pública de especies publicadas, `GET /api/v1/published-species`, pertenece a `api-015`, no a esta spec. Cuando se implemente, `CORS_ALLOWED_ORIGINS` debe cubrir el mismo origen del portal; se confirma entonces. api-014 solo agrega rutas autenticadas de administración y del veterinario, que no usan el portal.
- [ ] El portal local no usa el puerto 8000, que es el de la API.
- [ ] **Evidencia:** `curl -i -H "Origin: <origen del portal>" <API>/api/v1/news?limit=3` responde 200 con `Access-Control-Allow-Origin` igual a ese origen.

## Portal público: momentos para recordar (api-012, web-010)

- [ ] DBR-012 aplicada en el ambiente (tabla `visitor_memories` con el índice `idx_visitor_memories_status_publication`).
- [ ] `CORS_ALLOWED_ORIGINS` incluye el origen exacto del portal (en desarrollo, `http://localhost:8080`).
- [ ] Prueba: `curl -i -H "Origin: <origen del portal>" <API>/api/v1/memories` responde 200 con `Access-Control-Allow-Origin` igual a ese origen. **Evidencia:** pendiente.

Disco de medios, carpeta `memories/` y `storage:link` (`public/media`): ver «Medios de prueba compartidos» (api-013); no se repiten aquí.

## Portal público: página no encontrada (web-010)

El hosting y el servidor de producción siguen por definir. Cuando se elijan, se documentará su sintaxis mediante el SDD de despliegue correspondiente; no se asume Nginx, Apache ni un proveedor concreto.

- [ ] El document root del portal contiene `404.html` y el servidor lo usa como documento para rutas inexistentes.
- [ ] El documento institucional conserva el estado HTTP `404`; no redirige a la portada ni responde `200`.
- [ ] Las páginas válidas `/index.html`, `/noticias.html` y `/eventos.html` conservan el estado HTTP `200`.
- [ ] Los enlaces «Volver al inicio», «Ver noticias» y «Ver eventos» funcionan desde una URL inexistente con varios segmentos.
- [ ] **Evidencia:** `curl -I <PORTAL>/ruta/inexistente` responde `404` y `curl -I <PORTAL>/index.html` responde `200`; se adjunta además una captura de la página institucional.

## Portal público (Zoopedia) (api-015, web-011)

- [ ] `CORS_ALLOWED_ORIGINS` incluye el origen exacto del portal (en desarrollo, `http://localhost:8080`), el mismo requisito de `web-009`. `127.0.0.1:8080` es otro origen.
- [ ] DBR-013 aplicada en el ambiente (columnas `is_published`, `published_fields`, `image_path`, `deleted_at` en `species`) (api-015).
- [ ] Disco de medios con la carpeta `species/` persistente y `php artisan storage:link` ejecutado para `public/media` (api-015).
- [ ] La meta `arca-api-base` de `index.html`, `noticias.html` y `eventos.html` tiene el mismo valor (la base de la API, no el origen del portal).
- [ ] **Evidencia:** `curl -i -H "Origin: <origen del portal>" <API>/api/v1/published-species` responde `200` con `Access-Control-Allow-Origin` igual a ese origen y `{"data": [...]}`.

## Portal público (Momentos para recordar) (api-012, web-010)

- [ ] `CORS_ALLOWED_ORIGINS` incluye el origen exacto del portal (en desarrollo, `http://localhost:8080`); es el mismo requisito de `web-009`.
- [ ] La meta `arca-api-base` de `index.html`, `noticias.html` y `eventos.html` tiene el mismo valor.
- [ ] Las fotos se cargan con `<img>` y no necesitan CORS (`api-013` RN-12).
- [ ] **Evidencia:** `curl -i -H "Origin: <origen del portal>" "<API>/api/v1/memories?limit=6"` responde `200` con `Access-Control-Allow-Origin` igual a ese origen y `{"data": [...]}`.

## Secretos y operación

Los secretos se administran con mecanismos de cada entorno (Secret Manager u opción local segura) y se inyectan al proceso; nunca se guardan en Git, imágenes ni logs. `.env.example` contiene solo nombres y valores de muestra no sensibles. Definir acceso mínimo, rotación, respaldos, restauración y auditoría antes de producción.

Referencia de arquitectura: ADR 0013 (sustituye a ADR 0006). Todo despliegue requiere SDD y checklist operativo aprobado.
