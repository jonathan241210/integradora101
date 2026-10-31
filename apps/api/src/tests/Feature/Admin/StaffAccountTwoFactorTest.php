<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;

class StaffAccountTwoFactorTest extends AdminFeatureTestCase
{
    /** CA-11 */
    public function test_ca11_administration_management_resets_two_factor_and_forces_enrollment(): void
    {
        $actor = $this->createAccount('admin');
        $target = $this->createAccount('zoo-admin');
        $target->forceFill([
            'two_factor_secret' => encrypt('SECRET'),
            'two_factor_recovery_codes' => encrypt(json_encode(['a'])),
        ])->save();
        $this->insertSession($target);

        $this->actAs($actor)->deleteJson("/api/v1/admin/users/{$target->id}/two-factor")->assertNoContent();

        $fresh = $target->fresh();
        $this->assertNull($fresh->two_factor_secret);
        $this->assertNull($fresh->two_factor_confirmed_at);
        $this->assertSame(0, DB::table('sessions')->where('user_id', $target->id)->count());

        $this->actAs($fresh)->getJson('/api/v1/auth/me')->assertOk()->assertJsonPath('data.two_factor_setup_required', true);
        $this->actAs($fresh)->getJson('/api/v1/admin/users')->assertForbidden()->assertJsonPath('code', 'two_factor_setup_required');
    }
}
