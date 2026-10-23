<?php

namespace Tests\Feature\Staff;

use App\Models\Department;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

class StaffUserManagementTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-01 user-management */
    public function test_ca01_admin_lists_ordered_staff_resources_without_sensitive_fields(): void
    {
        $admin = $this->manager();
        $first = $this->createStaffUser('cashier', ['first_name' => 'Ana']);
        $second = $this->createStaffUser('veterinarian', ['first_name' => 'Zoe']);

        $response = $this->actingAs($admin, 'web')->getJson('/api/v1/staff-users')
            ->assertOk()
            ->assertJsonFragment(['id' => $first->id])
            ->assertJsonFragment(['id' => $second->id]);

        $ids = array_column($response->json('data'), 'id');
        $this->assertLessThan(array_search($second->id, $ids, true), array_search($first->id, $ids, true));
        $resource = $response->json('data.0');
        $this->assertArrayNotHasKey('password', $resource);
        $this->assertArrayNotHasKey('permissions', $resource);
        $this->assertArrayNotHasKey('two_factor_secret', $resource);
        $this->assertArrayHasKey('department', $resource);
        $this->assertArrayHasKey('roles', $resource);
        $this->assertArrayHasKey('is_active', $resource);
    }

    /** CA-02 user-management */
    public function test_ca02_admin_creates_any_staff_role_with_normalized_email_and_creator(): void
    {
        $admin = $this->manager();
        $department = Department::query()->firstOrFail();

        $response = $this->actingAs($admin, 'web')->postJson('/api/v1/staff-users', [
            'email' => 'New.Staff@Example.Test',
            'first_name' => 'Nueva',
            'last_name' => 'Persona',
            'second_last_name' => null,
            'department_id' => $department->id,
            'role' => 'executive',
            'password' => 'SafePassphrase12!',
        ])->assertCreated()
            ->assertJsonPath('data.email', 'new.staff@example.test')
            ->assertJsonPath('data.roles.0', 'executive')
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.two_factor_secret');

        $created = User::query()->findOrFail($response->json('data.id'));
        $this->assertSame($admin->id, $created->created_by);
        $this->assertNotSame('SafePassphrase12!', $created->password);
    }

    /** CA-03 user-management */
    public function test_ca03_creation_and_partial_update_return_spanish_field_errors_without_persisting(): void
    {
        $admin = $this->manager();
        $existing = $this->createStaffUser('cashier');
        $originalFirstName = $existing->first_name;
        $department = Department::query()->firstOrFail();

        $this->actingAs($admin, 'web')->postJson('/api/v1/staff-users', [
            'email' => $existing->email,
            'first_name' => '',
            'last_name' => 'Prueba',
            'department_id' => $department->id,
            'role' => 'role-that-does-not-exist',
            'password' => 'weak',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'first_name', 'role', 'password'])
            ->assertJsonPath('errors.email.0', 'Este correo electrónico ya está registrado.');

        $this->patchJson('/api/v1/staff-users/'.$existing->id, [
            'department_id' => -1,
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['department_id'])
            ->assertJsonPath('errors.department_id.0', 'El área seleccionada no existe o está inactiva.');

        $this->assertSame($originalFirstName, $existing->fresh()->first_name);
    }

    /** CA-04 user-management */
    public function test_ca04_zoo_admin_lists_and_manages_only_cashier_and_veterinarian_accounts(): void
    {
        $zooAdmin = $this->manager('zoo-admin');
        $cashier = $this->createStaffUser('cashier');
        $veterinarian = $this->createStaffUser('veterinarian');
        $executive = $this->createStaffUser('executive');

        $this->actingAs($zooAdmin, 'web')->getJson('/api/v1/staff-users')
            ->assertOk()
            ->assertJsonFragment(['id' => $cashier->id])
            ->assertJsonFragment(['id' => $veterinarian->id])
            ->assertJsonMissing(['id' => $executive->id]);

        $this->postJson('/api/v1/staff-users', [
            'email' => 'not-assignable@example.test',
            'first_name' => 'No',
            'last_name' => 'Permitido',
            'department_id' => $cashier->department_id,
            'role' => 'executive',
            'password' => 'SafePassphrase12!',
        ])->assertForbidden()
            ->assertJsonPath('message', 'No puedes asignar ese rol.');

        $this->patchJson('/api/v1/staff-users/'.$executive->id, ['first_name' => 'Fuera'])
            ->assertForbidden()
            ->assertJsonPath('message', 'No puedes administrar esta cuenta.');
    }

    /** CA-05 user-management */
    public function test_ca05_authentication_permissions_and_two_factor_protect_all_routes(): void
    {
        $this->getJson('/api/v1/staff-users')->assertUnauthorized();

        $unprivileged = $this->createStaffUser('executive');
        $this->actingAs($unprivileged, 'web')->getJson('/api/v1/staff-users')->assertForbidden();

        $unconfirmedAdmin = $this->grantPermission($this->createStaffUser('admin'), 'users.manage');
        Auth::forgetGuards();
        $this->actingAs($unconfirmedAdmin, 'web')->getJson('/api/v1/staff-users')
            ->assertForbidden()
            ->assertJsonPath('code', 'two_factor_setup_required');
    }

    /** CA-06 user-management */
    public function test_ca06_patch_updates_only_sent_fields_role_and_updated_by(): void
    {
        $admin = $this->manager();
        $staffUser = $this->createStaffUser('cashier');

        $this->actingAs($admin, 'web')->patchJson('/api/v1/staff-users/'.$staffUser->id, [
            'first_name' => 'Actualizada',
            'role' => 'veterinarian',
        ])->assertOk()
            ->assertJsonPath('data.first_name', 'Actualizada')
            ->assertJsonPath('data.roles.0', 'veterinarian');

        $this->assertDatabaseHas('users', [
            'id' => $staffUser->id,
            'first_name' => 'Actualizada',
            'last_name' => $staffUser->last_name,
            'updated_by' => $admin->id,
        ]);
    }

    /** CA-07 user-management */
    public function test_ca07_deactivation_soft_deletes_and_removes_database_sessions(): void
    {
        $admin = $this->manager();
        $staffUser = $this->createStaffUser('cashier');
        $sessionId = 'staff-session-'.$staffUser->id;
        DB::table('sessions')->insert([
            'id' => $sessionId,
            'user_id' => $staffUser->id,
            'ip_address' => '127.0.0.1',
            'user_agent' => 'feature-test',
            'payload' => 'serialized-session',
            'last_activity' => now()->timestamp,
        ]);

        config()->set('session.driver', 'database');

        $this->actingAs($admin, 'web')->deleteJson('/api/v1/staff-users/'.$staffUser->id)
            ->assertNoContent();

        $deleted = User::withTrashed()->findOrFail($staffUser->id);
        $this->assertFalse($deleted->is_active);
        $this->assertNotNull($deleted->deleted_at);
        $this->assertDatabaseMissing('sessions', ['id' => $sessionId]);
        $this->getJson('/api/v1/staff-users')->assertOk()->assertJsonMissing(['id' => $staffUser->id]);
        Auth::forgetGuards();
        $this->postJson('/api/v1/auth/login', [
            'email' => $staffUser->email,
            'password' => 'SafePassphrase12!',
        ])->assertUnprocessable();
    }

    /** CA-08 user-management */
    public function test_ca08_admin_cannot_deactivate_or_change_their_own_role(): void
    {
        $admin = $this->manager();

        $this->actingAs($admin, 'web')->deleteJson('/api/v1/staff-users/'.$admin->id)
            ->assertForbidden()
            ->assertJsonPath('message', 'No puedes desactivar tu propia cuenta.');

        $this->patchJson('/api/v1/staff-users/'.$admin->id, ['role' => 'cashier'])
            ->assertForbidden()
            ->assertJsonPath('message', 'No puedes cambiar tu propio rol.');
    }

    /** CA-09 user-management */
    public function test_ca09_catalog_returns_active_departments_and_roles_allowed_for_each_manager(): void
    {
        $admin = $this->manager();
        $adminResponse = $this->actingAs($admin, 'web')->getJson('/api/v1/staff-users/catalog')
            ->assertOk();
        $this->assertCount(5, $adminResponse->json('data.roles'));
        $this->assertContains('Cajero', array_column($adminResponse->json('data.roles'), 'label'));
        $this->assertNotEmpty($adminResponse->json('data.departments'));

        $zooAdmin = $this->manager('zoo-admin');
        Auth::forgetGuards();
        $zooResponse = $this->actingAs($zooAdmin, 'web')->getJson('/api/v1/staff-users/catalog')
            ->assertOk();
        $this->assertSame(['cashier', 'veterinarian'], array_column($zooResponse->json('data.roles'), 'name'));
    }

    /** CA-10 user-management */
    public function test_ca10_staff_user_activity_log_never_records_passwords_or_secrets(): void
    {
        $admin = $this->manager();
        $department = Department::query()->firstOrFail();

        $response = $this->actingAs($admin, 'web')->postJson('/api/v1/staff-users', [
            'email' => 'audited@example.test',
            'first_name' => 'Auditada',
            'last_name' => 'Persona',
            'department_id' => $department->id,
            'role' => 'cashier',
            'password' => 'PrivatePassphrase12!',
        ])->assertCreated();

        $activity = DB::table('activity_log')
            ->where('log_name', 'staff-users')
            ->where('subject_id', $response->json('data.id'))
            ->latest('id')
            ->first();
        $this->assertNotNull($activity);
        $this->assertSame('created', $activity->event);
        $this->assertSame($admin->id, (int) $activity->causer_id);
        $properties = json_decode($activity->properties, true);
        $this->assertArrayNotHasKey('password', $properties);
        $this->assertArrayNotHasKey('two_factor_secret', $properties);
        $this->assertStringNotContainsString('PrivatePassphrase12!', $activity->properties);
    }

    /** CA-11 user-management */
    public function test_ca11_staff_users_throttle_returns_spanish_retry_after(): void
    {
        config()->set('arca.staff_users_per_minute', 1);
        $admin = $this->manager();

        $this->actingAs($admin, 'web')->getJson('/api/v1/staff-users')->assertOk();
        $this->getJson('/api/v1/staff-users')
            ->assertTooManyRequests()
            ->assertHeader('Retry-After')
            ->assertJsonPath('message', fn (string $message) => str_starts_with($message, 'Espera '));
    }

    /** CA-12 user-management */
    public function test_ca12_each_api_acceptance_criterion_has_a_named_feature_test(): void
    {
        $methods = get_class_methods(self::class);

        foreach (range(1, 12) as $criterion) {
            $prefix = 'test_ca'.str_pad((string) $criterion, 2, '0', STR_PAD_LEFT).'_';
            $this->assertTrue(
                collect($methods)->contains(static fn (string $method) => str_starts_with($method, $prefix)),
                'No existe una prueba nombrada para '.$prefix,
            );
        }
    }

    private function manager(string $role = 'admin'): User
    {
        Http::fake();
        RateLimiter::clear('staff-users');

        $permission = $role === 'admin' ? 'users.manage' : 'operational-staff.manage';
        $user = $this->grantPermission($this->createStaffUser($role), $permission);
        $user->forceFill(['two_factor_confirmed_at' => now()])->save();

        return $user->fresh();
    }

    private function grantPermission(User $user, string $permissionName): User
    {
        $permission = Permission::findOrCreate($permissionName, 'web');
        Role::findByName($user->getRoleNames()->first(), 'web')->givePermissionTo($permission);
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        return $user->fresh();
    }
}
