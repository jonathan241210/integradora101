# Tareas · 021 · staff-step-up-confirmation

- Spec: `apps/api/specs/021-staff-step-up-confirmation.md` (Aprobada, 2026-11-20)
- Plan: `apps/api/plan/021-staff-step-up-confirmation.md` (Borrador, pendiente de aprobación técnica; brechas B-1 a B-8 abiertas)
- Dashboard: `apps/dashboard/tasks/015-step-up-confirmation.md` (consume el contrato de este cambio)

**Pendiente: se ejecuta solo cuando el plan esté aprobado.** Ninguna tarea se marca hecha sin evidencia aportada por la sesión principal. Bloqueadas por brechas: T-10 (ruta de B-1), T-12 (B-2, B-3), T-13 (B-4), T-16 (B-4, B-5) y T-17 (B-5).

## Base de datos (responsable de BD)

- [ ] **T-01** (CA-27): consulta de solo lectura en `arca_pruebas` (`information_schema`) de `cache` y `cache_locks`, con fecha y resultado registrados en «Consulta de esquema vivo» del plan (B-6). Si faltan, abrir una DBR propia en `docs/database/requests/` (no creada por esta tarea) y no tocar la caché por SQL. Sin migración en este cambio.

## Taquilla con 2FA (cajero)

- [ ] **T-02** (CA-31, CA-05): en `src/config/arca.php`, `two_factor_roles` = `['admin', 'zoo-admin', 'cashier']`; añadir el bloque `password_confirmation` (`window_minutes` 10, `max_attempts` 5, `attempts_window_minutes` 10, `lockout_minutes` 10) sin variables de entorno. Tests `test_ca31_two_factor_roles_contiene_cashier_y_no_veterinarian_ni_executive` y `test_ca05_admin_y_zoo_admin_mantienen_2fa_de_api_003` en `src/tests/Feature/Auth/CashierTwoFactorTest.php`.
- [ ] **T-03** (CA-01, CA-02, CA-03, CA-04): verificar en el controlador de login de Fortify que `two_factor: true` depende de la 2FA confirmada y no del rol (si depende del rol, ajustar a la config). Actualizar `src/tests/Feature/Auth/MeTest.php` (lista de roles con 2FA, línea 39). Tests `test_ca01_*`, `test_ca02_*`, `test_ca03_*` y `test_ca04_*` en `CashierTwoFactorTest.php`.
- [ ] **T-04** (CA-30, CA-01): cambiar las 60 llamadas `createAccount('cashier', false)` de 31 archivos de `src/tests/Feature/Tickets/` a 2FA confirmado, revisando una a una las que prueban permisos (403 de permiso, no de 2FA). No relajar ninguna aserción. Test `test_ca30_cajero_con_2fa_vende_y_consulta_historial_con_forma_de_api_009` en `CashierTwoFactorTest.php`.

## Confirmación de contraseña: mecanismo

- [ ] **T-05** (soporte de CA-06, CA-07, CA-13, CA-27): crear `src/app/Support/StepUp/StepUpWindow.php` (clave `arca.step_up.confirmed_until`, `open`, `isOpen`; fallo cerrado sin sesión), `src/app/Exceptions/PasswordIncorrectException.php` y `PasswordAttemptsExceededException.php`, y su render JSON en `src/bootstrap/app.php` (422 con `errors.password`; 429 con `Retry-After`). Sin CA propio; se prueba en T-06, T-07 y T-10.
- [ ] **T-06** (CA-06, CA-07, CA-08, CA-09, CA-10, CA-11): crear `src/app/Actions/Auth/StepUp/ConfirmStaffPasswordAction.php` y `VerifyStaffPasswordAction.php`, `src/app/Http/Controllers/Admin/PasswordConfirmationController.php` (invocable), `src/app/Http/Requests/Admin/ConfirmStaffPasswordRequest.php` y la ruta `admin.password-confirmation.store` (`POST /api/v1/admin/password-confirmation`) en el grupo admin con `auth:sanctum`, `staff.user` y `administrator.two-factor`, sin `step-up`. Limpiar `arca.step_up.confirmed_until` en login y logout (CA-10). Tests en `src/tests/Feature/Auth/PasswordConfirmationTest.php`: `test_ca06_*`, `test_ca07_*`, `test_ca08_*` (con `Carbon::setTestNow`), `test_ca09_*`, `test_ca10_*` y `test_ca11_*`, estos tres con `session.driver=database` aplicado en el test. Si el driver no se puede aplicar, registrar la brecha antes de cerrar la tarea.
- [ ] **T-07** (CA-28, CA-29, CA-27): crear `src/app/Actions/Auth/StepUp/PasswordAttemptLimiter.php` (contador por usuario en caché; bloqueo de 10 min desde el quinto fallo; `Retry-After`) y `LogPasswordConfirmationAction.php` (`password-confirmation.succeeded|failed` con `email`, `ip`, `user_agent`, `route`, `mode`, `locked`; sin contraseña ni hash). Cerrar después de resolver B-7 y B-8. Tests `test_ca28_*` y `test_ca29_*` en `src/tests/Feature/Admin/StepUpAttemptLimitTest.php`.

## Clasificación y middleware

- [ ] **T-08** (CA-12, CA-15): crear `src/app/Http/Middleware/RequireStepUpConfirmation.php` y el alias `step-up` en `src/bootstrap/app.php`. Modos `none`, `window`, `always` y los dinámicos `staff-account-update` y `enclosure-qr-regenerate`. 403 `password_confirmation_required` con `mode` (`window` o `always`) y mensaje en español. En `always`, cuerpo sin `password` → 403 sin registrar intento. El middleware no contiene reglas de negocio: delega en Actions.
- [ ] **T-09** (CA-36, CA-20, CA-34, CA-15): crear `src/app/Actions/Admin/StepUp/ResolveStaffAccountUpdateModeAction.php` (always si `role` viene y cambia respecto del actual; si no, window) y `ResolveEnclosureQrRegenerateModeAction.php` (window si hay QR activo; none si no; B-3). Tests en `StepUpStatusAndRoleTest.php` (CA-36) y `StepUpWindowTest.php` (CA-20).

## Operaciones «Siempre»

- [ ] **T-10** (CA-12, CA-13, CA-14): `step-up:always` en `admin.ticket-prices.store` y `admin.users.two-factor.destroy`. `admin.users.password.update` queda **bloqueada por B-1**. Tests `test_ca12_*`, `test_ca13_*` y `test_ca14_*` en `src/tests/Feature/Admin/StepUpAlwaysTest.php` (incluye las reglas de api-009 CA-18 y CA-19 y de api-007 CA-10 y CA-11).

## Operaciones «Ventana»

- [ ] **T-11** (CA-15, CA-16): `step-up:window` en `admin.tickets.cancel`, después de `permission:tickets.cancel` y `throttle:ticket-cancel`. Tests `test_ca15_*` (parte de cancelar) y `test_ca16_*` (ventana vigente cancela sin otra contraseña; expirada → 403) en `src/tests/Feature/Admin/StepUpWindowTest.php`.
- [ ] **T-12** (CA-15, CA-17, CA-18, CA-19, CA-35): `step-up:window` en `admin.users.store`, `admin.users.status` y `admin.users.destroy`; `step-up:staff-account-update` en `admin.users.update`; `step-up:window` en `admin.enclosures.destroy`; `step-up:enclosure-qr-regenerate` en `admin.enclosures.qr.regenerate`. Tests `test_ca17_*`, `test_ca18_*`, `test_ca19_*` y `test_ca15_*` (crear, editar, desactivar, eliminar cuenta, eliminar recinto y regenerar QR) en `StepUpWindowTest.php`; `test_ca35_*` en `StepUpStatusAndRoleTest.php`, con y sin ventana. B-2 para cuentas con rol admin.
- [ ] **T-13** (recintos, B-4): `admin.enclosures.store`, `admin.enclosures.update` y `admin.enclosures.status` se clasifican solo cuando B-4 se resuelva. Hasta entonces no se añade `step-up` a esas rutas.

## Operaciones «No pide» y lecturas

- [ ] **T-14** (CA-21, CA-22, CA-23, CA-24, CA-25, CA-26, CA-34): `step-up:none` en `admin.tickets.store`, `admin.tickets.quote`, `admin.reports.tickets.export`, `admin.enclosures.qr.generate`, escritura de `admin.news.*` y `admin.events.*`, `admin.memories.accept|reject`, `admin.species-publication-requests.*` (escritura) y `admin.species.*` de publicación. Tests `test_ca21_*` a `test_ca26_*` y `test_ca34_*` en `src/tests/Feature/Admin/StepUpNoConfirmationTest.php`. `test_ca25_*` cubre la PWA de `veterinarian` (`/api/v1/staff/*` y `/api/v1/veterinarian/*`). Las lecturas `GET` quedan sin `step-up` (CA-26).

## Límite de intentos y auditoría

- [ ] **T-15** (CA-27, CA-28, CA-29): pruebas cruzadas de límite en ventana y en Siempre (cinco fallos, bloqueo de 10 minutos con `Carbon::setTestNow`, acierto con y sin bloqueo, `Retry-After`) y de auditoría (`succeeded` y `failed` sin contraseña; 403 de falta de confirmación sin registro). Ejecutar después de T-10 a T-14. Archivo `src/tests/Feature/Admin/StepUpAttemptLimitTest.php`.

## Cobertura y verificación del contrato

- [ ] **T-16** (RN-01, CA-32): `src/tests/Feature/Admin/StepUpClassificationTest.php` con `test_rn01_toda_escritura_admin_declara_modo_step_up` (recorre `Route::getRoutes()` y exige parámetro `step-up:` en cada escritura `admin.*`, excepto `admin.password-confirmation.store`) y `test_ca32_cada_criterio_tiene_al_menos_un_test` (busca `test_caNN_` en `src/tests/`). Bloqueada por B-4 y B-5 para cerrarse en verde.
- [ ] **T-17** (CA-33): sin implementación ni test. Pendiente de B-5 (CA-33 está fuera de alcance según «Decisiones finales»; CA-32 lo exige). Registrar la decisión antes de cerrar T-16.

## Calidad y entrega

- [ ] **T-18**: documentación de la API. Actualizar `apps/api/docs/administracion.md` (2FA de cajeros, tabla de modos RN-01, contrato 403/422/429, `POST /admin/password-confirmation`) y `apps/api/docs/tickets.md` (línea 21, que dice que `cashier` no pasa por 2FA). Añadir la nota del demo (`boletaje@arca.local` sin 2FA). Sin cambios en `infra/README.md` (ninguna variable ni requisito de servidor nuevo); confirmarlo en la revisión.
- [ ] **T-19**: verificaciones de la API, con salida real aportada por la sesión principal: Pint sobre archivos tocados; `php artisan test` filtrado por `StepUp|CashierTwoFactor|PasswordConfirmation|MeTest|AdministratorTwoFactor|StaffAccountTwoFactor|TicketPriceAccess` y la suite completa; `migrate:status` sin migraciones nuevas. Todo contra `arca_pruebas`; nunca `arca_zoo`.
- [ ] **T-20**: PR que enlaza `apps/api/specs/021-staff-step-up-confirmation.md`, `apps/api/plan/021-staff-step-up-confirmation.md`, `apps/api/tasks/021-staff-step-up-confirmation.md` y `apps/dashboard/*/015-step-up-confirmation.md`. Cita `api-021` en el commit (los commits los hace Jonathan con el comando que indique). Si B-1, B-4 o B-5 cambian la spec, la enmienda va en el mismo PR (spec, plan y tasks).
- [ ] **T-21**: estado de la spec 021 a «En progreso» al iniciar la implementación, y a «Implementada» solo con enlace al PR y resultados de los CA-01 a CA-36 (CA-33 según la decisión de B-5).

Cada tarea de código nombra sus CA-xx. Cada CA-xx (salvo CA-33, pendiente de B-5) tiene al menos una tarea de prueba: CA-01 a CA-32 y CA-34 a CA-36 en T-02 a T-16.
