# Tareas · 002 · initial-db-connection

- Spec: `apps/api/specs/002-initial-db-connection.md`
- Plan: `apps/api/plan/002-initial-db-connection.md`
- Estado del checklist: Aprobado por Victor Adrian, 2026-10-11

## Preparación de seguridad

- [x] **T-01** (CA-04): verificar que `apps/api/src/.gitignore` excluye `.env` y `*.pem`; si no existe el archivo todavía, se creará en T-02 junto con el proyecto Laravel (que lo incluye por defecto). Agregar `ca.pem` y `*.pem` explícitamente.

## Inicialización de Laravel

- [x] **T-02** (CA-05): ejecutar `composer create-project laravel/laravel:^12.0 .` dentro de `apps/api/src/` para inicializar el proyecto Laravel 12. Verificar que `php artisan about` responde sin error.

## Configuración de conexión

- [x] **T-03** (CA-01): crear/actualizar `apps/api/src/.env.example` con las claves de conexión Aiven (host, puerto y base de datos con valores reales; `DB_PASSWORD` vacío; `DB_SSL_CA` con ruta de ejemplo). Ver plantilla en el plan.
- [x] **T-04** (CA-02): ajustar `apps/api/src/config/database.php` — añadir clave `options` con `PDO::MYSQL_ATTR_SSL_CA => env('DB_SSL_CA')` en la conexión `mysql`.

## Configuración local de Victor Adrian (responsable de BD)

- [x] **T-05** (CA-02): Victor Adrian descarga `ca.pem` del panel de Aiven, lo guarda en una ruta local fuera del repo (p. ej. `~/.arca/ca.pem`) y crea `apps/api/src/.env` copiando `.env.example` con sus credenciales (`avnadmin`, contraseña real, ruta al `ca.pem`).
- [x] **T-06** (CA-02): ejecutar `php artisan db:show` desde `apps/api/src/` y confirmar que conecta sin error. Si falla, revisar SSL, host, puerto y credenciales antes de continuar.

## Inventario inicial

- [x] **T-07** (CA-03): ejecutar las siguientes consultas desde `php artisan tinker` o una conexión verificada y registrar resultados:
  - `SELECT VERSION();` → versión del servidor MySQL
  - `SELECT @@character_set_database, @@collation_database;` → charset y collation
  - `SELECT @@sql_mode;` → modo SQL activo
  - `SHOW TABLES;` → tablas existentes
- [x] **T-08** (CA-03): redactar `apps/api/docs/inventario-bd-inicial.md` con los resultados del T-07 en español, sin incluir contraseñas, usuarios ni hosts privados.

## Pruebas automatizadas

- [x] **T-09** (CA-01..CA-05): crear `apps/api/src/tests/Feature/DbConnectionTest.php` con un test PHPUnit nombrado por cada criterio:
  - `test_env_example_contains_required_keys` → CA-01
  - `test_database_connection_succeeds` → CA-02
  - `test_inventory_document_exists_and_contains_version` → CA-03
  - `test_env_file_is_gitignored` → CA-04
  - `test_laravel_boots_successfully` → CA-05
- [x] **T-10** (CA-01..CA-05): ejecutar `php artisan test` (o `composer test`) desde `apps/api/src/` y confirmar 5/5 en verde. Registrar evidencia.

## Distribución al equipo

- [x] **T-11** (CA-01, CA-02): Victor Adrian comparte por canal externo (fuera del repo):
  - El archivo `ca.pem` de Aiven (o el enlace de descarga desde el panel).
  - Las credenciales del usuario `desarrollador`.
  - Instrucciones: copiar `.env.example` → `.env`, llenar `DB_PASSWORD` y `DB_SSL_CA`.
- [x] **T-12** (CA-02): cada integrante configura su `.env` local y ejecuta `php artisan db:show` para verificar su propia conectividad.

## Calidad y entrega

- [x] **T-13**: ejecutar `/verify` para `apps/api` y reportar resultados de lint (`composer lint`) y tests.
- [x] **T-14**: actualizar spec a `Estado: Implementada`, registrar evidencia (versión MySQL encontrada, tests en verde) y enlazar spec, plan y tasks en el PR.

## Trazabilidad

| Criterio | Implementación | Prueba | Verificación |
|---|---|---|---|
| CA-01 | T-03 | T-09, T-10 | T-13 |
| CA-02 | T-04, T-05, T-06 | T-09, T-10 | T-13 |
| CA-03 | T-07, T-08 | T-09, T-10 | T-13 |
| CA-04 | T-01 | T-09, T-10 | T-13 |
| CA-05 | T-02 | T-09, T-10 | T-13 |
