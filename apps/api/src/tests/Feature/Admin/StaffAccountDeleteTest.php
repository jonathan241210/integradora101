<?php

namespace Tests\Feature\Admin;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class StaffAccountDeleteTest extends AdminFeatureTestCase
{
    /** CA-08 */
    public function test_ca08_administration_management_soft_deletes_and_revokes_sessions(): void
    {
        $admin = $this->createAccount('admin');
        $target = $this->createAccount('veterinarian');
        $this->insertSession($target);

        $this->actAs($admin)->deleteJson("/api/v1/admin/users/{$target->id}")->assertNoContent();

        $row = DB::table('users')->where('id', $target->id)->first();
        $this->assertNotNull($row);
        $this->assertNotNull($row->deleted_at);
        $this->assertSame(0, DB::table('sessions')->where('user_id', $target->id)->count());
        Auth::forgetGuards();
        $this->postJson('/api/v1/auth/login', ['email' => $target->email, 'password' => 'SafePassphrase12!'])->assertUnprocessable();
        $this->actAs($admin)->getJson("/api/v1/admin/users/{$target->id}")->assertNotFound();
    }
}
