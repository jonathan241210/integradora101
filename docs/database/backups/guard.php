<?php

/**
 * api-028 CA-13: guarda común de los scripts destructivos (`reset-and-init.php`, `restore.php`).
 *
 * - Bloquea producción (`APP_ENV=production`) y la base `arca_zoo` sin conectarse.
 * - En cualquier otra base exige escribir su nombre para confirmar.
 * Las variables del proceso (`DB_DATABASE`, `APP_ENV`) tienen prioridad sobre `.env`.
 */

declare(strict_types=1);

/**
 * @param  array<string,string>  $env
 * @return array<string,string>
 */
function arcaApplyProcessEnv(array $env): array
{
    foreach (['DB_DATABASE', 'APP_ENV'] as $key) {
        $value = getenv($key);
        if ($value !== false && $value !== '') {
            $env[$key] = $value;
        }
    }

    return $env;
}

/**
 * Devuelve el motivo del bloqueo o null si la base destino puede continuar a la confirmación.
 *
 * @param  array<string,string>  $env
 */
function arcaBlockedReason(array $env): ?string
{
    if (strtolower($env['APP_ENV'] ?? '') === 'production') {
        return 'APP_ENV=production: este script no se ejecuta en producción.';
    }

    if (($env['DB_DATABASE'] ?? '') === 'arca_zoo') {
        return 'DB_DATABASE=arca_zoo es la base de producción: este script no se ejecuta contra ella.';
    }

    return null;
}

/**
 * Termina el proceso con código 1 si el destino está bloqueado o si no se confirma el nombre de la base.
 *
 * @param  array<string,string>  $env
 * @param  resource|null  $input  Flujo de confirmación (por defecto STDIN).
 */
function arcaGuardDestructiveTarget(array $env, string $action, $input = null): void
{
    $reason = arcaBlockedReason($env);
    if ($reason !== null) {
        fwrite(STDERR, "[-] Bloqueado: {$reason}\n");
        exit(1);
    }

    $database = $env['DB_DATABASE'] ?? '';
    if ($database === '') {
        fwrite(STDERR, "[-] Bloqueado: DB_DATABASE no está definido.\n");
        exit(1);
    }

    echo "[!] Vas a {$action} en la base '{$database}'.\n";
    echo "    Escribe el nombre de la base para confirmar: ";
    $line = fgets($input ?? STDIN);

    if ($line === false || trim($line) !== $database) {
        fwrite(STDERR, "\n[-] Confirmación incorrecta. No se tocó la base.\n");
        exit(1);
    }
}
