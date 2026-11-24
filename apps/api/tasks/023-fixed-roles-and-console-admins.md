# Tareas · 023 · fixed-roles-and-console-admins

- Solicitada: 2026-11-20
- Aprobada: 2026-11-20
- Spec: `apps/api/specs/023-fixed-roles-and-console-admins.md`
- Plan: `apps/api/plan/023-fixed-roles-and-console-admins.md` (Aprobado — aprobación técnica: el responsable funcional)
- Contrato consumido por: `apps/dashboard/tasks/017-fixed-roles-account-management.md`

Plan aprobado. Implementación del backend hecha (T-03 a T-19 marcadas con las pruebas de cada tarea ejecutadas en `arca_pruebas`; ver notas). Quedan abiertas T-01 y T-02 (responsable de BD / sesión principal: correr el seeder), T-20 a T-24 (revisión final, suite completa, PR) hasta contar con la evidencia de la sesión principal. Enmienda técnica de la spec: CA-32 a CA-36 y RN-19 a RN-21.

Reglas de ejecución:
- Las tareas T-01 y T-02 son del responsable de BD (Responsable de BD). Ninguna crea SQL ni migraciones; no hay DBR en este cambio. Si T-01 encuentra un fallo de esquema, se detiene y se abre DBR antes de continuar.
- Las tareas de backend (T-03 en adelante) empiezan tras la aprobación técnica del plan, hecha. Q1 a Q7 quedan respondidas en el plan.
- El orden entre cambios es 021 → 025 → 022 → 023 → 024. Antes de T-03 se verifica que `two_factor_roles` y `RolesAndPermissionsSeeder` contienen los cambios de 021, 025 y 022 que ya estén fusionados.

## Base de datos (responsable de BD)

- [x] **T-01** (CA-03, CA-18, CA-19, RN-09, RN-10; plan «Datos» y «Avisos»): consulta en solo lectura del esquema vivo de `arca_pruebas` (`php artisan db:table users`, `db:table staff_notifications`, `information_schema`), sin cambios. Confirmar: (a) `users.created_by` y `users.updated_by` admiten `NULL` (la consola no tiene usuario); (b) `staff_notifications.created_by` admite `NULL`; (c) `staff_notifications.type` varchar(40) admite `console_admin_change`; (d) la restricción `uk_staff_notif_user_price (user_id, ticket_price_id)` admite varias filas con `ticket_price_id` nulo. Resultado con fecha y salida en esta tarea. Sin resultado, las tareas T-12 y T-13 no empiezan.
- [x] **T-02** (CA-01, CA-02, CA-03): después de T-03 fusionado, ejecutar `RolesAndPermissionsSeeder` en `arca_pruebas` (nunca en `arca_zoo`). Evidencia: consultas a `roles` (existe `communications`), `role_has_permissions` (`executive` = 3 permisos; `communications` = 5; `zoo-admin` y `admin` con `tickets.view-all`), y a `users` y `model_has_roles` de la cuenta `executive` existente (mismo `id`, mismo rol, sin duplicados). Sin esta evidencia no se marca CA-01 a CA-03 en PR.

## Implementación (backend; inicia con la aprobación técnica del plan)

### Roles, permisos y configuración

- [x] **T-03** (CA-01, CA-02, CA-08): `database/seeders/RolesAndPermissionsSeeder.php`: añadir `tickets.view-all` al arreglo de permisos; crear el rol `communications` con `news.manage`, `events.manage`, `memories.review`, `species.review`, `public-content.view`; añadir `tickets.view-all` a `zoo-admin`. `executive` queda con `dashboard.view`, `reports.view`, `public-content.view`. `admin` lo recibe por `array_diff` (no está excluido). Test: `FixedRolesSeederTest.php` con `test_ca01_executive_has_exactly_three_permissions`, `test_ca02_communications_has_exactly_five_permissions` y el de `tickets.view-all` en admin y zoo-admin.
- [x] **T-04** (CA-04, CA-05): `config/arca.php`: `two_factor_roles` = `admin`, `zoo-admin`, `cashier`, `executive`, `communications` (sin `veterinarian`). Sin cambio en `EnsureAdministratorTwoFactor`. Tests en `tests/Feature/Auth/FixedRolesTwoFactorTest.php`: `test_ca04_two_factor_roles_config_and_403_without_setup` (ruta admin del dashboard, p. ej. `GET /api/v1/admin/dashboard`, responde 403 `two_factor_setup_required` para `executive` y `communications`; `me`, `logout` y 2FA responden) y `test_ca05_executive_without_two_factor_gets_setup_required_in_me`.

### Inicio, historial y sugerencia

- [x] **T-05** (CA-06, CA-07; RN-03): `app/Actions/Auth/ResolveStaffHomeAction.php` por permiso y en este orden: `users.manage` o `enclosures.manage` → `administration`; `dashboard.view` → `executive`; `tickets.create` → `ticket`; `medical-records.view` → `pwa`; resto → `administration` (inicio Noticias, sin campo nuevo; la navegación del dashboard ya toma la primera sección disponible). Ampliar `tests/Feature/Auth/MeTest.php` con `test_ca06_home_matrix_by_permission` (admin, zoo-admin, executive, cashier, veterinarian; `pwa_url` solo en `pwa`) y `test_ca07_communications_home_is_administration_with_news_section`.
- [x] **T-06** (CA-08; RN-02, RN-03): `app/Actions/Admin/Tickets/ListTicketHistoryAction.php`: sustituir `FULL_READ_ROLES` por `$user->can('tickets.view-all')`; sin ramas por nombre de rol. Ampliar `tests/Feature/Tickets/TicketHistoryScopeTest.php` con `test_ca08_view_all_permission_scope_for_history` (admin y zoo-admin ven todo; cashier solo lo suyo; executive, communications y veterinarian reciben 403).
- [x] **T-07** (CA-09): `app/Actions/Staff/SuggestRoleForDepartmentAction.php`: `presidency` e `information-technology` → `executive`; el resto sin cambio. Test `tests/Feature/Staff/SuggestRoleForDepartmentTest.php` con `test_ca09_suggested_role_is_never_admin` (recorre todas las áreas de `departments`).

### Cuentas: lectura, opciones y catálogo

- [x] **T-08** (CA-10, CA-13; RN-01, RN-02): crear `app/Support/Staff/StaffRoleCatalog.php` (etiquetas de rol y de permiso según `docs/03-roles-y-permisos.md`, lista de roles gestionados por consola, `isConsoleManaged`). Crear `ResolveAssignableRolesAction` (todos menos `admin`, solo con `users.manage`) y `ResolveVisibleRolesAction` (todos con `users.manage`). Retirar `ResolveManageableRolesAction`. Actualizar `ListStaffOptionsAction` (roles con `permissions` etiquetados y `two_factor_required`), `ListStaffAccountsAction`, `FindManageableStaffAccountAction`, `UserPolicy`, `StaffAccountResource` (`managed_by_console`, etiqueta desde el catálogo) y `SearchUsersGroup` (etiquetas desde el catálogo; cuentas admin en solo lectura sin acciones, Q5; test `test_ca35_admin_account_in_global_search_is_read_only` en `tests/Feature/Admin/ConsoleManagedSearchTest.php`). Tests: `StaffAccountOptionsTest.php` reescrito con `test_ca10_options_exclude_admin_and_describe_roles`; en `ConsoleManagedAdminAccountsTest.php` (crear), `test_ca13_admin_accounts_readable_with_managed_by_console_flag` (`show` y `index` con `users.manage`; otros roles con `false`; ninguna respuesta contiene contraseña ni secretos 2FA).
- [x] **T-09** (CA-11, CA-12, CA-14, CA-29; RN-06): crear `GuardConsoleManagedAccountAction` y `GuardAssignableRoleAction` (403 con los mensajes de la spec; auditoría `denied` con `route`, `account_email`, `result`, `reason`; sin cuerpo de petición). Para la cuenta objetivo, `GuardConsoleManagedAccountAction` se llama desde el middleware `console-managed-account` (`app/Http/Middleware/ConsoleManagedAccountGuard.php`), después de `permission:users.manage` y antes de `step-up:*` de `api-021` (decisión Q6). `GuardAssignableRoleAction` (rol `admin` pedido) se llama desde `authorize()` de `StoreStaffAccountRequest` y `UpdateStaffAccountRequest`. Crear `DestroyStaffAccountRequest` y `ResetStaffTwoFactorRequest` (sin reglas) y usarlos en `StaffAccountController::destroy` y `StaffAccountTwoFactorController`. Retirar el mensaje genérico para estos casos. Tests en `ConsoleManagedAdminAccountsTest.php`: `test_ca11_console_managed_account_writes_return_403_regardless_of_body` (cinco rutas, cuerpo válido e inválido), `test_ca12_admin_role_requested_returns_403_on_store_and_update`, `test_ca14_check_order_permission_404_403_422` y `test_ca29_rejected_admin_attempts_are_audited_without_secrets` (el 403 por falta de `users.manage` no genera registro) y `test_ca36_admin_account_403_before_password_confirmation` (Q6; cuenta admin sin ventana ni contraseña responde el 403 de admin).
- [x] **T-10** (CA-11, CA-14; RN-11, RN-16): retirar `ensureAnotherActiveAdmin` de `UpdateStaffAccountAction`, `SetStaffAccountStatusAction`, `DeleteStaffAccountAction` y `ResetStaffTwoFactorAction` (las cuentas admin ya no llegan desde la API); conservar `ensureNotSelf` y la clase `GuardAdministratorContinuityAction` para la consola. Regresión: `StaffAccountStatusTest`, `StaffAccountDeleteTest`, `StaffAccountTwoFactorTest` en verde para cuentas no admin.

### Consola

- [x] **T-11** (CA-15, CA-16, CA-17, CA-31; RN-07, RN-08): crear `app/Console/Commands/Admin/` con los seis comandos y sus firmas (`arca:admin:create`, `promote {email}`, `deactivate {email}`, `reset-password {email}`, `reset-two-factor {email}`, `list`). Opción `--reason=` con mínimo 10 caracteres tras recortar; mensaje «Indica el motivo del cambio.»; `--yes` y `--no-interaction` según RN-20 (Q3; CA-34). Resumen con conexión y base activa; `confirm()` con valor por defecto `false`. Verificar que no existe ningún comando de eliminación. `arca:admin:list` sin motivo, sin auditoría y sin avisos. Tests: `tests/Feature/Console/ArcaAdminCommandsTest.php` (`test_ca15_arca_admin_commands_are_registered_without_physical_delete` con `php artisan list` o `Artisan::all()`; `test_ca16_missing_reason_fails_without_changes` por cada comando con cambio; `test_ca17_rejected_confirmation_makes_no_changes`) y `tests/Feature/Console/ArcaAdminListTest.php` (`test_ca31_list_needs_no_reason_and_changes_nothing`) y `tests/Feature/Console/ArcaAdminNonInteractiveTest.php` (`test_ca34_non_interactive_requires_reason_and_yes_and_rejects_password_commands`).
- [x] **T-12** (CA-18, CA-19; RN-09, RN-10): crear `app/Models/StaffNotification.php` (tabla `staff_notifications`, extiende `Model`, sin SoftDeletes, `timestamps` activos, sin `BaseModel`; ADR 0021 b). Crear `LogConsoleActivityAction` (sin `causedBy`; propiedades en lista blanca: `origin`, `os_user`, `hostname`, `reason`, `account_email`, `action`), `CreateConsoleAdminNoticesAction` (una fila por cuenta `admin` activa **después** del cambio, según Q2; `created_by` nulo; `payload` mínimo) y el esqueleto de `ApplyConsoleAdminChangeAction` (transacción, aplicación del cambio como parámetro, auditoría y avisos). Tests: `tests/Feature/Console/ArcaAdminAuditTest.php` (`test_ca18_console_activity_has_origin_and_no_causer_or_secrets`) y `tests/Feature/Console/ArcaAdminNoticesTest.php` (`test_ca19_creates_unread_notice_for_each_active_admin`; ninguna cuenta no admin recibe aviso).
- [x] **T-13** (CA-21): `CreateAdminCommand` (`arca:admin:create`): pide correo (único, normalizado), nombre, apellidos, área, contraseña oculta validada con `Password::defaults()` y motivo; crea cuenta `admin` activa vía `CreateStaffAccountAction` sin 2FA; auditoría `console-created`; avisos. Sin modo no interactivo con contraseña (plan). Test `tests/Feature/Console/ArcaAdminCreateTest.php` con `test_ca21_create_makes_active_admin_without_two_factor` (y `me` devuelve `two_factor_setup_required: true`). Depende de T-01 y T-12.
- [x] **T-14** (CA-22, CA-30): `PromoteAdminCommand` (`arca:admin:promote {email}`): exige cuenta activa, no eliminada y no `admin`; `syncRoles(['admin'])`; conserva área y datos; no revoca sesiones. Rechazos en español sin cambios ni auditoría. Tests: `tests/Feature/Console/ArcaAdminPromoteTest.php` (`test_ca22_promote_keeps_area_and_sessions_and_rejects_inactive`) y `tests/Feature/Console/ArcaAdminGuardsTest.php` (`test_ca30_console_rejects_non_admin_targets_for_admin_only_commands`, caso de promover a cuenta ya admin).
- [x] **T-15** (CA-20, CA-30; RN-11, RN-13): `DeactivateAdminCommand` (`arca:admin:deactivate {email}`): solo cuentas `admin`; cuenta ya inactiva → rechazo (mensaje propuesto); `GuardAdministratorContinuityAction::ensureAnotherActiveAdmin` dentro de la transacción con `lockForUpdate`; desactivar, revocar sesiones. Tests: `tests/Feature/Console/ArcaAdminDeactivateTest.php` (`test_ca20_last_active_admin_cannot_be_deactivated`, con el mensaje exacto de la spec, y con dos administradores activos sí desactiva e invalida sesiones) y `ArcaAdminGuardsTest.php` (caso de desactivar una cuenta no admin).
- [x] **T-16** (CA-23, CA-30; RN-13): `ResetAdminPasswordCommand` (`arca:admin:reset-password {email}`; contraseña oculta, `Password::defaults()`; cast `hashed`; revoca sesiones) y `ResetAdminTwoFactorCommand` (`arca:admin:reset-two-factor {email}`; `DisableTwoFactorAuthentication`; revoca sesiones). Solo cuentas `admin`. Tests: `tests/Feature/Console/ArcaAdminResetTest.php` con `test_ca23_reset_password_bcrypt_revokes_sessions` (prefijo `$2y$`) y `test_ca23_reset_two_factor_clears_secret_and_requires_setup`; casos de cuenta no admin en `ArcaAdminGuardsTest.php`.
- [x] **T-17** (CA-24; Q1, Q4): `app/Console/Commands/CreateStaffCommand.php` (`arca:create-staff`): la lista de roles excluye `admin` (usar `ResolveAssignableRolesAction`/catálogo, no `Role::all()`); el selector arranca sin opción marcada (Q4); la sugerencia de área aparece en la etiqueta. Motivo, confirmación, auditoría y avisos mediante `ApplyConsoleAdminChangeAction` (Q1, RN-19; CA-33). Retirar `CreateStaff.php` (`arca:create-staff-simple`; CA-32). Reescribir `tests/Feature/Staff/CreateStaffCommandTest.php` con `test_ca24_role_list_excludes_admin_and_has_no_granting_default`, `test_ca32_create_staff_simple_is_retired` y `test_ca33_create_staff_requires_reason_confirmation_audit_and_notices`.

### Avisos de API

- [x] **T-18** (CA-25, CA-26; RN-10): `ListConsoleAdminNoticesAction` (no leídos del actor), `MarkConsoleAdminNoticeReadAction` (`read_at` = ahora; aviso ajeno o inexistente → 404 «Aviso no encontrado.»), `ConsoleAdminNoticeController` y `ConsoleAdminNoticeResource` (sin usuario de SO ni servidor). Rutas en `routes/api.php` dentro del grupo `permission:users.manage`: `admin.console-notices.index` y `admin.console-notices.read` (`whereNumber('notice')`). Test `tests/Feature/Admin/ConsoleAdminNoticesTest.php` con `test_ca25_lists_only_unread_notices_for_users_manage` y `test_ca26_marks_own_notice_read_and_foreign_is_404`.

### Limpieza y cobertura

- [x] **T-19** (CA-27; RN-03): buscar en `src/app` y `src/routes` `operational-staff.manage`, `FULL_READ_ROLES`, `ResolveManageableRolesAction`, `LABELS` antiguo y decisiones por nombre de rol en `ResolveStaffHomeAction`, `CreateStaffCommand` y `ListTicketHistoryAction`; corregir los restos. Test `tests/Feature/Staff/LegacyRoleDecisionsTest.php` con `test_ca27_no_legacy_permission_or_role_name_decisions` (análisis estático). `GuardAdministratorContinuityAction` puede seguir usando `hasRole('admin')` como invariante de continuidad; el test lo excluye explícitamente y el PR lo justifica (confirmar en la revisión técnica del plan).
- [x] **T-20** (CA-01 a CA-31; IV): actualizar las pruebas existentes que afirman el comportamiento anterior (lista en el plan): `StaffAccountsScopeTest`, `StaffAccountOptionsTest`, `StaffAccountGuardsTest`, `StaffAccountsStoreTest`, `StaffAccountsUpdateTest`, `StaffAccountStatusTest`, `StaffAccountDeleteTest`, `StaffAccountPasswordTest`, `StaffAccountTwoFactorTest`, `StaffAccountSessionsTest`, `MeTest`, `SeedersTest`, `AdministratorTwoFactorTest`. Actualizar `tests/Concerns/SeedsRolesWhenMissing.php` para incluir `communications` y `tickets.view-all`. Comprobar con búsqueda de `CA-` en `tests/` que cada CA-01 a CA-36 (salvo los que la spec declara fuera de alcance) tiene al menos un `test_caNN_`.
- [ ] **T-21** (revisión de seguridad; Definición de terminado) — Fuera de alcance de esta entrega (checklist de PR): checklist de PR: ninguna cuenta `admin` escribible desde la API; ningún secreto en argumentos, logs, `activity_log`, avisos o respuestas; `DB::prohibitDestructiveCommands` y `arca_zoo` fuera de los tests; permisos comprobados en servidor; auditoría de consola sin causante de usuario.

## Calidad y entrega

- [x] **T-22** (docs): actualizar `apps/api/docs/administracion.md` con las rutas nuevas y sus respuestas, `users/options` con permisos etiquetados y `two_factor_required`, `managed_by_console`, avisos y la tabla de comandos `arca:admin:*` (incluido el requisito de `--reason`). Verificar que `docs/03-roles-y-permisos.md` no necesita cambios (el plan dice que no); si encuentra diferencias, reportarlas sin editar. Si el equipo aprueba la propuesta, añadir a `infra/README.md` el requisito operativo de crear al menos dos administradores activos con `arca:admin:create` en cada ambiente (requiere aprobación; el cambio de ambiente se anota en el mismo PR).
- [ ] **T-23** (CA-01 a CA-36) — Fuera de alcance de esta entrega (verificaciones con shell): verificaciones de la API, con salida real aportada por la sesión principal: Pint sobre archivos tocados; `php artisan test` contra `arca_pruebas` (filtrado por `api-023` y suite completa); `php artisan list` (espacio `arca:admin`); `migrate:status` sin migraciones nuevas. Sin evidencia no se marca nada.
- [ ] **T-24** (entrega) — Fuera de alcance de esta entrega (PR): PR enlaza `apps/api/specs/023-fixed-roles-and-console-admins.md`, `apps/api/plan/023-fixed-roles-and-console-admins.md`, `apps/api/tasks/023-fixed-roles-and-console-admins.md` y `apps/dashboard/tasks/017-fixed-roles-account-management.md`; el commit cita `api-023` (los commits los hace el responsable funcional con el comando que indique). Estado de la spec: «En progreso» al empezar la implementación; «Implementada» solo con enlace al PR y resultados de los CA-01 a CA-36.

Cada tarea de código nombra sus CA-xx y cada CA-xx tiene al menos una tarea de prueba (ver el mapeo del plan). Las tareas de BD (T-01, T-02) son del responsable de BD; las de backend empiezan tras la aprobación técnica del plan.

## Estado al retomar

- T-20 hecha: `SeedersTest` (6 roles), `AdministratorTwoFactorTest` (roles con 2FA y `veterinarian` sin 2FA), `CashierTwoFactorTest` ca31 (`executive` y `communications` ahora con 2FA) y los tres `GlobalSearch*` de forma de item (`managed_by_console` en `users`).
- Pasan: `SeedersTest`, `AdministratorTwoFactorTest`, `TicketHistoryScopeTest`, `StepUpWindowTest`, `StepUpStatusAndRoleTest`, `StaffTokenTwoFactorTest`, `DemoStaffSeederTest`, `CancellationReasonsTest` y los `GlobalSearch*` salvo dos.
- Fallos previos, no causados por esta spec (matcher de búsqueda, enmienda (d) con 3 o más palabras): `GlobalSearchNormalizationTest::ca37` y `GlobalSearchRelevanceTest::ca37`.
- Siguen abiertas T-01, T-02 (seeder, lo corre la sesión principal), T-21, T-23 y T-24; `infra/README.md` sin tocar (requiere aprobación).

## Estado al pausar

**Hecho y probado (en `arca_pruebas`, con `DatabaseTransactions`, sin correr la suite completa):**
- T-03 a T-19 y T-22 (docs en `apps/api/docs/`: `administracion.md`, `arquitectura.md`, `credenciales-desarrollo.md`, `tickets.md`). Pint aplicado; `php -l` sin errores en todos los PHP tocados.
- Pruebas que pasaron: `FixedRolesSeederTest`, `SuggestRoleForDepartmentTest`, `LegacyRoleDecisionsTest`, `tests/Feature/Console` (15), `ConsoleAdminNoticesTest`, `ConsoleManagedAdminAccountsTest`, `ConsoleManagedSearchTest`, `StaffAccountOptionsTest`, `FixedRolesTwoFactorTest`, `MeTest`, `CreateStaffCommandTest` (21) y todas las `StaffAccount*Test` (18). Cubren CA-01 a CA-36 salvo lo indicado abajo.
- Divergencias anotadas en `plan/023-...md` («Divergencias de implementación»). Nota añadida en `tasks/021-...md` (T-12, CA-38).

**A medias:** nada con sintaxis rota. La corrida de `SeedersTest|AdministratorTwoFactorTest|TicketHistoryScopeTest|StepUpWindowTest|StepUpStatusAndRoleTest|GlobalSearch|CashierTwoFactorTest|StaffTokenTwoFactorTest|DemoStaffSeederTest` se detuvo sin resultado.

**Falta:**
- T-01 y T-02 (BD / sesión principal): correr `RolesAndPermissionsSeeder` en `arca_pruebas` (la base viva aún no tiene `communications` ni `tickets.view-all`).
- T-20: revisar `SeedersTest` (lista de roles/permisos de `zoo-admin`) y `AdministratorTwoFactorTest` (lista de roles con 2FA); T-21, T-23, T-24.
- Opcional: `infra/README.md` (dos admins activos con `arca:admin:create`), requiere aprobación.

**Tests por correr (no ejecutados tras mis cambios):** `SeedersTest`, `AdministratorTwoFactorTest`, `TicketHistoryScopeTest` (incluye el nuevo `test_ca08_view_all_permission_scope_for_history`), `StepUpWindowTest` (test_ca38 ampliado), `StepUpStatusAndRoleTest`, `GlobalSearch*` (item de `users` ahora lleva `managed_by_console`), `CashierTwoFactorTest`, `StaffTokenTwoFactorTest`, `DemoStaffSeederTest`, y luego la suite completa.

## Evidencia de la sesión principal (, `arca_pruebas`)

- **T-01** (solo lectura, `information_schema`): `users.created_by` y `users.updated_by` int NULL; `staff_notifications.created_by` int NULL; `staff_notifications.type` varchar(40) NOT NULL (cabe `console_admin_change`); `ticket_price_id` bigint NULL; `uk_staff_notif_user_price (user_id, ticket_price_id)` es UNIQUE y MySQL admite varias filas con `ticket_price_id` NULL.
- **T-02**: antes de sembrar, los permisos de cada rol se leyeron en vivo; el seeder solo añadía (ningún rol perdía permisos; `operational-staff.manage` sin roles ni usuarios; `model_has_permissions` = 0). `php artisan db:seed --class=RolesAndPermissionsSeeder --force` → OK. Después: admin 18 permisos (incluye `reports.cancellations.view` y `tickets.view-all`), zoo-admin 11 (incluye `tickets.view-all`), executive 3, communications 5 (`news.manage`, `events.manage`, `public-content.view`, `species.review`, `memories.review`), cashier 6, veterinarian 6. La cuenta `executive` existente sigue con su rol (1 cuenta).

## Revisión: niveles de consola, titular y recuperación

Spec: CA-37 a CA-49. Plan: «Revisión». Sin DBR.

- [x] **T-25** (CA-37, CA-38, CA-39, CA-45; RN-23, RN-24): `config/arca.php`, `.env.example`, `ResolvePrimaryAdminAction`, `VerifyPrimaryAdminPasswordAction`, `LogConsoleSecurityEventAction`, `authorizeHighLevel()` y `rejectPrimaryTarget()`. Tests: `ArcaAdminPrimaryTest`.
- [x] **T-26** (CA-38, CA-44, CA-46; RN-22, RN-25): `create`, `promote`, `deactivate` y `reset-password` pasan a nivel alto; comandos `demote` y `delete`. Tests: `ArcaAdminPrimaryTest`, `ArcaAdminLevelsTest`, `ArcaAdminCreateTest` y demás clases actualizadas.
- [x] **T-27** (CA-40, CA-41, CA-42, CA-43; RN-22): `edit-name` (bajo), `edit-email`, `reactivate` y `reset-two-factor` (medio, `--confirm-email`). Tests: `ArcaAdminLevelsTest`.
- [x] **T-28** (CA-47, CA-48; RN-26): modo recuperación y aviso en todo `arca:admin:*`. Tests: `ArcaAdminRecoveryTest`.
- [x] **T-29** (CA-49, CA-15, CA-34): lista de comandos y modo no interactivo actualizados en `ArcaAdminCommandsTest` y `ArcaAdminNonInteractiveTest`.
- [x] **T-30** (docs): `apps/api/docs/administracion.md` («Comandos de consola»), `infra/README.md` y `.env.example`.
- [ ] **T-31** (verificación final) — Fuera de alcance de esta entrega: suite completa de la sesión principal; revisión de PR.

## Revisión (b): `list` con filtros y `help`

Spec: CA-50 a CA-55. Plan: «Revisión (b)». Sin DBR.

- [x] **T-32** (CA-50, CA-51, CA-52, CA-53; RN-27): `arca:admin:list` con `--deleted`/`-d` y `--all`. Tests: `ArcaAdminListTest`.
- [x] **T-33** (CA-54, CA-55; RN-28): constante `LEVEL` en cada comando y `arca:admin:help` generado. Tests: `ArcaAdminHelpTest`, `ArcaAdminCommandsTest::test_ca15_*`.
- [x] **T-34** (docs): `apps/api/docs/administracion.md` («list» y «help»).

## Revisión de calidad y seguridad

- [x] **T-35** (CA-42): `arca:admin:edit-email` revoca sesiones y tokens. Test: `ArcaAdminLevelsTest::test_ca42_edit_email_revokes_sessions_and_tokens`.
- [x] **T-36** (CA-21): `arca:admin:create` valida los máximos (correo 255, nombres 100). Test: `ArcaAdminCreateTest::test_ca21_create_rejects_values_over_the_column_limits`.
- [x] **T-37** (RN-25): reglas y escritura de `arca:admin:delete` pasan a `DeleteConsoleAdminAccountAction`; el comando queda delgado (`ArcaAdminLevelsTest::test_ca46_*`).
- [x] **T-38** (CA-28): test de cobertura `FixedRolesCoverageTest` (CA-01 a CA-55). El test `ArcaAdminCommandsTest::test_ca15_*` se renombra a `..._are_registered_without_physical_delete`.
