<?php

namespace Tests\Feature\Admin;

use App\Models\Department;
use Tests\Concerns\BuildsSearchFixtures;

class GlobalSearchUsersTest extends AdminFeatureTestCase
{
    use BuildsSearchFixtures;

    /** CA-26 enclosure-status-and-global-search */
    public function test_ca26_users_group_active_and_inactive_without_secrets(): void
    {
        $admin = $this->searchAdmin();
        $tag = $this->tag();
        $active = $this->createAccount('executive', true, ['first_name' => 'Ana'.$tag, 'last_name' => 'López', 'second_last_name' => 'Ruiz']);
        $inactive = $this->createAccount('executive', true, ['first_name' => 'Beto'.$tag, 'is_active' => false]);
        $deleted = $this->createAccount('executive', true, ['first_name' => 'Cris'.$tag]);
        $deleted->delete();
        $byEmail = $this->createAccount('executive', true, ['email' => $tag.'@test.arca.invalid']);

        $response = $this->search($admin, strtoupper($tag));
        $items = $this->groupsBySection($response)['users']['items'];
        $byId = collect($items)->keyBy('id');

        $this->assertTrue($byId->has($active->id));
        $this->assertTrue($byId->has($inactive->id));
        $this->assertTrue($byId->has($byEmail->id));
        $this->assertFalse($byId->has($deleted->id));
        $this->assertSame('Ana'.$tag.' López Ruiz', $byId[$active->id]['title']);
        $this->assertSame($active->email, $byId[$active->id]['subtitle']);

        $body = $response->getContent();
        foreach (['password', 'two_factor', 'remember_token', 'SafePassphrase'] as $secret) {
            $this->assertStringNotContainsString($secret, $body);
        }
        foreach ($items as $item) {
            $this->assertEmpty(array_diff(array_keys($item), ['id', 'title', 'subtitle', 'match', 'managed_by_console']));
        }

        // Área y rol (CA-26, CA-43): etiqueta en español e identificador interno.
        $areaTag = $this->tag();
        $department = Department::create(['name' => 'Sector '.$areaTag, 'code' => $areaTag, 'description' => null, 'is_active' => true]);
        $cashier = $this->createAccount('cashier', true, ['department_id' => $department->id, 'first_name' => 'Rosa'.$tag]);
        $byArea = collect($this->groupsBySection($this->search($admin, $areaTag))['users']['items'])->keyBy('id');
        $this->assertSame('Área', $byArea[$cashier->id]['match']['field']);
        foreach (['cajero', 'cashier'] as $role) {
            $byRole = collect($this->groupsBySection($this->search($admin, $tag.' '.$role))['users']['items'])->keyBy('id');
            $this->assertSame('Rol', $byRole[$cashier->id]['match']['field']);
        }
    }
}
