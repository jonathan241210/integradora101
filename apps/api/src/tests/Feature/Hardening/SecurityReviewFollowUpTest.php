<?php

namespace Tests\Feature\Hardening;

use App\Models\SyncOperation;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Tests\Concerns\CreatesStaffUsers;
use Tests\FeatureTestCase;

/** api-028 · correcciones de la revisión de seguridad (CA-15 a CA-17). */
class SecurityReviewFollowUpTest extends FeatureTestCase
{
    use CreatesStaffUsers;

    /** CA-15 pre-delivery-hardening */
    public function test_ca15_foreign_operation_uuid_is_rejected_without_revealing_its_result(): void
    {
        $owner = $this->createStaffUser('veterinarian');
        $other = $this->createStaffUser('veterinarian');
        $uuid = (string) Str::uuid();
        SyncOperation::query()->create([
            'operation_uuid' => $uuid,
            'user_id' => $owner->id,
            'entity_type' => 'animal',
            'client_entity_id' => (string) Str::uuid(),
            'server_entity_type' => 'animal',
            'server_entity_id' => 999999,
            'status' => 'completed',
            'processed_at' => now(),
        ]);

        $this->actingAs($other, 'web')
            ->postJson('/api/v1/staff/sync/operations', ['operations' => [[
                'operation_uuid' => $uuid,
                'entity_type' => 'animal',
                'payload' => ['name' => 'X'],
            ]]])
            ->assertOk()
            ->assertJsonPath('data.results.0.status', 'rejected')
            ->assertJsonPath('data.results.0.error_code', 'operation_conflict')
            ->assertJsonPath('data.results.0.server_id', null);

        $this->assertSame(1, SyncOperation::query()->where('operation_uuid', $uuid)->count());
    }

    /** CA-16 pre-delivery-hardening */
    public function test_ca16_staff_login_is_also_limited_by_ip_across_different_emails(): void
    {
        RateLimiter::clear('login-ip:127.0.0.1');

        for ($i = 0; $i < 20; $i++) {
            $this->postJson('/api/v1/staff/auth/login', [
                'email' => 'no-existe-'.$i.'-'.bin2hex(random_bytes(3)).'@example.test',
                'password' => 'incorrecta',
            ])->assertStatus(422);
        }

        $this->postJson('/api/v1/staff/auth/login', [
            'email' => 'otro-'.bin2hex(random_bytes(3)).'@example.test',
            'password' => 'incorrecta',
        ])->assertStatus(429);

        RateLimiter::clear('login-ip:127.0.0.1');
    }

    /** CA-16 pre-delivery-hardening */
    public function test_ca16_visitor_login_is_also_limited_by_ip_across_different_emails(): void
    {
        $statuses = [];
        for ($i = 0; $i < 21; $i++) {
            $statuses[] = $this->postJson('/api/v1/visitor/auth/login', [
                'email' => 'visitante-'.$i.'-'.bin2hex(random_bytes(3)).'@example.test',
                'password' => 'incorrecta',
            ])->status();
        }

        $this->assertNotContains(429, array_slice($statuses, 0, 20));
        $this->assertSame(429, end($statuses));
    }

    /** CA-17 pre-delivery-hardening */
    public function test_ca17_sync_changes_rejects_a_cursor_that_is_not_a_date(): void
    {
        $vet = $this->createStaffUser('veterinarian');

        $this->actingAs($vet, 'web')
            ->getJson('/api/v1/staff/sync/changes?cursor=no-es-fecha')
            ->assertUnprocessable()
            ->assertJsonValidationErrors('cursor');
    }
}
