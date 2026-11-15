# Roles y permisos

Los nombres de roles, permisos, recursos y acciones son identificadores en inglés. Los textos visibles y sus descripciones son en español. La autorización se aplica en la API con Policies y Spatie Permission; ocultar una opción en la interfaz no protege un endpoint.

## Roles

- `admin` — Administrador General (Presidencia); control total del sistema, incluida la administración de todas las cuentas. Requiere 2FA.
- `zoo-admin` — Administrador del Zoológico; administra noticias, eventos y recintos, y consulta boletos, cierres de caja, panel y reportes. No administra cuentas del personal desde el 2026-11-05 (decisión de Jonathan, aprobada en `api-007`). Revisa solicitudes de especie y momentos de visitantes. Requiere 2FA.
- `executive` — Altos Directivos; métricas y reportes de solo lectura.
- `cashier` — Cajero; operación de taquilla y cierre de caja.
- `veterinarian` — Médico Veterinario; expedientes y datos clínicos de ejemplares. Envía solicitudes de publicación o actualización de especies existentes desde la PWA y consulta sus solicitudes («Mis solicitudes»).
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
| `tickets.create` | Registrar venta de boletos | — | — | — | ✓ | — | — |
| `tickets.cancel` | Cancelar boletos propios del mismo día, con motivo | — | — | — | ✓ | — | — |
| `ticket-prices.manage` | Administrar precios de boletos (con 2FA) | ✓ | — | — | — | — | — |
| `cash-closings.view` | Consultar cierres de caja | ✓ | ✓ | — | ✓ | — | — |
| `cash-closings.create` | Crear cierre/arqueo de caja | ✓ | — | — | ✓ | — | — |
| `medical-records.view` | Consultar expedientes clínicos | ✓ | — | — | — | ✓ | — |
| `medical-records.create` | Crear expediente clínico | ✓ | — | — | — | ✓ | — |
| `medical-records.update` | Actualizar expediente clínico | ✓ | — | — | — | ✓ | — |
| `specimens.view` | Consultar ejemplares | ✓ | — | — | — | ✓ | — |
| `specimens.update` | Actualizar datos del ejemplar | ✓ | — | — | — | ✓ | — |
| `users.manage` | Administrar usuarios y permisos | ✓ | — | — | — | — | — |
| `news.manage` | Administrar noticias | ✓ | ✓ | — | — | — | — |
| `events.manage` | Administrar eventos | ✓ | ✓ | — | — | — | — |
| `enclosures.manage` | Administrar recintos | ✓ | ✓ | — | — | — | — |
| `species.review` | Revisar, editar, publicar, aceptar sin publicar o rechazar solicitudes de publicación de especies existentes; despublicar, republicar, editar una especie despublicada y eliminar la publicación (con 2FA). Un único permiso (decidido 2026-11-12). *Pendiente de implementar en el seeder (tarea futura T-SEED de `api-014`).* | — | ✓ | — | — | — | — |
| `memories.review` | Revisar y decidir momentos de visitantes (con 2FA). *Pendiente de implementar en el seeder. Cadena de momentos: `api-010` RN-07 y CA-16, `dashboard-008`; el cambio de seeder se comparte con la tarea T-SEED de `api-014`.* | — | ✓ | — | — | — | — |
| `public-content.view` | Consultar contenido público | ✓ | ✓ | ✓ | ✓ | ✓ | Público |

Cambios de `apps/api/specs/009-ticket-sales.md` vigentes desde su aprobación (Jonathan, 2026-11-02): `tickets.create` es solo de `cashier` (se retiró de `admin`); `tickets.cancel` es solo de `cashier`; `ticket-prices.manage` es solo de `admin`, con 2FA. `admin` y `zoo-admin` conservan `tickets.view` para consultar el historial en lectura. `RolesAndPermissionsSeeder` refleja esta matriz para los permisos de boletos (verificado el 2026-11-02); el retiro de `operational-staff.manage` (decisión del 2026-11-05) está pendiente de implementar.

`users.manage` permite administrar todas las cuentas y es el único permiso de gestión de cuentas desde el 2026-11-05 (decisión de Jonathan, aprobada en `api-007`). El permiso `operational-staff.manage` se retira del catálogo y del código, y ya no figura en esta matriz. Una fila de ese permiso que quede en `permissions` de bases existentes no tiene efecto, porque el seeder no borra. La gestión de cuentas desde el dashboard la expone `api-007` (`/api/v1/admin/users`, solo con `users.manage`). Hasta que se aplique `api-007` T-42, el seeder del código todavía contiene `operational-staff.manage`; esta matriz describe el estado objetivo.

### Permisos de solicitudes de especie (`dashboard-010`) y de momentos (`dashboard-008`) (2026-11-11)

- `species.review` (`api-014`) y `memories.review` (`api-010`) se crean con `Permission::findOrCreate` y se asignan **solo a `zoo-admin`**, con 2FA.
- El seeder da a `admin` todos los permisos de su arreglo salvo los de boletos. Por eso `admin` debe excluirse de `species.review` y de `memories.review` **de forma explícita** (`array_diff`), no por omisión (`api-014` RN-10 y CA-20; `api-010` RN-07 y CA-16). Presidencia no revisa estas solicitudes ni momentos.
- Estado: **pendiente de implementar en el seeder** (tarea futura T-SEED de `api-014`). La matriz describe el estado objetivo.
- Historial (2026-11-11): `species.review` cubre solicitudes de **publicación** de especies que ya existen en el catálogo (`api-014`), no la creación de especies. Las descripciones de la matriz se actualizan en consecuencia.
- **Envío de solicitudes de especie:** no tiene fila en la matriz. Lo autoriza el rol `veterinarian` (regla de rol de `pwa-005` RN-01 y `api-014` RN-01), no un permiso. Si el equipo decide convertirlo en permiso (por ejemplo, `species-publication-requests.create`), esta matriz se revisa (pregunta abierta en `api-014`, pregunta 6). El envío solo puede elegir una especie existente; no crea especies (`api-014` CA-29). El mismo rol consulta «Mis solicitudes» (`api-014` CA-33). Desde el 2026-11-12, el veterinario también puede enviar una actualización sobre una especie despublicada (`api-014` CA-27).

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
