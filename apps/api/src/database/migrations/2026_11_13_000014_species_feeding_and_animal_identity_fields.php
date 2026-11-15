<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DBR-014: consolida datos de especie y estandariza identidad/edad de ejemplares.
     * Referencia: docs/database/requests/DBR-014-species-feeding-and-animal-identity-fields.md
     */
    public function up(): void
    {
        if (Schema::hasTable('species')) {
            Schema::table('species', function (Blueprint $table): void {
                if (! Schema::hasColumn('species', 'feeding')) {
                    $table->text('feeding')->nullable()->after('habitat');
                }
                if (! Schema::hasColumn('species', 'longevity')) {
                    $table->string('longevity', 50)->nullable()->after('feeding');
                }
                if (! Schema::hasColumn('species', 'reproduction')) {
                    $table->string('reproduction', 100)->nullable()->after('longevity');
                }
            });
        }

        if (Schema::hasTable('animals')) {
            Schema::table('animals', function (Blueprint $table): void {
                if (! Schema::hasColumn('animals', 'birth_date')) {
                    $table->date('birth_date')->nullable()->after('sex');
                }
                if (! Schema::hasColumn('animals', 'estimated_age')) {
                    $table->string('estimated_age', 50)->nullable()->after('birth_date');
                }
            });

            // Backfill desde animals.age (formato actual: "Nacimiento: YYYY-MM-DD" o texto libre).
            // Validar en preflight que el prefijo/longitud coincidan con los datos reales.
            if (Schema::hasColumn('animals', 'age')) {
                DB::table('animals')
                    ->whereNull('birth_date')
                    ->where('age', 'like', 'Nacimiento: ____-__-__')
                    ->update([
                        'birth_date' => DB::raw("STR_TO_DATE(SUBSTRING(age, 13), '%Y-%m-%d')"),
                    ]);

                DB::table('animals')
                    ->whereNull('estimated_age')
                    ->whereNotNull('age')
                    ->where('age', 'not like', 'Nacimiento: ____-__-__')
                    ->update([
                        'estimated_age' => DB::raw('age'),
                    ]);
            }

            // Asegurar tag_number nullable conservando el índice UNIQUE existente.
            // Se usa SQL directo para no depender de doctrine/dbal en ->change().
            if (Schema::hasColumn('animals', 'tag_number')) {
                DB::statement('ALTER TABLE `animals` MODIFY `tag_number` VARCHAR(50) NULL');
            }

            // Retirar campos movidos/ambiguos (validar datos y backfill en arca_pruebas antes de aplicar).
            Schema::table('animals', function (Blueprint $table): void {
                $drop = [];
                foreach (['longevity', 'reproduction', 'diet', 'age'] as $column) {
                    if (Schema::hasColumn('animals', $column)) {
                        $drop[] = $column;
                    }
                }
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }
    }

    /**
     * Reversión con posible pérdida semántica (restaura estructura; no reconstruye datos consolidados).
     */
    public function down(): void
    {
        if (Schema::hasTable('animals')) {
            Schema::table('animals', function (Blueprint $table): void {
                if (! Schema::hasColumn('animals', 'age')) {
                    $table->string('age', 50)->nullable()->after('sex');
                }
                if (! Schema::hasColumn('animals', 'diet')) {
                    $table->text('diet')->nullable();
                }
                if (! Schema::hasColumn('animals', 'reproduction')) {
                    $table->string('reproduction', 100)->nullable();
                }
                if (! Schema::hasColumn('animals', 'longevity')) {
                    $table->string('longevity', 50)->nullable();
                }
            });

            if (Schema::hasColumn('animals', 'estimated_age') && Schema::hasColumn('animals', 'age')) {
                DB::table('animals')
                    ->whereNull('age')
                    ->update(['age' => DB::raw('estimated_age')]);
            }
            if (Schema::hasColumn('animals', 'birth_date') && Schema::hasColumn('animals', 'age')) {
                DB::table('animals')
                    ->whereNull('age')
                    ->whereNotNull('birth_date')
                    ->update(['age' => DB::raw("CONCAT('Nacimiento: ', DATE_FORMAT(birth_date, '%Y-%m-%d'))")]);
            }

            Schema::table('animals', function (Blueprint $table): void {
                $drop = [];
                foreach (['estimated_age', 'birth_date'] as $column) {
                    if (Schema::hasColumn('animals', $column)) {
                        $drop[] = $column;
                    }
                }
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }

        if (Schema::hasTable('species')) {
            Schema::table('species', function (Blueprint $table): void {
                $drop = [];
                foreach (['reproduction', 'longevity', 'feeding'] as $column) {
                    if (Schema::hasColumn('species', $column)) {
                        $drop[] = $column;
                    }
                }
                if ($drop !== []) {
                    $table->dropColumn($drop);
                }
            });
        }
    }
};