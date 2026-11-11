<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-012: visitor-memories).
     *
     * Crea las tablas de peticiones de «Momentos para recordar» y su historial de
     * revisiones (api-010). La opinión es opcional y los campos rechazados se
     * guardan como dos booleanos; la API sigue exponiendo `rejected_fields` como
     * lista. No se fija charset/collation: se usa el default de la conexión
     * (`utf8mb4_unicode_ci`), igual que las demás tablas creadas por migraciones.
     */
    public function up(): void
    {
        // 1. Crear tabla visitor_memories
        if (! Schema::hasTable('visitor_memories')) {
            Schema::create('visitor_memories', function (Blueprint $table) {
                $table->id();
                $table->integer('visitor_id')->nullable();
                $table->string('status', 20)->default('submitted');
                $table->string('opinion', 300)->nullable();
                $table->string('image_path', 255)->nullable();
                $table->char('image_sha256', 64)->nullable();
                $table->string('published_image_path', 255)->nullable();
                $table->timestamp('consent_at');
                $table->string('terms_version', 20);
                $table->string('rejection_reason', 500)->nullable();
                $table->boolean('rejected_image')->default(false);
                $table->boolean('rejected_content')->default(false);
                $table->integer('resubmitted_count')->default(0);
                $table->integer('reviewed_by')->nullable();
                $table->timestamp('reviewed_at')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->timestamp('published_until')->nullable();
                $table->softDeletes();
                $table->timestamps();

                $table->foreign('visitor_id', 'fk_visitor_memories_visitor_id')->references('id')->on('visitors')->onDelete('set null');
                $table->foreign('reviewed_by', 'fk_visitor_memories_reviewed_by')->references('id')->on('users')->onDelete('restrict');

                $table->index(['status', 'published_until', 'published_at', 'id'], 'idx_visitor_memories_status_publication');
                $table->index(['status', 'created_at'], 'idx_visitor_memories_status_created');
                $table->index(['visitor_id', 'created_at'], 'idx_visitor_memories_visitor_created');
                $table->index(['visitor_id', 'status'], 'idx_visitor_memories_visitor_status');
            });
        }

        // 2. Crear tabla visitor_memory_reviews (historial de decisiones)
        if (! Schema::hasTable('visitor_memory_reviews')) {
            Schema::create('visitor_memory_reviews', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('visitor_memory_id');
                $table->string('decision', 20);
                $table->string('rejection_reason', 500)->nullable();
                $table->boolean('rejected_image')->default(false);
                $table->boolean('rejected_content')->default(false);
                $table->integer('reviewed_by');
                $table->timestamp('reviewed_at');
                $table->softDeletes();
                $table->timestamps();

                $table->foreign('visitor_memory_id', 'fk_visitor_memory_reviews_visitor_memory_id')->references('id')->on('visitor_memories')->onDelete('restrict');
                $table->foreign('reviewed_by', 'fk_visitor_memory_reviews_reviewed_by')->references('id')->on('users')->onDelete('restrict');

                $table->index(['visitor_memory_id', 'reviewed_at'], 'idx_visitor_memory_reviews_memory_reviewed');
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * Solo se ejecuta en un ambiente sin peticiones registradas. Con datos, el
     * responsable de BD decide y no borra sin respaldo; las filas de negocio no
     * se eliminan físicamente (Constitución V).
     */
    public function down(): void
    {
        Schema::dropIfExists('visitor_memory_reviews');
        Schema::dropIfExists('visitor_memories');
    }
};
