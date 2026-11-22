<?php

namespace Tests\Feature\Admin;

use App\Models\EnclosureQrCode;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Tests\Concerns\BuildsEnclosureFixtures;
use Tests\Concerns\ConfirmsStepUp;

class StepUpWindowTest extends AdminFeatureTestCase
{
    use BuildsEnclosureFixtures, ConfirmsStepUp;

    /** CA-15 staff-step-up-confirmation */
    public function test_ca15_window_operations_without_confirmation_return_403(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $this->seedPrices($admin);
        $folio = $this->sellFolio($cashier);
        $target = $this->createAccount('cashier');
        $inactive = $this->createAccount('cashier', true, ['is_active' => false]);
        $deletable = $this->createAccount('cashier');
        $withQr = $this->makeEnclosure();
        $this->makeQr($withQr);
        $deletableEnclosure = $this->makeEnclosure();
        $users = User::query()->count();

        $calls = [
            'cancel' => [$cashier, fn ($t) => $t->postJson("/api/v1/admin/tickets/{$folio}/cancel", ['reason_code' => 'capture_error', 'reason' => 'Error de captura'])],
            'create' => [$admin, fn ($t) => $t->postJson('/api/v1/admin/users', $this->validAccount('cashier'))],
            'update' => [$admin, fn ($t) => $t->patchJson("/api/v1/admin/users/{$target->id}", ['first_name' => 'Otro'])],
            'deactivate' => [$admin, fn ($t) => $t->patchJson("/api/v1/admin/users/{$target->id}/status", ['is_active' => false])],
            'activate' => [$admin, fn ($t) => $t->patchJson("/api/v1/admin/users/{$inactive->id}/status", ['is_active' => true])],
            'delete-account' => [$admin, fn ($t) => $t->deleteJson("/api/v1/admin/users/{$deletable->id}")],
            'regenerate-qr' => [$admin, fn ($t) => $t->postJson("/api/v1/admin/enclosures/{$withQr->id}/qr/regenerate")],
            'delete-enclosure' => [$admin, fn ($t) => $t->deleteJson("/api/v1/admin/enclosures/{$deletableEnclosure->id}")],
        ];

        foreach ($calls as $name => [$actor, $call]) {
            $call($this->actAsWithoutWindow($actor))
                ->assertForbidden()
                ->assertJsonPath('code', 'password_confirmation_required')
                ->assertJsonPath('mode', 'window');
            // Ventana expirada: mismo resultado.
            $call($this->actAsConfirmed($actor, -1))
                ->assertForbidden()
                ->assertJsonPath('code', 'password_confirmation_required');
        }

        $this->assertSame('completed', Ticket::query()->findOrFail($folio)->status);
        $this->assertSame($users, User::query()->count());
        $this->assertSame('cashier', $target->fresh()->roles->first()->name);
        $this->assertTrue((bool) $target->fresh()->is_active);
        $this->assertFalse((bool) $inactive->fresh()->is_active);
        $this->assertNotNull(User::query()->find($deletable->id));
        $this->assertSame(1, EnclosureQrCode::query()->where('enclosure_id', $withQr->id)->where('is_active', true)->count());
        $this->assertNull(DB::table('enclosures')->where('id', $deletableEnclosure->id)->value('deleted_at'));
    }

    /** CA-16 staff-step-up-confirmation */
    public function test_ca16_cancelling_with_an_open_window_does_not_ask_again(): void
    {
        $cashier = $this->createAccount('cashier');
        $this->seedPrices($cashier);
        $first = $this->sellFolio($cashier);
        $second = $this->sellFolio($cashier);

        $this->actAsConfirmed($cashier)->postJson("/api/v1/admin/tickets/{$first}/cancel", ['reason_code' => 'capture_error', 'reason' => 'Error de captura'])
            ->assertOk()->assertJsonPath('data.status', 'cancelled');

        $this->actAsConfirmed($cashier)->postJson("/api/v1/admin/tickets/{$second}/cancel", ['reason_code' => 'capture_error', 'reason' => 'Error de captura'])
            ->assertOk();

        $third = $this->sellFolio($cashier);
        $this->actAsConfirmed($cashier, -1)->postJson("/api/v1/admin/tickets/{$third}/cancel", ['reason_code' => 'capture_error', 'reason' => 'Error de captura'])
            ->assertForbidden()->assertJsonPath('code', 'password_confirmation_required');
        $this->assertSame('completed', Ticket::query()->findOrFail($third)->status);
    }

    /** CA-17 staff-step-up-confirmation */
    public function test_ca17_creating_a_non_admin_account_with_window(): void
    {
        $admin = $this->createAccount('admin');

        foreach (['cashier', 'zoo-admin'] as $role) {
            $payload = $this->validAccount($role);
            $this->actAsConfirmed($admin)->postJson('/api/v1/admin/users', $payload)->assertCreated();
            $this->assertNotNull(User::query()->where('email', $payload['email'])->first());
        }

        $expired = $this->validAccount('cashier');
        $this->actAsConfirmed($admin, -1)->postJson('/api/v1/admin/users', $expired)
            ->assertForbidden()->assertJsonPath('code', 'password_confirmation_required');
        $this->assertNull(User::query()->where('email', $expired['email'])->first());
    }

    /** CA-18 staff-step-up-confirmation */
    public function test_ca18_editing_an_account_without_role_change_with_window(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier');

        $this->actAsConfirmed($admin)->patchJson("/api/v1/admin/users/{$target->id}", ['first_name' => 'Renombrada'])
            ->assertOk()->assertJsonPath('data.first_name', 'Renombrada');

        // Enviar el mismo rol que ya tiene no es un cambio de rol: sigue siendo Ventana.
        $this->actAsConfirmed($admin)->patchJson("/api/v1/admin/users/{$target->id}", ['first_name' => 'Igual', 'role' => 'cashier'])
            ->assertOk();

        $this->actAsConfirmed($admin, -1)->patchJson("/api/v1/admin/users/{$target->id}", ['first_name' => 'Expirada'])
            ->assertForbidden()->assertJsonPath('code', 'password_confirmation_required')->assertJsonPath('mode', 'window');
        $this->assertSame('Igual', $target->fresh()->first_name);
    }

    /** CA-19 staff-step-up-confirmation */
    public function test_ca19_deactivating_and_deleting_an_account_with_window(): void
    {
        $admin = $this->createAccount('admin');
        $toDeactivate = $this->createAccount('cashier');
        $toDelete = $this->createAccount('veterinarian');

        $this->actAsConfirmed($admin)->patchJson("/api/v1/admin/users/{$toDeactivate->id}/status", ['is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);
        $this->actAsConfirmed($admin)->deleteJson("/api/v1/admin/users/{$toDelete->id}")->assertNoContent();
        $this->assertNull(User::query()->find($toDelete->id));
        $this->assertNotNull(User::withTrashed()->find($toDelete->id));

        $other = $this->createAccount('cashier');
        $this->actAsConfirmed($admin, -1)->deleteJson("/api/v1/admin/users/{$other->id}")
            ->assertForbidden()->assertJsonPath('code', 'password_confirmation_required');
        $this->assertNotNull(User::query()->find($other->id));
    }

    /** CA-20 staff-step-up-confirmation */
    public function test_ca20_regenerating_qr_with_code_and_deleting_enclosure_require_a_window(): void
    {
        $admin = $this->createAccount('admin');
        $enclosure = $this->makeEnclosure();
        $code = $this->makeQr($enclosure);
        $toDelete = $this->makeEnclosure();

        $this->actAsConfirmed($admin)->postJson("/api/v1/admin/enclosures/{$enclosure->id}/qr/regenerate")->assertOk();
        $this->assertSame(0, EnclosureQrCode::query()->where('code', $code)->where('is_active', true)->count());
        $this->actAsConfirmed($admin)->deleteJson("/api/v1/admin/enclosures/{$toDelete->id}")->assertOk();
        $this->assertNotNull(DB::table('enclosures')->where('id', $toDelete->id)->value('deleted_at'));

        $other = $this->makeEnclosure();
        $this->makeQr($other);
        $this->actAsConfirmed($admin, -1)->postJson("/api/v1/admin/enclosures/{$other->id}/qr/regenerate")
            ->assertForbidden()->assertJsonPath('code', 'password_confirmation_required');
        $this->actAsConfirmed($admin, -1)->deleteJson("/api/v1/admin/enclosures/{$other->id}")
            ->assertForbidden()->assertJsonPath('code', 'password_confirmation_required');
        $this->assertNull(DB::table('enclosures')->where('id', $other->id)->value('deleted_at'));
    }

    /**
     * CA-38 staff-step-up-confirmation: en cada ruta de cuentas el orden es `permission:users.manage` →
     * `console-managed-account` (api-023) → `step-up:*`, y el 403 de cuenta admin o de rol `admin` pedido precede al
     * de contraseña, con y sin ventana. El detalle de los 403 se prueba también en api-023 (CA-36).
     */
    public function test_ca38_admin_account_returns_admin_403_before_password(): void
    {
        $names = ['users.store', 'users.update', 'users.status', 'users.destroy', 'users.password.update', 'users.two-factor.destroy'];

        foreach ($names as $name) {
            $middleware = Route::getRoutes()->getByName("admin.{$name}")->gatherMiddleware();
            $permission = array_search('permission:users.manage', $middleware, true);
            $stepUp = collect($middleware)->search(fn ($m) => is_string($m) && str_starts_with($m, 'step-up:'));

            $this->assertNotFalse($permission, "admin.{$name} sin permission:users.manage");
            $this->assertNotFalse($stepUp, "admin.{$name} sin step-up");
            $this->assertLessThan($stepUp, $permission, "admin.{$name}: step-up debe ir después del permiso");
            // api-023: el guard de cuentas admin va entre ambos.
            $guard = array_search('console-managed-account', $middleware, true);
            $this->assertNotFalse($guard, "admin.{$name} sin console-managed-account");
            $this->assertLessThan($guard, $permission);
            $this->assertLessThan($stepUp, $guard);
        }

        // Comportamiento (api-023 cierra este criterio): cuenta admin o rol `admin` pedido, sin ventana y sin contraseña.
        $actor = $this->createAccount('admin');
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $adminMessage = 'Las cuentas de administrador solo se gestionan desde la consola del servidor.';
        $roleMessage = 'No puedes asignar el rol de administrador desde la administración.';

        foreach (['sin ventana', 'con ventana'] as $case) {
            $client = fn () => $case === 'sin ventana' ? $this->actAsWithoutWindow($actor) : $this->actAsConfirmed($actor);

            foreach ([
                ['patchJson', "/api/v1/admin/users/{$admin->id}", ['first_name' => 'X']],
                ['patchJson', "/api/v1/admin/users/{$admin->id}/status", ['is_active' => false]],
                ['deleteJson', "/api/v1/admin/users/{$admin->id}", []],
                ['putJson', "/api/v1/admin/users/{$admin->id}/password", ['password' => 'N3w!Passphrase#77']],
                ['deleteJson', "/api/v1/admin/users/{$admin->id}/two-factor", []],
            ] as [$method, $url, $body]) {
                $client()->{$method}($url, $body)->assertForbidden()
                    ->assertJsonPath('message', $adminMessage)->assertJsonMissing(['code' => 'password_confirmation_required']);
            }

            $client()->patchJson("/api/v1/admin/users/{$cashier->id}", ['role' => 'admin'])->assertForbidden()
                ->assertJsonPath('message', $roleMessage)->assertJsonMissing(['code' => 'password_confirmation_required']);
            $client()->postJson('/api/v1/admin/users', $this->validAccount('admin'))->assertForbidden()
                ->assertJsonPath('message', $roleMessage)->assertJsonMissing(['code' => 'password_confirmation_required']);
        }
        $this->assertTrue($admin->fresh()->hasRole('admin'));
        $this->assertSame(['cashier'], $cashier->fresh()->getRoleNames()->all());
    }

    /** CA-38 staff-step-up-confirmation: sin permiso y sin password, el 403 es el de permiso, nunca el de contraseña. */
    public function test_ca38_actor_without_permission_gets_permission_403_before_password(): void
    {
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $executive = $this->createAccount('executive');
        $this->seedPrices($admin);
        $folio = $this->sellFolio($cashier);
        $target = $this->createAccount('cashier');

        $calls = [
            'ticket-prices' => [$cashier, fn ($t) => $t->postJson('/api/v1/admin/ticket-prices', ['adult_amount' => 30, 'child_amount' => 20, 'mode' => 'immediate'])],
            'cancel' => [$executive, fn ($t) => $t->postJson("/api/v1/admin/tickets/{$folio}/cancel", ['reason_code' => 'capture_error', 'reason' => 'Error de captura'])],
            'users.update' => [$cashier, fn ($t) => $t->patchJson("/api/v1/admin/users/{$target->id}", ['role' => 'veterinarian'])],
        ];

        foreach ($calls as $name => [$actor, $call]) {
            foreach (['sin ventana', 'con ventana'] as $case) {
                $client = $case === 'sin ventana' ? $this->actAsWithoutWindow($actor) : $this->actAsConfirmed($actor);
                $call($client)
                    ->assertForbidden()
                    ->assertJsonPath('message', 'No tienes permiso para realizar esta acción.')
                    ->assertJsonMissing(['code' => 'password_confirmation_required']);
            }
        }

        $this->assertSame('completed', Ticket::query()->findOrFail($folio)->status);
        $this->assertSame('cashier', $target->fresh()->roles->first()->name);
    }

    private function seedPrices(User $creator): void
    {
        DB::table('ticket_prices')->delete();
        foreach (['adult' => '25.00', 'child' => '16.00'] as $type => $amount) {
            DB::table('ticket_prices')->insert([
                'ticket_type' => $type, 'amount' => $amount, 'effective_at' => '2020-01-01 00:00:00',
                'created_by' => $creator->id, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }
    }

    private function sellFolio(User $cashier): int
    {
        return (int) $this->actAsWithoutWindow($cashier)
            ->postJson('/api/v1/admin/tickets', ['adult_quantity' => 1, 'child_quantity' => 0])
            ->assertCreated()
            ->json('data.tickets.0.folio');
    }
}
