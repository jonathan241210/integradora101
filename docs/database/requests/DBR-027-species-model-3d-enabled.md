# DBR-027 · Activación/desactivación de modelo 3D de especie (`model_3d_enabled`)

- Estado: Aplicada en arca_pruebas (confirmada por usuario; verificación de solo lectura: `Schema::hasColumn('species','model_3d_enabled') === true`, 2026-11-25). Staging y producción: pendiente.
- Feature/spec origen: `apps/api/specs/032-admin-species-model-3d.md` (extensión toggle), `apps/dashboard/specs/022-species-model-3d.md`
- Solicitante: Usuario / sesión actual
- Responsable de BD: Pendiente asignación
- Responsable backend: Pendiente asignación
- Fecha: 2026-11-25

## Problema y justificación

El admin necesita poder activar o desactivar la visualización del modelo 3D de una especie desde el dashboard, sin eliminar el archivo `.glb` ni la ruta `model_3d_path`. Hoy solo existe `species.model_3d_path`; no hay forma persistente de distinguir "modelo desactivado por admin" de "sin modelo". La auto-detección (api-032) reasigna el modelo al aceptar si encuentra el archivo, por lo que poner `model_3d_path` en NULL no es suficiente.

## Estado actual

Consultado sobre la base viva `arca_pruebas`, en solo lectura, por sesión de agente (2026-11-25). No se ejecutó ningún `ALTER`, `INSERT`, `UPDATE`, `DELETE` ni migración.

- Comando: `php artisan db:table species --json` (desde `apps/api/src`).
- `species` tiene 20 columnas; incluye `model_3d_path varchar(255) NULL utf8mb4_unicode_ci`. **No existe** `model_3d_enabled` ni columna equivalente.
- Migraciones/documentación: `model_3d_path` existe en el esquema actual; no hay DBR previa para habilitación/deshabilitación de modelo 3D.

## Contrato solicitado

| Tabla | Columna | Tipo MySQL 8.0 | Nulo | Default | Uso |
|---|---|---|---|---|---|
| `species` | `model_3d_enabled` | `TINYINT(1)` | NOT NULL | `1` | Indica si el modelo 3D de la especie puede mostrarse/considerarse activo. `1` = activo, `0` = desactivado por admin. |

Comportamiento esperado por API:
- Si `model_3d_enabled = 0`, el portal público no expone `model_3d_url` aunque exista `model_3d_path`.
- La auto-detección admin puede seguir reportando el archivo detectado, pero no debe reactivar automáticamente un modelo desactivado por admin salvo acción explícita.
- El toggle solo aplica cuando existe modelo asignado/detectado.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| tabla (existente) | `species` | añadir `model_3d_enabled` `TINYINT(1)` NOT NULL DEFAULT 1 |
| índice | — | sin cambio |
| FK | — | sin cambio |
| Objeto almacenado | — | ninguno |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada por el responsable de BD.

```sql
-- propuesta ilustrativa, no ejecutar
ALTER TABLE species
    ADD COLUMN model_3d_enabled TINYINT(1) NOT NULL DEFAULT 1
    AFTER model_3d_path;
```

## Datos existentes y migración de datos

- Todas las filas existentes quedan con `model_3d_enabled = 1`. No hay backfill complejo.
- Especies con `model_3d_path` válido siguen mostrando modelo 3D como hoy.
- Especies sin modelo no cambian.

## Privacidad, auditoría y retención

- **Clasificación:** configuración de contenido público de la especie. No es clínico, financiero ni personal.
- **Auditoría:** el cambio de activación/desactivación debe registrarse por Activitylog desde la Action correspondiente (extensión api-032).
- **SoftDeletes:** ninguno nuevo; `species` ya usa soft deletes.
- **Retención:** sigue la vida de la fila en `species`.

## Impacto, rendimiento y reversión

- **Tabla:** `species` pequeña (catálogo). `ALTER` trivial.
- **Bloqueos:** cortos; ejecutar fuera de horario de uso.
- **Índices:** ninguno.
- **Despliegue:** cambio expansivo. Código que lee columna debe tolerar despliegue ordenado: DBR aplicada -> API/dashboard.
- **Reversión (`down()`):** elimina la columna; se pierde el estado desactivado y todos los modelos vuelven a comportamiento por defecto activo. Requiere respaldo previo.

## Compatibilidad MySQL 8.0 y portabilidad (Aiven y local)

- `TINYINT(1) NOT NULL DEFAULT 1` estándar en MySQL 8.0, portable Aiven/local.
- Sin objetos almacenados, vistas, triggers ni extensiones propietarias.
- Migración idempotente con `Schema::hasColumn`.

## Objeto almacenado (si aplica)

No aplica.

## Verificaciones para BD

1. Confirmar que `model_3d_enabled` no existe en `species` antes de migrar.
2. Confirmar ubicación de columna (`AFTER model_3d_path`) opcional; no funcionalmente requerida.
3. Verificar `down()` en MySQL 8.0 aislado.
4. Confirmar que no hay triggers/objetos dependientes afectados.

## Plan de ejecución

### Fase 0: cierre documental
- [ ] Revisión BD/backend.
- [x] Consulta de solo lectura del esquema vivo (`db:table species --json`, 2026-11-25).
- [ ] Aprobación de DBR.

### Fase 1: migración de esquema (responsable de BD)
- [x] Migración aplicada en `arca_pruebas` (confirmada por usuario, 2026-11-25).
- [ ] Evidencia formal de BD / verificación en MySQL 8.0 aislado pendiente de registrar.
- [x] `Lista para backend` (implícita para integración local; pendiente formalización si BD lo requiere).

### Fase 2: backend/dashboard
- [x] Integrar toggle en API/dashboard (código implementado en sesión; depende de columna aplicada).

## Pruebas y evidencia

- Pruebas de esquema en MySQL 8.0 aislado: pendiente evidencia formal.
- Evidencia arca_pruebas: verificación de solo lectura `Schema::hasColumn('species','model_3d_enabled') === true` (2026-11-25). Usuario confirmó migración aplicada.
- Pruebas integradas backend/dashboard: `AdminSpeciesRequestModel3dTest` 4 passed; `PublishedSpeciesModel3dTest` 5 passed. Dashboard vitest no ejecutado en este entorno (Node no disponible).

## Aprobaciones

| Rol | Resultado | Evidencia |
|---|---|---|
| Responsable de BD | Pendiente | |
| Backend | Pendiente | |
| Solicitante / responsable funcional | Solicitado | Conversación 2026-11-25 |

## Aplicación por ambiente

| Ambiente | Estado | Evidencia |
|---|---|---|
| `arca_pruebas` | Aplicada (confirmada por usuario) | `Schema::hasColumn('species','model_3d_enabled') === true`, 2026-11-25 |
| staging | Pendiente | |
| producción | Pendiente | |
