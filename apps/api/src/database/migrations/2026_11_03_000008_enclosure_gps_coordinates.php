<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-008: enclosure-gps-coordinates).
     *
     * Añade coordenadas geográficas y posición en el plano SVG a la tabla enclosures
     * para el posicionamiento real y cálculo geodésico en el mapa de visitantes (mobile-007).
     */
    public function up(): void
    {
        if (Schema::hasTable('enclosures')) {
            Schema::table('enclosures', function (Blueprint $table) {
                if (!Schema::hasColumn('enclosures', 'gps_lat')) {
                    $table->decimal('gps_lat', 10, 8)->nullable()->after('name');
                }
                if (!Schema::hasColumn('enclosures', 'gps_lon')) {
                    $table->decimal('gps_lon', 11, 8)->nullable()->after('gps_lat');
                }
                if (!Schema::hasColumn('enclosures', 'map_x')) {
                    $table->decimal('map_x', 5, 4)->nullable()->after('gps_lon');
                }
                if (!Schema::hasColumn('enclosures', 'map_y')) {
                    $table->decimal('map_y', 5, 4)->nullable()->after('map_x');
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
                $columnsToDrop = [];

                if (Schema::hasColumn('enclosures', 'map_y')) {
                    $columnsToDrop[] = 'map_y';
                }
                if (Schema::hasColumn('enclosures', 'map_x')) {
                    $columnsToDrop[] = 'map_x';
                }
                if (Schema::hasColumn('enclosures', 'gps_lon')) {
                    $columnsToDrop[] = 'gps_lon';
                }
                if (Schema::hasColumn('enclosures', 'gps_lat')) {
                    $columnsToDrop[] = 'gps_lat';
                }

                if (!empty($columnsToDrop)) {
                    $table->dropColumn($columnsToDrop);
                }
            });
        }
    }
};
