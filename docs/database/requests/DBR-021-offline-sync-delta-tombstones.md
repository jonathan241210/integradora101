# DBR-021 · offline-sync-delta-tombstones

- Estado: Lista para backend (aplicada en `arca_pruebas`, 2026-11-18; aprobada por BD y backend, Victor Adrian, 2026-11-18)
- Solicitante: PWA / Sync offline (`pwa-009`)
- Apps afectadas: `api`, `pwa`
- Spec relacionada: `apps/pwa/specs/009-offline-first-sync.md`, `apps/api/specs/019-offline-sync.md`
- Responsable de BD: Victor Adrian
- Responsable backend: Victor Adrian
- Fecha: 2026-11-18
- Decisión de diseño (2026-11-18): agregar `deleted_at` (tombstone/SoftDeletes) y `updated_at` nullable con índices en `animals` y `enclosures` para soportar delta (altas/modificaciones/bajas) y paginación por cursor/tiempo. `species` y `clinical_evaluations` ya cuentan con mecanismos de soft delete según estado actual; esta migración inicial se enfoca en `animals` y `enclosures`. Requiere alinear modelos/consultas en API (SoftDeletes/timestamps) sin romper comportamiento existente.

## Problema y objetivo

La sincronización offline-first requiere **sincronización incremental (delta)** tras el bootstrap: obtener altas, modificaciones y **bajas** desde la última sincronización (cursor/`updated_since`) con paginación. Para aplicar bajas sin ambigüedad, la API debe exponer eliminaciones mediante `deleted_at` o un mecanismo de tombstone equivalente en los catálogos sincronizados.

## Datos/tablas/entidades afectadas

- Catálogos usados en sync/bootstrap de `pwa-009`: **animales** (`animals`), **recintos** (`enclosures`) y **especies** (`species`), y datos asociados requeridos por los flujos clínicos offline (a detallar en contrato).
- Evaluaciones clínicas (`clinical_evaluations`) **no** deben eliminarse por sync de catálogo; su historial se preserva.

## Hallazgos actuales (código/modelos)

- `ClinicalEvaluation` y `Species` usan SoftDeletes en modelos actuales.
- `Animal` y `Enclosure` no muestran SoftDeletes/`deleted_at` en modelos actuales.
- Se requiere verificar el esquema real en BD (`arca_pruebas`) antes de definir el cambio.

## Campos y tipo de cambio

- **`animals`** (tabla existente):
  - agregar `updated_at` TIMESTAMP NULL (si no existe) para cursor/delta de modificaciones
  - agregar `deleted_at` TIMESTAMP NULL para bajas/tombstones (SoftDeletes)
  - índices propuestos: `idx_animals_updated_at` (`updated_at`), `idx_animals_deleted_at` (`deleted_at`) y/o compuesto según consultas delta (a validar con EXPLAIN)
- **`enclosures`** (tabla existente):
  - agregar `updated_at` TIMESTAMP NULL (si no existe)
  - agregar `deleted_at` TIMESTAMP NULL
  - índices propuestos: `idx_enclosures_updated_at`, `idx_enclosures_deleted_at` (o compuesto según consultas)
- **`species` / `clinical_evaluations`:** sin cambio en esta DBR inicial (ya tienen soporte de soft delete según esquema/modelos actuales); verificar en `arca_pruebas` y extender en DBR adicional solo si falta `updated_at`/índices para delta.
- **Compatibilidad:** columnas nuevas NULL, sin backfill destructivo. La activación de `SoftDeletes` y `timestamps` en modelos Eloquent y el ajuste de consultas (incluir/excluir eliminados según caso) se realizan en implementación API (`api-019`), no en esta migración.

> Esta DBR describe el requerimiento; **no incluye SQL ejecutable ni migraciones**. La migración Laravel la crea, prueba y aplica el responsable de BD tras aprobación.

## Reglas de negocio y validación

- Las bajas de catálogo deben propagarse al cliente en delta para evitar mostrar registros eliminados como vigentes.
- La aplicación de bajas en cliente **no debe eliminar historial clínico** ni registros locales pendientes cuya resolución deba conservarse.
- El delta debe ser consistente con paginación (sin omisiones/duplicados de página) y soportar fallback a refresh completo si el cursor es inválido.
- Respetar SoftDeletes y reglas de auditoría existentes; datos clínicos y financieros nunca se borran físicamente.

## Riesgo e impacto

- **Consistencia:** sin tombstones/bajas explícitas, el cliente puede retener animales/recintos eliminados.
- **Rendimiento:** consultas delta sin índices adecuados pueden degradarse con volumen.
- **Modelo de dominio:** agregar SoftDeletes a `animals`/`enclosures` puede impactar consultas existentes; requiere análisis de compatibilidad.

## Verificación requerida

- Evidencia de esquema (`SHOW CREATE TABLE`) antes/después en `arca_pruebas`.
- Pruebas de consultas delta (altas/modificaciones/bajas, paginación, orden estable) y verificación de que el historial clínico no se elimina.
- Pruebas de permisos/alcance por usuario staff.

## Aprobación

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Solicitante | Usuario | 2026-11-18 | Aprobada (delta con tombstones/timestamps para sync) |
| Responsable de BD | Victor Adrian | 2026-11-18 | Aprobada (diseño propuesto: `animals`/`enclosures`) |
| Responsable backend | Victor Adrian | 2026-11-18 | Aprobada (lista para implementación/consumo backend) |

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | Migración implementada | 2026-11-18 | `php artisan migrate`: `2026_11_18_000021_offline_sync_delta_tombstones ... 4s DONE` (Victor Adrian). Evidencia detallada (`SHOW CREATE TABLE animals/enclosures`) pendiente de adjuntar. |
| staging | pendiente |  |  |
| producción | pendiente |  |  |