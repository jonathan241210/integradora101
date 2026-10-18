# Plan técnico · 003 · staff-authentication

- Spec: `apps/api/specs/003-staff-authentication.md`
- Estado de spec: Implementada (aprobada por Jonathan, 2026-10-15; cerrada 2026-10-17)
- Responsable técnico: Jonathan (backend) / Victor Adrian (BD)
- Consumidores: dashboard (`dashboard-002`) y PWA veterinaria (spec futura)

## Diseño de solución

La API autentica al personal con **Sanctum por cookie de sesión** (guard `web`) y **Fortify headless** con 2FA TOTP; la autorización usa **Spatie Permission** y los accesos se registran con **Spatie Activitylog** (ADR 0001). El esquema ya existe en `arca_pruebas` por DBR-001 y DBR-002 (`Lista para backend`): esta feature **no crea migraciones** ni publica las de los paquetes.

Flujo: el cliente obtiene `/sanctum/csrf-cookie` → `POST /api/v1/auth/login` (Fortify, autenticado por `AuthenticateStaffAction`) → si el usuario tiene 2FA confirmado, Fortify responde `two_factor: true` y espera `POST /api/v1/auth/two-factor-challenge` → `GET /api/v1/auth/me` devuelve el perfil (`StaffProfileResource`) con `home` y `two_factor_setup_required`. Los administradores (`admin`, `zoo-admin`) sin 2FA confirmado quedan limitados por `EnsureAdministratorTwoFactor` a `me`, `logout` y las rutas de 2FA hasta enrolarse.

Los endpoints no dependen del cliente: el dashboard y la futura PWA los consumen con `@arca/api-client`. La lógica vive en Actions; los controladores propios son delgados.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| Dependencias | `apps/api/src/composer.json` | `laravel/sanctum` ^4, `laravel/fortify` ^1, `spatie/laravel-permission` ^6, `spatie/laravel-activitylog` ^4 (versiones publicadas hace más de 7 días) |
| Configuración | `config/fortify.php`, `config/sanctum.php`, `config/cors.php`, `config/permission.php`, `config/activitylog.php`, `config/arca.php`, `lang/es/auth.php`, `.env.example`, `phpunit.xml` | Fortify headless, cookies SPA, CORS con credenciales, 2FA por rol, mensajes en español |
| Arranque | `bootstrap/app.php`, `routes/api.php`, `app/Providers/AppServiceProvider.php`, `app/Providers/FortifyServiceProvider.php` | Rutas API, `statefulApi()`, alias de middleware, política de contraseñas, `prohibitDestructiveCommands`, limiters |
| Modelos | `app/Models/User.php`, `app/Models/Department.php` | Personal y catálogo de áreas |
| Actions | `app/Actions/Auth/AuthenticateStaffAction.php`, `ResolveStaffHomeAction.php`, `LogAuthenticationEventAction.php`; `app/Actions/Staff/SuggestRoleForDepartmentAction.php`, `CreateStaffAccountAction.php` | Lógica de negocio |
| HTTP | `app/Http/Controllers/Auth/MeController.php`, `app/Http/Middleware/EnsureAdministratorTwoFactor.php`, `app/Http/Resources/StaffProfileResource.php` | `me`, 2FA obligatorio, contrato JSON |
| Eventos | `app/Listeners/RecordAuthenticationEvent.php` | Bitácora de `Login`, `Failed`, `Logout`, `TwoFactorAuthenticationConfirmed` |
| Datos | `database/seeders/DatabaseSeeder.php`, `DepartmentSeeder.php`, `RolesAndPermissionsSeeder.php`, `DemoStaffSeeder.php` | Áreas, roles/permisos y cuentas demo |
| Consola | `app/Console/Commands/CreateStaffCommand.php` | `arca:create-staff` |
| Pruebas | `tests/Feature/Auth/*`, `tests/Feature/Staff/*`, `tests/Concerns/InteractsWithArcaPruebas.php` | Un test por CA |
| Documentación | `README.md` raíz, `apps/api/docs/credenciales-desarrollo.md`, `apps/api/docs/` | CA-16 y operación |

## Contrato y datos

### Dependencias y arranque

- ADR 0001 ya aprueba los cuatro paquetes; no se requiere ADR nuevo.
- **No se publican ni ejecutan sus migraciones**: `sessions`, `permissions`, `roles`, sus pivotes y `activity_log` ya existen por la migración `2026_10_14_000002`; `personal_access_tokens` está excluida (RN-15). Solo se publican los archivos de configuración.
- No se usa `php artisan install:api` (genera la migración de `personal_access_tokens`). `routes/api.php` se crea a mano y se registra en `bootstrap/app.php` (`withRouting(api: ...)`) junto con `$middleware->statefulApi()` y el alias `administrator.two-factor`.

### Configuración

- `config/fortify.php`: `guard=web`, `prefix=api/v1/auth`, `views=false`, `username=email`, `middleware=['web']`. Features: solo `Features::twoFactorAuthentication(['confirm' => true, 'confirmPassword' => false])`; sin registro, reseteo ni actualización de contraseña (RN-14).
- `config/cors.php`: `paths=['api/*', 'sanctum/csrf-cookie']`, `supports_credentials=true`, `allowed_origins` desde `CORS_ALLOWED_ORIGINS`.
- `config/sanctum.php`: `stateful` desde `SANCTUM_STATEFUL_DOMAINS`.
- `config/arca.php`: `pwa_url` (`env('PWA_URL')`) y `two_factor_roles` (`['admin', 'zoo-admin']`).
- `.env.example` (sin valores secretos):
  - `APP_LOCALE=es`, `SESSION_LIFETIME=30`.
  - `SANCTUM_STATEFUL_DOMAINS=localhost:5173,localhost:5174` y `CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174` (PWA en 5173, dashboard en 5174).
  - `PWA_URL=` vacío, con comentario.
  - `DB_SSL_CA=/ruta/absoluta/a/ca.pem` como placeholder (reemplaza la ruta personal actual).
  - `DEMO_STAFF_PASSWORD=` vacío.
  - Se conservan `DB_HOST`, `DB_PORT`, `DB_DATABASE=arca_pruebas` y `DB_PASSWORD=` vacío, que exige `DbConnectionTest` (`api-002`).
- `phpunit.xml`: fija `DB_DATABASE=arca_pruebas`.
- `lang/es/auth.php`: `failed` = «Correo o contraseña incorrectos.»; `throttle` = «Demasiados intentos. Intenta de nuevo en :seconds segundos.»
- `AppServiceProvider`:
  - `Password::defaults()` → `Password::min(12)->mixedCase()->numbers()->symbols()` más `->uncompromised()` salvo en `local`.
  - `DB::prohibitDestructiveCommands()` en todos los entornos, para proteger `arca_pruebas` y `arca_zoo`.

### Modelos

- `User` (tabla `users`, PK `int`): extiende `Authenticatable`; traits `HasRoles`, `TwoFactorAuthenticatable`, `SoftDeletes`, `Notifiable`. Fillable: `first_name`, `last_name`, `second_last_name`, `email`, `password`, `department_id`, `is_active`, `created_by`, `updated_by`. Casts: `password` hashed, `is_active` boolean, `last_login_at` y `two_factor_confirmed_at` datetime. Hidden: `password`, `remember_token`, `two_factor_secret`, `two_factor_recovery_codes`. Se quitan `name` y `email_verified_at`. Relación `department()`; accesor `full_name`.
- `Department`: `code`, `name`, `description`, `is_active`; relación `users()`.
- `config/auth.php` mantiene el provider Eloquent con `App\Models\User`.

### Actions

- `AuthenticateStaffAction` (registrada con `Fortify::authenticateUsing`): busca por correo un usuario con `is_active = true` (SoftDeletes excluye eliminados) y valida con `Hash::check`. Ante cualquier fallo devuelve `null` y Fortify responde 422 con `auth.failed` (RN-08).
- `ResolveStaffHomeAction`: prioridad `admin`→`administration`, `zoo-admin`→`administration`, `executive`→`executive`, `cashier`→`ticket`, `veterinarian`→`pwa` + `config('arca.pwa_url')`. Sin rol reconocido devuelve `home: null`.
- `LogAuthenticationEventAction`: llamada por `RecordAuthenticationEvent` ante `Login`, `Failed`, `Logout` y `TwoFactorAuthenticationConfirmed`. Registra con `activity('auth')` el evento, correo, IP y user-agent; nunca contraseña, secreto 2FA ni códigos. En `Login` actualiza `last_login_at`.
- `SuggestRoleForDepartmentAction`: `presidency`→`admin`, `information-technology`→`admin`, `management`→`zoo-admin`, `box-office`→`cashier`, `veterinary`→`veterinarian` (tabla de `docs/03-roles-y-permisos.md`).
- `CreateStaffAccountAction`: en transacción crea el usuario (contraseña validada con `Password::defaults()`) y asigna el rol. La reutilizará la feature «Gestión de usuarios».

### Rate limiters (`FortifyServiceProvider`)

- `login`: 5/min por `Str::lower(email)|ip`; 429 con `auth.throttle` y los segundos de espera.
- `two-factor`: 5/min por `login.id` de la sesión.

### Rutas `/api/v1` (con nombre)

| Método y ruta | Nombre | Middleware | Origen |
|---|---|---|---|
| `GET /sanctum/csrf-cookie` | `sanctum.csrf-cookie` | — | Sanctum |
| `POST /api/v1/auth/login` | `login.store` | `guest`, `throttle:login` | Fortify |
| `POST /api/v1/auth/logout` | `logout` | `auth` | Fortify |
| `POST /api/v1/auth/two-factor-challenge` | `two-factor.login.store` | `guest`, `throttle:two-factor` | Fortify |
| `POST /api/v1/auth/user/two-factor-authentication` | `two-factor.enable` | `auth` | Fortify |
| `GET /api/v1/auth/user/two-factor-qr-code` | `two-factor.qr-code` | `auth` | Fortify |
| `GET /api/v1/auth/user/two-factor-secret-key` | `two-factor.secret-key` | `auth` | Fortify |
| `POST /api/v1/auth/user/confirmed-two-factor-authentication` | `two-factor.confirm` | `auth` | Fortify |
| `GET /api/v1/auth/user/two-factor-recovery-codes` | `two-factor.recovery-codes` | `auth` | Fortify |
| `GET /api/v1/auth/me` | `auth.me` | `auth:sanctum` | Propia (`MeController`) |

Nombres confirmados con `php artisan route:list` (2026-10-16). Fortify registra además, con la feature de 2FA, estas rutas que se aceptan sin cambios:

| Método y ruta | Nombre | Decisión |
|---|---|---|
| `DELETE /api/v1/auth/user/two-factor-authentication` | `two-factor.disable` | Permitida: si un `admin`/`zoo-admin` la usa, vuelve a quedar con `two_factor_setup_required` y el middleware lo obliga a enrolarse de nuevo |
| `POST /api/v1/auth/user/two-factor-recovery-codes` | `two-factor.regenerate-recovery-codes` | Permitida: regenerar códigos de recuperación propios |
| `POST /api/v1/auth/user/confirm-password`, `GET /api/v1/auth/user/confirmed-password-status` | `password.confirm.store`, `password.confirmation` | Sin uso en esta feature (`confirmPassword=false`) |

Recuperación de códigos (CA-10): Fortify permite al usuario autenticado consultar sus propios códigos con `GET two-factor-recovery-codes`; la API los entrega tras confirmar el 2FA y el cliente los muestra una sola vez. No se agrega lógica para impedir consultas posteriores del propio usuario.

Las rutas de negocio futuras se agrupan con `auth:sanctum` + `administrator.two-factor`. En esta feature se agrega una ruta de prueba solo en tests para verificar CA-06 y CA-08.

### Middleware `EnsureAdministratorTwoFactor` (alias `administrator.two-factor`)

Si el usuario tiene un rol de `config('arca.two_factor_roles')` y `two_factor_confirmed_at` es nulo, responde 403 `{ "message": "Debes configurar tu segundo factor de autenticación.", "code": "two_factor_setup_required" }`. No se aplica a `me`, `logout` ni a las rutas de 2FA.

### `StaffProfileResource` (respuesta de `me`)

```json
{
  "data": {
    "id": 1,
    "first_name": "…",
    "last_name": "…",
    "second_last_name": "…",
    "full_name": "…",
    "email": "…",
    "department": { "code": "presidency", "name": "Presidencia" },
    "roles": ["admin"],
    "permissions": ["dashboard.view", "…"],
    "home": "administration",
    "pwa_url": null,
    "two_factor_setup_required": true
  }
}
```

`pwa_url` solo tiene valor si `home=pwa`. `two_factor_setup_required` permite al cliente enrolar sin otra llamada.

### Datos y comando

- `DepartmentSeeder`: 5 áreas con `updateOrCreate` por `code` (`presidency`, `information-technology`, `management`, `box-office`, `veterinary`).
- `RolesAndPermissionsSeeder`: permisos de `docs/03-roles-y-permisos.md` (incluido `operational-staff.manage`) y 5 roles con guard `web` y `syncPermissions`; limpia la caché de Spatie al terminar.
- `DemoStaffSeeder`: las 6 cuentas de la spec con `updateOrCreate` por email y `syncRoles`; contraseña de `env('DEMO_STAFF_PASSWORD')` validada con la política sin `uncompromised()`. Aborta (excepción, sin crear nada) si la variable falta o es débil, si `app()->environment('production')` o si `DB::getDatabaseName() === 'arca_zoo'`.
- `DatabaseSeeder`: llama siempre a `DepartmentSeeder` y `RolesAndPermissionsSeeder`, y a `DemoStaffSeeder` solo fuera de producción.
- `arca:create-staff` (Laravel Prompts): correo único, nombre, apellidos, área de los departamentos activos, rol sugerido editable y contraseña oculta con confirmación, validada con `Password::defaults()`; delega en `CreateStaffAccountAction`.
- `README.md` raíz, sección «Comandos de base de datos (API)» (CA-16): `php artisan db:show`, `db:show --counts`, `db:table <tabla>`, `migrate:status`, `db:seed`, `arca:create-staff`; cómo sembrar las cuentas demo y el enrolamiento 2FA de los administradores; aviso de no usar `migrate:fresh` ni apuntar a `arca_zoo`.

### Errores y compatibilidad

| Caso | Respuesta |
|---|---|
| Credenciales incorrectas, cuenta inactiva o eliminada | 422 `{ message: "Correo o contraseña incorrectos.", errors: { email: [...] } }` |
| Más de 5 intentos/min en login o reto | 429 con mensaje en español y cabecera `Retry-After` |
| Sin sesión o sesión expirada | 401 `{ message: "Unauthenticated." }` (el cliente muestra el texto en español) |
| Administrador sin 2FA en ruta protegida | 403 `code: two_factor_setup_required` |
| Código TOTP o de recuperación inválido | 422 en el reto |

## Seguridad, offline y operación

- Cookie de sesión HttpOnly, `SameSite=lax`, `Secure` en producción; sesión regenerada en login e invalidada en logout; `SESSION_LIFETIME=30`.
- Contraseñas con bcrypt; secretos 2FA cifrados por Fortify; bitácora sin secretos.
- Mínimo privilegio con Spatie; la autorización solo en servidor.
- Cero secretos versionados: `DEMO_STAFF_PASSWORD`, `DB_PASSWORD` y el certificado CA solo en `.env` local.
- `DB::prohibitDestructiveCommands()` y guarda de `DemoStaffSeeder` protegen `arca_pruebas` y `arca_zoo`.
- Portabilidad Aiven/local: solo `.env` cambia; código compatible con MySQL 8.0.x.

## Mapeo de criterios a pruebas

Todas las pruebas Feature usan `DatabaseTransactions` y el trait `InteractsWithArcaPruebas`, que aborta si `DB::getDatabaseName() !== 'arca_pruebas'`. Nunca `RefreshDatabase`, `migrate:fresh` ni migraciones. Correos de prueba únicos `*@test.arca.invalid`; HIBP con `Http::fake()`; TOTP generado con Google2FA (incluido con Fortify).

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `CA-01 staff-authentication`: login válido crea sesión y regenera ID | `tests/Feature/Auth/LoginTest.php` |
| CA-02 | `CA-02 staff-authentication`: credenciales incorrectas → 422 genérico | `tests/Feature/Auth/LoginTest.php` |
| CA-03 | `CA-03 staff-authentication`: cuenta inactiva o eliminada → 422 genérico sin sesión | `tests/Feature/Auth/LoginTest.php` |
| CA-04 | `CA-04 staff-authentication`: sexto intento → 429 con segundos | `tests/Feature/Auth/LoginTest.php` |
| CA-05 | `CA-05 staff-authentication`: `me` por rol (`admin`, `zoo-admin`, `executive`, `cashier`, `veterinarian` + `pwa_url`) | `tests/Feature/Auth/MeTest.php` |
| CA-06 | `CA-06 staff-authentication`: `me` y ruta protegida sin sesión → 401 | `tests/Feature/Auth/MeTest.php` |
| CA-07 | `CA-07 staff-authentication`: logout invalida la sesión | `tests/Feature/Auth/LogoutTest.php` |
| CA-08 | `CA-08 staff-authentication`: `admin`/`zoo-admin` sin 2FA → 403 `two_factor_setup_required` | `tests/Feature/Auth/AdministratorTwoFactorTest.php` |
| CA-09 | `CA-09 staff-authentication`: reto TOTP/recuperación, límite 5/min, código consumido | `tests/Feature/Auth/AdministratorTwoFactorTest.php` |
| CA-10 | `CA-10 staff-authentication`: QR SVG, confirmación con TOTP y códigos una vez | `tests/Feature/Auth/AdministratorTwoFactorTest.php` |
| CA-11 | `CA-11 staff-authentication`: política de contraseñas y `uncompromised()` | `tests/Feature/Auth/PasswordPolicyTest.php` |
| CA-12 | `CA-12 staff-authentication`: `travel(31)->minutes()` → 401 | `tests/Feature/Auth/SessionExpiryTest.php` |
| CA-13 | `CA-13 staff-authentication`: bitácora sin secretos y `last_login_at` | `tests/Feature/Auth/AuthAuditTest.php` |
| CA-14 | `CA-14 staff-authentication`: comando interactivo crea la cuenta | `tests/Feature/Staff/CreateStaffCommandTest.php` |
| CA-15 | `CA-15 staff-authentication`: 5 áreas y matriz de roles idempotentes | `tests/Feature/Staff/SeedersTest.php` |
| CA-16 | `CA-16 staff-authentication`: README contiene la sección y comandos | `tests/Feature/Staff/ReadmeDatabaseCommandsTest.php` |
| CA-17 | `CA-17 staff-authentication`: base activa `arca_pruebas` y un test por CA | `tests/Feature/Staff/TestDatabaseTest.php` |
| CA-18 | `CA-18 staff-authentication`: idempotencia y abortos (sin contraseña, débil, producción, `arca_zoo`) | `tests/Feature/Staff/DemoStaffSeederTest.php` |

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Paquetes aprobados por ADR 0001; configuración solo por `.env`; MySQL 8.0.x portable Aiven/local (ADR 0013) |
| II. La spec manda | Sí | Spec `api-003` aprobada; plan y tasks con el mismo identificador |
| III. Lógica separada de la interfaz | Sí | Autenticación, `home`, 2FA obligatorio y permisos en Actions/middleware de la API; los clientes solo presentan |
| IV. Un test por criterio | Sí | CA-01..CA-18 mapeados; CA-17 verifica la cobertura |
| V. Una sola fuente de verdad para los datos | Sí, con excepción | Sin migraciones nuevas (DBR-001/002). **Excepción:** `BaseModel` no existe; `User` debe extender `Authenticatable` y su auditoría se cubre con SoftDeletes, `created_by`/`updated_by` y Activitylog de accesos. `Department` es catálogo, no dato clínico ni financiero |
| VI. Código en inglés, personas en español | Sí | Rutas, permisos, clases y tablas en inglés; mensajes `lang/es` y docs en español |

## Riesgos y decisiones

- **ADR:** ninguno nuevo (ADR 0001, 0010, 0013).
- Tests dependientes de la red de Aiven; `uncompromised()` requiere red (se simula con `Http::fake()`).
- Cookie de Sanctum entre dominios en producción con hosting aún por definir: API, dashboard y PWA deben compartir dominio raíz.
- La caché de permisos de Spatie se limpia tras los seeders.
- Si un administrador pierde su celular y sus códigos de recuperación, no hay herramienta para restablecer el 2FA; lo resuelve provisionalmente el responsable de BD y el procedimiento formal queda para «Gestión de usuarios».
- DBR-001/002 aún dicen que se aplican en `arca_zoo`; corresponde a Victor actualizarlas.

## Orden y aprobación

1. BD: confirmar `cache`/`cache_locks` en `arca_pruebas`.
2. Dependencias y configuración → modelos → Actions → Fortify y limiters → middleware → `me` → auditoría → seeders → comando → README, cada paso con sus tests.
3. Calidad: `composer test`, `vendor/bin/pint --test`, `/verify`.
4. BD: sembrar `arca_pruebas` con `php artisan db:seed` y verificar las cuentas.
5. Prueba manual con las cuentas demo; después inicia `dashboard-002`.

Aprobación técnica: Jonathan, 2026-10-16 (plan y tasks).
