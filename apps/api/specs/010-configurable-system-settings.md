# 010 · configurable-system-settings

- App dueña: `api`
- Apps/paquetes afectados: `api`, `dashboard` (sección «Ajustes», spec `apps/dashboard/specs/006-system-settings-section.md`), `packages/api-client`; documento de base de datos `docs/database/requests/DBR-009-system-settings.md`.
- Estado: Borrador. **Solo documentada: no aprobada, no planificada, sin plan ni tasks.** Revisión de referencia: propuesta de Jonathan (2026-11-06) para retomarla más adelante.
- Solicitante / responsable funcional: Jonathan
- Responsable de BD: Víctor Adrián (DBR-009, pendiente)
- Aprobación funcional: pendiente (no aprobada)

> **Cómo aplicar esta spec (qué falta).** Para implementarla hace falta, en este orden: (1) que Jonathan apruebe esta spec y la spec de dashboard `006`; (2) que Jonathan apruebe la DBR-009 con aprobación separada de BD y backend; (3) que el responsable de BD cree, pruebe y aplique la migración (no antes); (4) crear el plan (`/sdd-plan`) y las tasks (`/sdd-tasks`) con el mismo `NNN-slug`. Ninguno de esos pasos se ha dado. No hay plan ni tasks para esta spec.

## Problema y contexto

El tope de boletos por venta es de 50 en total (`api-009` CA-42, RN-29 de la revisión de boletos individuales, aprobada el 2026-11-06). Hoy su valor vive en `config/arca.php` (clave `ticket_sale_max_tickets`). Cambiarlo exige un despliegue. Jonathan quiere dejar documentada la opción de que Presidencia pueda editar ese máximo sin desplegar. Esta spec la describe; no se implementa.

## Objetivos

- Permitir que `admin` lea y actualice el máximo de boletos por venta sin desplegar.
- Mantener `config('arca.ticket_sale_max_tickets')` como respaldo y valor inicial.
- Registrar en auditoría el valor anterior y el nuevo.

## Fuera de alcance

- `report_pdf_max_tickets` (2000 boletos de PDF): se protege al servidor y no se edita desde la interfaz. Su cambio sigue siendo de configuración y despliegue.
- El «límite de tiempo» de una venta grande: no es un ajuste. La duración de la venta más grande (`api-009` CA-54) es una medición de prueba que se registra como evidencia; no se configura.
- Otros ajustes del sistema (límites de frecuencia, precios, zona horaria). Cada uno pedirá su propia revisión.
- Cambios en `apps/web`, `apps/pwa` y `apps/mobile`.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| `admin` (Presidencia) | Leer y cambiar el máximo de boletos por venta | Sesión válida + 2FA confirmado; `system-settings.manage` (nuevo, solo `admin`) |
| `zoo-admin`, `executive`, `cashier`, `veterinarian` | Sin acceso | — |

## Historias de usuario

- Como `admin`, quiero cambiar el máximo de boletos por venta sin esperar un despliegue, para responder a la demanda del día.
- Como `admin`, quiero ver el valor vigente y de dónde sale (guardado o de configuración), para no cambiar algo sin saberlo.

## Criterios de aceptación

- **CA-01 (propuesta):** Dado un usuario con `system-settings.manage` y 2FA confirmado, cuando llama `GET /api/v1/admin/system-settings`, entonces recibe la clave `ticket_sale_max_tickets` con su valor vigente, su origen (`stored` o `config`) y, si existe, la fecha y el actor del último cambio.
- **CA-02 (propuesta):** Dado un `admin` con el permiso y 2FA, cuando actualiza `ticket_sale_max_tickets` con un entero dentro del rango de RN-03, entonces responde 200, guarda el valor y la siguiente venta y la siguiente cotización (en cualquier proceso) usan el valor nuevo, sin desplegar.
- **CA-03 (propuesta):** Dado un valor fuera del rango de RN-03 o que no es un entero, cuando se envía, entonces responde 422 en español por campo y no cambia nada.
- **CA-04 (propuesta):** Dado un usuario sin `system-settings.manage`, cuando llama las rutas, entonces responde 403. Sin sesión responde 401. Un `admin` sin 2FA confirmado recibe 403 `two_factor_setup_required` y no cambia nada.
- **CA-05 (propuesta):** Dado un cambio guardado, cuando se registra, entonces Activitylog contiene actor, clave, valor anterior y valor nuevo, sin secretos.
- **CA-06 (propuesta):** Dado que no hay fila guardada para la clave, cuando se consulta el máximo, entonces se usa `config('arca.ticket_sale_max_tickets')` (50 en el valor inicial).
- **CA-07 (propuesta):** Dada una fila eliminada lógicamente (SoftDeletes), cuando se consulta el máximo, entonces no se usa y se aplica el valor de configuración. No hay borrado físico.
- **CA-08 (propuesta):** Dado un cambio, cuando la siguiente lectura ocurre en otro proceso, entonces no devuelve el valor anterior (invalidación de caché; ver riesgos).
- **CA-09 (propuesta):** Dado un intento de cambiar una clave distinta de `ticket_sale_max_tickets`, cuando se envía, entonces responde 404 «Ajuste no encontrado.» y no cambia nada.

## Reglas de negocio

- **RN-01 (propuesta):** Solo `admin` con `system-settings.manage` y 2FA confirmado cambia ajustes. El permiso se asigna solo a `admin` en `RolesAndPermissionsSeeder`; requiere resembrar por ambiente (ver riesgos).
- **RN-02 (propuesta):** El valor guardado en `system_settings` tiene prioridad sobre `config('arca.ticket_sale_max_tickets')`. Sin fila, se usa la configuración.
- **RN-03 (propuesta; rango no aprobado):** El rango propuesto es de 1 a 200 boletos. Es una propuesta del redactor, no una decisión aprobada: debe confirmarse antes de la aprobación.
- **RN-04 (propuesta):** Cada cambio guarda actor, valor anterior y valor nuevo (CA-05). Las filas no se borran físicamente (Constitución V).
- **RN-05 (propuesta):** Cambiar el ajuste no requiere despliegue. `config/arca.php` queda como valor inicial y respaldo; no se borra.
- **RN-06 (propuesta):** El cambio aplica a las ventas y cotizaciones posteriores. No modifica las ventas ya registradas (`api-009` RN-04 se mantiene).
- **RN-07 (propuesta):** La validación de rango la hace la API. El cliente solo muestra el mensaje (Constitución III).

## Diseño técnico propuesto

Esta sección describe lo que haría el plan si la spec se aprueba. No es decisión aprobada.

- **Tabla `system_settings`** (ver DBR-009): clave única en inglés (`setting_key`), valor (`value`), trazabilidad (`created_by`, `updated_by`), timestamps y SoftDeletes (Constitución V). El modelo `SystemSetting` extiende `BaseModel` según el criterio de Jonathan; ver contradicciones: `BaseModel` no existe hoy en el repositorio.
- **Permiso** `system-settings.manage`, solo para `admin`, en `RolesAndPermissionsSeeder`. Requiere resembrar en cada ambiente (ver riesgos).
- **Rutas** bajo `/api/v1/admin`: `GET system-settings` (`admin.system-settings.index`) y `PATCH system-settings/{key}` (`admin.system-settings.update`). Middleware: `auth:sanctum`, `staff.user`, `administrator.two-factor`, `permission:system-settings.manage`. Form Request → Action → Resource.
- **Action de lectura** `ResolveTicketSaleMaxTicketsAction`: lee el valor guardado (con caché) o usa `config('arca.ticket_sale_max_tickets')`. `RegisterTicketSaleRequest` y la cotización (`QuoteTicketSaleAction`) la usan para validar el máximo.
- **Actualización:** en transacción con bloqueo de la fila; registra el cambio en Activitylog (evento `system-setting-changed`, con valor anterior y nuevo); invalida la caché.
- **Caché:** clave única por ajuste. La invalidación solo es fiable si el driver de caché es compartido entre procesos (ver riesgos).

## Datos, privacidad y auditoría

- Dato de configuración, no personal ni financiero. Se trata como dato de negocio: SoftDeletes, `created_by`/`updated_by` y Activitylog (Constitución V).
- Requiere DBR: sí, **DBR-009** (`docs/database/requests/DBR-009-system-settings.md`, Borrador). La DBR acompaña a esta spec; no la sustituye.

## Flujos y errores

1. `admin` abre «Ajustes» (spec 006) → la API devuelve el valor y su origen (CA-01).
2. `admin` cambia el valor → la API valida rango (CA-03) → guarda y audita (CA-02, CA-05) → invalida caché.
3. Errores: 401 sin sesión; 403 sin permiso o sin 2FA; 404 clave desconocida (CA-09); 422 valor fuera de rango o no entero (CA-03).

## Dependencias, riesgos y preguntas

- **Dependencias:** `api-009` (RN-29 y CA-42: el tope de 50 boletos en total, que esta spec permitiría cambiar); `api-003` (2FA); `api-007` (roles y permisos); spec de dashboard `006-system-settings-section.md`; DBR-009.
- **Riesgos:**
  - **Permiso en producción sin procedimiento:** asignar `system-settings.manage` requiere resembrar `RolesAndPermissionsSeeder` en `arca_zoo`. No hay procedimiento documentado (`api-009` pregunta R6; tarea T-84 de esa lista, bloqueada).
  - **Tope elevado y rendimiento:** más boletos por venta significan más filas, más SVG y una respuesta mayor en una sola transacción. La evidencia de `api-009` CA-54 se mide con el tope actual (50). Subir el máximo debe revisarse con esa evidencia.
  - **Caché multiproceso:** si el driver no es compartido, la invalidación no alcanza a otros procesos y CA-08 falla.
  - **Cambio sin revisión:** un `admin` podría subir el tope sin control; por eso la auditoría (CA-05) y el rango (RN-03) son obligatorios.
- **Preguntas abiertas (para la aprobación):**
  1. ¿Se confirma el rango de 1 a 200 (RN-03), o se fija otro?
  2. ¿Qué driver de caché se usa en producción y pruebas? (Define CA-08.)
  3. ¿La unicidad de `setting_key` incluye las filas eliminadas lógicamente? (Ver DBR-009.)
  4. ¿Quién ejecuta el procedimiento de resiembra de permisos en producción? (`api-009` R6.)
  5. `BaseModel`: ver contradicciones en el informe del redactor; el repositorio no tiene la clase.

## Revisión

- Aprobadores y fecha: pendiente. No aprobada.
- Evidencia/enlaces: `apps/api/specs/009-ticket-sales.md` (RN-29, CA-42, CA-54), `apps/dashboard/specs/006-system-settings-section.md`, `docs/database/requests/DBR-009-system-settings.md`.
