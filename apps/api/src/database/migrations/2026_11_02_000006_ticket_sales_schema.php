<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-006: ticket-sales).
     */
    public function up(): void
    {
        // 1. Crear tabla ticket_prices
        if (!Schema::hasTable('ticket_prices')) {
            Schema::create('ticket_prices', function (Blueprint $table) {
                $table->id();
                $table->string('ticket_type', 20); // 'adult' o 'child'
                $table->decimal('amount', 10, 2);
                $table->dateTime('effective_at');
                $table->integer('created_by');
                $table->integer('updated_by')->nullable();
                $table->softDeletes();
                $table->timestamps();

                $table->foreign('created_by', 'fk_ticket_prices_created_by')->references('id')->on('users')->onDelete('restrict');
                $table->foreign('updated_by', 'fk_ticket_prices_updated_by')->references('id')->on('users')->onDelete('set null');

                $table->index(['ticket_type', 'effective_at'], 'idx_ticket_prices_type_effective');
            });

            // Carga inicial aprobada en DBR-006: Adulto $25.00, Niño $16.00
            $defaultAdminId = DB::table('users')->orderBy('id')->value('id') ?? 1;
            $now = now();
            DB::table('ticket_prices')->insert([
                [
                    'ticket_type' => 'adult',
                    'amount' => 25.00,
                    'effective_at' => $now,
                    'created_by' => $defaultAdminId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
                [
                    'ticket_type' => 'child',
                    'amount' => 16.00,
                    'effective_at' => $now,
                    'created_by' => $defaultAdminId,
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            ]);
        }

        // 2. Crear tabla staff_notifications (sin SoftDeletes según resolución de DBR-006)
        if (!Schema::hasTable('staff_notifications')) {
            Schema::create('staff_notifications', function (Blueprint $table) {
                $table->id();
                $table->integer('user_id');
                $table->string('type', 40);
                $table->json('payload');
                $table->unsignedBigInteger('ticket_price_id')->nullable();
                $table->integer('created_by')->nullable();
                $table->dateTime('read_at')->nullable();
                $table->dateTime('acknowledged_at')->nullable();
                $table->timestamps();

                $table->foreign('user_id', 'fk_staff_notif_user_id')->references('id')->on('users')->onDelete('cascade');
                $table->foreign('ticket_price_id', 'fk_staff_notif_price_id')->references('id')->on('ticket_prices')->onDelete('cascade');
                $table->foreign('created_by', 'fk_staff_notif_created_by')->references('id')->on('users')->onDelete('set null');

                $table->index(['user_id', 'acknowledged_at'], 'idx_staff_notif_user_ack');
                $table->index(['user_id', 'read_at'], 'idx_staff_notif_user_read');
                $table->unique(['user_id', 'ticket_price_id'], 'uk_staff_notif_user_price');
            });
        }

        // 3. Agregar columnas y backfill a tickets
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                if (!Schema::hasColumn('tickets', 'status')) {
                    $table->string('status', 20)->default('completed')->after('child_quantity');
                }
                if (!Schema::hasColumn('tickets', 'payment_method')) {
                    $table->string('payment_method', 20)->default('cash')->after('status');
                }
                if (!Schema::hasColumn('tickets', 'adult_unit_price')) {
                    $table->decimal('adult_unit_price', 10, 2)->nullable()->after('payment_method');
                }
                if (!Schema::hasColumn('tickets', 'child_unit_price')) {
                    $table->decimal('child_unit_price', 10, 2)->nullable()->after('adult_unit_price');
                }
                if (!Schema::hasColumn('tickets', 'cancelled_at')) {
                    $table->dateTime('cancelled_at')->nullable()->after('purchased_at');
                }
                if (!Schema::hasColumn('tickets', 'cancelled_by')) {
                    $table->integer('cancelled_by')->nullable()->after('cancelled_at');
                }
                if (!Schema::hasColumn('tickets', 'cancellation_reason')) {
                    $table->string('cancellation_reason', 255)->nullable()->after('cancelled_by');
                }
                if (!Schema::hasColumn('tickets', 'updated_by')) {
                    $table->integer('updated_by')->nullable()->after('cancellation_reason');
                }
                if (!Schema::hasColumn('tickets', 'deleted_at')) {
                    $table->softDeletes()->nullable()->after('updated_by');
                }
            });

            // Backfill en registros existentes según DBR-006 (niños $16, adultos $25, efectivo, completado)
            DB::table('tickets')->whereNull('adult_unit_price')->update(['adult_unit_price' => 25.00]);
            DB::table('tickets')->whereNull('child_unit_price')->update(['child_unit_price' => 16.00]);
            DB::table('tickets')->whereNull('status')->update(['status' => 'completed']);
            DB::table('tickets')->whereNull('payment_method')->update(['payment_method' => 'cash']);

            // Crear claves foráneas e índices en tickets
            Schema::table('tickets', function (Blueprint $table) {
                if (Schema::hasColumn('tickets', 'cancelled_by')) {
                    $table->foreign('cancelled_by', 'fk_tickets_cancelled_by')->references('id')->on('users')->onDelete('set null');
                }
                if (Schema::hasColumn('tickets', 'updated_by')) {
                    $table->foreign('updated_by', 'fk_tickets_updated_by')->references('id')->on('users')->onDelete('set null');
                }

                $table->unique('qr_code', 'tickets_qr_code_unique');
                $table->index(['cashier_id', 'purchased_at'], 'idx_tickets_cashier_purchased');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Revertir cambios en tickets
        if (Schema::hasTable('tickets')) {
            Schema::table('tickets', function (Blueprint $table) {
                // Drop FKs
                $table->dropForeign('fk_tickets_cancelled_by');
                $table->dropForeign('fk_tickets_updated_by');

                // Drop Índices
                $table->dropUnique('tickets_qr_code_unique');
                $table->dropIndex('idx_tickets_cashier_purchased');

                // Drop SoftDeletes
                if (Schema::hasColumn('tickets', 'deleted_at')) {
                    $table->dropSoftDeletes();
                }

                // Drop columnas agregadas
                $columns = [
                    'status',
                    'payment_method',
                    'adult_unit_price',
                    'child_unit_price',
                    'cancelled_at',
                    'cancelled_by',
                    'cancellation_reason',
                    'updated_by',
                ];
                foreach ($columns as $column) {
                    if (Schema::hasColumn('tickets', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }

        // 2. Revertir staff_notifications
        Schema::dropIfExists('staff_notifications');

        // 3. Revertir ticket_prices
        Schema::dropIfExists('ticket_prices');
    }
};
