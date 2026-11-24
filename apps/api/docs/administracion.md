# Administración de la API

Referencia de `/api/v1/admin/*`, contrato de `api-007`. Spec: `apps/api/specs/007-administration-management.md`. Plan: `apps/api/plan/007-administration-management.md`. Consumidor: `dashboard-003`, vía `@arca/api-client`.

Este documento describe el código revisado. No certifica que las pruebas pasen: la suite (T-35) se verifica aparte. No contiene secretos ni credenciales.

> Nota de vigencia (, revisión aprobada de `api-007`): solo `admin` (con `users.manage`) gestiona cuentas del personal. `zoo-admin` responde 403 en todas las rutas de cuentas. El permiso `operational-staff.manage` se retiró del catálogo y del código, y el seeder ya se aplicó en `arca_pruebas` (`api-007` T-42 a T-44).

> Nota de vigencia (, `api-023`): catálogo cerrado de seis roles (`admin`, `zoo-admin`, `executive` «Consulta directiva», `communications` «Comunicación», `cashier`, `veterinarian`). Las cuentas `admin` se leen desde la API pero solo se gestionan desde la consola (`arca:admin:*`); los intentos desde la API responden 403 y se auditan. Ver «Cuentas del personal» y «Comandos de consola».

> Nota de vigencia: `image_path` deja de ser solo de lectura. La subida, el reemplazo, el borrado del archivo y `image_url` se especifican en `apps/api/specs/008-event-news-images.md` (Aprobada, implementada en el backend). Ver la sección «Imágenes».

> Nota de vigencia (, `api-009`): el panel (`/dashboard`), el reporte (`/reports/tickets`, totales, desglose diario y listado) y las exportaciones CSV, Excel y PDF excluyen los boletos con `status` `cancelled` (CA-34 de `api-009`, RN-18). El filtro `completed` vive en `SummarizeTicketSalesAction`, `BuildTicketReportAction` y `ExportTicketReportAction` (scope `Ticket::completed`). Al desplegar, las cifras históricas pueden bajar si ya existen boletos cancelados; despliega junto con `dashboard-003`. `Ticket` ya no es de solo lectura: lo escriben las Actions de `api-009` (ver `apps/api/docs/tickets.md`).

La zona horaria es única y la define la API (`api-025`, `arca.timezone`); el parámetro `timezone` del cliente se ignora. Ver «Zona horaria».

## Acceso común

Todo el grupo aplica, en este orden:

1. `auth:sanctum`: sin sesión, 401.
2. `staff.user`: cuenta inactiva, 401 «Tu cuenta está desactivada.». Aplica también a sesiones ya abiertas.
3. `administrator.two-factor`: para `admin`, `zoo-admin`, `cashier`, `executive` y `communications` (`config('arca.two_factor_roles')`, api-021 y api-023) sin 2FA confirmado, 403 con `code: two_factor_setup_required`.
4. `permission:<permiso>` por subgrupo: sin permiso, 403 «No tienes permiso para realizar esta acción.».
5. `step-up:<modo>` por ruta de escritura (api-021): confirmación de contraseña; ver «Confirmación de contraseña por operación».

Formato de errores:

- 404: `{ "message": "…" }`.
- 422: `{ "message": "…", "errors": { "campo": ["…"] } }`. `message` es el primer error.
- 403 de asignación de rol: «No tienes permiso para asignar ese rol.».

Los recursos individuales van envueltos en `data`, como es estándar en los Resources de Laravel. Los listados de cuentas usan paginación de Laravel (`data`, `links`, `meta`). Noticias, eventos y recintos se devuelven sin paginar.

## Confirmación de contraseña por operación (api-021)

Spec: `apps/api/specs/021-staff-step-up-confirmation.md`. La API decide qué operación pide contraseña; el cliente solo reacciona al 403 `password_confirmation_required`.

- **Ventana (10 min fijos):** `POST /api/v1/admin/password-confirmation` (`admin.password-confirmation.store`), cuerpo `{ "password": "..." }`. 200 `{ "data": { "confirmed_until": "2026-11-20T18:10:00Z" } }` (UTC). La ventana vive en la sesión (clave `arca.step_up.confirmed_until`), no se alarga con actividad, no se comparte entre sesiones y se pierde al iniciar o cerrar sesión. Sin sesión de navegador (token), la ventana no existe y la confirmación responde 422.
- **Frecuencia:** `POST admin/password-confirmation` admite 10 peticiones por minuto y usuario (`throttle:password-confirmation`; 429 «Demasiadas solicitudes de confirmación. Espera un minuto e inténtalo de nuevo.»). La ventana guarda también el usuario que confirmó y solo vale para él.
- **Siempre:** la operación recibe `password` solo en su cuerpo (nunca en la query) y lo verifica en la misma petición; una ventana vigente no la sustituye. Única excepción: `PUT users/{user}/password`, donde la confirmación va en `current_password` y `password` es la nueva contraseña (CA-37).
- **Orden de middleware:** `permission:*` → `throttle` → (`console-managed-account` de api-023, aún no existe) → `step-up:<modo>` → Form Request. Sin permiso responde 403 de permiso, no de contraseña.

| Modo | Operaciones |
|---|---|
| `always` | `ticket-prices.store`, `users.password.update` (campo `current_password`), `users.two-factor.destroy`, `users.update` cuando `role` viene y es distinto del actual |
| `window` | `tickets.cancel`, `users.store`, `users.update` (sin cambio de rol), `users.status` (activar y desactivar), `users.destroy`, `enclosures.destroy`, `enclosures.qr.regenerate` si el recinto tiene QR activo |
| `none` | venta y cotización de boletos, exportación de reportes, noticias, eventos, recuerdos y especies, alta/edición/estado de recintos, primera generación de QR (también `qr.regenerate` sin QR activo) y todas las lecturas |

Cada escritura bajo `admin.*` declara su modo en `routes/api.php`; `StepUpClassificationTest` falla si aparece una sin modo. El campo `password` queda reservado para la confirmación de «Siempre». Una operación nueva se clasifica en su spec antes de implementarse.

Respuestas:

| Código | Cuerpo |
|---|---|
| 403 | `{ "message": "Confirma tu contraseña para realizar esta acción.", "code": "password_confirmation_required", "mode": "window" \| "always" }` |
| 422 | `{ "message": "La contraseña no es correcta.", "errors": { "password": ["La contraseña no es correcta."] } }` |
| 429 | `{ "message": "Demasiados intentos. Intenta de nuevo en N segundos." }` y cabecera `Retry-After` |

Límite: 5 contraseñas incorrectas en 10 minutos por usuario (contador en la caché, `CACHE_STORE=database`) bloquean la confirmación 10 minutos desde el quinto fallo, en Ventana y en Siempre. Un acierto sin bloqueo borra los fallos previos. Bloqueo, comparación y contador se serializan con un candado de caché por usuario, y solo el primer intento bloqueado de cada bloqueo queda en la auditoría. Valores en `config/arca.php` (`password_confirmation`).

Auditoría: `activity_log`, `log_name` `auth`, eventos `password-confirmation.succeeded` y `password-confirmation.failed` con `email`, `ip`, `user_agent`, `route`, `mode` y `locked`; nunca la contraseña. Un 403 `password_confirmation_required` no se registra ni cuenta para el límite.

Tokens de personal (CA-42, RN-19): `POST /api/v1/staff/auth/login` responde 403 `two_factor_login_required` («Esta cuenta debe iniciar sesión desde el panel con su segundo factor.») a las cuentas con rol de `two_factor_roles`, y `administrator.two-factor` rechaza con el mismo 403 cualquier token personal de esas cuentas en `admin/*`. Revisión de seguridad: `staff.user` (`EnsureStaffUser`) aplica la misma regla en `/api/v1/staff/*` y `GET /api/v1/auth/me`, así que un token personal de `cashier`, `admin` o `zoo-admin` tampoco opera fuera de `admin/*` (mismo 403 `two_factor_login_required`); la sesión de navegador no se ve afectada. El `veterinarian` conserva su token.

Despliegue del 2FA de `cashier` (RN-14): los cajeros se avisan fuera del sistema unos días antes; desde el despliegue deben configurar el 2FA para operar. El usuario demo `boletaje@arca.local` (`DemoStaffSeeder`) es un cajero sin 2FA y queda bloqueado en `/api/v1/admin/*` hasta enrolarlo.

## Roles y alcance

| Rol | Permisos de ruta | Cuentas que ve y opera | 2FA obligatorio |
|---|---|---|---|
| `admin` | `users.manage`, `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view`, `tickets.view-all` | Lee todas; opera solo las no admin (las admin: solo lectura, `managed_by_console: true`) | Sí |
| `zoo-admin` | `news.manage`, `events.manage`, `enclosures.manage`, `dashboard.view`, `reports.view`; además, según la matriz de `docs/03-roles-y-permisos.md`, `tickets.view` y `cash-closings.view` (fuera de estas rutas) | Ninguna: sin `users.manage`, 403 en todas las rutas de cuentas | Sí |
| `executive` («Consulta directiva») | `dashboard.view`, `reports.view`, `public-content.view` (solo lectura) | Ninguna | Sí (api-023) |
| `communications` («Comunicación») | `news.manage`, `events.manage`, `memories.review`, `species.review`, `public-content.view` | Ninguna (403) | Sí (api-023) |
| `cashier` | Ninguno de estas rutas (`tickets.*`, ver `docs/tickets.md`) | Ninguna (403) | Sí (api-021) |
| `veterinarian` | Ninguno | Ninguna (403) | No |

Roles asignables (`ResolveAssignableRolesAction`, catálogo `App\Support\Staff\StaffRoleCatalog`): con `users.manage`, todos menos `admin` (`zoo-admin`, `executive`, `communications`, `cashier`, `veterinarian`). Roles visibles (`ResolveVisibleRolesAction`): todos, para poder leer las cuentas admin. Un rol que no existe en el catálogo responde 422; `admin` responde 403 (ver abajo).

Sin `users.manage`, cualquier ruta de cuentas responde 403 por permiso. Una cuenta inexistente responde 404 «Usuario no encontrado.» en el detalle, la edición, el estado, la eliminación, la contraseña y el 2FA.

Decisión (el responsable funcional): la cuenta se resuelve antes de validar el cuerpo, así que el 404 prevalece sobre cualquier 422 o 403 causado por el contenido del cuerpo. Implementado con `ManagedStaffAccountRequest`.

## Cuentas del personal

Permiso de todas las rutas: `users.manage` (desde; antes, `users.manage` u `operational-staff.manage`).

| Método y ruta | Nombre | Respuesta |
|---|---|---|
| `GET /api/v1/admin/users` | `admin.users.index` | 200 paginado (25 por defecto, máximo 100). Filtros: `search` (nombre, apellidos o correo), `role`, `department_id`, `status` (`active`/`inactive`). Orden por apellidos y nombre. |
| `GET /api/v1/admin/users/options` | `admin.users.options` | 200 `{ "data": { "departments": [{id, code, name, suggested_role}], "roles": [{name, label, two_factor_required, permissions: [{name, label}]}] } }`. Sin `admin`. `permissions` son los del rol con etiqueta en español (solo lectura en el dashboard); `two_factor_required` es verdadero para los roles de `arca.two_factor_roles`. `suggested_role` nunca es `admin` (Presidencia e Informática sugieren `executive`). |
| `POST /api/v1/admin/users` | `admin.users.store` | 201. Ver alta. |
| `GET /api/v1/admin/users/{user}` | `admin.users.show` | 200 o 404. |
| `PATCH /api/v1/admin/users/{user}` | `admin.users.update` | 200. Campos opcionales: `first_name`, `last_name`, `second_last_name`, `department_id`, `role`. El correo se ignora. Sobre la propia cuenta, cambiar `role` responde 422 «No puedes cambiar tu propio rol.». |
| `PATCH /api/v1/admin/users/{user}/status` | `admin.users.status` | 200. Body: `is_active` (booleano, obligatorio). |
| `DELETE /api/v1/admin/users/{user}` | `admin.users.destroy` | 204. Borrado lógico. |
| `PUT /api/v1/admin/users/{user}/password` | `admin.users.password.update` | 204. Body: `password`. Sobre la propia cuenta: 422 «No puedes restablecer tu propia contraseña desde la administración.». |
| `DELETE /api/v1/admin/users/{user}/two-factor` | `admin.users.two-factor.destroy` | 204. Sobre la propia cuenta: 422 «No puedes restablecer tu propio segundo factor desde la administración.». |

Alta (`POST`): `email` (único entre todas las cuentas, incluidas las eliminadas; se guarda en minúsculas), `first_name`, `last_name`, `second_last_name` (opcional), `department_id` (área activa), `role` y `password` (`Password::defaults()`). La cuenta nace activa y registra `created_by`. El rol sugerido por el área lo propone `options`; el cliente puede cambiarlo.

Recurso `StaffAccountResource`: `id`, `first_name`, `last_name`, `second_last_name`, `full_name`, `email`, `department {id, code, name}`, `role {name, label}`, `is_active`, `last_login_at` (ISO 8601), `two_factor_confirmed` (booleano) y `managed_by_console` (verdadero en cuentas `admin`). Nunca devuelve `password`, `remember_token` ni `two_factor_*`.

La contraseña se guarda con bcrypt mediante el cast `hashed` del modelo. No se devuelve ni se registra en la bitácora.

Restablecer 2FA borra el secreto, los códigos de recuperación y la confirmación (`Fortify DisableTwoFactorAuthentication`), y revoca las sesiones. En el siguiente ingreso, si el rol lo exige, el middleware `administrator.two-factor` obliga a configurarlo.

### Cuentas admin desde la API (api-023)

Las cuentas `admin` aparecen en `GET users` y `GET users/{user}` en solo lectura (`managed_by_console: true`). Cualquier escritura sobre ellas (`PATCH users/{user}`, `…/status`, `DELETE users/{user}`, `PUT …/password`, `DELETE …/two-factor`) responde **403** «Las cuentas de administrador solo se gestionan desde la consola del servidor.», sin importar el cuerpo. Pedir `role: "admin"` en `POST users` o `PATCH users/{user}` responde **403** «No puedes asignar el rol de administrador desde la administración.». Ambos 403 salen del middleware `console-managed-account` (`ConsoleManagedAccountGuard`), que va después de `permission:users.manage` y **antes** de `step-up:*`: el 403 de admin precede a `password_confirmation_required` (api-021 CA-38). Una cuenta inexistente pasa al 404 «Usuario no encontrado.». Orden: permiso (403) → inexistente (404) → admin (403) → validación (422). Cada rechazo se audita en `activity_log` (evento `denied`, con actor, ruta, correo de la cuenta afectada y resultado; sin cuerpo ni contraseñas). Los 403 por falta de `users.manage` no se auditan.

### Avisos de consola (api-023)

Los cambios hechos desde la consola crean un aviso en `staff_notifications` (tipo `console_admin_change`) para cada cuenta `admin` activa. Rutas bajo `users.manage`:

| Método y ruta | Nombre | Respuesta |
|---|---|---|
| `GET /api/v1/admin/console-notices` | `admin.console-notices.index` | 200 `{ "data": [{id, action, account_email, origin, reason, created_at}] }`: solo los avisos no leídos del administrador autenticado, del más antiguo al más reciente. `action` va en español legible («Cuenta promovida a administrador»); `origin` es `consola`. No incluye usuario del sistema operativo ni servidor. |
| `POST /api/v1/admin/console-notices/{notice}/read` | `admin.console-notices.read` | 204. Registra `read_at`. Aviso ajeno o inexistente: 404 «Aviso no encontrado.». |

## Comandos de consola (api-023)

Se ejecutan desde `apps/api/src` (`php artisan arca:admin:...`) en el servidor; la consola no tiene sesión de aplicación. Todo comando que cambia datos exige motivo (`--reason`, mínimo 10 caracteres tras recortar; si falta y hay terminal lo pregunta; sin él termina en fallo con «Indica el motivo del cambio.»), muestra un resumen con la base activa, pide confirmación, aplica el cambio en una transacción, audita en `activity_log` (log `admin`, evento `console-*`, sin causante de usuario; propiedades `origin: consola`, `os_user`, `hostname`, `reason`, `account_email`, `action`) y crea un aviso no leído para cada cuenta `admin` activa tras el cambio. Nunca se registran contraseñas ni secretos 2FA. Ninguna contraseña se acepta como argumento u opción.

### Niveles

| Nivel | Qué pide | Comandos |
|---|---|---|
| Solo lectura | Nada | `arca:admin:list`, `arca:admin:help` |
| Bajo | Motivo y confirmación (`¿Aplicar el cambio?`; `--yes` la omite) | `arca:admin:edit-name {email}` |
| Medio | Motivo y **escribir el correo afectado**. `--yes` no lo sustituye; sin terminal solo sirve `--confirm-email=<correo>` (debe coincidir) | `arca:admin:edit-email {email}`, `arca:admin:reactivate {email}`, `arca:admin:reset-two-factor {email}` |
| Alto | Motivo, **contraseña del administrador titular** (oculta, solo con terminal; también si la operación es sobre la cuenta del titular) y confirmación | `arca:admin:create`, `promote {email}`, `demote {email}`, `deactivate {email}`, `delete {email}`, `reset-password {email}` |

`arca:create-staff` (alta de personal no admin) conserva su flujo propio: motivo, confirmación, auditoría y avisos, sin contraseña del titular.

Todos los comandos con cambios actúan solo sobre cuentas `admin` (salvo `create` y `promote`). Sin terminal (`--no-interaction`): el nivel alto, `create` y `reset-password` se rechazan con «Este comando pide la contraseña en la terminal.»; los niveles bajo y medio funcionan con `--reason` y `--yes` (bajo) o `--confirm-email` (medio).

### Admin titular

- Se define en `.env` con `ARCA_PRIMARY_ADMIN_EMAIL` (`config('arca.primary_admin_email')`). Debe ser un administrador activo; si la variable está vacía o el correo no es un admin activo, los comandos de nivel alto fallan sin hacer nada.
- Mientras sea titular no se puede desactivar, eliminar ni hacer `demote`: «Primero cambia ARCA_PRIMARY_ADMIN_EMAIL a otro administrador.».
- `edit-email` sobre el titular sí se permite; al terminar avisa «Actualiza ARCA_PRIMARY_ADMIN_EMAIL en el .env».
- La contraseña se valida con `Hash::check`. **5 fallos en 10 minutos bloquean los comandos de nivel alto 10 minutos** (contador y bloqueo en la caché, `CACHE_STORE=database`, con candado). Se auditan los fallos (`console-primary-password-failed`) y el bloqueo (`console-primary-locked`), sin la contraseña. Los niveles bajo y medio no se bloquean.
- Nunca queda cero administradores activos.

### Cómo cambiar el titular

1. Con un segundo administrador activo, edita `ARCA_PRIMARY_ADMIN_EMAIL` en el `.env` del servidor para que apunte a él.
2. Ejecuta `php artisan config:clear` (o `config:cache`).
3. Ya puedes desactivar, eliminar o hacer `demote` al titular anterior. Si solo cambió su correo con `edit-email`, actualiza la variable y repite el paso 2.

### Ejemplos paso a paso

Los comandos piden lo que falta; con `--reason` se evita la pregunta del motivo.

- **`list`** (solo lectura, sin motivo ni auditoría): `php artisan arca:admin:list` muestra las cuentas activas y desactivadas, sin las eliminadas. `php artisan arca:admin:list --deleted` (o `-d`) muestra solo las eliminadas con su fecha de eliminación; `php artisan arca:admin:list --all` muestra todas con una columna Estado (Activa, Desactivada, Eliminada). El titular aparece marcado «(Titular)». `--deleted` y `--all` juntos fallan. Sin resultados: «No hay cuentas eliminadas.» o «No hay cuentas de administrador.».
- **`help`** (solo lectura): `php artisan arca:admin:help` imprime, al estilo de `git help` (sin tabla), una línea de uso y los comandos agrupados por nivel (Consulta, bajo, medio, alto), cada uno con su descripción y debajo sus opciones alineadas (solo comandos y niveles; atajos `-r`, `-y`, `-c`, `-a`, `-d`), más dónde se ejecuta, las variables `ARCA_PRIMARY_ADMIN_EMAIL` y `ARCA_ADMIN_RECOVERY` y la nota de `-h`. Se genera de los comandos registrados; el nivel sale de la constante `LEVEL` de cada comando, y una prueba falla si un `arca:admin:*` no la declara. Para el detalle de uno: `php artisan arca:admin:<comando> -h`.
- **`edit-name`**: `php artisan arca:admin:edit-name ana@zoo.example`. Pregunta Motivo, Nombre, Primer apellido, Segundo apellido (con el valor actual), muestra el resumen y pide `¿Aplicar el cambio?`. Con opciones: `php artisan arca:admin:edit-name ana@zoo.example --first-name=Ana --last-name=Pérez --reason="Corrección de nombre" --yes`.
- **`edit-email`**: pregunta Motivo, Correo nuevo (valida formato, que sea único incluso entre eliminadas y que la cuenta no esté eliminada) y `Para confirmar, escribe el correo afectado (ana@zoo.example)`. Al cambiar el correo se invalidan las sesiones y los tokens de la cuenta (revisión de seguridad, igual que `reset-password`). Sin terminal: `php artisan arca:admin:edit-email ana@zoo.example --new-email=ana.perez@zoo.example --reason="Cambio de dominio" --confirm-email=ana@zoo.example`.
- **`reactivate`**: pregunta Motivo y escribir el correo. Solo cuentas `admin` inactivas y no eliminadas.
- **`reset-two-factor`**: pregunta Motivo y escribir el correo; borra secreto, códigos y confirmación del 2FA e invalida sesiones. Con opciones: `... --reason="Perdió el teléfono" --confirm-email=ana@zoo.example`.
- **`create`**: pregunta Motivo, **Contraseña del administrador titular**, Correo institucional, Nombre, Primer apellido, Segundo apellido, Área, Contraseña y Confirma la contraseña (`Password::defaults()`), resumen y `¿Aplicar el cambio?`. La cuenta nace sin 2FA y debe configurarlo en su primer inicio.
- **`promote`**: `php artisan arca:admin:promote juan@zoo.example --reason="Nuevo responsable de sistemas"`. Pregunta la contraseña del titular y confirma. La cuenta debe estar activa, no eliminada y no ser admin; queda con un único rol `admin`.
- **`create`** valida los máximos de las columnas (correo 255 caracteres; nombre y apellidos 100) y responde con un mensaje claro sin crear nada.
- **`demote`**: `php artisan arca:admin:demote juan@zoo.example --role=executive --reason="Cambio de funciones"`. Sin `--role` muestra un selector con los roles asignables (sin `admin`). Pide la contraseña del titular y confirma. No aplica al titular.
- **`deactivate`**: pide la contraseña del titular y confirma; desactiva e invalida sesiones. No aplica al titular.
- **`delete`**: pide la contraseña del titular y confirma. Solo cuentas ya desactivadas, que no sean el titular ni dejen sin administrador activo. Es un borrado lógico (SoftDeletes): invalida sesiones y tokens, conserva la auditoría y las relaciones, no borra nada físico.
- **`reset-password`**: pide Motivo, contraseña del titular, Contraseña nueva y Confirma la contraseña nueva; invalida sesiones.

### Recuperación (modo recuperación)

`ARCA_ADMIN_RECOVERY=false` por defecto (`config('arca.admin_recovery')`). Sirve cuando se pierde la contraseña del titular o no queda ningún administrador activo. Con el modo activo, solo estos casos se permiten sin la contraseña del titular, con motivo y **escribiendo el correo afectado**: `arca:admin:reset-password` sobre el titular, y `arca:admin:create` cuando no hay ningún admin activo. Se audita como recuperación (evento `console-recovery-password-reset` o `console-recovery-created`, propiedad `mode: recuperación`, acción con prefijo «Recuperación:»). Cualquier otro comando sigue exigiendo la contraseña del titular. Todo comando `arca:admin:*` muestra «Modo recuperación activo: desactívalo al terminar (ARCA_ADMIN_RECOVERY=false).».

Procedimiento:

1. En el servidor, pon `ARCA_ADMIN_RECOVERY=true` en el `.env` y ejecuta `php artisan config:clear`.
2. Desde `apps/api/src`: `php artisan arca:admin:reset-password titular@zoo.example --reason="Recuperación por pérdida de contraseña"` (o `arca:admin:create` si no hay administradores activos).
3. Escribe la contraseña nueva y su confirmación, y al final escribe el correo afectado para confirmar.
4. Comprueba con `arca:admin:list` que la cuenta está activa y entra con la contraseña nueva.
5. Pon `ARCA_ADMIN_RECOVERY=false`, ejecuta `php artisan config:clear` y confirma que ya no aparece el aviso del modo recuperación.

### Qué no se puede hacer y por qué

- Pasar contraseñas por opción o argumento: quedarían en el historial del shell y en los procesos.
- Nivel alto sin terminal: la contraseña del titular solo se pide oculta.
- Desactivar, eliminar o hacer `demote` al titular: dejaría los comandos de nivel alto sin quien los autorice. Primero se cambia el titular.
- Eliminar una cuenta activa o la última cuenta admin: nunca puede quedar cero administradores activos.
- Eliminación física: lo clínico, lo financiero y la auditoría no se borran (Constitución V); `delete` es lógico.
- Gestionar cuentas `admin` desde la API o el dashboard: responden 403 y se auditan.

`arca:create-staff-simple` se retiró. Recomendación operativa: mantener al menos dos administradores activos.

## Reglas del último administrador

Desde `api-023` las cuentas `admin` no son operables desde la API (403 antes de llegar aquí); estas reglas las aplica `arca:admin:deactivate` desde la consola (`GuardAdministratorContinuityAction`). Descripción histórica de `api-007`:

Aplican cuando la cuenta objetivo es `admin` y está activa, y la operación la deja sin ese estado:

- Desactivar la cuenta.
- Eliminarla.
- Cambiarle el rol a otro distinto de `admin`.

Si no existe otro `admin` activo, responde 422 con `errors.user`: «Debe existir al menos un administrador de Presidencia activo.». La comprobación cuenta los otros administradores activos dentro de una transacción con `lockForUpdate()`, así que dos peticiones simultáneas no dejan el sistema sin `admin`.

Autodesactivación y autoeliminación responden 422: «No puedes desactivar tu propia cuenta.» y «No puedes eliminar tu propia cuenta.».

### Autorrestricciones sobre la propia cuenta

Un administrador no puede, sobre su propia cuenta, desde `/api/v1/admin/users/{user}`:

- Restablecer su contraseña (`PUT …/password`): 422 «No puedes restablecer tu propia contraseña desde la administración.».
- Restablecer su segundo factor (`DELETE …/two-factor`): 422 «No puedes restablecer tu propio segundo factor desde la administración.».
- Cambiar su propio rol (`PATCH …`, campo `role`): 422 «No puedes cambiar tu propio rol.». Aplica aunque exista otro `admin` activo.

El cambio de contraseña propio queda para otra feature. Implementado; el 422 usa la clave `errors.user`.

Un `zoo-admin` no accede a las rutas de cuentas desde: responde 403 por permiso en todas ellas.

## Revocación de sesiones

Desactivar, eliminar, restablecer contraseña y restablecer 2FA revocan las sesiones de la cuenta afectada (`RevokeStaffSessionsAction`):

- Borran las filas de la tabla `sessions` (`config('session.table')`) de esa cuenta.
- Rotan `remember_token`.

Dependencias y límites:

- La revocación depende de `SESSION_DRIVER=database`, que es el valor por defecto de `config/session.php`. Con otro driver, el borrado no alcanza las sesiones guardadas fuera de esa tabla. El plan prevé una prueba que lo verifique; confirmar que existe antes de cerrar T-35.
- Las cuentas inactivas se rechazan además en `staff.user`, así que la desactivación no depende solo de la revocación.
- Este código no revoca `personal_access_tokens` de Sanctum. El personal entra por cookie (`api-003`). Pendiente de confirmar que el personal no usa tokens.
- Restablecer la propia contraseña o 2FA queda prohibido desde la administración, por lo que la sesión del propio administrador no debe cerrarse por esta vía. Implementado.

## Noticias y eventos

Permisos: `news.manage` para noticias y `events.manage` para eventos.

| Método y ruta | Nombre | Respuesta |
|---|---|---|
| `GET /api/v1/admin/news` | `admin.news.index` | 200, sin paginar. Activas e inactivas, sin eliminadas. Orden: `published_date` descendente, luego `id`. |
| `POST /api/v1/admin/news` | `admin.news.store` | 201. `author_id` = usuario actual. `is_active` opcional (por defecto `true`). |
| `PATCH /api/v1/admin/news/{news}` | `admin.news.update` | 200. Payload completo (mismos obligatorios que el alta). `is_active` y `author_id` no cambian aquí. |
| `PATCH /api/v1/admin/news/{news}/status` | `admin.news.status` | 200. Body: `is_active` (obligatorio). |
| `DELETE /api/v1/admin/news/{news}` | `admin.news.destroy` | 204. Borrado lógico (`deleted_at`). |
| `GET /api/v1/admin/events` | `admin.events.index` | 200, sin paginar. Orden: `start_date` descendente, luego `id`. |
| `POST /api/v1/admin/events` | `admin.events.store` | 201. |
| `PATCH /api/v1/admin/events/{event}` | `admin.events.update` | 200. Payload completo. |
| `PATCH /api/v1/admin/events/{event}/status` | `admin.events.status` | 200. |
| `DELETE /api/v1/admin/events/{event}` | `admin.events.destroy` | 204. Borrado lógico. |

Campos de noticia: `title` (≤ 200, obligatorio), `description` (≤ 5000), `content` (≤ 20000, obligatorio), `category` (≤ 100, obligatorio), `published_date` (`Y-m-d`, obligatorio), `start_date` y `end_date` (`Y-m-d`, opcionales; `end_date ≥ start_date` cuando hay `start_date`).

Campos de evento: `name` (≤ 200, obligatorio), `description`, `start_date` (obligatorio), `end_date` (≥ `start_date`), `start_time` y `end_time` (`HH:MM` o `HH:MM:SS`), `location` (≤ 255). Si ambos horarios caen el mismo día, `end_time` debe ser posterior a `start_time`.

`image_path` no se acepta como texto (se ignora); solo cambia mediante la subida `image` o `remove_image` (ver «Imágenes»). Se devuelve tal como está guardado, junto con `image_url`.

Recurso de noticia: `id`, `title`, `description`, `content`, `image_path`, `image_url`, `published_date`, `start_date`, `end_date`, `category`, `is_active`, `author_id`. Recurso de evento: `id`, `name`, `description`, `image_path`, `image_url`, `start_date`, `end_date`, `start_time`, `end_time`, `location`, `is_active`, `author_id`.

Errores de recurso: 404 «Noticia no encontrada.» y 404 «Evento no encontrado.».

### Borrado lógico (DBR-005)

- `DELETE` marca `deleted_at`. No borra físicamente.
- Lo eliminado deja de aparecer en las listas de administración y, en eventos, en `GET /api/v1/events` (catálogo público de `api-006`). `ListEventsAction` no cambió.
- No hay endpoint de restauración. Restaurar requiere intervención de BD.
- DBR-005 está en `Lista para backend`. La migración `2026_10_30_000005_news_events_soft_deletes_and_tickets_index` se aplicó en `arca_pruebas`. Staging y producción siguen pendientes (ver la DBR).
- Si un ambiente tiene el código con `SoftDeletes` y no tiene la columna `deleted_at`, `GET /api/v1/events` falla. Por eso el despliegue debe aplicar la migración antes.

## Recintos

Permiso: `enclosures.manage`.

| Método y ruta | Nombre | Respuesta |
|---|---|---|
| `GET /api/v1/admin/enclosures` | `admin.enclosures.index` | 200, sin paginar, ordenado por nombre. |
| `POST /api/v1/admin/enclosures` | `admin.enclosures.store` | 201. |
| `PATCH /api/v1/admin/enclosures/{enclosure}` | `admin.enclosures.update` | 200. |
| `PATCH /api/v1/admin/enclosures/{enclosure}/status` | `admin.enclosures.status` | 200 con el recurso. Cuerpo `{"is_active": true\|false}` con booleano JSON estricto; otro valor responde 422. Sin cambio de estado no escribe ni registra (api-019). |
| `DELETE /api/v1/admin/enclosures/{enclosure}` | `admin.enclosures.destroy` | 200 `{"message": "Recinto eliminado."}`. Borrado lógico; los animales conservan su recinto (api-019). También marca `deleted_at` en todos sus códigos QR en la misma transacción (api-020). |
| `GET /api/v1/admin/enclosures/{enclosure}/qr` | `admin.enclosures.qr.show` | 200 `{"enclosure": {id, name, is_active}, "qr": {"code", "svg"} \| null}`. Solo lectura; con varios activos muestra el de `id` mayor (api-020). |
| `POST /api/v1/admin/enclosures/{enclosure}/qr` | `admin.enclosures.qr.generate` | 201 si crea el código; 200 con el mismo cuerpo si ya había uno activo. Registra «Código QR generado» sin el valor. |
| `POST /api/v1/admin/enclosures/{enclosure}/qr/regenerate` | `admin.enclosures.qr.regenerate` | 200 con el mismo cuerpo y `deactivated` (N). Desactiva los activos (no los elimina) y crea uno nuevo; registra «Código QR regenerado». |

Recurso: `id`, `name`, `gps_lat`, `gps_lon`, `map_x`, `map_y`, `is_active`, `animals_count`. El listado incluye activos e inactivos y excluye eliminados.

Nombre: obligatorio, máximo 100, sin espacios sobrantes, único sin distinguir mayúsculas. Un nombre repetido responde 422 «Ya existe un recinto con ese nombre.» en `errors.name`. Al renombrar, el propio recinto no cuenta como duplicado.

Los recintos eliminados no cuentan para la unicidad; los inactivos sí. Un recinto inactivo o eliminado no aparece en el catálogo público ni en el escaneo QR, y no recibe animales nuevos (api-019). Error de recurso: 404 «Recinto no encontrado.».

## Conteos de pendientes de revisión (api-024)

`GET /api/v1/admin/pending-counts` (`admin.pending-counts.show`), solo lectura, sin `step-up`. Exige `species.review`, `memories.review` o `reports.cancellations.view` (más sesión y 2FA del grupo admin). Responde `200` con enteros en la raíz, sin `data`, solo con las claves permitidas: `species_requests` (solicitudes de especie en `submitted`, de tipo `publish` o `update`, cuya especie no está eliminada; requiere `species.review`) `memories` (momentos en `submitted` o `in_review`; requiere `memories.review`) y `cancellation_days` (api-027; requiere `reports.cancellations.view`). Sin pendientes devuelve `0`, no ausencia de clave. Los eliminados lógicamente no cuentan. Sin ninguno de los tres permisos: `403` sin cifras; sin sesión: `401`. Límite de 60 consultas por minuto y usuario (limitador `admin-pending-counts`); la siguiente responde `429` con `Retry-After` y `{"message": "Demasiadas consultas. Espera un minuto e inténtalo de nuevo."}`. Quien no tiene permiso no consume cuota. El límite cubre también a quien solo tiene `reports.cancellations.view` (el administrador). No escribe filas ni Activitylog.

## Búsqueda global

`GET /api/v1/admin/search?q=` (`admin.search`), solo lectura, en el grupo admin sin permiso propio. `q` de 2 a 100 caracteres tras recortar espacios (422 en `q` si no). Límite de 30 peticiones por minuto y usuario (limitador `admin-search`); la 31 responde 429 «Demasiadas búsquedas. Espera un minuto e inténtalo de nuevo.». Devuelve `{"groups": [{"section", "label", "items": [{"id", "title", "subtitle", "kind"?, "managed_by_console"?, "match"?: {"field", "snippet"}}]}]}` con los grupos que el rol puede ver, en el orden `users`, `news`, `events`, `enclosures`, `memories`, `tulanpedia`, `ticket-history`; máximo 5 por grupo. `kind` solo aparece en `tulanpedia`; `managed_by_console` solo en `users` (las cuentas admin se muestran en solo lectura, api-023 CA-35); `match` solo cuando la coincidencia está en un campo distinto del título (fragmento de hasta 120 caracteres). Sin permisos de grupo: `{"groups": []}` (api-019).

Coincidencia (enmienda (b), `app/Actions/Admin/Search/Matching/`): sin mayúsculas ni acentos (tabla fija, sin `ext-intl`); la consulta se divide por espacios y cada palabra debe coincidir con algún campo del elemento, en cualquier orden. Niveles: exacta (4), prefijo (3), contiene (2, solo palabras de 4 o más letras) y aproximada (1, Levenshtein: una edición con 4 a 6 letras, dos con 7 o más). La puntuación del elemento es el peor nivel de sus palabras; orden por puntuación, título normalizado, `kind` e `id`. `%` y `_` son literales. Se comparan en PHP, sin `LIKE`, como máximo 2000 candidatos por grupo (`SearchGroup::CANDIDATE_LIMIT`), los más recientes por `id` descendente; los registros más antiguos no aparecen (revisar si una tabla supera 2000 filas). `memories` y `ticket-history` además aceptan el identificador exacto cuando `q` es solo un número (consulta directa, fuera del tope). Campos buscables por grupo: usuarios (nombre, apellidos, correo, área, rol en español e identificador interno), noticias (título, descripción, contenido, categoría), eventos (nombre, descripción, ubicación), recintos (nombre), momentos (opinión, motivo de rechazo, estado), TulanPedia (nombre común, científico, categoría, hábitat, distribución, estado de conservación) y boletos (estado, forma de pago, motivo de cancelación —etiqueta del motivo y comentario—, fecha dd/mm/aaaa). Nunca se consultan contraseñas, secretos de 2FA, tokens, `qr_code`, rutas de imagen ni datos de visitantes o de compradores, y el término no se registra en logs ni en Activitylog.

## Panel y reporte

Lectura para `dashboard.view` y `reports.view`. `executive`, `admin` y `zoo-admin` reciben los mismos datos.

Todos los totales, periodos y series se calculan en el servidor, en Actions. El cliente solo los presenta y reenvía `previous_date` y `next_date` como `date`.

### Panel

`GET /api/v1/admin/dashboard` (`admin.dashboard.show`, permiso `dashboard.view`):

```json
{
  "data": {
    "today": { "tickets": 0, "adults": 0, "children": 0, "revenue": "0.00" },
    "last_7_days": { "tickets": 0, "adults": 0, "children": 0, "revenue": "0.00" },
    "series": [{ "date": "AAAA-MM-DD", "revenue": "0.00" }],
    "timezone": "America/Mexico_City"
  }
}
```

Revisión boletos individuales: `tickets` cuenta boletos, es decir, la suma de `adult_quantity` + `child_quantity` de los boletos `completed` (`api-007` CA-29, RN-15), no el número de filas. Las filas anteriores con varias cantidades suben su conteo al desplegar.

`series` tiene 7 días, con el actual incluido. Sin ventas, todos los valores son 0 o `"0.00"`.

No acepta `timezone`: si llega, se ignora. `data.timezone` indica la zona de negocio. Ver «Zona horaria».

### Reporte

`GET /api/v1/admin/reports/tickets` (`admin.reports.tickets.show`, permiso `reports.view`).

Parámetros:

- `period`: `week`, `month` o `custom`. Obligatorio.
- `date`: fecha de referencia `Y-m-d`. Por defecto, hoy.
- `from` y `to`: solo con `custom`.
- `page`: página del listado de boletos.
- `timezone` ya no se usa: si llega, se ignora. Ver «Zona horaria».

Periodos:

- `week`: de lunes a domingo, la semana que contiene `date`.
- `month`: el mes calendario que contiene `date`.
- `custom`: `from` y `to` inclusivos. Máximo 366 días. `to` no puede ser anterior a `from`. Falta un extremo: 422.

Respuesta:

```json
{
  "data": {
    "period": { "type": "week", "from": "Y-m-d", "to": "Y-m-d", "label": "…", "previous_date": "Y-m-d", "next_date": "Y-m-d o null", "timezone": "America/Mexico_City" },
    "totals": { "tickets": 0, "adults": 0, "children": 0, "revenue": "0.00" },
    "daily": [{ "date": "Y-m-d", "tickets": 0, "adults": 0, "children": 0, "revenue": "0.00" }],
    "tickets": [{ "folio": "…", "purchased_at": "Y-m-d H:i:s", "adults": 0, "children": 0, "total": "0.00" }]
  },
  "meta": { "current_page": 1, "last_page": 1, "per_page": 50, "total": 0 }
}
```

- `meta` pagina solo `data.tickets` (50 por página). `totals` y `daily` cubren todo el periodo, no la página.
- `previous_date` es la fecha de referencia del periodo anterior. `next_date` es `null` si el inicio del periodo siguiente es posterior a hoy, y siempre `null` en `custom`.
- `daily` incluye todos los días del periodo, con ceros.
- `folio` es el identificador del boleto. `purchased_at` se muestra en la zona de `period.timezone`, sin desfase.
- Nunca se incluyen `qr_code` ni la identidad del cajero.
- Los importes son cadenas con dos decimales. No se suman en el cliente.

### Exportación

`GET /api/v1/admin/reports/tickets/export` (`admin.reports.tickets.export`, permiso `reports.view`).

Acepta los mismos parámetros y además `format`, obligatorio, con valores `csv`, `xlsx` o `pdf`.

| Formato | Resultado hoy |
|---|---|
| `csv` | 200, descarga. |
| `xlsx` | 200, descarga (OpenSpout, ADR 0017). |
| `pdf` | 200, descarga (Dompdf, ADR 0017); 422 si el periodo supera `config('arca.report_pdf_max_tickets')` (2000 boletos): «El reporte tiene demasiados boletos para PDF (máximo N). Acorta el periodo o exporta en CSV o Excel.». |
| otro formato | 422 de validación; uno válido pero ausente de `config('arca.report_export_formats')` responde 422 «Formato de exportación no disponible.». |

Formatos disponibles: `csv`, `xlsx` y `pdf`, según `config('arca.report_export_formats')`. Cada uno tiene su clase (`TicketReportCsvWriter`, `TicketReportXlsxWriter`, `TicketReportPdfWriter`) con las mismas secciones, totales y zona horaria del periodo.

Descarga CSV:

- `Content-Type: text/csv; charset=UTF-8`.
- `Content-Disposition: attachment; filename="reporte-boletos-<desde>_<hasta>.csv"`.
- `Cache-Control: no-store`.
- UTF-8 con BOM y separador coma.
- Contenido: encabezado del periodo, zona horaria resuelta (la misma que `period.timezone`), totales, desglose diario y todos los boletos del periodo, sin paginar. Los totales coinciden con el JSON, porque ambos salen de la misma Action.
- Se escribe en streaming y se registra en la bitácora (`report-exported`).

Descargas `xlsx` y `pdf`:

- `Content-Type`: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` o `application/pdf`; `Content-Disposition: attachment; filename="reporte-boletos-<desde>_<hasta>.xlsx|.pdf"`; `Cache-Control: no-store`. Todas se registran en la bitácora `report-exported` con `format` y `timezone`.
- Excel se escribe con OpenSpout en un archivo temporal que se copia a la salida; los importes van como cadena de dos decimales (igual que el JSON) y las celdas de texto que empiezan con `=`, `+`, `-`, `@`, tabulador o retorno se prefijan con apóstrofo.
- PDF se genera con Dompdf con `isRemoteEnabled=false`, sin PHP ni JavaScript embebidos, fuente DejaVu Sans incluida y todo texto escapado. Se arma en memoria, por eso el límite de 2000 boletos (422 al superarlo).

Generación y límites de la exportación:

- Excel y PDF se generan completos **antes** de responder, en un archivo temporal que se envía y se borra (`deleteFileAfterSend`). Si el generador falla, la respuesta es un error 5xx y nunca un archivo truncado con 200. El CSV sigue en streaming.
- Los temporales (xlsx, PDF, `tempDir` y `fontCache` de Dompdf) viven en `storage/app/tmp-reports`, que se crea desde código con permisos 0700. No se versiona (`storage/app/.gitignore`) y los archivos se borran en `finally`.
- La ruta `admin.reports.tickets.export` tiene `throttle:20,1` (20 descargas por minuto): la 21.ª responde 429.
- **Limitación conocida de memoria:** el CSV y el Excel recorren los boletos con `cursor()` de Eloquent, que con el driver MySQL de PDO lee el resultado completo en memoria del cliente (consulta con buffer). El streaming evita acumular el archivo, no el resultado de la consulta; con periodos de cientos de miles de boletos puede agotar memoria. Se mantiene así para conservar el orden por `purchased_at`; el PDF queda acotado por `report_pdf_max_tickets`. Revisar con `lazyById` o consulta sin buffer si el volumen crece.

## Requisitos de PHP (ADR 0017 y 0016)

La API exige PHP ^8.4 y las extensiones zip, xmlreader, xmlwriter, libxml, dom, mbstring, fileinfo, ctype e iconv (OpenSpout y Dompdf). Versiones instaladas: OpenSpout v5.12.2 (MIT) y Dompdf v3.1.6 (LGPL-2.1).

## Zona horaria (api-025)

- La API usa **una sola zona de negocio**, `config('arca.timezone')` (variable `ARCA_TIMEZONE`, por defecto `America/Mexico_City`), leída solo mediante `App\Support\BusinessTimezone`. Sustituye a `report_timezone` y `public_timezone`, que ya no existen. Si `ARCA_TIMEZONE` está vacía o no es un identificador IANA, la API no arranca y muestra un error en español.
- El panel, los periodos, el desglose, `previous_date` y `next_date`, la hora de `purchased_at` en el listado y el CSV usan esa zona. El parámetro `timezone` del cliente se ignora siempre (sin 422).
- La respuesta indica la zona: `data.timezone` en el panel, `data.period.timezone` en el reporte y `timezone` en la raíz del historial. El CSV, el XLSX y el PDF la muestran en su encabezado.
- Semana de lunes a domingo, mes calendario y rango personalizado, todos en la zona de negocio.
- La bitácora `report-exported` registra la zona de negocio en la propiedad `timezone`.
- La aplicación corre en UTC (`config/app.php`) y la conexión MySQL fija su sesión en UTC (`DB_TIMEZONE`, por defecto `+00:00`). Los límites de día se convierten a UTC solo para consultar `tickets.purchased_at`: `BusinessTimezone::startOfDayUtc()` y `endOfDayUtc()` son el helper reutilizable (reporte de cancelaciones y exportadores).
- **Supuesto:** `tickets.purchased_at` está guardado en UTC. Verificado en `arca_pruebas` (, ver el plan de api-025); operaciones lo verifica en `arca_zoo` antes de desplegar.
- La zona está en `BusinessTimezone`; `ResolveReportPeriodAction` y `SummarizeTicketSalesAction` calculan los periodos y `PresentTicketRow` presenta la hora del listado.

## Reporte de cancelaciones (api-022)

Solo `admin` (permiso `reports.cancellations.view`, sin reutilizar `reports.view`; `zoo-admin` y `executive` reciben 403). Rutas bajo `/api/v1/admin/reports/cancellations`, todas de lectura. La API ignora cualquier `timezone` del cliente: periodos y días van en `arca.timezone` (`BusinessTimezone`). Periodo y filtros se aplican por `purchased_at` (día de venta).

- `GET /reports/cancellations` (`admin.reports.cancellations.show`): `period` (`week|month|custom`, obligatorio), `date`, `from`, `to`, `cashier_id` (cajero con rol o con ventas, incluso eliminado lógicamente) y `reason_code` (catálogo de `docs/tickets.md`); 422 en español si no son válidos. Responde `data` con `period` (`type`, `from`, `to`, `label`, `previous_date`, `next_date`, `timezone`), `totals` (`cancelled_tickets` como suma de cantidades, `cancelled_amount`, `by_cashier`, `by_reason`; sin clasificar = `reason_code` nulo y «Sin clasificar (anterior)»), `reconciliation` (`days[]` y `cashiers[]` con `gross`, `cancelled`, `net` y `balanced`; el cajero añade `active_days`, `sold_tickets`, `cancel_percent`, `days_to_review`; sin `alert` ni `alert_reasons`, retirados en la revisión c) y `rows[]` (solo la página pedida; `page` opcional, mínimo 1, por defecto 1, tamaño `report_page_size`). Además, al nivel de `data`, `meta` con `current_page`, `last_page`, `per_page` y `total` (como el reporte de boletos). `totals` y `reconciliation` son del periodo completo y no cambian entre páginas. Página fuera de rango: 200 con `rows` vacío. Orden estable por fecha de venta e id. La exportación no se pagina (ignora `page`). Importes en cadena con dos decimales; instantes en ISO 8601 UTC. `minutes_to_cancel` va en minutos enteros hacia abajo.
- Conciliación: bruto = todos los boletos del día de venta, cancelado = los cancelados, neto = los completados; `balanced` verifica bruto = neto + cancelado. El neto diario coincide con el ingreso diario de `GET /reports/tickets`.
- Sin alertas viejas: `rows[]` y `reconciliation.cashiers[]` ya no traen `alert` ni `alert_reasons`. Cada fila trae `late_cancellation` (más de `cancel_after_minutes` = 30 min entre venta y cancelación, `config('arca.cancellation_alerts')`) y `signal_codes` (señales del semáforo de su cajero y día en las que participa; `[]` si ninguna). Cada cajero de la conciliación trae `days_to_review: {attention, review}` (sus días de ese nivel en el periodo). `long_cancel_minutes` (S5) copia `cancel_after_minutes` **al cargar la configuración**: se cambia solo `arca.cancellation_alerts.cancel_after_minutes` (o la variable que lo alimenta) y se recarga la config; sobrescribir solo el primero en tiempo de ejecución no actualiza el segundo. El semáforo es la única alerta. `cashier_min_sold_tickets` se retiró de la configuración; `cashier_cancel_percent` se conserva porque alimenta S1 (`over_limit_percent`).
- `GET /reports/cancellations/cashiers` (`admin.reports.cancellations.cashiers`): `{"data": [{"id", "name"}]}` para el filtro de cajero.
- **Límite de lecturas:** `GET /reports/cancellations`, `GET /reports/cancellations/cashiers` y `GET /reports/cancellations/reviews` comparten el limitador `cancellation-report`: 60 consultas por minuto y usuario; la siguiente responde `429` con «Demasiadas consultas al reporte. Espera un minuto e inténtalo de nuevo.» y `Retry-After`. Quien no tiene el permiso no consume cuota (403). Un `page` mayor que `PageGuard::MAX_PAGE` responde `200` con `rows` vacío (CA-29).

- `GET /reports/cancellations/export` (`admin.reports.cancellations.export`, `throttle:20,1`): mismos filtros y `format` `csv|xlsx|pdf`. Mismo contenido que la pantalla más un bloque de metadatos (quién y rol, fecha en UTC y en la zona de negocio, periodo, zona, filtros, formato) y la columna de comentario. Formato no disponible: 422 «Formato de exportación no disponible.»; PDF con más filas que `report_pdf_max_tickets`: 422 en `format` con el tope; las filas del documento son las de todas las secciones (por cajero, por motivo, días, cajeros, `cashier_days` y boletos), no solo los boletos (RN-10). Registra `report-cancellations-exported` en Activitylog antes de entregar; si el registro falla responde 5xx sin archivo. Los tres formatos salen de `ReportDocument` y `ReportDocumentWriter` (sin dependencias nuevas; los writers de api-007 no cambian).

## Semáforo y revisión de cancelaciones (api-027)

Solo `admin` (`reports.cancellations.view`; sin permiso nuevo). El semáforo no bloquea nada: no cambia boletos, reporte ni cancelación. Se recalcula en cada consulta (`BuildCancellationTrafficLightAction`, la misma para reporte, exportación y conteo); no hay tabla de niveles ni caché.

- **Reporte (`GET /reports/cancellations`), campos nuevos en `data`:** `reconciliation.cashier_days[]` (no paginado, idéntico en todas las páginas; `reason_code` no lo filtra y `cashier_id` sí lo recorta a ese cajero, con el nivel calculado con todos los datos; ordenado por fecha, cajero e id) y, junto a `rows`, `legend[]`, `levels[]` y `disclaimer`. `levels[]` explica los tres niveles: `{ code: "normal"|"review"|"attention", label, condition }`, con `condition` calculada de `attention_min_signals` («0 señales», «1 señal» y «2 o más señales» por defecto; con 3: «de 1 a 2 señales» y «3 o más señales»). Cada elemento de `cashier_days`: `cashier_id`, `cashier_name`, `date`, `traffic_light` (`normal|review|attention`), `traffic_light_label` («Normal», «Revisar», «Atención»), `signals_count`, `sold_tickets`, `cancelled_tickets`, `cancel_percent`, `reasons[]` (`code`, `label`, `count`, `detail`, `folios[]`), `reason_sentence` (el porqué en una frase; `null` en Normal), `action` (el qué hacer) y `review` (`null` o `{id, status, status_label, note, reviewed_by_name, reviewed_at}`). El grupo «Sin cajero registrado» sale con `cashier_id` y `traffic_light` en `null`, sin porqué y con `action` «No aplica: el día no tiene cajero registrado.»; no se revisa. Un día sin ventas no aparece.
- **Señales** (`config('arca.cancellation_review')`, solo del servidor): S1 `over_limit_percent` (más de 10 % cancelado con al menos 10 boletos), S2 `late_cancellations` (2 o más cancelaciones en los 30 minutos previos a la última venta del cajero ese día, frontera inclusiva), S3 `repeated_other` (2 o más con motivo Otro), S4 `same_amount` (2 o más del mismo importe), S5 `long_cancellations` (2 o más de más de 30 minutos entre venta y cancelación), C1 `own_baseline` (al menos el doble de su porcentaje de las 4 semanas anteriores, con 3 días activos, 5 % y 2 canceladas como mínimo) y C2 `peer_comparison` (al menos el doble de la mediana de los compañeros con 10 boletos en los 7 días que terminan ese día, mínimo 2 compañeros, 5 % y 2 canceladas). Nivel: 0 señales Normal, 1 Revisar, 2 o más Atención. El día es el de la venta en la zona de negocio.
- **Revisión (historial append-only):** `GET /reports/cancellations/reviews?cashier_id=&business_date=` (`admin.reports.cancellations.reviews.index`) devuelve `{"data": [revisión]}` de la más reciente a la más antigua; `POST /reports/cancellations/reviews` (`admin.reports.cancellations.reviews.store`, `throttle:20,1`, `step-up:none`) con `cashier_id`, `business_date` (`AAAA-MM-DD`, no futuro y con actividad de ese cajero), `status` (`reviewed_ok` «Revisado: todo en orden» o `clarification_required` «Requiere aclaración») y `note` (15 a 255 caracteres tras recortar) responde `201 {"data": revisión}`. Repetir el mismo estado crea otra entrada. La vigente es la de mayor `id`. Ninguna ruta edita ni borra. Auditoría `cashier-day-reviewed` en la misma transacción (actor, `cashier_id`, `business_date`, `status`, `note`, `review_id`).
- **Pendientes:** `GET /pending-counts` añade `cancellation_days` (solo con `reports.cancellations.view`): pares cajero-día en Atención de los 7 días de negocio cerrados (sin hoy) sin revisión vigente o con «Requiere aclaración». Revisar no cuenta. La ruta admite ahora `reports.cancellations.view`: `admin` recibe solo `cancellation_days`.
- **Folios, frase y filtro:** cada razón de `cashier_days[].reasons[]` trae `folios[]` (`tickets.id` como texto, igual que `rows[].folio`, en orden numérico): S1, C1 y C2 listan todos los cancelados del cajero y día; S2 a S5, solo los que cumplen la señal. `reason_sentence`: «Se activaron N señales: <etiqueta> (<n> boletos); …» («Se activó 1 señal: …» con una; `n` = `count`). Etiquetas: «Porcentaje de cancelación alto», «Cancelaciones cerca del cierre del cajero», «Motivo «Otro» repetido», «Mismo importe repetido», «Cancelaciones más de 30 min después de la venta», «Por encima de su promedio», «Por encima de sus compañeros»; `legend[]` usa las mismas. `cashier_days` respeta `cashier_id` (solo ese cajero, con el nivel calculado con todos los datos); `reason_code` no la filtra.
- **Exportación:** CSV, Excel y PDF añaden las secciones «Semáforo por cajero y día» (nivel, porqué, qué hacer, «Folios» y revisión vigente, solo del cajero filtrado si hay `cashier_id`) y «Leyenda del semáforo». Sin columnas «Alerta»: los boletos llevan «Cancelación tardía (más de 30 min)» Sí/No y «Señales»; la conciliación por cajero lleva «Días por revisar» («2 en Atención · 3 en Revisar»). El tope de PDF no cambia. Sigue auditándose `report-cancellations-exported` (api-022 CA-21).
- **Datos de demostración:** `php artisan arca:demo:cancellation-reviews [--days=14]` (1 a 90). Solo corre con `DB_DATABASE=arca_pruebas` y `APP_ENV` distinto de `production`; si no, termina con error sin escribir. Crea (si faltan) `demo-cancel-1|2|3@arca.local` con rol `cashier` y la contraseña de `DEMO_STAFF_PASSWORD`, y boletos con `qr_code` `DEMO-CANCEL-AAAAMMDD-…` en días Normal, Revisar y Atención hasta hoy. Es idempotente, solo inserta y no tiene opción de borrado; sus cancelaciones se escriben directo (excepción de api-027 RN-18) con `ticket-cancelled` y `demo = true` en Activitylog. Los datos se ven como datos normales en los reportes.

## Auditoría

Activitylog, log `admin`. Cada acción registra el actor (`causedBy`), el evento y el recurso afectado.

Eventos: `created`, `updated`, `status-changed`, `deleted`, `password-reset`, `two-factor-reset`, `denied` (intento rechazado sobre una cuenta admin o con rol admin, api-023), `report-exported`, `report-cancellations-exported`, `cashier-day-reviewed` (api-027). Los cambios por consola usan `console-created`, `console-promoted`, `console-deactivated`, `console-password-reset`, `console-two-factor-reset`, `console-name-edited`, `console-email-edited`, `console-reactivated`, `console-demoted`, `console-deleted`, `console-recovery-*`, `console-primary-password-failed` y `console-primary-locked`, sin causante de usuario (ver «Comandos de consola»).

Las propiedades nunca incluyen `password`, `remember_token`, secretos ni recovery codes de 2FA, ni el contenido de noticias o eventos.

## Pendientes

1. **Excel y PDF:** ADR 0017 en estado Propuesto. T-39 diferido.
2. **Orden de validación frente a 404:** la cuenta se resuelve antes de validar el cuerpo y el 404 prevalece. Implementada. Ver plan, divergencia 5.
3. **Restablecer la propia contraseña o 2FA:** prohibido desde la administración con 422. Implementada. El cambio de contraseña propio queda para otra feature. Ver plan, divergencia 6.
4. **Cambio del propio rol:** prohibido con 422 «No puedes cambiar tu propio rol.», aunque haya otro `admin` activo. Implementada. Ver plan, divergencia 6.
5. **Zona horaria de `tickets.purchased_at`:** Confirmado por el responsable funcional; se resuelve con la zona del dispositivo o la local. El almacenamiento se asume en UTC (ver «Zona horaria»).
6. **Tokens Sanctum del personal:** confirmar que no existen, para que la revocación cubra todas las sesiones.
7. **Driver de sesión:** confirmar que existe la prueba que exige `SESSION_DRIVER=database`.
8. **Clave de `errors` de los 422 de autorrestricción (Resuelta):** `errors.user`, igual que el resto de reglas de continuidad.
9. **Zona horaria del dispositivo (RN-14):** implementada (T-40 y T-41). Alias aceptados y listado sin desfase: Confirmado por el responsable funcional (ver «Zona horaria»). Pendiente real: no hay prueba que cubra el alias `US/Pacific`; ver T-41 en `apps/api/tasks/007-administration-management.md`.
10. **Revisión (aprobada):** `zoo-admin` sin gestión de cuentas y retirada de `operational-staff.manage` (implementada: `api-007` T-42 a T-44). Preguntas 8 y 9 de la spec resueltas: se conservan el 403 de asignación de rol y `UserPolicy`. No hay procedimiento documentado para resembrar permisos en producción (`api-009` pregunta R6; T-84).

## Imágenes (api-008)

Spec: `apps/api/specs/008-event-news-images.md`. Plan: `apps/api/plan/008-event-news-images.md`.

- Noticias y eventos aceptan el campo opcional `image` (JPG, PNG o WebP, máximo 5 MB = 5 120 KB). El servidor valida tipo y tamaño; los errores llegan como 422 en `errors.image`, con mensaje en español.
- Los archivos se guardan en el disco `public` de Laravel, en `news/` o `events/`, con nombre `<uuid>.<ext>` generado por la API. `image_path` guarda la ruta relativa e `image_url` la URL pública (`null` si no hay imagen gestionada o si `image_path` es un valor externo).
- Al guardar, la API quita metadatos (GPS, fecha, modelo, XMP, comentarios) y HDR, sin recomprimir; conserva el perfil de color y la orientación (`api-008` CA-14, RN-13). Las imágenes subidas antes los conservan hasta volver a subirlas. Un archivo que no se puede procesar responde 422 (CA-15).
- Alta: `POST /api/v1/admin/news` o `/events`, JSON o `multipart/form-data`.
- Edición con archivo: `POST /api/v1/admin/{news|events}/{id}` multipart con `_method=PATCH` (PHP no entrega multipart en PATCH). La edición sin archivo sigue funcionando por `PATCH` JSON.
- `remove_image` verdadero (sin archivo nuevo) borra el archivo y deja `image_path`/`image_url` en `null`. Con archivo nuevo, gana el archivo y `remove_image` se ignora. Sin ambos, la imagen se conserva.
- Al reemplazar, quitar o eliminar, el archivo anterior se borra del disco tras guardar el registro. Solo se borran rutas gestionadas (`news/` o `events/` con nombre `<uuid>.(jpg|png|webp)`); cualquier otro valor se ignora.
- Eliminar sigue siendo borrado lógico: `deleted_at`, `image_path` en `null` y archivo borrado. Una restauración de la fila por base de datos no recupera la imagen.
- `GET /api/v1/events` (catálogo público) incluye `image_url` como campo aditivo.
- Auditoría (log `admin`): además de `created`/`updated`/`deleted`, el evento `image-changed` con `action` (`set`, `replaced`, `removed`) e `image_changed`; sin binario ni ruta absoluta.
- Operación: ejecutar `php artisan storage:link` en cada ambiente; sin él las URLs no resuelven. Los límites `upload_max_filesize` y `post_max_size` de PHP/servidor web pueden rechazar archivos antes de llegar a Laravel. Pasos completos para desplegar: «Checklist obligatorio de despliegue de la API» en `infra/README.md`.
- Sin migraciones ni DBR: `image_path` y `deleted_at` ya existen.

### Códigos QR de recintos (api-020)

Códigos nuevos: `ARCA-` más 8 caracteres de `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (sin `0`, `O`, `1`, `I`, `L`), con `random_int`; hasta 5 intentos ante colisión y, si fallan, 500 «No pudimos generar el código QR. Inténtalo de nuevo.». El SVG se genera en memoria en cada respuesta (ADR 0019) y nunca se guarda. Generar, regenerar y eliminar un recinto bloquean la fila del recinto (`lockForUpdate`). Activitylog guarda `qr_code_id` y `deactivated_ids`, nunca el código. El listado admin incluye `has_active_qr`.

Comando: `php artisan arca:generate-qr-codes {enclosure}` imprime el código activo (lo crea si no hay); con `--regenerate` desactiva los activos y crea uno nuevo. Recinto inexistente o eliminado: «El recinto no existe.» y código de fallo. Desde consola el registro de actividad no tiene usuario y guarda `source: console`.

## Dato curioso en la publicación de especies (api-026)

- `fun_fact` es una clave más de `published_fields`. Texto plano; se guarda sin espacios en los extremos; máximo 500 caracteres siempre y mínimo 20 si el campo está seleccionado. Si no está seleccionado, el texto se descarta (queda NULL).
- Envío (`POST /api/v1/veterinarian/species-publication-requests`), edición de solicitud (`PATCH /api/v1/admin/species-publication-requests/{id}`) y de especie despublicada (`PATCH /api/v1/admin/species/{id}/publication`) aceptan `fun_fact`. La regla del mínimo se evalúa sobre el estado final con el registro bloqueado; los cambios se auditan con valor anterior y nuevo.
- Aceptar copia `fun_fact` a `species`; republicar exige un texto de 20 a 500 caracteres si el campo está seleccionado (error en `errors.fun_fact`); eliminar la publicación conserva el texto, que deja de ser visible.
- Detalle de solicitud: `fun_fact` en `current` y `proposed`. Detalle de especie: `fun_fact` en la raíz.

### Lista de moderación de momentos: paginación con total

`GET /api/v1/admin/memories?status=&page=&limit=` (`limit` 1 a 50, por defecto 10; `422` si se excede). `meta` pasa de `{page, limit, has_more}` a `{current_page, last_page, per_page, total, has_more}` (mismo formato que Usuarios y las listas de especies). Orden `created_at` descendente con desempate por `id`. Una `page` mayor que 100000 responde `200` con `data` vacío, `has_more` en `false` y el `total` real. La lectura pública `GET /api/v1/memories` conserva `{page, limit, has_more}`.
