<?php

namespace Tests\Feature\Console;

class ArcaAdminGuardsTest extends ConsoleAdminTestCase
{
    /** CA-30 api-023 */
    public function test_ca30_console_rejects_non_admin_targets_for_admin_only_commands(): void
    {
        $cashier = $this->createAccount('cashier');
        $admin = $this->createAccount('admin');
        $hash = $cashier->password;
        $before = $this->snapshot();

        $this->artisan('arca:admin:deactivate', ['email' => $cashier->email] + $this->unattended())->assertExitCode(1);
        $this->artisan('arca:admin:reset-two-factor', ['email' => $cashier->email] + $this->unattended())->assertExitCode(1);
        $this->artisan('arca:admin:reset-password', ['email' => $cashier->email, '--reason' => self::REASON])
            ->expectsOutputToContain('no es de administrador')->assertExitCode(1);
        // Promover una cuenta que ya es admin también se rechaza.
        $this->artisan('arca:admin:promote', ['email' => $admin->email] + $this->unattended())
            ->expectsOutputToContain('ya es de administrador')->assertExitCode(1);
        // Correo inexistente.
        $this->artisan('arca:admin:deactivate', ['email' => 'nadie@test.arca.invalid'] + $this->unattended())
            ->expectsOutputToContain('No existe una cuenta con ese correo.')->assertExitCode(1);

        $fresh = $cashier->fresh();
        $this->assertTrue((bool) $fresh->is_active);
        $this->assertSame(['cashier'], $fresh->getRoleNames()->all());
        $this->assertSame($hash, $fresh->password);
        $this->assertSame($before, $this->snapshot());
    }
}
