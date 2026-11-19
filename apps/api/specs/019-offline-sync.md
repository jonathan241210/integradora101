# 019 · offline-sync

- App dueña: `api`
- Apps/paquetes afectados: `api`, `pwa`, `packages/api-client` (si aplica), `docs/database` (DBR)
- Estado: Aprobada
- Solicitante / responsable funcional: Solicitante (usuario)
- Aprobación funcional: Solicitante (usuario), 2026-11-18 (aprobación para implementación; DBR-020/021 atendidas/aplicadas en `arca_pruebas`)

## Problema y contexto

La PWA veterinaria requiere modo offline-first (`apps/pwa/specs/009-offline-first-sync.md`, Aprobada y reaprobada 2026-11-18): bootstrap de catálogos al login, consulta offline, registro/encolado de altas de animales sin foto y evaluaciones clínicas, sincronización automática/manual con prioridad animales→diagnósticos, delta incremental con bajas y idempotencia por UUID con confirmación individual.

La API actual expone endpoints staff para animales y evaluaciones (`/api/v1/staff/animals`, `/api/v1/staff/clinical-evaluations`) pero no provee contratos explícitos de bootstrap/delta, tombstones uniformes para sync, ni idempotencia por UUID de operación.

## Objetivos

- Proveer contratos API autenticados/autorizados para bootstrap y sincronización incremental (delta) de catálogos requeridos por `pwa-009`.
- Aceptar operaciones de sincronización idempotentes con UUID y devolver confirmación individual por operación.
- Exponer bajas (`deleted_at`/tombstone equivalente) en delta sin eliminar historial clínico.
- Mantener la API como fuente de verdad y autoridad de validación.

## Fuera de alcance

- Subida diferida de fotografías/adjuntos en sync offline MVP.
- Cambios de esquema sin DBR aprobada y migración aplicada por responsable de BD.
- Resolución automática de conflictos clínicos.

## Actores y permisos

| Actor/rol | Necesidad | Permisos requeridos |
|---|---|---|
| Personal veterinario autenticado (staff) | Descargar bootstrap/delta y sincronizar altas/evaluaciones pendientes | Sesión staff válida (Sanctum), `staff.user` y permisos vigentes para animales/evaluaciones/catálogos según políticas existentes |

## Historias de usuario

- Como cliente PWA offline, quiero obtener un snapshot inicial y cambios incrementales de catálogos, para operar en campo sin descargar todo en cada reconexión.
- Como cliente PWA offline, quiero enviar operaciones con UUID e idempotencia, para evitar duplicados ante reintentos.
- Como cliente PWA offline, quiero recibir confirmación individual por operación, para actualizar el estado local de cada registro.

## Criterios de aceptación

- **CA-01:** Dado un usuario staff autorizado, cuando solicita bootstrap de sync, entonces la API devuelve perfil/catálogos requeridos (animales, recintos y datos asociados definidos) con metadatos/cursor de sincronización.
- **CA-02:** Dado un cursor/`updated_since` válido, cuando solicita delta, entonces la API devuelve altas/modificaciones/bajas paginadas y ordenadas según permisos.
- **CA-03:** Dado un registro eliminado en entidades sincronizadas soportadas, cuando se consulta delta, entonces la API expone la baja (`deleted_at` o tombstone equivalente) sin exponer/eliminar historial clínico indebido.
- **CA-04:** Dada una operación de alta de animal sin foto con UUID, cuando se recibe por primera vez o se reintenta, entonces se crea una sola vez (o se reconoce duplicado idempotente) y se responde confirmación individual.
- **CA-05:** Dada una operación de evaluación clínica con UUID, cuando se recibe por primera vez o se reintenta, entonces se persiste una sola vez (o se reconoce duplicado idempotente) y se responde confirmación individual, aplicando validaciones de negocio existentes.
- **CA-06:** Dado un error de validación/permisos/conflicto no temporal, cuando se procesa una operación, entonces la API responde error claro en español en la confirmación individual sin crear duplicados.
- **CA-07:** Dadas operaciones con dependencia (diagnóstico dependiente de animal local), cuando se sincronizan, entonces el contrato permite resolver/referenciar el identificador servidor del padre confirmado.
- **CA-08:** Existe al menos una prueba automatizada por CA aplicable.

## Reglas de negocio

- **RN-01:** La API es fuente de verdad y valida toda operación sincronizada.
- **RN-02:** Idempotencia obligatoria por UUID de operación/registro cliente; sin duplicados en reintentos.
- **RN-03:** Delta debe soportar paginación y orden estable; tombstones/bajas no eliminan historial clínico.
- **RN-04:** Errores no temporales se reportan por operación con mensajes en español; no deben tener efectos duplicados.
- **RN-05:** Cambios de esquema solo por DBR aprobada y migración del responsable de BD.

## Datos, privacidad y auditoría

- Requiere DBR para idempotencia/unicidad UUID y soporte de delta/bajas/timestamps según verificación de esquema (`DBR-020`, `DBR-021`).
- Datos clínicos con SoftDeletes/auditoría vigente; sin borrado físico.

## Flujos y errores

1. Bootstrap inicial → snapshot + cursor.
2. Delta incremental → cambios paginados + bajas.
3. Sync de operaciones → confirmaciones individuales (éxito, duplicado, error).
4. Errores: 401/403, 422 validación, 409/conflicto, 5xx/timeout (temporales).

## Dependencias, riesgos y preguntas

- Dependencias: `pwa-009`, ADR 0003 aceptado, `DBR-020`, `DBR-021`.
- Riesgos: ausencia de `deleted_at` en animales/recintos, diseño de almacenamiento de UUID, compatibilidad con clientes actuales.
- Preguntas: formato exacto de cursor/tombstone, endpoint único vs por entidad, estrategia de confirmación parcial por lote.

## Revisión

- Aprobadores y fecha: Pendiente
- Evidencia/enlaces: `apps/pwa/specs/009-offline-first-sync.md`, `apps/pwa/plan/009-offline-first-sync.md`, rutas/controladores staff actuales.