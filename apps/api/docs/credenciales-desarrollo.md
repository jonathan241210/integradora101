# Usuarios de prueba (demo staff) · `apps/api`

- **Fecha:** 2026-10-15
- **Responsable de base de datos:** Victor Adrian
- **Responsable de implementación (seeders):** Victor Adrian
- **Feature SDD relacionada:** `apps/api/specs/003-staff-authentication.md` (CA-14, CA-15)
- **Estado:** Activo en `arca_pruebas`; pendiente de confirmar en `arca_zoo`

---

## 1. Propósito

Este documento describe los usuarios de ejemplo creados por el seeder `DemoStaffSeeder`. Su único propósito es permitir al equipo de backend (Jonathan) probar el flujo de autenticación, la redirección por rol y los permisos de Spatie **antes** de que exista la interfaz del dashboard.

> [!CAUTION]
> Este seeder **solo debe ejecutarse en entornos de desarrollo o en `arca_pruebas`** (nunca en producción). El seeder incluye una guarda explícita que aborta si el entorno es `production`. Nunca ejecutes `migrate:fresh --seed` apuntando a `arca_zoo` sin confirmación del equipo: borraría el esquema de desarrollo compartido.

---

## 2. Usuarios creados

| Nombre | Email | Departamento | Rol | Destino (`home`) |
|---|---|---|---|---|
| Admin Informática | `admin@arca.local` | Informática (`information-technology`) | `admin` | `/administration` + requiere 2FA |
| Presidencia | `presidencia@arca.local` | Dirección (`management`) | `executive` | `/executive` |
| Dirección Zoo | `direccion_zoo@arca.local` | Dirección (`management`) | `executive` | `/executive` |
| Boletaje | `boletaje@arca.local` | Taquilla (`box-office`) | `cashier` | `/ticket` |
| Veterinario | `veterinario@arca.local` | Servicios veterinarios (`veterinary`) | `veterinarian` | PWA (`PWA_URL` en `.env`) |

> [!NOTE]
> La contraseña de prueba **no se documenta aquí** por seguridad, aunque esté en texto plano en el seeder (que es código de desarrollo, no producción). Consúltala con el responsable de BD o revísala directamente en `DemoStaffSeeder.php`.

---

## 3. Seeders involucrados

Los tres seeders se invocan en cascada desde `DatabaseSeeder`:

| Seeder | Archivo | Responsabilidad |
|---|---|---|
| `DepartmentSeeder` | `database/seeders/DepartmentSeeder.php` | Pobla idempotentemente los 4 departamentos base. |
| `RolesAndPermissionsSeeder` | `database/seeders/RolesAndPermissionsSeeder.php` | Crea permisos y roles según `docs/03-roles-y-permisos.md`. |
| `DemoStaffSeeder` | `database/seeders/DemoStaffSeeder.php` | Crea los 5 usuarios de prueba, les asigna departamento y rol. |

Todos son **idempotentes**: ejecutarlos más de una vez no genera duplicados (`updateOrCreate` + `syncRoles`).

---

## 4. Cómo ejecutar

> [!IMPORTANT]
> Antes de ejecutar, verifica que tu `.env` apunte a `arca_pruebas` o a tu base local, **no a `arca_zoo`**.

```bash
# Regenerar arca_pruebas desde cero y sembrar (para PHPUnit o pruebas locales)
php artisan migrate:fresh --seed

# Solo sembrar sin rehacer migraciones (si ya existe el esquema)
php artisan db:seed

# Solo el seeder de demo (si ya corriste los demás)
php artisan db:seed --class=DemoStaffSeeder
```

---

## 5. Verificación rápida

```bash
php artisan tinker
>>> $user = App\Models\User::where('email', 'admin@arca.local')->first();
>>> $user->getRoleNames();         // ['admin']
>>> $user->hasPermissionTo('users.manage');  // true
>>> $user->department->code;       // 'information-technology'
```

---

## 6. Notas de gobernanza

- Estos seeders **no son migraciones** y no requieren DBR: no alteran el esquema, solo insertan datos de prueba.
- El comando `php artisan arca:create-staff` (pendiente de implementación en la feature `api-003`) será la herramienta definitiva para crear cuentas reales en producción sin dejar credenciales en el repositorio.
- Esta documentación complementa el [inventario de BD inicial](./inventario-bd-inicial.md) y la spec `003-staff-authentication`.
