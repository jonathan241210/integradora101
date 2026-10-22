<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations (DBR-003: visitor-accounts).
     */
    public function up(): void
    {
        // 1. Modificar tabla `visitors`
        if (Schema::hasTable('visitors')) {
            Schema::table('visitors', function (Blueprint $table) {
                // Hacer nickname obligatorio
                $table->string('nickname', 100)->nullable(false)->change();

                if (!Schema::hasColumn('visitors', 'email_verified_at')) {
                    $table->timestamp('email_verified_at')->nullable()->after('email');
                }
                if (!Schema::hasColumn('visitors', 'avatar_code')) {
                    $table->string('avatar_code', 50)->after('second_last_name');
                }
                if (!Schema::hasColumn('visitors', 'adult_confirmed_at')) {
                    $table->timestamp('adult_confirmed_at')->after('avatar_code');
                }
                if (!Schema::hasColumn('visitors', 'privacy_notice_version')) {
                    $table->string('privacy_notice_version', 20)->after('adult_confirmed_at');
                }
                if (!Schema::hasColumn('visitors', 'privacy_accepted_at')) {
                    $table->timestamp('privacy_accepted_at')->after('privacy_notice_version');
                }
                if (!Schema::hasColumn('visitors', 'last_login_at')) {
                    $table->timestamp('last_login_at')->nullable()->after('password');
                }
                if (!Schema::hasColumn('visitors', 'created_at')) {
                    $table->timestamps();
                }
            });
        }

        // 2. Crear tabla `personal_access_tokens` (Sanctum estándar para móviles)
        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->string('tokenable_type');
                $table->unsignedBigInteger('tokenable_id');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();

                $table->index(['tokenable_type', 'tokenable_id'], 'personal_access_tokens_tokenable_type_tokenable_id_index');
            });
        }

        // 3. Crear tabla `visitor_refresh_tokens` (Refresh tokens rotatorios para la app móvil)
        if (!Schema::hasTable('visitor_refresh_tokens')) {
            Schema::create('visitor_refresh_tokens', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->integer('visitor_id');
                $table->char('family_id', 36);
                $table->char('token_hash', 64)->unique('uk_visitor_refresh_tokens_token_hash');
                $table->string('device_name', 100)->nullable();
                $table->timestamp('expires_at');
                $table->timestamp('revoked_at')->nullable();
                $table->unsignedBigInteger('replaced_by_id')->nullable();
                $table->timestamp('created_at')->nullable();

                $table->index('visitor_id', 'idx_visitor_refresh_tokens_visitor_id');
                $table->index('family_id', 'idx_visitor_refresh_tokens_family_id');

                $table->foreign('visitor_id', 'fk_vrt_visitor_id')->references('id')->on('visitors')->onDelete('cascade');
                $table->foreign('replaced_by_id', 'fk_vrt_replaced_by_id')->references('id')->on('visitor_refresh_tokens')->onDelete('set null');
            });
        }

        // 4. Crear tabla `visitor_verification_codes` (Códigos OTP de 6 dígitos)
        if (!Schema::hasTable('visitor_verification_codes')) {
            Schema::create('visitor_verification_codes', function (Blueprint $table) {
                $table->bigIncrements('id');
                $table->integer('visitor_id');
                $table->string('purpose', 30);
                $table->string('code_hash', 255);
                $table->timestamp('expires_at');
                $table->tinyInteger('attempts')->default(0);
                $table->timestamp('consumed_at')->nullable();
                $table->timestamp('created_at')->nullable();

                $table->index(['visitor_id', 'purpose'], 'idx_vvc_visitor_purpose');
                $table->foreign('visitor_id', 'fk_vvc_visitor_id')->references('id')->on('visitors')->onDelete('cascade');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('visitor_verification_codes');
        Schema::dropIfExists('visitor_refresh_tokens');
        Schema::dropIfExists('personal_access_tokens');

        if (Schema::hasTable('visitors')) {
            Schema::table('visitors', function (Blueprint $table) {
                $table->string('nickname', 100)->nullable(true)->change();

                $table->dropColumn([
                    'email_verified_at',
                    'avatar_code',
                    'adult_confirmed_at',
                    'privacy_notice_version',
                    'privacy_accepted_at',
                    'last_login_at',
                    'created_at',
                    'updated_at',
                ]);
            });
        }
    }
};
