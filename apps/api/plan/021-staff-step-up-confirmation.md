# Plan técnico · 021 · staff-step-up-confirmation

- Spec: `apps/api/specs/021-staff-step-up-confirmation.md`
- Estado de spec: Aprobada (Jonathan, 2026-11-20), con «Decisiones finales 2026-11-20».
- Estado del plan: **Aprobado — aprobación técnica: Jonathan, 2026-11-20**. Brechas B-1 a B-8 cerradas en la sección «Decisiones 2026-11-20». La implementación sigue el orden de `tasks/021-staff-step-up-confirmation.md`.
- Responsable técnico: `<por identificar según acuerdo del equipo>`
- Orden: primer cambio de la secuencia 021 → 025 → 022 → 023 → 024. Los demás cambios dependen de su middleware `step-up` y del contrato 403 `password_confirmation_required` definidos aquí.
- DBR: **no requerida** por el diseño propuesto (la ventana vive en la sesión; ver «Contrato y datos»). Condicionado a la consulta de esquema pendiente (T-01).
- ADR: ninguno nuevo. ADR 0001 (Sanctum, Fortify, Spatie, Activitylog). Sin dependencias nuevas.

## Consulta de esquema vivo (`arca_pruebas`)

- Estado actual registrado en la spec (2026-11-20, sesión principal): existen `sessions` y `activity_log`; `users` tiene `two_factor_*`; roles vivos `admin`, `zoo-admin`, `executive`, `cashier`, `veterinarian`.
- **Resuelto 2026-11-20 (B-6):** `cache` y `cache_locks` existen en `arca_pruebas` (ver «Verificación de esquema»).
- Historial de la consulta, previo a la resolución: existencia de `cache` y `cache_locks` (necesarias si `CACHE_STORE=database`, valor de `.env.example`, para el contador de intentos de CA-27). No se afirma aquí que existan. La sesión principal debe ejecutar `information_schema` en solo lectura sobre `arca_pruebas` y registrar la fecha y el resultado en este apartado antes de aprobar el plan. Si faltan, el cambio requiere DBR propia (no se crea en este plan) o un cambio de driver de caché por `.env`, decisión a tomar en B-6.

## Diseño de solución

El flujo sigue la cadena de la API: ruta admin con `auth:sanctum` → `staff.user` → `administrator.two-factor` → `permission:<permiso>` → `throttle` (si existe) → **`console-managed-account`** (guard de `api-023`, solo rutas cuyo objetivo es una cuenta; decisión 2026-11-20, Q6 de `api-023`) → **`step-up:<modo>`** → Form Request → Action → Resource. La API decide qué operación pide contraseña; el cliente solo reacciona a la respuesta.

Hay dos piezas independientes.

### A. 2FA obligatorio para `cashier`

- `config/arca.php`: `two_factor_roles` pasa a `['admin', 'zoo-admin', 'cashier']` (RN-09).
- El middleware `EnsureAdministratorTwoFactor` ya es genérico (`hasAnyRole(config(...))`) y `StaffProfileResource` ya calcula `two_factor_setup_required` desde la misma config. El cambio de configuración basta para CA-01 y CA-02; los tests lo demuestran.
- Excepciones del middleware sin cambios: `auth.me`, `logout` y rutas `two-factor.*` / `api/v1/auth/user/two-factor-*` (CA-02).
- CA-03 depende de que el login devuelva `two_factor: true` por tener 2FA confirmado y no por el rol. Verificar en T-03 con el controlador de login que usa Fortify. Si la lógica dependiera del rol, se ajusta a la config (no se añade excepción).
- Actualizar la prueba de regresión `tests/Feature/Auth/MeTest.php` (línea 39 fija `['admin', 'zoo-admin']`) y los fixtures de tests que crean cajeros sin 2FA (ver «Cambios por área»).

### B. Confirmación de contraseña por operación

**Decisión de mecanismo (evaluación pedida en la instrucción):**

| Opción | Resultado | Motivo |
|---|---|---|
| Fortify `confirmPassword` (`config/fortify.php`, `features.twoFactorAuthentication.confirmPassword`) | **Descartada** | Solo protege rutas de gestión de 2FA y passkeys (`FortifyServiceProvider`, `passkeys.management_middleware`). No aplica a `/api/v1/admin/*`. Se mantiene en `false`. |
| Middleware `password.confirm` de Laravel (`RequirePassword`) | **Descartada** | Responde 423 (no 403) y no tiene `mode`. Usa la clave de sesión `auth.password_confirmed_at` con timeout fijo por parámetro (admite 600 s), pero no tiene límite de intentos, ni auditoría, ni modo «Siempre» (la contraseña viaja en el cuerpo). Su timeout global (`auth.password_timeout` = 10800 s) no se toca. |
| Action propia + middleware propio (`step-up`) | **Elegida** | Reutiliza solo `Hash::check` sobre `users.password` (bcrypt, `api-003` RN-10). Sin dependencias nuevas. Control de intentos y auditoría propios. |

Componentes:

- **Middleware `RequireStepUpConfirmation`** (alias `step-up`, en `bootstrap/app.php`). Recibe un parámetro de modo: `none`, `window`, `always`, `staff-account-update` o `enclosure-qr-regenerate`. Los dos últimos delegan en una Action que resuelve el modo según la petición (RN-02: la decisión vive en la API).
  - `none`: pasa sin efectos.
  - `window`: si `StepUpWindow::isOpen($session)` es verdadero, pasa; si no, 403 `password_confirmation_required` con `mode: window`.
  - `always`: lee `password` del cuerpo (`(string) $request->input('password', '')`). Vacío → 403 con `mode: always` (CA-12, sin registrar intento). No vacío → `VerifyStaffPasswordAction` (lock, hash, auditoría). Correcta → pasa; incorrecta → 422.
- **`StepUpWindow`** (`app/Support/StepUp/StepUpWindow.php`): clave de sesión `arca.step_up.confirmed_until` (epoch entero). `open(session, now)` guarda `now + 600 s`; `isOpen(session, now)` compara estrictamente (`now < confirmed_until`). No se renueva con operaciones (RN-03). Si la petición no tiene sesión (`! $request->hasSession()`), la ventana se considera cerrada (fail closed).
- **`ConfirmStaffPasswordAction`**: usado por `POST /api/v1/admin/password-confirmation`. Llama a `VerifyStaffPasswordAction`; si es correcta abre la ventana y devuelve `confirmed_until` en UTC (CA-06).
- **`VerifyStaffPasswordAction`**: única verificación de contraseña para ventana y Siempre. Orden: (1) comprobar bloqueo del usuario → 429; (2) `Hash::check`; (3) fallo → `PasswordAttemptLimiter::recordFailure` y auditoría `failed` → 422; (4) éxito → auditoría `succeeded`. No guarda ni registra la contraseña.
- **`PasswordAttemptLimiter`** (contador en caché, clave por **usuario**, no por sesión):
  - `password-confirmation:failures:{userId}`: `Cache::add(..., 600)` en el primer fallo y `increment`. Ventana de conteo de 10 minutos desde el primer fallo.
  - Al quinto fallo en la ventana: se borra el contador y se escribe `password-confirmation:locked:{userId}` con TTL 600 s y valor `expires_at`. Así el bloqueo dura **10 minutos desde el quinto fallo**, como pide la spec, y no 10 minutos desde el primero (que es lo que daría `RateLimiter::hit` por defecto). Divergencia de implementación resuelta aquí; se registra en «Riesgos y decisiones».
  - Un acierto sin bloqueo activo borra el contador del usuario (decisión B-7 de 2026-11-20; CA-41). Con bloqueo activo, la contraseña correcta responde 429 y no borra nada.
  - Bloqueo activo → 429 con `Retry-After` = segundos restantes y mensaje «Demasiados intentos. Intenta de nuevo en :seconds segundos.» (`lang/es/auth.php`, clave `throttle`).
- **`LogPasswordConfirmationAction`**: auditoría con `activity()` (ver «Auditoría»).
- **Exponer errores**: `PasswordIncorrectException` (422) y `PasswordAttemptsExceededException` (429) se renderizan en `bootstrap/app.php` dentro de `withExceptions`, igual que `ThrottleRequestsException` y `UnauthorizedException` hoy.
- **Clasificación por ruta**: cada ruta de escritura de `/api/v1/admin/*` declara su modo en `routes/api.php` mediante `->middleware('step-up:<modo>')` o como parámetro del grupo. Ninguna escritura queda sin modo. Ver tabla en «Contrato y datos». Las lecturas (`GET`) no llevan `step-up`.
- **Cierre de ventana al entrar y salir** (CA-10): el controlador de logout y el de login (api-003) eliminan `arca.step_up.confirmed_until` de la sesión. Es defensivo: el logout invalida la sesión y el login regenera el ID, pero `regenerate()` conserva los atributos.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / configuración | `src/config/arca.php` (`two_factor_roles`; bloque `password_confirmation` con `window_minutes` 10, `max_attempts` 5, `attempts_window_minutes` 10, `lockout_minutes` 10; sin variables de entorno) | RN-09, RN-07, CA-31 |
| API / arranque | `src/bootstrap/app.php` (alias `step-up`, render de excepciones) | Middleware y errores |
| API / HTTP | `src/app/Http/Middleware/RequireStepUpConfirmation.php` (nuevo); `src/app/Http/Controllers/Admin/PasswordConfirmationController.php` (nuevo, invocable); `src/app/Http/Requests/Admin/ConfirmStaffPasswordRequest.php` (nuevo, `password` requerido) | Endpoint y middleware |
| API / Actions | `src/app/Actions/Auth/StepUp/ConfirmStaffPasswordAction.php`, `VerifyStaffPasswordAction.php`, `PasswordAttemptLimiter.php`, `LogPasswordConfirmationAction.php` (nuevos); `src/app/Actions/Admin/StepUp/ResolveStaffAccountUpdateModeAction.php` y `ResolveEnclosureQrRegenerateModeAction.php` (nuevos) | Lógica (CA-06 a CA-14, CA-27 a CA-29, CA-35, CA-36, CA-20, CA-34) |
| API / soporte | `src/app/Support/StepUp/StepUpWindow.php` (nuevo); `src/app/Exceptions/PasswordIncorrectException.php` y `PasswordAttemptsExceededException.php` (nuevos) | Ventana en sesión y errores |
| API / autenticación | Controlador de login y de logout de api-003 (`src/app/Http/Controllers/Api/AuthController.php` o el que atiende `auth/login` de Fortify; verificar en T-03) | Limpiar la ventana (CA-10) |
| API / rutas | `src/routes/api.php`: nombre `admin.password-confirmation.store` (`POST /api/v1/admin/password-confirmation`) y `step-up:<modo>` en cada escritura admin | RN-01, RN-02 |
| API / pruebas | `src/tests/Feature/Auth/CashierTwoFactorTest.php`, `Feature/Auth/PasswordConfirmationTest.php`, `Feature/Admin/StepUpAlwaysTest.php`, `StepUpWindowTest.php`, `StepUpStatusAndRoleTest.php`, `StepUpNoConfirmationTest.php`, `StepUpAttemptLimitTest.php`, `StepUpClassificationTest.php` | Un test por CA (CA-32) |
| API / pruebas (regresión) | `src/tests/Feature/Auth/MeTest.php` (roles con 2FA); 60 llamadas `createAccount('cashier', false)` en 31 archivos de `src/tests/Feature/Tickets/` (y `Admin/` si aplica) → `createAccount('cashier')` (2FA confirmado), salvo el test de CA-01 | Los cajeros sin 2FA quedan bloqueados (`api-021` riesgo); los CA no se relajan |
| API / documentación | `apps/api/docs/administracion.md` (2FA de cajeros, tabla de modos, contrato 403/422/429); `apps/api/docs/tickets.md` (línea 21 dice que `cashier` «no pasa por 2FA»: queda obsoleta); nota de uso del demo (`DemoStaffSeeder`: cajero `boletaje@arca.local` sin 2FA) | Referencia vigente |
| Cliente | `packages/api-client`: sin cambios en este plan; los cambios de cliente están en `apps/dashboard/plan/015-step-up-confirmation.md` | Separación de responsabilidades |
| Migraciones / DBR | Ninguna | Ver «Contrato y datos» |

## Contrato y datos

### Endpoints nuevos y modificados

| Método y ruta | Nombre | Autenticación y permiso | Modo |
|---|---|---|---|
| `POST /api/v1/admin/password-confirmation` | `admin.password-confirmation.store` | `auth:sanctum`, `staff.user`, `administrator.two-factor`; sin permiso específico (solo confirma la contraseña propia). Sin `step-up`. | — |

Cuerpo de confirmación: `{ "password": "..." }` (requerido, cadena). Errores de validación estándar 422 de Laravel si falta.

### Clasificación de rutas de escritura (RN-01)

Modo `Siempre` = `step-up:always` (la contraseña va en el cuerpo). Modo `Ventana` = `step-up:window`.

| Nombre de ruta | Modo | Notas |
|---|---|---|
| `admin.ticket-prices.store` | always | CA-12, CA-13, CA-14 |
| `admin.users.password.update` | always | Decisión B-1: confirmación en `current_password`; `password` es la nueva contraseña (CA-37, RN-16) |
| `admin.users.two-factor.destroy` | always | Contraseña en el cuerpo de un `DELETE` |
| `admin.users.update` | staff-account-update | always si `role` viene y es distinto del actual (CA-36); si no, window (CA-18) |
| `admin.tickets.cancel` | window | CA-16; api-022 mantiene este modo |
| `admin.users.store` | window | CA-17; **B-2** para roles admin |
| `admin.users.status` | window | CA-19, CA-35 (activar y desactivar); **B-2** |
| `admin.users.destroy` | window | CA-19; **B-2** |
| `admin.enclosures.destroy` | window | CA-20 |
| `admin.enclosures.qr.regenerate` | enclosure-qr-regenerate | window si el recinto tiene QR activo; none si no (**B-3**) |
| `admin.enclosures.qr.generate` | none | CA-34 |
| `admin.enclosures.store`, `admin.enclosures.update`, `admin.enclosures.status` | none | Decisión B-4: No pide (CA-40). Sin `step-up` adicional que el de `none` |
| `admin.tickets.store`, `admin.tickets.quote`, `admin.reports.tickets.export` | none | CA-21, CA-22 |
| `admin.news.*`, `admin.events.*` (escritura) | none | CA-23 |
| `admin.memories.accept|reject`, `admin.species-publication-requests.*` (escritura), `admin.species.unpublish|republish|publication.*` | none | CA-24 |
| `admin.password-confirmation.store` | — | Es la confirmación; no se clasifica |

Lecturas `GET` de admin: sin `step-up` (CA-26).

### Respuestas

- **200** `POST admin/password-confirmation`: `{ "data": { "confirmed_until": "2026-11-20T18:10:00Z" } }` (envoltorio `data` como el resto de admin; B-8 no cambia esto).
- **403** (ventana o Siempre sin contraseña): `{ "message": "Confirma tu contraseña para realizar esta acción.", "code": "password_confirmation_required", "mode": "window" | "always" }`. Texto aceptado en la aprobación técnica (decisión B-8; RN-18 de la spec).
- **403** `two_factor_setup_required` (sin cambios): `{ "message": "Debes configurar tu segundo factor de autenticación.", "code": "two_factor_setup_required" }`.
- **422** contraseña incorrecta: `{ "message": "La contraseña no es correcta.", "errors": { "password": ["La contraseña no es correcta."] } }`. El campo `errors.password` permite al dashboard mostrarlo junto al campo (dashboard CA-03).
- **429**: `{ "message": "Demasiados intentos. Intenta de nuevo en N segundos." }` con cabecera `Retry-After: N`. El cliente ya lee `Retry-After` en `packages/api-client/http.ts`.
- **401**: sesión ausente o expirada (Sanctum), sin cambios (CA-11).

Ninguna respuesta incluye la contraseña, el hash ni secretos 2FA.

### Contrato para los demás cambios (fijado aquí)

- Toda ruta nueva de escritura bajo `/api/v1/admin/*` declara su modo en `routes/api.php` (`step-up:none|window|always|…`) y tiene una fila en la tabla de RN-01 de la spec. El test `StepUpClassificationTest` falla si aparece una escritura sin modo.
- El campo `password` del cuerpo queda **reservado** para la confirmación de Siempre. Una operación nueva no puede usarlo con otro significado. Única excepción, decidida en B-1: `PUT admin/users/{user}/password`, donde `password` es la nueva contraseña y la confirmación va en `current_password` (RN-16 de la spec).
- El middleware va después de `permission:*` y antes del Form Request, así que una operación sin permiso responde 403 de permiso, no de contraseña.
- **api-022**: `admin.tickets.cancel` conserva `step-up:window` y su código de motivo se valida después del middleware.
- **api-023**: añade roles a `two_factor_roles` en su spec; no toca `step-up` salvo para clasificar sus rutas nuevas.
- **api-025**: no interactúa con `step-up`; el cambio de zona de la cancelación no altera el modo.
- **dashboard-015 / dashboard-017**: consumen el contrato anterior sin lógica de clasificación en el cliente.

### Datos y migraciones

- **Ninguna migración ni tabla nueva.** Esta spec no crea columnas (spec, «Datos»). La ventana vive en `sessions` (driver `database`, RN-11) y el contador de intentos en la caché (B-6).
- `activity_log`: se escriben eventos `password-confirmation.*`. No se borran (Constitución V; RN-15).
- `users`: solo lectura de `password` (verificación) y de `role`/`is_active` para resolver modos.
- SoftDeletes: no aplica a la ventana ni al contador.
- Ningún SQL ni función ni vista.

### Auditoría

- Eventos: `password-confirmation.succeeded` y `password-confirmation.failed` en `activity_log`, columna `event`.
- Actor (`causedBy`): usuario que intenta. Propiedades: `email`, `ip`, `user_agent`, `route` (nombre de la operación), `mode` (`window` o `always` o `confirmation`), `locked` (booleano; `true` cuando el fallo es por bloqueo).
- Descripción en español: «Confirmación de contraseña correcta» / «Confirmación de contraseña incorrecta» / «Confirmación de contraseña bloqueada por intentos».
- Siempre con `password` en el cuerpo se registra `succeeded` o `failed` por cada intento (CA-28).
- Nunca se registra la contraseña, el hash, la ventana ni secretos 2FA. Las propiedades se construyen explícitamente; no se vuelcan `$request->all()`.
- 403 `password_confirmation_required` no se registra (CA-29).
- Bloqueo (429): se registra `failed` con `locked: true` (propuesta; ver B-8).
- Log name: `auth`, como `LogAuthenticationEventAction` (decisión B-8; RN-18 de la spec).

## Seguridad, offline y operación

- **Mínimo privilegio:** la comprobación de permiso va antes del modo; ocultar botones en el dashboard no sustituye el middleware.
- **Contraseña:** viaja por HTTPS en `password`; se verifica con `Hash::check`; no se guarda, no se loguea, no se devuelve. Los errores de validación del Form Request no incluyen el valor.
- **Fuerza bruta:** límite de 5 fallos por usuario en 10 minutos y bloqueo de 10 minutos (CA-27). El límite es por usuario, así que cambiar de sesión no lo evade. Riesgo residual: un atacante con sesión válida puede bloquear a la titular (aceptado por la spec; se registra).
- **Ventana:** por sesión; cerrar sesión o expirarla la elimina; no se comparte entre sesiones (RN-03).
- **Sesión sin cookie:** si la petición no tiene sesión, `window` falla cerrado (403).
- **Concurrencia:** el contador en caché con `add` + `increment` puede subcontar bajo carga concurrente del mismo usuario. Aceptado a la escala del zoológico; se anota como riesgo. No hay `lockForUpdate` sobre la caché.
- **Rate limit por IP:** no se añade (no está en la spec). El límite por usuario de CA-27 cubre el caso.
- **Portabilidad Aiven/local:** sesión en `database` y caché en `database` (`.env.example`). Sin funciones de nube. Sin variables de entorno nuevas; sin cambios en `infra/README.md` (ningún requisito de servidor nuevo). Los avisos a cajeros de RN-14 se hacen fuera del sistema y se documentan en `apps/api/docs/tickets.md`.
- **Pruebas de sesión:** `phpunit.xml` fija `SESSION_DRIVER=array` y `CACHE_STORE=array`. CA-09, CA-10 y CA-11 dependen de semántica de sesión real (dos sesiones, expiración). Se prueban con `session.driver=database` aplicado en el test (`config(['session.driver' => 'database'])` + `app('session')->forgetDrivers()`), con `DatabaseTransactions` sobre `arca_pruebas`. Si no es viable, la brecha se registra en la revisión de T-06 (sin relajar el CA).
- **Tiempo:** `Carbon::setTestNow` para CA-08 (T+9:59 acepta, T+10:01 rechaza) y CA-27.
- **Observabilidad:** solo contadores en la auditoría; ningún log de aplicación con la contraseña.

## Mapeo de criterios a pruebas

Todas las pruebas: `DatabaseTransactions` sobre `arca_pruebas`; nunca `RefreshDatabase`; docblock `/** CA-NN staff-step-up-confirmation */` y método `test_caNN_...`. Cada CA-xx aparece al menos una vez.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_ca01_cashier_without_2fa_gets_two_factor_setup_required_in_admin` | API `tests/Feature/Auth/CashierTwoFactorTest.php` |
| CA-02 | `test_ca02_cashier_without_2fa_can_read_me_log_out_and_enroll` | idem |
| CA-03 | `test_ca03_cashier_with_2fa_gets_a_challenge_and_no_data_until_completed` | idem |
| CA-04 | `test_ca04_veterinarian_without_2fa_enters_without_enrollment` | idem |
| CA-05 | `test_ca05_admin_and_zoo_admin_keep_api_003_2fa` | idem |
| CA-06 | `test_ca06_correct_confirmation_opens_a_window_and_does_not_store_the_password` | `tests/Feature/Auth/PasswordConfirmationTest.php` |
| CA-07 | `test_ca07_wrong_confirmation_returns_422_and_does_not_open_a_window` | idem |
| CA-08 | `test_ca08_window_accepts_at_9m59s_and_rejects_at_10m1s_without_extending` | idem (`Carbon::setTestNow`) |
| CA-09 | `test_ca09_window_is_not_shared_between_sessions` | idem (driver database) |
| CA-10 | `test_ca10_logout_and_new_login_remove_the_window` | idem |
| CA-11 | `test_ca11_expired_session_returns_401_not_403` | idem |
| CA-12 | `test_ca12_always_without_password_returns_403_even_with_window` | `tests/Feature/Admin/StepUpAlwaysTest.php` |
| CA-13 | `test_ca13_always_with_wrong_password_returns_422_without_changes` | idem |
| CA-14 | `test_ca14_always_with_correct_password_runs_without_opening_a_window` | idem |
| CA-15 | `test_ca15_window_operations_without_confirmation_return_403` (cancelar, crear, editar, desactivar, activar, eliminar cuenta, regenerar QR, eliminar recinto) | `tests/Feature/Admin/StepUpWindowTest.php` |
| CA-16 | `test_ca16_cancelling_with_an_open_window_does_not_ask_again` | idem |
| CA-17 | `test_ca17_creating_a_non_admin_account_with_window` | idem |
| CA-18 | `test_ca18_editing_an_account_without_role_change_with_window` | idem |
| CA-19 | `test_ca19_deactivating_and_deleting_an_account_with_window` | idem |
| CA-20 | `test_ca20_regenerating_qr_with_code_and_deleting_enclosure_require_a_window` | idem |
| CA-21 | `test_ca21_selling_and_quoting_do_not_ask_for_password` | `tests/Feature/Admin/StepUpNoConfirmationTest.php` |
| CA-22 | `test_ca22_exporting_a_report_does_not_ask_for_password` | idem |
| CA-23 | `test_ca23_news_and_events_do_not_ask_for_password` | idem |
| CA-24 | `test_ca24_memories_and_species_do_not_ask_for_password` | idem |
| CA-25 | `test_ca25_veterinarian_in_pwa_needs_no_2fa_or_password` | idem |
| CA-26 | `test_ca26_admin_reads_do_not_ask_for_password` | idem |
| CA-27 | `test_ca27_five_failures_lock_for_ten_minutes_in_window_and_always` | `tests/Feature/Admin/StepUpAttemptLimitTest.php` |
| CA-28 | `test_ca28_audit_records_succeeded_and_failed_without_password` | idem |
| CA-29 | `test_ca29_403_for_missing_confirmation_neither_counts_nor_audits` | idem |
| CA-30 | `test_ca30_cashier_with_2fa_sells_and_reads_history_with_api_009_shape` | `tests/Feature/Auth/CashierTwoFactorTest.php` |
| CA-31 | `test_ca31_two_factor_roles_contiene_cashier_y_no_veterinarian_ni_executive` | idem |
| CA-32 | `test_ca32_every_criterion_has_at_least_one_test` (lee `tests/` y busca `test_caNN_`; excluye solo los CA con decisión registrada en B-5) | `tests/Feature/Admin/StepUpClassificationTest.php` |
| CA-33 | Fuera de alcance según «Decisiones finales» y decisión B-5 (2026-11-20). Sin test. | — |
| CA-34 | `test_ca34_first_qr_generation_does_not_ask_for_password` | `tests/Feature/Admin/StepUpNoConfirmationTest.php` |
| CA-35 | `test_ca35_activating_a_non_admin_account_requires_a_window` | `tests/Feature/Admin/StepUpStatusAndRoleTest.php` |
| CA-36 | `test_ca36_role_change_with_other_fields_always_requires_password` | idem |
| CA-37 | `test_ca37_reset_password_confirms_with_current_password` | `tests/Feature/Admin/StepUpAlwaysTest.php` (B-1) |
| CA-38 | `test_ca38_admin_account_returns_admin_403_before_password` | `tests/Feature/Admin/StepUpWindowTest.php` (orden con api-023) |
| CA-39 | `test_ca39_regenerating_qr_without_code_does_not_ask_for_password` | `tests/Feature/Admin/StepUpNoConfirmationTest.php` (B-3) |
| CA-40 | `test_ca40_enclosure_create_edit_and_status_do_not_ask_for_password` | idem (B-4) |
| CA-41 | `test_ca41_success_without_lock_clears_previous_failures` | `tests/Feature/Admin/StepUpAttemptLimitTest.php` (B-7) |

Pruebas adicionales (no CA, RN-01): `test_rn01_every_admin_write_declares_a_step_up_mode` (recorre `Route::getRoutes()` y exige parámetro `step-up:` en cada `POST|PUT|PATCH|DELETE` bajo `admin.*`, excepto `admin.password-confirmation.store`). Tras la decisión B-4 (2026-11-20) debe pasar en verde.

Regresión obligatoria: `AdministratorTwoFactorTest`, `StaffAccountTwoFactorTest`, `AdminAccessTest`, `MemoriesReviewAccessTest`, `TicketPriceAccessTest` y `MeTest` en verde; sus expectativas de 2FA se mantienen salvo la lista de roles.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas (ADR 0001). Sesión y caché por `.env` (`database`). Sin funciones de nube. |
| II. La spec manda | Sí | Spec 021 Aprobada (enmienda técnica 2026-11-20) y plan/tasks con el mismo NNN-slug. Brechas B-1 a B-8 cerradas el 2026-11-20. |
| III. Lógica separada de la interfaz | Sí | Clasificación y verificación en Actions y middleware; controladores delgados; el dashboard solo presenta (CA-12 de dashboard). |
| IV. Un test por criterio | Parcial | Mapeo CA-01 a CA-41 completo, con **CA-33 fuera de alcance** (B-5). `test_ca32_*` exige el docblock «CA-NN staff-step-up-confirmation» junto a cada `test_caNN_*` de api-021. CI no verificado en esta sesión. |
| V. Una sola fuente de verdad para los datos | Sí | Sin esquema nuevo. Ventana en sesión; contador en caché; auditoría en `activity_log` sin borrado. Pendiente: confirmar tablas de caché (T-01). |
| VI. Código en inglés, personas en español | Sí | Rutas, claves de sesión, códigos `password_confirmation_required` y `two_factor_setup_required`, eventos en inglés; mensajes y descripciones de auditoría en español. |

Excepciones: ninguna implementada. Si B-6 exige cambiar el driver de caché, se abre ADR de configuración (no es dependencia nueva, pero se revisa).

## Decisiones 2026-11-20 (aprobación técnica de Jonathan)

Cierran las brechas y preguntas del borrador. Cada decisión queda reflejada en la spec (enmienda técnica 2026-11-20) y en las tasks.

- **Decisión 2026-11-20 — B-1 (`PUT users/{user}/password`):** la confirmación del administrador va en `current_password`; `password` es la nueva contraseña. Respuestas: 403 `password_confirmation_required` (`mode: always`) sin `current_password`; 422 con `current_password` incorrecta; 200 con `current_password` correcta. Spec: CA-37, RN-16. Tasks: T-10. Consumidores: `apps/dashboard/plan/015` (T-07 resetPassword).
- **Decisión 2026-11-20 — B-2 (cuentas no admin y `zoo-admin`):** crear, editar, activar, desactivar y eliminar cuentas `zoo-admin` y demás no admin es **Ventana**. Las cuentas con rol `admin` no son objetivo de estas operaciones desde la API; su 403 de `api-023` se evalúa antes que el de contraseña (CA-38, RN-17). Implementación: el guard `console-managed-account` (de `api-023`) va como middleware entre `permission:*` y `step-up:*` en las rutas cuyo objetivo es una cuenta. Pendiente de confirmar en la tarea de `api-023` (ver nota en su plan): el 403 de «rol `admin` pedido» (`api-023` CA-12) no está ordenado frente al 403 de contraseña; ver «Preguntas de orden» abajo.
- **Decisión 2026-11-20 — B-3 (regenerar QR sin código previo):** **No pide**, tratado como primera generación (CA-39). `ResolveEnclosureQrRegenerateModeAction` devuelve `none` si el recinto no tiene QR activo.
- **Decisión 2026-11-20 — B-4 (alta, edición y estado de recintos):** **No pide** (CA-40). `admin.enclosures.store`, `admin.enclosures.update` y `admin.enclosures.status` llevan `step-up:none`. Se elimina la brecha del test de RN-01.
- **Decisión 2026-11-20 — B-5 (CA-32 frente a «Decisiones finales»):** CA-32 se enmienda y excluye CA-33 explícitamente. CA-33 no tiene test ni tarea de implementación (T-17 se cierra como «fuera de alcance»).
- **Decisión 2026-11-20 — B-6 (caché en `arca_pruebas`):** **Resuelta.** `cache` y `cache_locks` existen en `arca_pruebas` y `CACHE_STORE=database` (`.env.example` y `config/cache.php`). No hace falta DBR ni cambio de driver. Consulta de solo lectura de la sesión principal, 2026-11-20.
- **Decisión 2026-11-20 — B-7 (aciertos y contador):** una confirmación correcta sin bloqueo activo **borra** los fallos previos del usuario (CA-41; enmienda de RN-07). Con bloqueo activo, la contraseña correcta responde 429 y no borra el contador.
- **Decisión 2026-11-20 — B-8 (auditoría y textos):** `log_name` `auth` con correo, IP y user-agent (RN-18). Textos del 403, 422 y 429 y envoltorio `data` del 200 propuestos por este plan: **aceptados**.
- **Decisión 2026-11-20 — resto de propuestas del plan:** aceptadas (modo `none|window|always|staff-account-update|enclosure-qr-regenerate`, `PasswordAttemptLimiter` con clave por usuario y bloqueo de 10 minutos desde el quinto fallo, auditoría con `activity()`, errores `PasswordIncorrectException` y `PasswordAttemptsExceededException`, `Carbon::setTestNow` para CA-08 y CA-27).

### Preguntas de orden (surgidas de la decisión B-2; pendientes)

1. ¿El 403 de «rol `admin` pedido» (`api-023` CA-12, en alta o cambio de rol) se evalúa antes del 403 de contraseña (`step-up`) cuando el cuerpo pide `role: "admin"` sin `password`? La decisión de 2026-11-20 solo fija el orden para la **cuenta** `admin` (Q6 de `api-023`). Propuesta: sí, igual que la cuenta, para no revelar nada con la contraseña antes del rechazo de rol. Hasta decidir, T-12 no cierra CA-12.

## Brechas abiertas (histórico; cerradas por la sección «Decisiones 2026-11-20» de arriba)

- **B-1 (campo `password` en `PUT users/{user}/password`).** La spec usa `password` como contraseña de confirmación en todas las operaciones de Siempre, pero en esta ruta `password` ya es la **nueva** contraseña del usuario restablecido. No se pueden usar ambos significados en el mismo campo. *Recomendación:* en esta ruta, la confirmación va en `current_password` (contraseña del administrador) y `password` queda para la nueva. Requiere enmienda a api-021 CA-12/CA-13/CA-06 del dashboard para esta ruta. Hasta decidir, T-09 queda bloqueada para esta ruta.
- **B-2 (cuentas con rol `admin` o `zoo-admin` como objetivo o como rol nuevo).** La spec clasifica solo cuentas «no admin». Pregunta: ¿crear, editar, activar, desactivar o eliminar una cuenta `admin`/`zoo-admin` pide Ventana, Siempre o queda rechazada por las reglas de api-007 antes de confirmar? *Recomendación:* Ventana en todos los casos, y que api-007 rechace la operación sobre cuentas admin después del middleware.
- **B-3 (regenerar QR sin código previo).** `POST .../qr/regenerate` en un recinto sin QR activo: ¿No pide (primera generación, como CA-34) o Ventana? *Recomendación:* No pide, porque la spec solo pide Ventana para «regenerar el QR de un recinto que ya tiene QR».
- **B-4 (rutas de recintos sin clasificar).** `POST /api/v1/admin/enclosures`, `PATCH .../enclosures/{id}` y `PATCH .../enclosures/{id}/status` no aparecen en la tabla de modos. *Recomendación:* No pide para alta y edición (como noticias y eventos); decidir el estado (desactivar un recinto es operación sensible o no).
- **B-5 (CA-32 contra «Decisiones finales»).** CA-32 exige un test por cada CA-01 a CA-36, pero las «Decisiones finales» dicen que CA-33 no se implementa ni se prueba. *Recomendación:* enmendar CA-32 para excluir CA-33 explícitamente.
- **B-6 (caché en `arca_pruebas`).** Consulta de solo lectura de `cache` y `cache_locks`. Si no existen, o se crea una DBR (fuera de este plan) o se usa otro almacén por `.env`. Precondición, no pregunta.
- **B-7 (aciertos y contador).** ¿Un acierto limpia los fallos previos del usuario? El plan propone que no (lectura literal de RN-07).
- **B-8 (auditoría y textos).** (a) `log_name` `auth` (como api-003, con email, IP y user-agent) o `admin` (formato de api-007 CA-26, citado por RN-08). Propuesta: `auth`. (b) Texto del 403 y envoltorio `data` del 200: propuestos aquí; confirmar.

Preguntas: máximo 8 por ronda; aquí hay 7 (B-1, B-2, B-3, B-4, B-5, B-7, B-8) más la precondición B-6.

## Riesgos y decisiones

- **Cajeros bloqueados al desplegar.** La única cuenta `cashier` activa no tiene 2FA (spec). El aviso fuera del sistema es operativo (RN-14); el plan no añade fecha de corte.
- **Pruebas de fixture.** Las 60 llamadas `createAccount('cashier', false)` fallan con `two_factor_setup_required` tras el cambio de config. Se cambian a 2FA confirmado; no se relajan los CA. Se revisan una a una porque algunas prueban permisos (403 de permiso) y pueden enmascararse.
- **Divergencia de bloqueo resuelta:** `RateLimiter::hit` bloquea desde el primer fallo; la spec pide 10 minutos desde el bloqueo. Se implementa con clave propia (ver «Diseño»).
- **Orden de middleware:** el middleware va antes de la validación del Form Request. Un Siempre con cuerpo inválido y contraseña incorrecta responde 422 de contraseña; aceptado.
- **Orden con cuentas admin:** el 403 de cuenta admin de `api-023` se evalúa antes que el de contraseña (decisión Q6 de `api-023`, CA-38). Queda abierta la pregunta de orden sobre `role: "admin"` pedido (ver «Preguntas de orden»).
- **Alternativas descartadas:** Fortify `confirmPassword` (no cubre `/admin`); `password.confirm` de Laravel (423, sin modo, sin límite ni auditoría); guardar la ventana en tabla propia (contradice RN-11).

## Orden y aprobación

1. Aprobación técnica de este plan: **hecha por Jonathan el 2026-11-20** (B-1 a B-8 cerradas; B-6 consultada, solo lectura, con fecha).
2. T-01 (consulta de esquema) → T-02 (config) → T-03 (2FA cajero) → T-04 (fixtures).
3. T-05 (soporte y excepciones) → T-06 (confirmación y ventana) → T-07 (auditoría y límite) → T-08 (middleware) → T-09 (resolutores de modo dinámico).
4. Operaciones: T-10 (Siempre), T-11 (cancelar con ventana), T-12 (cuentas y recintos con ventana), T-13 (recintos sin clasificar, B-4), T-14 (sin confirmación).
5. T-15 (límite e intentos en ambos modos), T-16 (RN-01 y cobertura CA-32), T-17 (CA-33, B-5), T-18 (documentación), T-19 (verificación), T-20 (PR), T-21 (estado de la spec).

- Dependencias: `apps/dashboard/tasks/015-step-up-confirmation.md` puede empezar con contratos simulados tras aprobar este plan; la integración real requiere T-06 a T-12.
- Revisión técnica: Jonathan, 2026-11-20 (aprobación técnica del plan). Revisión adicional de equipo: según acuerdo.
- Aprobador funcional: Jonathan (spec aprobada 2026-11-20).
- Evidencias: pendientes de la sesión principal (consulta de esquema, `php artisan test` contra `arca_pruebas`, Pint). Esta sesión no tiene shell y no afirma que pasen.

## Verificación de esquema de la sesión principal (2026-11-20, solo lectura)
- B-6 resuelta: `cache` y `cache_locks` existen en `arca_pruebas` (`information_schema.tables`); `CACHE_STORE=database` en `.env.example` y por defecto en `config/cache.php`. El contador de intentos cabe sin DBR.
- `sessions` existe y `SESSION_DRIVER=database` en `.env.example`.

## Decisión de coordinación 2026-11-20 (sesión principal)
- El 403 por pedir el rol `admin` (api-023 CA-12) también se evalúa **antes** que el 403 de confirmación de contraseña, igual que el de cuenta admin (CA-38): toda negativa por reglas de admin precede a pedir contraseña, para no pedir la contraseña de una operación que de todos modos se rechazará.

## Divergencias de implementación (2026-11-20, sesión de implementación)

Cambios menores respecto al diseño, sin alterar el contrato 403/422/429 ni los CA:

1. **Limpieza de la ventana en login y logout (CA-10).** Las rutas de login y logout de personal son de Fortify (`api/v1/auth/*`), no controladores propios. En lugar de editar un controlador, el listener `app/Listeners/ClearStepUpWindow.php` escucha `Illuminate\Auth\Events\Login` y `Logout` (registrado una sola vez en `AppServiceProvider`; su `handle(object $event)` evita el doble registro por auto-descubrimiento que provocaba el tipo `Login|Logout`, comprobado con `php artisan event:list`) y borra `arca.step_up.confirmed_until` de la sesión. El `AuthController` de la PWA (`staff/auth/*`, tokens) no usa sesión ni ventana.
2. **Segundo parámetro del middleware.** `step-up:always` admite un campo opcional: `step-up:always,current_password` en `admin.users.password.update` (decisión B-1). Por defecto el campo es `password`.
3. **Cliente sin sesión.** `POST admin/password-confirmation` sin sesión de navegador (token Bearer) responde 422 «La confirmación de contraseña requiere una sesión de navegador.» sin consumir intentos; la ventana no puede existir sin sesión (RN-11). No estaba cubierto por la spec; solo afecta a clientes que no son SPA.
4. **Resolutores con recurso inexistente.** `ResolveStaffAccountUpdateModeAction` y `ResolveEnclosureQrRegenerateModeAction` devuelven `none` si la cuenta o el recinto no existen, para que la ruta responda 404 sin pedir contraseña por una operación imposible.
5. **Bloqueo (429) auditado.** Un intento rechazado por bloqueo registra `password-confirmation.failed` con `locked: true` (propuesta del plan aceptada en B-8).
6. **CA-38 parcial.** El guard `console-managed-account` de `api-023` no existe aún. Esta feature solo fija y prueba el orden de middleware (`permission:users.manage` antes de `step-up:*` en las seis rutas de cuentas), que permite insertar el guard entre ambos. El 403 de cuenta admin y el de rol `admin` pedido (decisión de coordinación) se prueban en `api-023`. T-12 queda abierta por esa razón.
7. **Pruebas de otras specs.** `actAs()` de `AdminFeatureTestCase` y `TicketFeatureTestCase` abre una ventana de confirmación vigente (sesión de navegador simulada con `ConfirmsStepUp`) para que las pruebas de api-007 y api-009 sigan cubriendo sus CA sin repetir la confirmación; las operaciones «Siempre» de esas pruebas envían `password` o `current_password`. Ninguna aserción de esos CA se relajó. Las pruebas de api-021 usan `actAsWithoutWindow()` y `actAsConfirmed()`.
8. **`tests/Feature/Auth/PasswordConfirmationTest.php` (CA-09, CA-10, CA-11)** usan `session.driver=database` real con login por Fortify, cookie de sesión (`withCredentials()`) y una ruta de prueba con `step-up:window`; el resto de pruebas de ventana usan la sesión en memoria de PHPUnit (`SESSION_DRIVER=array`).
9. **Pint.** `vendor/bin/pint --test` completo reporta archivos ajenos a este cambio (migraciones, `Animal`, `StaffSyncController`, etc.); se verificaron solo los archivos tocados por esta feature.
10. **Ajustes de la revisión de calidad y seguridad (2026-11-20).**
    - La contraseña de «Siempre» se lee solo del cuerpo (JSON o formulario), nunca de la query (`test_ca12_password_in_the_query_does_not_confirm`).
    - `ResolveStaffAccountUpdateModeAction` reutiliza `FindManageableStaffAccountAction`: cuenta inexistente o fuera de alcance da `none` (404 sin gastar intentos ni auditar), y compara el rol con `getRoleNames()->contains()`, no con `hasRole` (que interpreta `|`).
    - Concurrencia (CA-27): `VerifyStaffPasswordAction` serializa bloqueo, comparación y contador con `Cache::lock` por usuario (10 s; si no obtiene el candado responde 429). Cota: el candado es de la caché (`database`, tabla `cache_locks`), no de MySQL.
    - `admin.password-confirmation.store` lleva `throttle:password-confirmation` (10 por minuto y usuario; «Demasiadas solicitudes de confirmación. Espera un minuto e inténtalo de nuevo.»), definido en `AppServiceProvider`. No es un CA; prueba `test_rn07_*`.
    - Auditoría del bloqueo: solo el primer intento bloqueado de cada periodo de bloqueo se registra (`failed`, `locked: true`); los siguientes responden 429 sin registro.
    - `StepUpWindow` guarda también `arca.step_up.user_id` y `isOpen()` lo compara con el usuario autenticado.
    - Pruebas: CA-27 separa los fallos en el tiempo (el primero en T y el quinto en T+5 min) y comprueba que bloqueo y `Retry-After` cuentan desde el quinto; CA-38 añade pruebas de comportamiento (ticket-prices, cancel y users.update sin permiso y sin `password` responden el 403 de permiso); CA-32 busca el docblock propio.
11. **(Sustituido por el punto 12.)**
12. **CA-42 / RN-19 (hallazgo de seguridad aprobado por Jonathan).** `POST staff/auth/login` ya no emite token a cuentas con rol de `config('arca.two_factor_roles')`: responde 403 `two_factor_login_required` después de validar la contraseña (sin enumerar cuentas), antes de `RateLimiter::clear` y de `last_login_at`. La regla vive en `app/Actions/Auth/RequiresBrowserTwoFactorLoginAction.php` (`forRole`, `forPersonalAccessToken`); el controlador solo delega. Defensa adicional: `EnsureAdministratorTwoFactor` rechaza con el mismo 403 un token personal (`currentAccessToken()` que no es `TransientToken`) de una cuenta con rol de 2FA, lo que cubre tokens emitidos antes del cambio. Pruebas: `tests/Feature/Auth/StaffTokenTwoFactorTest.php` (`test_ca42_*`). Ningún test existente usaba `staff/auth/login`.
