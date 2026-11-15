# DBR-015 · clinical-evaluation-age-and-animal-estimated-age-removal

- Estado: Lista para backend (aplicada en `arca_pruebas`, 2026-11-13; evidencia post-migración detallada pendiente de adjuntar)
- Feature/spec origen: Guardado de diagnóstico intenso parte 1 y modelo de edad clínica (`apps/pwa/specs/007-diagnostico-intenso-parte1-guardado.md`, Borrador; relacionado con `apps/pwa/specs/006-diagnostico-intenso-parte1-precarga.md`, DBR-014)
- Solicitante: Victor Adrian
- Responsable de BD: Victor Adrian
- Responsable backend: Victor Adrian
- Fecha: 2026-11-13
- Aprobación registrada: Victor Adrian (BD y backend), 2026-11-13

## Problema y justificación

La edad del ejemplar en el momento de la atención es un dato clínico histórico: cada diagnóstico/evaluación debe conservar con qué edad se realizó. Actualmente:
- `animals` (DBR-014) almacena `birth_date` (DATE, NULL) y `estimated_age` (VARCHAR(50), NULL) como dato del ejemplar.
- `clinical_evaluations` **no tiene** columna para edad del paciente; el formulario intenso captura edad editable pero el mapeo actual no la persiste.
- Los datos clínicos deben quedar auditados y sin borrado físico (Constitución V); las tablas clínicas (`clinical_evaluations`, `clinical_evaluation_findings`, `animal_restraints`, `lab_samples`) no cuentan hoy con `deleted_at` para SoftDeletes.

Se requiere: persistir la edad en cada evaluación clínica (`patient_age`), retirar `estimated_age` de `animals` (dejando `birth_date` como referencia), y agregar soporte de SoftDeletes (`deleted_at`) en las tablas clínicas para habilitar persistencia conforme a política.

> **Backfill (definición):** proceso de migrar/llenar datos existentes hacia el nuevo esquema antes de eliminar o cambiar columnas, para no perder información previa. En este caso aplica a los valores existentes de `animals.estimated_age` antes de eliminar esa columna.

## Estado actual

- **`animals`**: `birth_date DATE NULL`, `estimated_age VARCHAR(50) NULL`. En `arca_pruebas` se reporta **1 solo registro** con `estimated_age` (2026-11-13).
- **`clinical_evaluations`** (tabla 10): sin columna de edad del paciente; sin `deleted_at`.
- **`clinical_evaluation_findings`** (tabla 11), **`animal_restraints`** (tabla 12), **`lab_samples`** (tabla 13): sin `deleted_at`.

## Análisis: dónde agregar la edad por diagnóstico

| Opción | Ubicación | Evaluación |
|---|---|---|
| **A (aprobada)** | `clinical_evaluations.patient_age` | Correcta: atributo del paciente **en esa evaluación** (1:1 con el registro), igual que `weight_kg`/`evaluation_date`. Permite saber la edad en cada diagnóstico/historial. |
| B | `clinical_evaluation_findings` | No apropiada: por sistema/órgano; duplicaría o forzaría un hallazgo artificial. |
| C | Tabla hija nueva | Innecesaria para un campo escalar por evaluación. |
| D | Solo `animals.estimated_age` | Incorrecto para historial: se sobrescribe y no preserva diagnósticos pasados. |

**Decisión:** `patient_age VARCHAR(50) NULL` en `clinical_evaluations` (acepta “2 años 3 meses”, “Neonato/Cría/Juvenil/Adulto/Geriátrico”, etc.).

## Contrato solicitado

### `clinical_evaluations`
- Agregar `patient_age VARCHAR(50) NULL` (edad del paciente al momento de la evaluación). Posición sugerida: `AFTER weight_kg`.
- Agregar `deleted_at TIMESTAMP NULL` para SoftDeletes.

### `clinical_evaluation_findings`, `animal_restraints`, `lab_samples`
- Agregar `deleted_at TIMESTAMP NULL` para SoftDeletes en cada tabla.

### `animals`
- Eliminar `estimated_age`.
- Conservar `birth_date` (`DATE NULL`).

### Consumidores (posterior a “Lista para backend”)
- **API:** persistir edad en `clinical_evaluations.patient_age`; retirar lectura/escritura de `animals.estimated_age`; modelos clínicos con SoftDeletes (sin borrado físico).
- **PWA:** diagnóstico intenso envía edad para guardarse en la evaluación; alta/perfil dejan de depender de `animals.estimated_age` (edad calculada desde `birth_date` cuando exista).

## Elementos afectados

| Tipo | Nombre | Cambio |
|---|---|---|
| columna | `clinical_evaluations.patient_age` | Agregar `VARCHAR(50) NULL` |
| columna | `clinical_evaluations.deleted_at` | Agregar `TIMESTAMP NULL` |
| columna | `clinical_evaluation_findings.deleted_at` | Agregar `TIMESTAMP NULL` |
| columna | `animal_restraints.deleted_at` | Agregar `TIMESTAMP NULL` |
| columna | `lab_samples.deleted_at` | Agregar `TIMESTAMP NULL` |
| columna | `animals.estimated_age` | Eliminar |
| dato | `animals.estimated_age` existente (1 registro) | Backfill/controlado antes de `DROP` |

## SQL de referencia (MySQL 8.0)

> **Referencia para revisión; no ejecutar directamente.** El cambio real se implementará como migración Laravel creada/probada/aplicada por el responsable de BD.

```sql
-- edad por evaluación clínica
ALTER TABLE clinical_evaluations
  ADD COLUMN patient_age VARCHAR(50) NULL AFTER weight_kg;

-- SoftDeletes en tablas clínicas
ALTER TABLE clinical_evaluations ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE clinical_evaluation_findings ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE animal_restraints ADD COLUMN deleted_at TIMESTAMP NULL;
ALTER TABLE lab_samples ADD COLUMN deleted_at TIMESTAMP NULL;

-- Backfill (1 registro reportado): registrar valor antes de eliminar.
-- Si aplica y existe evaluación del mismo animal, puede copiarse manualmente:
-- UPDATE clinical_evaluations ce
-- JOIN animals a ON a.id = ce.animal_id
-- SET ce.patient_age = a.estimated_age
-- WHERE ce.patient_age IS NULL AND a.estimated_age IS NOT NULL
-- ORDER BY ce.evaluation_date DESC, ce.id DESC
-- LIMIT 1;

-- retirar edad estimada del ejemplar
ALTER TABLE animals DROP COLUMN estimated_age;
```

## Datos existentes y migración de datos

- **`animals.estimated_age`**: se identificó **1 registro** con valor en `arca_pruebas` (2026-11-13). **Backfill/decisión:** antes de `DROP`, el responsable de BD debe registrar ese valor (evidencia). Dado que es un único dato y puede no existir una evaluación histórica equivalente, no se exige copia automática a evaluaciones pasadas; puede preservarse manualmente (p. ej. en la próxima evaluación/diagnóstico de ese ejemplar en `patient_age`) y luego eliminar la columna. No se realiza borrado físico de datos clínicos.
- **`clinical_evaluations` existentes:** `patient_age` quedará `NULL` salvo actualización manual acordada.
- **`deleted_at`**: nulo en registros existentes.

**Evidencia registrada (pre-drop, 2026-11-13, `arca_pruebas`):**
```sql
SELECT id, name, birth_date, estimated_age
FROM animals
WHERE estimated_age IS NOT NULL;
-- Resultado: id=5, name='Juan', birth_date=NULL, estimated_age='1000'
```

## Migración Laravel de referencia (DBR-015)

> **Referencia para el responsable de BD; no creada/aplicada por agente.** Copiar como archivo en `apps/api/src/database/migrations/` (sugerido: `2026_11_13_000015_clinical_evaluation_age_and_soft_deletes.php`), revisarla, registrar evidencia del valor de `estimated_age`, probar en MySQL 8.0 aislada y ejecutar manualmente en `arca_pruebas`. Ajustar nombre/orden según el entorno.

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DBR-015: edad por evaluación clínica, SoftDeletes en tablas clínicas
     * y retiro de animals.estimated_age.
     */
    public function up(): void
    {
        // 1) clinical_evaluations: patient_age + deleted_at
        if (Schema::hasTable('clinical_evaluations')) {
            Schema::table('clinical_evaluations', function (Blueprint $table) {
                if (! Schema::hasColumn('clinical_evaluations', 'patient_age')) {
                    $after = Schema::hasColumn('clinical_evaluations', 'weight_kg') ? 'weight_kg' : null;
                    $column = $table->string('patient_age', 50)->nullable();
                    if ($after) {
                        $column->after($after);
                    }
                }
                if (! Schema::hasColumn('clinical_evaluations', 'deleted_at')) {
                    $table->softDeletes();
                }
            });
        }

        // 2) SoftDeletes en tablas hijas clínicas
        foreach (['clinical_evaluation_findings', 'animal_restraints', 'lab_samples'] as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                if (! Schema::hasColumn($tableName, 'deleted_at')) {
                    $table->softDeletes();
                }
            });
        }

        // 3) Evidencia/backfill manual de animals.estimated_age (1 registro reportado)
        // Ejecutar y registrar ANTES de eliminar, p. ej.:
        // SELECT id, name, birth_date, estimated_age FROM animals WHERE estimated_age IS NOT NULL;
        // Si se decide preservar en una evaluación existente, hacerlo manualmente con criterio documentado.

        // 4) Retirar edad estimada del ejemplar (birth_date se conserva)
        if (Schema::hasTable('animals') && Schema::hasColumn('animals', 'estimated_age')) {
            Schema::table('animals', function (Blueprint $table) {
                $table->dropColumn('estimated_age');
            });
        }
    }

    /**
     * Reversión estructural (no recupera valores eliminados sin respaldo/evidencia).
     */
    public function down(): void
    {
        if (Schema::hasTable('animals') && ! Schema::hasColumn('animals', 'estimated_age')) {
            Schema::table('animals', function (Blueprint $table) {
                $after = Schema::hasColumn('animals', 'birth_date') ? 'birth_date' : 'sex';
                $table->string('estimated_age', 50)->nullable()->after($after);
            });
        }

        foreach (['lab_samples', 'animal_restraints', 'clinical_evaluation_findings', 'clinical_evaluations'] as $tableName) {
            if (! Schema::hasTable($tableName)) {
                continue;
            }
            Schema::table($tableName, function (Blueprint $table) use ($tableName) {
                $drops = [];
                if (Schema::hasColumn($tableName, 'deleted_at')) {
                    $drops[] = 'deleted_at';
                }
                if ($tableName === 'clinical_evaluations' && Schema::hasColumn($tableName, 'patient_age')) {
                    $drops[] = 'patient_age';
                }
                if ($drops !== []) {
                    $table->dropColumn($drops);
                }
            });
        }
    }
};
```

## Privacidad, auditoría y retención

- Datos **clínicos** (`clinical_evaluations` y tablas hijas): deben permanecer auditados y **nunca** borrarse físicamente (Constitución V). `deleted_at` habilita SoftDeletes; la implementación debe evitar borrado físico y complementar con auditoría (Activitylog/BaseModel) en código según estrategia aprobada.

## Impacto, rendimiento y reversión

- Cambios compatibles con MySQL 8.0; tablas previsiblemente pequeñas/medias, validar bloqueo en ventana controlada.
- **Reversión:** re-agregar `animals.estimated_age` (no recupera valor sin respaldo/evidencia); eliminar `deleted_at`/`patient_age` revierte estructura pero puede perder trazabilidad/snapshots. Respaldo previo obligatorio.

## Compatibilidad MySQL 8.0

- `VARCHAR(50) NULL`, `TIMESTAMP NULL`, `ADD/DROP COLUMN` compatibles con MySQL 8.0.x.

## Orden de despliegue

1. Responsable de BD verifica y registra el valor del único registro con `animals.estimated_age` (evidencia), define backfill manual si aplica, crea y prueba migración en MySQL 8.0 aislada.
2. Aplicación en `arca_pruebas` y registro de evidencia → estado “Lista para backend”.
3. Backend: modelos/validación/controladores para `patient_age`, SoftDeletes en modelos clínicos y retiro de `animals.estimated_age`.
4. PWA: envío de edad en evaluación y ajustes de alta/perfil.
5. Pruebas y `/verify`.

## Pruebas y evidencia

- Pruebas de esquema en MySQL 8.0 aislada: pendiente de registrar detalle por responsable de BD.
- Evidencia (sin secretos): **pre-drop registrado** — `animals.estimated_age` (1 registro en `arca_pruebas`, 2026-11-13): `id=5, name='Juan', birth_date=NULL, estimated_age='1000'`. **Aplicación:** confirmada por Victor Adrian (BD) en `arca_pruebas`, 2026-11-13. **Pendiente adjuntar:** `SHOW CREATE TABLE` post-migración de `clinical_evaluations`, `clinical_evaluation_findings`, `animal_restraints`, `lab_samples`, `animals`.
- Pruebas integradas backend/PWA: pendientes (implementación 007).

## Decisiones registradas (2026-11-13)

1. **Columna:** `patient_age VARCHAR(50) NULL` en `clinical_evaluations` (confirmado).
2. **`animals.estimated_age`:** se elimina; `birth_date` se mantiene como referencia del ejemplar.
3. **Backfill:** existe 1 registro con `estimated_age` en `arca_pruebas`; registrar valor antes de eliminar y aplicar preservación manual si corresponde (sin copia automática obligatoria a histórico).
4. **SoftDeletes:** agregar `deleted_at` en `clinical_evaluations`, `clinical_evaluation_findings`, `animal_restraints`, `lab_samples`.
5. **Guardado intenso:** se enviará a BD solo cuando las dos partes estén completas (modalidad B, spec 007).

## Aprobaciones

| Rol | Nombre | Fecha | Resultado |
|---|---|---|---|
| Responsable de BD | Victor Adrian | 2026-11-13 | Aprobada |
| Responsable backend | Victor Adrian | 2026-11-13 | Aprobada |

> Aprobada y aplicada en `arca_pruebas` (2026-11-13, confirmación BD). Pasa a **“Lista para backend”** para implementación consumidora; evidencia post-migración detallada (`SHOW CREATE TABLE`) pendiente de adjuntar. Ningún agente crea ni aplica migraciones/SQL.

## Aplicación por ambiente

| Ambiente | Estado | Fecha | Evidencia |
|---|---|---|---|
| desarrollo/pruebas (`arca_pruebas`) | aplicada (evidencia post-migración detallada pendiente) | 2026-11-13 | Pre-drop: `id=5, name='Juan', birth_date=NULL, estimated_age='1000'`. Aplicación confirmada por Victor Adrian (BD). Pendiente adjuntar `SHOW CREATE TABLE` post-migración. |
| staging | pendiente | | |
| producción (`arca_zoo`) | pendiente | | |
