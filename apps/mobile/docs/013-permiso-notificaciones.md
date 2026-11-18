# Permiso de avisos en la app del visitante

La app pide el permiso de Android al encender «Noticias y eventos» o «Estado de mis momentos», y también al entrar con sesión si el segundo ya está encendido.

En Android 13 o superior esa petición es el diálogo del sistema. En versiones anteriores el permiso viene con la instalación y no se muestra otro diálogo. El permiso del manifiesto es `POST_NOTIFICATIONS`.

Si la persona lo niega, Ajustes muestra: «Los avisos del sistema están apagados. Actívalos en los ajustes del teléfono.» La preferencia de la cuenta no cambia y no se registra el teléfono.

Hay dos canales: «Noticias y eventos» (`news-and-events`) y «Momentos» (`memories`). El título y el cuerpo llegan en el aviso; la app no los reescribe. El icono del aviso es la silueta blanca de `src/assets/icon/iconZoo.png`, teñida en vino. El icono de la app es el archivo a color y el nombre visible es ARCA-NB.

Al tocar un aviso de momento, la app abre `/memory-form` con ese id. Espera la lista («Buscando tu memoria…») si esa petición aún no está en memoria. Si la lista la trae, se ve la ficha o la corrección. Si no, la pantalla «Tu memoria» dice que no está en la cuenta, o pide reintentar si la lectura falló. No hay otra bandeja de avisos.

El push no funciona en Expo Go. La barra con la app cerrada se comprueba en un APK de distribución, con las credenciales de FCM fuera del repositorio. El archivo es `google-services.json` en `apps/mobile` (no se versiona) o la variable `GOOGLE_SERVICES_JSON`. Sin ese archivo el build no obtiene token. La API, la cola y la preferencia que deben estar activas están en `apps/api/docs/visitante-push.md`.

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
