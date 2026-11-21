# Requisitos para ejecutar la API

## Herramientas

- PHP 8.4 o posterior, con CLI. Comprueba la versión con `php -v` y las extensiones con `php -m`.
- Composer 2.
- MySQL 8.0.x para las verificaciones normativas de base de datos.
- Certificado CA de Aiven si se conecta al servicio Aiven.

PHP debe tener disponibles `PDO`, `pdo_mysql`, `bcmath`, `ctype`, `fileinfo`, `mbstring`, `openssl`, `tokenizer`, `xml` y las demás extensiones que comprueba Composer. Para MySQL administrado en Aiven se usa TLS con el certificado CA del servicio. En Windows, `php --ini` muestra qué `php.ini` carga la CLI.

### Fedora

Instala PHP CLI y las extensiones requeridas con los paquetes de la distribución:

```bash
sudo dnf install php-cli php-common php-pdo php-mysqlnd php-mbstring php-xml php-bcmath php-curl
```

Comprueba la versión y extensiones:

```bash
php -v
php -m | grep -iE '^(PDO|pdo_mysql|mbstring|openssl|xml|ctype|fileinfo|tokenizer|bcmath|curl)$'
composer --version
```

En otras distribuciones, instala los paquetes equivalentes para PHP CLI, PDO MySQL, mbstring, XML, bcmath y cURL. Si PHP está instalado pero `php artisan` informa `Class "PDO" not found`, falta habilitar/instalar PDO; para MySQL también se requiere `pdo_mysql`.

## Preparar la API desde un clon

Desde la raíz del repositorio, instala las dependencias PHP y crea `.env` si falta:

```bash
cd apps/api/src
composer install
test -f .env || cp .env.example .env
composer check-platform-reqs
```

En PowerShell, desde `apps/api/src`, el equivalente de la copia es `if (-not (Test-Path .env)) { Copy-Item .env.example .env }`.

1. Configura `DB_CONNECTION=mysql`, `DB_HOST`, `DB_PORT`, `DB_DATABASE=arca_pruebas`, `DB_USERNAME` y `DB_PASSWORD`. Pide al equipo el acceso y una base preparada. Para Aiven, añade en `DB_SSL_CA` la ruta absoluta del certificado CA. Para MySQL local, usa el host y puerto de esa instancia, y deja `DB_SSL_CA` vacía si no usa TLS.
2. En una instalación nueva con `APP_KEY` vacía, ejecuta `php artisan key:generate`. Conserva la clave si la instalación ya está en uso.
3. Define `APP_URL` con el origen que abrirá el teléfono, sin `/api/v1`. Para un equipo en la red local puede ser `http://192.168.1.50:8000`. Si cambias la configuración, ejecuta `php artisan config:clear` antes de reiniciar el proceso.
4. Configura los discos de medios según los datos del entorno. Cuando el catálogo usa las fotos de prueba incluidas en Git, deja una asignación efectiva por variable y usa `PUBLIC_MEDIA_DISK=media` y `PRIVATE_MEDIA_DISK=media`. Con `MEDIA_PUBLIC_URL` vacía, las fotos salen de `APP_URL` más `/media`. El disco `public` usa `/storage` y necesita los archivos de su propio volumen.
5. Ejecuta la comprobación de solo lectura y crea los enlaces locales de medios:

```bash
php artisan db:show
php artisan migrate:status
php artisan storage:link
```

Si falta el esquema, hay migraciones pendientes o faltan datos, pide al equipo que prepare esa base según el [flujo de base de datos](../../../docs/database/README.md). Para comprobar logros y misiones, confirma con el responsable del ambiente que se cargaron `AchievementSeeder` y `MissionSeeder`. Para el flujo QR necesitas un recinto activo con un código vigente. Guarda `.env`, claves y credenciales fuera de Git.

La cuenta de MySQL que usa Laravel necesita los permisos operativos del ambiente para registrar visitantes y guardar descubrimientos. El teléfono se conecta a Laravel. Las credenciales de MySQL se configuran en el servidor de la API.

## Elegir cómo atender al teléfono

| Caso | Cómo se sirve | Origen para el teléfono |
|---|---|---|
| Android Emulator y API en la misma máquina | `php artisan serve --host=127.0.0.1 --port=8000` | `http://10.0.2.2:8000` desde Android Emulator. |
| Teléfono físico y API en la misma red privada | `php artisan serve --host=0.0.0.0 --port=8000` | IPv4 de la computadora que ejecuta Laravel, por ejemplo `http://192.168.1.50:8000`. Permite el puerto en la red privada si el firewall lo bloquea. |
| API en un servidor compartido o accesible desde otra red | Servidor web con raíz en `apps/api/src/public`, HTTPS con certificado confiable, acceso de PHP a `storage` y `bootstrap/cache`, y `APP_DEBUG=false`. | Dominio HTTPS accesible desde el dispositivo, por ejemplo `https://api.example.org`. Usa ese mismo origen en `APP_URL`. |

El servidor integrado de Artisan sirve para la sesión local o en red privada. Para el servidor compartido, revisa el [checklist de infraestructura](../../../infra/README.md) para permisos, persistencia de archivos, límites de subida y servicios auxiliares.

## Comprobar antes de abrir Expo

Desde el equipo que ejecuta Laravel puedes usar `127.0.0.1`. Desde el teléfono usa el origen que corresponda de la tabla anterior. Estos ejemplos están escritos para Bash. En PowerShell, sustituye `curl` por `curl.exe` y define el valor con `$ApiOrigin = 'http://127.0.0.1:8000'`.

```bash
ApiOrigin=http://127.0.0.1:8000
curl -fsS -o /dev/null "$ApiOrigin/up"
curl -fsS "$ApiOrigin/api/v1/species"
curl -fsS "$ApiOrigin/api/v1/published-species"
curl -fsS "$ApiOrigin/api/v1/enclosures"
```

En Windows, puedes abrir `/up` en el navegador o usar `curl.exe -fsS -o NUL "$ApiOrigin/up"`. `/up` comprueba que Laravel responde. Los recursos bajo `/api/v1` deben responder `200` con JSON y comprueban también la lectura de datos. Si necesitas ver animales en la colección, confirma que haya especies publicadas vinculadas a animales visitables en recintos activos. Abre una `image_url` no vacía del catálogo desde el teléfono para comprobar que su host y el enlace de medios son accesibles.

Para probar el registro, usa una cuenta de prueba y el [flujo de correo del visitante](visitante-autenticacion.md). El paso de Expo y la selección de `EXPO_PUBLIC_API_URL` están en la [guía móvil](../../mobile/README.md).
