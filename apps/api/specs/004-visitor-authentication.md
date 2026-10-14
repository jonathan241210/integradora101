# 004 · visitor-authentication

- App dueña: `api`
- Apps/paquetes afectados: `api`, `mobile` (consumidor), `packages/api-client`
- Estado: Borrador
- Solicitante / responsable funcional: Aksel
- Responsable de BD: Victor Adrian
- Aprobación funcional: pendiente de aprobación

## Problema y contexto

La app móvil necesita cuentas de visitante reales (ADR 0011): solo adultos (18+) crean la cuenta con correo y contraseña, verifican el correo con un código de 6 dígitos y mantienen sesión con tokens de acceso cortos (15 min) y refresh rotatorio (30 días) con detección de reuso. El niño juega con la cuenta del tutor, cuyo perfil visible muestra solo apodo y avatar de catálogo. El borrado de cuenta es físico, inmediato y confirmado con contraseña.

Los cambios de esquema se solicitan en DBR-003 (`visitor-accounts`, depende de DBR-001). El código consumidor solo se implementa cuando las DBR estén en `Lista para backend`.

## Objetivos

- Registro, verificación de correo, login, refresh rotatorio, logout, recuperación y cambio de contraseña, edición de perfil y borrado de cuenta bajo `/api/v1/visitor` con rutas nombradas.
- Aislamiento total entre tokens de visitante (ability `visitor`, `tokenable` = `Visitor`) y la sesión del personal.
- Verificación de correo y recuperación con códigos de 6 dígitos de un solo uso.
- Política de contraseña, límites de intentos, bitácora sin secretos y correo por SMTP vía `.env`.

## Fuera de alcance

- Inicio de sesión con Google u otros proveedores (descartado por ahora en ADR 0011).
- Cuentas para menores de edad: solo adultos crean cuenta.
- La interfaz móvil (spec `mobile-004`) y el progreso del visitante (spec `api-005`).
- Tabla de líderes, premios y contenido social entre visitantes.
- Gestión de visitantes desde el dashboard del personal.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Visitante adulto (tutor) | Crear cuenta, verificar correo, entrar, editar perfil, borrar cuenta | Ninguno previo; la cuenta se crea en el flujo |
| Niño/niña | Jugar con la cuenta del tutor | Sin cuenta propia; perfil visible = apodo + avatar |
| Responsable de BD | Aplicar DBR-001 y DBR-003 | Flujo DBR de `docs/database/` |

## Historias de usuario

- Como visitante adulto, quiero crear mi cuenta con correo y contraseña y verificar mi correo para guardar mi progreso y recuperarlo si cambio de teléfono.
- Como visitante adulto, quiero que la app renueve mi sesión sin pedirme la contraseña a cada rato, pero que se revoque si alguien reutiliza mi token.
- Como titular de la cuenta, quiero poder borrarla y mis datos de forma definitiva para ejercer mi derecho de supresión.

## Criterios de aceptación

- **CA-01:** Dado un adulto, cuando envía `POST /api/v1/visitor/auth/register` con `email, password, password_confirmation, first_name, nickname, avatar_code, is_adult=true, privacy_notice_version`, entonces la API valida mayoría de edad y aceptación del aviso, crea la cuenta, responde 201 **sin tokens** y envía un código de 6 dígitos al correo.
- **CA-02:** Dado un registro pendiente, cuando envía `POST /api/v1/visitor/auth/email/verify` con `email` y `code` válidos, entonces responde 200 con el par de tokens y el visitante; un código inválido, vencido, consumido o con 5 intentos fallidos responde 422 sin crear sesión.
- **CA-03:** Dada una solicitud de reenvío, cuando se llama `POST /api/v1/visitor/auth/email/resend`, entonces responde 202 genérico sin revelar si el correo existe, con límite de 1 por minuto y 5 por hora por correo.
- **CA-04:** Dado un visitante con correo verificado, cuando envía `POST /api/v1/visitor/auth/login` con `email, password, device_name`, entonces responde el par de tokens; correo no verificado → 403 `email_not_verified`; credenciales incorrectas → 422 «Correo o contraseña incorrectos.»; más de 5 intentos/minuto por correo+IP → 429 con mensaje en español.
- **CA-05:** Dada una sesión emitida, cuando se inspeccionan los tokens, entonces el token de acceso es Sanctum con ability `visitor` y `expires_at` a 15 minutos, y el refresh es opaco de 64 bytes, almacenado solo como hash SHA-256, con vigencia de 30 días por emisión y rotación en cada uso.
- **CA-06:** Dado un refresh válido, cuando se llama `POST /api/v1/visitor/auth/refresh` con `refresh_token`, entonces rota el par y marca el anterior como reemplazado; si se reusa un refresh revocado, la API revoca toda la familia de tokens y responde 401.
- **CA-07:** Dados dos refresh simultáneos con el mismo token, cuando ambos compiten, entonces solo uno renueva el par y el otro falla sin emitir un segundo par válido (detección de reuso/concurrencia).
- **CA-08:** Dado un token o sesión del personal, cuando se usa en rutas `/api/v1/visitor/*`, entonces el middleware lo rechaza (401/403); igualmente, un token `visitor` no funciona en rutas del personal: el `tokenable` debe ser `Visitor` y las sesiones de cookie del staff no aplican.
- **CA-09:** Dada una sesión activa, cuando se llama `POST /api/v1/visitor/auth/logout` con Bearer y `refresh_token`, entonces se revoca el token de acceso y toda la familia de refresh de ese dispositivo.
- **CA-10:** Dada una solicitud de recuperación, cuando se llama `POST /api/v1/visitor/auth/password/forgot`, entonces responde 202 genérico (no revela si el correo existe), con límite de 3 por hora por correo.
- **CA-11:** Dado un código de recuperación válido, cuando se llama `POST /api/v1/visitor/auth/password/reset` con `email, code, password, password_confirmation`, entonces cambia la contraseña y revoca todos los tokens del visitante.
- **CA-12:** Dada una sesión válida, cuando se llama `GET /api/v1/visitor/me`, entonces devuelve el perfil (correo, nombre, apodo, avatar); `PATCH /api/v1/visitor/me` acepta `nickname, first_name, avatar_code` y valida que el avatar exista en el catálogo.
- **CA-13:** Dada una sesión válida, cuando se llama `PUT /api/v1/visitor/me/password` con `current_password, password, password_confirmation`, entonces cambia la contraseña y revoca las demás sesiones del visitante.
- **CA-14:** Dada una sesión válida, cuando se llama `DELETE /api/v1/visitor/me` con `password` correcta, entonces responde 204 y ejecuta el borrado físico en cascada (cuenta, tokens, códigos y progreso) revocando todo.
- **CA-15:** Dado cualquier cliente, cuando consulta `GET /api/v1/visitor/legal/privacy-notice`, entonces la API devuelve `version` y el contenido vigente del aviso de privacidad (el texto lo provee el zoológico; ver preguntas pendientes).
- **CA-16:** Dados los códigos de verificación y recuperación, cuando se generan, entonces son de 6 dígitos, se guardan como hash, vencen a los 15 minutos, permiten máximo 5 intentos y son de un solo uso.
- **CA-17:** Dado el alta o cambio de contraseña, cuando se valida, entonces exige mínimo 8 caracteres, letras y números, y `uncompromised()` (omitible solo en entorno `local`); el hash es bcrypt.
- **CA-18:** Dado el registro, cuando una IP supera 5 registros por hora, entonces responde 429 con mensaje en español.
- **CA-19:** Dados los eventos de acceso (registro, login, refresh, logout, reset, borrado), cuando se registran en bitácora, entonces incluyen correo/IP/user-agent según corresponda y **nunca** contraseñas, tokens ni códigos.
- **CA-20:** Dada la configuración, cuando la app corre fuera de `local`, entonces exige HTTPS; el correo sale por SMTP configurado en `.env` (sin SDK) y en desarrollo `MAIL_MAILER=log`.
- **CA-21:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra `arca_pruebas` (nunca `arca_zoo`) y existe al menos un test que nombra cada CA-xx.

## Reglas de negocio

- **RN-01:** Solo adultos (18+) crean cuenta y aceptan aviso y términos; el niño juega con la cuenta del tutor y su perfil visible muestra solo `nickname` y avatar.
- **RN-02:** El avatar se elige de un catálogo de ilustraciones incluidas en la app (sin fotos); `avatar_code` se valida contra ese catálogo.
- **RN-03:** Sesión = token de acceso de 15 min + refresh rotatorio de 30 días con detección de reuso; la rotación es lógica propia sobre Sanctum.
- **RN-04:** Respuestas genéricas donde aplique: «Correo o contraseña incorrectos.» y 202 en resend/forgot, para no revelar la existencia de una cuenta.
- **RN-05:** La implementación está bloqueada hasta que DBR-001 y DBR-003 estén en `Lista para backend`.
- **RN-06:** Ningún secreto se versiona: SMTP y claves se configuran por `.env`; `.env.example` solo lleva claves sin valores.
- **RN-07:** Rutas nombradas de Laravel bajo el prefijo `/api/v1/visitor`; sin Inertia ni Wayfinder.
- **RN-08:** `visitors` no usa SoftDeletes: el borrado es físico e inmediato por derecho de supresión (LFPDPPP) y porque no son datos clínicos ni financieros.
- **RN-09:** Los paquetes ya están aprobados: Sanctum en ADR 0001 y el modelo de sesión en ADR 0011; el correo usa SMTP nativo de Laravel, sin SDK nuevo.
- **RN-10:** Los endpoints se implementan con Actions (`RegisterVisitorAction`, `VerifyVisitorEmailAction`, `IssueVisitorTokensAction`, `RotateRefreshTokenAction`, `RevokeVisitorSessionAction`, `SendVisitorCodeAction`, `ResetVisitorPasswordAction`, `DeleteVisitorAccountAction`) y controladores delgados.
- **RN-11:** Identificadores, rutas y campos en inglés; mensajes al visitante en español (Constitución VI).
- **RN-12:** Los tests PHPUnit corren contra `arca_pruebas`; nunca contra `arca_zoo`.

## Datos, privacidad y auditoría

- `visitors` guarda datos personales (correo, nombre, apodo, avatar); el registro deja evidencia de mayoría de edad y de la versión del aviso aceptado.
- Contraseñas con bcrypt; refresh tokens y códigos solo como hash; la bitácora nunca registra secretos.
- El borrado de cuenta elimina físicamente cuenta, tokens, códigos y progreso en cascada (derecho de supresión).
- Requiere las DBR acompañantes: `docs/database/requests/DBR-003-visitor-accounts.md` (y DBR-001 como base). Las DBR no sustituyen esta spec.

## Flujos y errores

### Flujo principal

1. Registro → 201 + código por correo → verificación → par de tokens → sesión activa.
2. La app renueva con `auth/refresh` cuando el acceso vence; cada uso rota el refresh.
3. Logout o borrado revocan la familia de tokens.
4. Recuperación: `password/forgot` → código → `password/reset` → revoca todo.

### Errores esperados

- Credenciales incorrectas → 422 «Correo o contraseña incorrectos.»
- Correo sin verificar en login → 403 `email_not_verified`.
- Código inválido/vencido/consumido o >5 intentos → 422.
- Límites de intentos superados → 429 con mensaje en español.
- Refresh revocado o reusado → 401 y revocación de la familia.
- Token staff en rutas de visitante (o viceversa) → 401/403.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** DBR-001 y DBR-003 (`Lista para backend`), ADR 0001 (Sanctum), ADR 0011 (identidad y sesión), ADR 0010 (MySQL 8.0.x). Si la base del paquete lo define `api-003`, `packages/api-client` se amplía con modo Bearer con refresh; se documenta aquí y en `mobile-004`.
- **Riesgos:** el refresh rotatorio propio necesita pruebas de reuso y concurrencia; `uncompromised()` requiere red (HIBP), solo omitible en `local`; dependencia de un servicio SMTP en producción.
- **Preguntas pendientes:**
  - Texto del aviso de privacidad y de los términos (lo provee el zoológico o el área jurídica municipal).
  - Proveedor SMTP concreto y validación del dominio remitente.
  - Ilustraciones del catálogo de avatares (8 códigos propuestos: `jaguar`, `lion`, `elephant`, `macaw`, `monkey`, `turtle`, `deer`, `wolf`).

## Revisión

- Aprobadores y fecha: pendiente de aprobación.
- Evidencia/enlaces: `docs/adr/0011-visitor-identity-and-mobile-session.md`, `docs/database/requests/DBR-003-visitor-accounts.md`, `apps/mobile/specs/004-visitor-account.md`.
