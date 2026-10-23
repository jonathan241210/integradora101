# Tareas · 006 · user-management

- Spec: `apps/api/specs/006-user-management.md`
- Plan: `apps/api/plan/006-user-management.md`

Precondición: DBR-001/002 ya aplicadas en el esquema existente; no se crean ni modifican tablas.

## Implementación

- [x] **T-01** (CA-01, CA-04, CA-05, CA-08, CA-09; RN-01, RN-02, RN-03): implementar `ResolveManageableRolesAction` y `StaffUserPolicy`, registrar explícitamente el Policy y probar el alcance por roles.
- [x] **T-02** (CA-02, CA-03, CA-06, CA-07, CA-08, CA-10; RN-03, RN-04, RN-05): implementar `UpdateStaffAccountAction`, `DeactivateStaffAccountAction` y `LogStaffUserEventAction`; conservar transacciones, `updated_by`, SoftDeletes y privacidad de actividad.
- [x] **T-03** (CA-01..CA-11; RN-06, RN-07): implementar `Staff/StaffUserController`, Resource, catálogo, rutas nombradas, validación y errores; configurar `staff-users` limiter, `STAFF_USERS_PER_MINUTE` y respuesta 429 española.

## Pruebas (cada una nombra su CA)

- [x] **T-04** (CA-01): agregar `CA-01` en `StaffUserManagementTest` para listado ordenado, recurso seguro y alcance de cuenta.
- [x] **T-05** (CA-02): agregar `CA-02` para alta válida por admin, rol, correo normalizado y `created_by`.
- [x] **T-06** (CA-03, CA-04): agregar `CA-03` para errores de alta/edición y `CA-04` para alcance y roles de `zoo-admin`.
- [x] **T-07** (CA-05, CA-06): agregar `CA-05` para 401, 403 y 2FA pendiente; `CA-06` para PATCH parcial, `updated_by` y cambio de rol.
- [x] **T-08** (CA-07, CA-08): agregar `CA-07` para baja lógica, sesiones/tokens y bloqueo de login; `CA-08` para baja propia y cambio de rol propio.
- [x] **T-09** (CA-09, CA-10): agregar `CA-09` para catálogo por permiso/etiqueta y `CA-10` para actividad sin contraseña ni secretos.
- [x] **T-10** (CA-11, CA-12): agregar `CA-11` para 429 y `CA-12` para comprobar que hay una prueba nombrada para cada CA-01..CA-12.

## Calidad y entrega

- [x] **T-11**: revisar seguridad, rutas y esquema sin migraciones; ejecutar PHPUnit Feature y Pint en PHP modificado, actualizar docs locales pertinentes y registrar resultados.
- [x] **T-12**: marcar los criterios probados y actualizar el estado de la spec al completar la verificación.

Verificación: `./vendor/bin/pint --test` y `php -l` pasaron en los PHP añadidos/modificados; `php artisan route:list --name=staff-users -v` mostró las cinco rutas con `auth:sanctum`, `staff.user`, `administrator.two-factor` y `throttle:staff-users`. `php artisan test` sobre `arca_pruebas` (MySQL 8.4.11, sin migraciones ni cambios de esquema) pasó: 63 pruebas, 850 aserciones; `StaffUserManagementTest` cubre CA-01..CA-12 con 12 pruebas.
