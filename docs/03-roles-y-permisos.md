# Roles y permisos

Los nombres de roles, permisos, recursos y acciones son identificadores en inglés. Los textos visibles y sus descripciones son en español. La autorización se aplica en la API con Policies y Spatie Permission; ocultar una opción en la interfaz no protege un endpoint.

## Roles

- `admin` — Administrador General (Presidencia); control total del sistema, incluida la administración de todas las cuentas. Requiere 2FA.
- `zoo-admin` — Administrador del Zoológico; administra noticias, eventos, recintos y las cuentas de taquilla y veterinaria, y consulta boletos, cierres de caja, panel y reportes. Requiere 2FA.
- `executive` — Altos Directivos; métricas y reportes de solo lectura.
- `cashier` — Cajero; operación de taquilla y cierre de caja.
- `veterinarian` — Médico Veterinario; expedientes y datos clínicos de ejemplares.
- **Visitante anónimo** — consulta de contenido institucional y pedagógico público; no requiere una cuenta interna ni un rol asignado.

El 2FA obligatorio se configura en la API (`config('arca.two_factor_roles')` = `['admin', 'zoo-admin']`, `api-003`). El destino (`home`) por rol es: `admin` y `zoo-admin` → `administration`, `executive` → `executive`, `cashier` → `ticket`, `veterinarian` → `pwa`.

## Convención

Cada permiso usa `<resource>.<action>` en inglés, por ejemplo `tickets.create` o `medical-records.view`. Debe ser específico, asignarse según mínimo privilegio y comprobarse en el servidor. Acciones habituales: `view`, `create`, `update`, `delete`, `manage`; `manage` se reserva para administración completa del recurso. Datos financieros y clínicos no se eliminan físicamente: cualquier baja usa SoftDeletes y conserva auditoría.

## Matriz inicial

✓ indica permiso inicial; — indica que no se otorga por defecto. El rol `admin` puede administrar las capacidades privadas aquí enumeradas. La matriz deberá ampliarse mediante una spec aprobada al introducir nuevos recursos.

| Permiso | Etiqueta en español | `admin` | `zoo-admin` | `executive` | `cashier` | `veterinarian` | Anónimo |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | Ver panel ejecutivo | ✓ | ✓ | ✓ | — | — | — |
| `reports.view` | Ver reportes ejecutivos | ✓ | ✓ | ✓ | — | — | — |
| `tickets.view` | Consultar boletos | ✓ | ✓ | — | ✓ | — | — |
| `tickets.create` | Registrar venta de boletos | ✓ | — | — | ✓ | — | — |
| `cash-closings.view` | Consultar cierres de caja | ✓ | ✓ | — | ✓ | — | — |
| `cash-closings.create` | Crear cierre/arqueo de caja | ✓ | — | — | ✓ | — | — |
| `medical-records.view` | Consultar expedientes clínicos | ✓ | — | — | — | ✓ | — |
| `medical-records.create` | Crear expediente clínico | ✓ | — | — | — | ✓ | — |
| `medical-records.update` | Actualizar expediente clínico | ✓ | — | — | — | ✓ | — |
| `specimens.view` | Consultar ejemplares | ✓ | — | — | — | ✓ | — |
| `specimens.update` | Actualizar datos del ejemplar | ✓ | — | — | — | ✓ | — |
| `users.manage` | Administrar usuarios y permisos | ✓ | — | — | — | — | — |
| `operational-staff.manage` | Administrar cuentas de taquilla y veterinaria | ✓ | ✓ | — | — | — | — |
| `news.manage` | Administrar noticias | ✓ | ✓ | — | — | — | — |
| `events.manage` | Administrar eventos | ✓ | ✓ | — | — | — | — |
| `enclosures.manage` | Administrar recintos | ✓ | ✓ | — | — | — | — |
| `public-content.view` | Consultar contenido público | ✓ | ✓ | ✓ | ✓ | ✓ | Público |

`users.manage` permite administrar todas las cuentas; `operational-staff.manage` solo las de `cashier` y `veterinarian`. La gestión de cuentas desde el dashboard la expone `api-007` (`/api/v1/admin/users`, con alcance por rol según `users.manage` y `operational-staff.manage`); `api-003` solo siembra estos permisos.

La lista no sustituye Policies por registro ni restricciones de datos sensibles. El acceso de visitantes se limita a contenido marcado explícitamente como público; no se le asigna `public-content.view` como permiso de cuenta.

## Áreas y roles

`departments` (antes `areas`; DBR-001/DBR-002) es el catálogo de áreas del personal. Cada área tiene un `code` estable en inglés, un `name` visible en español y un **rol sugerido** que solo se propone al crear la cuenta (editable en `arca:create-staff`):

| code | name (UI) | Rol sugerido |
|---|---|---|
| `presidency` | Presidencia | `admin` |
| `information-technology` | Informática | `admin` |
| `management` | Dirección | `zoo-admin` |
| `box-office` | Taquilla | `cashier` |
| `veterinary` | Servicios veterinarios | `veterinarian` |

`executive` no tiene área sugerida: se elige manualmente al crear la cuenta. El área **no otorga acceso**: solo organiza al personal para reportes, filtros y auditoría. La autorización la dan exclusivamente los roles y permisos de esta matriz, verificados en el servidor.

## Visitantes con cuenta

Los visitantes de la app móvil que crean cuenta (`api-004`, ADR 0011) **no** reciben roles de Spatie ni permisos de esta matriz: su sesión usa tokens Sanctum con ability `visitor`, aislada de la sesión del personal. Para el contenido público siguen siendo equivalentes a un visitante anónimo; su cuenta solo habilita el progreso personal (colección, puntos, logros y misiones) en los endpoints `/api/v1/visitor/*`.
