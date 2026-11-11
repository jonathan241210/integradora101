# DBR-009 · system-settings

- Estado: Borrador (sin aprobar; no existe migración ni SQL ejecutable)
- Feature/spec origen: `apps/api/specs/010-configurable-system-settings.md` (Borrador; también `apps/dashboard/specs/006-system-settings-section.md`)
- Solicitante: Jonathan (responsable funcional)
- Responsable de BD: Víctor Adrián (pendiente de confirmar)
- Responsable backend: Jonathan
- Fecha: 2026-11-06

## Problema y justificación

El tope de boletos por venta (`ticket_sale_max_tickets`, 50 en total, `api-009` RN-29) vive en `config/arca.php`. Cambiarlo exige desplegar. La spec 010 propone que `admin` lo cambie sin desplegar, para lo que hace falta un lugar persistente y auditable donde guardar el valor. Esta DBR describe esa necesidad. No se aprueba ni se aplica con esta versión.

## Estado actual

No existe tabla de ajustes del sistema (`system_settings` no existe). El valor vive en `config/arca.php`.

## Contrato solicitado

- Una fila por ajuste. Hoy solo un ajuste: `ticket_sale_max_tickets`.
- Clave única en inglés (`setting_key`).
- Valor (`value`) como texto corto (VARCHAR); la API valida el tipo y el rango por clave.
- Trazabilidad: `created_by` y `updated_by` como claves a `users`, anulables.
- Timestamps y borrado lógico (SoftDeletes), según Constitución V.
- Orden de respuesta: por `setting_key`.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla | `system_settings` | Nueva |
| columna | `setting_key` | VARCHAR, NOT NULL, única (la unicidad frente a filas eliminadas lógicamente queda como pregunta) |
| columna | `value` | VARCHAR(255), NOT NULL |
| columna | `created_by`, `updated_by` | BIGINT UNSIGNED, NULL, claves a `users` |
| columnas | `created_at`, `updated_at`, `deleted_at` | Timestamps y SoftDeletes |
| índice | único sobre `setting_key` | Nuevo (ver pregunta en la spec 010) |

## SQL de referencia (MySQL 8.0)

No aplica en esta DBR. Esta solicitud no incluye SQL ni migración. El responsable de BD redacta la migración Laravel tras la aprobación, la prueba en una base MySQL 8.0 aislada y documenta la evidencia.

## Datos existentes y migración de datos

La tabla es nueva: no hay datos previos. No se inserta el valor inicial en la migración: la API usa `config('arca.ticket_sale_max_tickets')` cuando no hay fila (RN-02 de la spec 010).

## Privacidad, auditoría y retención

- Clasificación: configuración del sistema. No contiene datos personales de visitantes ni datos financieros.
- SoftDeletes: sí. `created_by`/`updated_by`: sí. Activitylog: sí, en la aplicación (evento `system-setting-changed`), no en la tabla.
- Retención: las filas no se borran físicamente.

## Impacto, rendimiento y reversión

- Tabla pequeña (una fila por ajuste). Sin bloqueos previsibles.
- Reversión: la migración `down()` elimina la tabla. Antes de aplicar en un ambiente con datos, respaldo previo.

## Compatibilidad MySQL 8.0

Tipos y sintaxis estándar (VARCHAR, BIGINT UNSIGNED, timestamps, índice único). Sin extensiones propietarias ni funciones.

## Objeto almacenado (si aplica)

No aplica. No se crean funciones, procedimientos, vistas ni triggers.

## Orden de despliegue

1. Aprobación de la spec 010 y de esta DBR.
2. Migración del responsable de BD en `arca_pruebas`, luego en staging y producción.
3. Resembrar `RolesAndPermissionsSeeder` para el permiso `system-settings.manage` (ver riesgo de producción en la spec 010).
4. Despliegue del código consumidor (Action, rutas y sección de ajustes). Antes de la migración, el código no debe activarse.

## Pruebas y evidencia

- Pruebas de esquema/objeto ejecutadas por BD en base MySQL 8.0 aislada: pendiente (no aplica hasta la migración).
- Resultado y evidencia (sin secretos ni datos sensibles): pendiente.
- Pruebas integradas del backend: pendiente.

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Víctor Adrián (pendiente de confirmar) | | Pendiente |
| Responsable backend | Jonathan | | Pendiente |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas | pendiente | | |
| staging | pendiente | | |
| producción | pendiente | | |
