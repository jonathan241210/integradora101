<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DBR-015: edad por evaluación clínica (patient_age), SoftDeletes en tablas clínicas
     * y retiro de animals.estimated_age.
     */
    public function up(): void
    {
        // 1) clinical_evaluations: patient_age + deleted_at
        if (Schema::hasTable('clinical_evaluations')) {
            Schema::table('clinical_evaluations', function (Blueprint $table) {
                if (! Schema::hasColumn('clinical_evaluations', 'patient_age')) {
                    $column = $table->string('patient_age', 50)->nullable();
                    if (Schema::hasColumn('clinical_evaluations', 'weight_kg')) {
                        $column->after('weight_kg');
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

        // 3) Backfill/evidencia (manual, ANTES de eliminar animals.estimated_age):
        //    Registrar el valor del único registro reportado en arca_pruebas:
        //    SELECT id, name, birth_date, estimated_age FROM animals WHERE estimated_age IS NOT NULL;
        //    (Sin copia automática obligatoria a evaluaciones históricas; preservar manualmente si aplica.)

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