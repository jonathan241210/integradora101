<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-020: offline-sync-idempotency-keys).
     *
     * Crea tabla central de operaciones de sincronización para idempotencia por
     * operation_uuid y confirmación individual en reintentos (pwa-009 / api-019).
     * Alcance MVP: altas offline de animales sin adjuntar fotografía en sync y
     * evaluaciones clínicas. No modifica campos de foto existentes (p. ej. animals.photo_path).
     */
    public function up(): void
    {
        if (Schema::hasTable('sync_operations')) {
            return;
        }

        Schema::create('sync_operations', function (Blueprint $table) {
            $table->id();
            $table->char('operation_uuid', 36);
            $table->integer('user_id');
            $table->string('entity_type', 50);
            $table->char('client_entity_id', 36)->nullable();
            $table->string('server_entity_type', 50)->nullable();
            $table->unsignedBigInteger('server_entity_id')->nullable();
            $table->string('status', 20);
            $table->string('error_code', 50)->nullable();
            $table->string('error_message', 500)->nullable();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->unique('operation_uuid', 'uk_sync_operations_operation_uuid');
            $table->index('user_id', 'idx_sync_operations_user_id');
            $table->index(['user_id', 'created_at'], 'idx_sync_operations_user_created_at');
            $table->index(['entity_type', 'server_entity_id'], 'idx_sync_operations_entity_server');

            $table->foreign('user_id', 'fk_sync_operations_user_id')
                ->references('id')->on('users')->onDelete('restrict');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! Schema::hasTable('sync_operations')) {
            return;
        }

        Schema::table('sync_operations', function (Blueprint $table) {
            $table->dropForeign('fk_sync_operations_user_id');
            $table->dropUnique('uk_sync_operations_operation_uuid');
            $table->dropIndex('idx_sync_operations_user_id');
            $table->dropIndex('idx_sync_operations_user_created_at');
            $table->dropIndex('idx_sync_operations_entity_server');
        });

        Schema::dropIfExists('sync_operations');
    }
};