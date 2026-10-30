<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-005: news-events-soft-deletes).
     */
    public function up(): void
    {
        // 1. Agregar columna deleted_at a news
        if (Schema::hasTable('news') && !Schema::hasColumn('news', 'deleted_at')) {
            Schema::table('news', function (Blueprint $table) {
                $table->softDeletes()->nullable();
            });
        }

        // 2. Agregar columna deleted_at a events
        if (Schema::hasTable('events') && !Schema::hasColumn('events', 'deleted_at')) {
            Schema::table('events', function (Blueprint $table) {
                $table->softDeletes()->nullable();
            });
        }

        // 3. Crear índice idx_tickets_purchased_at sobre tickets (purchased_at)
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->index('purchased_at', 'idx_tickets_purchased_at');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Revertir índice en tickets
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                $table->dropIndex('idx_tickets_purchased_at');
            });
        }

        // 2. Revertir columna deleted_at en events
        if (Schema::hasTable('events') && Schema::hasColumn('events', 'deleted_at')) {
            Schema::table('events', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }

        // 3. Revertir columna deleted_at en news
        if (Schema::hasTable('news') && Schema::hasColumn('news', 'deleted_at')) {
            Schema::table('news', function (Blueprint $table) {
                $table->dropSoftDeletes();
            });
        }
    }
};
