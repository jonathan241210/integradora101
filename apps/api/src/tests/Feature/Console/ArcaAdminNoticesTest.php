<?php

namespace Tests\Feature\Console;

use App\Models\StaffNotification;
use App\Models\User;

class ArcaAdminNoticesTest extends ConsoleAdminTestCase
{
    /** CA-19 api-023 */
    public function test_ca19_creates_unread_notice_for_each_active_admin(): void
    {
        $admin = $this->createAccount('admin');
        $inactive = $this->createAccount('admin', true, ['is_active' => false]);
        $cashier = $this->createAccount('cashier');
        $zoo = $this->createAccount('zoo-admin');
        $target = $this->createAccount('cashier');

        $this->primary();

        $this->artisan('arca:admin:promote', ['email' => $target->email, '--reason' => self::REASON, '--yes' => true])
            ->expectsQuestion(self::PRIMARY_PROMPT, self::PRIMARY_PASSWORD)->assertExitCode(0);

        $activeAdmins = User::query()->role('admin')->where('is_active', true)->pluck('users.id')->all();
        $this->assertContains($target->id, $activeAdmins);
        $notices = StaffNotification::query()->where('type', StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE)->get()
            ->filter(fn (StaffNotification $notice) => ($notice->payload['account_email'] ?? null) === $target->email)->values();
        $this->assertEqualsCanonicalizing($activeAdmins, $notices->pluck('user_id')->all());

        foreach ($notices as $notice) {
            $this->assertNull($notice->read_at);
            $this->assertNull($notice->created_by);
            $this->assertSame($target->email, $notice->payload['account_email']);
            $this->assertSame(self::REASON, $notice->payload['reason']);
            $this->assertSame('consola', $notice->payload['origin']);
            $this->assertArrayNotHasKey('os_user', $notice->payload);
        }
        $this->assertNotContains($inactive->id, $notices->pluck('user_id')->all());
        $this->assertNotContains($cashier->id, $notices->pluck('user_id')->all());
        $this->assertNotContains($zoo->id, $notices->pluck('user_id')->all());
        $this->assertContains($admin->id, $notices->pluck('user_id')->all());
    }
}
