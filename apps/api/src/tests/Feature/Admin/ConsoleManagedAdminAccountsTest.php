<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Support\Facades\DB;

class ConsoleManagedAdminAccountsTest extends AdminFeatureTestCase
{
    private const ADMIN_MESSAGE = 'Las cuentas de administrador solo se gestionan desde la consola del servidor.';

    private const ROLE_MESSAGE = 'No puedes asignar el rol de administrador desde la administración.';

    private function deniedCount(): int
    {
        return DB::table('activity_log')->where('log_name', 'admin')->where('event', 'denied')->count();
    }

    /** @return list<array{string, string, array<string, mixed>}> */
    private function writes(User $target): array
    {
        $base = "/api/v1/admin/users/{$target->id}";

        return [
            ['patch', $base, ['first_name' => 'Otro']],
            ['patch', "$base/status", ['is_active' => false]],
            ['delete', $base, []],
            ['put', "$base/password", ['password' => 'Str0ng!Passphrase#9', 'current_password' => 'SafePassphrase12!']],
            ['delete', "$base/two-factor", ['password' => 'SafePassphrase12!']],
        ];
    }

    /** CA-11 api-023 */
    public function test_ca11_console_managed_account_writes_return_403_regardless_of_body(): void
    {
        $actor = $this->createAccount('admin');
        $target = $this->createAccount('admin');

        foreach ($this->writes($target) as [$method, $url, $body]) {
            $this->actAs($actor)->json($method, $url, $body)
                ->assertForbidden()->assertJsonPath('message', self::ADMIN_MESSAGE);
            // Cuerpo inválido o vacío: la respuesta no cambia.
            $this->actAs($actor)->json($method, $url, ['role' => ['x'], 'is_active' => 'nope', 'password' => 1])
                ->assertForbidden()->assertJsonPath('message', self::ADMIN_MESSAGE);
            $this->actAs($actor)->json($method, $url)
                ->assertForbidden()->assertJsonPath('message', self::ADMIN_MESSAGE);
        }

        $fresh = $target->fresh();
        $this->assertNull($fresh->deleted_at);
        $this->assertTrue((bool) $fresh->is_active);
        $this->assertSame($target->first_name, $fresh->first_name);
        $this->assertTrue($fresh->hasRole('admin'));
    }

    /** CA-12 api-023 */
    public function test_ca12_admin_role_requested_returns_403_on_store_and_update(): void
    {
        $actor = $this->createAccount('admin');
        $target = $this->createAccount('cashier');
        $payload = $this->validAccount('admin');

        $this->actAs($actor)->postJson('/api/v1/admin/users', $payload)
            ->assertForbidden()->assertJsonPath('message', self::ROLE_MESSAGE);
        $this->assertFalse(User::query()->where('email', $payload['email'])->exists());

        $this->actAs($actor)->patchJson("/api/v1/admin/users/{$target->id}", ['role' => 'admin'])
            ->assertForbidden()->assertJsonPath('message', self::ROLE_MESSAGE);
        $this->assertSame(['cashier'], $target->fresh()->getRoleNames()->all());
    }

    /** CA-13 api-023 */
    public function test_ca13_admin_accounts_readable_with_managed_by_console_flag(): void
    {
        $actor = $this->createAccount('admin');
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');

        $show = $this->actAs($actor)->getJson("/api/v1/admin/users/{$admin->id}")->assertOk();
        $show->assertJsonPath('data.managed_by_console', true)->assertJsonPath('data.role.name', 'admin');
        $this->actAs($actor)->getJson("/api/v1/admin/users/{$cashier->id}")->assertOk()
            ->assertJsonPath('data.managed_by_console', false);

        $list = $this->actAs($actor)->getJson('/api/v1/admin/users?per_page=100')->assertOk();
        $rows = collect($list->json('data'))->keyBy('id');
        $this->assertTrue($rows[$admin->id]['managed_by_console']);
        $this->assertFalse($rows[$cashier->id]['managed_by_console']);

        $this->assertStringNotContainsString('two_factor_secret', $list->getContent());
        $this->assertStringNotContainsString('"password"', $list->getContent());
        $this->assertStringNotContainsString('two_factor_secret', $show->getContent());
        $this->assertStringNotContainsString('"password"', $show->getContent());
    }

    /** CA-14 api-023: permiso (403) → inexistente (404) → admin (403) → validación (422). */
    public function test_ca14_check_order_permission_404_403_422(): void
    {
        $actor = $this->createAccount('admin');
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');

        $this->actAs($this->createAccount('zoo-admin'))->patchJson("/api/v1/admin/users/{$admin->id}", ['role' => 'admin'])
            ->assertForbidden()->assertJsonPath('message', 'No tienes permiso para realizar esta acción.');

        $this->actAs($actor)->patchJson('/api/v1/admin/users/999999999', ['role' => 'admin'])
            ->assertNotFound()->assertJsonPath('message', 'Usuario no encontrado.');

        $this->actAs($actor)->patchJson("/api/v1/admin/users/{$admin->id}", ['first_name' => ''])
            ->assertForbidden()->assertJsonPath('message', self::ADMIN_MESSAGE);

        $this->actAs($actor)->patchJson("/api/v1/admin/users/{$cashier->id}", ['first_name' => ''])
            ->assertUnprocessable();
    }

    /** CA-29 api-023 */
    public function test_ca29_rejected_admin_attempts_are_audited_without_secrets(): void
    {
        $actor = $this->createAccount('admin');
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');
        $before = $this->deniedCount();

        $this->actAs($actor)->putJson("/api/v1/admin/users/{$admin->id}/password", ['password' => 'Str0ng!Passphrase#9'])->assertForbidden();
        $this->actAs($actor)->patchJson("/api/v1/admin/users/{$cashier->id}", ['role' => 'admin', 'password' => 'Secreto!12345'])->assertForbidden();
        $payload = $this->validAccount('admin');
        $this->actAs($actor)->postJson('/api/v1/admin/users', $payload)->assertForbidden();

        $rows = DB::table('activity_log')->where('log_name', 'admin')->where('event', 'denied')->orderByDesc('id')->limit(3)->get();
        $this->assertSame($before + 3, $this->deniedCount());
        foreach ($rows as $row) {
            $this->assertSame($actor->id, (int) $row->causer_id);
            $properties = json_decode($row->properties, true);
            $this->assertSame('denied', $properties['result']);
            $this->assertNotEmpty($properties['route']);
            $this->assertNotEmpty($properties['account_email']);
            $this->assertStringNotContainsString('Str0ng', $row->properties);
            $this->assertStringNotContainsString('Secreto', $row->properties);
            $this->assertStringNotContainsString('password', strtolower(implode(',', array_keys($properties))));
        }
        $emails = $rows->map(fn ($row) => json_decode($row->properties, true)['account_email'])->all();
        $this->assertContains($admin->email, $emails);
        $this->assertContains($cashier->email, $emails);
        $this->assertContains($payload['email'], $emails);

        // Sin `users.manage` no se audita.
        $this->actAs($this->createAccount('zoo-admin'))->patchJson("/api/v1/admin/users/{$admin->id}", [])->assertForbidden();
        $this->assertSame($before + 3, $this->deniedCount());
    }

    /** CA-36 api-023 (y CA-38 api-021): el 403 de cuenta admin precede al de confirmación de contraseña. */
    public function test_ca36_admin_account_403_before_password_confirmation(): void
    {
        $actor = $this->createAccount('admin');
        $admin = $this->createAccount('admin');
        $cashier = $this->createAccount('cashier');

        foreach ([
            ['patch', "/api/v1/admin/users/{$admin->id}/status", ['is_active' => false]],
            ['patch', "/api/v1/admin/users/{$admin->id}", ['first_name' => 'X']],
            ['delete', "/api/v1/admin/users/{$admin->id}", []],
            ['put', "/api/v1/admin/users/{$admin->id}/password", ['password' => 'Str0ng!Passphrase#9']],
            ['delete', "/api/v1/admin/users/{$admin->id}/two-factor", []],
        ] as [$method, $url, $body]) {
            $this->actAsWithoutWindow($actor)->json($method, $url, $body)
                ->assertForbidden()->assertJsonPath('message', self::ADMIN_MESSAGE)
                ->assertJsonMissingPath('code');
        }

        // El rol admin pedido también precede a la contraseña (decisión de coordinación de api-021).
        $this->actAsWithoutWindow($actor)->patchJson("/api/v1/admin/users/{$cashier->id}", ['role' => 'admin'])
            ->assertForbidden()->assertJsonPath('message', self::ROLE_MESSAGE)->assertJsonMissingPath('code');
        $this->actAsWithoutWindow($actor)->postJson('/api/v1/admin/users', $this->validAccount('admin'))
            ->assertForbidden()->assertJsonPath('message', self::ROLE_MESSAGE)->assertJsonMissingPath('code');

        // Cuenta no admin sin ventana: sigue pidiendo la contraseña.
        $this->actAsWithoutWindow($actor)->patchJson("/api/v1/admin/users/{$cashier->id}/status", ['is_active' => false])
            ->assertForbidden()->assertJsonPath('code', 'password_confirmation_required');
    }
}
