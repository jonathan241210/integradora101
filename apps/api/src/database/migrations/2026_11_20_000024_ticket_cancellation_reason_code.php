<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-024: ticket-cancellation-reason-code).
     *
     * Añade `tickets.cancellation_reason_code`, el código del catálogo cerrado de motivos de
     * cancelación (api-022 RN-02). Es nulable y sin valor por defecto: las cancelaciones
     * anteriores quedan en NULL («Sin clasificar (anterior)») y no se reescriben (Constitución V).
     * Idempotente: solo crea la columna si falta.
     */
    public function up(): void
    {
        if (! Schema::hasTable('tickets') || Schema::hasColumn('tickets', 'cancellation_reason_code')) {
            return;
        }

        Schema::table('tickets', function (Blueprint $table) {
            $table->string('cancellation_reason_code', 30)->nullable()->after('cancellation_reason');
        });
    }

    /**
     * Reverse the migrations: retira la columna. Se pierde la clasificación de las
     * cancelaciones con código; `cancellation_reason` (comentario) se conserva.
     */
    public function down(): void
    {
        if (Schema::hasTable('tickets') && Schema::hasColumn('tickets', 'cancellation_reason_code')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropColumn('cancellation_reason_code');
            });
        }
    }
};
