<?php

namespace Tests\Feature\Console;

use Illuminate\Support\Facades\DB;

class ArcaAdminPromoteTest extends ConsoleAdminTestCase
{
    /** CA-22 api-023 */
    public function test_ca22_promote_keeps_area_and_sessions_and_rejects_inactive(): void
    {
        $account = $this->createAccount('zoo-admin');
        $session = $this->insertSession($account);
        $department = $account->department_id;
        $name = $account->first_name;

        $this->primary();

        $this->artisan('arca:admin:promote', ['email' => $account->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)->assertExitCode(0);

        $fresh = $account->fresh();
        $this->assertSame(['admin'], $fresh->getRoleNames()->all());
        $this->assertSame($department, $fresh->department_id);
        $this->assertSame($name, $fresh->first_name);
        $this->assertTrue(DB::table('sessions')->where('id', $session)->exists());

        $inactive = $this->createAccount('cashier', true, ['is_active' => false]);
        $deleted = $this->createAccount('cashier');
        $deleted->delete();
        $before = $this->snapshot();

        foreach ([$inactive, $deleted] as $user) {
            $this->artisan('arca:admin:promote', ['email' => $user->email] + $this->unattended())->assertExitCode(1);
        }
        $this->assertSame(['cashier'], $inactive->fresh()->getRoleNames()->all());
        $this->assertSame($before, $this->snapshot());
    }
}
