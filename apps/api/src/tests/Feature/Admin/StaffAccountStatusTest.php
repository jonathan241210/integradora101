<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StaffAccountStatusTest extends AdminFeatureTestCase
{
    /** CA-07 */
    public function test_ca07_administration_management_deactivates_revokes_sessions_and_blocks_login(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier');
        $this->insertSession($target);

        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$target->id}/status", ['is_active' => false])
            ->assertOk()->assertJsonPath('data.is_active', false);

        $this->assertSame(0, DB::table('sessions')->where('user_id', $target->id)->count());
        Auth::forgetGuards();
        $this->postJson('/api/v1/auth/login', ['email' => $target->email, 'password' => 'SafePassphrase12!'])->assertUnprocessable();

        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$target->id}/status", ['is_active' => true])
            ->assertOk()->assertJsonPath('data.is_active', true);
    }

    /** CA-07 */
    public function test_ca07_administration_management_inactive_account_loses_access_even_with_a_live_session(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier');
        $this->actAs($admin)->patchJson("/api/v1/admin/users/{$target->id}/status", ['is_active' => false])->assertOk();

        $this->actAs($target->fresh())->getJson('/api/v1/auth/me')->assertUnauthorized();
    }
}
