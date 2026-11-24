# Avisos push del visitante

La API decide si un aviso corresponde y redacta el texto. El teléfono solo lo muestra.

Rutas, con sesión de visitante y correo verificado:

- `PUT /api/v1/visitor/push-tokens` registra el teléfono Android. El mismo token deja una sola fila.
- `DELETE /api/v1/visitor/push-tokens` da de baja ese teléfono.
- `GET /api/v1/visitor/notification-preferences` lee las dos preferencias. Sin fila, noticias y eventos están apagados y el estado del momento está encendido.
- `PATCH /api/v1/visitor/notification-preferences` guarda una o las dos.

El token no se escribe en logs ni en `GET /api/v1/visitor/me`. `EXPO_ACCESS_TOKEN` vive solo en `.env`.

El envío usa la cola `database`. Publicar una noticia, publicar un evento o aceptar o rechazar un momento no espera al proveedor. Cada noticia y cada evento se avisan una sola vez. Un momento se avisa al aceptarlo y al rechazarlo.

Sin un worker de `php artisan queue:work` y sin `php artisan schedule:run` cada minuto, el aviso queda en la cola o espera a la hora siguiente. El contenido sí queda guardado.

## Qué hay que tener encendido para ver un aviso

Esto vale igual si la API corre en la máquina o dentro de un contenedor. El repositorio no trae `docker-compose` (`infra/README.md`). Un contenedor propio no sustituye estos procesos: hay que repetirlos con el mismo `.env`.

No ejecutes `php artisan migrate` contra `arca_pruebas` ni contra `arca_zoo`. Esas bases las cambia solo el responsable de BD. DBR-017 ya está aplicada en `arca_pruebas`. La cola usa la tabla `jobs`. Si apuntas la API a otra base y faltan `visitor_notification_preferences`, `visitor_push_tokens`, `push_dispatches` o `jobs`, el aviso no se encola: avisa a quien administra esa base.

1. En `apps/api/src/.env`, deja `QUEUE_CONNECTION=database`. Para que el worker llame a Expo, `PUSH_ENABLED=true`. Con `false` (el valor del ejemplo) el job marca el despacho como `sent` y no hay HTTP: esa noticia o ese evento no se vuelven a encolar. Enciende la bandera antes de publicar lo que quieres ver en el teléfono. `EXPO_PUSH_URL` puede quedarse en `https://exp.host/--/api/v2/push/send`. `EXPO_ACCESS_TOKEN` solo si el proyecto de Expo te dio uno; no lo versiones. `PUSH_CA_BUNDLE` queda vacío salvo que el worker falle al verificar HTTPS (en Windows, cURL 60): entonces pon la ruta absoluta de un `cacert.pem`.
2. Reinicia `php artisan serve` y el worker después de cambiar `.env`. Si habías corrido `php artisan config:cache`, ejecuta `php artisan config:clear` antes.
3. Desde `apps/api/src`, en una terminal distinta de la del servidor:

```bash
php artisan queue:work
```

4. En otra terminal, cada minuto:

```bash
php artisan schedule:run
```

Ese programador dispara `push:dispatch-visible-content` una vez por hora (`routes/console.php`). Publicar desde el dashboard, o aceptar o rechazar un momento, ya encola el job en ese momento: con el worker en marcha no hace falta esperar a la hora. El comando horario solo recorre noticias y eventos visibles que todavía no tienen fila en `push_dispatches`.

Si la API está en un contenedor, esos dos comandos corren en ese mismo entorno, con el `.env` de arriba. El contenedor tiene que poder abrir HTTPS hacia `EXPO_PUSH_URL`. El teléfono no llama a `localhost` de dentro del contenedor: usa la IP y el puerto que el contenedor publica en la red local.

## Qué tiene que cumplir el teléfono

Expo Go no recibe estos avisos. Hace falta el APK del perfil `preview`. Ese build no lee `apps/mobile/.env`: la URL se crea en el entorno `preview` de EAS y queda dentro del APK. Los comandos, y la diferencia con un servidor HTTPS, están en `apps/mobile/docs/013-permiso-notificaciones.md`. Las credenciales FCM no van en el repositorio: `apps/mobile/google-services.json` está en `.gitignore`, o se pasa con `GOOGLE_SERVICES_JSON` (`apps/mobile/app.config.js`). Sin ese archivo el build no obtiene token.

La API debe escuchar en `0.0.0.0` o publicar ese puerto. La URL no es `127.0.0.1`.

La cuenta del visitante tiene el correo verificado. En Ajustes, «Noticias y eventos» nace apagado: hay que encenderlo y aceptar el permiso del sistema para que el teléfono se registre. «Estado de mis momentos» nace encendido y, con sesión, también pide el permiso. Si la persona lo niega, no hay registro y no llega nada.

## Cómo comprobarlo

- Noticia o evento: publícalo visible desde el dashboard. El título del aviso es el de la ficha. El cuerpo es «Hay una noticia nueva.» o «Hay un evento nuevo.». Solo lo reciben cuentas con «Noticias y eventos» encendido y un token Android.
- Momento: acéptalo o recházalo en el dashboard. Lo recibe el autor si «Estado de mis momentos» sigue encendido. Aceptado: «Tu momento fue aceptado». Rechazado: «Tu momento no se publicó».
- Tocar el aviso abre el detalle de la noticia o del evento, o la petición del momento. Si la ficha ya no existe, la app dice «Ya no está disponible.» y se queda en el inicio.
- Si no llega nada, mira `push_dispatches.status`, la tabla `jobs` y el log de Laravel. El trabajo registra si el envío estaba deshabilitado, si no había destinos elegibles o cuántos avisos pidió enviar. El proveedor registra conteos de tickets aceptados, rechazados y sin confirmación. Un ticket aceptado aún requiere comprobar la recepción en Android. Un despacho `sent` se da por procesado y no se reintenta. Para verificar una suscripción recién activada, publica una noticia o un evento nuevo y vigente.
