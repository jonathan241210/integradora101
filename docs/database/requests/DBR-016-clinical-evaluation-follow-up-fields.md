# DBR-016 · clinical-evaluation-follow-up-fields

- Estado: Lista para backend (aplicada en `arca_pruebas`, 2026-11-14; evidencia post-migración detallada pendiente de adjuntar)
- Feature/spec origen: Seguimiento/revisiones clínicas con historial (spec PWA por definir, relacionada con 002/006/007)
- Solicitante: Victor Adrian
- Responsable de BD: Victor Adrian
- Responsable backend: Victor Adrian
- Fecha: 2026-11-13
- Actualización/aprobación: 2026-11-14
- Aprobación registrada: Victor Adrian (BD y backend), 2026-11-14

## Problema y justificación

Las revisiones/seguimientos (rutina, control de tratamiento, observación) deben registrarse como nuevas atenciones clínicas usando los formatos existentes (**diagnóstico intenso** o **diagnóstico rápido**) y quedar en el historial del animal. Cada revisión debe poder registrar el **estado del animal** y la **próxima revisión**.

Actualmente:
- `ReviewFormView` (kind `review`) crea un registro ligero en `clinical_evaluations` (`evaluation_type='Revision_Rapida'`, `evaluation_reason='Seguimiento: ...'`), guarda el estado en `destination_ruling` y la próxima revisión como texto en `assessment_reason` (`Próxima revisión: ...`). No hay campos dedicados ni consistentes para todas las atenciones.
- No es posible filtrar/consultar de forma estructurada la próxima revisión o el estado de seguimiento de cada atención.
- Se requiere que cualquier evaluación (intensa o rápida) pueda llevar contexto de seguimiento, manteniendo `evaluation_type` como el formato clínico (`Historia_Clinica_Completa` / `Revision_Rapida`).

## Estado actual

- **`clinical_evaluations`**: `evaluation_type` (formato/categoría), `evaluation_reason`, `destination_ruling` (resolución/destino clínico final, NULL), `assessment_reason` (TEXT), `evaluation_date`, `patient_age` (DBR-015). Sin campos dedicados para próxima revisión ni estado de seguimiento por atención.
- **Historial:** las evaluaciones por `animal_id` ya se listan cronológicamente (perfil); cada guardado es un evento.

## Contrato solicitado

Agregar en `clinical_evaluations` campos opcionales de seguimiento, aplicables a evaluaciones intensas o rápidas:

| Columna | Tipo | Descripción |
|---|---|---|
| `follow_up_status` | `VARCHAR(50) NULL` | Estado del animal en la atención/seguimiento (catálogo definido en aplicación: p. ej. `stable`, `monitoring`, `follow_up`). |
| `next_review_date` | `DATE NULL` | Fecha programada de la próxima revisión (cuando aplique). |
| `is_follow_up` | `TINYINT(1) NOT NULL DEFAULT 0` | Indica si la atención corresponde a un seguimiento/revisión (facilita filtros). |

> `evaluation_type` se mantiene como formato: `Historia_Clinica_Completa` (intenso) o `Revision_Rapida` (rápido). El seguimiento es contexto de la atención, no un tercer formato.  
> **Semántica:** `destination_ruling` se mantiene para resolución/destino clínico final (cuando aplique), distinto de `follow_up_status` (estado en el seguimiento). La edad por diagnóstico se guarda en `patient_age` (DBR-015); el perfil del animal debe mostrar la edad del diagnóstico más reciente cuando exista.

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `clinical_evaluations.follow_up_status` | Agregar `VARCHAR(50) NULL` |
| columna | `clinical_evaluations.next_review_date` | Agregar `DATE NULL` |
| columna | `clinical_evaluations.is_follow_up` | Agregar `TINYINT(1) NOT NULL DEFAULT 0` |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada/probada/aplicada por el responsable de BD.

```sql
ALTER TABLE clinical_evaluations
  ADD COLUMN follow_up_status VARCHAR(50) NULL AFTER destination_ruling,
  ADD COLUMN next_review_date DATE NULL AFTER follow_up_status,
  ADD COLUMN is_follow_up TINYINT(1) NOT NULL DEFAULT 0 AFTER next_review_date;

-- (Opcional) backfill desde assessment_reason/destination_ruling de registros 'review' existentes:
-- UPDATE clinical_evaluations
-- SET follow_up_status = destination_ruling,
--     is_follow_up = 1
-- WHERE evaluation_reason LIKE 'Seguimiento:%' AND follow_up_status IS NULL;
-- La fecha en texto "Próxima revisión: YYYY-MM-DD" requeriría parseo cuidadoso si se desea migrar.
```

## Datos existentes y migración de datos

- Registros existentes de `storeReview` tienen estado en `destination_ruling` y próxima revisión en texto dentro de `assessment_reason`. **Backfill:** no automático (opcional/manual). Si se desea, puede copiarse `destination_ruling` → `follow_up_status` y marcar `is_follow_up=1` cuando `evaluation_reason` indique seguimiento; el parseo de “Próxima revisión: YYYY-MM-DD” desde texto solo si se valida manualmente.
- Registros sin seguimiento: `follow_up_status/next_review_date` NULL, `is_follow_up=0`.

## Privacidad, auditoría y retención

- Datos clínicos (`clinical_evaluations`): auditados y sin borrado físico (Constitución V). Las nuevas columnas no implican borrado físico; SoftDeletes ya contemplado (DBR-015).

## Impacto, rendimiento y reversión

- `ADD COLUMN` compatible con MySQL 8.0; tabla de tamaño esperado acotado. Considerar índice futuro si se consultan próximas revisiones por fecha/estado (p. ej. agenda), sujeto a evidencia.
- **Reversión:** eliminar columnas (pierde datos de seguimiento estructurados).

## Compatibilidad MySQL 8.0

- `VARCHAR`, `DATE`, `TINYINT(1)` compatibles con MySQL 8.0.x.

## Orden de despliegue

1. Aprobación de DBR y definición de catálogo de valores para `follow_up_status`/motivos.
2. Responsable de BD crea, prueba y aplica migración en `arca_pruebas` con evidencia → “Lista para backend”.
3. Backend/PWA: capturar y persistir seguimiento en intenso/rápido; ajustar perfil/historial y (si aplica) reemplazar flujo `review` aislado.
4. Pruebas y `/verify`.

## Pruebas y evidencia

- Aplicación confirmada por Victor Adrian (BD) en `arca_pruebas`, 2026-11-14. **Pendiente adjuntar:** `SHOW CREATE TABLE clinical_evaluations;` (confirmación de `follow_up_status`, `next_review_date`, `is_follow_up`).
- Pruebas integradas backend/PWA: pendientes (implementación de seguimiento/revisiones).

## Decisiones registradas (2026-11-14)

1. **Catálogo:** `follow_up_status` valores iniciales `stable`, `monitoring`, `follow_up` (extensible); motivo de seguimiento como rutina/control de tratamiento/observación (alineado a flujo clínico).
2. **`is_follow_up`:** se incluye columna booleana (`TINYINT(1) NOT NULL DEFAULT 0`).
3. **`destination_ruling`:** se mantiene para resolución/destino clínico final, distinto de `follow_up_status`.
4. **Backfill:** opcional/manual, no automático.
5. **Proceso de revisión:** la revisión es una atención registrada con formato **Rápido** o **Intenso** (según se requiera) con contexto de seguimiento; cada diagnóstico guarda su `patient_age` y el perfil del animal muestra la edad del diagnóstico más reciente cuando exista.
6. **`evaluation_type`:** limitado a los dos formatos clínicos (`Historia_Clinica_Completa`, `Revision_Rapida`).

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Victor Adrian | 2026-11-14 | Aprobada |
| Responsable backend | Victor Adrian | 2026-11-14 | Aprobada |

> Aprobada y aplicada en `arca_pruebas` (2026-11-14, confirmación BD). Pasa a **“Lista para backend”** para implementación consumidora; evidencia post-migración detallada (`SHOW CREATE TABLE`) pendiente de adjuntar. Ningún agente crea ni aplica migraciones/SQL.

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | aplicada (evidencia post-migración detallada pendiente) | 2026-11-14 | Aplicación confirmada por Victor Adrian (BD). Pendiente adjuntar `SHOW CREATE TABLE clinical_evaluations`. |
| staging | pendiente | | |
| producción (`arca_zoo`) | pendiente | | |

## Migración Laravel de referencia (DBR-016)

> **Referencia para el responsable de BD; no creada/aplicada por agente.** Copiar como archivo en `apps/api/src/database/migrations/` (sugerido: `2026_11_14_000016_clinical_evaluation_follow_up_fields.php`), revisar, probar en MySQL 8.0 aislada y ejecutar manualmente.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DBR-016: campos de seguimiento en evaluaciones clínicas.
     */
    public function up(): void
    {
        if (! Schema::hasTable('clinical_evaluations')) {
            return;
        }

        Schema::table('clinical_evaluations', function (Blueprint $table) {
            if (! Schema::hasColumn('clinical_evaluations', 'follow_up_status')) {
                $column = $table->string('follow_up_status', 50)->nullable();
                if (Schema::hasColumn('clinical_evaluations', 'destination_ruling')) {
                    $column->after('destination_ruling');
                }
            }
            if (! Schema::hasColumn('clinical_evaluations', 'next_review_date')) {
                $column = $table->date('next_review_date')->nullable();
                if (Schema::hasColumn('clinical_evaluations', 'follow_up_status')) {
                    $column->after('follow_up_status');
                }
            }
            if (! Schema::hasColumn('clinical_evaluations', 'is_follow_up')) {
                $column = $table->boolean('is_follow_up')->default(false);
                if (Schema::hasColumn('clinical_evaluations', 'next_review_date')) {
                    $column->after('next_review_date');
                }
            }
        });
    }

    /**
     * Reversión estructural (pierde datos de seguimiento estructurados).
     */
    public function down(): void
    {
        if (! Schema::hasTable('clinical_evaluations')) {
            return;
        }

        Schema::table('clinical_evaluations', function (Blueprint $table) {
            $drops = [];
            foreach (['is_follow_up', 'next_review_date', 'follow_up_status'] as $column) {
                if (Schema::hasColumn('clinical_evaluations', $column)) {
                    $drops[] = $column;
                }
            }
            if ($drops !== []) {
                $table->dropColumn($drops);
            }
        });
    }
};
```
