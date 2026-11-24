<?php

namespace Tests\Feature\Console;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Admin titular y contraseña de nivel alto (api-023, revisión 2026-11-21).
 */
class ArcaAdminPrimaryTest extends ConsoleAdminTestCase
{
    /** CA-37 api-023 */
    public function test_ca37_high_level_commands_fail_without_active_primary_admin(): void
    {
        $target = $this->createAccount('cashier');
        $admin = $this->createAccount('admin');
        $inactiveAdmin = $this->createAccount('admin', true, ['is_active' => false]);
        $before = $this->snapshot();

        // Sin variable configurada.
        config(['arca.primary_admin_email' => null]);
        foreach ($this->highLevelRuns($target, $admin) as [$command, $args]) {
            $this->artisan($command, $args)->expectsOutputToContain('ARCA_PRIMARY_ADMIN_EMAIL')->assertExitCode(1);
        }

        // Correo que no es un admin activo (inactivo, inexistente y de otro rol).
        foreach ([$inactiveAdmin->email, 'nadie@test.arca.invalid', $target->email] as $email) {
            config(['arca.primary_admin_email' => $email]);
            foreach ($this->highLevelRuns($target, $admin) as [$command, $args]) {
                $this->artisan($command, $args)->expectsOutputToContain('no es un administrador activo')->assertExitCode(1);
            }
        }

        $this->assertFalse($target->fresh()->hasRole('admin'));
        $this->assertTrue((bool) $admin->fresh()->is_active);
        $this->assertSame($before, $this->snapshot());
    }

    /** @return list<array{string, array<string, mixed>}> */
    private function highLevelRuns(User $target, User $admin): array
    {
        $inactive = $this->createAccount('admin', true, ['is_active' => false]);

        return [
            ['arca:admin:promote', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true]],
            ['arca:admin:deactivate', ['email' => $admin->email, '--reason' => self::REASON, '--yes' => true]],
            ['arca:admin:demote', ['email' => $admin->email, '--role' => 'cashier', '--reason' => self::REASON, '--yes' => true]],
            ['arca:admin:delete', ['email' => $inactive->email, '--reason' => self::REASON, '--yes' => true]],
            ['arca:admin:reset-password', ['email' => $admin->email, '--reason' => self::REASON, '--yes' => true]],
            ['arca:admin:create', ['--reason' => self::REASON, '--yes' => true]],
        ];
    }

    /** CA-38 api-023 */
    public function test_ca38_high_level_asks_primary_password_also_on_own_account(): void
    {
        $primary = $this->primary();
        $target = $this->createAccount('cashier');
        $before = $this->snapshot();

        // Contraseña incorrecta: sin cambios, solo se audita el fallo.
        $this->artisan('arca:admin:promote', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, 'incorrecta')
            ->expectsOutputToContain('Contraseña del administrador titular incorrecta.')
            ->assertExitCode(1);
        $this->assertFalse($target->fresh()->hasRole('admin'));
        $this->assertSame($before[1], $this->consoleNoticeCount());

        // Correcta: aplica.
        $this->artisan('arca:admin:promote', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)->assertExitCode(0);
        $this->assertTrue($target->fresh()->hasRole('admin'));

        // También sobre la propia cuenta del titular (reset-password).
        $new = 'OtraClave!Segura77';
        $this->artisan('arca:admin:reset-password', ['email' => $primary->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, 'incorrecta')->assertExitCode(1);
        $this->assertTrue(password_verify(self::PRIMARY_PASSWORD, $primary->fresh()->password));

        $this->artisan('arca:admin:reset-password', ['email' => $primary->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)
            ->expectsQuestion('Contraseña nueva', $new)
            ->expectsQuestion('Confirma la contraseña nueva', $new)
            ->assertExitCode(0);
        $this->assertTrue(password_verify($new, $primary->fresh()->password));
    }

    /** CA-39 api-023 */
    public function test_ca39_five_failures_lock_high_level_commands_and_are_audited_without_password(): void
    {
        $this->primary();
        $target = $this->createAccount('cashier');

        for ($i = 0; $i < 5; $i++) {
            $this->artisan('arca:admin:promote', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true])
                ->expectsQuestion(self::PRIMARY_PROMPT, 'mala-clave-'.$i)->assertExitCode(1);
        }

        // Bloqueado: ni siquiera pregunta la contraseña, aunque sea correcta.
        $this->artisan('arca:admin:promote', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsOutputToContain('bloqueados')->assertExitCode(1);
        $this->artisan('arca:admin:deactivate', ['email' => $this->createAccount('admin')->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsOutputToContain('bloqueados')->assertExitCode(1);
        $this->assertFalse($target->fresh()->hasRole('admin'));

        $this->assertSame(5, DB::table('activity_log')->where('event', 'console-primary-password-failed')->count());
        $this->assertSame(1, DB::table('activity_log')->where('event', 'console-primary-locked')->count());
        $rows = DB::table('activity_log')->whereIn('event', ['console-primary-password-failed', 'console-primary-locked'])->get();
        foreach ($rows as $row) {
            $this->assertNull($row->causer_id);
            $this->assertStringNotContainsString('mala-clave', $row->properties);
            $this->assertStringNotContainsString(self::PRIMARY_PASSWORD, $row->properties);
            $this->assertSame('consola', json_decode($row->properties, true)['origin']);
        }

        // El nivel bajo no se bloquea.
        $admin = $this->createAccount('admin');
        $this->artisan('arca:admin:edit-name', ['email' => $admin->email, '--first-name' => 'Libre'] + $this->unattended())->assertExitCode(0);
    }

    /** CA-45 api-023 */
    public function test_ca45_primary_cannot_be_deactivated_deleted_or_demoted(): void
    {
        $primary = $this->primary();
        $this->createAccount('admin');
        $before = $this->snapshot();
        $message = 'Primero cambia ARCA_PRIMARY_ADMIN_EMAIL a otro administrador.';

        foreach ([
            ['arca:admin:deactivate', []],
            ['arca:admin:delete', []],
            ['arca:admin:demote', ['--role' => 'cashier']],
        ] as [$command, $extra]) {
            $this->artisan($command, ['email' => $primary->email, '--reason' => self::REASON, '--yes' => true] + $extra)
                ->expectsOutputToContain($message)->assertExitCode(1);
        }

        $fresh = $primary->fresh();
        $this->assertTrue((bool) $fresh->is_active);
        $this->assertTrue($fresh->hasRole('admin'));
        $this->assertSame($before, $this->snapshot());
    }
}
