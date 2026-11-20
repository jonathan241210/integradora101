# Plan técnico · 023 · fixed-roles-and-console-admins

- Spec: `apps/api/specs/023-fixed-roles-and-console-admins.md`
- Estado de spec: Aprobada (Jonathan, 2026-11-20)
- Estado del plan: **Borrador — pendiente de aprobación técnica (equipo/Jonathan)**. No autoriza la ejecución de tareas hasta su aprobación.
- Responsable técnico (backend): por identificar en la aprobación técnica.
- Responsable de BD: Víctor Adrián (solo T-01 y T-02 de `tasks/023`).
- Plan hermano: `apps/dashboard/plan/017-fixed-roles-account-management.md` (consumidor de este contrato).
- DBR relacionada: **ninguna**. La evaluación de la spec (sección «Datos, privacidad y auditoría») no encuentra cambios de esquema. La comprobación viva pendiente (T-01) puede cambiar esta conclusión; si falla, se abre DBR en `docs/database/requests/` antes de tocar datos.
- ADR relacionados: ADR 0021, excepción b) (`staff_notifications` sin SoftDeletes ni `BaseModel`). La spec la reactiva para avisos de consola; el ADR exige revisión en ese caso (ver «Riesgos y decisiones»). ADR 0001 (sin dependencias nuevas). No se requiere ADR nuevo.
- Orden de implementación: `api-021` → `api-025` → `api-022` → **`api-023`** → `api-024`.

## Diseño de solución

El cambio tiene cinco piezas, todas en `apps/api`:

1. **Catálogo cerrado de roles y permisos.** Una clase de datos sin reglas, `App\Support\Staff\StaffRoleCatalog`, reúne las etiquetas de rol (`admin`, `zoo-admin`, `executive` «Consulta directiva», `communications` «Comunicación», `cashier`, `veterinarian`), las etiquetas de permiso (las de la columna «Etiqueta en español» de `docs/03-roles-y-permisos.md`), la lista de roles gestionados solo por consola (`admin`) y el valor de `managed_by_console`. Las reglas viven en Actions: `ResolveAssignableRolesAction` (roles que se pueden asignar desde la API: todos menos `admin`) y `ResolveVisibleRolesAction` (roles de cuentas que se pueden **leer**: todos si hay `users.manage`). Sustituyen a `ResolveManageableRolesAction`, que se retira.
2. **Cuentas `admin` solo desde consola en la API.** Un único punto de control por operación: `GuardConsoleManagedAccountAction` (cuenta con rol `admin`) y `GuardAssignableRoleAction` (rol `admin` pedido). Ambas auditan el rechazo (`activity_log`, evento `denied`) y lanzan 403 con el mensaje de la spec. Se invocan desde `authorize()` de los Form Requests, que Laravel ejecuta **antes** de validar el cuerpo: así la respuesta no depende del contenido del cuerpo (CA-11) y se respeta el orden de CA-14 (permiso → 404 → 403 admin → 422). Las operaciones que no tenían Request (`DELETE /users/{user}` y `DELETE /users/{user}/two-factor`) reciben uno sin reglas (`DestroyStaffAccountRequest`, `ResetStaffTwoFactorRequest`).
3. **Decisiones por permiso.** `ListTicketHistoryAction` usa `tickets.view-all` en lugar de `FULL_READ_ROLES`; `ResolveStaffHomeAction` aplica la precedencia de RN-03 por permiso; `SuggestRoleForDepartmentAction` deja de sugerir `admin`.
4. **Comandos de consola `arca:admin:*`.** Son controladores de consola delgados: piden datos, validan el motivo (RN-07), muestran el resumen con la conexión de base de datos activa (`DB_CONNECTION`/`DB_DATABASE`), piden confirmación (RN-08) y llaman a Actions. La lógica está en `ApplyConsoleAdminChangeAction`, que dentro de una transacción aplica el cambio, invalida sesiones cuando corresponde (RN-13), escribe auditoría con origen `consola` (`LogConsoleActivityAction`, sin causante de tipo usuario) y crea avisos (`CreateConsoleAdminNoticesAction`).
5. **Avisos a administradores.** Modelo `StaffNotification` sobre la tabla `staff_notifications` existente (sin cambio de esquema), lectura por `ListConsoleAdminNoticesAction` y marcado por `MarkConsoleAdminNoticeReadAction`, expuestos bajo `permission:users.manage`.

Principio de diseño: la API decide; la consola y el dashboard solo presentan o piden datos (Constitución III).

## Cambios por área

| Área/app | Archivos o módulos previstos | Propósito |
|---|---|---|
| API / catálogo | `app/Support/Staff/StaffRoleCatalog.php` (nuevo); `app/Actions/Admin/Users/ResolveManageableRolesAction.php` (retirar); `app/Actions/Admin/Users/ResolveAssignableRolesAction.php`, `ResolveVisibleRolesAction.php` (nuevos) | Etiquetas, roles asignables y visibles (CA-01, CA-02, CA-10, CA-13) |
| API / seeder y config | `database/seeders/RolesAndPermissionsSeeder.php`; `config/arca.php` (`two_factor_roles`) | Roles `communications`, permiso `tickets.view-all`, 2FA de `executive` y `communications` (CA-01 a CA-04). Valor final de `two_factor_roles`: `admin`, `zoo-admin`, `cashier` (de 021), `executive`, `communications` |
| API / inicio e historial | `app/Actions/Auth/ResolveStaffHomeAction.php`; `app/Actions/Admin/Tickets/ListTicketHistoryAction.php`; `app/Actions/Staff/SuggestRoleForDepartmentAction.php` | Decisiones por permiso (CA-06 a CA-09, CA-27) |
| API / cuentas admin | `app/Actions/Admin/Users/GuardConsoleManagedAccountAction.php`, `GuardAssignableRoleAction.php` (nuevos); `app/Http/Requests/Admin/ManagedStaffAccountRequest.php`, `StoreStaffAccountRequest.php`, `UpdateStaffAccountRequest.php`, `DestroyStaffAccountRequest.php` (nuevo), `ResetStaffTwoFactorRequest.php` (nuevo); `app/Http/Controllers/Admin/StaffAccountController.php`, `StaffAccountTwoFactorController.php`; `app/Http/Resources/Admin/StaffAccountResource.php`; `app/Policies/UserPolicy.php` | 403 de cuentas admin y de rol admin, auditoría de rechazos, `managed_by_console` (CA-11 a CA-14, CA-29) |
| API / Actions de usuarios | `UpdateStaffAccountAction`, `SetStaffAccountStatusAction`, `DeleteStaffAccountAction`, `ResetStaffTwoFactorAction`, `ResetStaffPasswordAction`: se retira `ensureAnotherActiveAdmin` de las rutas de API; `GuardAdministratorContinuityAction` se conserva para la consola | Código sin ramas inalcanzables (RN-11, RN-16) |
| API / opciones | `app/Actions/Admin/Users/ListStaffOptionsAction.php`, `ListStaffAccountsAction.php`, `FindManageableStaffAccountAction.php` | Opciones con permisos etiquetados y `two_factor_required` (CA-10); lectura de admin (CA-13) |
| API / búsqueda global | `app/Actions/Admin/Search/Groups/SearchUsersGroup.php` | Etiquetas desde el catálogo; cuentas admin según pregunta Q5 |
| API / consola | `app/Console/Commands/Admin/CreateAdminCommand.php`, `PromoteAdminCommand.php`, `DeactivateAdminCommand.php`, `ResetAdminPasswordCommand.php`, `ResetAdminTwoFactorCommand.php`, `ListAdminsCommand.php` (nuevos); `app/Console/Commands/CreateStaff.php` (no se toca; ver Q1); `app/Console/Commands/CreateStaffCommand.php` | Comandos `arca:admin:*` (CA-15 a CA-23, CA-30, CA-31) y `arca:create-staff` (CA-24) |
| API / acciones de consola | `app/Actions/Console/AdminAccounts/ApplyConsoleAdminChangeAction.php`, `LogConsoleActivityAction.php`, `CreateConsoleAdminNoticesAction.php` (nuevos) | Lógica común de cambios por consola (RN-07 a RN-13, CA-16 a CA-23) |
| API / avisos | `app/Models/StaffNotification.php` (nuevo, sin SoftDeletes, extiende `Model`, ADR 0021 b); `app/Actions/Admin/Notices/ListConsoleAdminNoticesAction.php`, `MarkConsoleAdminNoticeReadAction.php` (nuevos); `app/Http/Controllers/Admin/ConsoleAdminNoticeController.php`, `app/Http/Resources/Admin/ConsoleAdminNoticeResource.php` (nuevos) | Avisos (CA-19, CA-25, CA-26) |
| API / inicio y cuentas | `app/Actions/Admin/Tickets/ListTicketHistoryAction.php` | Ver arriba |
| API / rutas | `routes/api.php` (grupo `users.manage`: `users.options` ya existe; añadir `console-notices`; `users.destroy` y `users.two-factor.destroy` sin cambio de ruta) | Rutas nombradas de avisos (CA-25, CA-26) |
| API / constantes de tests | `tests/Concerns/SeedsRolesWhenMissing.php` | Incluir `communications` y `tickets.view-all` en la comprobación de roles |
| API / pruebas | Ver «Mapeo de criterios a pruebas» | Un test por CA-xx |
| API / documentación | `apps/api/docs/administracion.md` (endpoints, opciones, avisos, comandos) | Referencia vigente (T-22) |
| Cliente | Sin cambios en esta app; el contrato de `packages/api-client` lo implementa `apps/dashboard/plan/017-fixed-roles-account-management.md` | — |
| Documentación de roles | `docs/03-roles-y-permisos.md`: **sin cambios pendientes** de esta spec (ya recoge `communications`, `tickets.view-all`, sugerencia `executive` y la regla de cuentas admin). Se verifica en T-22 | — |

## Contrato y datos

### Endpoints (grupo `admin`, middleware `auth:sanctum`, `staff.user`, `administrator.two-factor`)

| Método y ruta | Nombre | Permiso | Cambio |
|---|---|---|---|
| GET `/api/v1/admin/users` | `admin.users.index` | `users.manage` | Incluye cuentas `admin` (solo lectura) y `managed_by_console` (CA-13). Filtro `role` acepta cualquier rol visible |
| GET `/api/v1/admin/users/options` | `admin.users.options` | `users.manage` | Roles asignables (sin `admin`) con permisos etiquetados y `two_factor_required` (CA-10) |
| POST `/api/v1/admin/users` | `admin.users.store` | `users.manage` | `role: "admin"` → 403 (CA-12) |
| GET `/api/v1/admin/users/{user}` | `admin.users.show` | `users.manage` | Cuenta `admin` en solo lectura con `managed_by_console: true` (CA-13) |
| PATCH `/api/v1/admin/users/{user}` | `admin.users.update` | `users.manage` | Cuenta `admin` → 403 (CA-11); `role: "admin"` → 403 (CA-12) |
| PATCH `/api/v1/admin/users/{user}/status` | `admin.users.status` | `users.manage` | Cuenta `admin` → 403 (CA-11) |
| DELETE `/api/v1/admin/users/{user}` | `admin.users.destroy` | `users.manage` | Cuenta `admin` → 403 (CA-11) |
| PUT `/api/v1/admin/users/{user}/password` | `admin.users.password.update` | `users.manage` | Cuenta `admin` → 403 (CA-11) |
| DELETE `/api/v1/admin/users/{user}/two-factor` | `admin.users.two-factor.destroy` | `users.manage` | Cuenta `admin` → 403 (CA-11) |
| GET `/api/v1/admin/console-notices` | `admin.console-notices.index` | `users.manage` | Avisos no leídos del actor (CA-25) |
| POST `/api/v1/admin/console-notices/{notice}/read` | `admin.console-notices.read` | `users.manage` | Marca `read_at`; 204 (propuesta); aviso ajeno → 404 (CA-26) |

Las rutas de avisos van dentro del grupo `permission:users.manage` existente. `{notice}` se declara con `whereNumber`.

### Forma de las respuestas

- `users/options`: `{ "data": { "departments": [...], "roles": [ { "name": "executive", "label": "Consulta directiva", "two_factor_required": true, "permissions": [ { "name": "dashboard.view", "label": "Ver panel ejecutivo" }, ... ] } ] } }`. `departments[].suggested_role` solo toma valores de `roles`.
- Cuenta (`StaffAccountResource`): campos existentes más `managed_by_console` (boolean). `role.label` sale de `StaffRoleCatalog` («Consulta directiva», no «Ejecutivo»).
- Aviso (`ConsoleAdminNoticeResource`): `{ "id", "action", "account_email", "origin": "consola", "reason", "created_at" }`. No incluye usuario del sistema operativo ni servidor (RN-10).
- Listado de avisos: `{ "data": [ ... ] }`, solo no leídos, ordenados por `created_at` ascendente.

### Requests, Actions, Resources y Policies

- `ManagedStaffAccountRequest::authorize()`: (1) `FindManageableStaffAccountAction` con visibilidad completa (404); (2) `GuardConsoleManagedAccountAction` si la cuenta es `admin` (403); (3) `authorizeTarget()` del Request concreto, que llama a `GuardAssignableRoleAction` si hay `role` y valida que esté en `ResolveAssignableRolesAction` (si no, 422 por validación, como hoy).
- `StoreStaffAccountRequest::authorize()`: `GuardAssignableRoleAction` cuando `role` es `admin` (403; el correo del cuerpo se audita).
- `UpdateStaffAccountRequest`: la regla `Rule::in` pasa a roles asignables; `admin` ya lo rechaza el guard antes.
- `UserPolicy::assignRole()` usa `ResolveAssignableRolesAction`; `UserPolicy::manages()` usa `ResolveVisibleRolesAction`. No hay Policy por registro nueva.
- Los 403 de cuenta admin y de rol admin **no** usan el mensaje genérico de `AdminFormRequest::failedAuthorization`: el guard lanza `HttpException(403, mensaje)`.
- Actions de cuentas (`Update`, `SetStatus`, `Delete`, `ResetPassword`, `ResetTwoFactor`): siguen aplicando `ensureNotSelf`; se retira `ensureAnotherActiveAdmin` porque una cuenta `admin` ya no llega a ellas desde la API.

### Comandos de consola

| Comando | Argumentos y opciones | Interacción | Efecto |
|---|---|---|---|
| `arca:admin:create` | `--reason=` (RN-07) | Pide correo, nombre, apellidos, área, contraseña (oculta, `Password::defaults()`) y confirma | Crea cuenta `admin` activa sin 2FA (CA-21) |
| `arca:admin:promote {email}` | `--reason=` | Resumen y confirmación | Convierte cuenta activa, no eliminada y no `admin` en `admin` (CA-22) |
| `arca:admin:deactivate {email}` | `--reason=` | Resumen y confirmación | Desactiva `admin` activa; respeta continuidad (CA-20, CA-30) |
| `arca:admin:reset-password {email}` | `--reason=` | Pide contraseña nueva (oculta) y confirma | Restablece `admin` (CA-23, CA-30) |
| `arca:admin:reset-two-factor {email}` | `--reason=` | Confirma | Borra 2FA de `admin` (CA-23, CA-30) |
| `arca:admin:list` | ninguna | Ninguna | Lista cuentas `admin`; no cambia nada (CA-31) |
| `arca:create-staff` | `—` | Como hoy, sin `admin` ni valor por defecto que conceda acceso | Ver Q1 y T-17 (CA-24) |

- **Modo no interactivo** (`--no-interaction`): sin contraseña por argumento. `create`, `reset-password` fallan con mensaje en español («Este comando pide la contraseña en la terminal.») y no cambian nada. Los demás exigen `--reason` y **`--yes`**, que es la única forma de confirmar sin terminal (propuesta, ver Q3).
- **Motivo**: texto recortado de al menos 10 caracteres; si no cumple, código de salida `FAILURE` y «Indica el motivo del cambio.» antes de cualquier consulta de datos que cambie (CA-16).
- **Confirmación**: `confirm()` con valor por defecto `false`. Rechazarla termina con `SUCCESS` sin cambios y sin auditoría (CA-17).
- **Resumen**: muestra la conexión (`DB_CONNECTION`, nombre de la base de `config('database.connections.<conexión>.database')`), la operación, la cuenta afectada y el motivo antes de confirmar. Nunca muestra contraseñas.
- Los comandos no tienen usuario de aplicación: `Auth::user()` es `null`.

### Auditoría (`activity_log`, log `admin`)

- Cambios por consola: evento `console-created`, `console-promoted`, `console-deactivated`, `console-password-reset`, `console-two-factor-reset`. `subject` = cuenta afectada; `causer` = vacío. `properties`: `origin: "consola"`, `os_user`, `hostname`, `reason`, `account_email`, `action`. Descripción en español («Cambio por consola: …»).
- Rechazos de API (CA-29): evento `denied`; `causer` = actor; `subject` = cuenta afectada si existe; `properties`: `route` (nombre de ruta), `account_email`, `result: "denied"`, `reason` (`console-managed` o `admin-role-requested`). No se registra el cuerpo de la petición.
- `LogAdminActivityAction` ya excluye claves sensibles (`password`, `two_factor_secret`, etc.). `LogConsoleActivityAction` construye sus propiedades con lista blanca explícita, sin pasar el cuerpo ni la contraseña.

### Avisos (`staff_notifications`)

- Tipo `console_admin_change` (19 caracteres, cabe en `varchar(40)`). `user_id` = cada cuenta `admin` activa (Q2), `payload` = `{ "action", "account_email", "origin": "consola", "reason", "occurred_at" }` (sin usuario de SO ni servidor), `created_by` = `NULL` (la consola no tiene usuario; la columna admite `NULL` según la spec), `read_at` = `NULL`, `acknowledged_at` = `NULL`, `ticket_price_id` = `NULL`.
- La restricción `uk_staff_notif_user_price (user_id, ticket_price_id)` admite varias filas con `ticket_price_id` nulo en MySQL 8.0, como en Aiven y local (portabilidad). Se verifica en T-01.

### Errores y compatibilidad

| Caso | Respuesta |
|---|---|
| Operación de escritura sobre cuenta `admin` | 403 «Las cuentas de administrador solo se gestionan desde la consola del servidor.» (auditado) |
| `role: "admin"` en alta o cambio de rol | 403 «No puedes asignar el rol de administrador desde la administración.» (auditado) |
| Cuenta inexistente o eliminada | 404 «Usuario no encontrado.» |
| Sin `users.manage` | 403 por middleware (no auditado) |
| Aviso ajeno o inexistente | 404 «Aviso no encontrado.» (mensaje propuesto) |
| Comando sin motivo válido | Código de fallo; «Indica el motivo del cambio.» |
| Desactivar la última `admin` activa | Código de fallo; «Debe existir al menos un administrador de Presidencia activo.» |
| Cuenta inexistente en un comando | Código de fallo; «No existe una cuenta con ese correo.» (mensaje propuesto) |

Compatibilidad:
- `users/options` deja de incluir `admin`: rompe clientes que lo esperen. El único consumidor es `apps/dashboard` (`dashboard-017` CA-01), que se coordina en el mismo cambio.
- `role.label` de `executive` pasa de «Ejecutivo» a «Consulta directiva» (código sin cambio, RN-04). `communications` es nuevo.
- `managed_by_console`, `two_factor_required` y `permissions` son campos aditivos.
- Cuentas `admin` existentes (4 en `arca_pruebas`) siguen intactas; se gestionan solo desde consola.

## Seguridad, offline y operación

- **Mínimo privilegio:** todas las rutas nuevas y cambiadas van bajo `permission:users.manage`. Ocultar botones en el dashboard no sustituye estas comprobaciones.
- **Autoridad de la consola:** quien tiene acceso al servidor puede crear o promover administradores. Es la decisión de la spec. La consola no tiene sesión de aplicación, por eso no pide contraseña del operador (RN-08); el motivo y la auditoría sustituyen esa garantía.
- **Secretos:** contraseñas solo por prompt oculto (`secret()`/`password`), nunca por argumento u opción; el hash lo hace el cast `hashed` del modelo (bcrypt; el test comprueba el prefijo `$2y$`). No se escriben en logs, `activity_log`, avisos ni respuestas. El 2FA se borra con la acción de Fortify (`DisableTwoFactorAuthentication`), que limpia secreto, códigos y confirmación; el test lo comprueba.
- **Sesiones:** desactivar, restablecer contraseña y restablecer 2FA revocan sesiones con `RevokeStaffSessionsAction` (RN-13). Promover no las revoca (CA-22).
- **Concurrencia:** `DB::transaction` con `lockForUpdate` sobre la cuenta objetivo y sobre los administradores activos al desactivar (`GuardAdministratorContinuityAction`).
- **Datos personales:** correo, nombre, área y, solo en `activity_log`, usuario de SO y servidor. Retención de avisos y auditoría: pendiente (la spec no la define).
- **Ambiente:** los comandos usan la conexión de `.env`. El resumen muestra la base activa. Los tests usan `arca_pruebas` y `DatabaseTransactions`; ningún agente usa `arca_zoo`.
- **Portabilidad MySQL 8.0.x (Aiven/local):** sin funciones, triggers ni vistas; sin columnas nuevas; sin dependencias nuevas.
- **Rate limit:** no aplica a consola; las rutas de avisos son de lectura y marcado, bajo `users.manage`.
- **Offline:** no aplica.
- **Observabilidad:** solo `activity_log` y contadores de tests; ningún log de aplicación con datos de cuenta.

## Mapeo de criterios a pruebas

Todas las pruebas Feature usan `DatabaseTransactions` sobre `arca_pruebas` (prohibido `RefreshDatabase`). Docblock `/** CA-xx api-023 */` y nombre `test_caNN_…`. Las pruebas de consola usan `artisan()`/`expectsQuestion`/`expectsConfirmation` según Laravel Prompts (ver nota de implementación en T-11).

| Criterio | Prueba automatizada | App/ubicación | Tareas |
|---|---|---|---|
| CA-01 | `test_ca01_executive_has_exactly_three_permissions` | API `tests/Feature/Staff/FixedRolesSeederTest.php` | T-03, T-02 |
| CA-02 | `test_ca02_communications_has_exactly_five_permissions` | idem | T-03, T-02 |
| CA-03 | `test_ca03_seeder_rerun_keeps_executive_account_and_sessions` | idem | T-02 |
| CA-04 | `test_ca04_two_factor_roles_config_and_403_without_setup` | API `tests/Feature/Auth/FixedRolesTwoFactorTest.php` | T-04 |
| CA-05 | `test_ca05_executive_without_two_factor_gets_setup_required_in_me` | idem | T-04 |
| CA-06 | `test_ca06_home_matrix_by_permission` | API `tests/Feature/Auth/MeTest.php` (ampliado) | T-05 |
| CA-07 | `test_ca07_communications_home_is_administration_with_news_section` | idem | T-05 |
| CA-08 | `test_ca08_view_all_permission_scope_for_history` | API `tests/Feature/Tickets/TicketHistoryScopeTest.php` (ampliado) | T-06 |
| CA-09 | `test_ca09_suggested_role_is_never_admin` | API `tests/Feature/Staff/SuggestRoleForDepartmentTest.php` | T-07 |
| CA-10 | `test_ca10_options_exclude_admin_and_describe_roles` | API `tests/Feature/Admin/StaffAccountOptionsTest.php` (reescrito) | T-08 |
| CA-11 | `test_ca11_console_managed_account_writes_return_403_regardless_of_body` | API `tests/Feature/Admin/ConsoleManagedAdminAccountsTest.php` | T-09 |
| CA-12 | `test_ca12_admin_role_requested_returns_403_on_store_and_update` | idem | T-09 |
| CA-13 | `test_ca13_admin_accounts_readable_with_managed_by_console_flag` | idem | T-08 |
| CA-14 | `test_ca14_check_order_permission_404_403_422` | idem | T-09 |
| CA-15 | `test_ca15_arca_admin_commands_registered_without_delete` | API `tests/Feature/Console/ArcaAdminCommandsTest.php` | T-11 |
| CA-16 | `test_ca16_missing_reason_fails_without_changes` | idem (un caso por comando con cambio) | T-11 |
| CA-17 | `test_ca17_rejected_confirmation_makes_no_changes` | idem | T-11 |
| CA-18 | `test_ca18_console_activity_has_origin_and_no_causer_or_secrets` | API `tests/Feature/Console/ArcaAdminAuditTest.php` | T-12 |
| CA-19 | `test_ca19_creates_unread_notice_for_each_active_admin` | API `tests/Feature/Console/ArcaAdminNoticesTest.php` | T-12 |
| CA-20 | `test_ca20_last_active_admin_cannot_be_deactivated` | API `tests/Feature/Console/ArcaAdminDeactivateTest.php` | T-15 |
| CA-21 | `test_ca21_create_makes_active_admin_without_two_factor` | API `tests/Feature/Console/ArcaAdminCreateTest.php` | T-13 |
| CA-22 | `test_ca22_promote_keeps_area_and_sessions_and_rejects_inactive` | API `tests/Feature/Console/ArcaAdminPromoteTest.php` | T-14 |
| CA-23 | `test_ca23_reset_password_bcrypt_revokes_sessions` y `test_ca23_reset_two_factor_clears_secret_and_requires_setup` | API `tests/Feature/Console/ArcaAdminResetTest.php` | T-16 |
| CA-24 | `test_ca24_role_list_excludes_admin_and_has_no_granting_default` | API `tests/Feature/Staff/CreateStaffCommandTest.php` (reescrito) | T-17 |
| CA-25 | `test_ca25_lists_only_unread_notices_for_users_manage` | API `tests/Feature/Admin/ConsoleAdminNoticesTest.php` | T-18 |
| CA-26 | `test_ca26_marks_own_notice_read_and_foreign_is_404` | idem | T-18 |
| CA-27 | `test_ca27_no_legacy_permission_or_role_name_decisions` | API `tests/Feature/Staff/LegacyRoleDecisionsTest.php` (análisis estático de `src/app`) | T-19 |
| CA-28 | Verificación de cobertura: cada `test_caNN_` existe y CA-01 a CA-31 tienen al menos uno | revisión en PR y T-20 | T-20 |
| CA-29 | `test_ca29_rejected_admin_attempts_are_audited_without_secrets` | API `tests/Feature/Admin/ConsoleManagedAdminAccountsTest.php` | T-09 |
| CA-30 | `test_ca30_console_rejects_non_admin_targets_for_admin_only_commands` | API `tests/Feature/Console/ArcaAdminGuardsTest.php` | T-14, T-15, T-16 |
| CA-31 | `test_ca31_list_needs_no_reason_and_changes_nothing` | API `tests/Feature/Console/ArcaAdminListTest.php` | T-11 |

### Pruebas existentes que cambian de forma explícita (T-20)

Estas pruebas afirman el comportamiento anterior y se reescriben o amplían en el mismo PR:
- `Feature/Admin/StaffAccountsScopeTest.php`: `test_ca04_…_admin_assigns_any_of_the_five_roles` (contradice CA-12), `test_ca04_…_assign_role_policy_denies…` (afirma que `admin` es asignable).
- `Feature/Admin/StaffAccountOptionsTest.php`: `test_ca12_…_only_admin_receives_the_five_roles`.
- `Feature/Admin/StaffAccountGuardsTest.php`: `test_ca09_…_protects_self_and_the_last_active_admin` (las cuentas `admin` responden 403, no las reglas de continuidad).
- `Feature/Admin/StaffAccountsStoreTest.php`, `…UpdateTest.php`, `…StatusTest.php`, `…DeleteTest.php`, `…PasswordTest.php`, `…TwoFactorTest.php`, `…SessionsTest.php`: revisar casos con cuentas `admin` como objetivo.
- `Feature/Auth/MeTest.php`: mapa de `home` y lista de roles con 2FA.
- `Feature/Staff/SeedersTest.php`: lista de roles y permisos de `zoo-admin`.
- `Feature/Staff/CreateStaffCommandTest.php`: opciones de rol y valor por defecto.
- `Feature/Auth/AdministratorTwoFactorTest.php`: lista de roles con 2FA.
- `tests/Concerns/SeedsRolesWhenMissing.php`: nombres de roles comprobados.

## Constitution Check

| Principio | Cumple | Evidencia o excepción propuesta |
|---|---|---|
| I. Stack mínimo y portable | Sí | Sin dependencias nuevas. Prompts y Spatie ya en uso. El único índice relevante (`uk_staff_notif_user_price`) funciona con `NULL` en MySQL 8.0 (Aiven y local). Verificación en T-01. |
| II. La spec manda | Sí | Spec 023 Aprobada (2026-11-20). Plan y tasks con el mismo `023-fixed-roles-and-console-admins`. Tareas no marcadas hasta aprobación. |
| III. Lógica separada de la interfaz | Sí | Reglas en Actions (`Guard*`, `Resolve*`, `ApplyConsoleAdminChangeAction`, avisos). Controladores y comandos delgados. El dashboard solo consume el contrato (CA-15 de `dashboard-017`). |
| IV. Un test por criterio | Sí | Mapeo completo CA-01 a CA-31 (tabla anterior). CI en verde: **pendiente de evidencia de la sesión principal**. |
| V. Una sola fuente de verdad para los datos | Sí, con excepción existente | Sin migraciones ni SQL. Roles y permisos por seeder (catálogo). `staff_notifications` sin SoftDeletes: excepción b) de ADR 0021, cubierta por el ADR y pendiente de revisión al reactivar la tabla (ver Riesgos). Cambios por consola auditados en `activity_log`; rechazos auditados. |
| VI. Código en inglés, personas en español | Sí | Identificadores, rutas (`admin.console-notices.*`), comandos (`arca:admin:*`), permisos y eventos en inglés. Mensajes, descripciones de auditoría y textos de avisos en español. |

## Riesgos y decisiones

- **ADR requerido o aprobado:** ADR 0021 (excepción b) de `staff_notifications`). La spec la reactiva para avisos. Propuesta: añadir una nota de revisión al ADR 0021 que remita a `api-023`. Editar `docs/adr/` requiere autorización expresa; no se hace en este plan.
- **Riesgo de bloqueo:** si no quedan administradores activos, solo la consola puede recuperar el acceso. Mitigación: CA-20 y recomendación de al menos dos administradores activos.
- **2FA de `executive` existente (1 cuenta):** en su siguiente inicio exigirá configurar 2FA (CA-05). Requiere aviso previo al usuario.
- **Cuentas sin rol:** RN-03 deja `administration` como inicio de toda cuenta sin permiso de inicio; una cuenta sin rol vería un panel vacío. `arca:create-staff-simple` crea cuentas sin rol (Q1).
- **Orden con `api-021`:** el 403 de cuenta admin (023) debe producirse antes del 403 `password_confirmation_required` (021) para que la respuesta no dependa de la contraseña. Propuesta: 023 primero. Pendiente de acordar con el plan de 021.
- **Cambio de `users/options` y de `role.label`:** rompe clientes que esperen `admin` o «Ejecutivo»; se coordina con `dashboard-017` en el mismo cambio.
- **Operación sobre base equivocada:** los comandos escriben en la base de `.env`. Mitigación: resumen con la base activa, confirmación y prohibición de `arca_zoo` en pruebas.
- **Búsqueda global:** `SearchUsersGroup` muestra cuentas por `users.manage`; ver Q5.
- **Alternativas descartadas:** Policy por registro con 403 para admin (ya descartada por la spec por revelar existencia); roles creados desde la interfaz (fuera de alcance); contraseña del operador por argumento (expone secretos en el historial de shell).

### Preguntas abiertas (para aprobación técnica)

- **Q1.** ¿`arca:create-staff` (que crea cuentas no admin) debe cumplir RN-07 a RN-10 (motivo, confirmación, auditoría y avisos), como dice el objetivo «cada comando de consola que cambia datos»? ¿Y `arca:create-staff-simple`, que crea cuentas sin rol y sin auditoría, se retira o se deja fuera de alcance? El plan asume «sí» para `arca:create-staff` y no lo toca para `arca:create-staff-simple` hasta respuesta.
- **Q2.** CA-19: ¿los avisos van a las cuentas `admin` activas **después** del cambio (una cuenta desactivada no recibe el aviso) o **antes**? El plan propone «después».
- **Q3.** Modo no interactivo: ¿se acepta `--reason` + `--yes` para `promote`, `deactivate` y `reset-two-factor`, y el rechazo de `create` y `reset-password` sin terminal?
- **Q4.** CA-24: ¿el selector de rol de `arca:create-staff` arranca sin opción seleccionada (el operador debe elegir), o mantiene la sugerencia de área como valor por defecto? La sugerencia de `presidency` e `information-technology` ya es `executive`, que concede acceso. El plan propone que la sugerencia aparezca en la etiqueta y no como valor por defecto.
- **Q5.** Búsqueda global (`SearchUsersGroup`): ¿las cuentas `admin` aparecen en resultados (solo lectura, sin acciones) o se excluyen? El plan propone que aparezcan sin acciones, coherente con CA-04 de `dashboard-017`.
- **Q6.** ¿Se confirma el orden 023 → 021 para el 403 de cuenta admin frente a la confirmación de contraseña?
- **Q7.** Nota de revisión en ADR 0021 (excepción b) al reactivar `staff_notifications`: ¿autorizada?

## Orden y aprobación

1. Aprobación técnica de este plan y respuestas a Q1 a Q7 (equipo/Jonathan).
2. T-01 (responsable de BD): consulta de esquema vivo en `arca_pruebas` sin cambios. Resultado con fecha en la tarea.
3. Backend: catálogo y seeder (T-03), 2FA (T-04), inicio e historial (T-05, T-06), sugerencia (T-07), lectura de cuentas admin y opciones (T-08), guards de escritura (T-09, T-10).
4. Consola: esqueleto y motivo (T-11), auditoría y avisos (T-12), comandos de alta, promoción, desactivación y restablecimiento (T-13 a T-16), `arca:create-staff` (T-17).
5. Avisos de API (T-18), limpieza de decisiones por nombre (T-19), cobertura (T-20).
6. T-02 (responsable de BD): ejecutar `RolesAndPermissionsSeeder` en `arca_pruebas` con evidencia. Va después de T-03 y antes de las pruebas que dependen de roles reales.
7. Documentación y verificación (T-22, T-23); PR (T-24).

Dependencias entre cambios:
- `api-021`: `two_factor_roles` (cashier) y el orden de la confirmación (Q6). Va antes; el valor final de `two_factor_roles` combina ambos cambios.
- `api-025`: sin efecto en las rutas de este cambio; los avisos guardan `occurred_at` en UTC y el dashboard lo formatea con la zona única.
- `api-022`: añade `reports.cancellations.view` al seeder y a la etiqueta de permisos; si `022` está fusionado antes, su etiqueta entra en el catálogo sin cambios de contrato.
- `api-024`: añade rutas de conteo de pendientes; `routes/api.php` se fusiona sin solapamiento de rutas.
- `dashboard-017`: consume `users/options`, `managed_by_console` y los avisos. Su plan y tareas siguen este contrato.

Aprobación:
- Revisión técnica: pendiente (equipo/Jonathan).
- Aprobador funcional: Jonathan, spec aprobada el 2026-11-20.
- Evidencias: pendientes de la sesión principal (salida de `php artisan test` contra `arca_pruebas`, Pint, `php artisan list`, `migrate:status` sin cambios, consultas de T-01 y T-02). Esta redacción no ejecutó nada y no afirma que pasen.

## Verificación de esquema de la sesión principal (2026-11-20, solo lectura)
- `users.created_by` y `users.updated_by`: `int` **nullable**, FK a `users` con `ON DELETE SET NULL` (`php artisan db:table users`). El alta por consola sin usuario de aplicación cabe sin DBR.
- `staff_notifications.created_by`: `int` nullable (verificado antes en esta fecha).
- T-01 del responsable de BD sigue vigente como confirmación formal, pero no se esperan hallazgos.
