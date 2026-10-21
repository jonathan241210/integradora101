# Tareas · 004 · visitor-authentication

- Spec: `apps/api/specs/004-visitor-authentication.md` (Implementada, 2026-10-21; aprobación funcional de Aksel, 2026-10-20)
- Plan: `apps/api/plan/004-visitor-authentication.md` (Aprobado, Aksel, 2026-10-21)
- Estado del checklist: Aprobado por Aksel, 2026-10-21.

## Alcance

Todas las tareas están bajo `apps/api/src`, más una nota en `apps/api/docs/`. Se consumen las tablas de DBR-003. No hay migración ni dependencia nueva.

## Fuera de este checklist

No editar al implementar estas tareas:

- `apps/mobile`. Este checklist no la edita. El corte HTTP, con `expo-secure-store` y el cliente visitante, quedó en `mobile-004` el 2026-10-21. Sin `EXPO_PUBLIC_API_URL`, Jest sigue con el mock y el código de prueba `123456`.
- `packages/api-client`, incluido `auth.ts`. No se crea el módulo visitante.
- `apps/web` y `apps/dashboard`.
- `docs/adr` y `docs/database`. Este checklist no instala `expo-secure-store`. ADR 0011 está aceptado y esa dependencia pertenece al checklist HTTP de la app.
- Fortify, el login de personal y sus pruebas, salvo el middleware `EnsureStaffUser` en la ruta ya existente `auth.me`.

## Base de datos

- [x] **T-01** (RN-05): No crear migración, SQL ni DBR. Los modelos usan `visitors`, `personal_access_tokens`, `visitor_refresh_tokens` y `visitor_verification_codes` de `database/migrations/2026_10_15_000003_visitor_accounts_schema.php`.

## Modelos, configuración y correo

- [x] **T-02** (RN-08): Crear `app/Models/Visitor.php`, `VisitorRefreshToken.php` y `VisitorVerificationCode.php`. `Visitor` extiende `Authenticatable`, usa `HasApiTokens` y no usa SoftDeletes. Oculta `password`. El cast de `password` es `hashed`.
- [x] **T-03** (CA-05, CA-15, CA-17, CA-20): En `config/sanctum.php` dejar `expiration` en 15. Crear `config/visitor.php` con la versión `2026-10` y `lang/es/visitor.php` con el aviso provisional. En `AppServiceProvider` registrar la regla de contraseña del visitante (`min(8)`, letras y números, `uncompromised()` fuera de `local`), los limiters `visitor-register`, `visitor-login`, `visitor-resend` y `visitor-forgot`, y `URL::forceScheme('https')` fuera de `local` y `testing`. No cambiar `Password::defaults()` del personal.
- [x] **T-04** (CA-01, CA-16, CA-20): Crear `app/Mail/VisitorAccessCodeMail.php`. El código solo viaja en el correo. El mailer sigue siendo el de `.env`; no se agregan secretos a `.env.example`.

## Aislamiento

- [x] **T-05** (CA-08): Crear `app/Http/Middleware/EnsureVisitorToken.php` y `EnsureStaffUser.php`. Registrar los alias en `bootstrap/app.php`. `EnsureStaffUser` se agrega solo a `GET /api/v1/auth/me`. Una sesión `User` sigue entrando.

## Actions

- [x] **T-06** (CA-19): Crear `app/Actions/Visitor/LogVisitorAccessAction.php`. Bitácora `visitor-auth` con evento, correo, IP y user-agent. Eventos: `registered`, `login`, `refresh`, `logout`, `password_reset`, `deleted`. Sin contraseñas, tokens ni códigos.
- [x] **T-07** (CA-03, CA-10, CA-16): Crear `SendVisitorCodeAction`. Código de 6 dígitos, hash bcrypt, 15 minutos, máximo 5 intentos y un solo uso. Invalida el código anterior del mismo propósito. Si el correo no existe, no envía nada.
- [x] **T-08** (CA-05): Crear `IssueVisitorTokensAction`. Access token Sanctum con ability `visitor`, nombre igual al `family_id` y `expires_at` a 15 minutos. Refresh de 64 bytes guardado solo como SHA-256, vigencia 30 días.
- [x] **T-09** (CA-06, CA-07): Crear `RotateRefreshTokenAction` con `Cache::lock`, `lockForUpdate` y la marca de 10 segundos descrita en el plan. La perdedora de la carrera responde 401 sin revocar a la ganadora. El reuso posterior revoca la familia.
- [x] **T-10** (CA-09, CA-11, CA-13): Crear `RevokeVisitorSessionAction` para un dispositivo, para las demás sesiones o para todos los tokens del visitante.
- [x] **T-11** (CA-01, CA-18): Crear `RegisterVisitorAction`. Exige `is_adult = true`, la versión vigente del aviso y un `avatar_code` del catálogo. Responde sin tokens y pide el código `email_verification`. Correo duplicado: 422 «Ese correo ya está registrado.»
- [x] **T-12** (CA-02): Crear `VerifyVisitorEmailAction`. Código válido: marca `email_verified_at`, consume el código y emite el par. Código inválido, vencido, consumido o con 5 intentos: 422 «El código no es válido.» sin sesión.
- [x] **T-13** (CA-04): Crear `LoginVisitorAction`. Correo verificado y contraseña correcta: emite el par y guarda `device_name`. Sin verificar: 403 `email_not_verified`. Credenciales incorrectas o correo inexistente: 422 «Correo o contraseña incorrectos.»
- [x] **T-14** (CA-11): Crear `ResetVisitorPasswordAction`. Código válido: cambia la contraseña y revoca todos los tokens. Código inválido: 422 «El código no es válido.»
- [x] **T-15** (CA-12, CA-13): Crear `UpdateVisitorProfileAction` y `ChangeVisitorPasswordAction`. El perfil editable es `nickname`, `first_name` y `avatar_code`. El cambio de contraseña conserva la sesión actual y revoca las demás.
- [x] **T-16** (CA-14): Crear `DeleteVisitorAccountAction`. Contraseña correcta: registra el evento, borra los tokens Sanctum y hace `delete()`. Contraseña incorrecta: 422 «La contraseña no es correcta.»

## HTTP

- [x] **T-17** (CA-01, CA-02, CA-03, CA-04, CA-06, CA-09, CA-10, CA-11, CA-12, CA-13, CA-14, CA-15, RN-07): Crear Form Requests, Resources y controladores delgados en `app/Http/Requests/Visitor/`, `app/Http/Resources/` y `app/Http/Controllers/Visitor/`. Declarar en `routes/api.php` las rutas nombradas del plan, con los middleware y los throttle indicados. Los JSON usan los campos y los `message` en español del plan.

## Pruebas

Cada prueba vive en `tests/Feature/Visitor/`, usa `DatabaseTransactions` sobre `arca_pruebas` y nombra su `CA-xx` en el método. `Mail::fake()` y `Http::fake()` hacia HIBP. Prohibido `RefreshDatabase` y `migrate:fresh`.

- [x] **T-18** (CA-01): Crear `test_ca01_register_creates_account_sends_code_and_returns_no_tokens` en `RegisterTest.php`.
- [x] **T-19** (CA-02): Crear `test_ca02_verify_issues_tokens_and_rejects_bad_codes` en `VerifyEmailTest.php`.
- [x] **T-20** (CA-03): Crear `test_ca03_resend_is_generic_and_rate_limited` en `VerifyEmailTest.php`.
- [x] **T-21** (CA-04): Crear `test_ca04_login_tokens_unverified_invalid_and_throttle` en `LoginTest.php`.
- [x] **T-22** (CA-05): Crear `test_ca05_access_token_ability_and_refresh_hash` en `TokenTest.php`.
- [x] **T-23** (CA-06): Crear `test_ca06_refresh_rotates_and_reuse_revokes_family` en `RefreshTest.php`.
- [x] **T-24** (CA-07): Crear `test_ca07_concurrent_refresh_keeps_a_single_pair` en `RefreshTest.php`.
- [x] **T-25** (CA-08): Crear `test_ca08_staff_and_visitor_tokens_are_isolated` en `IsolationTest.php`. La sesión de personal en `auth.me` sigue en 200.
- [x] **T-26** (CA-09): Crear `test_ca09_logout_revokes_device_family` en `LogoutTest.php`.
- [x] **T-27** (CA-10): Crear `test_ca10_forgot_password_is_generic_and_limited` en `PasswordResetTest.php`.
- [x] **T-28** (CA-11): Crear `test_ca11_reset_changes_password_and_revokes_all_tokens` en `PasswordResetTest.php`.
- [x] **T-29** (CA-12): Crear `test_ca12_profile_show_and_update_validates_avatar` en `ProfileTest.php`.
- [x] **T-30** (CA-13): Crear `test_ca13_password_change_keeps_current_session` en `ProfileTest.php`.
- [x] **T-31** (CA-14): Crear `test_ca14_delete_requires_password_and_removes_rows` en `DeleteAccountTest.php`.
- [x] **T-32** (CA-15): Crear `test_ca15_privacy_notice_returns_version_and_content` en `PrivacyNoticeTest.php`.
- [x] **T-33** (CA-16): Crear `test_ca16_codes_are_hashed_single_use_and_expire` en `VerificationCodeTest.php`.
- [x] **T-34** (CA-17): Crear `test_ca17_password_rule_and_bcrypt` en `PasswordPolicyTest.php`.
- [x] **T-35** (CA-18): Crear `test_ca18_register_is_limited_per_ip` en `RegisterTest.php`.
- [x] **T-36** (CA-19): Crear `test_ca19_access_log_omits_secrets` en `AuditTest.php`.
- [x] **T-37** (CA-20): Crear `test_ca20_https_outside_local_and_mail_from_env` en `OperationsTest.php`.
- [x] **T-38** (CA-21): Crear `test_ca21_suite_names_every_visitor_criterion` en `CoverageTest.php`. Comprueba que los archivos de `tests/Feature/Visitor` nombran `CA-01` a `CA-21`.

## Calidad y entrega

- [x] **T-39**: Ejecutar `php artisan test` desde `apps/api/src`. La suite de personal existente debe seguir en verde.
- [x] **T-40**: Documentar el contrato del visitante en `apps/api/docs/`, sin secretos ni credenciales. El PR enlaza spec, plan y tasks.

Cada CA-01 a CA-21 tiene una tarea de prueba que lo nombra. Ninguna tarea sale de `apps/api`.

Cierre 2026-10-21: `php artisan test` en verde (51 pruebas, 694 aserciones). La spec quedó en Implementada. El PR enlaza spec, plan y tasks.
