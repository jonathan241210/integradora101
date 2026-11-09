<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-010: news-image-column-restore).
     */
    public function up(): void
    {
        if (Schema::hasTable('news')) {
            Schema::table('news', function (Blueprint $table) {
                if (Schema::hasColumn('news', 'imagen_noticia') && !Schema::hasColumn('news', 'image_path')) {
                    $table->renameColumn('imagen_noticia', 'image_path');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('news')) {
            Schema::table('news', function (Blueprint $table) {
                if (Schema::hasColumn('news', 'image_path') && !Schema::hasColumn('news', 'imagen_noticia')) {
                    $table->renameColumn('image_path', 'imagen_noticia');
                }
            });
        }
    }
};
