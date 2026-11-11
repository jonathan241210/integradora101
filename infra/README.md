# Infraestructura

**Estado: bosquejo; no hay infraestructura implementada.** No crear recursos, archivos de entorno ni despliegues sin spec, plan, aprobación y revisión de seguridad.

## Desarrollo local

Se prevé un `docker-compose` para servicios locales de desarrollo, incluido MySQL 8.0.x. Aún no existe archivo Compose ni configuración de contenedores. El equipo debe decidir puertos, volúmenes, datos semilla y estrategia de respaldos en una spec.

## Alojamiento previsto

La base de datos administrada es Aiven MySQL (ADR 0013), con TLS configurado por `DB_SSL_CA` en `.env`; `arca_pruebas` es la base de trabajo y PHPUnit, y `arca_zoo` es producción. Google Cloud dejó de ser el destino del sistema: el hosting de la API Laravel y de los clientes queda por definir. El almacenamiento de archivos que se agregue usará discos configurables de Laravel Filesystem, no llamadas a SDK desde dominio.

## Base de datos

La familia MySQL 8.0.x es obligatoria en todos los ambientes; la revisión mínima queda pendiente del inventario inicial (`SELECT VERSION()`, charset/collation, modo SQL, motor y esquema existente). La instancia existente contiene esquema sin datos: no se borra, recrea ni adopta como baseline automáticamente; una decisión aprobada definirá baseline o reconstrucción controlada. Cada ambiente (desarrollo/pruebas, staging y producción) usa una base aislada; los cambios siguen `docs/database/README.md` y los aplica el responsable de BD con respaldo, autorización, evidencia y reversión.

## Portabilidad

- Usar capacidades compatibles con MySQL 8.0.x; no depender de extensiones exclusivas de Aiven ni de MySQL 8.4.
- Configurar acceso, host, base, usuario y secreto mediante variables de entorno; no versionar credenciales.
- Mantener datos persistentes en migraciones Laravel y planear exportación, respaldo y restauración verificables.
- Para migrar a MySQL Server local, apuntar conexiones a la instancia local mediante `.env`, validar collation/versión y probar restauración; revisar por separado el driver de archivos.
- `settings_colores` se conecta por `mysql2` como fuente externa de solo lectura; sus credenciales se gestionan fuera del repo.

## Checklist obligatorio de despliegue de la API

Ninguno de estos ajustes viaja con el código: la configuración local no se copia al servidor, y sin ellos la app arranca pero falla después. Se repite en cada ambiente y se registra con su evidencia. Es el mínimo conocido, no sustituye al checklist operativo aprobado que falta definir, y se amplía si aparece otro requisito.

**Imágenes de noticias y eventos**

- [ ] `APP_URL` tiene la dirección pública real, con esquema y puerto si aplica. De ahí sale la URL de cada imagen.
- [ ] Se ejecutó `php artisan storage:link` desde `apps/api/src`. El enlace `public/storage` no se versiona.
- [ ] `storage/app/public` tiene permisos de escritura, **persiste entre despliegues** y entra en los respaldos. Si el alojamiento borra el disco en cada despliegue, las imágenes se pierden: hay que definir antes un disco persistente.
- [ ] PHP tiene `upload_max_filesize` mayor que 5 MB (el valor por defecto es 2 MB) y `post_max_size` mayor que `upload_max_filesize`. Ejemplo: `6M` y `8M`.
- [ ] Si hay Nginx o similar, su límite también lo permite. Ejemplo: `client_max_body_size 8M;`.
- [ ] Se reinició PHP y el servidor web, y se ejecutó `php artisan config:cache` después de cambiar `.env`.
- [ ] **Evidencia:** se subió desde el dashboard una imagen de entre 2 y 5 MB, se ve en la lista y al editar, y su URL `/storage/...` responde 200.

El límite de 5 MB también está en la validación de la API, en la pantalla y en `apps/api/specs/008-event-news-images.md`. Para aceptar más, hay que cambiar la spec y los tres lugares, además del servidor.

**Roles y permisos**

- [ ] Se aplicó `php artisan db:seed --class=RolesAndPermissionsSeeder` después de cualquier cambio en ese seeder. El código no actualiza los permisos de una base existente. No correr `db:seed` sin `--class`: también ejecuta `DemoStaffSeeder`, que crea cuentas de prueba.
- [ ] **Evidencia:** Presidencia ve «Precios» y no «Venta»; el cajero ve «Venta» y puede cancelar sus boletos del día.

**Pendiente antes de producción:** no hay un procedimiento aprobado para aplicar el seeder en `arca_zoo` (`apps/api/specs/009-ticket-sales.md`, pregunta R6). Lo ejecuta solo el responsable de BD, nunca un agente. Sin ese procedimiento, los cambios de permisos no pueden llegar a producción.

## Portal público: noticias y eventos (api-011, web-009)

- [ ] `CORS_ALLOWED_ORIGINS` incluye el origen exacto (esquema, host y puerto) desde el que se sirve el portal en cada ambiente. En desarrollo: `http://localhost:8080`. Sin esta línea el portal no muestra noticias ni eventos.
- [ ] La base URL de la API está en `<meta name="arca-api-base">` de `index.html`, `noticias.html` y `eventos.html`, o el servidor reenvía `/api/v1` a la API en el mismo origen.
- [ ] DBR-005 está aplicada en el ambiente (`deleted_at` en `news` y `events`).
- [ ] Se cumple el checklist de «Imágenes de noticias y eventos» (`APP_URL`, `storage:link`, disco persistente).
- [ ] El portal local no usa el puerto 8000, que es el de la API.
- [ ] **Evidencia:** `curl -i -H "Origin: <origen del portal>" <API>/api/v1/news?limit=3` responde 200 con `Access-Control-Allow-Origin` igual a ese origen.

## Portal público: página no encontrada (web-010)

El hosting y el servidor de producción siguen por definir. Cuando se elijan, se documentará su sintaxis mediante el SDD de despliegue correspondiente; no se asume Nginx, Apache ni un proveedor concreto.

- [ ] El document root del portal contiene `404.html` y el servidor lo usa como documento para rutas inexistentes.
- [ ] El documento institucional conserva el estado HTTP `404`; no redirige a la portada ni responde `200`.
- [ ] Las páginas válidas `/index.html`, `/noticias.html` y `/eventos.html` conservan el estado HTTP `200`.
- [ ] Los enlaces «Volver al inicio», «Ver noticias» y «Ver eventos» funcionan desde una URL inexistente con varios segmentos.
- [ ] **Evidencia:** `curl -I <PORTAL>/ruta/inexistente` responde `404` y `curl -I <PORTAL>/index.html` responde `200`; se adjunta además una captura de la página institucional.

## Secretos y operación

Los secretos se administran con mecanismos de cada entorno (Secret Manager u opción local segura) y se inyectan al proceso; nunca se guardan en Git, imágenes ni logs. `.env.example` contiene solo nombres y valores de muestra no sensibles. Definir acceso mínimo, rotación, respaldos, restauración y auditoría antes de producción.

Referencia de arquitectura: ADR 0013 (sustituye a ADR 0006). Todo despliegue requiere SDD y checklist operativo aprobado.
