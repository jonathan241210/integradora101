<?php

namespace Tests\Feature\Admin;

use App\Models\StaffNotification;
use App\Models\User;

class ConsoleAdminNoticesTest extends AdminFeatureTestCase
{
    private function notice(User $user, string $reason, array $override = []): StaffNotification
    {
        return StaffNotification::query()->create(array_merge([
            'user_id' => $user->id,
            'type' => StaffNotification::TYPE_CONSOLE_ADMIN_CHANGE,
            'payload' => [
                'action' => 'Cuenta promovida a administrador',
                'account_email' => 'afectada@test.arca.invalid',
                'origin' => 'consola',
                'reason' => $reason,
                'occurred_at' => now()->utc()->toIso8601String(),
            ],
            'created_by' => null,
        ], $override));
    }

    /** CA-25 api-023 */
    public function test_ca25_lists_only_unread_notices_for_users_manage(): void
    {
        $admin = $this->createAccount('admin');
        $other = $this->createAccount('admin');
        $first = $this->notice($admin, 'Primer motivo largo');
        $second = $this->notice($admin, 'Segundo motivo largo');
        $this->notice($admin, 'Aviso leído ya', ['read_at' => now()]);
        $this->notice($other, 'Aviso de otra cuenta');

        $response = $this->actAs($admin)->getJson('/api/v1/admin/console-notices')->assertOk();
        $data = $response->json('data');

        $this->assertSame([$first->id, $second->id], array_column($data, 'id'));
        $this->assertSame(
            ['id', 'action', 'account_email', 'origin', 'reason', 'created_at'],
            array_keys($data[0]),
        );
        $this->assertSame('Cuenta promovida a administrador', $data[0]['action']);
        $this->assertSame('consola', $data[0]['origin']);
        $this->assertStringNotContainsString('hostname', $response->getContent());
        $this->assertStringNotContainsString('os_user', $response->getContent());

        $this->actAs($this->createAccount('zoo-admin'))->getJson('/api/v1/admin/console-notices')->assertForbidden();
    }

    /** CA-26 api-023 */
    public function test_ca26_marks_own_notice_read_and_foreign_is_404(): void
    {
        $admin = $this->createAccount('admin');
        $other = $this->createAccount('admin');
        $mine = $this->notice($admin, 'Aviso propio largo');
        $foreign = $this->notice($other, 'Aviso ajeno largo');

        $this->actAs($admin)->postJson("/api/v1/admin/console-notices/{$foreign->id}/read")->assertNotFound();
        $this->assertNull($foreign->fresh()->read_at);
        $this->actAs($admin)->postJson('/api/v1/admin/console-notices/999999999/read')->assertNotFound();

        $this->actAs($admin)->postJson("/api/v1/admin/console-notices/{$mine->id}/read")->assertNoContent();
        $this->assertNotNull($mine->fresh()->read_at);
        $this->assertSame([], $this->actAs($admin)->getJson('/api/v1/admin/console-notices')->assertOk()->json('data'));

        $this->actAs($this->createAccount('zoo-admin'))->postJson("/api/v1/admin/console-notices/{$mine->id}/read")->assertForbidden();
    }
}
