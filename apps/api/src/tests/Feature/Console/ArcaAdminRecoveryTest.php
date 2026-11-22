<?php

namespace Tests\Feature\Console;

use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Modo recuperación de la consola (api-023, revisión 2026-11-21).
 */
class ArcaAdminRecoveryTest extends ConsoleAdminTestCase
{
    /** CA-47 api-023 */
    public function test_ca47_recovery_is_off_by_default_and_resets_primary_without_password_when_on(): void
    {
        $this->assertFalse(config('arca.admin_recovery'));

        $primary = $this->primary();
        $other = $this->createAccount('admin');
        $new = 'Recuperada!Segura88';
        $prompt = "Para confirmar, escribe el correo afectado ($primary->email)";

        // Desactivado: pide la contraseña del titular, no el correo.
        $this->artisan('arca:admin:reset-password', ['email' => $primary->email, '--reason' => self::REASON])
            ->expectsQuestion(self::PRIMARY_PROMPT, 'incorrecta')->assertExitCode(1);

        config(['arca.admin_recovery' => true]);

        // Activo: sin contraseña del titular; confirma escribiendo el correo, y se audita como recuperación.
        $this->artisan('arca:admin:reset-password', ['email' => $primary->email, '--reason' => self::REASON])
            ->expectsQuestion('Contraseña nueva', $new)
            ->expectsQuestion('Confirma la contraseña nueva', $new)
            ->expectsQuestion($prompt, $primary->email)
            ->assertExitCode(0);
        $this->assertTrue(password_verify($new, $primary->fresh()->password));
        $row = DB::table('activity_log')->where('event', 'console-recovery-password-reset')->latest('id')->first();
        $this->assertNotNull($row);
        $this->assertNull($row->causer_id);
        $this->assertSame('recuperación', json_decode($row->properties, true)['mode']);
        $this->assertStringContainsString('Recuperación', json_decode($row->properties, true)['action']);
        $this->assertStringNotContainsString($new, $row->properties);

        // Solo el titular: otra cuenta, o `promote`, siguen pidiendo la contraseña.
        $this->artisan('arca:admin:reset-password', ['email' => $other->email, '--reason' => self::REASON])
            ->expectsQuestion(self::PRIMARY_PROMPT, 'incorrecta')->assertExitCode(1);
        $target = $this->createAccount('cashier');
        $this->artisan('arca:admin:promote', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, 'incorrecta')->assertExitCode(1);
        $this->assertFalse($target->fresh()->hasRole('admin'));
    }

    /** CA-47 api-023: `create` en recuperación solo si no hay ningún admin activo. */
    public function test_ca47_recovery_create_only_when_no_active_admin(): void
    {
        $this->seedRoles();
        config(['arca.admin_recovery' => true, 'arca.primary_admin_email' => null]);
        $department = Department::query()->where('is_active', true)->orderBy('name')->firstOrFail();
        $choices = Department::query()->where('is_active', true)->orderBy('name')->pluck('name')->all();
        $email = 'rescate-'.bin2hex(random_bytes(4)).'@test.arca.invalid';
        $password = 'SafePassphrase12!';

        // Con admins activos: pide titular (aquí no hay titular configurado: falla).
        $this->artisan('arca:admin:create', ['--reason' => self::REASON])
            ->expectsOutputToContain('ARCA_PRIMARY_ADMIN_EMAIL')->assertExitCode(1);

        User::query()->role('admin')->update(['is_active' => false]);

        $this->artisan('arca:admin:create', ['--reason' => self::REASON])
            ->expectsQuestion('Correo institucional', $email)
            ->expectsQuestion('Nombre', 'Rescate')
            ->expectsQuestion('Primer apellido', 'Consola')
            ->expectsQuestion('Segundo apellido', '')
            ->expectsChoice('Área', $department->name, $choices)
            ->expectsQuestion('Contraseña', $password)
            ->expectsQuestion('Confirma la contraseña', $password)
            ->expectsQuestion("Para confirmar, escribe el correo afectado ($email)", $email)
            ->assertExitCode(0);

        $this->assertTrue(User::query()->where('email', $email)->firstOrFail()->hasRole('admin'));
        $this->assertSame(1, DB::table('activity_log')->where('event', 'console-recovery-created')->count());
    }

    /** CA-48 api-023 */
    public function test_ca48_every_admin_command_shows_recovery_notice_only_when_active(): void
    {
        $notice = 'Modo recuperación activo: desactívalo al terminar (ARCA_ADMIN_RECOVERY=false).';

        $this->artisan('arca:admin:list')->doesntExpectOutputToContain($notice)->assertExitCode(0);

        config(['arca.admin_recovery' => true]);
        $admin = $this->createAccount('admin');

        $this->artisan('arca:admin:list')->expectsOutputToContain($notice)->assertExitCode(0);
        foreach (['edit-name', 'edit-email', 'reactivate', 'reset-two-factor', 'promote', 'demote', 'deactivate', 'delete', 'reset-password'] as $name) {
            $this->artisan("arca:admin:$name", ['email' => $admin->email, '--no-interaction' => true])
                ->expectsOutputToContain($notice)->run();
        }
        $this->artisan('arca:admin:create', ['--no-interaction' => true])->expectsOutputToContain($notice)->run();
    }
}
