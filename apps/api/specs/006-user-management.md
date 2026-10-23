# 006 · user-management

- App dueña: `api`
- Apps/paquetes afectados: `api`, `dashboard` (consumidor, `dashboard-003`), `packages/api-client`
- Estado: Implementada (2026-10-23, rama `Jona-cambios`; pendiente de revisión del usuario)
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: Victor Adrian (sin cambios de esquema en esta feature)
- Aprobación funcional: Jonathan, 2026-10-23 (solicitud explícita de implementación en la rama experimental `Jona-cambios`; requiere revisión del equipo antes de integrarse a `main`)

## Problema y contexto

Hoy las cuentas del personal solo se crean con `php artisan arca:create-staff` (`api-003` CA-14) y la vista «Usuarios de taquilla» del dashboard es demostrativa en memoria. No existe ningún endpoint para administrar usuarios: `routes/api.php` solo expone `GET /api/v1/auth/me` y las rutas de visitante. `docs/03-roles-y-permisos.md` ya define los permisos `users.manage` (administrar todas las cuentas, solo `admin`) y `operational-staff.manage` (solo cuentas de `cashier` y `veterinarian`; `admin` y `zoo-admin`), sembrados por `api-003`.

Esta feature expone la gestión real de cuentas del personal reutilizando `CreateStaffAccountAction` (validación de correo, nombre, área, rol y contraseña con asignación de rol en transacción) y el catálogo de áreas y roles que hoy consume el comando CLI. La tabla `users` (con SoftDeletes, `is_active`, `created_by` y `updated_by`), `departments`, `roles`/`permissions`, `sessions` y `activity_log` ya existen por DBR-001 y DBR-002: **no se requieren cambios de esquema**.

## Objetivos

- Listar, crear, editar y desactivar cuentas del personal desde la API con rutas nombradas `staff-users.*`.
- Autorizar en servidor con una Policy: gestión completa con `users.manage`; gestión limitada a `cashier`/`veterinarian` con `operational-staff.manage`.
- Exponer el catálogo de áreas activas (con rol sugerido) y de roles asignables para poblar el formulario de alta.
- Auditar altas, cambios y bajas sin registrar contraseñas.

## Fuera de alcance

- Reactivar o eliminar físicamente cuentas (la baja es lógica y la reactivación queda para una spec futura).
- Restablecer el 2FA de otra persona, recuperación de contraseña o invitaciones por correo.
- Crear, editar o asignar permisos individuales o roles nuevos (la matriz sigue en `RolesAndPermissionsSeeder`).
- Cambios de esquema, migraciones o seeders nuevos.
- Cuentas de visitantes (`api-004`).

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia) | Administrar todas las cuentas del personal | `users.manage` (+ 2FA confirmado) |
| `zoo-admin` | Administrar solo cuentas de taquilla y veterinaria | `operational-staff.manage` (+ 2FA confirmado) |
| `executive`, `cashier`, `veterinarian` | Ninguna | Sin acceso (403) |

## Historias de usuario

- Como `admin`, quiero dar de alta, editar y desactivar cualquier cuenta del personal para no depender del responsable de BD ni de la consola.
- Como `zoo-admin`, quiero administrar las cuentas de cajeros y veterinarios sin poder tocar cuentas administrativas o directivas.
- Como responsable de auditoría, quiero que cada alta, cambio o baja quede registrada con quién la hizo.

## Criterios de aceptación

- **CA-01:** Dado un `admin`, cuando consulte `GET /api/v1/staff-users`, entonces recibe todas las cuentas no eliminadas con `id`, nombres, `full_name`, `email`, `department` (`id`, `code`, `name`), `roles` e `is_active`, sin contraseña ni secretos 2FA.
- **CA-02:** Dado un `admin`, cuando envíe `POST /api/v1/staff-users` con datos válidos de cualquier rol, entonces la cuenta se crea mediante `CreateStaffAccountAction` (correo en minúsculas, contraseña cifrada, rol asignado, `created_by` = quien crea) y responde 201 con el recurso.
- **CA-03:** Dados datos inválidos (correo duplicado o mal formado, nombre vacío, área inexistente o inactiva, rol inexistente o contraseña que no cumple `Password::defaults()`), cuando se cree o edite una cuenta, entonces responde 422 con errores por campo en español y no persiste cambios.
- **CA-04:** Dado un `zoo-admin`, cuando liste, cree, edite o desactive cuentas, entonces solo ve y administra cuentas `cashier`/`veterinarian`; asignar otro rol o actuar sobre una cuenta con otro rol responde 403.
- **CA-05:** Dada una persona sin `users.manage` ni `operational-staff.manage`, cuando llame a cualquier ruta `staff-users.*`, entonces responde 403; sin sesión responde 401; un `admin`/`zoo-admin` sin 2FA confirmado recibe 403 `two_factor_setup_required`.
- **CA-06:** Dada una cuenta administrable, cuando se envíe `PATCH /api/v1/staff-users/{id}` con nombres, correo, área, rol o contraseña (opcional), entonces solo se actualizan los campos enviados, el rol se sincroniza, `updated_by` registra a quien edita y responde 200 con el recurso.
- **CA-07:** Dada una cuenta administrable, cuando se envíe `DELETE /api/v1/staff-users/{id}`, entonces la cuenta queda `is_active = false` y con SoftDeletes, se cierran sus sesiones activas, ya no puede iniciar sesión, deja de listarse y responde 204; el registro se conserva.
- **CA-08:** Dada la propia cuenta, cuando alguien intente desactivarla o cambiar su propio rol, entonces responde 403 con mensaje en español.
- **CA-09:** Dado un administrador autorizado, cuando consulte `GET /api/v1/staff-users/catalog`, entonces recibe las áreas activas (`id`, `code`, `name`, `suggested_role`) y solo los roles que puede asignar (`name`, `label` en español): los 5 roles con `users.manage`; `cashier` y `veterinarian` con `operational-staff.manage`.
- **CA-10:** Dada un alta, edición o baja, cuando se complete, entonces se registra en `activity_log` (log `staff-users`) con evento, causante y cuenta afectada, sin contraseñas ni secretos.
- **CA-11:** Dadas más solicitudes por minuto que el límite configurado (`arca.staff_users_per_minute`, 60 por defecto) de una misma persona, cuando se exceda, entonces responde 429 con «Espera N segundos e inténtalo de nuevo.» y `Retry-After`.
- **CA-12:** Dada la suite de la API, cuando se ejecute sobre `arca_pruebas` con `DatabaseTransactions`, entonces existe al menos una prueba nombrada por cada CA-xx de esta spec.

## Reglas de negocio

- **RN-01:** La autorización se resuelve en `StaffUserPolicy`; los roles administrables los calcula `ResolveManageableRolesAction`: todos los roles `web` con `users.manage`; `cashier` y `veterinarian` con `operational-staff.manage`; ninguno en otro caso.
- **RN-02:** Una cuenta es administrable si todos sus roles están dentro de los roles administrables de quien actúa; con gestión limitada, además debe tener al menos un rol.
- **RN-03:** Nadie puede desactivar su propia cuenta ni cambiar su propio rol (evita dejar a Presidencia sin acceso).
- **RN-04:** La creación reutiliza `CreateStaffAccountAction` sin duplicar sus reglas; la edición aplica las mismas reglas con correo único que ignora la cuenta editada y contraseña opcional.
- **RN-05:** La baja es lógica (`is_active = false` + SoftDeletes); nunca se borra físicamente una cuenta del personal.
- **RN-06:** El área no otorga acceso; el rol sugerido por área (`SuggestRoleForDepartmentAction`) solo se propone en el catálogo.
- **RN-07:** Las rutas usan `auth:sanctum`, `staff.user`, `administrator.two-factor` y `throttle:staff-users`.

## Datos, privacidad y auditoría

Se consultan y modifican `users` y la asignación de roles (`model_has_roles`); se leen `departments` y `roles`. Las respuestas no incluyen contraseña, `remember_token` ni secretos 2FA. La bitácora (`activity_log`, log `staff-users`) guarda evento, causante, cuenta afectada, correo, roles y nombres de campos modificados, nunca valores de contraseña. La baja elimina las filas de `sessions` de la cuenta cuando el driver de sesión es `database`.

No requiere crear ni modificar esquema, funciones ni procedimientos: no acompaña DBR. Si durante la revisión se necesitara un cambio de esquema (por ejemplo, motivo de baja), se solicitará como DBR en `docs/database/requests/` antes de implementarlo.

## Flujos y errores

1. El cliente obtiene el catálogo y la lista; crea, edita o desactiva cuentas con `X-XSRF-TOKEN` (gestionado por `@arca/api-client`).
2. Errores: 401 sin sesión; 403 sin permiso, rol no asignable, cuenta no administrable, acción sobre la propia cuenta o 2FA pendiente; 404 si la cuenta no existe o ya fue desactivada; 422 validación; 429 límite excedido.

## Dependencias, riesgos y preguntas

- **Dependencias/ADR:** `api-003` (autenticación, permisos sembrados y `CreateStaffAccountAction`), DBR-001/DBR-002 (`Lista para backend`), ADR 0001 (Sanctum, Fortify, Spatie), ADR 0010 y ADR 0013.
- **Riesgos:** `Password::defaults()` usa HIBP fuera de `local` (los tests lo simulan con `Http::fake()`); los tests dependen de la disponibilidad de `arca_pruebas`.
- **Preguntas pendientes:** reactivación de cuentas y restablecimiento de 2FA de terceros quedan para specs futuras.

## Revisión

- Aprobadores y fecha: Jonathan (responsable funcional), 2026-10-23, por solicitud explícita en sesión; pendiente de revisión del equipo antes de integrarse a `main`.
- Evidencia/enlaces: `docs/03-roles-y-permisos.md`, `apps/api/specs/003-staff-authentication.md`, `apps/dashboard/specs/003-user-management.md`.
