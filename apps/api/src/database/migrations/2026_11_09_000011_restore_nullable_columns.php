<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-011: nullable-columns-restore).
     * Relaja a NULL cinco columnas para alinear la base con el comportamiento
     * esperado por factories, tests y código de la API.
     */
    public function up(): void
    {
        // 1. news.author_id
        if (Schema::hasTable('news') && Schema::hasColumn('news', 'author_id')) {
            Schema::table('news', function (Blueprint $table) {
                $table->integer('author_id')->nullable()->change();
            });
        }

        // 2. events.author_id
        if (Schema::hasTable('events') && Schema::hasColumn('events', 'author_id')) {
            Schema::table('events', function (Blueprint $table) {
                $table->integer('author_id')->nullable()->change();
            });
        }

        // 3. visitors.last_name
        if (Schema::hasTable('visitors') && Schema::hasColumn('visitors', 'last_name')) {
            Schema::table('visitors', function (Blueprint $table) {
                $table->string('last_name', 100)->nullable()->change();
            });
        }

        // 4. animals.tag_number
        if (Schema::hasTable('animals') && Schema::hasColumn('animals', 'tag_number')) {
            Schema::table('animals', function (Blueprint $table) {
                $table->string('tag_number', 50)->nullable()->change();
            });
        }

        // 5. species.scientific_name
        if (Schema::hasTable('species') && Schema::hasColumn('species', 'scientific_name')) {
            Schema::table('species', function (Blueprint $table) {
                $table->string('scientific_name', 150)->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     * Solo revierte a NOT NULL si ninguna fila contiene NULL.
     */
    public function down(): void
    {
        // 1. news.author_id
        if (Schema::hasTable('news') && Schema::hasColumn('news', 'author_id')) {
            if (DB::table('news')->whereNull('author_id')->count() === 0) {
                Schema::table('news', function (Blueprint $table) {
                    $table->integer('author_id')->nullable(false)->change();
                });
            }
        }

        // 2. events.author_id
        if (Schema::hasTable('events') && Schema::hasColumn('events', 'author_id')) {
            if (DB::table('events')->whereNull('author_id')->count() === 0) {
                Schema::table('events', function (Blueprint $table) {
                    $table->integer('author_id')->nullable(false)->change();
                });
            }
        }

        // 3. visitors.last_name
        if (Schema::hasTable('visitors') && Schema::hasColumn('visitors', 'last_name')) {
            if (DB::table('visitors')->whereNull('last_name')->count() === 0) {
                Schema::table('visitors', function (Blueprint $table) {
                    $table->string('last_name', 100)->nullable(false)->change();
                });
            }
        }

        // 4. animals.tag_number
        if (Schema::hasTable('animals') && Schema::hasColumn('animals', 'tag_number')) {
            if (DB::table('animals')->whereNull('tag_number')->count() === 0) {
                Schema::table('animals', function (Blueprint $table) {
                    $table->string('tag_number', 50)->nullable(false)->change();
                });
            }
        }

        // 5. species.scientific_name
        if (Schema::hasTable('species') && Schema::hasColumn('species', 'scientific_name')) {
            if (DB::table('species')->whereNull('scientific_name')->count() === 0) {
                Schema::table('species', function (Blueprint $table) {
                    $table->string('scientific_name', 150)->nullable(false)->change();
                });
            }
        }
    }
};
