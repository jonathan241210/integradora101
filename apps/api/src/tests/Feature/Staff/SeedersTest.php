<?php

namespace Tests\Feature\Staff;

use App\Models\Department;
use Database\Seeders\DepartmentSeeder;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\Auth;
use Spatie\Permission\Models\Role;
use Tests\Concerns\CreatesAdministrators;
use Tests\Concerns\SeedsRolesWhenMissing;
use Tests\FeatureTestCase;

class SeedersTest extends FeatureTestCase
{
    use CreatesAdministrators;
    use SeedsRolesWhenMissing;

    protected function seedRoles(): void
    {
        $this->seedRolesWhenMissing();
    }

    /** CA-15 staff-authentication */
    public function test_ca15_staff_authentication_seeders_create_the_five_departments_and_role_matrix_idempotently(): void
    {
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();
        (new DepartmentSeeder)->run();
        (new RolesAndPermissionsSeeder)->run();

        $this->assertSame(5, Department::query()->whereIn('code', [
            'presidency',
            'information-technology',
            'management',
            'box-office',
            'veterinary',
        ])->count());

        $this->assertSame(5, Role::query()->whereIn('name', [
            'admin',
            'zoo-admin',
            'executive',
            'cashier',
            'veterinarian',
        ])->where('guard_name', 'web')->count());

        $admin = Role::findByName('admin', 'web');
        $zooAdmin = Role::findByName('zoo-admin', 'web');

        $this->assertTrue($admin->hasPermissionTo('users.manage'));
        // T-42/T-47: el permiso sale del catálogo del seeder; la fila antigua de `permissions` puede persistir,
        // pero ningún rol la recibe.
        foreach (Role::query()->where('guard_name', 'web')->get() as $role) {
            $this->assertNotContains('operational-staff.manage', $role->permissions->pluck('name')->all(), "{$role->name} no debe tenerlo");
        }
        $this->assertFalse($zooAdmin->hasPermissionTo('users.manage'));
        $this->assertTrue($zooAdmin->hasPermissionTo('news.manage'));
    }

    /** CA-20 species-requests */
    public function test_ca20_species_review_only_zoo_admin(): void
    {
        (new RolesAndPermissionsSeeder)->run();

        $zooAdmin = Role::findByName('zoo-admin', 'web');
        $this->assertTrue($zooAdmin->hasPermissionTo('species.review'));
        $this->assertTrue($zooAdmin->hasPermissionTo('memories.review'));

        foreach (['admin', 'executive', 'cashier', 'veterinarian'] as $name) {
            $names = Role::findByName($name, 'web')->permissions->pluck('name')->all();
            $this->assertNotContains('species.review', $names, "{$name} no debe tener species.review");
            $this->assertNotContains('memories.review', $names, "{$name} no debe tener memories.review");
        }

        // zoo-admin with confirmed 2FA reaches the review routes; admin does not (api-014 T-14).
        $account = $this->createAccount('zoo-admin');
        Auth::forgetGuards();
        $this->actingAs($account, 'web')->getJson('/api/v1/admin/species-publication-requests')->assertOk();

        $other = $this->createAccount('admin');
        Auth::forgetGuards();
        $this->actingAs($other, 'web')->getJson('/api/v1/admin/species-publication-requests')->assertForbidden();
    }

    /** CA-16 */
    public function test_ca16_memories_review_only_zoo_admin_and_admin_is_excluded(): void
    {
        (new RolesAndPermissionsSeeder)->run();

        $this->assertTrue(Role::findByName('zoo-admin', 'web')->hasPermissionTo('memories.review'));

        // admin recibe casi todo el catálogo, pero memories.review se excluye de forma explícita.
        $admin = Role::findByName('admin', 'web')->permissions->pluck('name')->all();
        $this->assertNotEmpty($admin);
        $this->assertNotContains('memories.review', $admin);

        foreach (['executive', 'cashier', 'veterinarian'] as $name) {
            $names = Role::findByName($name, 'web')->permissions->pluck('name')->all();
            $this->assertNotContains('memories.review', $names, "{$name} no debe tener memories.review");
        }
    }
}
