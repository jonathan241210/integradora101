<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-021: offline-sync-delta-tombstones).
     *
     * Agrega soporte de delta/bajas para catálogos sincronizados en pwa-009/api-019:
     * deleted_at (tombstone/SoftDeletes) y updated_at (cursor de modificación) en
     * animals y enclosures, con índices. La alineación de modelos Eloquent
     * (SoftDeletes/timestamps) y consultas se realiza en la implementación API.
     */
    public function up(): void
    {
        if (Schema::hasTable('animals')) {
            Schema::table('animals', function (Blueprint $table) {
                if (! Schema::hasColumn('animals', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable()->after('stay_status');
                }
                if (! Schema::hasColumn('animals', 'deleted_at')) {
                    $table->timestamp('deleted_at')->nullable()->after('updated_at');
                }
            });

            Schema::table('animals', function (Blueprint $table) {
                if (Schema::hasColumn('animals', 'updated_at')) {
                    $table->index('updated_at', 'idx_animals_updated_at');
                }
                if (Schema::hasColumn('animals', 'deleted_at')) {
                    $table->index('deleted_at', 'idx_animals_deleted_at');
                }
            });
        }

        if (Schema::hasTable('enclosures')) {
            Schema::table('enclosures', function (Blueprint $table) {
                if (! Schema::hasColumn('enclosures', 'updated_at')) {
                    $table->timestamp('updated_at')->nullable()->after('map_y');
                }
                if (! Schema::hasColumn('enclosures', 'deleted_at')) {
                    $table->timestamp('deleted_at')->nullable()->after('updated_at');
                }
            });

            Schema::table('enclosures', function (Blueprint $table) {
                if (Schema::hasColumn('enclosures', 'updated_at')) {
                    $table->index('updated_at', 'idx_enclosures_updated_at');
                }
                if (Schema::hasColumn('enclosures', 'deleted_at')) {
                    $table->index('deleted_at', 'idx_enclosures_deleted_at');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('enclosures')) {
            Schema::table('enclosures', function (Blueprint $table) {
                if (Schema::hasColumn('enclosures', 'deleted_at')) {
                    $table->dropIndex('idx_enclosures_deleted_at');
                }
                if (Schema::hasColumn('enclosures', 'updated_at')) {
                    $table->dropIndex('idx_enclosures_updated_at');
                }
            });

            Schema::table('enclosures', function (Blueprint $table) {
                $drops = [];
                foreach (['deleted_at', 'updated_at'] as $column) {
                    if (Schema::hasColumn('enclosures', $column)) {
                        $drops[] = $column;
                    }
                }
                if ($drops !== []) {
                    $table->dropColumn($drops);
                }
            });
        }

        if (Schema::hasTable('animals')) {
            Schema::table('animals', function (Blueprint $table) {
                if (Schema::hasColumn('animals', 'deleted_at')) {
                    $table->dropIndex('idx_animals_deleted_at');
                }
                if (Schema::hasColumn('animals', 'updated_at')) {
                    $table->dropIndex('idx_animals_updated_at');
                }
            });

            Schema::table('animals', function (Blueprint $table) {
                $drops = [];
                foreach (['deleted_at', 'updated_at'] as $column) {
                    if (Schema::hasColumn('animals', $column)) {
                        $drops[] = $column;
                    }
                }
                if ($drops !== []) {
                    $table->dropColumn($drops);
                }
            });
        }
    }
};