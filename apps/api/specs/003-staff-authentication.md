# 003 · staff-authentication

- App dueña: `api`
- Apps/paquetes afectados: `api`, `dashboard` (consumidor), `packages/api-client`
- Estado: Borrador
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: Victor Adrian
- Aprobación funcional: pendiente de aprobación

## Problema y contexto

El personal del zoológico necesita iniciar sesión de verdad en el dashboard (y derivarse a la PWA veterinaria) con su correo institucional y contraseña. Hoy el dashboard usa credenciales ficticias en memoria (spec `dashboard-001`), la tabla del personal (`usuarios_admins`, a renombrar `users` por DBR-001) no tiene correo, estado, 2FA ni timestamps, y no existen las tablas de sesión, permisos ni bitácora.

La autenticación se resuelve con el stack ya aprobado: Sanctum por cookie para SPAs, Fortify headless con 2FA TOTP y Spatie Permission/Activitylog (ADR 0001). Los cambios de esquema se solicitan en DBR-001 (normalización al inglés) y DBR-002 (columnas y tablas de autenticación); el código consumidor solo se implementa cuando ambas estén en `Lista para backend`.

## Objetivos

- Login con correo institucional + contraseña por cookie de sesión Sanctum con CSRF; mensaje genérico ante cualquier fallo.
- `GET /api/v1/auth/me` devuelve identidad, departamento, roles, permisos y `home` calculado por rol.
- 2FA TOTP obligatorio para `admin` (enrolamiento y reto con Fortify).
- Límite de intentos, política de contraseña robusta, expiración por inactividad y bitácora de accesos.
- Catálogo `departments` como área organizativa independiente del rol, cargado por `DepartmentSeeder`.
- Comando `php artisan arca:create-staff` para dar de alta cuentas sin secretos en el repo.
- Redirección por rol: `admin`→`administration`, `executive`→`executive`, `cashier`→`ticket`, `veterinarian`→`pwa` + `pwa_url`.

## Fuera de alcance

- Gestión de usuarios desde el dashboard (alta, edición, baja): feature siguiente.
- Recuperación de contraseña por correo: el `admin` restablece contraseñas en la feature siguiente.
- Tokens `personal_access_tokens` para mobile (se pedirán en su propia DBR cuando mobile los necesite).
- Normalización de SoftDeletes/auditoría de tablas clínicas y financieras (DBRs por feature).
- La interfaz del login en el dashboard (spec `dashboard-002`).
- Cambios en `apps/web`, `apps/pwa` ni `apps/mobile`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Dirección de Informática) | Entrar al panel de administración y crear cuentas del personal | Sesión válida + 2FA confirmado; permisos según `docs/03-roles-y-permisos.md` |
| `executive` | Entrar al panel ejecutivo de solo lectura | Sesión válida; `dashboard.view`, `reports.view` |
| `cashier` | Entrar a venta e historial de taquilla | Sesión válida; `tickets.*`, `cash-closings.*` |
| `veterinarian` | Ser derivado a la PWA veterinaria | Sesión válida; la PWA aplica sus propios permisos |
| Responsable de BD | Aplicar DBR-001 y DBR-002 | Flujo DBR de `docs/database/` |

## Historias de usuario

- Como integrante del personal, quiero entrar con mi correo institucional y contraseña para llegar directamente a la sección que corresponde a mi rol.
- Como `admin`, quiero configurar mi segundo factor la primera vez para proteger el panel administrativo.
- Como responsable de seguridad, quiero que los intentos fallidos se limiten y queden en bitácora para detectar accesos indebidos.
- Como responsable de BD, quiero recibir las DBR completas para crear y aplicar las migraciones antes de que backend programe contra ellas.

## Criterios de aceptación

- **CA-01:** Dado un personal con cuenta activa, cuando envía correo institucional y contraseña correctos al login (`POST /api/v1/auth/login` de Fortify), entonces la API valida las credenciales, crea la sesión por cookie de Sanctum (previa obtención de `/sanctum/csrf-cookie` y envío de `X-XSRF-TOKEN`), regenera el identificador de sesión y responde éxito.
- **CA-02:** Dado cualquier intento con correo o contraseña incorrectos, cuando la validación falla, entonces la API responde 422 con el mensaje genérico «Correo o contraseña incorrectos.», sin revelar si el correo existe.
- **CA-03:** Dada una cuenta inactiva (`is_active = 0`) o eliminada (`deleted_at` no nulo), cuando se intenta iniciar sesión, entonces la API responde 422 con el mismo mensaje genérico «Correo o contraseña incorrectos.» y no crea sesión.
- **CA-04:** Dados 5 intentos fallidos en un minuto por combinación correo+IP, cuando llega el sexto intento, entonces la API responde 429 con un mensaje en español que indica los segundos de espera.
- **CA-05:** Dada una sesión válida, cuando se consulta `GET /api/v1/auth/me`, entonces devuelve la identidad del personal (nombre completo, correo), su departamento, roles, permisos y `home`, calculado por `ResolveStaffHomeAction`: `admin`→`administration`, `executive`→`executive`, `cashier`→`ticket`, `veterinarian`→`pwa` incluyendo además `pwa_url` leída de `PWA_URL` en `.env`.
- **CA-06:** Dada una llamada a `GET /api/v1/auth/me` o a cualquier ruta protegida sin sesión válida, cuando se evalúa el middleware, entonces responde 401.
- **CA-07:** Dada una sesión activa, cuando se llama a logout (`POST /api/v1/auth/logout`), entonces la sesión se invalida y las llamadas posteriores responden 401.
- **CA-08:** Dado un `admin` que aún no confirma su 2FA, cuando accede a cualquier ruta protegida que no sea `me`, `logout` ni los endpoints de 2FA, entonces el middleware `EnsureAdminTwoFactor` responde 403 con código `two_factor_setup_required`.
- **CA-09:** Dado un `admin` con 2FA confirmado, cuando inicia sesión con credenciales válidas, entonces la API responde `two_factor: true` y exige completar el reto con un código TOTP válido o un código de recuperación; el reto está limitado a 5 intentos por minuto (429 al superarlo) y los códigos de recuperación se consumen al usarse.
- **CA-10:** Dado un `admin` en enrolamiento, cuando pide la configuración de 2FA, entonces la API entrega el QR en SVG y la clave, confirma la activación solo con un código TOTP válido y devuelve los códigos de recuperación una sola vez.
- **CA-11:** Dado el alta de una cuenta o un cambio de contraseña, cuando se valida la contraseña, entonces aplica `Password::defaults()`: mínimo 12 caracteres, mayúsculas y minúsculas, números, símbolos y `uncompromised()`; `uncompromised()` solo puede omitirse en entorno `local`.
- **CA-12:** Dada una sesión autenticada, cuando transcurren `SESSION_LIFETIME=30` minutos sin actividad, entonces la sesión expira y las llamadas siguientes responden 401.
- **CA-13:** Dados los eventos de acceso, cuando ocurre un login exitoso o fallido, un logout o la activación de 2FA, entonces Activitylog registra el evento con correo, IP y user-agent (nunca la contraseña ni secretos), y el login exitoso actualiza `users.last_login_at`.
- **CA-14:** Dado el comando `php artisan arca:create-staff`, cuando se ejecuta de forma interactiva, entonces solicita correo, nombre, apellidos, área (del catálogo `departments`), rol sugerido por el área pero editable, y contraseña capturada de forma oculta y validada con la política; al finalizar crea la cuenta sin escribir secretos en el repositorio.
- **CA-15:** Dado el catálogo de áreas, cuando se ejecuta `DepartmentSeeder`, entonces inserta o actualiza los 4 departamentos de forma idempotente por `code` (`information-technology` Informática, `management` Dirección, `box-office` Taquilla, `veterinary` Servicios veterinarios), y `RolesAndPermissionsSeeder` crea la matriz de roles y permisos de `docs/03-roles-y-permisos.md` incluyendo `news.manage`, `events.manage` y `enclosures.manage`.
- **CA-16:** Dado el `README.md` raíz, cuando un integrante o agente lo consulta, entonces encuentra la sección «Comandos de base de datos (API)» con `php artisan db:show`, `db:show --counts`, `db:table <tabla>` y `migrate:status`, y los avisos de uso.
- **CA-17:** Dada la suite de PHPUnit, cuando se ejecuta `php artisan test`, entonces corre contra la base `arca_pruebas` (nunca `arca_zoo`) y existe al menos un test que nombra cada CA-xx de esta spec.

## Reglas de negocio

- **RN-01:** El área (`departments`) es un catálogo organizativo **independiente del rol**: sugiere un rol al crear la cuenta (`SuggestRoleForDepartmentAction`), pero no lo fija ni otorga acceso. El acceso lo dan únicamente roles y permisos de Spatie verificados en servidor.
- **RN-02:** La autorización se aplica solo en el servidor (middlewares y permisos); el dashboard solo convierte permisos en secciones visibles.
- **RN-03:** Identificadores, tablas, columnas, rutas y permisos en inglés; mensajes al usuario en español (Constitución VI).
- **RN-04:** La implementación del código consumidor (modelos, Actions, endpoints, seeders, comando) está bloqueada hasta que DBR-001 y DBR-002 estén en `Lista para backend`.
- **RN-05:** Ningún secreto ni credencial se versiona: `.env` es local, `.env.example` solo lleva claves sin valores reales, y el comando `arca:create-staff` captura la contraseña sin persistirla en el repo.
- **RN-06:** Los endpoints usan rutas nombradas de Laravel bajo `/api/v1`; Fortify opera headless con `views=false` y `prefix=api/v1/auth`. No se usa Inertia ni Wayfinder.
- **RN-07:** Sanctum, Fortify, Spatie Permission y Spatie Activitylog ya están aprobados por ADR 0001; esta feature no requiere ADR nuevo.
- **RN-08:** El mensaje «Correo o contraseña incorrectos.» es la única respuesta ante fallo de autenticación: no distingue correo inexistente, contraseña inválida, cuenta inactiva ni eliminada.
- **RN-09:** La cookie de sesión es HttpOnly, `SameSite=lax` y `Secure` en producción; la sesión se regenera al iniciar y se invalida al cerrar. CORS acepta credenciales solo desde orígenes definidos en `.env`; en desarrollo se usa el proxy de Vite.
- **RN-10:** Las contraseñas se almacenan con bcrypt y se validan con la política de CA-11.
- **RN-11:** El `home` del personal lo calcula `ResolveStaffHomeAction` por rol; `veterinarian` recibe `pwa` + `pwa_url` desde `PWA_URL` en `.env`, nunca un valor fijo en código.
- **RN-12:** `SESSION_LIFETIME=30` minutos de inactividad para la sesión del personal.
- **RN-13:** Los tests PHPUnit corren contra `arca_pruebas` (`phpunit.xml` con `DB_DATABASE=arca_pruebas`), que puede borrarse y reconstruirse; nunca contra `arca_zoo`, que es la base de desarrollo compartido configurada en `.env`.
- **RN-14:** No hay recuperación de contraseña por correo en esta feature; el `admin` restablece contraseñas en la feature de gestión de usuarios.
- **RN-15:** `personal_access_tokens` queda fuera de DBR-002; la autenticación del personal es solo por cookie de sesión.

## Datos, privacidad y auditoría

- `users` contiene datos personales del personal (nombre, apellidos, correo institucional); contraseñas con bcrypt y secretos 2FA cifrados por Fortify.
- `activity_log` registra accesos (correo, IP, user-agent), logout y activación de 2FA; nunca contraseñas ni secretos.
- `users` usa SoftDeletes y `created_by`/`updated_by`; las cuentas no se borran físicamente.
- Requiere las DBR acompañantes: `docs/database/requests/DBR-001-english-schema-normalization.md` y `docs/database/requests/DBR-002-staff-authentication.md`. Las DBR no sustituyen esta spec.

## Flujos y errores

### Flujo principal

1. El cliente obtiene `/sanctum/csrf-cookie` y envía correo + contraseña a `POST /api/v1/auth/login` con `X-XSRF-TOKEN`.
2. `AuthenticateStaffAction` valida credenciales y que la cuenta esté activa y no eliminada; la sesión se regenera.
3. Si el rol es `admin` con 2FA confirmado, la respuesta indica `two_factor: true` y el cliente presenta el reto TOTP/código de recuperación.
4. Si el rol es `admin` sin 2FA confirmado, entra con sesión limitada: solo `me`, `logout` y endpoints de 2FA hasta completar el enrolamiento (`EnsureAdminTwoFactor` → 403 `two_factor_setup_required`).
5. El cliente consulta `GET /api/v1/auth/me` y usa `home`/`pwa_url` para dirigir a la persona a su sección.
6. Logout invalida la sesión. Inactividad > 30 min → 401.

### Errores esperados

- Credenciales incorrectas, cuenta inactiva o eliminada → 422 «Correo o contraseña incorrectos.»
- Más de 5 intentos/minuto en login o reto 2FA → 429 con espera en español.
- Sin sesión o sesión expirada → 401.
- `admin` sin 2FA en ruta protegida → 403 `two_factor_setup_required`.
- Código TOTP inválido → error de validación del reto; código de recuperación se invalida al usarse.
- `PWA_URL` no configurada → el `home` `pwa` no puede resolverse; se documenta en `.env.example`.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** DBR-001 y DBR-002 (deben llegar a `Lista para backend`), ADR 0001 (API central y paquetes aprobados), ADR 0002 (SPA sin React Router), ADR 0010 (MySQL 8.0.x y gobierno de cambios).
- **Riesgos:**
  - Bloqueo de la implementación hasta que el responsable de BD aplique las DBR.
  - `uncompromised()` requiere red (HIBP); solo se omite en `local`.
  - Sanctum por cookie requiere que la API y el dashboard compartan dominio raíz en producción.
  - Conflicto con la migración por defecto `0001_01_01_000000_create_users_table.php`; lo resuelve el responsable de BD en DBR-001.
  - Defaults del esquema legado en español (`Cuarentena_Ingreso`, `Revision_Rutinaria`): propuesta `intake_quarantine`, `routine_check`; pendiente de decisión de BD.
- **Preguntas pendientes:** decisión del responsable de BD sobre los defaults en español y sobre la resolución de la migración por defecto de `users`.

## Revisión

- Aprobadores y fecha: pendiente de aprobación.
- Evidencia/enlaces: `docs/database/requests/DBR-001-english-schema-normalization.md`, `docs/database/requests/DBR-002-staff-authentication.md`, `docs/03-roles-y-permisos.md`, `apps/api/docs/inventario-bd-inicial.md`.
