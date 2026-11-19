<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-020: enclosure-status-soft-delete).
     *
     * Añade `enclosures.is_active` (recinto activo o desactivado, api-019). Además versiona
     * `updated_at` y `deleted_at` con sus índices, que ya existían en `arca_pruebas` sin
     * migración: solo se crean si faltan, para que una base local nueva quede igual.
     */
    public function up(): void
    {
        if (! Schema::hasTable('enclosures')) {
            return;
        }

        $addUpdatedAt = ! Schema::hasColumn('enclosures', 'updated_at');
        $addDeletedAt = ! Schema::hasColumn('enclosures', 'deleted_at');

        Schema::table('enclosures', function (Blueprint $table) use ($addUpdatedAt, $addDeletedAt) {
            if (! Schema::hasColumn('enclosures', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('map_y');
            }
            if ($addUpdatedAt) {
                $table->timestamp('updated_at')->nullable();
                $table->index('updated_at', 'idx_enclosures_updated_at');
            }
            if ($addDeletedAt) {
                $table->timestamp('deleted_at')->nullable();
                $table->index('deleted_at', 'idx_enclosures_deleted_at');
            }
        });
    }

    /**
     * Reverse the migrations: solo retira `is_active`. `updated_at` y `deleted_at`
     * existían antes de esta DBR y se conservan.
     */
    public function down(): void
    {
        if (Schema::hasTable('enclosures') && Schema::hasColumn('enclosures', 'is_active')) {
            Schema::table('enclosures', function (Blueprint $table) {
                $table->dropColumn('is_active');
            });
        }
    }
};
