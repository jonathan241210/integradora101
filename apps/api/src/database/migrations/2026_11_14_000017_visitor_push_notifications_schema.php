<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-017: visitor-push-notifications).
     *
     * Crea preferencias, tokens push del visitante y despachos anti-duplicado
     * (api-017 / mobile-013). Sin SoftDeletes ni created_by/updated_by: excepción
     * documentada (preferencias/tokens no clínicos ni financieros; dispatch sin
     * datos personales para idempotencia). La migración la crea y prueba BD en
     * MySQL 8.0 aislado; no se aplica en arca_zoo para pruebas.
     */
    public function up(): void
    {
        if (! Schema::hasTable('visitor_notification_preferences')) {
            Schema::create('visitor_notification_preferences', function (Blueprint $table) {
                $table->integer('visitor_id')->primary();
                $table->boolean('news_and_events')->default(false);
                $table->boolean('memory_status')->default(true);
                $table->timestamp('created_at')->nullable();
                $table->timestamp('updated_at')->nullable();

                $table->foreign('visitor_id', 'fk_visitor_notification_preferences_visitor_id')
                    ->references('id')->on('visitors')->onDelete('cascade');
            });
        }

        if (! Schema::hasTable('visitor_push_tokens')) {
            Schema::create('visitor_push_tokens', function (Blueprint $table) {
                $table->id();
                $table->integer('visitor_id');
                $table->string('token', 255);
                $table->string('platform', 16);
                $table->timestamp('created_at')->nullable();
                $table->timestamp('updated_at')->nullable();

                $table->unique('token', 'uk_visitor_push_tokens_token');
                $table->index('visitor_id', 'idx_visitor_push_tokens_visitor_id');
                $table->foreign('visitor_id', 'fk_visitor_push_tokens_visitor_id')
                    ->references('id')->on('visitors')->onDelete('cascade');
            });
        }

        if (! Schema::hasTable('push_dispatches')) {
            Schema::create('push_dispatches', function (Blueprint $table) {
                $table->id();
                $table->string('subject_type', 20);
                $table->unsignedBigInteger('subject_id');
                $table->string('transition_key', 64);
                $table->string('status', 20)->default('pending');
                $table->timestamp('created_at')->nullable();
                $table->timestamp('updated_at')->nullable();

                $table->unique(
                    ['subject_type', 'subject_id', 'transition_key'],
                    'uk_push_dispatches_subject'
                );
            });
        }
    }

    /**
     * Reverse the migrations.
     *
     * Orden inverso por dependencias. Solo en ambiente sin datos que deban
     * conservarse y con respaldo previo decidido por BD.
     */
    public function down(): void
    {
        Schema::dropIfExists('push_dispatches');
        Schema::dropIfExists('visitor_push_tokens');
        Schema::dropIfExists('visitor_notification_preferences');
    }
};