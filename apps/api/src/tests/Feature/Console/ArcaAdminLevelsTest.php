<?php

namespace Tests\Feature\Console;

use App\Models\StaffNotification;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Niveles bajo y medio, `demote` y `delete` (api-023, revisión 2026-11-21).
 */
class ArcaAdminLevelsTest extends ConsoleAdminTestCase
{
    /** CA-40 api-023 */
    public function test_ca40_medium_level_needs_typed_email_and_yes_does_not_replace_it(): void
    {
        $admin = $this->createAccount('admin');
        $inactive = $this->createAccount('admin', true, ['is_active' => false]);
        $before = $this->snapshot();
        $prompt = "Para confirmar, escribe el correo afectado ($admin->email)";

        // `--yes` solo no basta (sin terminal).
        $this->artisan('arca:admin:reset-two-factor', ['email' => $admin->email] + $this->unattended())->assertExitCode(0);
        $this->assertSame($before, $this->snapshot());

        // Correo distinto, por opción o escrito: falla sin cambios.
        $this->artisan('arca:admin:reset-two-factor', ['email' => $admin->email, '--confirm-email' => 'otro@test.arca.invalid'] + $this->unattended())
            ->expectsOutputToContain('no coincide')->assertExitCode(1);
        $this->artisan('arca:admin:reset-two-factor', ['email' => $admin->email, '--reason' => self::REASON])
            ->expectsQuestion($prompt, 'otro@test.arca.invalid')->assertExitCode(1);
        $this->artisan('arca:admin:reactivate', ['email' => $inactive->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion("Para confirmar, escribe el correo afectado ($inactive->email)", 'otro@test.arca.invalid')->assertExitCode(1);
        $this->assertFalse((bool) $inactive->fresh()->is_active);
        $this->assertSame($before, $this->snapshot());

        // Escribir el correo (interactivo) o `--confirm-email` coincidente aplica.
        $this->artisan('arca:admin:reset-two-factor', ['email' => $admin->email, '--reason' => self::REASON])
            ->expectsQuestion($prompt, strtoupper($admin->email))->assertExitCode(0);
        $this->artisan('arca:admin:reactivate', ['email' => $inactive->email, '--confirm-email' => $inactive->email] + $this->unattended())->assertExitCode(0);
        $this->assertTrue((bool) $inactive->fresh()->is_active);
        $this->assertSame($before[0] + 2, $this->consoleActivityCount());
    }

    /** CA-41 api-023 */
    public function test_ca41_edit_name_low_level_needs_reason_and_confirmation_and_leaves_trail(): void
    {
        $admin = $this->createAccount('admin');
        $before = $this->snapshot();

        $this->artisan('arca:admin:edit-name', ['email' => $admin->email, '--first-name' => 'Rosa', '--yes' => true, '--no-interaction' => true])
            ->expectsOutputToContain('Indica el motivo del cambio.')->assertExitCode(1);

        $this->artisan('arca:admin:edit-name', ['email' => $admin->email, '--reason' => self::REASON])
            ->expectsQuestion('Nombre', 'Rosa')
            ->expectsQuestion('Primer apellido', 'Nueva')
            ->expectsQuestion('Segundo apellido', 'Segunda')
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'no')->assertExitCode(0);
        $this->assertNotSame('Rosa', $admin->fresh()->first_name);
        $this->assertSame($before, $this->snapshot());

        $this->artisan('arca:admin:edit-name', ['email' => $admin->email, '--reason' => self::REASON])
            ->expectsQuestion('Nombre', 'Rosa')
            ->expectsQuestion('Primer apellido', 'Nueva')
            ->expectsQuestion('Segundo apellido', 'Segunda')
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'yes')->assertExitCode(0);

        $fresh = $admin->fresh();
        $this->assertSame(['Rosa', 'Nueva', 'Segunda'], [$fresh->first_name, $fresh->last_name, $fresh->second_last_name]);
        $this->assertSame($before[0] + 1, $this->consoleActivityCount());
        $this->assertGreaterThan($before[1], $this->consoleNoticeCount());
        $row = DB::table('activity_log')->where('event', 'console-name-edited')->latest('id')->first();
        $this->assertNull($row->causer_id);
        $this->assertSame('consola', json_decode($row->properties, true)['origin']);
    }

    /** CA-42 api-023 */
    public function test_ca42_edit_email_validates_and_warns_when_account_is_primary(): void
    {
        $primary = $this->primary();
        $other = $this->createAccount('admin');
        $deleted = $this->createAccount('cashier');
        $deleted->delete();
        $before = $this->snapshot();

        foreach (['no-es-correo', $other->email, $deleted->email, strtoupper($primary->email)] as $bad) {
            $this->artisan('arca:admin:edit-email', ['email' => $other->email, '--new-email' => $bad, '--confirm-email' => $other->email] + $this->unattended())
                ->assertExitCode(1);
        }
        // Cuenta eliminada como origen.
        $trashedAdmin = $this->createAccount('admin');
        $trashedAdmin->delete();
        $this->artisan('arca:admin:edit-email', ['email' => $trashedAdmin->email, '--new-email' => 'x@test.arca.invalid', '--confirm-email' => $trashedAdmin->email] + $this->unattended())
            ->expectsOutputToContain('eliminada')->assertExitCode(1);
        $this->assertSame($before, $this->snapshot());

        // Cuenta ordinaria: cambia sin aviso del .env.
        $new = 'nuevo-'.bin2hex(random_bytes(4)).'@test.arca.invalid';
        $this->artisan('arca:admin:edit-email', ['email' => $other->email, '--new-email' => $new, '--confirm-email' => $other->email] + $this->unattended())
            ->doesntExpectOutputToContain('ARCA_PRIMARY_ADMIN_EMAIL')->assertExitCode(0);
        $this->assertSame($new, $other->fresh()->email);

        // El titular sí se puede editar y avisa.
        $newPrimary = 'titular-'.bin2hex(random_bytes(4)).'@test.arca.invalid';
        $this->artisan('arca:admin:edit-email', ['email' => $primary->email, '--new-email' => $newPrimary, '--confirm-email' => $primary->email] + $this->unattended())
            ->expectsOutputToContain('Actualiza ARCA_PRIMARY_ADMIN_EMAIL en el .env')->assertExitCode(0);
        $this->assertSame($newPrimary, $primary->fresh()->email);
        $this->assertSame($before[0] + 2, $this->consoleActivityCount());
    }

    /** CA-43 api-023 */
    public function test_ca43_reactivate_only_inactive_non_deleted_admin_accounts(): void
    {
        $active = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier', true, ['is_active' => false]);
        $deleted = $this->createAccount('admin', true, ['is_active' => false]);
        $deleted->delete();
        $inactive = $this->createAccount('admin', true, ['is_active' => false]);
        $before = $this->snapshot();

        foreach ([$active, $cashier, $deleted] as $user) {
            $this->artisan('arca:admin:reactivate', ['email' => $user->email, '--confirm-email' => $user->email] + $this->unattended())->assertExitCode(1);
        }
        $this->assertFalse((bool) $cashier->fresh()->is_active);
        $this->assertSame($before, $this->snapshot());

        $this->artisan('arca:admin:reactivate', ['email' => $inactive->email, '--confirm-email' => $inactive->email] + $this->unattended())->assertExitCode(0);
        $this->assertTrue((bool) $inactive->fresh()->is_active);
        $this->assertGreaterThan($before[1], $this->consoleNoticeCount());
    }

    /** CA-44 api-023 */
    public function test_ca44_demote_removes_admin_and_requires_assignable_role(): void
    {
        $this->primary();
        $target = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $before = $this->snapshot();

        // Rol faltante, `admin` o desconocido; cuenta que no es admin.
        foreach ([[], ['--role' => 'admin'], ['--role' => 'nope']] as $extra) {
            $this->artisan('arca:admin:demote', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true, '--no-interaction' => true] + $extra)
                ->expectsOutputToContain('Indica un rol nuevo válido')->assertExitCode(1);
        }
        $this->artisan('arca:admin:demote', ['email' => $cashier->email, '--role' => 'executive', '--reason' => self::REASON, '--yes' => true])
            ->assertExitCode(1);
        $this->assertTrue($target->fresh()->hasRole('admin'));
        $this->assertSame($before, $this->snapshot());

        $this->artisan('arca:admin:demote', ['email' => $target->email, '--role' => 'executive', '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)->assertExitCode(0);

        $this->assertSame(['executive'], $target->fresh()->getRoleNames()->all());
        $this->assertSame($before[0] + 1, $this->consoleActivityCount());
        $this->assertNotContains($target->id, StaffNotification::query()->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)->pluck('user_id')->all());
    }

    /** CA-46 api-023 */
    public function test_ca46_delete_is_soft_only_for_inactive_non_primary_and_revokes_access(): void
    {
        $primary = $this->primary();
        $active = $this->createAccount('admin');
        $target = $this->createAccount('admin', true, ['is_active' => false]);
        $session = $this->insertSession($target);
        $target->createToken('console-test');
        $before = $this->snapshot();

        // Activa: se rechaza.
        $this->artisan('arca:admin:delete', ['email' => $active->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsOutputToContain('Desactiva la cuenta antes de eliminarla.')->assertExitCode(1);
        $this->assertSame($before, $this->snapshot());

        // Inactiva, no titular: borrado lógico con contraseña del titular.
        $this->artisan('arca:admin:delete', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)->assertExitCode(0);

        $this->assertTrue(User::withTrashed()->whereKey($target->id)->exists());
        $this->assertNotNull(User::withTrashed()->find($target->id)->deleted_at);
        $this->assertNull(User::query()->find($target->id));
        $this->assertFalse(DB::table('sessions')->where('id', $session)->exists());
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $target->id)->count());
        $this->assertSame(1, DB::table('activity_log')->where('event', 'console-deleted')->where('subject_id', $target->id)->count());
        $this->assertSame($before[0] + 1, $this->consoleActivityCount());

        // Ya eliminada: se rechaza.
        $this->artisan('arca:admin:delete', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsOutputToContain('eliminada')->assertExitCode(1);
    }

    /** CA-42 api-023: cambiar el correo revoca sesiones y tokens de la cuenta (revisión de seguridad 2026-11-21). */
    public function test_ca42_edit_email_revokes_sessions_and_tokens(): void
    {
        $admin = $this->createAccount('admin');
        $session = $this->insertSession($admin);
        $admin->createToken('old-device');
        $this->assertSame(1, DB::table('personal_access_tokens')->where('tokenable_id', $admin->id)->count());
        $new = 'nuevo-'.bin2hex(random_bytes(4)).'@test.arca.invalid';

        $this->artisan('arca:admin:edit-email', ['email' => $admin->email, '--new-email' => $new, '--confirm-email' => $admin->email] + $this->unattended())
            ->assertExitCode(0);

        $this->assertSame($new, $admin->fresh()->email);
        $this->assertFalse(DB::table('sessions')->where('id', $session)->exists());
        $this->assertSame(0, DB::table('personal_access_tokens')->where('tokenable_id', $admin->id)->count());
    }
}
