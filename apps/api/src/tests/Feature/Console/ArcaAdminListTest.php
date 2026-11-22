<?php

namespace Tests\Feature\Console;

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

class ArcaAdminListTest extends ConsoleAdminTestCase
{
    /** CA-31 api-023 */
    public function test_ca31_list_needs_no_reason_and_changes_nothing(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $before = $this->snapshot();
        $activity = DB::table('activity_log')->count();

        $this->artisan('arca:admin:list')
            ->expectsOutputToContain($admin->email)
            ->doesntExpectOutputToContain($cashier->email)
            ->assertExitCode(0);

        $this->assertSame($before, $this->snapshot());
        $this->assertSame($activity, DB::table('activity_log')->count());
    }

    /** @param array<string, mixed> $options */
    private function listOutput(array $options = []): string
    {
        $this->assertSame(0, Artisan::call('arca:admin:list', $options));

        return Artisan::output();
    }

    /** CA-50 api-023 (revisión 2026-11-21 b): sin opciones, activas y desactivadas; titular marcado. */
    public function test_ca50_list_default_shows_active_and_deactivated_without_deleted(): void
    {
        $primary = $this->primary();
        $inactive = $this->createAccount('admin');
        $inactive->update(['is_active' => false]);
        $deleted = $this->createAccount('admin');
        $deleted->delete();

        $output = $this->listOutput();

        $this->assertStringContainsString($primary->email.' (Titular)', $output);
        $this->assertStringContainsString($inactive->email, $output);
        $this->assertStringContainsString('Desactivada', $output);
        $this->assertStringNotContainsString($deleted->email, $output);
    }

    /** CA-51 api-023 (revisión 2026-11-21 b): `--deleted` y `-d` muestran solo eliminadas, con fecha. */
    public function test_ca51_list_deleted_shows_only_deleted_with_date_and_empty_message(): void
    {
        $active = $this->createAccount('admin');
        $deleted = $this->createAccount('admin');
        $deleted->delete();
        $before = $this->snapshot();

        foreach (['--deleted', '-d'] as $option) {
            $output = $this->listOutput([$option => true]);

            $this->assertStringContainsString($deleted->email, $output);
            $this->assertStringContainsString('Eliminada el', $output);
            $this->assertStringContainsString($deleted->fresh()->deleted_at->format('Y-m-d H:i'), $output);
            $this->assertStringNotContainsString($active->email, $output);
        }

        User::onlyTrashed()->role('admin')->update(['deleted_at' => null]);
        $this->assertStringContainsString('No hay cuentas eliminadas.', $this->listOutput(['--deleted' => true]));
        $this->assertSame($before, $this->snapshot());
    }

    /** CA-52 api-023 (revisión 2026-11-21 b): `--all` muestra todas con su estado y el titular. */
    public function test_ca52_list_all_shows_status_column_for_every_account(): void
    {
        $primary = $this->primary();
        $inactive = $this->createAccount('admin');
        $inactive->update(['is_active' => false]);
        $deleted = $this->createAccount('admin');
        $deleted->delete();

        $output = $this->listOutput(['--all' => true]);

        foreach ([$primary->email.' (Titular)', $inactive->email, $deleted->email, 'Activa', 'Desactivada', 'Eliminada'] as $text) {
            $this->assertStringContainsString($text, $output);
        }
    }

    /** CA-53 api-023 (revisión 2026-11-21 b): `--deleted` y `--all` juntos fallan en español. */
    public function test_ca53_list_deleted_and_all_together_fail(): void
    {
        $before = $this->snapshot();

        $this->artisan('arca:admin:list', ['--deleted' => true, '--all' => true])
            ->expectsOutputToContain('Las opciones --deleted y --all no se pueden usar juntas.')
            ->assertExitCode(1);
        $this->assertSame($before, $this->snapshot());
    }
}
