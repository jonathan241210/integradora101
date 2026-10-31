<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-004: visitor-progress).
     */
    public function up(): void
    {
        // 1. Agregar columna `category` a `species`
        if (Schema::hasTable('species') && !Schema::hasColumn('species', 'category')) {
            Schema::table('species', function (Blueprint $table) {
                $table->string('category', 30)->nullable()->after('scientific_name');
            });
        }

        // 2. Modificar FK en `enclosure_qr_codes` (CASCADE -> RESTRICT)
        if (Schema::hasTable('enclosure_qr_codes')) {
            $dropFkIfExists = function (string $table, string $fk) {
                $exists = DB::selectOne("
                    SELECT 1 
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = ? 
                      AND CONSTRAINT_NAME = ? 
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                ", [$table, $fk]);

                if ($exists) {
                    DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$fk}`");
                }
            };

            $dropFkIfExists('enclosure_qr_codes', 'fk_recintos_qr_recinto');
            $dropFkIfExists('enclosure_qr_codes', 'fk_enclosure_qr_codes_enclosure_id');

            Schema::table('enclosure_qr_codes', function (Blueprint $table) {
                $table->foreign('enclosure_id', 'fk_enclosure_qr_codes_enclosure_id')
                    ->references('id')
                    ->on('enclosures')
                    ->onDelete('restrict');
            });
        }

        // 3. Reestructurar `visitor_collections` (Colección por especie)
        if (Schema::hasTable('visitor_collections')) {
            // Deshabilitar temporalmente sql_require_primary_key para la reestructuración de la PK
            DB::statement("SET SESSION sql_require_primary_key = 0");

            // Soltar llaves foráneas e índices antiguos
            $dropConstraintIfExists = function (string $table, string $constraint, string $type) {
                $exists = DB::selectOne("
                    SELECT 1 
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = ? 
                      AND CONSTRAINT_NAME = ? 
                      AND CONSTRAINT_TYPE = ?
                ", [$table, $constraint, $type]);

                if ($exists) {
                    if ($type === 'FOREIGN KEY') {
                        DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$constraint}`");
                    } else if ($type === 'UNIQUE') {
                        DB::statement("ALTER TABLE `{$table}` DROP INDEX `{$constraint}`");
                    }
                }
            };

            $dropConstraintIfExists('visitor_collections', 'fk_coleccion_recinto_qr', 'FOREIGN KEY');
            $dropConstraintIfExists('visitor_collections', 'fk_coleccion_usuario', 'FOREIGN KEY');
            $dropConstraintIfExists('visitor_collections', 'uk_usuario_recinto', 'UNIQUE');

            // Reestructurar campos y llaves primarias
            DB::statement("ALTER TABLE visitor_collections ADD COLUMN species_id INT NOT NULL");
            DB::statement("ALTER TABLE visitor_collections MODIFY id INT, DROP PRIMARY KEY");
            DB::statement("ALTER TABLE visitor_collections DROP COLUMN id, ADD PRIMARY KEY (visitor_id, species_id)");
            DB::statement("ALTER TABLE visitor_collections CHANGE COLUMN unlocked_date discovered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP");
            DB::statement("ALTER TABLE visitor_collections MODIFY enclosure_qr_code_id INT NULL");
            DB::statement("ALTER TABLE visitor_collections ADD COLUMN created_at TIMESTAMP NULL");

            // Crear nuevas FKs
            Schema::table('visitor_collections', function (Blueprint $table) {
                $table->foreign('visitor_id', 'fk_vc_visitor_id')->references('id')->on('visitors')->onDelete('cascade');
                $table->foreign('species_id', 'fk_vc_species_id')->references('id')->on('species')->onDelete('restrict');
                $table->foreign('enclosure_qr_code_id', 'fk_vc_enclosure_qr_code_id')->references('id')->on('enclosure_qr_codes')->onDelete('set null');
            });
        }

        // 4. Crear tabla `visitor_scans` (Auditoría antiabuso y escaneos de QR)
        if (!Schema::hasTable('visitor_scans')) {
            Schema::create('visitor_scans', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->integer('visitor_id');
                $table->char('client_scan_id', 36);
                $table->string('submitted_code', 255);
                $table->integer('enclosure_qr_code_id')->nullable();
                $table->timestamp('scanned_at');
                $table->timestamp('received_at');
                $table->string('result', 30);

                $table->unique(['visitor_id', 'client_scan_id'], 'uk_visitor_scans_visitor_client');
                $table->foreign('visitor_id', 'fk_vs_visitor_id')->references('id')->on('visitors')->onDelete('cascade');
                $table->foreign('enclosure_qr_code_id', 'fk_vs_enclosure_qr_code_id')->references('id')->on('enclosure_qr_codes')->onDelete('set null');
            });
        }

        // 5. Crear tabla `achievements` (Catálogo de logros)
        if (!Schema::hasTable('achievements')) {
            Schema::create('achievements', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('code', 50)->unique('uk_achievements_code');
                $table->string('title', 255);
                $table->string('description', 255);
                $table->string('icon', 100);
                $table->integer('points');
                $table->string('rule_type', 40);
                $table->integer('rule_target');
                $table->string('rule_param', 50)->nullable();
                $table->integer('sort_order')->default(0);
                $table->tinyInteger('is_active')->default(1);
                $table->timestamps();
            });
        }

        // 6. Crear tabla `visitor_achievements` (Pivote de logros desbloqueados)
        if (!Schema::hasTable('visitor_achievements')) {
            Schema::create('visitor_achievements', function (Blueprint $table) {
                $table->integer('visitor_id');
                $table->unsignedBigInteger('achievement_id');
                $table->timestamp('unlocked_at');

                $table->primary(['visitor_id', 'achievement_id'], 'pk_visitor_achievements');
                $table->foreign('visitor_id', 'fk_va_visitor_id')->references('id')->on('visitors')->onDelete('cascade');
                $table->foreign('achievement_id', 'fk_va_achievement_id')->references('id')->on('achievements')->onDelete('restrict');
            });
        }

        // 7. Crear tabla `missions` (Catálogo de misiones)
        if (!Schema::hasTable('missions')) {
            Schema::create('missions', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('code', 50)->unique('uk_missions_code');
                $table->string('title', 255);
                $table->string('description', 255);
                $table->string('icon', 100);
                $table->string('objective', 255);
                $table->integer('points');
                $table->string('rule_type', 40);
                $table->integer('rule_target');
                $table->string('rule_param', 50)->nullable();
                $table->integer('sort_order')->default(0);
                $table->tinyInteger('is_active')->default(1);
                $table->timestamps();
            });
        }

        // 8. Crear tabla `visitor_mission_completions` (Pivote de misiones completadas)
        if (!Schema::hasTable('visitor_mission_completions')) {
            Schema::create('visitor_mission_completions', function (Blueprint $table) {
                $table->integer('visitor_id');
                $table->unsignedBigInteger('mission_id');
                $table->timestamp('completed_at');

                $table->primary(['visitor_id', 'mission_id'], 'pk_visitor_mission_completions');
                $table->foreign('visitor_id', 'fk_vmc_visitor_id')->references('id')->on('visitors')->onDelete('cascade');
                $table->foreign('mission_id', 'fk_vmc_mission_id')->references('id')->on('missions')->onDelete('restrict');
            });
        }

        // 9. Crear tabla `visitor_point_entries` (Libro mayor de puntos)
        if (!Schema::hasTable('visitor_point_entries')) {
            Schema::create('visitor_point_entries', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->integer('visitor_id');
                $table->string('source_type', 30);
                $table->integer('source_id');
                $table->integer('points');
                $table->timestamp('created_at')->useCurrent();

                $table->unique(['visitor_id', 'source_type', 'source_id'], 'uk_vpe_visitor_source');
                $table->foreign('visitor_id', 'fk_vpe_visitor_id')->references('id')->on('visitors')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Eliminar tablas creadas
        Schema::dropIfExists('visitor_point_entries');
        Schema::dropIfExists('visitor_mission_completions');
        Schema::dropIfExists('missions');
        Schema::dropIfExists('visitor_achievements');
        Schema::dropIfExists('achievements');
        Schema::dropIfExists('visitor_scans');

        // 2. Revertir `visitor_collections`
        if (Schema::hasTable('visitor_collections')) {
            DB::statement("SET SESSION sql_require_primary_key = 0");

            Schema::table('visitor_collections', function (Blueprint $table) {
                $table->dropForeign('fk_vc_visitor_id');
                $table->dropForeign('fk_vc_species_id');
                $table->dropForeign('fk_vc_enclosure_qr_code_id');
            });

            DB::statement("ALTER TABLE visitor_collections DROP PRIMARY KEY");
            DB::statement("ALTER TABLE visitor_collections ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST");
            DB::statement("ALTER TABLE visitor_collections DROP COLUMN species_id");
            DB::statement("ALTER TABLE visitor_collections CHANGE COLUMN discovered_at unlocked_date DATE NULL");
            DB::statement("ALTER TABLE visitor_collections MODIFY enclosure_qr_code_id INT NOT NULL");
            DB::statement("ALTER TABLE visitor_collections DROP COLUMN created_at");
            DB::statement("ALTER TABLE visitor_collections ADD UNIQUE KEY uk_usuario_recinto (visitor_id, enclosure_qr_code_id)");
        }

        // 3. Revertir FK `enclosure_qr_codes`
        if (Schema::hasTable('enclosure_qr_codes')) {
            Schema::table('enclosure_qr_codes', function (Blueprint $table) {
                $table->dropForeign('fk_enclosure_qr_codes_enclosure_id');
                $table->foreign('enclosure_id', 'fk_recintos_qr_recinto')->references('id')->on('enclosures')->onDelete('cascade');
            });
        }

        // 4. Retirar `category` de `species`
        if (Schema::hasTable('species') && Schema::hasColumn('species', 'category')) {
            Schema::table('species', function (Blueprint $table) {
                $table->dropColumn('category');
            });
        }
    }
};
