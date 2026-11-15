<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-018: visitor-favorite-species).
     *
     * Crea la tabla de favoritos por cuenta (pareja visitante-especie publicada)
     * (api-018 / mobile-014). Sin SoftDeletes ni created_by/updated_by: preferencia
     * de cuenta, no dato clínico ni financiero. La visibilidad de la especie la
     * aplica la API (api-015), no esta tabla. Depende de visitors y species.
     */
    public function up(): void
    {
        if (! Schema::hasTable('visitor_favorite_species')) {
            Schema::create('visitor_favorite_species', function (Blueprint $table) {
                $table->id();
                $table->integer('visitor_id');
                $table->integer('species_id');
                $table->timestamp('created_at')->nullable();
                $table->timestamp('updated_at')->nullable();

                $table->unique(
                    ['visitor_id', 'species_id'],
                    'uk_visitor_favorite_species_pair'
                );

                $table->foreign('visitor_id', 'fk_visitor_favorite_species_visitor_id')
                    ->references('id')->on('visitors')->onDelete('cascade');
                $table->foreign('species_id', 'fk_visitor_favorite_species_species_id')
                    ->references('id')->on('species')->onDelete('restrict');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visitor_favorite_species');
    }
};