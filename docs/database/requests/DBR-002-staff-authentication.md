# DBR-002 · staff-authentication

- Estado: Borrador
- Feature/spec origen: `apps/api/specs/003-staff-authentication.md`
- Solicitante: Jonathan (backend)
- Responsable de BD: Victor Adrian
- Responsable backend: Jonathan
- Fecha: 2026-10-13
- Depende de: DBR-001 (`english-schema-normalization`), que debe aplicarse primero

## Problema y justificación

La feature `api-003` (inicio de sesión real del personal) necesita que la tabla `users` (hoy `usuarios_admins`, renombrada por DBR-001) soporte autenticación moderna: correo institucional único, estado de cuenta, `remember_token`, segundo factor TOTP de Fortify, timestamps, SoftDeletes y trazabilidad (`created_by`/`updated_by`). Además, la sesión por cookie de Sanctum requiere `sessions`; el caché con driver `database` requiere `cache` y `cache_locks`; los roles y permisos requieren las tablas de Spatie Permission; y la bitácora de accesos requiere `activity_log` de Spatie Activitylog.

También se corrige la FK `users.department_id`, hoy en **ON DELETE CASCADE**: borrar un departamento eliminaría las cuentas del personal. Se cambia a **RESTRICT**; los departamentos se desactivan con `is_active = 0`.

## Estado actual

Tras DBR-001 (pendiente de aplicación): `users` y `departments` existen con columnas mínimas. `users` no tiene correo, estado, `remember_token`, columnas 2FA, timestamps ni SoftDeletes. `departments` no tiene `code`, `is_active` ni timestamps. No existen `permissions`, `roles`, `model_has_permissions`, `model_has_roles`, `role_has_permissions`, `sessions`, `cache`, `cache_locks` ni `activity_log`. Todas las tablas están vacías.

## Contrato solicitado

### `users` — columnas nuevas

| Columna | Tipo | Restricciones |
|---|---|---|
| `email` | varchar(255) | UNIQUE, NOT NULL |
| `is_active` | tinyint(1) | NOT NULL, DEFAULT 1 |
| `remember_token` | varchar(100) | NULL |
| `two_factor_secret` | text | NULL (cifrado por Fortify) |
| `two_factor_recovery_codes` | text | NULL |
| `two_factor_confirmed_at` | timestamp | NULL |
| `created_at`, `updated_at` | timestamp | NULL |
| `deleted_at` | timestamp | NULL (SoftDeletes) |
| `created_by`, `updated_by` | int | NULL, FK a `users.id` |

### `users` — cambio de clave foránea

La FK `users.department_id → departments.id` pasa de **ON DELETE CASCADE** a **ON DELETE RESTRICT**: no se puede borrar un departamento que tenga personal; se desactiva con `is_active = 0`.

### `departments` — columnas nuevas

| Columna | Tipo | Restricciones |
|---|---|---|
| `code` | varchar(50) | UNIQUE, NOT NULL (identificador estable en inglés) |
| `is_active` | tinyint(1) | NOT NULL, DEFAULT 1 |
| `created_at`, `updated_at` | timestamp | NULL |

### Tablas nuevas

- **Spatie Permission:** `permissions`, `roles`, `model_has_permissions`, `model_has_roles`, `role_has_permissions`, según la migración publicada del paquete; `model_id` del mismo tipo que la PK de `users` (hoy `int`; el responsable de BD lo confirma al crear la migración).
- **`sessions`:** tabla de sesiones del driver `database` de Laravel (Sanctum por cookie).
- **`cache` y `cache_locks`:** tablas del driver `database` de caché.
- **`activity_log`:** tabla de Spatie Activitylog.

**Fuera de alcance:** `personal_access_tokens` (tokens Sanctum para mobile); se pedirá en su propia DBR cuando mobile lo necesite.

### Datos de catálogo

El catálogo de departamentos (4 registros: `information-technology`, `management`, `box-office`, `veterinary`) **no** se carga por migración: lo inserta `DepartmentSeeder`, código backend idempotente por `code`.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `users.email`, `users.is_active`, `users.remember_token`, `users.two_factor_*`, `users.created_at`, `users.updated_at`, `users.deleted_at`, `users.created_by`, `users.updated_by` | agregar |
| clave foránea | `users.department_id` | CASCADE → RESTRICT |
| columna | `departments.code`, `departments.is_active`, `departments.created_at`, `departments.updated_at` | agregar |
| tabla | `permissions`, `roles`, `model_has_permissions`, `model_has_roles`, `role_has_permissions` | crear |
| tabla | `sessions` | crear |
| tabla | `cache`, `cache_locks` | crear |
| tabla | `activity_log` | crear |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
-- propuesta ilustrativa
ALTER TABLE users
  ADD COLUMN email VARCHAR(255) NOT NULL,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN remember_token VARCHAR(100) NULL,
  ADD COLUMN two_factor_secret TEXT NULL,
  ADD COLUMN two_factor_recovery_codes TEXT NULL,
  ADD COLUMN two_factor_confirmed_at TIMESTAMP NULL,
  ADD COLUMN created_at TIMESTAMP NULL,
  ADD COLUMN updated_at TIMESTAMP NULL,
  ADD COLUMN deleted_at TIMESTAMP NULL,
  ADD COLUMN created_by INT NULL,
  ADD COLUMN updated_by INT NULL,
  ADD UNIQUE KEY uk_users_email (email);

ALTER TABLE users
  DROP FOREIGN KEY fk_users_department_id,
  ADD CONSTRAINT fk_users_department_id
    FOREIGN KEY (department_id) REFERENCES departments (id)
    ON DELETE RESTRICT;

ALTER TABLE departments
  ADD COLUMN code VARCHAR(50) NOT NULL,
  ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN created_at TIMESTAMP NULL,
  ADD COLUMN updated_at TIMESTAMP NULL,
  ADD UNIQUE KEY uk_departments_code (code);
```

## Datos existentes y migración de datos

Las tablas están vacías: no se requiere backfill. Las columnas NOT NULL nuevas no tendrán filas previas que incumplan la restricción.

## Privacidad, auditoría y retención

- `users` contiene **datos personales** del personal: nombre, apellidos y correo institucional.
- Las contraseñas se almacenan con **bcrypt**; los secretos 2FA los cifra Fortify.
- `activity_log` registra eventos de acceso (correo, IP, user-agent), logout y activación de 2FA; **nunca** almacena contraseñas ni secretos.
- `users` usa **SoftDeletes**: las cuentas no se borran físicamente; `created_by`/`updated_by` dan trazabilidad de altas y cambios.

## Impacto, rendimiento y reversión

- ALTERs sobre tablas vacías y creación de tablas estándar de paquetes: sin riesgo de bloqueo.
- **Reversión:** el `down()` elimina las columnas agregadas, restaura la FK en CASCADE, y elimina las tablas nuevas (`permissions`, `roles`, pivots, `sessions`, `cache`, `cache_locks`, `activity_log`).
- Respaldo previo según la política de gobierno.

## Compatibilidad MySQL 8.0

Sin sintaxis fuera de MySQL 8.0.x ni extensiones propietarias.

## Objeto almacenado (si aplica)

No aplica.

## Orden de despliegue

- Se aplica **después** de DBR-001 (los nombres `users`, `departments`, `department_id` dependen del renombre).
- Se aplica en `arca_zoo` (desarrollo compartido) y se verifica en `arca_pruebas` (solo PHPUnit).
- El código consumidor (modelos, seeders, endpoints de autenticación) se implementa solo cuando esta DBR y DBR-001 estén en `Lista para backend`.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: pendiente
- Resultado y evidencia (sin secretos ni datos sensibles): pendiente
- Pruebas integradas del backend: pendiente

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Victor Adrian | | pendiente |
| Responsable backend | Jonathan | | pendiente |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
