# Roles y permisos

Los nombres de roles, permisos, recursos y acciones son identificadores en inglés. Los textos visibles y sus descripciones son en español. La autorización se aplica en la API con Policies y Spatie Permission; ocultar una opción en la interfaz no protege un endpoint.

> **Estado de esta versión.** Recoge los roles y permisos finales aprobados por Jonathan el 2026-11-20 (`api-021`, `api-022`, `api-023`). **Entra en vigor al implementarse `api-021`, `api-022` y `api-023`.** Hasta entonces, la matriz describe el estado objetivo y la base puede seguir con el estado anterior.

## Roles

Cada cuenta de personal tiene exactamente un rol (`api-023` RN-01). No hay roles ni permisos creados desde la interfaz.

- `admin` — Administrador general (Presidencia e Informática). Control total de la administración y de los permisos de la matriz. Gestiona las cuentas **no admin** desde la administración (`users.manage`). Las cuentas `admin` **solo se gestionan desde la consola del servidor** (`arca:admin:*`): no se crean, promueven, editan, desactivan, eliminan ni restablecen desde la API ni el dashboard. Ve el reporte de cancelaciones (`reports.cancellations.view`). Requiere 2FA.
- `zoo-admin` — Administrador del Zoológico (Dirección). Administra noticias, eventos y recintos; consulta boletos de todos los cajeros, cierres de caja, panel y reportes de boletos; revisa solicitudes de especie y momentos de visitantes. No administra cuentas del personal (desde el 2026-11-05, `api-007`). No ve el reporte de cancelaciones. Requiere 2FA.
- `executive` — **Consulta directiva**. Panel y reporte de boletos en solo lectura. Código conservado; solo cambia la etiqueta (`api-023` RN-04). Requiere 2FA.
- `communications` — **Comunicación**. Publica noticias, eventos, momentos y TulanPedia (solicitudes de especie). Sin panel, sin reportes y sin cuentas. Pantalla de inicio: Noticias. Requiere 2FA.
- `cashier` — Cajero; venta de boletos, cancelación de boletos propios del mismo día con motivo, historial propio y cierre de caja. Requiere 2FA (obligatorio desde el despliegue de `api-021`).
- `veterinarian` — Médico Veterinario; expedientes y datos clínicos de ejemplares. Envía solicitudes de publicación o actualización de especies existentes desde la PWA y consulta sus solicitudes («Mis solicitudes»). **No usa 2FA** (trabajo de campo offline).
- **Visitante anónimo** — consulta de contenido institucional y pedagógico público; no requiere una cuenta interna ni un rol asignado.

### Segundo factor (2FA)

Exigen 2FA confirmado: `admin`, `zoo-admin`, `cashier`, `executive` y `communications` (`config('arca.two_factor_roles')`, `api-021` RN-09 y `api-023` RN-05). `veterinarian` no usa 2FA. Una cuenta de un rol obligado sin 2FA confirmado recibe 403 `two_factor_setup_required` en las rutas protegidas, salvo `me`, `logout` y el enrolamiento.

### Inicio por permiso

El destino (`home`) se decide por permiso, no por nombre de rol (`api-023` RN-03), en este orden: `users.manage` o `enclosures.manage` → `administration`; `dashboard.view` → `executive`; `tickets.create` → `ticket`; `medical-records.view` → `pwa` (con `pwa_url`); cualquier otro caso de personal sin inicio propio (p. ej. `communications`) → `administration` con la sección de inicio Noticias.

### Confirmación de contraseña

Las operaciones sensibles piden la contraseña de quien opera (`api-021`): modo Siempre (la contraseña viaja con cada operación) o modo Ventana (una confirmación vale 10 minutos en la sesión que confirmó). El detalle de qué operación pide qué modo está en `api-021`.

## Convención

Cada permiso usa `<resource>.<action>` en inglés, por ejemplo `tickets.create` o `medical-records.view`. Debe ser específico, asignarse según mínimo privilegio y comprobarse en el servidor. Acciones habituales: `view`, `create`, `update`, `delete`, `manage`; `manage` se reserva para administración completa del recurso. Datos financieros y clínicos no se eliminan físicamente: cualquier baja usa SoftDeletes y conserva auditoría.

## Matriz

✓ indica permiso del rol; — indica que no se otorga. La matriz deberá ampliarse mediante una spec aprobada al introducir nuevos recursos.

| Permiso | Etiqueta en español | `admin` | `zoo-admin` | `executive` | `communications` | `cashier` | `veterinarian` | Anónimo |
|---|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `dashboard.view` | Ver panel ejecutivo | ✓ | ✓ | ✓ | — | — | — | — |
| `reports.view` | Ver reportes de boletos | ✓ | ✓ | ✓ | — | — | — | — |
| `reports.cancellations.view` | Ver reporte de cancelaciones, con conciliación y exportación (`api-022`). No se reutiliza `reports.view` | ✓ | — | — | — | — | — | — |
| `tickets.view` | Consultar boletos (historial propio o, con `tickets.view-all`, de todos) | ✓ | ✓ | — | — | ✓ | — | — |
| `tickets.view-all` | Consultar el historial de boletos de todos los cajeros (`api-023` CA-08). Sustituye la decisión por nombre de rol | ✓ | ✓ | — | — | — | — | — |
| `tickets.create` | Registrar venta de boletos | — | — | — | — | ✓ | — | — |
| `tickets.cancel` | Cancelar boletos propios del mismo día, con motivo y confirmación de contraseña (`api-021`, `api-022`) | — | — | — | — | ✓ | — | — |
| `ticket-prices.manage` | Administrar precios de boletos (con 2FA y contraseña, modo Siempre) | ✓ | — | — | — | — | — | — |
| `cash-closings.view` | Consultar cierres de caja | ✓ | ✓ | — | — | ✓ | — | — |
| `cash-closings.create` | Crear cierre/arqueo de caja | ✓ | — | — | — | ✓ | — | — |
| `medical-records.view` | Consultar expedientes clínicos | ✓ | — | — | — | — | ✓ | — |
| `medical-records.create` | Crear expediente clínico | ✓ | — | — | — | — | ✓ | — |
| `medical-records.update` | Actualizar expediente clínico | ✓ | — | — | — | — | ✓ | — |
| `specimens.view` | Consultar ejemplares | ✓ | — | — | — | — | ✓ | — |
| `specimens.update` | Actualizar datos del ejemplar | ✓ | — | — | — | — | ✓ | — |
| `users.manage` | Administrar cuentas **no admin** desde la administración. Las cuentas `admin` solo se gestionan desde la consola | ✓ | — | — | — | — | — | — |
| `news.manage` | Administrar noticias | ✓ | ✓ | — | ✓ | — | — | — |
| `events.manage` | Administrar eventos | ✓ | ✓ | — | ✓ | — | — | — |
| `enclosures.manage` | Administrar recintos (regenerar QR y eliminar con contraseña en modo Ventana, `api-021`) | ✓ | ✓ | — | — | — | — | — |
| `species.review` | Revisar, editar, publicar, aceptar sin publicar o rechazar solicitudes de publicación de especies existentes; despublicar, republicar y eliminar la publicación (con 2FA). Un único permiso (decidido 2026-11-12). Cola de pendientes: `api-024` | — | ✓ | — | ✓ | — | — | — |
| `memories.review` | Revisar y decidir momentos de visitantes (con 2FA). Cadena de momentos: `api-010` RN-07 y CA-16, `dashboard-008`. Cola de pendientes: `api-024` | — | ✓ | — | ✓ | — | — | — |
| `public-content.view` | Consultar contenido público | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Público |

Notas de la matriz:

- `operational-staff.manage` queda **sin efecto** (decisión de 2026-11-20, `api-023` H-01). Una fila de ese permiso que quede en `permissions` de bases existentes no tiene efecto; su limpieza es un cambio de datos aparte.
- El permiso `species.review` y `memories.review` se crean con `Permission::findOrCreate`. El seeder da a `admin` todos los permisos de su arreglo salvo los de boletos, así que `admin` se excluye de `species.review` y `memories.review` de forma explícita.
- `tickets.create` y `tickets.cancel` son solo de `cashier`; `ticket-prices.manage` es solo de `admin`, con 2FA (`api-009`).

### Permisos de solicitudes de especie (`dashboard-010`) y de momentos (`dashboard-008`)

- `species.review` (`api-014`) y `memories.review` (`api-010`) se asignan a `zoo-admin` y a `communications`, con 2FA. Presidencia no revisa estas solicitudes ni momentos.
- **Envío de solicitudes de especie:** no tiene fila en la matriz. Lo autoriza el rol `veterinarian` (regla de rol de `pwa-005` RN-01 y `api-014` RN-01), no un permiso. El envío solo puede elegir una especie existente; no crea especies (`api-014` CA-29). El mismo rol consulta «Mis solicitudes» (`api-014` CA-33). El veterinario también puede enviar una actualización sobre una especie despublicada (`api-014` CA-27).

La lista no sustituye Policies por registro ni restricciones de datos sensibles. El acceso de visitantes se limita a contenido marcado explícitamente como público; no se le asigna `public-content.view` como permiso de cuenta.

## Áreas y roles

`departments` (antes `areas`; DBR-001/DBR-002) es el catálogo de áreas del personal. Cada área tiene un `code` estable en inglés, un `name` visible en español y un **rol sugerido** que solo se propone al crear la cuenta (editable en `arca:create-staff`):

| code | name (UI) | Rol sugerido |
|---|---|---|
| `presidency` | Presidencia | `executive` (Consulta directiva) |
| `information-technology` | Informática | `executive` (Consulta directiva) |
| `management` | Dirección | `zoo-admin` |
| `box-office` | Taquilla | `cashier` |
| `veterinary` | Servicios veterinarios | `veterinarian` |

La sugerencia nunca es `admin`: las cuentas `admin` se crean solo desde la consola (`api-023` CA-09, RN-06). `executive` y `communications` no tienen área sugerida: se eligen manualmente al crear la cuenta. El área **no otorga acceso**: solo organiza al personal para reportes, filtros y auditoría. La autorización la dan exclusivamente los roles y permisos de esta matriz, verificados en el servidor.

## Visitantes con cuenta

Los visitantes de la app móvil que crean cuenta (`api-004`, ADR 0011) **no** reciben roles de Spatie ni permisos de esta matriz: su sesión usa tokens Sanctum con ability `visitor`, aislada de la sesión del personal. Para el contenido público siguen siendo equivalentes a un visitante anónimo; su cuenta solo habilita el progreso personal (colección, puntos, logros y misiones) en los endpoints `/api/v1/visitor/*`.
