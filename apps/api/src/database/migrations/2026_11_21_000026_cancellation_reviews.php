<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-026: cancellation-reviews).
     *
     * Historial de revisiones de cancelaciones por cajero y día de negocio (api-027): cada
     * decisión del admin es una fila nueva; la vigente es la de mayor `id`. Sin UNIQUE sobre
     * (cashier_id, business_date) para conservar el historial. `cashier_id` NOT NULL: el grupo
     * «Sin cajero registrado» no se revisa (decisión de Jonathan, 2026-11-21). Idempotente.
     */
    public function up(): void
    {
        if (Schema::hasTable('cancellation_reviews')) {
            return;
        }

        Schema::create('cancellation_reviews', function (Blueprint $table) {
            $table->id();
            $table->integer('cashier_id');
            $table->date('business_date');
            $table->string('status', 30);
            $table->string('note', 255);
            $table->integer('reviewed_by');
            $table->timestamps();
            $table->softDeletes();

            $table->foreign('cashier_id', 'fk_cancellation_reviews_cashier')->references('id')->on('users')->onDelete('restrict');
            $table->foreign('reviewed_by', 'fk_cancellation_reviews_reviewer')->references('id')->on('users')->onDelete('restrict');

            $table->index(['cashier_id', 'business_date', 'id'], 'idx_cancellation_reviews_cashier_date');
            $table->index('business_date', 'idx_cancellation_reviews_business_date');
        });
    }

    /**
     * Reverse the migrations: retira la tabla. Solo en un ambiente sin revisiones registradas;
     * con datos, el responsable de BD decide con respaldo previo (Constitución V).
     */
    public function down(): void
    {
        Schema::dropIfExists('cancellation_reviews');
    }
};
