# Requisitos para ejecutar la API

## Herramientas

- PHP 8.2 o posterior, con CLI.
- Composer 2.
- MySQL 8.0.x para las verificaciones normativas de base de datos.
- Certificado CA de Aiven si se conecta al servicio Aiven.

La conexión actual usa PDO MySQL sobre TLS. PHP debe tener disponibles las extensiones `PDO` y `pdo_mysql`. Laravel también requiere `bcmath`, `ctype`, `fileinfo`, `json`, `mbstring`, `openssl`, `pcre`, `tokenizer`, `xml` y `curl`. `json`, `pcre` y `curl` pueden estar integradas o no ser necesarias en todas las instalaciones; `php artisan about` ayuda a detectar extensiones faltantes.

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

## Configuración local y conexión

Desde la raíz del repositorio:

```bash
cd apps/api/src
composer install
cp .env.example .env
php artisan key:generate
```

`key:generate` configura la clave de cifrado local requerida por Laravel. Edita `apps/api/src/.env` con las credenciales entregadas por el equipo y la ruta absoluta al certificado CA. No incluyas `.env`, credenciales ni el certificado privado en commits. Después verifica la conexión sin alterar el esquema:

```bash
php artisan db:show
```

No ejecutes `php artisan migrate` en Aiven como parte de esta comprobación: los cambios de esquema requieren DBR aprobada y coordinación con el responsable de BD. La política del proyecto fija MySQL 8.0.x; Aiven puede reportar una versión distinta, por lo que la conexión a Aiven por sí sola no prueba compatibilidad con MySQL 8.0.x.
