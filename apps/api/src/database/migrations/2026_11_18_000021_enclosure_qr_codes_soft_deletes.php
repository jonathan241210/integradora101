<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-021: enclosure-qr-codes-soft-deletes).
     *
     * Añade borrado lógico a `enclosure_qr_codes` (Constitución V). Los códigos de un
     * recinto eliminado se marcan como eliminados (api-020); los desactivados por
     * regeneración solo cambian `is_active`. Idempotente.
     */
    public function up(): void
    {
        if (! Schema::hasTable('enclosure_qr_codes') || Schema::hasColumn('enclosure_qr_codes', 'deleted_at')) {
            return;
        }

        Schema::table('enclosure_qr_codes', function (Blueprint $table) {
            $table->timestamp('deleted_at')->nullable()->after('enclosure_id');
            $table->index('deleted_at', 'idx_enclosure_qr_codes_deleted_at');
        });
    }

    /**
     * Reverse the migrations: retira `deleted_at` y su índice.
     */
    public function down(): void
    {
        if (! Schema::hasTable('enclosure_qr_codes') || ! Schema::hasColumn('enclosure_qr_codes', 'deleted_at')) {
            return;
        }

        Schema::table('enclosure_qr_codes', function (Blueprint $table) {
            $table->dropIndex('idx_enclosure_qr_codes_deleted_at');
            $table->dropColumn('deleted_at');
        });
    }
};
