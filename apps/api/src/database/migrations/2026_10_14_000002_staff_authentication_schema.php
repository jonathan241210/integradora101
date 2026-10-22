<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-002: staff-authentication).
     */
    public function up(): void
    {
        // 1. Modificar tabla `departments`
        if (Schema::hasTable('departments')) {
            Schema::table('departments', function (Blueprint $table) {
                if (!Schema::hasColumn('departments', 'code')) {
                    $table->string('code', 50)->unique('uk_departments_code')->after('name');
                }
                if (!Schema::hasColumn('departments', 'is_active')) {
                    $table->tinyInteger('is_active')->default(1)->after('description');
                }
                if (!Schema::hasColumn('departments', 'created_at')) {
                    $table->timestamps();
                }
            });
        }

        // 2. Modificar tabla `users`
        if (Schema::hasTable('users')) {
            // Actualizar FK department_id: CASCADE -> RESTRICT
            $dropFkIfExists = function (string $table, string $fk) {
                $exists = DB::selectOne("
                    SELECT 1 
                    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
                    WHERE TABLE_SCHEMA = DATABASE() 
                      AND TABLE_NAME = ? 
                      AND CONSTRAINT_NAME = ? 
                      AND CONSTRAINT_TYPE = 'FOREIGN KEY'
                ", [$table, $fk]);

                if ($exists) {
                    DB::statement("ALTER TABLE `{$table}` DROP FOREIGN KEY `{$fk}`");
                }
            };

            $dropFkIfExists('users', 'fk_usuarios_admins_area');
            $dropFkIfExists('users', 'fk_users_department_id');

            Schema::table('users', function (Blueprint $table) {
                if (!Schema::hasColumn('users', 'email')) {
                    $table->string('email', 255)->unique('uk_users_email')->after('second_last_name');
                }
                if (!Schema::hasColumn('users', 'is_active')) {
                    $table->tinyInteger('is_active')->default(1)->after('department_id');
                }
                if (!Schema::hasColumn('users', 'remember_token')) {
                    $table->rememberToken()->after('password');
                }
                if (!Schema::hasColumn('users', 'two_factor_secret')) {
                    $table->text('two_factor_secret')->nullable()->after('remember_token');
                    $table->text('two_factor_recovery_codes')->nullable()->after('two_factor_secret');
                    $table->timestamp('two_factor_confirmed_at')->nullable()->after('two_factor_recovery_codes');
                }
                if (!Schema::hasColumn('users', 'created_at')) {
                    $table->timestamps();
                }
                if (!Schema::hasColumn('users', 'deleted_at')) {
                    $table->softDeletes();
                }
                if (!Schema::hasColumn('users', 'created_by')) {
                    $table->integer('created_by')->nullable()->after('deleted_at');
                    $table->integer('updated_by')->nullable()->after('created_by');

                    $table->foreign('created_by', 'fk_users_created_by')->references('id')->on('users')->onDelete('set null');
                    $table->foreign('updated_by', 'fk_users_updated_by')->references('id')->on('users')->onDelete('set null');
                }

                // Recrear FK de department_id con ON DELETE RESTRICT
                $table->foreign('department_id', 'fk_users_department_id')->references('id')->on('departments')->onDelete('restrict');
            });
        }

        // 3. Crear tabla `sessions` (Sanctum cookie sessions)
        if (!Schema::hasTable('sessions')) {
            Schema::create('sessions', function (Blueprint $table) {
                $table->string('id')->primary();
                $table->integer('user_id')->nullable()->index();
                $table->string('ip_address', 45)->nullable();
                $table->text('user_agent')->nullable();
                $table->longText('payload');
                $table->integer('last_activity')->index();
            });
        }

        // 4. Crear tablas de Spatie Permission
        if (!Schema::hasTable('permissions')) {
            Schema::create('permissions', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('name');
                $table->string('guard_name');
                $table->timestamps();

                $table->unique(['name', 'guard_name'], 'uk_permissions_name_guard');
            });
        }

        if (!Schema::hasTable('roles')) {
            Schema::create('roles', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('name');
                $table->string('guard_name');
                $table->timestamps();

                $table->unique(['name', 'guard_name'], 'uk_roles_name_guard');
            });
        }

        if (!Schema::hasTable('model_has_permissions')) {
            Schema::create('model_has_permissions', function (Blueprint $table) {
                $table->unsignedBigInteger('permission_id');
                $table->string('model_type');
                $table->integer('model_id');

                $table->index(['model_id', 'model_type'], 'idx_model_has_permissions_model');
                $table->foreign('permission_id', 'fk_mhp_permission_id')->references('id')->on('permissions')->onDelete('cascade');
                $table->primary(['permission_id', 'model_id', 'model_type'], 'pk_model_has_permissions');
            });
        }

        if (!Schema::hasTable('model_has_roles')) {
            Schema::create('model_has_roles', function (Blueprint $table) {
                $table->unsignedBigInteger('role_id');
                $table->string('model_type');
                $table->integer('model_id');

                $table->index(['model_id', 'model_type'], 'idx_model_has_roles_model');
                $table->foreign('role_id', 'fk_mhr_role_id')->references('id')->on('roles')->onDelete('cascade');
                $table->primary(['role_id', 'model_id', 'model_type'], 'pk_model_has_roles');
            });
        }

        if (!Schema::hasTable('role_has_permissions')) {
            Schema::create('role_has_permissions', function (Blueprint $table) {
                $table->unsignedBigInteger('permission_id');
                $table->unsignedBigInteger('role_id');

                $table->foreign('permission_id', 'fk_rhp_permission_id')->references('id')->on('permissions')->onDelete('cascade');
                $table->foreign('role_id', 'fk_rhp_role_id')->references('id')->on('roles')->onDelete('cascade');
                $table->primary(['permission_id', 'role_id'], 'pk_role_has_permissions');
            });
        }

        // 5. Crear tabla `activity_log` (Spatie Activitylog)
        if (!Schema::hasTable('activity_log')) {
            Schema::create('activity_log', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('log_name')->nullable()->index();
                $table->text('description');
                $table->string('subject_type')->nullable();
                $table->string('event')->nullable();
                $table->string('subject_id')->nullable();
                $table->string('causer_type')->nullable();
                $table->string('causer_id')->nullable();
                $table->json('properties')->nullable();
                $table->char('batch_uuid', 36)->nullable();
                $table->timestamps();

                $table->index(['subject_type', 'subject_id'], 'idx_activity_log_subject');
                $table->index(['causer_type', 'causer_id'], 'idx_activity_log_causer');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // 1. Eliminar tablas creadas
        Schema::dropIfExists('activity_log');
        Schema::dropIfExists('role_has_permissions');
        Schema::dropIfExists('model_has_roles');
        Schema::dropIfExists('model_has_permissions');
        Schema::dropIfExists('roles');
        Schema::dropIfExists('permissions');
        Schema::dropIfExists('sessions');

        // 2. Revertir columnas de `users`
        if (Schema::hasTable('users')) {
            Schema::table('users', function (Blueprint $table) {
                $table->dropForeign('fk_users_department_id');
                $table->dropForeign('fk_users_created_by');
                $table->dropForeign('fk_users_updated_by');

                $table->dropColumn([
                    'email',
                    'is_active',
                    'remember_token',
                    'two_factor_secret',
                    'two_factor_recovery_codes',
                    'two_factor_confirmed_at',
                    'created_at',
                    'updated_at',
                    'deleted_at',
                    'created_by',
                    'updated_by',
                ]);

                // Restaurar FK en CASCADE
                $table->foreign('department_id', 'fk_usuarios_admins_area')->references('id')->on('departments')->onDelete('cascade');
            });
        }

        // 3. Revertir columnas de `departments`
        if (Schema::hasTable('departments')) {
            Schema::table('departments', function (Blueprint $table) {
                $table->dropColumn(['code', 'is_active', 'created_at', 'updated_at']);
            });
        }
    }
};
