# Aplicación móvil ARCA-NB

Prototipo móvil de la etapa **002** (spec implementada) construido con React Native y Expo Router. El mapa, el escáner QR y el recorrido 3D son pantallas visuales con datos simulados; no usan cámara, GPS, mapas reales ni renderizado 3D.

## Requisitos

### Para desarrollar y probar con un teléfono Android (recomendado)

- Windows 10/11, macOS o Linux.
- Git ([Git for Windows](https://git-scm.com/download/win) en Windows).
- Node.js **22.x** y npm, instalados desde [nodejs.org](https://nodejs.org/). La última validación de este proyecto se hizo con Node.js **22.23.2** y npm **12.2.0**; usa esas versiones si encuentras diferencias de entorno.
- Un teléfono Android conectado a la misma red Wi-Fi que la computadora.
- **Expo Go** instalado en el teléfono desde [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent).

Con Expo Go no necesitas instalar Android Studio, Android SDK, Java/JDK, Android Emulator ni Expo CLI global. Expo CLI viene como dependencia local del workspace.

### Solo para emulador o compilación nativa local (opcional)

Instala Android Studio, Android SDK, un Android Emulator y el JDK requerido por la versión de React Native/Expo del proyecto. Esta configuración no es necesaria para abrir el prototipo con Expo Go. Una compilación de distribución requiere además preparar la configuración de aplicación —incluidos iconos finales— y seguir el flujo de entrega aprobado.

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

Reemplaza `ORGANIZACION/REPOSITORIO` por la URL real; necesitarás permiso de acceso al repositorio. Verifica que Node reporte `v22.x`. npm se instala junto con Node; npm **12.2.0** es la versión usada en la última validación.

3. Instala todas las dependencias del monorepo desde la raíz:

```powershell
npm ci
```

La primera instalación requiere Internet y puede tardar unos minutos. `npm ci` usa el lockfile compartido y no modifica los manifiestos. No ejecutes `npm install` dentro de `apps\mobile`, no instales Expo CLI globalmente y no crees otro lockfile para Mobile.

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

El modo túnel necesita Internet en ambos dispositivos y puede ser más lento.

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

La spec 004 tiene sesión, registro, verificación, recuperación, edición, cambio de contraseña y borrado. Hay dos caminos. No pongas secretos en `EXPO_PUBLIC_API_URL`, no versiones `apps/mobile/.env` y no apuntes a producción ni a la base `arca_zoo`.

### Sin API: cuentas de prueba

Si `EXPO_PUBLIC_API_URL` no existe o está vacía, la app y Jest usan el repositorio simulado. Los tokens quedan en memoria. Esas cuentas no existen en la API.

- `correo@ejemplo.com` o `maria@correo.com`, contraseña `secreta`.
- Una cuenta creada en esa simulación usa el código de prueba `123456`.

### Con la API de pruebas, en cada máquina

Con la variable definida, los tokens se guardan con `expo-secure-store` y las llamadas salen por el módulo visitante de `@arca/api-client`. `usesCleartextTraffic` sigue en `false` en el build de Android. Expo Go, en desarrollo y en la misma red, usa el `http://` de abajo. Un APK compilado sigue exigiendo HTTPS.

1. En una terminal, desde `apps/api/src`, deja la API escuchando en la red. Si Windows pregunta, permite el puerto 8000 en redes privadas.

```powershell
Set-Location .\apps\api\src
php artisan serve --host=0.0.0.0 --port=8000
```

2. En `ipconfig`, copia la IPv4 del adaptador de la Wi-Fi. No uses `127.0.0.1`: en el teléfono esa dirección es el propio teléfono. Tampoco uses una tarjeta virtual (por ejemplo `192.168.56.1`).
3. Crea `apps/mobile/.env` con la IP de esa máquina. El archivo no se sube a git.

```text
EXPO_PUBLIC_API_URL=http://ESA-IP:8000/api/v1
```

Ese `/api/v1` es el de la variable, el mismo que usa el catálogo. La cuenta no lo repite.

4. Reinicia Expo. La variable se lee al arrancar: si ya estaba `npm start`, detenlo con `Ctrl+C` y vuelve a lanzarlo. El teléfono y la computadora tienen que estar en la misma red.
5. El alta real pide al menos 8 caracteres, con letras y números. El código de 6 dígitos no llega a una bandeja: con `MAIL_MAILER=log` queda en `apps/api/src/storage/logs/laravel.log`.

## Estado y límites

- Sigue la [spec 002](specs/002-mobile-ui-base-visitor-journey.md), el [plan](plan/002-mobile-ui-base-visitor-journey.md), las [tareas](tasks/002-mobile-ui-base-visitor-journey.md) y la [guía de validación](docs/002-mobile-ui-visitor-journey.md).
- Roadmap 003–008, estado de specs y asignación (Aksel / Víctor): [docs/003-008-roadmap-y-asignacion.md](docs/003-008-roadmap-y-asignacion.md).
- Consulta la [arquitectura local](docs/arquitectura.md) y el [ADR 0004](../../docs/adr/0004-mobile-react-native.md).
- Estándares de conexión y arquitectura con la API: [docs/estandares-integracion-api.md](docs/estandares-integracion-api.md).
- La identidad móvil usa los valores institucionales centralizados en `@arca/tokens` (`base`, `primary`, `secondary` y `accent`); los textos y controles conservan contraste con sus tokens de foreground. `danger` es un color semántico de estado. Los tintes `placeholderTint` de animales solo se usan como ilustración cuando falta una foto y no son colores de marca. Mobile no consulta directamente `settings_colores` ni obtiene el tema de `GET /api/theme` en esta etapa.
- Los iconos de launcher/adaptive icon aún no están definidos. `app.json` no referencia imágenes ficticias; agrega recursos PNG reales antes de preparar distribución nativa.
- Favoritos persistentes, cámara/QR real, geolocalización y 3D real quedan fuera de la etapa 002.
- Si la instalación o el arranque falla, comparte con el equipo el comando ejecutado, las versiones de `node --version` y `npm --version`, y el mensaje completo de error; no borres el lockfile ni cambies versiones para intentar resolverlo.
