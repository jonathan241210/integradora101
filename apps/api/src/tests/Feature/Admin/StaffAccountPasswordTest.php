<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class StaffAccountPasswordTest extends AdminFeatureTestCase
{
    /** CA-10 */
    public function test_ca10_administration_management_resets_password_and_revokes_sessions(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('cashier');
        $this->insertSession($target);

        $this->actAs($admin)->putJson("/api/v1/admin/users/{$target->id}/password", ['password' => 'weak'])
            ->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->actAs($admin)->putJson("/api/v1/admin/users/{$target->id}/password", ['password' => 'N3w!Passphrase#77'])->assertNoContent();

        $hash = $target->fresh()->password;
        $this->assertTrue(Hash::check('N3w!Passphrase#77', $hash));
        $this->assertStringStartsWith('$2y$', $hash);
        $this->assertSame(0, DB::table('sessions')->where('user_id', $target->id)->count());
    }
}
