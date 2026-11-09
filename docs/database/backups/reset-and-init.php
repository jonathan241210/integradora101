<?php

/**
 * Script para inicializar de forma limpia la base de datos de ARCA-NB.
 * 1. Vacía las tablas que hayan quedado a medias.
 * 2. Carga el baseline de 16 tablas en español (esquema-inicial-base.sql).
 * 3. Deja la base lista para ejecutar `php artisan migrate`.
 * 
 * Uso:
 *   php docs/database/backups/reset-and-init.php
 *   o desde apps/api/src:
 *   php ../../docs/database/backups/reset-and-init.php
 */

declare(strict_types=1);

$rootDir = dirname(__DIR__, 2);
if (!file_exists($rootDir . '/apps/api/src/.env')) {
    $rootDir = dirname(__DIR__, 3);
}

$envFile = $rootDir . '/apps/api/src/.env';
$schemaFile = $rootDir . '/docs/database/esquema-inicial-base.sql';

echo "========================================================\n";
echo " ARCA-NB · Inicialización de Base Limpia en Aiven\n";
echo "========================================================\n";

if (!file_exists($envFile)) {
    echo "[-] No se encontró el archivo .env en {$envFile}\n";
    exit(1);
}

if (!file_exists($schemaFile)) {
    echo "[-] No se encontró el archivo de esquema inicial en {$schemaFile}\n";
    exit(1);
}

// 1. Leer .env
$envLines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
$env = [];
foreach ($envLines as $line) {
    $line = trim($line);
    if ($line === '' || str_starts_with($line, '#')) continue;
    if (str_contains($line, '=')) {
        [$k, $v] = explode('=', $line, 2);
        $k = trim($k);
        $v = trim($v);
        if ((str_starts_with($v, '"') && str_ends_with($v, '"')) ||
            (str_starts_with($v, "'") && str_ends_with($v, "'"))) {
            $v = substr($v, 1, -1);
        }
        $env[$k] = $v;
    }
}

$host = $env['DB_HOST'] ?? '127.0.0.1';
$port = (int) ($env['DB_PORT'] ?? 3306);
$database = $env['DB_DATABASE'] ?? 'arca_pruebas';
$username = $env['DB_USERNAME'] ?? 'avnadmin';
$password = $env['DB_PASSWORD'] ?? '';
$sslCa = $env['DB_SSL_CA'] ?? null;

echo "[*] Conectando a {$host}:{$port} -> base '{$database}'...\n";

$dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

if (!empty($sslCa)) {
    $resolvedSslCa = $sslCa;
    if (!file_exists($resolvedSslCa)) {
        $candidate = $rootDir . '/apps/api/src/' . $sslCa;
        if (file_exists($candidate)) $resolvedSslCa = $candidate;
        elseif (file_exists($rootDir . '/' . $sslCa)) $resolvedSslCa = $rootDir . '/' . $sslCa;
    }
    if (file_exists($resolvedSslCa)) {
        $options[PDO::MYSQL_ATTR_SSL_CA] = $resolvedSslCa;
        echo "[*] Certificado SSL: {$resolvedSslCa}\n";
    }
}

try {
    $pdo = new PDO($dsn, $username, $password, $options);
} catch (PDOException $e) {
    echo "[-] Error de conexión: " . $e->getMessage() . "\n";
    exit(1);
}

echo "[+] Conexión exitosa.\n";

// 2. Limpiar tablas existentes
echo "[*] Limpiando tablas parciales existentes...\n";
$pdo->exec("SET FOREIGN_KEY_CHECKS = 0;");

$tablesStmt = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
$tables = [];
while ($row = $tablesStmt->fetch(PDO::FETCH_NUM)) {
    $tables[] = $row[0];
}

foreach ($tables as $t) {
    $pdo->exec("DROP TABLE IF EXISTS `{$t}`;");
    echo " -> Eliminada tabla previa: `{$t}`\n";
}

echo "[+] Base de datos vaciada por completo.\n";

// 3. Cargar las 16 tablas base en español
echo "[*] Creando las 16 tablas iniciales del zoológico...\n";
$sqlContent = file_get_contents($schemaFile);
$pdo->exec($sqlContent);

$pdo->exec("SET FOREIGN_KEY_CHECKS = 1;");

echo "[+] ¡Las 16 tablas base han sido creadas con éxito!\n";
echo "========================================================\n";
echo "[✓] LISTO: Ahora ejecuta en tu terminal:\n";
echo "    php artisan migrate\n";
echo "    php artisan db:seed\n";
echo "========================================================\n";
