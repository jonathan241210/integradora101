# Plan técnico · 004 · visitor-authentication

- Spec: `apps/api/specs/004-visitor-authentication.md`
- Estado de spec: Implementada (2026-10-21; aprobación funcional de Aksel, 2026-10-20)
- Estado del plan: Aprobado (Aksel, 2026-10-21)
- Responsable técnico: Aksel (cuenta visitante)
- Responsable de BD: Victor Adrian. DBR-001 y DBR-003 ya están en `Lista para backend` y aplicadas en `arca_pruebas`. Este plan no pide migración nueva.

## Diseño de solución

La API emite la cuenta y la sesión del visitante adulto. El personal sigue en cookie, CSRF y Fortify (`/api/v1/auth/*`, modelo `User`). El visitante usa Bearer bajo `/api/v1/visitor/*`, modelo `Visitor`, ability `visitor`. No hay roles Spatie para el visitante.

Flujo: aviso de privacidad público → registro 201 sin tokens y código de 6 dígitos por correo → verificación 200 con el par de tokens → la app renueva con refresh rotatorio. Logout, cambio de contraseña y borrado revocan sesiones según cada criterio. Recuperar la contraseña responde 202 genérico, acepta el código y revoca todos los tokens.

La lógica vive en las Actions de RN-10. Los controladores solo reciben el Form Request, llaman la Action y devuelven un Resource. Este plan no sustituye el repositorio simulado de la app móvil ni crea el módulo visitante de `@arca/api-client`. Ese cambio es el corte siguiente, cuando estos endpoints existan, y no edita `packages/api-client/auth.ts`, `apps/web` ni `apps/dashboard`.

ADR 0011 fue aceptado el 2026-10-21, después de aprobar este plan. El backend no lo necesitaba para estos endpoints: Sanctum ya está en ADR 0001 y el correo sale por el mailer nativo de Laravel. Este plan no instala dependencias. `expo-secure-store` es de la app: el checklist HTTP de `mobile-004` lo aprobó Aksel el 2026-10-21 y la app lo instaló ese día.

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / modelos | `app/Models/Visitor.php`, `VisitorRefreshToken.php`, `VisitorVerificationCode.php` | Cuenta, refresh y códigos. `Visitor` usa `HasApiTokens`. Sin SoftDeletes |
| API / Actions | `app/Actions/Visitor/RegisterVisitorAction.php`, `VerifyVisitorEmailAction.php`, `IssueVisitorTokensAction.php`, `RotateRefreshTokenAction.php`, `RevokeVisitorSessionAction.php`, `SendVisitorCodeAction.php`, `ResetVisitorPasswordAction.php`, `DeleteVisitorAccountAction.php`, `LogVisitorAccessAction.php` | Reglas de RN-10 y bitácora |
| API / HTTP | `app/Http/Controllers/Visitor/*`, `app/Http/Requests/Visitor/*`, `app/Http/Resources/VisitorProfileResource.php`, `VisitorTokenResource.php`, `PrivacyNoticeResource.php` | Contrato JSON |
| API / acceso | `app/Http/Middleware/EnsureVisitorToken.php`, `EnsureStaffUser.php`; alias en `bootstrap/app.php` | CA-08. `EnsureStaffUser` se agrega solo a `auth.me` |
| API / config | `config/sanctum.php` (`expiration` = 15), `config/visitor.php`, `lang/es/visitor.php`, `AppServiceProvider` | Vigencia, aviso, límites, HTTPS fuera de local/testing y regla de contraseña del visitante |
| API / correo | `app/Mail/VisitorAccessCodeMail.php` | Código de verificación o de recuperación. Sin SDK |
| API / rutas | `routes/api.php` | Rutas nombradas bajo el prefijo ya existente `api/v1` |
| API / pruebas | `tests/Feature/Visitor/*` | Un test por CA-01 a CA-21, con `DatabaseTransactions` sobre `arca_pruebas` |
| API / docs | `apps/api/docs/` nota breve del contrato visitante | Referencia local, sin secretos |
| Fuera de este plan | `apps/mobile`, `packages/api-client`, `apps/web`, `apps/dashboard`, `docs/adr`, `docs/database` | No se editan al implementar este plan |

## Contrato y datos

### Rutas nombradas

El prefijo `api/v1` ya lo pone `bootstrap/app.php`. Las rutas nuevas se agrupan con `prefix('visitor')->name('visitor.')`.

| Método y ruta | Nombre | Middleware |
|---|---|---|
| `GET /api/v1/visitor/legal/privacy-notice` | `visitor.legal.privacy-notice` | Público |
| `POST /api/v1/visitor/auth/register` | `visitor.auth.register` | `throttle:visitor-register` |
| `POST /api/v1/visitor/auth/email/verify` | `visitor.auth.email.verify` | — |
| `POST /api/v1/visitor/auth/email/resend` | `visitor.auth.email.resend` | `throttle:visitor-resend` |
| `POST /api/v1/visitor/auth/login` | `visitor.auth.login` | `throttle:visitor-login` |
| `POST /api/v1/visitor/auth/refresh` | `visitor.auth.refresh` | — |
| `POST /api/v1/visitor/auth/logout` | `visitor.auth.logout` | `auth:sanctum`, `visitor.token` |
| `POST /api/v1/visitor/auth/password/forgot` | `visitor.auth.password.forgot` | `throttle:visitor-forgot` |
| `POST /api/v1/visitor/auth/password/reset` | `visitor.auth.password.reset` | — |
| `GET /api/v1/visitor/me` | `visitor.me.show` | `auth:sanctum`, `visitor.token` |
| `PATCH /api/v1/visitor/me` | `visitor.me.update` | `auth:sanctum`, `visitor.token` |
| `PUT /api/v1/visitor/me/password` | `visitor.me.password.update` | `auth:sanctum`, `visitor.token` |
| `DELETE /api/v1/visitor/me` | `visitor.me.destroy` | `auth:sanctum`, `visitor.token` |

`visitor.token` es `EnsureVisitorToken`: el `tokenable` es `Visitor`, el token actual tiene ability `visitor` y no está vencido. Si llega una sesión cookie del personal, responde 403. Sin credencial, Sanctum responde 401.

`EnsureStaffUser` se añade a la ruta existente `auth.me`. Una sesión `User` sigue entrando igual. Un Bearer `visitor` recibe 403. No se tocan Fortify, el login, el 2FA ni los clientes del personal.

### Cuerpo JSON

Campos en inglés. Mensajes `message` en español.

Registro: `email`, `password`, `password_confirmation`, `first_name`, `nickname`, `avatar_code`, `is_adult`, `privacy_notice_version`. Respuesta 201 `{ "message": "Te enviamos un código de 6 dígitos para verificar tu correo." }` y ningún token. `is_adult` debe ser `true`. `privacy_notice_version` debe ser la versión vigente. `avatar_code` debe ser uno de `jaguar`, `lion`, `elephant`, `macaw`, `monkey`, `turtle`, `deer`, `wolf`. Correo duplicado: 422 «Ese correo ya está registrado.» El registro sí puede decir que el correo existe; la respuesta genérica de RN-04 aplica a login, reenvío y olvido.

Verificación: `email`, `code`. Éxito 200 con el par y el visitante. Código inválido, vencido, consumido o con 5 intentos: 422 «El código no es válido.» sin sesión.

Reenvío y olvido: solo `email`. Siempre 202 `{ "message": "Si el correo está registrado, enviamos un código de 6 dígitos." }`, haya o no cuenta. Reenvío: 1 por minuto y 5 por hora por correo. Olvido: 3 por hora por correo.

Login: `email`, `password`, `device_name`. Éxito 200 con el par. Correo sin verificar: 403 `{ "message": "Confirma tu correo antes de entrar.", "code": "email_not_verified" }`. Credenciales incorrectas, incluido un correo inexistente: 422 «Correo o contraseña incorrectos.» Más de 5 intentos por minuto por correo e IP: 429 «Espera N segundos e inténtalo de nuevo.» Más de 5 registros por hora por IP: el mismo 429.

Refresh: `refresh_token`. Éxito 200 con un par nuevo. El refresh anterior queda con `replaced_by_id`. Si el refresh ya estaba revocado o reemplazado y no es la petición perdedora de una carrera, 401 «La sesión ya no es válida. Vuelve a entrar.» y se revoca toda la familia.

Logout: Bearer más `refresh_token`. 204. Revoca el access token actual y la familia de refresh de ese dispositivo.

Reset: `email`, `code`, `password`, `password_confirmation`. 200 `{ "message": "Contraseña actualizada. Vuelve a entrar." }` y revoca todos los tokens del visitante. Código inválido: 422 «El código no es válido.»

Perfil `GET` y `PATCH`: `data` con `email`, `first_name`, `nickname`, `avatar_code`. El `PATCH` acepta `nickname`, `first_name`, `avatar_code`. El correo no se edita aquí. La API entrega el perfil del tutor a su propia sesión. Limitar lo que ve el menor a apodo y avatar sigue siendo de la app móvil.

Cambio de contraseña: `current_password`, `password`, `password_confirmation`. 200 y se revocan las demás sesiones. La sesión que hizo el cambio permanece.

Borrado: `{ "password": "…" }`. Contraseña correcta: 204 y borrado físico. Incorrecta: 422 «La contraseña no es correcta.»

Aviso: `{ "data": { "version": "2026-10", "content": "…" } }`. El texto provisional vive en `lang/es/visitor.php` y la versión en `config/visitor.php`. El zoológico puede sustituir el texto sin migración. El registro rechaza otra versión.

Par de tokens:

```json
{
  "data": {
    "token_type": "Bearer",
    "expires_in": 900,
    "access_token": "…",
    "refresh_token": "…",
    "visitor": {
      "email": "…",
      "first_name": "…",
      "nickname": "…",
      "avatar_code": "jaguar"
    }
  }
}
```

### Actions

- `RegisterVisitorAction`: valida mayoría y versión del aviso, crea `Visitor` sin `email_verified_at`, guarda `adult_confirmed_at` y `privacy_accepted_at`, y pide el código `email_verification`. `last_name` queda nulo: el alta no lo pide. `is_active` queda verdadero.
- `SendVisitorCodeAction`: código de 6 dígitos con `random_int`, guardado solo con `Hash::make`. Vence a los 15 minutos, `attempts` en 0. Invalida el código anterior del mismo propósito. Envía `VisitorAccessCodeMail`. Si el correo no existe, reenvío y olvido no envían nada y aun así responden 202.
- `VerifyVisitorEmailAction`: busca el código vigente, compara con `Hash::check`, suma intentos y a los 5 lo deja inservible. Si es válido, marca `email_verified_at`, consume el código y llama a `IssueVisitorTokensAction`.
- `IssueVisitorTokensAction`: crea un access token Sanctum con nombre igual al `family_id` (UUID), ability `visitor` y `expires_at` a 15 minutos. El refresh son 64 bytes aleatorios; en `visitor_refresh_tokens` solo se guarda `hash('sha256', $plain)`, con `expires_at` a 30 días. El plano se devuelve una sola vez.
- `RotateRefreshTokenAction`: ver la sección de concurrencia. La familia es el conjunto de filas con el mismo `family_id` más los access tokens Sanctum cuyo `name` es ese `family_id`.
- `RevokeVisitorSessionAction`: logout de un dispositivo, revocación del resto al cambiar contraseña, o revocación total al recuperar la contraseña.
- `ResetVisitorPasswordAction`: consume el código `password_reset`, cambia el hash bcrypt y revoca todos los tokens.
- `DeleteVisitorAccountAction`: exige la contraseña, registra el evento, borra los `personal_access_tokens` del visitante (esa tabla no tiene FK hacia `visitors`) y llama `delete()`. Las FK de refresh, códigos y progreso ya están en `ON DELETE CASCADE`.
- `LogVisitorAccessAction`: `activity('visitor-auth')` con evento, correo, IP y user-agent. Eventos: `registered`, `login`, `refresh`, `logout`, `password_reset`, `deleted`. Nunca contraseña, token ni código. El borrado se registra antes de eliminar la fila, sin dejar el secreto en propiedades.

La contraseña del visitante no usa `Password::defaults()`: esa regla sigue siendo la del personal (12 caracteres, mayúsculas, símbolos). La del visitante es `Password::min(8)->letters()->numbers()` y `uncompromised()` fuera de `local`. En pruebas el entorno es `testing`, así que el test finge la respuesta de HIBP con `Http::fake` y no llama a la red. `local` sigue omitiendo `uncompromised()`.

### Concurrencia del refresh

`RotateRefreshTokenAction` toma `Cache::lock` sobre el hash y, dentro, una transacción con `lockForUpdate` en la fila.

- Si la fila sigue activa y no venció, esta petición gana: crea el par nuevo, llena `replaced_by_id` y guarda una marca de caché de 10 segundos `visitor-refresh-rotated:{hash}`.
- Si la fila ya fue reemplazada y esa marca existe, es la petición perdedora de la carrera: responde 401 y no revoca a la ganadora. Así queda un solo par válido (CA-07).
- Si la fila ya fue reemplazada o revocada y la marca no existe, es reuso posterior: revoca la familia y responde 401 (CA-06). El test de reuso borra la marca en lugar de esperar 10 segundos.

El candado usa el cache de Laravel ya configurado. No agrega Redis ni otro paquete. En pruebas el driver es el de PHPUnit.

### Datos

No hay migración ni DBR nueva (RN-05). Se consumen `visitors`, `personal_access_tokens`, `visitor_refresh_tokens` y `visitor_verification_codes` de `2026_10_15_000003_visitor_accounts_schema.php`.

`Visitor` no extiende un `BaseModel` (en esta app no hay esa clase) ni usa SoftDeletes. Igual que `User` extiende `Authenticatable`. La excepción de borrado físico ya está cerrada en RN-08 y en DBR-003: no son datos clínicos ni financieros. No se agregan `created_by` ni `updated_by`.

El índice único de `email` no está en DBR-003. El registro lo valida en la petición. Dos altas simultáneas del mismo correo pueden, en una carrera, crear dos filas. No se abre DBR en este plan porque la spec prohíbe migraciones nuevas. Queda como riesgo residual, no como trabajo de este checklist.

`config/sanctum.php` pasa `expiration` de `null` a `15`. Esa clave solo afecta tokens personales; la sesión cookie del personal sigue en `SESSION_LIFETIME`. El access token también guarda `expires_at` a 15 minutos para que CA-05 lo inspeccione.

### Errores

| Situación | HTTP | Cuerpo |
|---|---|---|
| Validación, código malo, contraseña de borrado incorrecta | 422 | `message` en español |
| Correo sin verificar | 403 | `code: email_not_verified` |
| Refresh reusado, familia revocada o Bearer ausente | 401 | mensaje en español |
| Cookie o token del otro actor | 403 | mensaje en español |
| Límite de intentos o de registros | 429 | «Espera N segundos e inténtalo de nuevo.» y cabecera `Retry-After` |

## Seguridad, offline y operación

- Contraseñas con el cast `hashed` (bcrypt). Refresh solo como SHA-256. Códigos solo como bcrypt. El plano del refresh y el código salen una vez: en el JSON o en el correo.
- El correo lo manda el mailer de `.env`. `.env.example` ya tiene `MAIL_MAILER=log` y no gana contraseñas ni host reales. Fuera de `local` y `testing`, `AppServiceProvider` fuerza `URL::forceScheme('https')`.
- Límites con `RateLimiter` en `AppServiceProvider`, separados de los de Fortify: `visitor-register` 5/hora por IP; `visitor-login` 5/minuto por correo e IP; `visitor-resend` 1/minuto y 5/hora por correo; `visitor-forgot` 3/hora por correo.
- Bitácora `visitor-auth`, distinta de `auth` del personal. Sin secretos.
- Sin cola offline: un cliente sin red no llama a la API. La app ya muestra «Sin conexión» y no encola credenciales.
- MySQL 8.0.x por `.env`, portable entre Aiven y local (ADR 0010 y ADR 0013). Pruebas solo contra `arca_pruebas`. `prohibitDestructiveCommands()` se conserva. Prohibido `RefreshDatabase` y `migrate:fresh`.
- El aviso provisional no es el texto legal definitivo. Cambiarlo es editar `lang/es/visitor.php` y la versión en `config/visitor.php`.

## Mapeo de criterios a pruebas

Todas en `apps/api/src/tests/Feature/Visitor/`. Cada método se llama `test_caXX_…` y el comentario o el nombre contiene `CA-xx`. `Mail::fake()` y `Http::fake()` hacia HIBP. Trait compartido para crear un visitante verificado sin pasar por HTTP cuando el criterio no es el alta.

| Criterio | Prueba automatizada | App/ubicación |
|---|---|---|
| CA-01 | `test_ca01_register_creates_account_sends_code_and_returns_no_tokens` | `tests/Feature/Visitor/RegisterTest.php` |
| CA-02 | `test_ca02_verify_issues_tokens_and_rejects_bad_codes` | `tests/Feature/Visitor/VerifyEmailTest.php` |
| CA-03 | `test_ca03_resend_is_generic_and_rate_limited` | `tests/Feature/Visitor/VerifyEmailTest.php` |
| CA-04 | `test_ca04_login_tokens_unverified_invalid_and_throttle` | `tests/Feature/Visitor/LoginTest.php` |
| CA-05 | `test_ca05_access_token_ability_and_refresh_hash` | `tests/Feature/Visitor/TokenTest.php` |
| CA-06 | `test_ca06_refresh_rotates_and_reuse_revokes_family` | `tests/Feature/Visitor/RefreshTest.php` |
| CA-07 | `test_ca07_concurrent_refresh_keeps_a_single_pair` | `tests/Feature/Visitor/RefreshTest.php` |
| CA-08 | `test_ca08_staff_and_visitor_tokens_are_isolated` | `tests/Feature/Visitor/IsolationTest.php` |
| CA-09 | `test_ca09_logout_revokes_device_family` | `tests/Feature/Visitor/LogoutTest.php` |
| CA-10 | `test_ca10_forgot_password_is_generic_and_limited` | `tests/Feature/Visitor/PasswordResetTest.php` |
| CA-11 | `test_ca11_reset_changes_password_and_revokes_all_tokens` | `tests/Feature/Visitor/PasswordResetTest.php` |
| CA-12 | `test_ca12_profile_show_and_update_validates_avatar` | `tests/Feature/Visitor/ProfileTest.php` |
| CA-13 | `test_ca13_password_change_keeps_current_session` | `tests/Feature/Visitor/ProfileTest.php` |
| CA-14 | `test_ca14_delete_requires_password_and_removes_rows` | `tests/Feature/Visitor/DeleteAccountTest.php` |
| CA-15 | `test_ca15_privacy_notice_returns_version_and_content` | `tests/Feature/Visitor/PrivacyNoticeTest.php` |
| CA-16 | `test_ca16_codes_are_hashed_single_use_and_expire` | `tests/Feature/Visitor/VerificationCodeTest.php` |
| CA-17 | `test_ca17_password_rule_and_bcrypt` | `tests/Feature/Visitor/PasswordPolicyTest.php` |
| CA-18 | `test_ca18_register_is_limited_per_ip` | `tests/Feature/Visitor/RegisterTest.php` |
| CA-19 | `test_ca19_access_log_omits_secrets` | `tests/Feature/Visitor/AuditTest.php` |
| CA-20 | `test_ca20_https_outside_local_and_mail_from_env` | `tests/Feature/Visitor/OperationsTest.php` |
| CA-21 | `test_ca21_suite_names_every_visitor_criterion` | `tests/Feature/Visitor/CoverageTest.php` |

CA-21 lee los archivos `tests/Feature/Visitor` y exige `CA-01` … `CA-21`. La suite se ejecuta con `php artisan test` desde `apps/api/src`. Los tests de personal que ya pasan no se reescriben; CA-08 los deja verdes porque `EnsureStaffUser` acepta `User`.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencia nueva en la API. Sanctum está en ADR 0001. Correo por el mailer de Laravel y `.env`. ADR 0011 está aceptado desde el 2026-10-21. Este plan no instala `expo-secure-store`: es dependencia de la app. MySQL solo por `.env` (ADR 0013). |
| II. La spec manda | Sí | Spec Implementada el 2026-10-21. Este plan no agrega Google, cuentas de menores, progreso, dashboard ni cambios al login de personal. El cliente móvil se cerró después, en `mobile-004`, sin editar `auth.ts`. |
| III. Lógica separada de la interfaz | Sí | Actions y controladores delgados. Este corte no pone reglas en la app ni en el paquete cliente. |
| IV. Un test por criterio | Sí | La tabla de arriba nombra CA-01 a CA-21 en PHPUnit. |
| V. Una sola fuente de verdad para los datos | Sí, con la excepción ya aprobada | No hay migración nueva. DBR-001 y DBR-003 están en `Lista para backend`. `Visitor` no usa SoftDeletes: RN-08 y DBR-003 lo exigen porque el borrado es físico y no es dato clínico ni financiero. No existe `BaseModel` en la API; `User` tampoco lo extiende. |
| VI. Código en inglés, personas en español | Sí | Rutas, campos y clases en inglés. `message` y el correo en español. |

Ninguna brecha queda abierta para el código de este plan. La excepción de SoftDeletes ya venía aprobada en la spec y en la DBR.

## Riesgos y decisiones

- ADR requerido/aprobado: ADR 0001 (Sanctum, ya aceptado). ADR 0010 y ADR 0013 (MySQL). ADR 0011 está aceptado desde el 2026-10-21. Este plan no instala dependencias móviles. No hay ADR nuevo en la API porque no hay dependencia nueva.
- Carrera de dos refresh: la marca de caché de 10 segundos separa al perdedor (CA-07) del reuso posterior (CA-06). Si el cache se reinicia en esa ventana, un segundo uso podría revocar a la ganadora. Aceptado: la ventana es corta y las pruebas cubren ambos casos.
- `uncompromised()` en `testing` se aísla con `Http::fake`, no con una excepción extra de entorno.
- Correo sin índice único: validación de aplicación. Una DBR futura puede agregar el índice; no forma parte de este plan.
- El texto del aviso es provisional hasta que el zoológico lo entregue.
- SMTP de producción se configura por `.env` y no bloquea el desarrollo (`MAIL_MAILER=log`).

## Orden y aprobación

1. Plan aprobado por Aksel el 2026-10-21.
2. Checklist `apps/api/tasks/004-visitor-authentication.md` aprobado por Aksel el 2026-10-21.
3. Implementación solo en `apps/api/src`: modelos, Actions, HTTP, middleware de aislamiento, config y pruebas. Después `php artisan test`.
4. El corte del cliente se cerró en `mobile-004` el 2026-10-21: módulo visitante nuevo en `@arca/api-client` (sin editar `auth.ts`) y `HttpAuthRepository` en `apps/mobile`. Sin `EXPO_PUBLIC_API_URL`, Jest sigue en memoria con el código de prueba `123456`.

Aprobador funcional: Aksel. Fecha de este documento: 2026-10-20. Evidencia de esquema: DBR-003 aplicada en `arca_pruebas` con la migración `2026_10_15_000003_visitor_accounts_schema.php`.
