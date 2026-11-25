<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('species', 'model_3d_enabled')) {
            Schema::table('species', function (Blueprint $table): void {
                $table->boolean('model_3d_enabled')
                    ->default(true)
                    ->after('model_3d_path');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('species', 'model_3d_enabled')) {
            Schema::table('species', function (Blueprint $table): void {
                $table->dropColumn('model_3d_enabled');
            });
        }
    }
};