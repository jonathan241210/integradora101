<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-013: species-requests / species publication requests).
     *
     * Crea la tabla de solicitudes de publicación de especies existentes
     * (api-014) y añade a `species` las columnas de publicación/ficha pública
     * (api-015). No duplica `common_name` ni crea especies al aceptar: la
     * solicitud referencia una especie existente (species_id NOT NULL).
     *
     * Decisiones registradas en DBR-013 (2026-11-12):
     * - 2a: origin se mapea a species.distribution (no se crea species.origin).
     * - 2b: foto pública en species.image_path.
     * - 2c: tabla delgada species_publication_requests.
     * - 7: published_fields en JSON (solicitud NOT NULL, species NULL).
     * - 13: se añade deleted_at a species (SoftDeletes).
     * - 14: unicidad de solicitud submitted por especie mediante columna generada.
     * - 15/17: se guarda unpublished_at y se crea índice (is_published, unpublished_at).
     * - 16: category nullable en la solicitud (NULL = sin corrección).
     *
     * No se fija charset/collation: se usa el default de la conexión
     * (utf8mb4_unicode_ci), igual que las demás tablas creadas por migraciones.
     */
    public function up(): void
    {
        // 1. Columnas de publicación en species (tabla existente)
        Schema::table('species', function (Blueprint $table) {
            if (! Schema::hasColumn('species', 'is_published')) {
                $table->boolean('is_published')->default(false)->after('model_3d_path');
            }
            if (! Schema::hasColumn('species', 'published_at')) {
                $table->timestamp('published_at')->nullable()->after('is_published');
            }
            if (! Schema::hasColumn('species', 'unpublished_at')) {
                $table->timestamp('unpublished_at')->nullable()->after('published_at');
            }
            if (! Schema::hasColumn('species', 'image_path')) {
                $table->string('image_path', 255)->nullable()->after('unpublished_at');
            }
            if (! Schema::hasColumn('species', 'published_fields')) {
                $table->json('published_fields')->nullable()->after('image_path');
            }
            if (! Schema::hasColumn('species', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('species', function (Blueprint $table) {
            // Índices de lectura/publicación (idempotencia básica por nombre no disponible en Blueprint;
            // se asume migración aplicada una sola vez por ambiente).
            $table->index('is_published', 'idx_species_is_published');
            $table->index(['is_published', 'unpublished_at'], 'idx_species_is_published_unpublished_at');
        });

        // 2. Tabla de solicitudes de publicación de especie existente
        if (! Schema::hasTable('species_publication_requests')) {
            Schema::create('species_publication_requests', function (Blueprint $table) {
                $table->id();
                $table->integer('species_id');
                $table->string('request_type', 10);
                $table->string('scientific_name', 150)->nullable();
                $table->string('habitat', 150)->nullable();
                $table->string('origin', 150)->nullable();
                $table->string('category', 30)->nullable();
                $table->string('image_path', 255)->nullable();
                $table->json('published_fields');
                $table->string('status', 20)->default('submitted');
                $table->string('rejection_reason', 500)->nullable();
                $table->integer('created_by');
                $table->integer('updated_by')->nullable();
                $table->integer('reviewed_by')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->softDeletes();
                $table->timestamps();

                // Pregunta 14: a lo sumo una solicitud submitted por especie (MySQL 8.0, índice único sobre columna generada).
                $table->integer('submitted_species_id')->nullable()->storedAs("IF(status = 'submitted', species_id, NULL)");

                $table->foreign('species_id', 'fk_species_publication_requests_species_id')->references('id')->on('species')->onDelete('restrict');
                $table->foreign('created_by', 'fk_species_publication_requests_created_by')->references('id')->on('users')->onDelete('restrict');
                $table->foreign('updated_by', 'fk_species_publication_requests_updated_by')->references('id')->on('users')->onDelete('restrict');
                $table->foreign('reviewed_by', 'fk_species_publication_requests_reviewed_by')->references('id')->on('users')->onDelete('restrict');

                $table->index(['status', 'created_at'], 'idx_species_publication_requests_status_created');
                $table->index(['species_id', 'status'], 'idx_species_publication_requests_species_status');
                $table->unique('submitted_species_id', 'uq_species_publication_requests_submitted_species');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * Solo se ejecuta en un ambiente sin solicitudes registradas. Con datos, el
     * responsable de BD decide y no borra sin respaldo; las filas de negocio no
     * se eliminan físicamente (Constitución V).
     */
    public function down(): void
    {
        Schema::dropIfExists('species_publication_requests');

        Schema::table('species', function (Blueprint $table) {
            $table->dropIndex('idx_species_is_published');
            $table->dropIndex('idx_species_is_published_unpublished_at');
        });

        Schema::table('species', function (Blueprint $table) {
            $columns = ['is_published', 'published_at', 'unpublished_at', 'image_path', 'published_fields', 'deleted_at'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('species', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
