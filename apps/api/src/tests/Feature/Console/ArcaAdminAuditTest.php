<?php

namespace Tests\Feature\Console;

use Illuminate\Support\Facades\DB;

class ArcaAdminAuditTest extends ConsoleAdminTestCase
{
    /** CA-18 api-023 */
    public function test_ca18_console_activity_has_origin_and_no_causer_or_secrets(): void
    {
        $account = $this->createAccount('cashier');

        $this->primary();

        $this->artisan('arca:admin:promote', ['email' => $account->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)->assertExitCode(0);

        $row = DB::table('activity_log')->where('log_name', 'admin')->where('event', 'console-promoted')
            ->where('subject_id', $account->id)->latest('id')->first();
        $this->assertNotNull($row);
        $this->assertNull($row->causer_id);
        $this->assertNull($row->causer_type);
        $properties = json_decode($row->properties, true);
        $this->assertSame('consola', $properties['origin']);
        $this->assertNotSame('', $properties['os_user']);
        $this->assertSame(gethostname(), $properties['hostname']);
        $this->assertSame(self::REASON, $properties['reason']);
        $this->assertSame($account->email, $properties['account_email']);
        $this->assertSame('Cuenta promovida a administrador', $properties['action']);
        $this->assertNotNull($row->created_at);
        $this->assertStringNotContainsStringIgnoringCase('password', $row->properties);
        $this->assertStringNotContainsStringIgnoringCase('two_factor', $row->properties);
    }
}
