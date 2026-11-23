<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-025: species-fun-fact).
     *
     * Añade `fun_fact` («Dato curioso», api-026) a `species_publication_requests` (lo que propone
     * el veterinario) y a `species` (lo publicado). VARCHAR(500) NULL, sin valor por defecto ni
     * índice; la collation se hereda de cada tabla. Las filas existentes quedan en NULL.
     * Idempotente: solo crea cada columna si falta.
     */
    public function up(): void
    {
        if (Schema::hasTable('species_publication_requests') && ! Schema::hasColumn('species_publication_requests', 'fun_fact')) {
            Schema::table('species_publication_requests', function (Blueprint $table) {
                $table->string('fun_fact', 500)->nullable()->after('origin');
            });
        }

        if (Schema::hasTable('species') && ! Schema::hasColumn('species', 'fun_fact')) {
            Schema::table('species', function (Blueprint $table) {
                $table->string('fun_fact', 500)->nullable()->after('habitat');
            });
        }
    }

    /**
     * Reverse the migrations: retira las dos columnas. Se pierden los textos guardados;
     * requiere respaldo previo en cada ambiente.
     */
    public function down(): void
    {
        foreach (['species_publication_requests', 'species'] as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'fun_fact')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropColumn('fun_fact');
                });
            }
        }
    }
};
