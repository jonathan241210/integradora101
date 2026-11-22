<?php

namespace Tests\Feature\Admin;

class ConsoleManagedSearchTest extends AdminFeatureTestCase
{
    /** CA-35 api-023 */
    public function test_ca35_admin_account_in_global_search_is_read_only(): void
    {
        $actor = $this->createAccount('admin');
        $token = 'Zqxwv'.bin2hex(random_bytes(3));
        $admin = $this->createAccount('admin', true, ['first_name' => $token.'adm']);
        $cashier = $this->createAccount('cashier', true, ['first_name' => $token.'cas']);

        $groups = $this->actAs($actor)->getJson('/api/v1/admin/search?q='.$token)->assertOk()->json('groups');
        $users = collect($groups)->firstWhere('section', 'users');
        $items = collect($users['items'])->keyBy('id');

        $this->assertTrue($items[$admin->id]['managed_by_console']);
        $this->assertFalse($items[$cashier->id]['managed_by_console']);
        $this->assertArrayNotHasKey('actions', $items[$admin->id]);
        $this->assertStringNotContainsString('password', json_encode($items[$admin->id]));
    }
}
