# Aplicación móvil ARCA-NB

Prototipo móvil de la etapa 002 construido con React Native y Expo Router. El mapa, el escáner QR y el recorrido 3D son pantallas visuales con datos simulados; no usan cámara, GPS, mapas reales ni renderizado 3D.

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

## Estado y límites

- Sigue la [spec 002](specs/002-mobile-ui-base-visitor-journey.md), el [plan](plan/002-mobile-ui-base-visitor-journey.md), las [tareas](tasks/002-mobile-ui-base-visitor-journey.md) y la [guía de validación](docs/002-mobile-ui-visitor-journey.md).
- Consulta la [arquitectura local](docs/arquitectura.md) y el [ADR 0004](../../docs/adr/0004-mobile-react-native.md).
- Los iconos de launcher/adaptive icon aún no están definidos. `app.json` no referencia imágenes ficticias; agrega recursos PNG reales antes de preparar distribución nativa.
- Favoritos persistentes, cámara/QR real, geolocalización y 3D real quedan fuera de la etapa 002.
- Si la instalación o el arranque falla, comparte con el equipo el comando ejecutado, las versiones de `node --version` y `npm --version`, y el mensaje completo de error; no borres el lockfile ni cambies versiones para intentar resolverlo.
