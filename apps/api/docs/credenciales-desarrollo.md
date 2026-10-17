# Usuarios de prueba (demo staff) · `apps/api`

- **Fecha:** 2026-10-15
- **Responsable de base de datos:** Victor Adrian
- **Responsable de implementación (seeders):** equipo backend, dentro de `api-003`
- **Feature SDD relacionada:** `apps/api/specs/003-staff-authentication.md` (CA-14, CA-15, CA-18)
- **Estado:** Pendiente de implementar en `api-003` (los seeders aún no existen). Se ejecutarán solo en `arca_pruebas`.

---

## 1. Propósito

Este documento describe los usuarios de ejemplo que creará el seeder `DemoStaffSeeder`. Su único propósito es permitir al equipo probar el flujo de autenticación, el 2FA de los administradores, la redirección por rol y los permisos de Spatie, primero contra la API y después desde el dashboard.

> [!CAUTION]
> Este seeder **solo se ejecuta en `arca_pruebas`** o en una base local. `arca_zoo` es **producción**: nadie del equipo ni ningún agente la usa. El seeder aborta si el entorno es `production` o si la base activa es `arca_zoo`.
>
> **Nunca ejecutes `migrate:fresh` ni `migrate:fresh --seed`:** borraría `arca_pruebas`, que contiene el esquema aplicado por el responsable de BD y no se reconstruye. La API activa `DB::prohibitDestructiveCommands()` para impedirlo.

---

## 2. Usuarios creados

| Nombre | Email | Departamento | Rol | Destino (`home`) | 2FA |
|---|---|---|---|---|---|
| Presidencia | `presidencia@arca.local` | Presidencia (`presidency`) | `admin` | `administration` | Obligatorio |
| Admin Informática | `admin@arca.local` | Informática (`information-technology`) | `admin` | `administration` | Obligatorio |
| Dirección Zoo | `direccion_zoo@arca.local` | Dirección (`management`) | `zoo-admin` | `administration` | Obligatorio |
| Ejecutivo | `ejecutivo@arca.local` | Dirección (`management`) | `executive` | `executive` | No |
| Boletaje | `boletaje@arca.local` | Taquilla (`box-office`) | `cashier` | `ticket` | No |
| Veterinario | `veterinario@arca.local` | Servicios veterinarios (`veterinary`) | `veterinarian` | `pwa` + `pwa_url` (`PWA_URL` en `.env`) | No |

- `admin` es el administrador general (Presidencia) con control total; `zoo-admin` es el administrador del zoológico (ver `docs/03-roles-y-permisos.md`).
- Los administradores no configuran nada antes de entrar: en su primer inicio de sesión el dashboard les pide escanear un QR con una app autenticadora (Google Authenticator, Microsoft Authenticator, Authy…) y les muestra una sola vez sus códigos de recuperación.

> [!NOTE]
> La contraseña de prueba **no se versiona**. `DemoStaffSeeder` la lee de la variable `DEMO_STAFF_PASSWORD` de tu `.env` local y aborta si falta o si no cumple la política de contraseñas (mínimo 12 caracteres, mayúsculas, minúsculas, números y símbolos). El responsable de BD la comparte por un canal externo al repositorio.

---

## 3. Seeders involucrados

`DatabaseSeeder` invoca siempre los dos primeros y `DemoStaffSeeder` solo fuera de producción:

| Seeder | Archivo | Responsabilidad |
|---|---|---|
| `DepartmentSeeder` | `database/seeders/DepartmentSeeder.php` | Pobla idempotentemente los 5 departamentos base (incluido `presidency`). |
| `RolesAndPermissionsSeeder` | `database/seeders/RolesAndPermissionsSeeder.php` | Crea los 5 roles (`admin`, `zoo-admin`, `executive`, `cashier`, `veterinarian`) y sus permisos según `docs/03-roles-y-permisos.md`. |
| `DemoStaffSeeder` | `database/seeders/DemoStaffSeeder.php` | Crea o actualiza los 6 usuarios de prueba y les asigna departamento y rol. |

Todos son **idempotentes**: ejecutarlos más de una vez no genera duplicados (`updateOrCreate` + `syncRoles`/`syncPermissions`).

---

## 4. Cómo ejecutar

> [!IMPORTANT]
> Antes de ejecutar, verifica que tu `.env` apunte a `arca_pruebas` (o a tu base local) y que tenga `DEMO_STAFF_PASSWORD` definida.

```bash
# Sembrar áreas, roles y cuentas demo (el esquema ya existe en arca_pruebas)
php artisan db:seed

# Solo el seeder de demo (si ya corriste los demás)
php artisan db:seed --class=DemoStaffSeeder
```

Las cuentas reales se crean con `php artisan arca:create-staff` (también en `api-003`). El responsable de BD crea con él el primer `admin`, que después administrará las demás cuentas cuando exista la feature «Gestión de usuarios».

---

## 5. Verificación rápida

```bash
php artisan tinker
>>> $user = App\Models\User::where('email', 'presidencia@arca.local')->first();
>>> $user->getRoleNames();                     // ['admin']
>>> $user->hasPermissionTo('users.manage');    // true
>>> $user->department->code;                   // 'presidency'
>>> App\Models\User::where('email', 'direccion_zoo@arca.local')->first()->getRoleNames(); // ['zoo-admin']
```

---

## 6. Notas de gobernanza

- Estos seeders **no son migraciones** y no requieren DBR: no alteran el esquema, solo insertan datos de prueba.
- `php artisan arca:create-staff` es la herramienta para crear cuentas reales sin dejar credenciales en el repositorio.
- Si un administrador pierde su celular y también sus códigos de recuperación, por ahora lo resuelve el responsable de BD; el procedimiento formal queda para la feature «Gestión de usuarios».
- Esta documentación complementa el [inventario de BD inicial](./inventario-bd-inicial.md) y la spec `003-staff-authentication`.
- Ajustado el 2026-10-15 por decisión de Jonathan: `admin` para Presidencia, nuevo `zoo-admin`, área `presidency`, cuenta `ejecutivo@arca.local`, contraseña desde `.env` y retiro de `migrate:fresh`.
