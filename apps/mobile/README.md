# Aplicación móvil ARCA-NB

Aplicación móvil del visitante, en React Native y Expo Router. `EXPO_PUBLIC_API_URL` indica a qué API se conecta el teléfono para usar el catálogo, la cuenta, el progreso, los favoritos y las memorias. Si es tu primer arranque, instala el workspace, elige una API y luego abre Expo Go.

## Requisitos

### Para desarrollar y probar con un teléfono Android (recomendado)

- Windows 10/11, macOS o Linux.
- Git ([Git for Windows](https://git-scm.com/download/win) en Windows).
- Node.js **22.x** y npm, instalados desde [nodejs.org](https://nodejs.org/).
- Un teléfono Android conectado a la misma red Wi-Fi que la computadora.
- **Expo Go** instalado en el teléfono desde [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).

Con Expo Go no necesitas instalar Android Studio, Android SDK, Java/JDK, Android Emulator ni Expo CLI global. Expo CLI viene como dependencia local del workspace.

### Solo para emulador o compilación nativa local (opcional)

Instala Android Studio, Android SDK, un Android Emulator y el JDK requerido por la versión de React Native/Expo del proyecto. Esta configuración no es necesaria para abrir el prototipo con Expo Go. El icono de launcher y la silueta del aviso ya están en `src/assets/icon/`. Una compilación de distribución sigue el flujo de entrega aprobado; la spec 008 permanece en borrador.

La app usa Expo SDK **57**, Expo Router **57** y React Native **0.86.3**. La versión de Expo Go debe ser compatible con SDK 57. Si la aplicación Expo Go instalada no admite ese SDK, no cambies las dependencias por tu cuenta: revisa con el equipo si corresponde usar un development build o actualizar el SDK de forma coordinada.

## Instalación desde un clon limpio

1. Instala Git y Node.js 22.x. Cierra y vuelve a abrir PowerShell después de instalar Node.
2. Clona el repositorio usando la URL y el nombre real que te haya compartido el equipo:

```powershell
git clone https://github.com/ORGANIZACION/REPOSITORIO.git
Set-Location .\REPOSITORIO
node --version
npm --version
```

Reemplaza `ORGANIZACION/REPOSITORIO` por la URL real. Necesitarás permiso de acceso al repositorio. Verifica que Node reporte `v22.x` y que npm esté disponible.

3. Instala todas las dependencias del monorepo desde la raíz:

```powershell
npm ci
```

La primera instalación requiere Internet y puede tardar unos minutos. `npm ci` usa el lockfile compartido y no modifica los manifiestos. No ejecutes `npm install` dentro de `apps\mobile`, no instales Expo CLI globalmente y no crees otro lockfile para Mobile.

Si PowerShell bloquea `npm.ps1`, usa `npm.cmd` en los comandos de esta guía.

## Conectar la API

Si ya te compartieron una API accesible, usa su dirección. Si necesitas arrancar Laravel, sigue [Requisitos y arranque de la API](../api/docs/requisitos-entorno.md). Allí se explica qué acceso a base de datos debes pedir, cómo preparar las fotos y cómo iniciar en cada caso.

Crea `apps/mobile/.env` y elige **una** de estas direcciones como valor de `EXPO_PUBLIC_API_URL`:

| Dónde corre la API | Valor de ejemplo |
|---|---|
| En una computadora de la misma red que el teléfono | `http://192.168.1.50:8000/api/v1`. Sustituye la IP por la IPv4 del equipo que corre Laravel. En Windows, `ipconfig` muestra la del adaptador Wi-Fi activo. |
| En la misma computadora que Android Emulator | `http://10.0.2.2:8000/api/v1`. Esa dirección enlaza el emulador con su computadora. |
| En un servidor compartido | `https://api.example.org/api/v1`. Sustituye el dominio por el que te compartieron. |

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.50:8000/api/v1
```

Desde un teléfono físico, `localhost` y `127.0.0.1` apuntan al propio teléfono. Usa la IP del servidor y evita adaptadores virtuales. El valor termina en `/api/v1` una sola vez. Mantén el archivo fuera de Git y deja credenciales y tokens fuera de las variables `EXPO_PUBLIC_*`.

Antes de iniciar Expo, abre en el navegador del teléfono el origen seguido de `/up` y luego el recurso `/api/v1/published-species`. El primero confirma que Laravel responde. El segundo debe devolver JSON. Un catálogo vacío puede ser un problema de datos. Para ver un animal en la Colección necesita estar publicado y tener un animal visitable en un recinto activo.

## Iniciar en Android con Expo Go

1. Instala y abre **Expo Go** en el teléfono Android.
2. En PowerShell, desde la raíz del repositorio, inicia el servidor de desarrollo:

```powershell
Set-Location .\apps\mobile
npm start
```

3. Permite Node.js/Metro en el firewall si Windows lo solicita y confirma que teléfono y computadora estén en la misma red.
4. Escanea con Expo Go el QR que aparece en la terminal o en la página local que abra Expo. Mantén la terminal abierta mientras pruebas.
5. Para detener el servidor, vuelve a esa terminal y presiona `Ctrl+C`.

Si la red local impide la conexión, detén el servidor con `Ctrl+C` y prueba el túnel:

```powershell
npx expo start --tunnel
```

El túnel conecta Expo Go con Metro. La API debe seguir siendo accesible desde el teléfono por su propia dirección. Después de cambiar `apps/mobile/.env`, reinicia Expo y vuelve a abrir la app. Si conserva la dirección anterior, inicia Metro con `npm start -- --clear`.

## Comprobación rápida

| Síntoma | Qué comprobar |
|---|---|
| Expo Go no abre el proyecto | Que la versión instalada admita SDK 57 y que Expo Go llegue a Metro por la misma red o por su túnel. |
| El proyecto abre, pero el catálogo no carga | Desde el teléfono, comprueba `/up`, `/api/v1/species`, `/api/v1/published-species` y `/api/v1/enclosures`. Si `/up` funciona y los recursos del catálogo devuelven 500, revisa la conexión y el esquema de la API. |
| Aparecen animales, pero faltan fotos | Abre una `image_url` desde el teléfono. Si apunta a otro host, revisa `APP_URL` y `MEDIA_PUBLIC_URL` en Laravel. Si devuelve 404, revisa el disco, el enlace creado con `storage:link` y que el archivo exista en el servidor. |
| La cuenta no se verifica | Revisa el envío configurado en la API. En una instalación de prueba con `MAIL_MAILER=log` y el canal predeterminado, el correo aparece en `apps/api/src/storage/logs/laravel.log`. |

## Avisos push

Expo Go no muestra estos avisos. Hace falta el APK del perfil `preview`, `google-services.json` fuera del repositorio y la API con la cola encendida. Ese APK no usa el `.env` local: la URL se guarda en el entorno `preview` de EAS. Los comandos están en [docs/013-permiso-notificaciones.md](docs/013-permiso-notificaciones.md). La cola está en [apps/api/docs/visitante-push.md](../api/docs/visitante-push.md).

## Emulador Android (opcional)

Después de instalar Android Studio, Android SDK, JDK y crear/iniciar un emulador, ejecuta desde `apps\mobile`:

```powershell
npm run android
```

Este comando puede generar/configurar el proyecto nativo local y requiere que el entorno Android esté correctamente configurado. Para el flujo sencillo del prototipo, usa Expo Go en un teléfono.

## Pruebas y verificaciones

Desde `apps/mobile`:

```powershell
npm test -- --runInBand
npm run test:coverage -- --runInBand
npx tsc --noEmit
npx expo install --check
npx expo export --platform android
```

Los botones de simulación QR solo aparecen en desarrollo. Los archivos de salida de cobertura y exportación (`coverage/` y `dist/`) son generados localmente y no deben versionarse.

Las pruebas, el chequeo de tipos y la exportación JavaScript no necesitan teléfono Android. La exportación de Metro no equivale a compilar ni instalar un APK.

## Cuenta del visitante

La spec 004 tiene sesión, registro, verificación, recuperación, edición, cambio de contraseña y borrado. Usa una cuenta de visitante del ambiente que vas a probar. El [contrato de autenticación](../api/docs/visitante-autenticacion.md) describe el correo y la recuperación.

### Sin API

Si `EXPO_PUBLIC_API_URL` no existe o está vacía, la cuenta usa el repositorio simulado y guarda sus tokens en memoria. El alta y la recuperación reales requieren la API. Para previsualizar también el catálogo con datos simulados, usa `EXPO_PUBLIC_USE_MOCKS=true`; quita esa variable al volver al catálogo real.

### Con una API conectada

Metro carga `apps/mobile/.env` al preparar el paquete que abre Expo Go. La cuenta guarda los tokens con `expo-secure-store`. En el APK del perfil `preview`, la URL se incorpora desde el entorno `preview` de EAS y se permite HTTP para pruebas en la red local. Los demás APK usan HTTPS. Cambiar la URL de un APK ya compilado requiere otra compilación.

Para probar un flujo completo, abre una ficha y su foto, inicia sesión con un visitante verificado y escanea el QR de un recinto con un animal visitable. Comprueba la colección y el progreso de esa cuenta. Para probar avisos, sigue el apartado de push.

## Estado y límites

- Sigue la [spec 002](specs/002-mobile-ui-base-visitor-journey.md), el [plan](plan/002-mobile-ui-base-visitor-journey.md), las [tareas](tasks/002-mobile-ui-base-visitor-journey.md) y la [guía de validación](docs/002-mobile-ui-visitor-journey.md).
- Roadmap 003–008, estado de specs: [docs/003-008-roadmap-y-asignacion.md](docs/003-008-roadmap-y-asignacion.md).
- Consulta la [arquitectura local](docs/arquitectura.md) y el [ADR 0004](../../docs/adr/0004-mobile-react-native.md).
- Estándares de conexión y arquitectura con la API: [docs/estandares-integracion-api.md](docs/estandares-integracion-api.md).
- La identidad móvil usa los valores institucionales centralizados en `@arca/tokens` (`base`, `primary`, `secondary` y `accent`); los textos y controles conservan contraste con sus tokens de foreground. `danger` es un color semántico de estado. Los tintes `placeholderTint` de animales solo se usan como ilustración cuando falta una foto y no son colores de marca. Mobile no consulta directamente `settings_colores` ni obtiene el tema de `GET /api/theme`.
- El icono de la app es `src/assets/icon/iconZoo.png`. El aviso usa la misma figura en blanco (`src/assets/icon/notification.png`), porque Android solo dibuja una silueta en la barra. El nombre visible es ARCA-NB.
- El avatar del perfil es uno de los ocho PNG de `src/assets/avatars/`, nombrados con el código (`jaguar`, `lion`, `elephant`, `macaw`, `monkey`, `turtle`, `deer`, `wolf`). Perfil, edición de cuenta y el selector muestran esa imagen. No se sube una foto propia.
- El catálogo del visitante muestra una especie solo si está publicada y algún animal de un recinto puede recibir visitas. Inicio, Colección y Perfil cuentan esa lista, no el total crudo de `GET /species`.
- Favoritos: el corazón y «Animales favoritos» salen de la cuenta. Sin red se muestra la última copia.
- Memorias: la entrada en Perfil se llama «Mis momentos». Con una petición abierta no hay alta nueva; al tocarla se ve lo enviado y el estado, sin editar. El límite semanal dice «otro momento».
- Ajustes: cámara y ubicación piden el permiso del teléfono. Para quitarlos se abren los ajustes del sistema.
- El mapa (007) y el recorrido 3D (009) siguen abiertos. Esta nota no los cierra. La distribución (008) sigue en borrador.
- Si la instalación o el arranque falla, comparte con el equipo el comando ejecutado, las versiones de `node --version` y `npm --version`, y el mensaje completo de error; no borres el lockfile ni cambies versiones para intentar resolverlo.
