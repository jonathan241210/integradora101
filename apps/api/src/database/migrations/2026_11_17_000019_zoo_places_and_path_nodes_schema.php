<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-019: zoo-places-and-path-nodes).
     *
     * Crea zoo_places y path_nodes con GPS/SVG normalizado (nullable).
     * path_edges queda fuera (fase 2). Catálogos cerrados documentados en DBR/spec;
     * validación en app y, si BD lo define, ENUM/CHECK/tabla catálogo.
     * Sin unicidad por name (repetidos en puntos distintos); unicidad por id estable.
     */
    public function up(): void
    {
        if (! Schema::hasTable('zoo_places')) {
            Schema::create('zoo_places', function (Blueprint $table) {
                $table->increments('id');
                $table->string('name', 255);
                $table->string('name_original', 255)->nullable();
                $table->string('place_type', 50);
                $table->decimal('gps_lat', 10, 8)->nullable();
                $table->decimal('gps_lon', 11, 8)->nullable();
                $table->decimal('map_x', 5, 4)->nullable();
                $table->decimal('map_y', 5, 4)->nullable();
                $table->boolean('is_visible')->default(true);
                $table->timestamps();
                $table->softDeletes();

                $table->index('place_type', 'idx_zoo_places_type');
                $table->index('is_visible', 'idx_zoo_places_visible');
            });
        }

        if (! Schema::hasTable('path_nodes')) {
            Schema::create('path_nodes', function (Blueprint $table) {
                $table->increments('id');
                $table->string('name', 255)->nullable();
                $table->string('node_type', 50);
                $table->decimal('gps_lat', 10, 8)->nullable();
                $table->decimal('gps_lon', 11, 8)->nullable();
                $table->decimal('map_x', 5, 4)->nullable();
                $table->decimal('map_y', 5, 4)->nullable();
                $table->timestamps();
                $table->softDeletes();

                $table->index('node_type', 'idx_path_nodes_type');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('path_nodes');
        Schema::dropIfExists('zoo_places');
    }
};