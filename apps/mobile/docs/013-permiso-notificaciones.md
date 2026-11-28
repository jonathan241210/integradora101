# Permiso de avisos en la app del visitante

La app pide el permiso de Android al encender «Noticias y eventos» o «Estado de mis momentos», y también al entrar con sesión si el segundo ya está encendido.

En Android 13 o superior esa petición es el diálogo del sistema. En versiones anteriores el permiso viene con la instalación y no se muestra otro diálogo. El permiso del manifiesto es `POST_NOTIFICATIONS`.

Si la persona lo niega, Ajustes muestra: «Los avisos del sistema están apagados. Actívalos en los ajustes del teléfono.» La preferencia de la cuenta no cambia y no se registra el teléfono.

Hay dos canales: «Noticias y eventos» (`news-and-events`) y «Momentos» (`memories`). El título y el cuerpo llegan en el aviso; la app no los reescribe. El icono del aviso es la silueta blanca de `src/assets/icon/iconZoo.png`, teñida en vino. El icono de la app es el archivo a color y el nombre visible es ARCA-NB.

Al tocar un aviso de momento, la app abre `/memory-form` con ese id. Espera la lista («Buscando tu momento…») si esa petición aún no está en memoria. Si la lista la trae, se ve la ficha o la corrección. Si no, la pantalla «Tu momento» dice que no está en la cuenta, o pide reintentar si la lectura falló. No hay otra bandeja de avisos.

El push no funciona en Expo Go. La barra con la app cerrada se comprueba en un APK de distribución. La cuenta de Expo, la credencial de FCM y el token de la API están en la sección siguiente. La cola y la preferencia que deben estar activas están en `apps/api/docs/visitante-push.md`.

## Organización de Expo

El proyecto de EAS pertenece a la organización `arca-nb`. En `apps/mobile/app.json`, `owner` es `arca-nb` y `extra.eas.projectId` es `712699fa-120d-4ae2-b1f0-ae6304c2fec2`. Esos dos valores se conservan. Crear otro proyecto de EAS deja sin efecto los tokens que la API ya guardó.

Quien configura o compila inicia sesión con su propia cuenta de Expo, invitada en Members de `arca-nb` como miembro o developer. No se comparte la contraseña de una cuenta personal.

La credencial de Firebase se sube a ese mismo proyecto. En el repositorio no entra: el archivo es `apps/mobile/google-services.json` (está en `.gitignore`) o la variable `GOOGLE_SERVICES_JSON`.

`EXPO_ACCESS_TOKEN`, en el `.env` de la API, es un token de acceso de la organización `arca-nb`. No se versiona. Con `PUSH_ENABLED=true`, `EXPO_PUSH_URL`, `php artisan queue:work` y `php artisan schedule:run` cada minuto, el envío queda como lo describe `apps/api/docs/visitante-push.md`.

## APK de prueba

Expo Go lee `apps/mobile/.env`. El APK no: el perfil `preview` de `apps/mobile/eas.json` usa el entorno `preview` de EAS y deja `EXPO_USE_CLEARTEXT=true`, así que ese APK puede llamar a la API por HTTP en la red local. `usesCleartextTraffic` sigue en `false` en cualquier otro build.

Desde `apps/mobile`, con la IPv4 de la Wi-Fi de la máquina donde corre `php artisan serve --host=0.0.0.0 --port=8000`. No uses `127.0.0.1`.

```powershell
npx eas-cli env:create preview --name EXPO_PUBLIC_API_URL --value http://IP-LAN:8000/api/v1 --type string --visibility plaintext
npx eas-cli build -p android --profile preview
```

`EXPO_PUBLIC_API_URL` no es un secreto: es la dirección que el teléfono ya va a usar. No pongas tokens ni contraseñas en `plaintext`. Si la variable ya existe, no la vuelvas a crear: actualízala. El valor queda dentro del APK, así que un cambio de IP o de servidor exige otra compilación.

Ese perfil es solo para probar contra la API de esta red, en `arca_pruebas`. No apunta a `arca_zoo`.

## Cuando la API esté en un servidor

La URL del APK pasa a ser la HTTPS de ese servidor, por ejemplo `https://servidor.ejemplo/api/v1`. El perfil `preview` no sirve para ese caso: abre el tráfico sin cifrar. Hoy `eas.json` no tiene otro perfil. El canal de producción, Play Store de pruebas o APK público, sigue en la spec `008`, que está en borrador. Hasta que esa spec cierre, no se agrega un perfil de producción ni se publica el APK.
