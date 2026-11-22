<?php

namespace Tests\Feature\Console;

use Illuminate\Support\Facades\Artisan;

class ArcaAdminCommandsTest extends ConsoleAdminTestCase
{
    /** CA-15 api-023 y CA-49 api-023 (revisión 2026-11-21 b añade `help`, solo lectura) */
    public function test_ca15_arca_admin_commands_are_registered_without_physical_delete(): void
    {
        $names = collect(array_keys(Artisan::all()))->filter(fn ($name) => str_starts_with($name, 'arca:admin:'))->sort()->values()->all();

        $this->assertSame([
            'arca:admin:create',
            'arca:admin:deactivate',
            'arca:admin:delete',
            'arca:admin:demote',
            'arca:admin:edit-email',
            'arca:admin:edit-name',
            'arca:admin:help',
            'arca:admin:list',
            'arca:admin:promote',
            'arca:admin:reactivate',
            'arca:admin:reset-password',
            'arca:admin:reset-two-factor',
        ], $names);
        // Revisión 2026-11-21: `delete` existe (borrado lógico); ningún comando borra físicamente.
        foreach (array_keys(Artisan::all()) as $name) {
            $this->assertDoesNotMatchRegularExpression('/destroy|remove|purge|force/', $name);
        }
    }

    /** CA-16 api-023 */
    public function test_ca16_missing_reason_fails_without_changes(): void
    {
        $account = $this->createAccount('cashier');
        $admin = $this->createAccount('admin');
        $before = $this->snapshot();

        // Sin terminal: sin `--reason`, o con uno corto, falla antes de tocar nada.
        foreach (['arca:admin:promote' => $account, 'arca:admin:deactivate' => $admin, 'arca:admin:reset-two-factor' => $admin] as $command => $user) {
            $this->artisan($command, ['email' => $user->email, '--yes' => true, '--no-interaction' => true])
                ->expectsOutputToContain('Indica el motivo del cambio.')->assertExitCode(1);
            $this->artisan($command, ['email' => $user->email, '--reason' => 'corto', '--yes' => true, '--no-interaction' => true])
                ->expectsOutputToContain('Indica el motivo del cambio.')->assertExitCode(1);
            // Interactivo: un motivo corto también se rechaza.
            $this->artisan($command, ['email' => $user->email])
                ->expectsQuestion(self::REASON_PROMPT, '   corto   ')
                ->expectsOutputToContain('Indica el motivo del cambio.')->assertExitCode(1);
        }

        // Los comandos con contraseña piden el motivo antes que cualquier dato.
        foreach (['arca:admin:create' => [], 'arca:admin:reset-password' => ['email' => $admin->email]] as $command => $arguments) {
            $this->artisan($command, $arguments)
                ->expectsQuestion(self::REASON_PROMPT, '')
                ->expectsOutputToContain('Indica el motivo del cambio.')->assertExitCode(1);
        }

        $this->assertFalse($account->fresh()->hasRole('admin'));
        $this->assertTrue((bool) $admin->fresh()->is_active);
        $this->assertSame($before, $this->snapshot());
    }

    /** CA-17 api-023 */
    public function test_ca17_rejected_confirmation_makes_no_changes(): void
    {
        $account = $this->createAccount('cashier');
        $this->primary();
        $before = $this->snapshot();

        $this->artisan('arca:admin:promote', ['email' => $account->email, '--reason' => self::REASON])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'no')
            ->assertExitCode(0);

        $this->assertSame(['cashier'], $account->fresh()->getRoleNames()->all());
        $this->assertSame($before, $this->snapshot());

        $this->artisan('arca:admin:promote', ['email' => $account->email, '--reason' => self::REASON])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)
            ->expectsConfirmation(self::CONFIRM_PROMPT, 'yes')
            ->assertExitCode(0);
        $this->assertSame(['admin'], $account->fresh()->getRoleNames()->all());
    }
}
