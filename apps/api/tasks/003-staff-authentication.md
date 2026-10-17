# Tareas · 003 · staff-authentication

- Spec: `apps/api/specs/003-staff-authentication.md`
- Plan: `apps/api/plan/003-staff-authentication.md`

Todas las pruebas usan `DatabaseTransactions` sobre `arca_pruebas`; nunca `RefreshDatabase`, `migrate:fresh` ni migraciones. Ninguna tarea toca `arca_zoo`.

## Base de datos (responsable de BD: Victor Adrian)

- [x] **T-01** (CA-15, CA-17): DBR-001 y DBR-002 en `Lista para backend`, con migraciones aplicadas y verificadas en `arca_pruebas` (evidencia registrada en las DBR).
- [x] **T-02** (CA-12): confirmar que `cache` y `cache_locks` existen en `arca_pruebas` (`php artisan db:table cache`, `db:table cache_locks`) y registrar la evidencia.
  - 2026-10-16: `migrate:status` muestra `0001_01_01_000001_create_cache_table` como Ran y `db:table cache_locks` responde en `arca_pruebas` (3 columnas).

## Implementación (backend)

### Dependencias y configuración

- [x] **T-03** (CA-01): agregar `laravel/sanctum` ^4, `laravel/fortify` ^1, `spatie/laravel-permission` ^6 y `spatie/laravel-activitylog` ^4 con `composer require` (versiones publicadas hace más de 7 días); publicar solo sus archivos de configuración, sin migraciones.
- [x] **T-04** (CA-01, CA-06): crear `routes/api.php` a mano y registrarlo en `bootstrap/app.php` con `$middleware->statefulApi()`; sin `install:api`.
- [x] **T-05** (CA-01, CA-12): configurar `config/fortify.php` (guard `web`, prefix `api/v1/auth`, `views=false`, `username=email`, solo 2FA con `confirm`), `config/cors.php`, `config/sanctum.php` y `config/arca.php` (`pwa_url`, `two_factor_roles`).
- [x] **T-06** (CA-05, CA-12, CA-18): actualizar `.env.example`: `APP_LOCALE=es`, `SESSION_LIFETIME=30`, `SANCTUM_STATEFUL_DOMAINS`, `CORS_ALLOWED_ORIGINS`, `PWA_URL=`, `DB_SSL_CA` placeholder y `DEMO_STAFF_PASSWORD=`; conservar lo que exige `DbConnectionTest`.
- [x] **T-07** (CA-02, CA-04): crear `lang/es/auth.php` con `failed` y `throttle` en español.
- [x] **T-08** (CA-11, CA-17): en `AppServiceProvider` definir `Password::defaults()` y `DB::prohibitDestructiveCommands()`; fijar `DB_DATABASE=arca_pruebas` en `phpunit.xml` y crear el trait `tests/Concerns/InteractsWithArcaPruebas.php`.

### Modelos

- [x] **T-09** (CA-01, CA-03, CA-05): adaptar `User` (traits, fillable, casts, hidden, `department()`, `full_name`; sin `name` ni `email_verified_at`) y crear `Department`.

### Actions, Fortify y middleware

- [x] **T-10** (CA-01, CA-02, CA-03): crear `AuthenticateStaffAction` y registrarla con `Fortify::authenticateUsing`.
- [x] **T-11** (CA-04, CA-09): definir los rate limiters `login` y `two-factor` en `FortifyServiceProvider`.
- [x] **T-12** (CA-05): crear `ResolveStaffHomeAction` con la prioridad `admin` > `zoo-admin` > `executive` > `cashier` > `veterinarian`.
- [x] **T-13** (CA-08): crear `EnsureAdministratorTwoFactor` (alias `administrator.two-factor`) basado en `config('arca.two_factor_roles')`.
- [x] **T-14** (CA-05, CA-06): crear `MeController` y `StaffProfileResource` con `home`, `pwa_url` y `two_factor_setup_required`; ruta `auth.me` con `auth:sanctum`.
- [x] **T-15** (CA-13): crear `LogAuthenticationEventAction` y el listener `RecordAuthenticationEvent` para `Login`, `Failed`, `Logout` y `TwoFactorAuthenticationConfirmed`; actualizar `last_login_at`.

### Datos y comando

- [x] **T-16** (CA-15): crear `DepartmentSeeder` (5 áreas) y `RolesAndPermissionsSeeder` (5 roles, matriz de `docs/03-roles-y-permisos.md` con `operational-staff.manage`).
- [x] **T-17** (CA-18): crear `DemoStaffSeeder` (6 cuentas, contraseña de `DEMO_STAFF_PASSWORD`, guardas de producción y `arca_zoo`) y conectarlo en `DatabaseSeeder` solo fuera de producción.
- [x] **T-18** (CA-11, CA-14): crear `SuggestRoleForDepartmentAction`, `CreateStaffAccountAction` y el comando `arca:create-staff` con Laravel Prompts.
- [x] **T-19** (CA-16): agregar al `README.md` raíz la sección «Comandos de base de datos (API)» con comandos, cuentas demo, enrolamiento 2FA y avisos.

### Pruebas (cada una nombra su CA)

- [x] **T-20** (CA-01, CA-02, CA-03, CA-04): `tests/Feature/Auth/LoginTest.php` con `CA-01 staff-authentication` … `CA-04 staff-authentication`.
- [x] **T-21** (CA-05, CA-06): `tests/Feature/Auth/MeTest.php` con `CA-05 staff-authentication` (un caso por rol, incluido `zoo-admin`) y `CA-06 staff-authentication`.
- [x] **T-22** (CA-07): `tests/Feature/Auth/LogoutTest.php` con `CA-07 staff-authentication`.
- [x] **T-23** (CA-08, CA-09, CA-10): `tests/Feature/Auth/AdministratorTwoFactorTest.php` con `CA-08 staff-authentication`, `CA-09 staff-authentication` y `CA-10 staff-authentication`, para `admin` y `zoo-admin`.
- [x] **T-24** (CA-11): `tests/Feature/Auth/PasswordPolicyTest.php` con `CA-11 staff-authentication` (HIBP con `Http::fake()`).
- [x] **T-25** (CA-12): `tests/Feature/Auth/SessionExpiryTest.php` con `CA-12 staff-authentication` (`travel(31)->minutes()`).
- [x] **T-26** (CA-13): `tests/Feature/Auth/AuthAuditTest.php` con `CA-13 staff-authentication`.
- [x] **T-27** (CA-14): `tests/Feature/Staff/CreateStaffCommandTest.php` con `CA-14 staff-authentication`.
- [x] **T-28** (CA-15): `tests/Feature/Staff/SeedersTest.php` con `CA-15 staff-authentication`.
- [x] **T-29** (CA-16): `tests/Feature/Staff/ReadmeDatabaseCommandsTest.php` con `CA-16 staff-authentication`.
- [x] **T-30** (CA-17): `tests/Feature/Staff/TestDatabaseTest.php` con `CA-17 staff-authentication` (base activa y búsqueda de CA-01..CA-18 en los tests).
- [x] **T-31** (CA-18): `tests/Feature/Staff/DemoStaffSeederTest.php` con `CA-18 staff-authentication` (idempotencia, sin contraseña, contraseña débil, producción, `arca_zoo`, roles y áreas).

## Calidad y entrega

- [x] **T-32**: ejecutar `composer test` y `vendor/bin/pint --test` en `apps/api/src`, y `/verify`; registrar resultados.
  - 2026-10-16: `php artisan test` → 30 tests, 238 assertions, en verde (incluye `DbConnectionTest`); conteo de `users` 0 antes y 0 después de la suite. `pint --test` en verde sobre los 48 archivos PHP de esta feature; el Pint global falla solo por estilo preexistente en `config/auth.php`, `database/factories/UserFactory.php` y cuatro migraciones de BD, que no se modifican aquí. Paquetes: Sanctum 4.3.3, Fortify 1.41.0 (trae `laravel/passkeys` como dependencia transitiva, sin habilitar), Permission 6.25.0, Activitylog 4.12.3. Sin archivos nuevos en `database/migrations`.
- [ ] **T-33**: actualizar el estado de la spec (`En progreso` al iniciar, `Implementada` al cerrar) y los documentos de `apps/api/docs` (`credenciales-desarrollo.md` a «Activo en `arca_pruebas`»).
- [ ] **T-34** (BD, CA-18): con `DEMO_STAFF_PASSWORD` en su `.env`, el responsable de BD ejecuta `php artisan db:seed` sobre `arca_pruebas`, verifica las cuentas con tinker (§5 de `credenciales-desarrollo.md`) y comparte la contraseña por fuera del repositorio.
- [ ] **T-35**: prueba manual contra la API local: `presidencia@` y `direccion_zoo@` (enrolamiento 2FA y reto en un segundo acceso), `ejecutivo@`, `boletaje@`, `veterinario@` (`pwa_url`), logout y expiración.
