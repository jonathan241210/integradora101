<?php

namespace Tests\Feature\Staff;

use App\Models\User;
use App\Support\Staff\StaffRoleCatalog;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;
use Tests\Concerns\CreatesAdministrators;
use Tests\FeatureTestCase;

class FixedRolesSeederTest extends FeatureTestCase
{
    use CreatesAdministrators;

    private function permissionsOf(string $role): array
    {
        return Role::findByName($role, 'web')->permissions->pluck('name')->sort()->values()->all();
    }

    /** CA-01 api-023 */
    public function test_ca01_executive_has_exactly_three_permissions(): void
    {
        $this->seedRoles();

        $this->assertSame(['dashboard.view', 'public-content.view', 'reports.view'], $this->permissionsOf('executive'));
    }

    /** CA-02 api-023 */
    public function test_ca02_communications_has_exactly_five_permissions(): void
    {
        $this->seedRoles();

        $this->assertSame(
            ['events.manage', 'memories.review', 'news.manage', 'public-content.view', 'species.review'],
            $this->permissionsOf('communications'),
        );
        foreach (['dashboard.view', 'reports.view', 'users.manage'] as $forbidden) {
            $this->assertNotContains($forbidden, $this->permissionsOf('communications'));
        }
    }

    /** CA-08 api-023 (RN-02): `tickets.view-all` solo para admin y zoo-admin. */
    public function test_ca08_view_all_permission_is_assigned_to_admin_and_zoo_admin_only(): void
    {
        $this->seedRoles();

        foreach (['admin', 'zoo-admin'] as $role) {
            $this->assertContains('tickets.view-all', $this->permissionsOf($role), $role);
        }
        foreach (['executive', 'communications', 'cashier', 'veterinarian'] as $role) {
            $this->assertNotContains('tickets.view-all', $this->permissionsOf($role), $role);
        }
    }

    /** CA-03 api-023: la cuenta executive conserva identificador, rol, permisos, sesiones y etiqueta al volver a sembrar. */
    public function test_ca03_seeder_rerun_keeps_executive_account_and_sessions(): void
    {
        $account = $this->createAccount('executive');
        $sessionId = bin2hex(random_bytes(20));
        DB::table('sessions')->insert([
            'id' => $sessionId, 'user_id' => $account->id, 'ip_address' => '127.0.0.1',
            'user_agent' => 'phpunit', 'payload' => '', 'last_activity' => time(),
        ]);
        $before = $this->permissionsOf('executive');
        $count = User::query()->where('email', $account->email)->count();

        (new RolesAndPermissionsSeeder)->run();

        $fresh = $account->fresh();
        $this->assertSame($account->id, $fresh->id);
        $this->assertSame(['executive'], $fresh->getRoleNames()->all());
        $this->assertSame($before, $this->permissionsOf('executive'));
        $this->assertSame($count, User::query()->where('email', $account->email)->count());
        $this->assertTrue(DB::table('sessions')->where('id', $sessionId)->exists());
        $this->assertSame(1, Role::query()->where('name', 'executive')->where('guard_name', 'web')->count());
        $this->assertSame('Consulta directiva', StaffRoleCatalog::roleLabel('executive'));
    }
}
