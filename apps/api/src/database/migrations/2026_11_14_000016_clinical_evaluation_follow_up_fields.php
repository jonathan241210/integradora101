<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * DBR-016: campos de seguimiento en evaluaciones clínicas
     * (follow_up_status, next_review_date, is_follow_up).
     */
    public function up(): void
    {
        if (! Schema::hasTable('clinical_evaluations')) {
            return;
        }

        Schema::table('clinical_evaluations', function (Blueprint $table) {
            if (! Schema::hasColumn('clinical_evaluations', 'follow_up_status')) {
                $column = $table->string('follow_up_status', 50)->nullable();
                if (Schema::hasColumn('clinical_evaluations', 'destination_ruling')) {
                    $column->after('destination_ruling');
                }
            }

            if (! Schema::hasColumn('clinical_evaluations', 'next_review_date')) {
                $column = $table->date('next_review_date')->nullable();
                if (Schema::hasColumn('clinical_evaluations', 'follow_up_status')) {
                    $column->after('follow_up_status');
                }
            }

            if (! Schema::hasColumn('clinical_evaluations', 'is_follow_up')) {
                $column = $table->boolean('is_follow_up')->default(false);
                if (Schema::hasColumn('clinical_evaluations', 'next_review_date')) {
                    $column->after('next_review_date');
                }
            }
        });
    }

    /**
     * Reversión estructural (pierde datos de seguimiento estructurados).
     */
    public function down(): void
    {
        if (! Schema::hasTable('clinical_evaluations')) {
            return;
        }

        Schema::table('clinical_evaluations', function (Blueprint $table) {
            $drops = [];

            foreach (['is_follow_up', 'next_review_date', 'follow_up_status'] as $column) {
                if (Schema::hasColumn('clinical_evaluations', $column)) {
                    $drops[] = $column;
                }
            }

            if ($drops !== []) {
                $table->dropColumn($drops);
            }
        });
    }
};