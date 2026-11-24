<?php

namespace Tests\Feature\Console;

use Illuminate\Support\Facades\Artisan;
use Symfony\Component\Console\Exception\InvalidOptionException;

class ArcaAdminNonInteractiveTest extends ConsoleAdminTestCase
{
    /**
     * CA-34 api-023 (revisión 2026-11-21): sin terminal solo se aplican los niveles bajo y medio (con `--reason`;
     * `--yes` en el bajo y `--confirm-email` en el medio). Nivel alto, `create` y `reset-password` piden contraseña.
     */
    public function test_ca34_non_interactive_requires_reason_and_yes_and_rejects_password_commands(): void
    {
        $admin = $this->createAccount('admin');
        $this->primary();
        $before = $this->snapshot();

        // Sin `--yes` (nivel bajo) o sin `--confirm-email` (nivel medio) no se cambia nada.
        $this->artisan('arca:admin:edit-name', ['email' => $admin->email, '--first-name' => 'Nuevo', '--reason' => self::REASON, '--no-interaction' => true])
            ->assertExitCode(0);
        $this->artisan('arca:admin:reset-two-factor', ['email' => $admin->email, '--reason' => self::REASON, '--yes' => true, '--no-interaction' => true])
            ->assertExitCode(0);
        $this->assertNotSame('Nuevo', $admin->fresh()->first_name);
        $this->assertSame($before, $this->snapshot());

        // Con motivo válido y `--yes` / `--confirm-email` aplica.
        $this->artisan('arca:admin:edit-name', ['email' => $admin->email, '--first-name' => 'Nuevo'] + $this->unattended())->assertExitCode(0);
        $this->artisan('arca:admin:reset-two-factor', ['email' => $admin->email, '--confirm-email' => $admin->email] + $this->unattended())->assertExitCode(0);
        $this->assertSame('Nuevo', $admin->fresh()->first_name);
        $this->assertSame($before[0] + 2, $this->consoleActivityCount());

        // Nivel alto, `create` y `reset-password` piden la contraseña en la terminal: sin ella se rechazan sin cambios.
        $target = $this->createAccount('cashier');
        $after = $this->snapshot();
        $hash = $admin->fresh()->password;
        foreach (['arca:admin:promote' => $target->email, 'arca:admin:reset-password' => $admin->email, 'arca:admin:deactivate' => $admin->email] as $command => $email) {
            $this->artisan($command, ['email' => $email] + $this->unattended())
                ->expectsOutputToContain('Este comando pide la contraseña en la terminal.')->assertExitCode(1);
        }
        $this->artisan('arca:admin:create', $this->unattended())
            ->expectsOutputToContain('Este comando pide la contraseña en la terminal.')->assertExitCode(1);
        $this->assertSame($hash, $admin->fresh()->password);
        $this->assertFalse($target->fresh()->hasRole('admin'));
        $this->assertSame($after, $this->snapshot());

        // Ninguna contraseña se acepta como argumento u opción.
        foreach (['arca:admin:create', 'arca:admin:reset-password', 'arca:create-staff'] as $name) {
            $definition = Artisan::all()[$name]->getDefinition();
            $this->assertFalse($definition->hasOption('password'), $name);
            $this->assertFalse($definition->hasArgument('password'), $name);
        }
        $this->expectException(InvalidOptionException::class);
        $this->artisan('arca:admin:create', ['--password' => 'Secreto!12345', '--no-interaction' => true])->run();
    }
}
